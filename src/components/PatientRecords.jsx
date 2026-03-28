import { useEffect, useState } from 'react';
import ModalPortal from './ModalPortal.jsx';
import DoctorWorkspaceModal from './DoctorWorkspaceModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { isApiError } from '../lib/api.js';

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
  return isApiError(error) ? error.message : fallbackMessage;
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

export default function PatientRecords() {
  const { request, user } = useAuth();
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
  const [submitError, setSubmitError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [recordError, setRecordError] = useState('');
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [isDoctorWorkspaceOpen, setIsDoctorWorkspaceOpen] = useState(false);

  const canCreatePatients = ['clinic_admin', 'receptionist', 'staff'].includes(user?.role ?? '');
  const canManageClinicalNotes = ['clinic_admin', 'doctor'].includes(user?.role ?? '');

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setSubmitError('');
  };

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
    setSubmitError('');

    try {
      await request('/patients', {
        method: 'POST',
        body: {
          ...patientForm,
          dateOfBirth: patientForm.dateOfBirth || undefined,
          allergies: splitList(patientForm.allergies),
          chronicConditions: splitList(patientForm.chronicConditions),
        },
      });
      setPatientForm(initialPatientForm);
      handleCloseCreateModal();
      await handleRefresh();
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'The patient record could not be created.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRecord = async (patientId) => {
    setIsRecordLoading(true);
    setRecordError('');
    setSelectedPatientId(patientId);

    try {
      const response = await request(`/patients/${patientId}/record`);
      setSelectedRecord(response);
      return response;
    } catch (error) {
      setRecordError(getErrorMessage(error, 'The patient record could not be loaded.'));
      return null;
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleRefreshSelectedRecord = async () => {
    if (!selectedPatientId) {
      return null;
    }

    return handleOpenRecord(selectedPatientId);
  };

  const handleOpenDoctorWorkspace = async (patientId) => {
    const response = await handleOpenRecord(patientId);
    if (response) {
      setIsDoctorWorkspaceOpen(true);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-start gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Patient Directory</h1>
              <p className="text-slate-500 font-medium">Live records, admissions, and profile snapshots synced from the backend.</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
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
            </div>
          </div>

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
                            onClick={() => void handleOpenRecord(patient._id)}
                            className="text-slate-500 hover:text-indigo-600 font-bold transition"
                          >
                            Open Record
                          </button>
                          {canManageClinicalNotes && (
                            <button
                              onClick={() => void handleOpenDoctorWorkspace(patient._id)}
                              className="text-indigo-600 hover:text-indigo-700 font-bold transition"
                            >
                              Doctor Workspace
                            </button>
                          )}
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
        </div>

        <aside className="xl:w-[22rem] shrink-0">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sticky top-28">
            <h2 className="text-xl font-bold text-slate-900">Patient Snapshot</h2>
            <p className="mt-2 text-sm text-slate-500">Select a patient to load encounters, prescriptions, attachments, and invoice counts.</p>

            {recordError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {recordError}
              </div>
            )}

            {isRecordLoading && <p className="mt-6 text-sm font-medium text-slate-500">Loading patient record...</p>}

            {!isRecordLoading && !selectedRecord && !recordError && (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Choose any row from the directory to inspect its live record summary.
              </div>
            )}

            {!isRecordLoading && selectedRecord && (
              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Patient</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">{selectedRecord.patient.fullName}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedRecord.patient.patientCode} • {selectedRecord.patient.room || 'Unassigned room'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Appointments</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{selectedRecord.appointments.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Invoices</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{selectedRecord.invoices.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Encounters</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{selectedRecord.encounters.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Attachments</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{selectedRecord.attachments.length}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Latest Activity</h4>
                  <ul className="mt-3 space-y-3">
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

                {canManageClinicalNotes && (
                  <button
                    onClick={() => setIsDoctorWorkspaceOpen(true)}
                    className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Open Doctor Workspace
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

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

            {submitError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {submitError}
              </div>
            )}

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

      <DoctorWorkspaceModal
        isOpen={isDoctorWorkspaceOpen}
        onClose={() => setIsDoctorWorkspaceOpen(false)}
        selectedRecord={selectedRecord}
        onRecordUpdated={handleRefreshSelectedRecord}
      />
    </div>
  );
}
