import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import Features from './components/Features.jsx';
import Footer from './components/Footer.jsx';
import PatientRecords from './components/PatientRecords.jsx';
import Billing from './components/Billing.jsx';
import Contact from './components/Contact.jsx';
import Login from './components/Login.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import AppointmentHub from './components/AppointmentHub.jsx';
import AdminConsole from './components/AdminConsole.jsx';
import Register from './components/Register.jsx';

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen font-sans text-slate-900 antialiased flex flex-col">
      {!isAuthPage && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero />
                <Features />
              </>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/records"
            element={
              <RoleRoute allowedRoles={['clinic_admin', 'doctor', 'receptionist', 'staff']}>
                <PatientRecords />
              </RoleRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <RoleRoute allowedRoles={['clinic_admin', 'doctor', 'receptionist', 'staff']}>
                <Billing />
              </RoleRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <RoleRoute allowedRoles={['patient']}>
                <AppointmentHub />
              </RoleRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={['platform_admin', 'clinic_admin']}>
                <AdminConsole />
              </RoleRoute>
            }
          />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default App;
