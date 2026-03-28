import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { isApiError } from '../lib/api.js';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(amount ?? 0));
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function buildInvoiceQuery(search) {
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

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  open: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-rose-100 text-rose-700',
};

export default function Billing() {
  const { request } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput);
  const [dashboard, setDashboard] = useState(null);
  const [invoiceResponse, setInvoiceResponse] = useState({
    items: [],
    pagination: {
      total: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadBillingData = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [dashboardResponse, invoices] = await Promise.all([
          request('/reports/dashboard', { signal: controller.signal }),
          request(`/invoices?${buildInvoiceQuery(debouncedSearch)}`, { signal: controller.signal }),
        ]);

        setDashboard(dashboardResponse);
        setInvoiceResponse(invoices);
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        setLoadError(getErrorMessage(error, 'Billing data could not be loaded.'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadBillingData();

    return () => {
      controller.abort();
    };
  }, [debouncedSearch, request]);

  const handleRefresh = async () => {
    const controller = new AbortController();

    setIsLoading(true);
    setLoadError('');

    try {
      const [dashboardResponse, invoices] = await Promise.all([
        request('/reports/dashboard', { signal: controller.signal }),
        request(`/invoices?${buildInvoiceQuery(debouncedSearch)}`, { signal: controller.signal }),
      ]);
      setDashboard(dashboardResponse);
      setInvoiceResponse(invoices);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setLoadError(getErrorMessage(error, 'Billing data could not be loaded.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInvoice = async (invoiceId) => {
    setIsInvoiceLoading(true);
    setInvoiceError('');

    try {
      const invoice = await request(`/invoices/${invoiceId}`);
      setSelectedInvoice(invoice);
    } catch (error) {
      setInvoiceError(getErrorMessage(error, 'Invoice details could not be loaded.'));
    } finally {
      setIsInvoiceLoading(false);
    }
  };

  const openInvoices = invoiceResponse.items.filter((invoice) => invoice.status === 'open').length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-start gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Billing & Invoices</h2>
              <p className="mt-2 text-slate-500 font-medium">Revenue metrics and invoice activity are now loaded directly from the backend APIs.</p>
            </div>

            <button
              onClick={() => void handleRefresh()}
              className="bg-indigo-600 text-white px-5 py-2 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Refresh Data
            </button>
          </div>

          {loadError && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {loadError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-slate-500 text-sm">Total Billed</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(dashboard?.billing?.billedAmount)}</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-slate-500 text-sm">Collected Revenue</p>
              <h3 className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(dashboard?.billing?.collectedAmount)}</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-slate-500 text-sm">Outstanding Balance</p>
              <h3 className="mt-2 text-2xl font-bold text-amber-600">{formatCurrency(dashboard?.billing?.outstandingAmount)}</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-slate-500 text-sm">Open Invoices</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">{openInvoices}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/60 p-4 flex flex-col md:flex-row md:items-center gap-3">
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search invoices by invoice number..."
                className="w-full md:w-96 rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {isLoading && <span className="text-sm font-medium text-slate-500">Syncing invoice feed...</span>}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-sm uppercase">
                  <tr>
                    <th className="p-4">Invoice ID</th>
                    <th className="p-4">Patient</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Issued</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceResponse.items.map((invoice) => (
                    <tr key={invoice._id} className="border-t border-slate-50">
                      <td className="p-4 font-mono text-sm">{invoice.invoiceNumber}</td>
                      <td className="p-4">
                        <p className="font-semibold">{invoice.patientName || 'Unknown patient'}</p>
                        <p className="text-xs text-slate-400">{invoice.patientCode || invoice.patientId}</p>
                      </td>
                      <td className="p-4">{formatCurrency(invoice.total)}</td>
                      <td className="p-4">{formatCurrency(invoice.balanceDue)}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyles[invoice.status] ?? statusStyles.draft}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500">{formatDate(invoice.createdAt)}</td>
                      <td className="p-4">
                        <button
                          onClick={() => void handleOpenInvoice(invoice._id)}
                          className="font-bold text-slate-500 hover:text-indigo-600 transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!isLoading && invoiceResponse.items.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500">
                        No invoices matched the current filters.
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
            <h3 className="text-xl font-bold text-slate-900">Invoice Detail</h3>
            <p className="mt-2 text-sm text-slate-500">Open any invoice row to review balance, line items, and payment progress.</p>

            {invoiceError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {invoiceError}
              </div>
            )}

            {isInvoiceLoading && <p className="mt-6 text-sm font-medium text-slate-500">Loading invoice detail...</p>}

            {!isInvoiceLoading && !selectedInvoice && !invoiceError && (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Select an invoice to inspect its line items and payment state.
              </div>
            )}

            {!isInvoiceLoading && selectedInvoice && (
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Invoice</p>
                  <h4 className="mt-2 text-2xl font-bold text-slate-900">{selectedInvoice.invoiceNumber}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedInvoice.patientName || 'Unknown patient'} • {selectedInvoice.patientCode || selectedInvoice.patientId}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</p>
                    <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(selectedInvoice.total)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Paid</p>
                    <p className="mt-2 text-xl font-bold text-emerald-600">{formatCurrency(selectedInvoice.paidAmount)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-500">Balance Due</span>
                    <span className="text-lg font-bold text-amber-600">{formatCurrency(selectedInvoice.balanceDue)}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${selectedInvoice.total ? Math.min(100, (selectedInvoice.paidAmount / selectedInvoice.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Line Items</h5>
                  <ul className="mt-3 space-y-3">
                    {selectedInvoice.lineItems?.map((item, index) => (
                      <li key={`${item.description}-${index}`} className="rounded-2xl border border-slate-100 px-4 py-3">
                        <p className="font-semibold text-slate-800">{item.description}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.quantity} x {formatCurrency(item.unitPrice)} • {formatCurrency(item.total)}
                        </p>
                      </li>
                    ))}

                    {selectedInvoice.lineItems?.length === 0 && (
                      <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                        No billable line items were attached to this invoice.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
