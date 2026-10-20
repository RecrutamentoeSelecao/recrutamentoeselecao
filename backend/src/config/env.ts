import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET precisa de ao menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL_DIAS: z.coerce.number().int().positive().default(7),
  CORS_ORIGINS: z.string().default(''),
  TZ_NEGOCIO: z.string().default('America/Sao_Paulo'),
  RETENCAO_CANDIDATO_MESES: z.coerce.number().int().positive().default(24),
});

export type Env = z.infer<typeof esquema>;

function carregar(): Env {
  const r = esquema.safeParse(process.env);
  if (!r.success) {
    const msgs = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuração inválida: ${msgs}`);
  }
  return r.data;
}

export const env = carregar();
