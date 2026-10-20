import { construirApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './shared/prisma.js';

const app = await construirApp();

const encerrar = async (sinal: string) => {
  app.log.info({ sinal }, 'encerrando');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', () => void encerrar('SIGINT'));
process.on('SIGTERM', () => void encerrar('SIGTERM'));

await app.listen({ port: env.PORT, host: env.HOST });
