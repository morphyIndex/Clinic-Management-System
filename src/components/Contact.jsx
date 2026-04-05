import { useState } from 'react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setStatus('sending');
    setTimeout(() => {
      setStatus('sent');
      setForm({ name: '', email: '', message: '' });
    }, 1200);
  };

  return (
    <div className="py-20 px-8 max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-16">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Get in touch with <span className="text-indigo-600">Brainiacs.</span></h2>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            Need technical support with the management system? Or perhaps a demo for your clinic staff? Our team is available 24/7.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-slate-700">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">@</div>
              <span>support@brainiacs.com</span>
            </div>
            <div className="flex items-center gap-4 text-slate-700">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">#</div>
              <span>+1 (234) 567-890</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
          {status === 'sent' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Message sent!</h3>
              <p className="text-sm text-slate-500 mb-6">We'll get back to you within 24 hours.</p>
              <button
                onClick={() => setStatus('idle')}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="you@clinic.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                <textarea
                  rows="4"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="How can we help?"
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {status === 'sending' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
