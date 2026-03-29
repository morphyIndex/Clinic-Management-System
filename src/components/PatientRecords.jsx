import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ModalPortal from './ModalPortal.jsx';
import DoctorWorkspacePanel from './DoctorWorkspaceModal.jsx';
import PharmacyWorkspacePanel from './PharmacyWorkspacePanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { isApiError } from '../lib/api.js';
import { appToast } from '../lib/toast.js';

const patientConditionStyles = {
  Critical: 'bg-red-100 text-red-700',
  Recovering: 'bg-amber-100 text-amber-700',
  Stable: 'bg-emerald-100 text-emerald-700',
};

const initialPatientForm = {
  firstName: '',
  lastName: '',
  gender: 'Female',
  dateOfBirth: '',
  phone: '',
  room: '',
  condition: 'Stable',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  allergies: '',
  chronicConditions: '',
};

const ALLOWED_ATTACHMENT_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function buildQueryString(search) {
  const params = new URLSearchParams({
    pageSize: '50',
  });

  if (search.trim()) {
    params.set('search', search.trim());
  }

  return params.toString();
}

function getErrorMessage(error, fallbackMessage) {
  const message = isApiError(error) ? error.message : fallbackMessage;
  if (/storage object not found|attachment file is missing from storage/i.test(message)) {
    return 'This attachment is missing from storage. Please upload it again.';
  }
  return message;
}

function formatAge(dateOfBirth) {
  if (!dateOfBirth) {
    return 'Age unavailable';
  }

  const birthDate = new Date(dateOfBirth);
  const ageInMilliseconds = Date.now() - birthDate.getTime();
  const ageDate = new Date(ageInMilliseconds);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);
  return `${age}y`;
}

function formatDateTime(value) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read the selected file.'));
        return;
      }

      const [, base64 = ''] = reader.result.split(',');
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error('Could not read the selected file.'));
    };

    reader.readAsDataURL(file);
  });
}

function convertBase64ToBlob(contentBase64, contentType) {
  const binary = window.atob(contentBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: contentType });
}

function isPreviewableAttachment(attachment) {
  return attachment?.contentType === 'application/pdf' || attachment?.contentType?.startsWith('image/');
}

function ButtonSpinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" className="opacity-20" stroke="currentColor" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function PatientRecords() {
  const { request, user } = useAuth();
  const navigate = useNavigate();
  const { patientId: routePatientId } = useParams();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput);
  const [patientsResponse, setPatientsResponse] = useState({
    items: [],
    pagination: {
      total: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [recordActionState, setRecordActionState] = useState({ patientId: '', mode: '' });
  const [isAttachmentUploading, setIsAttachmentUploading] = useState(false);
  const [attachmentActionState, setAttachmentActionState] = useState({ attachmentId: '', mode: '' });
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const detailSectionRef = useRef(null);

  const isPharmacist = user?.role === 'pharmacist';
  const canCreatePatients = ['clinic_admin', 'receptionist', 'staff'].includes(user?.role ?? '');
  const canManageClinicalNotes = ['clinic_admin', 'doctor'].includes(user?.role ?? '');
  const canManageDispensing = ['clinic_admin', 'pharmacist'].includes(user?.role ?? '');
  const canManageAttachments = ['clinic_admin', 'doctor', 'staff'].includes(user?.role ?? '');
  const isDetailRoute = Boolean(routePatientId);
  const isRecordActionPending = (patientId, mode) =>
    recordActionState.patientId === patientId && recordActionState.mode === mode;
  const isAttachmentActionPending = (attachmentId, mode) =>
    attachmentActionState.attachmentId === attachmentId && attachmentActionState.mode === mode;

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const loadPatientRecord = async (patientId, action = 'detail') => {
    setIsRecordLoading(true);
    setRecordActionState({ patientId, mode: action });
    setSelectedPatientId(patientId);

    try {
      const response = await request(`/patients/${patientId}/record`);
      setSelectedRecord(response);
      return response;
    } catch (error) {
      appToast.error({
        title: 'Patient detail unavailable',
        description: getErrorMessage(error, 'The patient record could not be loaded.'),
      });
      return null;
    } finally {
      setIsRecordLoading(false);
      setRecordActionState({ patientId: '', mode: '' });
    }
  };

  useEffect(() => () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    detailSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedRecord]);

  useEffect(() => {
    if (!routePatientId) {
      setSelectedRecord(null);
      setSelectedPatientId('');
      setIsRecordLoading(false);
      setRecordActionState({ patientId: '', mode: '' });
      return;
    }

    if (selectedPatientId === routePatientId && selectedRecord?.patient?._id === routePatientId) {
      return;
    }

    void loadPatientRecord(routePatientId, 'detail').then((result) => {
      if (!result) {
        navigate('/records');
      }
    });
  }, [navigate, request, routePatientId, selectedPatientId, selectedRecord?.patient?._id]);

  useEffect(() => {
    const controller = new AbortController();

    const loadPatients = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const response = await request(`/patients?${buildQueryString(debouncedSearch)}`, {
          signal: controller.signal,
        });
        setPatientsResponse(response);
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        setLoadError(getErrorMessage(error, 'We could not load the patient directory.'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadPatients();

    return () => {
      controller.abort();
    };
  }, [debouncedSearch, request]);

  const handleRefresh = async () => {
    const controller = new AbortController();

    setIsLoading(true);
    setLoadError('');

    try {
      const response = await request(`/patients?${buildQueryString(debouncedSearch)}`, {
        signal: controller.signal,
      });
      setPatientsResponse(response);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setLoadError(getErrorMessage(error, 'We could not load the patient directory.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePatient = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await appToast.promise(
        request('/patients', {
          method: 'POST',
          body: {
            ...patientForm,
            dateOfBirth: patientForm.dateOfBirth || undefined,
            allergies: splitList(patientForm.allergies),
            chronicConditions: splitList(patientForm.chronicConditions),
          },
        }),
        {
          loading: {
            title: 'Creating patient',
            description: 'Saving the new admission to the clinic.',
          },
          success: {
            title: 'Patient created',
            description: 'The patient profile is now available in the directory.',
          },
          error: (error) => ({
            title: 'Patient could not be created',
            description: getErrorMessage(error, 'The patient record could not be created.'),
          }),
        },
      );
      setPatientForm(initialPatientForm);
      handleCloseCreateModal();
      await handleRefresh();
    } catch {
      // Toast feedback already shown above.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRecord = async (patientId, options = {}) => {
    const { action = 'detail' } = options;
    setRecordActionState({ patientId, mode: action });
    setSelectedPatientId(patientId);
    navigate(`/records/${patientId}`);
    return null;
  };

  const handleRefreshSelectedRecord = async () => {
    const patientId = routePatientId ?? selectedPatientId;
    if (!patientId) {
      return null;
    }

    return loadPatientRecord(patientId, 'detail');
  };

  const loadAttachmentBlob = async (attachment) => {
    const response = await request(`/attachments/${attachment._id}/content`);
    return convertBase64ToBlob(response.contentBase64, response.contentType || attachment.contentType);
  };

  const handleUploadAttachment = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !selectedRecord?.patient?._id) {
      return;
    }

    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      appToast.warning({
        title: 'Unsupported file type',
        description: 'Please upload a PDF, PNG, or JPEG file.',
      });
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      appToast.warning({
        title: 'Attachment too large',
        description: 'Please keep each attachment under 5 MB.',
      });
      return;
    }

    setIsAttachmentUploading(true);

    try {
      const contentBase64 = await readFileAsBase64(file);
      await appToast.promise(
        request('/attachments/register', {
          method: 'POST',
          body: {
            patientId: selectedRecord.patient._id,
            filename: file.name,
            contentType: file.type,
            size: file.size,
            contentBase64,
          },
        }),
        {
          loading: {
            title: 'Uploading attachment',
            description: `Securing ${file.name} for this patient record.`,
          },
          success: {
            title: 'Attachment uploaded',
            description: `${file.name} is now available in the patient snapshot.`,
          },
          error: (error) => ({
            title: 'Attachment upload failed',
            description: getErrorMessage(error, 'The attachment could not be uploaded.'),
          }),
        },
      );
      await handleRefreshSelectedRecord();
    } catch {
      // Toast feedback already shown above.
    } finally {
      setIsAttachmentUploading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setPreviewAttachment(null);
    setPreviewError('');
    setIsPreviewLoading(false);
    setAttachmentActionState({ attachmentId: '', mode: '' });
  };

  const handlePreviewAttachment = async (attachment) => {
    if (!isPreviewableAttachment(attachment)) {
      return;
    }

    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }

    setPreviewAttachment(attachment);
    setPreviewError('');
    setIsPreviewLoading(true);
    setAttachmentActionState({ attachmentId: attachment._id, mode: 'preview' });

    try {
      const blob = await loadAttachmentBlob(attachment);
      setPreviewUrl(window.URL.createObjectURL(blob));
    } catch (error) {
      const message = getErrorMessage(error, 'The attachment preview could not be loaded.');
      setPreviewError(message);
      appToast.error({
        title: 'Preview unavailable',
        description: message,
      });
    } finally {
      setIsPreviewLoading(false);
      setAttachmentActionState((current) =>
        current.attachmentId === attachment._id && current.mode === 'preview'
          ? { attachmentId: '', mode: '' }
          : current,
      );
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    setAttachmentActionState({ attachmentId: attachment._id, mode: 'download' });
    try {
      const blob = await loadAttachmentBlob(attachment);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      appToast.error({
        title: 'Download failed',
        description: getErrorMessage(error, 'The attachment could not be downloaded.'),
      });
    } finally {
      setAttachmentActionState((current) =>
        current.attachmentId === attachment._id && current.mode === 'download'
          ? { attachmentId: '', mode: '' }
          : current,
      );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isDetailRoute ? (isPharmacist ? 'Pharmacy Detail' : 'Patient Detail') : isPharmacist ? 'Pharmacy Workspace' : 'Patient Directory'}
          </h1>
          <p className="text-slate-500 font-medium">
            {isDetailRoute
              ? isPharmacist
                ? 'Review finalized medication plans, patient context, and dispensing status in one detail view.'
                : 'Unified clinical detail view with attachments, encounter notes, and medication plan.'
              : isPharmacist
                ? 'Open a patient detail page to review prescriptions and update pharmacy dispensing.'
                : 'Live records, admissions, and profile snapshots synced from the backend.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isDetailRoute ? (
            <button
              onClick={() => navigate('/records')}
              className="px-5 py-2 rounded-2xl font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all"
            >
              Back to Directory
            </button>
          ) : (
            <>
              <button
                onClick={() => void handleRefresh()}
                className="px-5 py-2 rounded-2xl font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Refresh
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                disabled={!canCreatePatients}
                className="bg-indigo-600 text-white px-5 py-2 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                + Admit New Patient
              </button>
            </>
          )}
        </div>
      </div>

      {!isDetailRoute && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Visible Patients</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">{patientsResponse.pagination.total ?? 0}</h2>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Access Level</p>
            <h2 className="mt-2 text-xl font-bold capitalize text-slate-900">{(user?.role ?? 'guest').replace('_', ' ')}</h2>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Search Filter</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{debouncedSearch.trim() || 'Showing all patients'}</h2>
          </div>
        </div>
      )}

      {selectedRecord && (
        <section ref={detailSectionRef} className="mb-8 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">Patient Detail</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">{selectedRecord.patient.fullName}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {selectedRecord.patient.patientCode} • {selectedRecord.patient.room || 'Unassigned room'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isRecordLoading && <span className="text-sm font-medium text-slate-500">Refreshing patient detail...</span>}
              <button
                onClick={() => void handleRefreshSelectedRecord()}
                disabled={isRecordActionPending(selectedPatientId, 'detail')}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
              >
                {isRecordActionPending(selectedPatientId, 'detail') && <ButtonSpinner />}
                {isRecordActionPending(selectedPatientId, 'detail') ? 'Refreshing...' : 'Refresh Details'}
              </button>
              <button
                onClick={() => navigate('/records')}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Close Details
              </button>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Appointments</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{selectedRecord.appointments.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Invoices</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{selectedRecord.invoices.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Encounters</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{selectedRecord.encounters.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Attachments</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{selectedRecord.attachments.length}</p>
              </div>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Latest Activity</h3>
                <ul className="mt-4 space-y-3">
                  {selectedRecord.appointments.slice(0, 3).map((appointment) => (
                    <li key={appointment._id} className="rounded-2xl border border-slate-100 px-4 py-3">
                      <p className="font-semibold text-slate-800">{appointment.reason || 'Consultation'}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {appointment.status} • {formatDateTime(appointment.scheduledAt)}
                      </p>
                    </li>
                  ))}

                  {selectedRecord.appointments.length === 0 && (
                    <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                      No appointments found for this patient yet.
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Clinical Attachments</h3>
                    <p className="mt-1 text-xs text-slate-500">Store scans, consent forms, and lab PDFs with secure access controls.</p>
                  </div>
                  {canManageAttachments && (
                    <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                      {isAttachmentUploading ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        className="hidden"
                        onChange={(event) => void handleUploadAttachment(event)}
                      />
                    </label>
                  )}
                </div>

                <ul className="mt-4 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                  {selectedRecord.attachments.map((attachment) => (
                    <li key={attachment._id} className="rounded-2xl border border-slate-100 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{attachment.filename}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatFileSize(attachment.size)} • {attachment.contentType}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {attachment.uploadedAt ? formatDateTime(attachment.uploadedAt) : 'Upload pending'}
                          </p>
                        </div>
                        {canManageAttachments && (
                          <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            {isPreviewableAttachment(attachment) && (
                              <button
                                onClick={() => void handlePreviewAttachment(attachment)}
                                disabled={isAttachmentActionPending(attachment._id, 'preview')}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                              >
                                {isAttachmentActionPending(attachment._id, 'preview') && <ButtonSpinner />}
                                {isAttachmentActionPending(attachment._id, 'preview') ? 'Loading...' : 'Preview'}
                              </button>
                            )}
                            <button
                              onClick={() => void handleDownloadAttachment(attachment)}
                              disabled={isAttachmentActionPending(attachment._id, 'download')}
                              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-70"
                            >
                              {isAttachmentActionPending(attachment._id, 'download') && <ButtonSpinner />}
                              {isAttachmentActionPending(attachment._id, 'download') ? 'Preparing...' : 'Download'}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}

                  {selectedRecord.attachments.length === 0 && (
                    <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                      No PDF or image attachments have been added for this patient yet.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {canManageClinicalNotes && (
              <DoctorWorkspacePanel
                selectedRecord={selectedRecord}
                onRecordUpdated={handleRefreshSelectedRecord}
              />
            )}

            {canManageDispensing && (
              <PharmacyWorkspacePanel
                selectedRecord={selectedRecord}
                onRecordUpdated={handleRefreshSelectedRecord}
              />
            )}
          </div>
        </section>
      )}

      {!isDetailRoute && !selectedRecord && !isRecordLoading && (
        <div className="mb-6 rounded-[2rem] border border-dashed border-slate-200 bg-white/70 px-6 py-5 text-sm text-slate-500">
          Choose any patient row to open a single detail view for profile history, attachments, and doctor notes.
        </div>
      )}

      {isDetailRoute && isRecordLoading && !selectedRecord && (
        <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-500 shadow-sm">
          Loading patient detail...
        </div>
      )}

      {!isDetailRoute && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/60 flex flex-col md:flex-row md:items-center gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search patients by name, ID, or phone..."
            className="w-full md:w-96 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {isLoading && <span className="text-sm font-medium text-slate-500">Syncing patient list...</span>}
        </div>

        {loadError && (
          <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {loadError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-5 font-semibold">Patient ID</th>
                <th className="p-5 font-semibold">Name</th>
                <th className="p-5 font-semibold">Room</th>
                <th className="p-5 font-semibold">Status</th>
                <th className="p-5 font-semibold">Contact</th>
                <th className="p-5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {patientsResponse.items.map((patient) => (
                <tr key={patient._id} className="hover:bg-indigo-50/40 transition">
                  <td className="p-5 font-mono text-sm text-indigo-600">{patient.patientCode}</td>
                  <td className="p-5 font-bold text-slate-800">
                    {patient.fullName}
                    <span className="block text-xs font-normal text-slate-400">
                      {formatAge(patient.dateOfBirth)} • {patient.gender || 'Gender unavailable'}
                    </span>
                  </td>
                  <td className="p-5 text-slate-600">{patient.room || 'Unassigned'}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${patientConditionStyles[patient.condition ?? 'Stable']}`}>
                      {patient.condition ?? 'Stable'}
                    </span>
                  </td>
                  <td className="p-5 text-sm text-slate-600">
                    <p>{patient.phone || 'No phone added'}</p>
                    <p className="text-xs text-slate-400 truncate max-w-44">{patient.address || 'No address on file'}</p>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => void handleOpenRecord(patient._id, { action: 'detail' })}
                        disabled={isRecordActionPending(patient._id, 'detail')}
                        className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-70"
                      >
                        {isRecordActionPending(patient._id, 'detail') && <ButtonSpinner />}
                        {isRecordActionPending(patient._id, 'detail')
                          ? 'Opening Details...'
                          : selectedPatientId === patient._id
                            ? 'Refresh Details'
                            : 'Open Details'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && patientsResponse.items.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No patients matched the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}

      <ModalPortal isOpen={isCreateModalOpen} onClose={handleCloseCreateModal}>
        <div className="max-w-3xl mx-auto rounded-[2rem] bg-white p-8 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Admit New Patient</h2>
              <p className="mt-2 text-sm text-slate-500">This form creates a live patient profile in the backend clinic database.</p>
            </div>
            <button
              onClick={handleCloseCreateModal}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleCreatePatient}>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">First Name</span>
                <input
                  required
                  value={patientForm.firstName}
                  onChange={(event) => setPatientForm((current) => ({ ...current, firstName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Last Name</span>
                <input
                  required
                  value={patientForm.lastName}
                  onChange={(event) => setPatientForm((current) => ({ ...current, lastName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Gender</span>
                <select
                  value={patientForm.gender}
                  onChange={(event) => setPatientForm((current) => ({ ...current, gender: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Date of Birth</span>
                <input
                  type="date"
                  value={patientForm.dateOfBirth}
                  onChange={(event) => setPatientForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Phone</span>
                <input
                  value={patientForm.phone}
                  onChange={(event) => setPatientForm((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Room</span>
                <input
                  value={patientForm.room}
                  onChange={(event) => setPatientForm((current) => ({ ...current, room: event.target.value }))}
                  placeholder="102 / ICU-4"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Condition</span>
                <select
                  value={patientForm.condition}
                  onChange={(event) => setPatientForm((current) => ({ ...current, condition: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Stable</option>
                  <option>Critical</option>
                  <option>Recovering</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Emergency Contact</span>
                <input
                  value={patientForm.emergencyContactName}
                  onChange={(event) =>
                    setPatientForm((current) => ({ ...current, emergencyContactName: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-sm font-bold text-slate-700">Emergency Contact Phone</span>
              <input
                value={patientForm.emergencyContactPhone}
                onChange={(event) =>
                  setPatientForm((current) => ({ ...current, emergencyContactPhone: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-bold text-slate-700">Address</span>
              <textarea
                rows="3"
                value={patientForm.address}
                onChange={(event) => setPatientForm((current) => ({ ...current, address: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Allergies</span>
                <input
                  value={patientForm.allergies}
                  onChange={(event) => setPatientForm((current) => ({ ...current, allergies: event.target.value }))}
                  placeholder="Penicillin, Peanuts"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Chronic Conditions</span>
                <input
                  value={patientForm.chronicConditions}
                  onChange={(event) =>
                    setPatientForm((current) => ({ ...current, chronicConditions: event.target.value }))
                  }
                  placeholder="Diabetes, Hypertension"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="px-5 py-3 rounded-2xl font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isSubmitting ? 'Saving...' : 'Create Patient'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      <ModalPortal isOpen={Boolean(previewAttachment)} onClose={handleClosePreview}>
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{previewAttachment?.filename || 'Attachment preview'}</h2>
              <p className="mt-2 text-sm text-slate-500">Secure preview for image and PDF clinical records.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {previewAttachment && (
                <button
                  onClick={() => void handleDownloadAttachment(previewAttachment)}
                  disabled={isAttachmentActionPending(previewAttachment._id, 'download')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                >
                  {isAttachmentActionPending(previewAttachment._id, 'download') && <ButtonSpinner />}
                  {isAttachmentActionPending(previewAttachment._id, 'download') ? 'Preparing...' : 'Download'}
                </button>
              )}
              <button
                onClick={handleClosePreview}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mt-6 min-h-[60vh] rounded-[1.75rem] border border-slate-100 bg-slate-50 p-4">
            {isPreviewLoading && (
              <div className="flex h-[60vh] items-center justify-center text-sm font-medium text-slate-500">
                Loading secure preview...
              </div>
            )}

            {!isPreviewLoading && previewError && (
              <div className="flex h-[60vh] items-center justify-center rounded-3xl border border-red-200 bg-red-50 px-6 text-sm font-medium text-red-700">
                {previewError}
              </div>
            )}

            {!isPreviewLoading && !previewError && previewUrl && previewAttachment?.contentType === 'application/pdf' && (
              <iframe
                title={previewAttachment.filename}
                src={previewUrl}
                className="h-[60vh] w-full rounded-[1.5rem] bg-white"
              />
            )}

            {!isPreviewLoading && !previewError && previewUrl && previewAttachment?.contentType?.startsWith('image/') && (
              <div className="flex h-[60vh] items-center justify-center">
                <img
                  src={previewUrl}
                  alt={previewAttachment.filename}
                  className="max-h-[60vh] w-auto rounded-[1.5rem] object-contain shadow-lg"
                />
              </div>
            )}
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
