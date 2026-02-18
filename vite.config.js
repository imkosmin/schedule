import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Replace 'your-repo-name' with the actual name of your GitHub repository
  base: '/schedule/', 
})
