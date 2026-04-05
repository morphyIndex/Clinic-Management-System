import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Hero() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const primaryDestination =
    user?.role === 'clinic_admin' || user?.role === 'platform_admin'
      ? '/admin'
      : user?.role === 'patient'
      ? '/appointments'
      : user?.role === 'cashier'
        ? '/billing'
        : user?.role === 'pharmacist'
          ? '/pharmacy'
        : isAuthenticated
          ? '/records'
          : '/register';

  const secondaryDestination = !isAuthenticated
    ? '/login'
    : user?.role === 'patient'
      ? '/appointments'
      : user?.role === 'clinic_admin' || user?.role === 'platform_admin'
        ? '/admin'
        : user?.role === 'cashier'
          ? '/billing'
          : user?.role === 'pharmacist'
            ? '/pharmacy'
        : '/records';

  return (
    <section className="bg-slate-50 pt-20 pb-32 px-8">
      <div className="max-w-6xl mx-auto text-center">
        <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          Next-Gen Clinic Management
        </span>
      <h1 className="mt-8 text-6xl font-extrabold text-slate-900 leading-tight">
        Modern care for 
        <span className="font-['Caveat'] text-7xl text-indigo-600 inline-block ml-4 -rotate-3">
          digital clinics.
        </span>
      </h1>
        <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto">
          Streamline patient records, automate billing, and let patients book appointments and get guided to the right department.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <button
            onClick={() => navigate(primaryDestination)}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            {user?.role === 'clinic_admin' || user?.role === 'platform_admin'
              ? user?.role === 'platform_admin'
                ? 'Open Platform Console'
                : 'Open Admin Console'
              : user?.role === 'patient'
                ? 'Book Appointment'
              : user?.role === 'cashier'
                ? 'Open Cashier Desk'
              : user?.role === 'pharmacist'
                ? 'Open Pharmacy'
              : isAuthenticated
                ? 'Open Dashboard'
                : 'Start Free Now'}
          </button>
          <button
            onClick={() => navigate(secondaryDestination)}
            className="group bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition active:scale-95"
          >
            {isAuthenticated
              ? user?.role === 'platform_admin'
                ? 'Platform Tools'
                : user?.role === 'clinic_admin'
                  ? 'Admin Tools'
                  : user?.role === 'patient'
                    ? 'Book Appointment'
                    : user?.role === 'cashier'
                      ? 'Open Billing'
                      : user?.role === 'pharmacist'
                        ? 'Open Pharmacy'
                    : 'Open Workspace'
              : 'Sign In'}{' '}
            <span className="ml-1 inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">&rarr;</span>
          </button>
        </div>
      </div>
    </section>
  );
}
