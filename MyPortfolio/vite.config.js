import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from "fs";
import path from "path";
import { platform } from 'os';

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  
  const env = loadEnv(mode, process.cwd(), "");

  let keyPath;
  let certPath;
  if(platform() === "win32" || platform() === "linux")
  { 
    keyPath = "cert/localhost.key";
    certPath = "cert/localhost.crt";
  }
  else
  { 
    keyPath = "cert/key.pem";
    certPath = "cert/cert.pem";
  }

  return {
    plugins: [react()],
      server: {
        https: {
          key: fs.readFileSync(path.resolve(__dirname, keyPath)),
          cert: fs.readFileSync(path.resolve(__dirname, certPath))
        },
        proxy: {
          "/api": {
            target: env.VITE_API_ORIGIN,
            changeOrigin: true,
            secure: false,
            ws: true
        },
        "/sfx": {
          target: env.VITE_API_ORIGIN,
          changeOrigin: true,
          secure: false,
          ws: true
        }
      }
      },
  }
});
