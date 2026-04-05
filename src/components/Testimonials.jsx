const testimonials = [
  {
    quote: 'We cut our front-desk wait times in half within the first month. The appointment system practically runs itself now.',
    name: 'Dr. Aung Kyaw',
    role: 'Clinic Director',
    clinic: 'Golden Health Medical Centre',
  },
  {
    quote: 'The pharmacy module is a game-changer. I can see prescriptions the moment the doctor writes them and track every dispense in real time.',
    name: 'Phyu Phyu Win',
    role: 'Lead Pharmacist',
    clinic: 'City Care Polyclinic',
  },
  {
    quote: 'Finally, a system where our billing, records, and scheduling all live in one place. Our admin overhead dropped by 60%.',
    name: 'Thida Oo',
    role: 'Operations Manager',
    clinic: 'Shwe Mingalar Hospital',
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="mt-6 text-4xl font-bold text-slate-900">Trusted by clinics across Myanmar.</h2>
          <p className="mt-4 text-slate-500 max-w-xl mx-auto text-sm">
            Hear from healthcare professionals who switched to Brainiacs and never looked back.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div key={t.name} className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-shadow duration-300">
              <svg className="h-8 w-8 text-indigo-200 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
              </svg>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">{t.quote}</p>
              <div>
                <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                <p className="text-xs text-slate-400">{t.role} &middot; {t.clinic}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
