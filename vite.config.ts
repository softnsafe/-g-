import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The '' third argument ensures we load all variables, not just those starting with VITE_
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Safely stringify the key, defaulting to empty string if missing to prevent build crashes
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});