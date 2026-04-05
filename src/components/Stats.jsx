const stats = [
  { value: '99.9%', label: 'Uptime Guarantee', description: 'Enterprise-grade reliability for non-stop clinic operations' },
  { value: '30min', label: 'Smart Scheduling', description: 'AI-powered slots that adapt to your clinic\'s real-time capacity' },
  { value: '8+', label: 'Role Types', description: 'Fine-grained access for doctors, pharmacists, admins, and more' },
  { value: '24/7', label: 'Support Available', description: 'Dedicated team standing by whenever your clinic needs help' },
];

export default function Stats() {
  return (
    <section className="py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            By the Numbers
          </span>
          <h2 className="mt-6 text-4xl font-bold text-white">Built for clinics that demand more.</h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm">
            From single-doctor practices to multi-department hospitals, Brainiacs scales to meet your operational needs.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-8 rounded-3xl border border-slate-800 bg-slate-800/50">
              <p className="text-4xl font-extrabold text-indigo-400">{stat.value}</p>
              <p className="mt-2 text-sm font-bold text-white">{stat.label}</p>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
