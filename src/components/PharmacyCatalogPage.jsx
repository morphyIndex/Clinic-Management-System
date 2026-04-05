import { useNavigate } from 'react-router-dom';
import PharmacyWorkspacePanel from './PharmacyWorkspacePanel.jsx';

const catalogHighlights = [
  {
    label: 'Doctor Search',
    value: 'Shared catalog',
    description: 'Doctors can search this pharmacy list directly from the prescription builder.',
  },
  {
    label: 'Pricing',
    value: 'Unit price',
    description: 'Billing reuses the same medicine pricing once a prescription is finalized.',
  },
  {
    label: 'Defaults',
    value: 'Dosage guidance',
    description: 'Save dosage, frequency, and duration defaults once for faster prescribing.',
  },
];

export default function PharmacyCatalogPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-indigo-500">Pharmacy Catalog</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Medication Catalog</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
            Maintain the clinic medicine list, set prescribing defaults, and keep pricing ready for doctors and billing.
          </p>
        </div>

        <button
          onClick={() => navigate('/pharmacy')}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Back to Pharmacy
        </button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {catalogHighlights.map((highlight) => (
          <div key={highlight.label} className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">{highlight.label}</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{highlight.value}</h2>
            <p className="mt-3 text-sm text-slate-500">{highlight.description}</p>
          </div>
        ))}
      </div>

      <PharmacyWorkspacePanel defaultTab="catalog" catalogOnly />
    </div>
  );
}
