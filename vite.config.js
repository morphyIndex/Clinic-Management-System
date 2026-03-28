import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function resolveBasePath(slug) {
  const normalizedSlug = String(slug ?? 'demo-clinic')
    .trim()
    .replace(/^\/+|\/+$/g, '');

  return normalizedSlug ? `/${normalizedSlug}/` : '/';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [tailwindcss(), react()],
    base: resolveBasePath(env.VITE_CLINIC_SLUG),
  };
});
