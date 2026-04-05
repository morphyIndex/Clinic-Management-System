import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import Features from './components/Features.jsx';
import Footer from './components/Footer.jsx';
import PatientRecords from './components/PatientRecords.jsx';
import Billing from './components/Billing.jsx';
import Contact from './components/Contact.jsx';
import About from './components/About.jsx';
import Careers from './components/Careers.jsx';
import Security from './components/Security.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import TermsOfService from './components/TermsOfService.jsx';
import Login from './components/Login.jsx';
import PasswordRecovery from './components/PasswordRecovery.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import AppointmentHub from './components/AppointmentHub.jsx';
import AdminConsole from './components/AdminConsole.jsx';
import Register from './components/Register.jsx';
import PharmacyCatalogPage from './components/PharmacyCatalogPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Stats from './components/Stats.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Testimonials from './components/Testimonials.jsx';
import CallToAction from './components/CallToAction.jsx';

function App() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/recover-password';

  return (
    <div className="min-h-screen font-sans text-slate-900 antialiased flex flex-col">
      {!isAuthPage && <Navbar />}
      <main className="flex-grow">
        <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero />
                <Features />
                <Stats />
                <HowItWorks />
                <Testimonials />
                <CallToAction />
              </>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/recover-password" element={<PasswordRecovery />} />
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
            path="/records/:patientId"
            element={
              <RoleRoute allowedRoles={['clinic_admin', 'doctor', 'receptionist', 'staff']}>
                <PatientRecords />
              </RoleRoute>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <RoleRoute allowedRoles={['pharmacist']}>
                <PatientRecords />
              </RoleRoute>
            }
          />
          <Route
            path="/pharmacy/:patientId"
            element={
              <RoleRoute allowedRoles={['pharmacist']}>
                <PatientRecords />
              </RoleRoute>
            }
          />
          <Route
            path="/pharmacy/catalog"
            element={
              <RoleRoute allowedRoles={['pharmacist']}>
                <PharmacyCatalogPage />
              </RoleRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <RoleRoute allowedRoles={['clinic_admin', 'doctor', 'receptionist', 'cashier', 'staff']}>
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
          <Route path="/about" element={<About />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/security" element={<Security />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
        </ErrorBoundary>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default App;
