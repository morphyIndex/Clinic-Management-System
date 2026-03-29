import { Link } from 'react-router-dom';
import { CheckCircleIcon, MobileIcon, MonitorIcon, TabletIcon } from './ContentIcons.jsx';

export default function AppDownload() {
  return (
    <div className="py-20 px-8 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          Get Started
        </span>
        <h1 className="mt-6 text-4xl font-extrabold text-slate-900">
          Access DCMS from <span className="text-indigo-600">anywhere.</span>
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
          DCMS is a responsive web application that works on any device with a modern browser. No downloads required — just sign in and start managing your clinic.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {[
          {
            icon: MonitorIcon,
            title: 'Desktop',
            desc: 'Full-featured experience on Chrome, Firefox, Safari, or Edge. Best for clinic admins and front-desk staff.',
          },
          {
            icon: MobileIcon,
            title: 'Mobile Browser',
            desc: 'Responsive design adapts to any screen size. Doctors and patients can access their dashboards on the go.',
          },
          {
            icon: TabletIcon,
            title: 'Tablet',
            desc: 'Perfect for doctors during consultations. View patient records, update encounters, and manage prescriptions.',
          },
        ].map((item, i) => (
          <div key={i} className="p-10 rounded-3xl border border-slate-100 bg-slate-50 text-center hover:bg-white hover:shadow-xl hover:border-transparent transition-all duration-300">
            <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <item.icon className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 rounded-3xl p-10 md:p-16 text-center border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Self-Hosted Deployment</h2>
        <p className="text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          DCMS ships with Docker support for easy self-hosted deployment. Run the full stack — backend, worker, MongoDB, and Redis — with a single <code className="bg-white px-2 py-1 rounded-lg border border-slate-200 text-indigo-600 text-sm font-mono">docker compose up</code> command.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 inline-block">
            Create Free Account
          </Link>
          <Link to="/contact" className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition active:scale-95 inline-block">
            Request a Demo
          </Link>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">System Requirements</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl border border-slate-100 bg-white">
            <h3 className="font-bold text-slate-900 mb-4">For Users</h3>
            <ul className="text-slate-600 text-sm space-y-3">
              <li className="flex items-start gap-3"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /> Any modern web browser (Chrome, Firefox, Safari, Edge)</li>
              <li className="flex items-start gap-3"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /> Internet connection</li>
              <li className="flex items-start gap-3"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /> No installation needed</li>
            </ul>
          </div>
          <div className="p-8 rounded-3xl border border-slate-100 bg-white">
            <h3 className="font-bold text-slate-900 mb-4">For Self-Hosting</h3>
            <ul className="text-slate-600 text-sm space-y-3">
              <li className="flex items-start gap-3"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /> Docker & Docker Compose</li>
              <li className="flex items-start gap-3"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /> 2 CPU cores, 4 GB RAM minimum</li>
              <li className="flex items-start gap-3"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /> Node.js 22+, MongoDB 7, Redis 7</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
