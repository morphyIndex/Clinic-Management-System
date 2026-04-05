import { Link } from 'react-router-dom';
import { BookIcon, ClockIcon, GlobeIcon, HeartPulseIcon, SparkIcon, TeamIcon } from './ContentIcons.jsx';

export default function Careers() {
  const openings = [
    {
      title: 'Backend Engineer',
      type: 'Full-time',
      location: 'Remote',
      desc: 'Help us build and scale the DCMS backend — Node.js, MongoDB, Redis, and BullMQ. You\'ll work on multi-tenant architecture, API design, and background job systems.',
    },
    {
      title: 'Frontend Engineer',
      type: 'Full-time',
      location: 'Remote',
      desc: 'Build beautiful, responsive interfaces with React 19 and Tailwind CSS. You\'ll own the patient portal, admin console, and doctor workspace experiences.',
    },
    {
      title: 'DevOps Engineer',
      type: 'Full-time',
      location: 'Remote',
      desc: 'Manage our Docker-based infrastructure, CI/CD pipelines, and cloud deployments. Keep DCMS running smoothly for clinics around the world.',
    },
    {
      title: 'QA Engineer',
      type: 'Full-time / Part-time',
      location: 'Remote',
      desc: 'Design and execute test strategies for clinical workflows, billing, and scheduling. Ensure every release meets healthcare-grade quality standards.',
    },
  ];

  const perks = [
    { icon: GlobeIcon, title: 'Fully Remote', desc: 'Work from anywhere in the world.' },
    { icon: ClockIcon, title: 'Flexible Hours', desc: 'We care about output, not clock-in times.' },
    { icon: SparkIcon, title: 'Real Impact', desc: 'Your code directly improves healthcare delivery.' },
    { icon: BookIcon, title: 'Learning Budget', desc: 'Annual allowance for courses and conferences.' },
    { icon: HeartPulseIcon, title: 'Health Coverage', desc: 'Comprehensive medical and dental benefits.' },
    { icon: TeamIcon, title: 'Small Team', desc: 'No bureaucracy — ship fast and own your work.' },
  ];

  return (
    <div className="py-20 px-8 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          Join Us
        </span>
        <h1 className="mt-6 text-4xl font-extrabold text-slate-900">
          Careers at <span className="text-indigo-600">Brainiacs.</span>
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
          We're a small team building software that makes clinics run better. If you care about clean code and real-world impact, we'd love to work with you.
        </p>
      </div>

      <div className="mb-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Why Work With Us</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {perks.map((perk, i) => (
            <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-lg hover:border-transparent transition-all duration-300">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <perk.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{perk.title}</h3>
              <p className="text-slate-500 text-sm">{perk.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Open Positions</h2>
        <div className="space-y-6">
          {openings.map((job, i) => (
            <div key={i} className="p-8 rounded-3xl border border-slate-100 bg-white hover:shadow-xl hover:border-transparent transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h3 className="text-xl font-bold text-slate-900">{job.title}</h3>
                <div className="flex gap-3">
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{job.type}</span>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{job.location}</span>
                </div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{job.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 rounded-3xl p-10 md:p-16 text-center border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Don't see the right role?</h2>
        <p className="text-slate-500 mb-8 max-w-lg mx-auto">
          We're always looking for talented people. Send us a message and tell us what you'd bring to the team.
        </p>
        <Link to="/contact" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 inline-block">
          Contact Us
        </Link>
      </div>
    </div>
  );
}
