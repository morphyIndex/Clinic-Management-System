import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { isApiError } from '../lib/api.js';

const emptyPrescriptionItem = () => ({
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
  const { request } = useAuth();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [encounterForm, setEncounterForm] = useState(emptyEncounterForm);
  const [prescriptionForm, setPrescriptionForm] = useState(emptyPrescriptionForm);
  const [encounterError, setEncounterError] = useState('');
  const [prescriptionError, setPrescriptionError] = useState('');
  const [workspaceNotice, setWorkspaceNotice] = useState('');
  const [isEncounterSaving, setIsEncounterSaving] = useState(false);
  const [isPrescriptionSaving, setIsPrescriptionSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const appointments = Array.isArray(selectedRecord?.appointments)
    ? selectedRecord.appointments.filter((appointment) => appointment.status !== 'cancelled')
    : [];
  const encounters = Array.isArray(selectedRecord?.encounters) ? selectedRecord.encounters : [];
  const selectedAppointment = appointments.find((appointment) => appointment._id === selectedAppointmentId) ?? null;
  const selectedEncounter = findEncounterForAppointment(selectedRecord, selectedAppointmentId);
  const selectedPrescription = findPrescriptionForEncounter(selectedRecord, selectedEncounter?._id);
  const isEncounterLocked = selectedEncounter?.status === 'finalized';
  const isPrescriptionLocked = selectedPrescription?.status === 'finalized';

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    const initialAppointmentId = encounters[0]?.appointmentId ?? appointments[0]?._id ?? '';
    setSelectedAppointmentId(initialAppointmentId);
    setWorkspaceNotice('');
    setEncounterError('');
    setPrescriptionError('');
  }, [appointments, encounters, selectedRecord]);

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
      .map((item) => ({
        medicineName: item.medicineName.trim(),
        dosage: item.dosage.trim(),
        frequency: item.frequency.trim(),
        duration: item.duration.trim(),
        quantity: item.quantity === '' ? '' : Number(item.quantity),
        unitPrice: item.unitPrice === '' ? 0 : Number(item.unitPrice),
        instructions: item.instructions.trim(),
      }))
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

  return (
    <section className="mt-8 rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-indigo-500">Doctor Workspace</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Clinical Notes and Medication Plan</h2>
            <p className="mt-2 text-sm text-slate-500">
              {selectedRecord.patient.patientCode} • {selectedRecord.patient.room || 'Unassigned room'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Patient</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{selectedRecord.patient.fullName}</p>
          </div>
        </div>

        {workspaceNotice && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {workspaceNotice}
          </div>
        )}

        {appointments.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
            No appointments are linked to this patient yet. A doctor encounter needs an appointment before notes or
            prescriptions can be recorded.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] border border-slate-100 bg-slate-50/70 p-6">
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
                <div className="mt-5 rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">{selectedAppointment.reason || 'Consultation visit'}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateTime(selectedAppointment.scheduledAt)} • {formatStatus(selectedAppointment.status)}
                  </p>
                </div>
              )}

              <form className="mt-6 space-y-5" onSubmit={handleSaveEncounter}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700">Chief Complaint</span>
                    <textarea
                      rows="4"
                      value={encounterForm.chiefComplaint}
                      disabled={isEncounterLocked}
                      onChange={(event) =>
                        setEncounterForm((current) => ({ ...current, chiefComplaint: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="Patient's primary concern or presenting problem..."
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700">Diagnosis</span>
                    <textarea
                      rows="4"
                      value={encounterForm.diagnosis}
                      disabled={isEncounterLocked}
                      onChange={(event) =>
                        setEncounterForm((current) => ({ ...current, diagnosis: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="Working diagnosis or confirmed diagnosis..."
                    />
                  </label>
                </div>

                <label className="space-y-2 block">
                  <span className="text-sm font-bold text-slate-700">Clinical Notes</span>
                  <textarea
                    rows="5"
                    value={encounterForm.notes}
                    disabled={isEncounterLocked}
                    onChange={(event) => setEncounterForm((current) => ({ ...current, notes: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    placeholder="Assessment, examination findings, and treatment plan..."
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-5">
                  <label className="space-y-2">
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
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="120/80"
                    />
                  </label>
                  <label className="space-y-2">
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
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="72 bpm"
                    />
                  </label>
                  <label className="space-y-2">
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
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="37 C"
                    />
                  </label>
                  <label className="space-y-2">
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
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="65 kg"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700">Consultation Fee</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={encounterForm.consultationFee}
                      disabled={isEncounterLocked}
                      onChange={(event) =>
                        setEncounterForm((current) => ({ ...current, consultationFee: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      placeholder="15000"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
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
              </form>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Medication Plan</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">Prescription</h3>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                  {selectedPrescription ? formatStatus(selectedPrescription.status) : 'Draft'}
                </span>
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleSavePrescription}>
                <label className="space-y-2 block">
                  <span className="text-sm font-bold text-slate-700">Prescription Notes</span>
                  <textarea
                    rows="4"
                    value={prescriptionForm.notes}
                    disabled={isPrescriptionLocked}
                    onChange={(event) => setPrescriptionForm((current) => ({ ...current, notes: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    placeholder="Special instructions, follow-up advice, or counseling notes..."
                  />
                </label>

                <div className="space-y-4">
                  {prescriptionForm.items.map((item, index) => (
                    <article key={`prescription-item-${index}`} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-bold text-slate-700">Medicine</span>
                          <input
                            value={item.medicineName}
                            disabled={isPrescriptionLocked}
                            onChange={(event) =>
                              setPrescriptionForm((current) => ({
                                ...current,
                                items: current.items.map((currentItem, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentItem, medicineName: event.target.value }
                                    : currentItem,
                                ),
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                            placeholder="Amoxicillin"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-bold text-slate-700">Dosage</span>
                          <input
                            value={item.dosage}
                            disabled={isPrescriptionLocked}
                            onChange={(event) =>
                              setPrescriptionForm((current) => ({
                                ...current,
                                items: current.items.map((currentItem, currentIndex) =>
                                  currentIndex === index ? { ...currentItem, dosage: event.target.value } : currentItem,
                                ),
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                            placeholder="500 mg"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-bold text-slate-700">Frequency</span>
                          <input
                            value={item.frequency}
                            disabled={isPrescriptionLocked}
                            onChange={(event) =>
                              setPrescriptionForm((current) => ({
                                ...current,
                                items: current.items.map((currentItem, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentItem, frequency: event.target.value }
                                    : currentItem,
                                ),
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                            placeholder="Twice daily"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-bold text-slate-700">Duration</span>
                          <input
                            value={item.duration}
                            disabled={isPrescriptionLocked}
                            onChange={(event) =>
                              setPrescriptionForm((current) => ({
                                ...current,
                                items: current.items.map((currentItem, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentItem, duration: event.target.value }
                                    : currentItem,
                                ),
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                            placeholder="5 days"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-bold text-slate-700">Quantity</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            disabled={isPrescriptionLocked}
                            onChange={(event) =>
                              setPrescriptionForm((current) => ({
                                ...current,
                                items: current.items.map((currentItem, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentItem, quantity: event.target.value }
                                    : currentItem,
                                ),
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                            placeholder="10"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-bold text-slate-700">Unit Price</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            disabled={isPrescriptionLocked}
                            onChange={(event) =>
                              setPrescriptionForm((current) => ({
                                ...current,
                                items: current.items.map((currentItem, currentIndex) =>
                                  currentIndex === index
                                    ? { ...currentItem, unitPrice: event.target.value }
                                    : currentItem,
                                ),
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                            placeholder="1500"
                          />
                        </label>
                      </div>

                      <label className="mt-4 block space-y-2">
                        <span className="text-sm font-bold text-slate-700">Instructions</span>
                        <textarea
                          rows="3"
                          value={item.instructions}
                          disabled={isPrescriptionLocked}
                          onChange={(event) =>
                            setPrescriptionForm((current) => ({
                              ...current,
                              items: current.items.map((currentItem, currentIndex) =>
                                currentIndex === index
                                  ? { ...currentItem, instructions: event.target.value }
                                  : currentItem,
                              ),
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                          placeholder="Take after meals. Return if symptoms do not improve."
                        />
                      </label>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          disabled={isPrescriptionLocked || prescriptionForm.items.length === 1}
                          onClick={() =>
                            setPrescriptionForm((current) => ({
                              ...current,
                              items: current.items.filter((_, currentIndex) => currentIndex !== index),
                            }))
                          }
                          className="text-sm font-bold text-slate-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:text-slate-300"
                        >
                          Remove medicine
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isPrescriptionLocked}
                    onClick={() =>
                      setPrescriptionForm((current) => ({
                        ...current,
                        items: [...current.items, emptyPrescriptionItem()],
                      }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    + Add Medicine
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedEncounter?._id || isPrescriptionSaving || isPrescriptionLocked}
                    className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {isPrescriptionSaving ? 'Saving...' : 'Save Prescription'}
                  </button>
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
