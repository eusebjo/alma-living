import { getViteConfig } from 'astro/config';

// `npm test`: test unitari e di contenuto. I test sulla build (`tests/dist`)
// richiedono `npm run build` e si lanciano con `npm run test:dist`.
export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/dist/**', 'node_modules/**', 'dist/**'],
  },
});
