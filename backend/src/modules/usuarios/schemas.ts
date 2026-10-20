import { z } from 'zod';

const papel = z.enum(['ADMIN', 'RECRUTADOR', 'GESTOR', 'LEITOR']);
const senha = z.string().min(10, 'Senha com no mínimo 10 caracteres').max(200);
export const usuarioCriar = z.object({ nome: z.string().trim().min(1).max(120), email: z.string().trim().toLowerCase().email(), senha, papel });
export const usuarioAtualizar = z.object({ nome: z.string().trim().min(1).max(120), papel, ativo: z.boolean(), senha }).partial();
