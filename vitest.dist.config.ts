import { defineConfig } from 'vitest/config';

// `npm run test:dist`: verifica i file generati in `dist/`.
// Da eseguire dopo `npm run build`.
export default defineConfig({
  test: {
    include: ['tests/dist/**/*.test.ts'],
  },
});
