import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/movie_review_summarizer/',
  plugins: [
    tailwindcss(),
  ],
});
