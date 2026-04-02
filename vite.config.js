import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'assets',   // assets/ 폴더를 정적 파일 루트로 서빙
  server: {
    port: 3000,
    host: true,  // 모바일 기기 접근 허용
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Phaser를 별도 청크로 분리 (캐싱 최적화)
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
