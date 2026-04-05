import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest, isApiError } from '../lib/api.js';

const initialResetForm = {
  otp: '',
  newPassword: '',
  confirmPassword: '',
};

export default function PasswordRecovery() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [resetForm, setResetForm] = useState(initialResetForm);
  const [step, setStep] = useState('request');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state?.email]);

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      });
      setStep('reset');
      setSuccessMessage('If this email is registered, we sent a 6-digit reset code to the inbox.');
    } catch (error) {
      setErrorMessage(
        isApiError(error) ? error.message : 'We could not send a reset code right now. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setErrorMessage('New password and confirm password must match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          otp: resetForm.otp,
          newPassword: resetForm.newPassword,
        },
      });
      setSuccessMessage('Password updated successfully. You can sign in with your new password now.');
      setResetForm(initialResetForm);
    } catch (error) {
      setErrorMessage(
        isApiError(error) ? error.message : 'We could not reset your password right now. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (value) => {
    setResetForm((current) => ({
      ...current,
      otp: value.replace(/\D/g, '').slice(0, 6),
    }));
  };

  const handleBackToLogin = () => {
    navigate('/login', {
      replace: true,
      state: { email: email.trim().toLowerCase() },
    });
  };

  return (
    <div className="min-h-screen flex items-stretch bg-white">
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
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-200 font-bold">Account Recovery</p>
          <h2 className="mt-3 text-5xl font-bold leading-tight text-white">
            Reset access <br /> without calling support.
          </h2>
          <p className="mt-6 text-indigo-100 text-lg max-w-md leading-relaxed">
            We will email a one-time password so you can safely choose a new password and get back into your clinic account.
          </p>
        </div>

        <div className="relative z-10 text-indigo-200 text-sm">© 2026 Brainiacs Systems Inc.</div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-bold">Password Recovery</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 mb-2">
              {step === 'request' ? 'Get your reset code' : 'Enter OTP and choose a new password'}
            </h1>
            <p className="text-slate-500 font-medium">
              {step === 'request'
                ? 'Enter the email address attached to your Brainiacs Clinic account.'
                : 'Use the 6-digit code from your email, then set a new password with at least 8 characters.'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={step === 'request' ? handleRequestOtp : handleResetPassword}>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input
                required
                type="email"
                value={email}
                disabled={step !== 'request'}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="admin@demo-clinic.test"
              />
            </div>

            {step === 'reset' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700">Email OTP</label>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('request');
                        setSuccessMessage('');
                        setErrorMessage('');
                        setResetForm(initialResetForm);
                      }}
                      className="text-sm font-bold text-indigo-600 hover:underline"
                    >
                      Use another email
                    </button>
                  </div>
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={resetForm.otp}
                    onChange={(event) => handleOtpChange(event.target.value)}
                    className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all tracking-[0.35em] text-center text-lg font-bold"
                    placeholder="123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                  <input
                    required
                    minLength={8}
                    type="password"
                    value={resetForm.newPassword}
                    onChange={(event) =>
                      setResetForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Confirm New Password</label>
                  <input
                    required
                    minLength={8}
                    type="password"
                    value={resetForm.confirmPassword}
                    onChange={(event) =>
                      setResetForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                    placeholder="Repeat your new password"
                  />
                </div>
              </>
            )}

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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {isSubmitting
                ? step === 'request'
                  ? 'Sending OTP...'
                  : 'Resetting Password...'
                : step === 'request'
                  ? 'Send Email OTP'
                  : 'Update Password'}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between gap-4 text-sm">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="font-bold text-slate-600 hover:text-slate-900"
            >
              Back to login
            </button>
            {step === 'reset' && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRequestOtp}
                className="font-bold text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-indigo-300"
              >
                Resend code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
