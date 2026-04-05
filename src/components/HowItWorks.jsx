const steps = [
  {
    number: '01',
    title: 'Register Your Clinic',
    description: 'Create your clinic profile in under two minutes. Add departments, invite staff, and configure roles — all from one admin console.',
  },
  {
    number: '02',
    title: 'Set Up Schedules',
    description: 'Define doctor availability, lunch breaks, and slot durations. The system generates bookable time slots automatically.',
  },
  {
    number: '03',
    title: 'Patients Book Online',
    description: 'Patients pick a department, choose a doctor, and confirm an appointment — guided by an AI triage assistant if needed.',
  },
  {
    number: '04',
    title: 'Run Your Clinic',
    description: 'Doctors document encounters, pharmacists dispense prescriptions, and cashiers close invoices — all in one unified workflow.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="mt-6 text-4xl font-bold text-slate-900">Up and running in four steps.</h2>
          <p className="mt-4 text-slate-500 max-w-xl mx-auto text-sm">
            No complex migrations or lengthy onboarding. Get your entire clinic digitized the same day you sign up.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.number} className="relative p-8 rounded-3xl border border-slate-100 bg-slate-50 group hover:bg-white hover:shadow-xl hover:border-transparent transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Step {step.number}</span>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 -right-3 text-slate-300 text-lg">&rarr;</div>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
