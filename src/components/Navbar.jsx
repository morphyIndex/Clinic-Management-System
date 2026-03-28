import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const isPatient = user?.role === 'patient';
  const isPlatformAdmin = user?.role === 'platform_admin';
  const isAdmin = user?.role === 'clinic_admin' || isPlatformAdmin;
  const isClinicalStaff = ['clinic_admin', 'doctor', 'receptionist', 'staff'].includes(user?.role ?? '');
  const navItems = [
    { to: '/', label: 'Home', show: true },
    { to: '/appointments', label: 'Appointments', show: isAuthenticated && isPatient },
    { to: '/records', label: 'Records', show: isAuthenticated && isClinicalStaff },
    { to: '/billing', label: 'Billing', show: isAuthenticated && isClinicalStaff },
    { to: '/admin', label: isPlatformAdmin ? 'Platform' : 'Admin', show: isAuthenticated && isAdmin },
    { to: '/contact', label: 'Contact', show: true },
  ].filter((item) => item.show);

  const handlePrimaryAction = async () => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }

    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">+</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Brainiacs</span>
        </Link>

        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-indigo-600 transition-colors">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <div className="hidden lg:block text-right">
              <p className="text-sm font-semibold text-slate-900">{user?.displayName ?? user?.email}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}

          <button
            onClick={handlePrimaryAction}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-md active:scale-95"
          >
            {isAuthenticated ? 'Sign Out' : 'Create Account'}
          </button>
        </div>
      </div>
    </nav>
  );
}
