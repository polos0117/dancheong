import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 는 /dancheong/ 아래 — 배포 워크플로가 BASE_PATH 를 준다. 로컬은 /
export default defineConfig({ base: process.env.BASE_PATH ?? '/', plugins: [react()] });
