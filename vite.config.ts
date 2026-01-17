import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiKey = env.GOOGLE_API_KEY || env.GEMINI_API_KEY;

    return {
      server: {
        // 1. 确保端口是 8080 (Cloud Run 强制要求)
        port: Number(process.env.PORT) || 8080,
        host: '0.0.0.0',
        
        // 2. 【核心修复】白名单里只能填“精准的完整域名”
        allowedHosts: [
            // 请务必确认下面这个地址和你 Cloud Run 顶部显示的 URL 完全一致（不要带 https://）
            'zhaopin-428554502382.asia-northeast1.run.app', 
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
