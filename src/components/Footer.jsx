export default function Footer() {
  return (
    <footer className="bg-white text-white py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-900 ">
            <span className="font-bold text-lg">Brainiacs</span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Standardizing excellence in medical practice management software for the next generation of healthcare providers.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
          <div className="space-y-4">
            <h4 className="font-bold text-slate-400">Product</h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>Features</li>
              <li>Security</li>
              <li>App</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-slate-400">Our Team</h4>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-slate-800 text-slate-500 text-xs flex justify-between">
        <span>© 2026 Brainiacs.</span>
        <div className="flex gap-6">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </footer>
  )
}
