import { Link } from 'react-router-dom';
import {
  ArchiveIcon,
  BuildingIcon,
  ClipboardIcon,
  DatabaseIcon,
  GaugeIcon,
  LockIcon,
  ShieldCheckIcon,
} from './ContentIcons.jsx';

export default function Security() {
  const features = [
    {
      icon: LockIcon,
      title: 'JWT Authentication',
      desc: 'Short-lived access tokens and rotatable refresh tokens with server-side session tracking. Every session can be revoked instantly.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Role-Based Access Control',
      desc: 'Six distinct roles — platform admin, clinic admin, doctor, receptionist, staff, and patient — each with carefully scoped permissions.',
    },
    {
      icon: BuildingIcon,
      title: 'Multi-Tenant Isolation',
      desc: 'Every database query is scoped by tenant ID at the service layer. Clinic A can never see or modify Clinic B\'s data.',
    },
    {
      icon: LockIcon,
      title: 'Password Security',
      desc: 'All passwords are hashed with bcrypt before storage. Plain-text passwords are never logged or persisted anywhere in the system.',
    },
    {
      icon: ClipboardIcon,
      title: 'Audit Trail',
      desc: 'Every significant action is recorded — who did what, when, on which resource, and whether it succeeded or failed.',
    },
    {
      icon: GaugeIcon,
      title: 'Rate Limiting',
      desc: 'Public endpoints are protected with Redis-backed rate limiting to prevent brute-force attacks and API abuse.',
    },
    {
      icon: DatabaseIcon,
      title: 'Encrypted Backups',
      desc: 'Clinic data backups are encrypted at rest and processed by isolated background workers. Restore is admin-only.',
    },
    {
      icon: ArchiveIcon,
      title: 'Soft Deletion',
      desc: 'Patient and invoice records are never hard-deleted. Archive and restore ensures data integrity and regulatory compliance.',
    },
  ];

  return (
    <div className="py-20 px-8 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          Security First
        </span>
        <h1 className="mt-6 text-4xl font-extrabold text-slate-900">
          Built with <span className="text-indigo-600">security</span> at every layer.
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
          Healthcare data demands the highest level of protection. DCMS implements industry-standard security practices from authentication to data storage.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {features.map((f, i) => (
          <div key={i} className="p-8 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-xl hover:border-transparent transition-all duration-300">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-slate-500 text-sm mb-6">Have security questions or need to report a vulnerability?</p>
        <Link to="/contact" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 inline-block">
          Contact Our Team
        </Link>
      </div>
    </div>
  );
}
