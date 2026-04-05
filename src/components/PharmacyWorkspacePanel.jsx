import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { isApiError } from '../lib/api.js';
import { appToast } from '../lib/toast.js';
import { loadMedications, saveMedication, removeMedication } from '../lib/clinicApi.js';

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

export default function PharmacyWorkspacePanel({
  selectedRecord,
  onRecordUpdated,
  defaultTab = 'dispensing',
  catalogOnly = false,
}) {
  const { request } = useAuth();
  const [activeTab, setActiveTab] = useState(catalogOnly ? 'catalog' : defaultTab);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [dispenseStatus, setDispenseStatus] = useState('pending');
  const [dispenseNotes, setDispenseNotes] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Medication catalog state
  const [medications, setMedications] = useState([]);
  const [isMedLoading, setIsMedLoading] = useState(false);
  const [medError, setMedError] = useState('');
  const [isMedSaving, setIsMedSaving] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [medForm, setMedForm] = useState({
    name: '', genericName: '', category: '', defaultDosage: '', defaultFrequency: '', defaultDuration: '', unitPrice: '',
  });

  useEffect(() => {
    setActiveTab(catalogOnly ? 'catalog' : defaultTab);
  }, [catalogOnly, defaultTab]);

  useEffect(() => {
    if (activeTab !== 'catalog') return;
    let cancelled = false;
    setIsMedLoading(true);
    setMedError('');
    loadMedications(request)
      .then((data) => { if (!cancelled) setMedications(data); })
      .catch((err) => { if (!cancelled) setMedError(getErrorMessage(err, 'Could not load medications.')); })
      .finally(() => { if (!cancelled) setIsMedLoading(false); });
    return () => { cancelled = true; };
  }, [request, activeTab]);

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
    setSelectedPrescriptionId((current) =>
      current && prescriptions.some((prescription) => prescription._id === current)
        ? current
        : nextPrescription?._id ?? '',
    );
    setSaveError('');
  }, [prescriptions]);

  useEffect(() => {
    if (!selectedPrescription) {
      return;
    }

    setDispenseStatus(selectedPrescription.dispenseStatus ?? 'pending');
    setDispenseNotes(selectedPrescription.dispenseNotes ?? '');
    setSaveError('');
  }, [selectedPrescription]);

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

  const openCreateMedication = () => {
    setEditingMed(null);
    setMedForm({ name: '', genericName: '', category: '', defaultDosage: '', defaultFrequency: '', defaultDuration: '', unitPrice: '' });
    setMedError('');
  };

  const openEditMedication = (med) => {
    setEditingMed(med);
    setMedForm({
      name: med.name ?? '',
      genericName: med.genericName ?? '',
      category: med.category ?? '',
      defaultDosage: med.defaultDosage ?? '',
      defaultFrequency: med.defaultFrequency ?? '',
      defaultDuration: med.defaultDuration ?? '',
      unitPrice: String(med.unitPrice ?? ''),
    });
    setMedError('');
  };

  const handleSaveMedication = async (event) => {
    event.preventDefault();
    setIsMedSaving(true);
    setMedError('');
    try {
      const result = await saveMedication(request, { ...medForm, _id: editingMed?._id });
      setMedications((current) =>
        editingMed ? current.map((m) => (m._id === result._id ? result : m)) : [...current, result],
      );
      setEditingMed(null);
      setMedForm({ name: '', genericName: '', category: '', defaultDosage: '', defaultFrequency: '', defaultDuration: '', unitPrice: '' });
    } catch (error) {
      setMedError(getErrorMessage(error, 'The medication could not be saved.'));
    } finally {
      setIsMedSaving(false);
    }
  };

  const handleDeleteMedication = async (medicationId) => {
    if (!window.confirm('Remove this medication from the catalog?')) return;
    try {
      await removeMedication(request, medicationId);
      setMedications((current) => current.filter((m) => m._id !== medicationId));
    } catch (error) {
      setMedError(getErrorMessage(error, 'The medication could not be removed.'));
    }
  };

  const eyebrow = catalogOnly ? 'Pharmacy Catalog' : 'Pharmacy Workspace';
  const title = catalogOnly ? 'Medication Catalog' : 'Medication Dispensing';
  const subtitle = catalogOnly
    ? 'Add medicines, pricing, and reusable prescribing defaults for doctors and billing.'
    : 'Review finalized prescriptions and manage the medication catalog.';

  return (
    <section className={`${catalogOnly ? '' : 'mt-8 '}rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm`}>
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-indigo-500">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {subtitle}
          </p>
        </div>
        {!catalogOnly && (
          <div className="flex items-center gap-3">
            {[
              { key: 'dispensing', label: 'Dispensing' },
              { key: 'catalog', label: 'Medication Catalog' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'catalog' && (
        <div className="mt-8">
          <form className="rounded-3xl border border-slate-100 bg-slate-50/70 p-6" onSubmit={handleSaveMedication}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingMed ? 'Edit Medication' : 'Add New Medication'}
            </h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <input
                required
                placeholder="Medication name *"
                value={medForm.name}
                onChange={(e) => setMedForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Generic name"
                value={medForm.genericName}
                onChange={(e) => setMedForm((f) => ({ ...f, genericName: e.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Category"
                value={medForm.category}
                onChange={(e) => setMedForm((f) => ({ ...f, category: e.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Default dosage"
                value={medForm.defaultDosage}
                onChange={(e) => setMedForm((f) => ({ ...f, defaultDosage: e.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Default frequency"
                value={medForm.defaultFrequency}
                onChange={(e) => setMedForm((f) => ({ ...f, defaultFrequency: e.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Default duration"
                value={medForm.defaultDuration}
                onChange={(e) => setMedForm((f) => ({ ...f, defaultDuration: e.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                required
                type="number"
                min="0"
                step="any"
                placeholder="Unit price *"
                value={medForm.unitPrice}
                onChange={(e) => setMedForm((f) => ({ ...f, unitPrice: e.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {medError && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                {medError}
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={isMedSaving}
                className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {isMedSaving ? 'Saving...' : editingMed ? 'Update' : 'Add Medication'}
              </button>
              {editingMed && (
                <button
                  type="button"
                  onClick={openCreateMedication}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {isMedLoading ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Loading medications...
            </div>
          ) : medications.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
              No medications in the catalog yet. Add one above.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3 font-semibold">Medication</th>
                    <th className="p-3 font-semibold">Generic</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Dosage</th>
                    <th className="p-3 font-semibold">Unit Price</th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {medications.map((med) => (
                    <tr key={med._id}>
                      <td className="p-3 font-semibold text-slate-900">{med.name}</td>
                      <td className="p-3 text-slate-600">{med.genericName || '—'}</td>
                      <td className="p-3 text-slate-600">{med.category || '—'}</td>
                      <td className="p-3 text-slate-600">{med.defaultDosage || '—'}</td>
                      <td className="p-3 text-slate-600">{Number(med.unitPrice ?? 0).toLocaleString('en-US')}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditMedication(med)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void handleDeleteMedication(med._id)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'dispensing' && !selectedRecord && (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
          Select a patient to see their prescriptions for dispensing.
        </div>
      )}

      {activeTab === 'dispensing' && selectedRecord && prescriptions.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
          No prescriptions are attached to this patient yet. Once a doctor saves and finalizes one, it will appear here.
        </div>
      )}

      {activeTab === 'dispensing' && selectedRecord && prescriptions.length > 0 && (
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
