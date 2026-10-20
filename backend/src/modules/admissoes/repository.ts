import type { Prisma } from '@prisma/client';
import type { Db } from '../../shared/prisma.js';

export const INCLUIR_ADMISSAO = {
  itens: { orderBy: { ordem: 'asc' } },
  vaga: { select: { id: true, codigo: true, empresa: true, cargo: true, gestor: true, substituido: true, aprovado: true, inicio: true, gestorUsuarioId: true } },
} satisfies Prisma.AdmissaoInclude;
export type AdmissaoCompleta = Prisma.AdmissaoGetPayload<{ include: typeof INCLUIR_ADMISSAO }>;

export function listar(db: Db, f: { empresa?: string; busca?: string }) {
  const vaga: Prisma.VagaWhereInput = {};
  if (f.empresa) vaga.empresa = f.empresa;
  if (f.busca) vaga.OR = [{ aprovado: { contains: f.busca, mode: 'insensitive' } }, { cargo: { contains: f.busca, mode: 'insensitive' } }, { codigo: { contains: f.busca, mode: 'insensitive' } }];
  return db.admissao.findMany({ where: { vaga }, include: INCLUIR_ADMISSAO, orderBy: { criadoEm: 'desc' } });
}

export const buscar = (db: Db, id: string) => db.admissao.findUnique({ where: { id }, include: INCLUIR_ADMISSAO });
