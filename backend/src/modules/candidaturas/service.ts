import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { auditar } from '../../shared/audit/auditoria.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { naoEncontrado, regraNegocio } from '../../shared/errors.js';
import { semIndefinidos } from '../../shared/http/conversao.js';
import { paginar } from '../../shared/http/schemas.js';
import { prisma } from '../../shared/prisma.js';
import { contarPorEtapa, validarMovimento } from './regras.js';
import * as repo from './repository.js';
import type * as s from './schemas.js';

export async function listar(f: z.infer<typeof s.filtroCandidaturas>) {
  const todas = await repo.listar(prisma, f);
  return { ...paginar(todas, f.pagina, f.porPagina), funil: contarPorEtapa(todas) };
}

export async function criar(ator: Ator, d: z.infer<typeof s.candidaturaCriar>) {
  return prisma.$transaction(async (tx) => {
    const cand = await tx.candidato.findUnique({ where: { id: d.candidatoId } });
    if (!cand) throw naoEncontrado('Candidato', d.candidatoId);
    if (cand.anonimizadoEm) throw regraNegocio('Candidato anonimizado não pode concorrer');
    const c = await tx.candidatura.create({ data: { ...d, etapa: d.etapa ?? 'TRIAGEM', eventos: { create: { para: d.etapa ?? 'TRIAGEM', porId: ator.id } } } });
    await auditar(tx, ator, { acao: 'CRIAR', entidade: 'Candidatura', entidadeId: c.id, depois: c });
    return c;
  });
}

export async function atualizar(ator: Ator, id: string, d: z.infer<typeof s.candidaturaAtualizar>) {
  return prisma.$transaction(async (tx) => {
    const antes = await repo.buscar(tx, id);
    if (!antes) throw naoEncontrado('Candidatura', id);
    const { scorecard, ...resto } = d;
    const data: Prisma.CandidaturaUpdateInput = { ...semIndefinidos(resto) };
    if (scorecard !== undefined) data.scorecard = scorecard === null ? Prisma.DbNull : (scorecard as Prisma.InputJsonValue);
    const c = await tx.candidatura.update({ where: { id }, data });
    await auditar(tx, ator, { acao: 'ATUALIZAR', entidade: 'Candidatura', entidadeId: id, antes, depois: c });
    return c;
  });
}

/** Move no funil com trilha de eventos (de → para, quando, quem). */
export async function mover(ator: Ator, id: string, d: z.infer<typeof s.mover>) {
  return prisma.$transaction(async (tx) => {
    const antes = await repo.buscar(tx, id);
    if (!antes) throw naoEncontrado('Candidatura', id);
    const erro = validarMovimento(antes.etapa, d.etapa, d.motivo);
    if (erro) throw regraNegocio(erro);
    const c = await tx.candidatura.update({
      where: { id },
      data: { etapa: d.etapa, etapaAtualizadaEm: new Date(), motivoPerda: d.motivo ?? antes.motivoPerda,
        eventos: { create: { de: antes.etapa, para: d.etapa, motivo: d.motivo, porId: ator.id } } },
    });
    await auditar(tx, ator, { acao: 'ACAO', entidade: 'Candidatura', entidadeId: id, antes: { etapa: antes.etapa }, depois: { etapa: d.etapa, motivo: d.motivo } });
    return c;
  });
}

export async function eventos(id: string) {
  if (!(await repo.buscar(prisma, id))) throw naoEncontrado('Candidatura', id);
  return repo.eventos(prisma, id);
}

export async function excluir(ator: Ator, id: string) {
  await prisma.$transaction(async (tx) => {
    const antes = await repo.buscar(tx, id);
    if (!antes) throw naoEncontrado('Candidatura', id);
    await tx.candidatura.delete({ where: { id } });
    await auditar(tx, ator, { acao: 'EXCLUIR', entidade: 'Candidatura', entidadeId: id, antes });
  });
}
