import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Os testes unitários são de funções puras e não precisam de banco.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://teste:teste@localhost:5432/teste',
      JWT_ACCESS_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres!!',
    },
  },
});
