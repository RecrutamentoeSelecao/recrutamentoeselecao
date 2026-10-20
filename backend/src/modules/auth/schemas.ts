import { z } from 'zod';

export const login = z.object({ email: z.string().trim().toLowerCase().email(), senha: z.string().min(1).max(200) });
export const refresh = z.object({ refreshToken: z.string().min(20).max(200) });

export const respostaTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiraEm: z.string(),
  usuario: z.object({ id: z.string(), nome: z.string(), email: z.string(), papel: z.enum(['ADMIN', 'RECRUTADOR', 'GESTOR', 'LEITOR']) }),
});
