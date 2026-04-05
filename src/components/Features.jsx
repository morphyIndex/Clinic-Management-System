export default function Features() {
  return (
    <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <h2 className="text-4xl font-bold text-slate-900 max-w-md">Comprehensive tools for every department.</h2>
            <p className="text-slate-500 max-w-xs text-sm">Everything you need to run a digital-first clinic, from patient intake to final discharge.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              'AI Appointment Assistant',
              'Department & Doctor Management',
              '30-Minute Smart Scheduling',
            ].map((item, i) => (
              <div key={i} className="group p-10 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-xl hover:border-transparent transition-all duration-300">
                <div className="w-12 h-12 bg-white rounded-lg shadow-sm mb-6 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <span className="text-xl">0{i+1}</span>
                </div>
                <h3 className="text-xl font-bold mb-4">{item}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Optimized workflows designed to reduce administrative burden while keeping the current clinic experience familiar.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
  );
}
