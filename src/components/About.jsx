import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="py-20 px-8 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          Our Story
        </span>
        <h1 className="mt-6 text-4xl font-extrabold text-slate-900">
          About <span className="text-indigo-600">Brainiacs.</span>
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
          We're building the next generation of clinic management software — modern, secure, and designed for real dental practices.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-16 mb-20">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Clinics deserve software that actually works for them — not against them. Too many healthcare
            providers are stuck with outdated systems, paper files, and disconnected tools that slow
            everything down.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Brainiacs was created to change that. We built the Digital Clinic Management System (DCMS) to
            give clinics a single, modern platform that handles the entire patient journey — from
            registration and appointment booking to clinical encounters, prescriptions, billing, and checkout.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Why We Built DCMS</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            After seeing how many small and medium dental clinics still rely on spreadsheets and paper
            records, we decided to build something better. Something that is easy to use, secure enough
            for medical data, and flexible enough to support multiple clinics from one platform.
          </p>
          <p className="text-slate-600 leading-relaxed">
            DCMS is built with a modern stack — Node.js, MongoDB, React, and Docker — so it's easy
            to deploy, maintain, and extend. It supports multi-tenancy out of the box, meaning clinic
            chains can manage all their locations from a single system.
          </p>
        </div>
      </div>

      <div className="mb-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">What Makes Us Different</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { num: '01', title: 'Multi-Tenant', desc: 'One platform, many clinics. Each with fully isolated data and independent administration.' },
            { num: '02', title: 'Patient-First', desc: 'Patients can self-register, book appointments, and view their own records without calling the clinic.' },
            { num: '03', title: 'One-Step Checkout', desc: 'Finalize encounter, create invoice, record payment, and complete appointment — all in one click.' },
          ].map((item, i) => (
            <div key={i} className="p-10 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-xl hover:border-transparent transition-all duration-300">
              <div className="w-12 h-12 bg-white rounded-lg shadow-sm mb-6 flex items-center justify-center font-bold text-xl text-slate-400">
                {item.num}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 rounded-3xl p-10 md:p-16 text-center border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Want to learn more?</h2>
        <p className="text-slate-500 mb-8 max-w-lg mx-auto">
          Whether you're a clinic owner looking for a better system or a developer interested in the project, we'd love to hear from you.
        </p>
        <Link to="/contact" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 inline-block">
          Get in Touch
        </Link>
      </div>
    </div>
  );
}
