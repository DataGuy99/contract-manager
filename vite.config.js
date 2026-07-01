import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base: '/contract-manager/' for GitHub Pages; '/' for server deploy
export default defineConfig({ plugins: [react()], base: process.env.GH_PAGES ? '/contract-manager/' : '/' })
