import type { Prisma } from '@prisma/client';
import type { DelegateCrud } from '../../shared/crud.js';
import { isoParaDate } from '../../shared/datas.js';
import type { Db } from '../../shared/prisma.js';

export const delegate = (db: Db) => db.integracao as unknown as DelegateCrud;

export function listar(db: Db, f: { empresa?: string; busca?: string; de?: string | null; ate?: string | null }) {
  const where: Prisma.IntegracaoWhereInput = {};
  if (f.empresa) where.empresa = f.empresa;
  if (f.busca) where.OR = [{ nome: { contains: f.busca, mode: 'insensitive' } }, { setor: { contains: f.busca, mode: 'insensitive' } }];
  if (f.de || f.ate) where.admissao = { ...(f.de ? { gte: isoParaDate(f.de)! } : {}), ...(f.ate ? { lte: isoParaDate(f.ate)! } : {}) };
  return db.integracao.findMany({ where, orderBy: [{ admissao: 'desc' }, { criadoEm: 'desc' }] });
}
