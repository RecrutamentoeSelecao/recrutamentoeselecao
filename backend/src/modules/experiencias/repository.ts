import type { Prisma } from '@prisma/client';
import type { DelegateCrud } from '../../shared/crud.js';
import { isoParaDate } from '../../shared/datas.js';
import type { Db } from '../../shared/prisma.js';

export const delegate = (db: Db) => db.experiencia as unknown as DelegateCrud;

export function listar(db: Db, f: { empresa?: string; busca?: string; de?: string | null; ate?: string | null; gestorUsuarioId?: string | null }) {
  const where: Prisma.ExperienciaWhereInput = {};
  if (f.empresa) where.empresa = f.empresa;
  if (f.gestorUsuarioId) where.vaga = { gestorUsuarioId: f.gestorUsuarioId };
  if (f.busca) where.OR = [{ nome: { contains: f.busca, mode: 'insensitive' } }, { cargo: { contains: f.busca, mode: 'insensitive' } }, { gestor: { contains: f.busca, mode: 'insensitive' } }];
  if (f.de || f.ate) where.admissao = { ...(f.de ? { gte: isoParaDate(f.de)! } : {}), ...(f.ate ? { lte: isoParaDate(f.ate)! } : {}) };
  return db.experiencia.findMany({ where, include: { vaga: { select: { gestorUsuarioId: true, codigo: true } } }, orderBy: [{ admissao: 'desc' }] });
}

export const buscarComVaga = (db: Db, id: string) =>
  db.experiencia.findUnique({ where: { id }, include: { vaga: { select: { gestorUsuarioId: true, codigo: true } } } });

export const listarAvaliacoes = (db: Db, experienciaId: string) =>
  db.avaliacaoExperiencia.findMany({ where: { experienciaId }, orderBy: { criadoEm: 'asc' } });
