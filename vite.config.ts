import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiKey = env.GOOGLE_API_KEY || env.GEMINI_API_KEY;

    return {
      server: {
        // 1. 【核心修复】强制使用 8080 端口 (解决 Container failed to start)
        port: Number(process.env.PORT) || 8080,
        host: '0.0.0.0',
        
        // 2. 【核心修复】Vite 6 必须用数组格式的白名单 (解决 Host blocked)
        allowedHosts: [
            // 允许所有 .run.app 后缀的域名（偷懒但有效的写法）
            '.run.app', 
            'localhost'
        ],
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
        'process.env.GOOGLE_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
