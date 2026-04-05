import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const isPatient = user?.role === 'patient';
  const isPlatformAdmin = user?.role === 'platform_admin';
  const isAdmin = user?.role === 'clinic_admin' || isPlatformAdmin;
  const canAccessRecords = ['clinic_admin', 'doctor', 'pharmacist', 'receptionist', 'staff'].includes(user?.role ?? '');
  const canAccessBilling = ['clinic_admin', 'doctor', 'receptionist', 'cashier', 'staff'].includes(user?.role ?? '');
  const pathname = location.pathname;

  const navItems = [
    {
      to: '/',
      label: 'Home',
      show: true,
      isActive: pathname === '/',
    },
    {
      to: '/appointments',
      label: 'Appointments',
      show: isAuthenticated && isPatient,
      isActive: pathname === '/appointments',
    },
    {
      to: '/pharmacy',
      label: 'Pharmacy',
      show: isAuthenticated && user?.role === 'pharmacist',
      isActive: pathname === '/pharmacy' || (/^\/pharmacy\/[^/]+$/.test(pathname) && pathname !== '/pharmacy/catalog'),
    },
    {
      to: '/pharmacy/catalog',
      label: 'Catalog',
      show: isAuthenticated && user?.role === 'pharmacist',
      isActive: pathname === '/pharmacy/catalog',
    },
    {
      to: '/records',
      label: 'Records',
      show: isAuthenticated && canAccessRecords && user?.role !== 'pharmacist',
      isActive: pathname === '/records' || pathname.startsWith('/records/'),
    },
    {
      to: '/billing',
      label: user?.role === 'cashier' ? 'Cashier' : 'Billing',
      show: isAuthenticated && canAccessBilling,
      isActive: pathname === '/billing',
    },
    {
      to: '/admin',
      label: isPlatformAdmin ? 'Platform' : 'Admin',
      show: isAuthenticated && isAdmin,
      isActive: pathname === '/admin',
    },
    {
      to: '/about',
      label: 'About Us',
      show: true,
      isActive: pathname === '/about',
    },
    {
      to: '/contact',
      label: 'Contact',
      show: true,
      isActive: pathname === '/contact',
    },
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
          <img src="/brainiacsclinics-logo.svg" alt="Brainiacs Clinic Logo" className="w-8 h-8 rounded-full" />
          <span className="font-bold text-xl tracking-tight text-slate-900">Brainiacs Clinic</span>
        </Link>

        <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-2 text-sm font-medium text-slate-600 shadow-sm">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={[
                'rounded-full px-4 py-2 transition-all',
                item.isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600',
              ].join(' ')}
            >
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

          {!isAuthenticated && (
            <button
              onClick={() => navigate('/login')}
              className="text-slate-600 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-100 transition-all"
            >
              Login
            </button>
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
