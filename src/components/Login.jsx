import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isApiError } from '../lib/api.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, user } = useAuth();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDefaultRoute = (role) => {
    if (role === 'clinic_admin' || role === 'platform_admin') {
      return '/admin';
    }

    if (role === 'patient') {
      return '/appointments';
    }

    return '/records';
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDefaultRoute(user?.role), { replace: true });
    }
  }, [isAuthenticated, navigate, user?.role]);

  useEffect(() => {
    if (location.state?.email) {
      setCredentials((current) => ({
        ...current,
        email: location.state.email,
      }));
    }
  }, [location.state?.email]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const session = await login(credentials);
      navigate(location.state?.from ?? getDefaultRoute(session.user?.role), { replace: true });
    } catch (error) {
      setErrorMessage(
        isApiError(error) ? error.message : 'We could not sign you in right now. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-xl">+</div>
            <span className="text-2xl font-bold tracking-tight">Brainiacs</span>
          </Link>
        </div>

        <div className="relative z-10 text-white">
          <h2 className="text-5xl font-bold leading-tight mb-6 text-white">
            Digital Healthcare <br /> Simplified.
          </h2>
          <p className="text-indigo-100 text-lg max-w-md leading-relaxed">
            The world's most intuitive clinic management system. Access patient records, billing, and analytics in one secure place.
          </p>
        </div>

        <div className="relative z-10 text-indigo-200 text-sm">
          © 2026 Brainiacs Systems Inc.
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
            <p className="text-slate-500 font-medium">Please enter your clinic credentials to continue.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input
                required
                type="email"
                value={credentials.email}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                placeholder="admin@demo-clinic.test"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <span className="text-sm font-bold text-indigo-600">Secure login</span>
              </div>
              <input
                required
                type="password" 
                minLength={8}
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 text-sm">
            Need a patient profile? <Link to="/register" className="text-indigo-600 font-bold hover:underline">Create one here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
