import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { env } from '../../config/env.js';
import { auditar } from '../../shared/audit/auditoria.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { dateParaISO } from '../../shared/datas.js';
import { conflito, naoEncontrado, regraNegocio } from '../../shared/errors.js';
import { hoje } from '../../shared/hoje.js';
import { datasParaBanco, paraResposta, semIndefinidos } from '../../shared/http/conversao.js';
import { paginar } from '../../shared/http/schemas.js';
import { type Tx, prisma } from '../../shared/prisma.js';
import { padronizarObjeto } from '../../shared/texto.js';
import { camposAnonimizados, elegivelParaExpurgo, retencaoPadrao } from './regras.js';
import * as repo from './repository.js';
import type * as s from './schemas.js';

const DATAS = ['retencaoAte'] as const;
const NAO_PADRONIZAR = ['curriculoTexto', 'curriculoUrl', 'email'];
const apresentar = (c: Record<string, unknown>) => paraResposta(c, DATAS);

export async function listar(f: z.infer<typeof s.filtroCandidatos>) {
  return paginar((await repo.listar(prisma, f)).map(apresentar), f.pagina, f.porPagina);
}

export async function obter(id: string) {
  const c = await repo.buscar(prisma, id);
  if (!c) throw naoEncontrado('Candidato', id);
  return apresentar(c);
}

export async function criar(ator: Ator, d: z.infer<typeof s.candidatoCriar>) {
  const { consentimento, ...dados } = d;
  const baseLegal = dados.baseLegal ?? 'CONSENTIMENTO';
  if (baseLegal === 'CONSENTIMENTO' && !consentimento) throw regraNegocio('Base legal CONSENTIMENTO exige o aceite do termo (consentimento.aceito = true e versão)');
  const limpo = semIndefinidos(padronizarObjeto(dados as Record<string, unknown>, NAO_PADRONIZAR));
  const dup = await repo.buscarDuplicado(prisma, limpo.cpf as string | undefined, limpo.email as string | undefined);
  if (dup) throw conflito('Candidato já cadastrado (mesmo CPF ou e-mail)', { id: dup.id });
  return prisma.$transaction(async (tx) => {
    const c = await tx.candidato.create({
      data: datasParaBanco({
        ...limpo, baseLegal,
        retencaoAte: limpo.retencaoAte ?? retencaoPadrao(hoje(), env.RETENCAO_CANDIDATO_MESES),
        consentimentoEm: consentimento ? new Date() : null,
        consentimentoVersao: consentimento?.versao ?? null,
      }, DATAS) as never,
    });
    await auditar(tx, ator, { acao: 'CRIAR', entidade: 'Candidato', entidadeId: c.id, depois: c });
    return apresentar(c);
  });
}

export async function atualizar(ator: Ator, id: string, d: z.infer<typeof s.candidatoAtualizar>) {
  return prisma.$transaction(async (tx) => {
    const antes = await repo.buscar(tx, id);
    if (!antes) throw naoEncontrado('Candidato', id);
    if (antes.anonimizadoEm) throw regraNegocio('Candidato anonimizado não pode ser editado');
    const limpo = semIndefinidos(padronizarObjeto(d as Record<string, unknown>, NAO_PADRONIZAR));
    const c = await tx.candidato.update({ where: { id }, data: datasParaBanco(limpo, DATAS) as never });
    await auditar(tx, ator, { acao: 'ATUALIZAR', entidade: 'Candidato', entidadeId: id, antes, depois: c });
    return apresentar(c);
  });
}

export async function registrarConsentimento(ator: Ator, id: string, versao: string) {
  return prisma.$transaction(async (tx) => {
    const c = await tx.candidato.update({ where: { id }, data: { consentimentoEm: new Date(), consentimentoVersao: versao, consentimentoRevogadoEm: null } });
    await auditar(tx, ator, { acao: 'ACAO', entidade: 'Candidato', entidadeId: id, depois: { consentimento: versao } });
    return apresentar(c);
  });
}

