import type { Db } from '../../shared/prisma.js';

export const listar = (db: Db, f: { vagaId?: string; candidatoId?: string; etapa?: string }) =>
  db.candidatura.findMany({
    where: { vagaId: f.vagaId, candidatoId: f.candidatoId, etapa: f.etapa as never },
    include: { candidato: { select: { nome: true, anonimizadoEm: true } }, vaga: { select: { codigo: true, cargo: true, empresa: true } } },
    orderBy: { etapaAtualizadaEm: 'desc' },
  });

export const buscar = (db: Db, id: string) => db.candidatura.findUnique({ where: { id } });
export const eventos = (db: Db, candidaturaId: string) => db.candidaturaEvento.findMany({ where: { candidaturaId }, orderBy: { em: 'asc' } });
