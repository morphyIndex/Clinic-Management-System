import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { isApiError } from '../lib/api.js';
import { appToast } from '../lib/toast.js';

const DISPENSE_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'dispensed', label: 'Dispensed' },
  { value: 'partial', label: 'Partially filled' },
  { value: 'unavailable', label: 'Unavailable' },
];

const dispenseStatusStyles = {
  pending: 'bg-amber-100 text-amber-700',
  dispensed: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-indigo-100 text-indigo-700',
  unavailable: 'bg-rose-100 text-rose-700',
};

function getErrorMessage(error, fallbackMessage) {
  return isApiError(error) ? error.message : fallbackMessage;
}

function formatStatus(value) {
  return String(value ?? 'pending')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value) {
  if (!value) {
    return 'Not recorded yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function PharmacyWorkspacePanel({ selectedRecord, onRecordUpdated }) {
  const { request } = useAuth();
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [dispenseStatus, setDispenseStatus] = useState('pending');
  const [dispenseNotes, setDispenseNotes] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const prescriptions = useMemo(
    () =>
      [...(Array.isArray(selectedRecord?.prescriptions) ? selectedRecord.prescriptions : [])].sort(
        (left, right) => new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() - new Date(left.updatedAt ?? left.createdAt ?? 0).getTime(),
      ),
    [selectedRecord?.prescriptions],
  );

  const encounterLookup = useMemo(
    () =>
      new Map((selectedRecord?.encounters ?? []).map((encounter) => [encounter._id, encounter])),
    [selectedRecord?.encounters],
  );

  const selectedPrescription =
    prescriptions.find((prescription) => prescription._id === selectedPrescriptionId) ?? prescriptions[0] ?? null;
  const selectedEncounter = selectedPrescription ? encounterLookup.get(selectedPrescription.encounterId) ?? null : null;

  useEffect(() => {
    const nextPrescription = prescriptions[0] ?? null;
    setSelectedPrescriptionId(nextPrescription?._id ?? '');
    setDispenseStatus(nextPrescription?.dispenseStatus ?? 'pending');
    setDispenseNotes(nextPrescription?.dispenseNotes ?? '');
    setSaveError('');
  }, [prescriptions]);

  useEffect(() => {
    if (!selectedPrescription) {
      return;
    }

    setDispenseStatus(selectedPrescription.dispenseStatus ?? 'pending');
    setDispenseNotes(selectedPrescription.dispenseNotes ?? '');
    setSaveError('');
  }, [selectedPrescription?._id, selectedPrescription?.dispenseNotes, selectedPrescription?.dispenseStatus]);

  const handleSaveDispense = async (event) => {
    event.preventDefault();
    setSaveError('');

    if (!selectedPrescription?._id) {
      setSaveError('Choose a prescription before updating the dispensing status.');
      return;
    }

    if (selectedPrescription.status !== 'finalized') {
      setSaveError('The doctor must finalize the prescription before pharmacy can process it.');
      return;
    }

    setIsSaving(true);

    try {
      await appToast.promise(
        request(`/prescriptions/${selectedPrescription._id}/dispense`, {
          method: 'PATCH',
          body: {
            dispenseStatus,
            dispenseNotes: dispenseNotes.trim() || undefined,
          },
        }),
        {
          loading: {
            title: 'Updating dispensing status',
            description: 'Saving the pharmacy handoff for this prescription.',
          },
          success: {
            title: 'Dispensing updated',
            description: 'The prescription queue has been refreshed.',
          },
          error: (error) => ({
            title: 'Dispensing update failed',
            description: getErrorMessage(error, 'The pharmacy status could not be saved.'),
          }),
        },
      );
      await onRecordUpdated?.();
    } catch {
      // Toast feedback already shown above.
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedRecord) {
    return null;
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-indigo-500">Pharmacy Workspace</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Medication Dispensing</h2>
          <p className="mt-2 text-sm text-slate-500">
            Review finalized prescriptions and record whether medication was released to the patient.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Ready Prescriptions</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {prescriptions.filter((prescription) => prescription.status === 'finalized').length}
          </p>
        </div>
      </div>

      {prescriptions.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
          No prescriptions are attached to this patient yet. Once a doctor saves and finalizes one, it will appear here.
        </div>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[2rem] border border-slate-100 bg-slate-50/70 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Prescription Queue</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Select Medication Plan</h3>
              </div>
              <label className="block min-w-0 md:w-80">
                <span className="sr-only">Choose prescription</span>
                <select
                  value={selectedPrescription?._id ?? ''}
                  onChange={(event) => setSelectedPrescriptionId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {prescriptions.map((prescription) => (
                    <option key={prescription._id} value={prescription._id}>
                      {formatDateTime(prescription.updatedAt ?? prescription.createdAt)} • {formatStatus(prescription.status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedPrescription && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedEncounter?.diagnosis || selectedEncounter?.chiefComplaint || 'Medication request'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Encounter status: {formatStatus(selectedEncounter?.status ?? 'draft')}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                        dispenseStatusStyles[selectedPrescription.dispenseStatus ?? 'pending']
                      }`}
                    >
                      {formatStatus(selectedPrescription.dispenseStatus ?? 'pending')}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Processed: {formatDateTime(selectedPrescription.dispensedAt)}
                  </p>
                </div>

                <ul className="space-y-3">
                  {selectedPrescription.items.map((item, index) => (
                    <li key={`${selectedPrescription._id}-${item.medicineName}-${index}`} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.medicineName}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.dosage} • {item.frequency} • {item.duration}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Qty {item.quantity} • Unit {Number(item.unitPrice ?? 0).toLocaleString('en-US')}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)}
                        </span>
                      </div>
                      {item.instructions && (
                        <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{item.instructions}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Dispense Status</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Pharmacy Release</h3>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                  dispenseStatusStyles[dispenseStatus]
                }`}
              >
                {formatStatus(dispenseStatus)}
              </span>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSaveDispense}>
              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Dispense Outcome</span>
                <select
                  value={dispenseStatus}
                  onChange={(event) => setDispenseStatus(event.target.value)}
                  disabled={!selectedPrescription || selectedPrescription.status !== 'finalized' || isSaving}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                >
                  {DISPENSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Dispense Notes</span>
                <textarea
                  rows="5"
                  value={dispenseNotes}
                  disabled={!selectedPrescription || selectedPrescription.status !== 'finalized' || isSaving}
                  onChange={(event) => setDispenseNotes(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  placeholder="Fill notes, unavailable items, or patient counseling summary..."
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Doctor Notes</p>
                <p className="mt-2 whitespace-pre-wrap">{selectedPrescription?.notes || 'No extra prescribing notes were added.'}</p>
              </div>

              {saveError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {saveError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedPrescription || selectedPrescription.status !== 'finalized' || isSaving}
                  className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSaving ? 'Saving...' : 'Save Dispense Status'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
