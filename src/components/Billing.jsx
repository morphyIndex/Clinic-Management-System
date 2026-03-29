import { useEffect, useState } from 'react';
import ModalPortal from './ModalPortal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { isApiError } from '../lib/api.js';
import { appToast } from '../lib/toast.js';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

function formatDateTime(value) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildReceiptMarkup(invoice) {
  const payments = invoice.payments ?? [];
  const paymentRows = payments.length > 0
    ? payments.map((payment) => `
        <tr>
          <td>${escapeHtml(payment.reference ?? 'PAY')}</td>
          <td>${escapeHtml(formatDateTime(payment.createdAt))}</td>
          <td>${escapeHtml(payment.method ?? 'cash')}</td>
          <td>${escapeHtml(payment.receivedByName ?? 'Clinic cashier')}</td>
          <td style="text-align:right;">${escapeHtml(formatCurrency(payment.amount))}</td>
        </tr>
      `).join('')
    : `
      <tr>
        <td colspan="5" style="text-align:center; color:#64748b;">No completed payments were recorded for this invoice.</td>
      </tr>
    `;

  const lineItems = (invoice.lineItems ?? []).map((item) => `
    <tr>
      <td>${escapeHtml(item.description)}</td>
      <td style="text-align:center;">${escapeHtml(item.quantity)}</td>
      <td style="text-align:right;">${escapeHtml(formatCurrency(item.unitPrice))}</td>
      <td style="text-align:right;">${escapeHtml(formatCurrency(item.total))}</td>
    </tr>
  `).join('');

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Receipt ${escapeHtml(invoice.invoiceNumber)}</title>
      <style>
        :root { color-scheme: light; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 32px;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #0f172a;
          background: #f8fafc;
        }
        .sheet {
          max-width: 820px;
          margin: 0 auto;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 32px;
        }
        .header, .meta, .totals {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
        }
        .badge {
          display: inline-block;
          padding: 8px 14px;
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        h1, h2, h3, p { margin: 0; }
        .eyebrow {
          font-size: 12px;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          color: #4f46e5;
          font-weight: 700;
        }
        .muted { color: #64748b; }
        .section { margin-top: 28px; }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 20px;
        }
        .card {
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 18px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        th, td {
          padding: 14px 12px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
        }
        th {
          text-align: left;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 12px;
        }
        .footer {
          margin-top: 28px;
          padding-top: 18px;
          border-top: 1px solid #e2e8f0;
          font-size: 13px;
          color: #64748b;
        }
        @media print {
          body { background: white; padding: 0; }
          .sheet { border: none; border-radius: 0; max-width: none; }
        }
      </style>
    </head>
    <body>
      <main class="sheet">
        <div class="header">
          <div>
            <p class="eyebrow">Payment Receipt</p>
            <h1 style="margin-top:12px; font-size:36px;">${escapeHtml(invoice.tenantName ?? 'Clinic Receipt')}</h1>
            <p class="muted" style="margin-top:10px;">Receipt for invoice ${escapeHtml(invoice.invoiceNumber)}</p>
          </div>
          <div style="text-align:right;">
            <span class="badge">Paid</span>
            <p class="muted" style="margin-top:16px;">Patient</p>
            <h2 style="margin-top:6px; font-size:24px;">${escapeHtml(invoice.patientName ?? 'Unknown patient')}</h2>
            <p class="muted" style="margin-top:6px;">${escapeHtml(invoice.patientCode ?? invoice.patientId ?? '')}</p>
          </div>
        </div>

        <div class="card-grid">
          <section class="card">
            <p class="muted">Invoice Total</p>
            <h3 style="margin-top:12px; font-size:28px;">${escapeHtml(formatCurrency(invoice.total))}</h3>
          </section>
          <section class="card">
            <p class="muted">Amount Paid</p>
            <h3 style="margin-top:12px; font-size:28px; color:#059669;">${escapeHtml(formatCurrency(invoice.paidAmount))}</h3>
          </section>
          <section class="card">
            <p class="muted">Paid On</p>
            <h3 style="margin-top:12px; font-size:22px;">${escapeHtml(formatDateTime(invoice.latestPaymentAt ?? invoice.updatedAt ?? invoice.createdAt))}</h3>
          </section>
        </div>

        <section class="section">
          <p class="eyebrow">Line Items</p>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${lineItems}</tbody>
          </table>
        </section>

        <section class="section">
          <p class="eyebrow">Payments</p>
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>When</th>
                <th>Method</th>
                <th>Collected By</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </section>

        <div class="footer">
          <p>This receipt confirms that the invoice has been paid in full.</p>
          <p style="margin-top:8px;">Generated on ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
        </div>
      </main>
    </body>
  </html>`;
}

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  open: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-rose-100 text-rose-700',
};

export default function Billing() {
  const { request, user } = useAuth();
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
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
  });
  const [paymentError, setPaymentError] = useState('');
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);
  const [isReceiptPreparing, setIsReceiptPreparing] = useState(false);

  const canCollectPayments = ['clinic_admin', 'receptionist', 'cashier', 'staff'].includes(user?.role ?? '');

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
    setIsInvoiceDialogOpen(true);
    setIsInvoiceLoading(true);
    setInvoiceError('');
    setSelectedInvoice(null);

    try {
      const invoice = await request(`/invoices/${invoiceId}`);
      setSelectedInvoice(invoice);
    } catch (error) {
      setInvoiceError(getErrorMessage(error, 'Invoice details could not be loaded.'));
    } finally {
      setIsInvoiceLoading(false);
    }
  };

  const handleCloseInvoiceDialog = () => {
    setIsInvoiceDialogOpen(false);
    setIsInvoiceLoading(false);
    setInvoiceError('');
    setSelectedInvoice(null);
  };

  useEffect(() => {
    if (!selectedInvoice) {
      setPaymentForm({ amount: '', method: 'cash' });
      setPaymentError('');
      return;
    }

    setPaymentForm({
      amount: selectedInvoice.balanceDue ? String(selectedInvoice.balanceDue) : '',
      method: 'cash',
    });
    setPaymentError('');
  }, [selectedInvoice?._id, selectedInvoice?.balanceDue]);

  const handleCapturePayment = async (event) => {
    event.preventDefault();
    setPaymentError('');

    if (!selectedInvoice?._id) {
      setPaymentError('Choose an invoice before capturing a payment.');
      return;
    }

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Enter a valid payment amount.');
      return;
    }

    setIsPaymentSaving(true);

    try {
      await appToast.promise(
        request(`/invoices/${selectedInvoice._id}/payments`, {
          method: 'POST',
          body: {
            amount,
            method: paymentForm.method,
          },
        }),
        {
          loading: {
            title: 'Recording payment',
            description: 'Updating the invoice balance for this visit.',
          },
          success: {
            title: 'Payment recorded',
            description: 'The invoice balance has been refreshed.',
          },
          error: (error) => ({
            title: 'Payment failed',
            description: getErrorMessage(error, 'The payment could not be saved.'),
          }),
        },
      );

      await handleRefresh();
      if (selectedInvoice?._id) {
        await handleOpenInvoice(selectedInvoice._id);
      }
    } catch {
      // Toast feedback already shown above.
    } finally {
      setIsPaymentSaving(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!selectedInvoice || selectedInvoice.status !== 'paid') {
      return;
    }

    setIsReceiptPreparing(true);

    try {
      const receiptWindow = window.open('', '_blank', 'width=960,height=1080');
      if (!receiptWindow) {
        throw new Error('Receipt window was blocked');
      }

      receiptWindow.document.open();
      receiptWindow.document.write(buildReceiptMarkup(selectedInvoice));
      receiptWindow.document.close();
      receiptWindow.focus();

      receiptWindow.addEventListener('load', () => {
        receiptWindow.print();
      }, { once: true });
    } catch (error) {
      appToast.error({
        title: 'Receipt could not be opened',
        description: getErrorMessage(error, 'Please allow pop-ups and try again.'),
      });
    } finally {
      setIsReceiptPreparing(false);
    }
  };

  const openInvoices = invoiceResponse.items.filter((invoice) => invoice.status === 'open').length;
  const paymentLocked = !selectedInvoice
    || isPaymentSaving
    || selectedInvoice.balanceDue <= 0
    || selectedInvoice.status === 'void'
    || selectedInvoice.status === 'draft';
  const canPrintReceipt = selectedInvoice?.status === 'paid' && (selectedInvoice?.payments?.length ?? 0) > 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Billing & Invoices</h2>
          <p className="mt-2 text-slate-500 font-medium">
            Encounter fees and prescription medicines sync into billing automatically. Draft clinical records stay as draft invoices until the visit is finalized.
          </p>
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
                      className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
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

      <ModalPortal isOpen={isInvoiceDialogOpen} onClose={handleCloseInvoiceDialog}>
        <div className="mx-auto w-full max-w-4xl rounded-[2rem] bg-white p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-indigo-500">Invoice Detail</p>
              <h3 className="mt-3 text-3xl font-bold text-slate-900">
                {selectedInvoice?.invoiceNumber ?? 'Loading invoice'}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Review the balance, line items, and payment collection without leaving the billing table.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {canPrintReceipt && (
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  disabled={isReceiptPreparing}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isReceiptPreparing ? 'Preparing Receipt...' : 'Print Receipt'}
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseInvoiceDialog}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>

          {invoiceError && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {invoiceError}
            </div>
          )}

          {isInvoiceLoading && (
            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 px-6 py-16 text-center text-sm font-medium text-slate-500">
              Loading invoice detail...
            </div>
          )}

          {!isInvoiceLoading && !selectedInvoice && !invoiceError && (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-sm font-medium text-slate-500">
              Select an invoice to inspect its line items and payment state.
            </div>
          )}

          {!isInvoiceLoading && selectedInvoice && (
            <div className="mt-6 space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {selectedInvoice.patientName || 'Unknown patient'} • {selectedInvoice.patientCode || selectedInvoice.patientId}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">Issued {formatDate(selectedInvoice.createdAt)}</p>
                </div>
                <span className={`w-fit rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] ${statusStyles[selectedInvoice.status] ?? statusStyles.draft}`}>
                  {selectedInvoice.status}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Total</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{formatCurrency(selectedInvoice.total)}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Paid</p>
                  <p className="mt-3 text-3xl font-bold text-emerald-600">{formatCurrency(selectedInvoice.paidAmount)}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Balance Due</p>
                  <p className="mt-3 text-3xl font-bold text-amber-600">{formatCurrency(selectedInvoice.balanceDue)}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">Payment Progress</h4>
                  <span className="text-sm font-semibold text-slate-500">
                    {selectedInvoice.total ? Math.round((selectedInvoice.paidAmount / selectedInvoice.total) * 100) : 0}% settled
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${selectedInvoice.total ? Math.min(100, (selectedInvoice.paidAmount / selectedInvoice.total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 p-5">
                <h4 className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">Line Items</h4>
                <ul className="mt-4 space-y-3">
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

              <div className="rounded-3xl border border-slate-100 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">Payment History</h4>
                  <span className="text-sm font-semibold text-slate-500">
                    {(selectedInvoice.payments ?? []).length} payment{(selectedInvoice.payments ?? []).length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {(selectedInvoice.payments ?? []).map((payment) => (
                    <div key={payment._id} className="rounded-2xl border border-slate-100 px-4 py-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{payment.reference}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDateTime(payment.createdAt)} • {payment.method} • {payment.receivedByName ?? 'Clinic cashier'}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(payment.amount)}</p>
                      </div>
                    </div>
                  ))}

                  {(selectedInvoice.payments ?? []).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                      Receipt printing becomes available once this invoice has a completed payment.
                    </div>
                  )}
                </div>
              </div>

              {canCollectPayments && (
                <form className="rounded-3xl border border-slate-100 bg-slate-50 p-5" onSubmit={handleCapturePayment}>
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">Collect Payment</h4>
                      <p className="mt-2 text-sm text-slate-500">
                        {selectedInvoice.status === 'draft'
                          ? 'Finalize the visit before recording payment for this invoice.'
                          : 'Use this form for cashier or front-desk payment collection.'}
                      </p>
                    </div>
                    <span className={`w-fit rounded-full px-4 py-2 text-xs font-bold ${statusStyles[selectedInvoice.status] ?? statusStyles.draft}`}>
                      {selectedInvoice.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-slate-700">Amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.amount}
                        disabled={paymentLocked}
                        onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-slate-700">Method</span>
                      <select
                        value={paymentForm.method}
                        disabled={paymentLocked}
                        onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="transfer">Transfer</option>
                      </select>
                    </label>
                  </div>

                  {paymentError && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {paymentError}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={paymentLocked}
                      className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isPaymentSaving
                        ? 'Saving Payment...'
                        : selectedInvoice.status === 'draft'
                          ? 'Finalize Visit First'
                          : selectedInvoice.balanceDue <= 0
                            ? 'Invoice Settled'
                            : 'Record Payment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </ModalPortal>
    </div>
  );
}
