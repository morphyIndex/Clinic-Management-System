import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ToastProvider } from 'toaststar';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { TurnstileProvider } from './context/TurnstileProvider.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <HashRouter>
    <TurnstileProvider>
      <AuthProvider>
        <ToastProvider
          scope="clinic-management-system"
          position="top"
          defaultTheme="glass"
          maxVisible={4}
          queueLimit={10}
          overflowStrategy="queue"
          dedupeBehavior="update"
          showProgress={false}
          swipeToDismiss
          appearance={{
            radius: 28,
            color: '#000000ff',
            accent: '#818cf8',
            border: '1px solid rgba(148, 163, 184, 0.24)',
            closeButtonBackground: 'rgba(255, 255, 255, 0.08)',
            shadow: '0 24px 60px rgba(15, 23, 42, 0.32)',
          }}
        >
          <App />
        </ToastProvider>
      </AuthProvider>
    </TurnstileProvider>
  </HashRouter>,
);
