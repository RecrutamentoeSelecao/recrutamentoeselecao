import type { Papel } from '@prisma/client';

/** Quem está agindo: vai para o audit log e para as regras de visibilidade. */
export interface Ator {
  id: string | null;
  nome: string;
  papel: Papel | 'SISTEMA';
  ip?: string;
  userAgent?: string;
}

export interface UsuarioToken {
  sub: string;
  nome: string;
  papel: Papel;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UsuarioToken;
    user: UsuarioToken;
  }
}

export const ATOR_SISTEMA: Ator = { id: null, nome: 'SISTEMA', papel: 'SISTEMA' };
