import type { Db } from '../../shared/prisma.js';

export const SELECAO_PUBLICA = { id: true, nome: true, email: true, papel: true, ativo: true, criadoEm: true, atualizadoEm: true } as const;
export const listar = (db: Db) => db.usuario.findMany({ select: SELECAO_PUBLICA, orderBy: { nome: 'asc' } });
export const buscar = (db: Db, id: string) => db.usuario.findUnique({ where: { id }, select: SELECAO_PUBLICA });
