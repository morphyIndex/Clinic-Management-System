import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, isApiError } from '../lib/api.js';
import { CLINIC_SLUG, loadPublicClinics, setPreferredClinicSlug } from '../lib/clinicApi.js';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  gender: 'Female',
  dateOfBirth: '',
  phone: '',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  allergies: '',
  chronicConditions: '',
  room: '',
  condition: 'Stable',
};

function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clinics, setClinics] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(CLINIC_SLUG);
  const selectedClinic = clinics.find((clinic) => clinic.slug === selectedSlug) ?? null;

  useEffect(() => {
    let cancelled = false;
    loadPublicClinics()
      .then((list) => {
        if (!cancelled && list.length > 0) {
          setClinics(list);
          setSelectedSlug((currentSlug) => {
            const nextSlug = list.some((clinic) => clinic.slug === currentSlug) ? currentSlug : list[0].slug;
            setPreferredClinicSlug(nextSlug);
            return nextSlug;
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreferredClinicSlug(CLINIC_SLUG);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setPreferredClinicSlug(selectedSlug);
  }, [selectedSlug]);

  const handleClinicChange = (nextSlug) => {
    setSelectedSlug(nextSlug);
    setPreferredClinicSlug(nextSlug);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    setPreferredClinicSlug(selectedSlug);

    try {
      await apiRequest(`/public/clinics/${encodeURIComponent(selectedSlug)}/patients/register`, {
        method: 'POST',
        auth: false,
        body: {
          ...form,
          dateOfBirth: form.dateOfBirth || undefined,
          room: form.room || undefined,
          allergies: splitList(form.allergies),
          chronicConditions: splitList(form.chronicConditions),
        },
      });

      setSuccessMessage('Your profile has been created. Sign in next to book an appointment and connect Telegram reminders.');
      setForm(initialForm);
      navigate('/login', {
        replace: true,
        state: { email: form.email },
      });
    } catch (error) {
      setErrorMessage(
        isApiError(error) ? error.message : 'We could not create the patient profile right now. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex items-stretch bg-white overflow-hidden">
      <div className="hidden lg:flex w-1/2 bg-indigo-600 relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 text-white">
            <img src="/brainiacsclinics-logo.svg" alt="Brainiacs Clinic Logo" className="w-8 h-8 rounded-full" />
            <span className="text-2xl font-bold tracking-tight">Brainiacs Clinic</span>
          </Link>
        </div>

        <div className="relative z-10 text-white">
          <h2 className="text-5xl font-bold leading-tight mb-6 text-white">
            Start your clinic <br /> journey here.
          </h2>
          <p className="text-indigo-100 text-lg max-w-md leading-relaxed">
            Create a patient profile once, then use the same account to book appointments, receive triage guidance,
            and review your visit history.
          </p>
        </div>

        <div className="relative z-10 text-indigo-200 text-sm">© 2026 Brainiacs Systems Inc.</div>
      </div>

      <div className="w-full lg:w-1/2 h-screen flex items-start justify-center p-8 overflow-y-auto">
        <div className="max-w-xl w-full my-auto py-8">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-bold">Patient Onboarding</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 mb-2">Create your patient profile</h1>
            <p className="text-slate-500 font-medium">
              Keep this short now, and update admission details later if your clinic needs them.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/80 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-indigo-500">Clinic Branch</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {selectedClinic?.name ?? 'Choose where you want to register'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedClinic?.address || 'Your selected clinic will be used for appointment booking and reminders after signup.'}
                  </p>
                </div>
              </div>

              <label className="mt-4 block space-y-2">
                <span className="text-sm font-bold text-slate-700">Clinic Branch</span>
                <select
                  required
                  value={selectedSlug}
                  onChange={(event) => handleClinicChange(event.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-white border border-indigo-100 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                >
                  {(clinics.length > 0 ? clinics : [{ slug: CLINIC_SLUG, name: 'Current Clinic', address: '' }]).map((clinic) => (
                    <option key={clinic.slug} value={clinic.slug}>
                      {clinic.name}{clinic.address ? ` — ${clinic.address}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">First Name</span>
                <input
                  required
                  value={form.firstName}
                  onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Last Name</span>
                <input
                  required
                  value={form.lastName}
                  onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Email Address</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Gender</span>
                <select
                  value={form.gender}
                  onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                >
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Date of Birth</span>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Phone</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Address</span>
              <textarea
                rows="3"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
              />
            </label>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Emergency Contact Name</span>
                <input
                  value={form.emergencyContactName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, emergencyContactName: event.target.value }))
                  }
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Emergency Contact Phone</span>
                <input
                  value={form.emergencyContactPhone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, emergencyContactPhone: event.target.value }))
                  }
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                />
              </label>
            </div>

            <details className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-700">Optional admission details</summary>
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">Room</span>
                  <input
                    value={form.room}
                    onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))}
                    placeholder="102 / ICU-4"
                    className="w-full px-4 py-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">Condition</span>
                  <select
                    value={form.condition}
                    onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}
                    className="w-full px-4 py-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                  >
                    <option>Stable</option>
                    <option>Critical</option>
                    <option>Recovering</option>
                  </select>
                </label>
              </div>
            </details>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Allergies</span>
                <input
                  value={form.allergies}
                  onChange={(event) => setForm((current) => ({ ...current, allergies: event.target.value }))}
                  placeholder="Penicillin, Peanuts"
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Chronic Conditions</span>
                <input
                  value={form.chronicConditions}
                  onChange={(event) => setForm((current) => ({ ...current, chronicConditions: event.target.value }))}
                  placeholder="Diabetes, Hypertension"
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                />
              </label>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {successMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-indigo-400"
              >
                {isSubmitting ? 'Creating...' : 'Create Patient Profile'}
              </button>
              <Link
                to="/login"
                className="px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
