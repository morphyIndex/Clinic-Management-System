import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { isApiError } from '../lib/api.js';
import { loadMedications } from '../lib/clinicApi.js';


const emptyPrescriptionItem = () => ({
  medicationId: '',
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  quantity: '',
  unitPrice: '',
  instructions: '',
});

const emptyEncounterForm = () => ({
  chiefComplaint: '',
  diagnosis: '',
  notes: '',
  consultationFee: '',
  vitals: {
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    weight: '',
  },
});

const emptyPrescriptionForm = () => ({
  notes: '',
  items: [emptyPrescriptionItem()],
});

function getErrorMessage(error, fallbackMessage) {
  return isApiError(error) ? error.message : fallbackMessage;
}

function formatDateTime(value) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatStatus(status) {
  return String(status ?? 'draft')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return '0';
  }

  return amount.toLocaleString('en-US');
}

function buildEncounterForm(encounter) {
  if (!encounter) {
    return emptyEncounterForm();
  }

  return {
    chiefComplaint: encounter.chiefComplaint ?? '',
    diagnosis: encounter.diagnosis ?? '',
    notes: encounter.notes ?? '',
    consultationFee:
      encounter.consultationFee === undefined || encounter.consultationFee === null
        ? ''
        : String(encounter.consultationFee),
    vitals: {
      bloodPressure: String(encounter.vitals?.bloodPressure ?? ''),
      heartRate: String(encounter.vitals?.heartRate ?? ''),
      temperature: String(encounter.vitals?.temperature ?? ''),
      weight: String(encounter.vitals?.weight ?? ''),
    },
  };
}

function buildPrescriptionForm(prescription) {
  if (!prescription) {
    return emptyPrescriptionForm();
  }

  return {
    notes: prescription.notes ?? '',
    items:
      Array.isArray(prescription.items) && prescription.items.length > 0
        ? prescription.items.map((item) => ({
          medicationId: item.medicationId ?? '',
          medicineName: item.medicineName ?? '',
          dosage: item.dosage ?? '',
          frequency: item.frequency ?? '',
          duration: item.duration ?? '',
          quantity: item.quantity === undefined || item.quantity === null ? '' : String(item.quantity),
          unitPrice: item.unitPrice === undefined || item.unitPrice === null ? '' : String(item.unitPrice),
          instructions: item.instructions ?? '',
        }))
        : [emptyPrescriptionItem()],
  };
}

function findEncounterForAppointment(record, appointmentId) {
  if (!record || !appointmentId) {
    return null;
  }

  return record.encounters.find((encounter) => encounter.appointmentId === appointmentId) ?? null;
}

function findPrescriptionForEncounter(record, encounterId) {
  if (!record || !encounterId) {
    return null;
  }

  return record.prescriptions.find((prescription) => prescription.encounterId === encounterId) ?? null;
}

