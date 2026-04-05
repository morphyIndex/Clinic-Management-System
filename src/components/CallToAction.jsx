import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function CallToAction() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-indigo-700 px-8 py-16 shadow-2xl shadow-indigo-200">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to modernize your clinic?
          </h2>
          <p className="text-indigo-100 max-w-lg mx-auto text-sm mb-8">
            Join hundreds of healthcare providers who trust Brainiacs to manage their daily operations.
            Get started in minutes — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(isAuthenticated ? '/records' : '/register')}
              className="bg-white text-indigo-700 px-8 py-4 rounded-2xl font-bold hover:bg-indigo-50 transition-all shadow-lg active:scale-95"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Create Free Account'}
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="border border-white/30 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95"
            >
              Request a Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