export async function revogarConsentimento(ator: Ator, id: string) {
  return prisma.$transaction(async (tx) => {
    const c = await tx.candidato.update({ where: { id }, data: { consentimentoRevogadoEm: new Date() } });
    await auditar(tx, ator, { acao: 'ACAO', entidade: 'Candidato', entidadeId: id, depois: { consentimentoRevogado: true } });
    return apresentar(c);
  });
}

/** LGPD art. 18 (acesso/portabilidade): tudo que existe sobre o titular, em JSON. */
export async function exportarDadosTitular(ator: Ator, id: string) {
  const c = await repo.buscarCompleto(prisma, id);
  if (!c) throw naoEncontrado('Candidato', id);
  const acessos = await prisma.auditLog.findMany({
    where: { entidade: 'Candidato', entidadeId: id },
    select: { em: true, acao: true, usuarioNome: true }, orderBy: { em: 'asc' },
  });
  await auditar(prisma, ator, { acao: 'EXPORTAR_TITULAR', entidade: 'Candidato', entidadeId: id });
  return {
    geradoEm: new Date().toISOString(),
    titular: apresentar(c),
    tratamento: { baseLegal: c.baseLegal, consentimentoEm: c.consentimentoEm, consentimentoVersao: c.consentimentoVersao,
      consentimentoRevogadoEm: c.consentimentoRevogadoEm, retencaoAte: dateParaISO(c.retencaoAte) },
    registroDeOperacoes: acessos,
  };
}

/** Anonimiza o titular e expurga o conteúdo pessoal guardado no audit log desse registro. */
async function anonimizarTx(tx: Tx, ator: Ator, id: string, motivo: string) {
  const c = await repo.buscar(tx, id);
  if (!c) throw naoEncontrado('Candidato', id);
  if (c.anonimizadoEm) throw regraNegocio('Candidato já anonimizado');
  await tx.candidato.update({ where: { id }, data: camposAnonimizados(id, new Date()) });
  await tx.candidatura.updateMany({ where: { candidatoId: id }, data: { scorecard: Prisma.DbNull } });
  await tx.auditLog.updateMany({ where: { entidade: 'Candidato', entidadeId: id }, data: { antes: { redigido: 'LGPD' }, depois: { redigido: 'LGPD' } } });
  // Registra a operação sem guardar os dados apagados.
  await auditar(tx, ator, { acao: 'ANONIMIZAR', entidade: 'Candidato', entidadeId: id, depois: { motivo } });
}

export const anonimizar = (ator: Ator, id: string, motivo = 'pedido do titular') =>
  prisma.$transaction((tx) => anonimizarTx(tx, ator, id, motivo)).then(() => obter(id));

/** Rotina de expurgo: anonimiza quem passou da retenção ou revogou o consentimento. */
export async function expurgar(ator: Ator, simular: boolean) {
  const dia = hoje();
  const alvos = (await repo.candidatosParaExpurgo(prisma)).map((c) => ({
    id: c.id,
    ...elegivelParaExpurgo({ anonimizadoEm: c.anonimizadoEm, retencaoAte: dateParaISO(c.retencaoAte), baseLegal: c.baseLegal,
      consentimentoRevogadoEm: c.consentimentoRevogadoEm, contratado: c.candidaturas.some((k) => k.etapa === 'APROVADO') }, dia),
  })).filter((x) => x.elegivel);
  if (!simular) {
    for (const a of alvos) await prisma.$transaction((tx) => anonimizarTx(tx, ator, a.id, `expurgo: ${a.motivo}`));
  }
  return { simulacao: simular, quantidade: alvos.length, alvos: alvos.map((a) => ({ id: a.id, motivo: a.motivo })) };
}

export async function excluir(ator: Ator, id: string) {
  // Exclusão física a pedido do titular; o log guarda só o fato.
  await prisma.$transaction(async (tx) => {
    const c = await repo.buscar(tx, id);
    if (!c) throw naoEncontrado('Candidato', id);
    await tx.candidato.delete({ where: { id } });
    await tx.auditLog.updateMany({ where: { entidade: 'Candidato', entidadeId: id }, data: { antes: { redigido: 'LGPD' }, depois: { redigido: 'LGPD' } } });
    await auditar(tx, ator, { acao: 'EXCLUIR', entidade: 'Candidato', entidadeId: id });
  });
}
