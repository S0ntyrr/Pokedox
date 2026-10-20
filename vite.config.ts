import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base relativa: funciona en subrutas como https://usuario.github.io/Pokedox-/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
