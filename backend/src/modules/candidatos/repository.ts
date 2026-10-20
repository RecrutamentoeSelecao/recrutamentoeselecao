import type { Prisma } from '@prisma/client';
import type { Db } from '../../shared/prisma.js';

export function listar(db: Db, f: { busca?: string; incluirAnonimizados: boolean }) {
  const where: Prisma.CandidatoWhereInput = {};
  if (!f.incluirAnonimizados) where.anonimizadoEm = null;
  if (f.busca) where.OR = [{ nome: { contains: f.busca, mode: 'insensitive' } }, { email: { contains: f.busca, mode: 'insensitive' } }];
  return db.candidato.findMany({ where, orderBy: { criadoEm: 'desc' } });
}

export const buscar = (db: Db, id: string) => db.candidato.findUnique({ where: { id } });

export const buscarDuplicado = (db: Db, cpf?: string | null, email?: string | null) =>
  cpf || email ? db.candidato.findFirst({ where: { OR: [...(cpf ? [{ cpf }] : []), ...(email ? [{ email }] : [])] } }) : null;

export const buscarCompleto = (db: Db, id: string) =>
  db.candidato.findUnique({ where: { id }, include: { candidaturas: { include: { eventos: true, vaga: { select: { codigo: true, cargo: true, empresa: true } } } } } });

export const candidatosParaExpurgo = (db: Db) =>
  db.candidato.findMany({ where: { anonimizadoEm: null }, include: { candidaturas: { select: { etapa: true } } } });
