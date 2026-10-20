import type { Prisma, VagaEtapa } from '@prisma/client';
import { type DataISO, dateParaISO } from '../../shared/datas.js';
import type { Db } from '../../shared/prisma.js';
import type { EtapaReguaDef } from '../configuracao/regras.js';

export const INCLUIR_VAGA = { etapas: true } satisfies Prisma.VagaInclude;
export type VagaComEtapas = Prisma.VagaGetPayload<{ include: typeof INCLUIR_VAGA }>;

/** Converte as linhas VagaEtapa (por ordem) num vetor alinhado à régua atual. */
export function etapasAlinhadas(etapas: Pick<VagaEtapa, 'ordem' | 'data'>[], regua: EtapaReguaDef[]): (DataISO | null)[] {
  const porOrdem = new Map(etapas.map((e) => [e.ordem, dateParaISO(e.data)]));
  return regua.map((r) => porOrdem.get(r.ordem) ?? null);
}

export interface FiltroVagasBanco {
  empresa?: string;
  busca?: string;
  gestorUsuarioId?: string | null;
}

export function listarVagas(db: Db, f: FiltroVagasBanco) {
  const where: Prisma.VagaWhereInput = {};
  if (f.empresa) where.empresa = f.empresa;
  if (f.gestorUsuarioId) where.gestorUsuarioId = f.gestorUsuarioId;
  if (f.busca) {
    const q = { contains: f.busca, mode: 'insensitive' as const };
    where.OR = [{ cargo: q }, { empresa: q }, { aprovado: q }, { substituido: q }, { codigo: q }];
  }
  return db.vaga.findMany({ where, include: INCLUIR_VAGA, orderBy: { criadoEm: 'desc' } });
}

export const buscarVaga = (db: Db, id: string) => db.vaga.findUnique({ where: { id }, include: INCLUIR_VAGA });

export const historicoVaga = (db: Db, vagaId: string) =>
  db.vagaHistorico.findMany({ where: { vagaId }, orderBy: { em: 'asc' } });

export const registrarHistorico = (db: Db, dados: Prisma.VagaHistoricoUncheckedCreateInput) =>
  db.vagaHistorico.create({ data: dados });
