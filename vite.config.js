import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base: '/contractor-manager/' for GitHub Pages; '/' for server deploy
export default defineConfig({ plugins: [react()], base: process.env.GH_PAGES ? '/contractor-manager/' : '/' })
