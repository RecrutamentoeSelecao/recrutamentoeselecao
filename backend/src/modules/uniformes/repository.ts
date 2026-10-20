import type { Prisma } from '@prisma/client';
import type { DelegateCrud } from '../../shared/crud.js';
import { isoParaDate } from '../../shared/datas.js';
import type { Db } from '../../shared/prisma.js';

export const delegate = (db: Db) => db.uniforme as unknown as DelegateCrud;

export function listar(db: Db, f: { filtro: 'pendentes' | 'todos'; empresa?: string; busca?: string; de?: string | null; ate?: string | null }) {
  const where: Prisma.UniformeWhereInput = {};
  if (f.filtro === 'pendentes') where.OR = [{ entregue: null }, { entregue: 'NAO' }];
  if (f.empresa) where.empresa = f.empresa;
  if (f.busca) where.AND = [{ OR: [{ nome: { contains: f.busca, mode: 'insensitive' } }, { cargo: { contains: f.busca, mode: 'insensitive' } }] }];
  if (f.de || f.ate) where.admissao = { ...(f.de ? { gte: isoParaDate(f.de)! } : {}), ...(f.ate ? { lte: isoParaDate(f.ate)! } : {}) };
  return db.uniforme.findMany({ where, orderBy: [{ admissao: 'desc' }, { criadoEm: 'desc' }] });
}