export default function DoctorWorkspacePanel({ selectedRecord, onRecordUpdated }) {
  const { request, user } = useAuth();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [encounterForm, setEncounterForm] = useState(emptyEncounterForm);
  const [prescriptionForm, setPrescriptionForm] = useState(emptyPrescriptionForm);
  const [encounterError, setEncounterError] = useState('');
  const [prescriptionError, setPrescriptionError] = useState('');
  const [workspaceNotice, setWorkspaceNotice] = useState('');
  const [isEncounterSaving, setIsEncounterSaving] = useState(false);
  const [isPrescriptionSaving, setIsPrescriptionSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [medications, setMedications] = useState([]);
  const [medSearches, setMedSearches] = useState({});

  const hasFixedFee = user?.consultationFee != null && user.consultationFee > 0;

  useEffect(() => {
    let cancelled = false;
    loadMedications(request)
      .then((data) => { if (!cancelled) setMedications(data); })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [request]);

  const medicationLookup = useMemo(
    () => new Map(medications.map((medication) => [medication._id, medication])),
    [medications],
  );

  const appointments = useMemo(
    () =>
      Array.isArray(selectedRecord?.appointments)
        ? selectedRecord.appointments.filter((appointment) => appointment.status !== 'cancelled')
        : [],
    [selectedRecord?.appointments],
  );
  const encounters = useMemo(
    () => (Array.isArray(selectedRecord?.encounters) ? selectedRecord.encounters : []),
    [selectedRecord?.encounters],
  );
  const selectedAppointment = appointments.find((appointment) => appointment._id === selectedAppointmentId) ?? null;
  const selectedEncounter = findEncounterForAppointment(selectedRecord, selectedAppointmentId);
  const selectedPrescription = findPrescriptionForEncounter(selectedRecord, selectedEncounter?._id);
  const isEncounterLocked = selectedEncounter?.status === 'finalized';
  const isPrescriptionLocked = selectedPrescription?.status === 'finalized';
  const draftPrescriptionTotal = useMemo(
    () =>
      prescriptionForm.items.reduce((sum, item) => {
        const catalogMed = item.medicationId ? medicationLookup.get(item.medicationId) : null;
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(catalogMed ? catalogMed.unitPrice : item.unitPrice || 0);
        return sum + (Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0);
      }, 0),
    [medicationLookup, prescriptionForm.items],
  );

  const openMedicineSearch = (index, currentValue = '') => {
    setMedSearches((current) => ({ ...current, [index]: currentValue }));
  };

  const closeMedicineSearch = (index) => {
    setMedSearches((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  };

  const updatePrescriptionItem = (index, updater) => {
    setPrescriptionForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updater(item) } : item,
      ),
    }));
  };

  useEffect(() => {
    if (!selectedRecord) {
      setSelectedAppointmentId('');
      return;
    }

    const currentAppointmentIsStillValid =
      selectedAppointmentId &&
      (appointments.some((appointment) => appointment._id === selectedAppointmentId) ||
        encounters.some((encounter) => encounter.appointmentId === selectedAppointmentId));

    if (!currentAppointmentIsStillValid) {
      const initialAppointmentId = encounters[0]?.appointmentId ?? appointments[0]?._id ?? '';
      setSelectedAppointmentId(initialAppointmentId);
    }
  }, [appointments, encounters, selectedAppointmentId, selectedRecord]);

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    setWorkspaceNotice('');
    setEncounterError('');
    setPrescriptionError('');
  }, [selectedRecord]);

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    setEncounterForm(buildEncounterForm(selectedEncounter));
    setPrescriptionForm(buildPrescriptionForm(selectedPrescription));
    setEncounterError('');
    setPrescriptionError('');
  }, [selectedAppointmentId, selectedEncounter, selectedPrescription, selectedRecord]);

  if (!selectedRecord) {
    return null;
  }

  const handleSaveEncounter = async (event) => {
    event.preventDefault();
    setEncounterError('');
    setWorkspaceNotice('');

    if (!selectedAppointmentId) {
      setEncounterError('Choose an appointment before saving doctor notes.');
      return;
    }

    const vitals = Object.fromEntries(
      Object.entries(encounterForm.vitals).filter(([, value]) => String(value ?? '').trim().length > 0),
    );

    const payload = {
      appointmentId: selectedAppointmentId,
      chiefComplaint: encounterForm.chiefComplaint.trim() || undefined,
      diagnosis: encounterForm.diagnosis.trim() || undefined,
      notes: encounterForm.notes.trim() || undefined,
      consultationFee: encounterForm.consultationFee === '' ? undefined : Number(encounterForm.consultationFee),
      vitals,
    };

    setIsEncounterSaving(true);

    try {
      if (selectedEncounter?._id) {
        await request(`/encounters/${selectedEncounter._id}`, {
          method: 'PATCH',
          body: {
            chiefComplaint: payload.chiefComplaint,
            diagnosis: payload.diagnosis,
            notes: payload.notes,
            consultationFee: payload.consultationFee,
            vitals: payload.vitals,
          },
        });
      } else {
        await request('/encounters', {
          method: 'POST',
          body: payload,
        });
      }

      setWorkspaceNotice(selectedEncounter?._id ? 'Encounter updated successfully.' : 'Encounter created successfully.');
      await onRecordUpdated?.();
    } catch (error) {
      setEncounterError(getErrorMessage(error, 'The encounter could not be saved.'));
    } finally {
      setIsEncounterSaving(false);
    }
  };

  const handleFinalizeEncounter = async () => {
    setEncounterError('');
    setWorkspaceNotice('');

    if (!selectedEncounter?._id) {
      setEncounterError('Save the encounter draft before finalizing it.');
      return;
    }

    setIsFinalizing(true);

    try {
      await request(`/encounters/${selectedEncounter._id}/finalize`, {
        method: 'POST',
      });
      setWorkspaceNotice('Encounter finalized. The clinical note is now locked.');
      await onRecordUpdated?.();
    } catch (error) {
      setEncounterError(getErrorMessage(error, 'The encounter could not be finalized.'));
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSavePrescription = async (event) => {
    event.preventDefault();
    setPrescriptionError('');
    setWorkspaceNotice('');

    if (!selectedEncounter?._id) {
      setPrescriptionError('Create the encounter first, then add the prescription.');
      return;
    }

    const normalizedItems = prescriptionForm.items
      .map((item) => {
        const catalogMed = item.medicationId ? medicationLookup.get(item.medicationId) : null;
        return {
          medicationId: item.medicationId || undefined,
          medicineName: item.medicineName.trim(),
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          duration: item.duration.trim(),
          quantity: item.quantity === '' ? '' : Number(item.quantity),
          unitPrice: catalogMed ? Number(catalogMed.unitPrice) : (item.unitPrice === '' ? 0 : Number(item.unitPrice)),
          instructions: item.instructions.trim(),
        };
      })
      .filter((item) => item.medicineName || item.dosage || item.frequency || item.duration || item.instructions);

    if (normalizedItems.length === 0) {
      setPrescriptionError('Add at least one medicine before saving the prescription.');
      return;
    }

    const hasIncompleteItem = normalizedItems.some(
      (item) =>
        !item.medicineName ||
        !item.dosage ||
        !item.frequency ||
        !item.duration ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0,
    );

    if (hasIncompleteItem) {
      setPrescriptionError('Complete all medicine fields, quantity, and unit price before saving.');
      return;
    }

    setIsPrescriptionSaving(true);

    try {
      await request('/prescriptions', {
        method: 'POST',
        body: {
          encounterId: selectedEncounter._id,
          notes: prescriptionForm.notes.trim() || undefined,
          items: normalizedItems.map((item) => ({
            ...item,
            instructions: item.instructions || undefined,
          })),
        },
      });

      setWorkspaceNotice(
        selectedEncounter?.status === 'finalized'
          ? 'Prescription saved and billing has been synced for this finalized encounter.'
          : 'Prescription saved successfully. Finalize the encounter to push charges into billing.',
      );
      await onRecordUpdated?.();
    } catch (error) {
      setPrescriptionError(getErrorMessage(error, 'The prescription could not be saved.'));
    } finally {
      setIsPrescriptionSaving(false);
    }
  };

  const activeVisitLabel = selectedAppointment ? formatDateTime(selectedAppointment.scheduledAt) : 'Choose appointment';
  const encounterStatusLabel = selectedEncounter ? formatStatus(selectedEncounter.status) : 'Not started';
  const prescriptionStatusLabel = selectedPrescription ? formatStatus(selectedPrescription.status) : 'Draft';

  return (
    <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.10),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-indigo-500">Doctor Workspace</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Clinical Notes and Medication Plan</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            {selectedRecord.patient.patientCode} • {selectedRecord.patient.room || 'Unassigned room'} • Keep the visit summary, prescription, and billing-ready medicine pricing in one focused workspace.
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-white/80 bg-white/80 px-5 py-4 text-right shadow-sm backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Patient</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{selectedRecord.patient.fullName}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            {selectedRecord.patient.gender || 'Profile'} • {selectedRecord.patient.dateOfBirth ? formatDateTime(selectedRecord.patient.dateOfBirth).split(',')[0] : 'DOB pending'}
          </p>
        </div>
      </div>

      {workspaceNotice && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {workspaceNotice}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Active Visit</p>
          <p className="mt-3 text-lg font-bold text-slate-900">{activeVisitLabel}</p>
          <p className="mt-2 text-sm text-slate-500">
            {selectedAppointment?.reason || 'Select a scheduled appointment to load the visit context.'}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Encounter Status</p>
          <p className="mt-3 text-lg font-bold text-slate-900">{encounterStatusLabel}</p>
          <p className="mt-2 text-sm text-slate-500">
            {selectedEncounter ? 'Finalize the encounter when notes are ready to lock.' : 'Start the encounter to begin clinical documentation.'}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Prescription Draft</p>
          <p className="mt-3 text-lg font-bold text-slate-900">{prescriptionStatusLabel}</p>
          <p className="mt-2 text-sm text-slate-500">
            {prescriptionForm.items.length} medicine item(s) • Estimated total {formatCurrency(draftPrescriptionTotal)}
          </p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
          No appointments are linked to this patient yet. A doctor encounter needs an appointment before notes or
          prescriptions can be recorded.
        </div>
      ) : (
        <div className="mt-8 grid gap-6 2xl:grid-cols-[0.98fr_1.02fr]">
          <section className="rounded-[2rem] border border-slate-200/70 bg-white/75 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Appointment</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Encounter Notes</h3>
              </div>
              <label className="block min-w-0 md:w-80">
                <span className="sr-only">Choose appointment</span>
                <select
                  value={selectedAppointmentId}
                  onChange={(event) => setSelectedAppointmentId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose appointment</option>
                  {appointments.map((appointment) => (
                    <option key={appointment._id} value={appointment._id}>
                      {formatDateTime(appointment.scheduledAt)} • {formatStatus(appointment.status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedAppointment && (
              <div className="mt-5 rounded-[1.5rem] border border-slate-200/70 bg-white px-5 py-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{selectedAppointment.reason || 'Consultation visit'}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDateTime(selectedAppointment.scheduledAt)} • {formatStatus(selectedAppointment.status)}
                </p>
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSaveEncounter}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-bold text-slate-700">Chief Complaint</span>
                  <textarea
                    rows="3"
                    value={encounterForm.chiefComplaint}
                    disabled={isEncounterLocked}
                    onChange={(event) =>
                      setEncounterForm((current) => ({ ...current, chiefComplaint: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    placeholder="Primary concern..."
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-bold text-slate-700">Diagnosis</span>
                  <textarea
                    rows="3"
                    value={encounterForm.diagnosis}
                    disabled={isEncounterLocked}
                    onChange={(event) =>
                      setEncounterForm((current) => ({ ...current, diagnosis: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    placeholder="Diagnosis..."
                  />
                </label>
              </div>

              <label className="space-y-1.5 block">
                <span className="text-sm font-bold text-slate-700">Clinical Notes</span>
                <textarea
                  rows="4"
                  value={encounterForm.notes}
                  disabled={isEncounterLocked}
                  onChange={(event) => setEncounterForm((current) => ({ ...current, notes: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  placeholder="Assessment, findings, and plan..."
                />
              </label>

              <div className="rounded-[1.5rem] border border-slate-200/70 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Vitals</p>
                    <p className="text-xs text-slate-500">Capture the latest bedside measurements for this visit.</p>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Clinical capture</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <label className="space-y-1.5">
                    <span className="text-sm font-bold text-slate-700">Blood Pressure</span>
                    <input
                      value={encounterForm.vitals.bloodPressure}
                      disabled={isEncounterLocked}
                      onChange={(event) =>
                        setEncounterForm((current) => ({
                          ...current,
                          vitals: { ...current.vitals, bloodPressure: event.target.value },
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="120/80"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-bold text-slate-700">Heart Rate</span>
                    <input
                      value={encounterForm.vitals.heartRate}
                      disabled={isEncounterLocked}
                      onChange={(event) =>
                        setEncounterForm((current) => ({
                          ...current,
                          vitals: { ...current.vitals, heartRate: event.target.value },
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="72 bpm"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-bold text-slate-700">Temperature</span>
                    <input
                      value={encounterForm.vitals.temperature}
                      disabled={isEncounterLocked}
                      onChange={(event) =>
                        setEncounterForm((current) => ({
                          ...current,
                          vitals: { ...current.vitals, temperature: event.target.value },
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="37 C"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-bold text-slate-700">Weight</span>
                    <input
                      value={encounterForm.vitals.weight}
                      disabled={isEncounterLocked}
                      onChange={(event) =>
                        setEncounterForm((current) => ({
                          ...current,
                          vitals: { ...current.vitals, weight: event.target.value },
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="65 kg"
                    />
                  </label>
                </div>
              </div>

              {hasFixedFee ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700">
                  Consultation fee: <strong>{Number(user.consultationFee).toLocaleString('en-US')}</strong> (set by admin)
                </div>
              ) : (
                <label className="space-y-1.5 block w-full justify-between items-center">
                  <div className="text-sm font-bold text-slate-700">Consultation Fee</div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={encounterForm.consultationFee}
                    disabled={isEncounterLocked}
                    onChange={(event) =>
                      setEncounterForm((current) => ({ ...current, consultationFee: event.target.value }))
                    }
                    className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    placeholder="15000"
                  />
                </label>
              )}

              <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                <p className="font-semibold text-slate-900">Encounter Status</p>
                <p className="mt-1">
                  {selectedEncounter ? formatStatus(selectedEncounter.status) : 'No encounter created for this appointment yet.'}
                </p>
              </div>

              {encounterError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {encounterError}
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200/70 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Save the encounter draft first, then finalize it to lock notes and enable full billing sync.
                </p>
                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isEncounterSaving || isEncounterLocked}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    {isEncounterSaving ? 'Saving...' : selectedEncounter ? 'Update Encounter' : 'Create Encounter'}
                  </button>
                  <button
                    type="button"
                    disabled={!selectedEncounter?._id || isEncounterLocked || isFinalizing}
                    onClick={() => void handleFinalizeEncounter()}
                    className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isFinalizing ? 'Finalizing...' : isEncounterLocked ? 'Encounter Finalized' : 'Finalize Encounter'}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Medication Plan</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Prescription</h3>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                {selectedPrescription ? formatStatus(selectedPrescription.status) : 'Draft'}
              </span>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSavePrescription}>
              <label className="space-y-1.5 block">
                <span className="text-sm font-bold text-slate-700">Prescription Notes</span>
                <textarea
                  rows="3"
                  value={prescriptionForm.notes}
                  disabled={isPrescriptionLocked}
                  onChange={(event) => setPrescriptionForm((current) => ({ ...current, notes: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  placeholder="Special instructions or counseling notes..."
                />
              </label>

              <div className="space-y-3">
                {prescriptionForm.items.map((item, index) => {
                  const searchIsOpen = Object.prototype.hasOwnProperty.call(medSearches, index);
                  const searchTerm = medSearches[index] ?? '';
                  const filteredMeds = searchIsOpen
                    ? medications.filter((m) =>
                      searchTerm.trim().length === 0 ||
                      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (m.genericName ?? '').toLowerCase().includes(searchTerm.toLowerCase())
                    ).slice(0, 8)
                    : [];
                  const catalogMed = item.medicationId ? medicationLookup.get(item.medicationId) : null;
                  const lineTotal = Number(item.quantity || 0) * Number(catalogMed ? catalogMed.unitPrice : item.unitPrice || 0);

                  return (
                    <article key={`prescription-item-${index}`} className="rounded-[1.75rem] border border-slate-200/70 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">Medication {String(index + 1).padStart(2, '0')}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Search the shared pharmacy catalog or type a custom medicine name for this visit.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isPrescriptionLocked || prescriptionForm.items.length === 1}
                          onClick={() =>
                            setPrescriptionForm((current) => ({
                              ...current,
                              items: current.items.filter((_, i) => i !== index),
                            }))
                          }
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                        <div className="relative space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-700">Medicine</span>
                            {catalogMed && (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700">
                                Catalog
                              </span>
                            )}
                          </div>
                          <input
                            value={item.medicineName}
                            disabled={isPrescriptionLocked}
                            onChange={(event) => {
                              const value = event.target.value;
                              setMedSearches((s) => ({ ...s, [index]: value }));
                              updatePrescriptionItem(index, () => ({ medicineName: value, medicationId: '' }));
                            }}
                            onFocus={() => openMedicineSearch(index, item.medicineName)}
                            onBlur={() => setTimeout(() => closeMedicineSearch(index), 200)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                            placeholder="Search the pharmacy catalog..."
                          />
                          {searchIsOpen && (
                            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                              {filteredMeds.length > 0 ? filteredMeds.map((med) => (
                                <li
                                  key={med._id}
                                  onMouseDown={() => {
                                    updatePrescriptionItem(index, (currentItem) => ({
                                      medicationId: med._id,
                                      medicineName: med.name,
                                      dosage: currentItem.dosage || med.defaultDosage || '',
                                      frequency: currentItem.frequency || med.defaultFrequency || '',
                                      duration: currentItem.duration || med.defaultDuration || '',
                                      unitPrice: String(med.unitPrice ?? ''),
                                    }));
                                    closeMedicineSearch(index);
                                  }}
                                  className="cursor-pointer px-3 py-2 text-sm hover:bg-indigo-50"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <span className="font-medium text-slate-900">{med.name}</span>
                                      {med.genericName && (
                                        <span className="ml-1 text-xs text-slate-500">({med.genericName})</span>
                                      )}
                                      <p className="mt-0.5 text-[11px] text-slate-400">
                                        {med.defaultDosage || 'Dosage not set'} • {med.defaultFrequency || 'Frequency not set'}
                                      </p>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                                      {formatCurrency(med.unitPrice)}
                                    </span>
                                  </div>
                                </li>
                              )) : (
                                <li className="px-3 py-2 text-sm text-slate-500">
                                  No pharmacy catalog match. You can still type a custom medicine name.
                                </li>
                              )}
                              {searchTerm.trim().length > 0 && (
                                <li
                                  onMouseDown={() => closeMedicineSearch(index)}
                                  className="cursor-pointer border-t border-slate-100 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                                >
                                  Use custom name &ldquo;{searchTerm}&rdquo;
                                </li>
                              )}
                            </ul>
                          )}
                          <p className="text-xs text-slate-500 mt-0.5">
                            {catalogMed
                              ? `${catalogMed.genericName ? `${catalogMed.genericName} · ` : ''}Using live pharmacy price ${formatCurrency(catalogMed.unitPrice)}`
                              : 'Search the pharmacy catalog or type a custom medicine name.'}
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="space-y-1.5">
                            <span className="text-sm font-bold text-slate-700">Dosage</span>
                            <input
                              value={item.dosage}
                              disabled={isPrescriptionLocked}
                              onChange={(event) =>
                                updatePrescriptionItem(index, () => ({ dosage: event.target.value }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                              placeholder="500 mg"
                            />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-sm font-bold text-slate-700">Frequency</span>
                            <input
                              value={item.frequency}
                              disabled={isPrescriptionLocked}
                              onChange={(event) =>
                                updatePrescriptionItem(index, () => ({ frequency: event.target.value }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                              placeholder="Twice daily"
                            />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-sm font-bold text-slate-700">Duration</span>
                            <input
                              value={item.duration}
                              disabled={isPrescriptionLocked}
                              onChange={(event) =>
                                updatePrescriptionItem(index, () => ({ duration: event.target.value }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                              placeholder="5 days"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,0.75fr)_minmax(0,0.85fr)_minmax(0,1fr)]">
                        <label className="space-y-1.5">
                          <span className="text-sm font-bold text-slate-700">Quantity</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            disabled={isPrescriptionLocked}
                            onChange={(event) =>
                              updatePrescriptionItem(index, () => ({ quantity: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                            placeholder="10"
                          />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-sm font-bold text-slate-700">
                            Unit Price {catalogMed ? '(catalog)' : ''}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={catalogMed ? String(catalogMed.unitPrice ?? '') : item.unitPrice}
                            disabled={isPrescriptionLocked || Boolean(catalogMed)}
                            onChange={(event) =>
                              updatePrescriptionItem(index, () => ({ unitPrice: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                            placeholder="1500"
                          />
                        </label>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Estimated line total</p>
                          <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(lineTotal)}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {catalogMed ? 'Using live pharmacy catalog pricing.' : 'Custom medicine pricing can still be adjusted.'}
                          </p>
                        </div>
                      </div>

                      <label className="mt-3 block space-y-1.5">
                        <span className="text-sm font-bold text-slate-700">Instructions</span>
                        <textarea
                          rows="2"
                          value={item.instructions}
                          disabled={isPrescriptionLocked}
                          onChange={(event) =>
                            updatePrescriptionItem(index, () => ({ instructions: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                          placeholder="Instructions (e.g., take after meals)"
                        />
                      </label>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200/70 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Add medicines from the shared catalog to keep pricing consistent for pharmacy and billing.
                </p>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isPrescriptionLocked}
                    onClick={() =>
                      setPrescriptionForm((current) => ({
                        ...current,
                        items: [...current.items, emptyPrescriptionItem()],
                      }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    + Add Medicine
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedEncounter?._id || isPrescriptionSaving || isPrescriptionLocked}
                    className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {isPrescriptionSaving ? 'Saving...' : 'Save Prescription'}
                  </button>
                </div>
              </div>

              {prescriptionError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {prescriptionError}
                </div>
              )}
            </form>

            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Clinical Timeline</p>
              <ul className="mt-4 space-y-3">
                {encounters.slice(0, 4).map((encounter) => {
                  const prescription = findPrescriptionForEncounter(selectedRecord, encounter._id);
                  return (
                    <li key={encounter._id} className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                      <p className="font-semibold text-slate-900">{encounter.diagnosis || 'Encounter draft'}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatStatus(encounter.status)} • {formatDateTime(encounter.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {prescription ? `${prescription.items?.length ?? 0} medicine items saved` : 'No prescription saved yet'}
                      </p>
                    </li>
                  );
                })}

                {encounters.length === 0 && (
                  <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                    No encounter history yet for this patient.
                  </li>
                )}
              </ul>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
