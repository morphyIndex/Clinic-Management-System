import { Link } from 'react-router-dom';

function FooterLink({ to, children }) {
  return (
    <Link className="transition-colors hover:text-slate-700" to={to}>
      {children}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="bg-white text-white py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="max-w-sm">
          <Link className="flex items-center gap-2 mb-6 text-slate-900" to="/">
            <span className="font-bold text-lg">Brainiacs</span>
          </Link>
          <p className="text-slate-400 text-sm leading-relaxed">
            Standardizing excellence in medical practice management software for the next generation of healthcare providers.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-12">
          <div className="space-y-4">
            <h4 className="font-bold text-slate-400">Product</h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li><FooterLink to="/">Features</FooterLink></li>
              <li><FooterLink to="/security">Security</FooterLink></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-slate-400">Our Team</h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li><FooterLink to="/about">About</FooterLink></li>
              <li><FooterLink to="/contact">Contact</FooterLink></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-slate-200 text-slate-500 text-xs flex justify-between">
        <span>© 2026 Brainiacs.</span>
        <div className="flex gap-6">
          <FooterLink to="/privacy">Privacy Policy</FooterLink>
          <FooterLink to="/terms">Terms of Service</FooterLink>
        </div>
      </div>
    </footer>
  )
}
