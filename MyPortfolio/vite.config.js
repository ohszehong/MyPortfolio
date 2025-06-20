import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from "fs";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
      server: {
        https: {
          key: fs.readFileSync(path.resolve(__dirname, "cert/key.pem")),
          cert: fs.readFileSync(path.resolve(__dirname, "cert/cert.pem"))
        },
        proxy: {
          "/api": {
            target: env.VITE_API_ORIGIN,
            changeOrigin: true,
            secure: false,
            ws: true
        }
      }
      },
  }
});
