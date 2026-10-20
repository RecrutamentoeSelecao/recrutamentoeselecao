import type { z } from 'zod';
import { auditar, delta } from '../../shared/audit/auditoria.js';
import { restricaoGestor } from '../../shared/auth/rbac.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { PREFIXOS, proximoCodigo } from '../../shared/codigos.js';
import { type DataISO } from '../../shared/datas.js';
import { conflito, naoEncontrado, proibido, regraNegocio } from '../../shared/errors.js';
import { hoje } from '../../shared/hoje.js';
import { datasParaBanco, paraResposta, semIndefinidos } from '../../shared/http/conversao.js';
import { paginar } from '../../shared/http/schemas.js';
import { type Tx, prisma } from '../../shared/prisma.js';
import { padronizarObjeto } from '../../shared/texto.js';
import { type ContextoNegocio, carregarContexto } from '../configuracao/repository.js';
import { propagarVaga } from '../propagacao/service.js';
import { calcularVaga, proximaEtapaPendente } from './regras.js';
import * as repo from './repository.js';
import type * as s from './schemas.js';

const DATAS = ['abertura', 'inicio'] as const;

export function apresentarVaga(v: repo.VagaComEtapas, ctx: ContextoNegocio, dia: DataISO) {
  const { etapas: linhasEtapa, ...resto } = v;
  const base = paraResposta(resto, DATAS);
  const etapas = repo.etapasAlinhadas(linhasEtapa, ctx.regua);
  const entrada = { status: v.status, abertura: base.abertura as DataISO | null, etapas,
    inicio: base.inicio as DataISO | null, medirSla: v.medirSla };
  const calc = calcularVaga(entrada, ctx.regua, ctx.params, dia);
  const prox = proximaEtapaPendente(entrada, ctx.regua, ctx.feriados);
  return {
    ...base,
    etapas: ctx.regua.map((r, i) => ({ ordem: r.ordem, nome: r.nome, slaDias: r.slaDias, data: etapas[i] ?? null, situacao: calc.flags[i] })),
    calculado: { ...calc, proximaEtapa: prox ? { ordem: prox.etapa.ordem, nome: prox.etapa.nome, prazoDiasUteis: prox.prazo } : null },
  };
}

function podeVer(ator: Ator, v: { gestorUsuarioId: string | null }) {
  const g = restricaoGestor(ator);
  if (g && v.gestorUsuarioId !== g) throw proibido('Vaga de outro gestor');
}

export async function listar(ator: Ator, f: z.infer<typeof s.filtroVagas>) {
  const ctx = await carregarContexto(prisma);
  const dia = hoje();
  const vagas = await repo.listarVagas(prisma, { empresa: f.empresa, busca: f.busca, gestorUsuarioId: restricaoGestor(ator) });
  const linhas = vagas.map((v) => apresentarVaga(v, ctx, dia)).filter(({ calculado: c }) => {
    if (f.filtro === 'abertas') return c.aberta;
    if (f.filtro === 'criticas') return c.aberta && c.farol === 'critico';
    if (f.filtro === 'foraSla') return c.statusSla === 'FORA';
    return true;
  });
  return paginar(linhas, f.pagina, f.porPagina);
}

export async function obter(ator: Ator, id: string) {
  const v = await repo.buscarVaga(prisma, id);
  if (!v) throw naoEncontrado('Vaga', id);
  podeVer(ator, v);
  return apresentarVaga(v, await carregarContexto(prisma), hoje());
}

/** Executa uma mutação de vaga + propagação + auditoria numa transação e devolve a vaga apresentada. */
async function mutar(ator: Ator, id: string, fn: (tx: Tx, ctx: ContextoNegocio, dia: DataISO) => Promise<void>) {
  const resultado = await prisma.$transaction(async (tx) => {
    const ctx = await carregarContexto(tx);
    const dia = hoje();
    await fn(tx, ctx, dia);
    const propagacao = await propagarVaga(tx, ator, id, ctx, dia);
    const v = await repo.buscarVaga(tx, id);
    return { vaga: apresentarVaga(v!, ctx, dia), propagacao };
  });
  return resultado;
}

export async function criar(ator: Ator, dados: z.infer<typeof s.vagaCriar>) {
  const limpo = padronizarObjeto(dados as Record<string, unknown>);
  return prisma.$transaction(async (tx) => {
    const ctx = await carregarContexto(tx);
    const dia = hoje();
    const v = await tx.vaga.create({
      data: { ...datasParaBanco({ abertura: dia, ...limpo }, DATAS), codigo: await proximoCodigo(tx, PREFIXOS.vaga) } as never,
    });
    await repo.registrarHistorico(tx, { vagaId: v.id, tipo: 'STATUS', para: v.status, porId: ator.id });
    await auditar(tx, ator, { acao: 'CRIAR', entidade: 'Vaga', entidadeId: v.id, depois: v });
    const propagacao = await propagarVaga(tx, ator, v.id, ctx, dia);
    return { vaga: apresentarVaga((await repo.buscarVaga(tx, v.id))!, ctx, dia), propagacao };
  });
}

async function atualizarTx(tx: Tx, ator: Ator, id: string, dados: z.infer<typeof s.vagaAtualizar>) {
  const { versao, ...resto } = dados;
  const limpo = semIndefinidos(padronizarObjeto(resto as Record<string, unknown>));
  const antes = await tx.vaga.findUnique({ where: { id } });
  if (!antes) throw naoEncontrado('Vaga', id);
  if (versao != null && versao !== antes.versao) throw conflito('A vaga foi alterada por outra pessoa; recarregue', { versaoAtual: antes.versao });
  const depois = await tx.vaga.update({ where: { id }, data: { ...datasParaBanco(limpo, DATAS), versao: { increment: 1 } } as never });
  const mud = delta(paraResposta(antes, DATAS), paraResposta(depois, DATAS));
  delete mud.antes.versao; delete mud.depois.versao; delete mud.antes.atualizadoEm; delete mud.depois.atualizadoEm;
  for (const [campo, tipo] of [['status', 'STATUS'], ['inicio', 'INICIO'], ['aprovado', 'APROVADO']] as const) {
    if (campo in mud.depois) {
      await repo.registrarHistorico(tx, { vagaId: id, tipo, de: String(mud.antes[campo] ?? ''), para: String(mud.depois[campo] ?? ''), porId: ator.id });
    }
  }
  await auditar(tx, ator, { acao: 'ATUALIZAR', entidade: 'Vaga', entidadeId: id, ...mud });
}

async function definirEtapaTx(tx: Tx, ctx: ContextoNegocio, ator: Ator, id: string, ordem: number, data: DataISO | null) {
  const etapa = ctx.regua.find((e) => e.ordem === ordem);
  if (!etapa) throw regraNegocio(`Etapa ${ordem} não existe na régua`);
  const v = await tx.vaga.findUnique({ where: { id }, include: { etapas: true } });
  if (!v) throw naoEncontrado('Vaga', id);
  if (data && v.abertura && data < v.abertura.toISOString().slice(0, 10)) throw regraNegocio('A data da etapa não pode ser anterior à abertura');
  const anterior = v.etapas.find((e) => e.ordem === ordem);
  const de = anterior ? anterior.data.toISOString().slice(0, 10) : null;
  if (de === data) return;
  if (data) {
    const d = datasParaBanco({ data }, ['data']).data as unknown as Date;
    await tx.vagaEtapa.upsert({
      where: { vagaId_ordem: { vagaId: id, ordem } },
      create: { vagaId: id, ordem, nome: etapa.nome, data: d, registradaPorId: ator.id },
      update: { data: d, nome: etapa.nome, registradaEm: new Date(), registradaPorId: ator.id },
    });
  } else if (anterior) {
    await tx.vagaEtapa.delete({ where: { vagaId_ordem: { vagaId: id, ordem } } });
  }
  await tx.vaga.update({ where: { id }, data: { versao: { increment: 1 } } });
  await repo.registrarHistorico(tx, { vagaId: id, tipo: 'ETAPA', etapaOrdem: ordem, de, para: data, porId: ator.id });
  await auditar(tx, ator, { acao: 'ACAO', entidade: 'Vaga', entidadeId: id, antes: { etapa: etapa.nome, data: de }, depois: { etapa: etapa.nome, data } });
}

export const atualizar = (ator: Ator, id: string, dados: z.infer<typeof s.vagaAtualizar>) =>
  mutar(ator, id, (tx) => atualizarTx(tx, ator, id, dados));

/** Data (ou limpa) uma etapa da régua. Registra histórico com carimbo de tempo para SLA/TTF/TTH. */
export const definirEtapa = (ator: Ator, id: string, ordem: number, data: DataISO | null) =>
  mutar(ator, id, (tx, ctx) => definirEtapaTx(tx, ctx, ator, id, ordem, data));

/** Avança: data a próxima etapa pendente (padrão: hoje). */
export async function avancar(ator: Ator, id: string, data?: DataISO | null) {
  return mutar(ator, id, async (tx, ctx, dia) => {
    const v = await repo.buscarVaga(tx, id);
    if (!v) throw naoEncontrado('Vaga', id);
    const k = repo.etapasAlinhadas(v.etapas, ctx.regua).findIndex((d) => !d);
    if (k < 0) throw regraNegocio('Todas as etapas já foram cumpridas');
    await definirEtapaTx(tx, ctx, ator, id, ctx.regua[k]!.ordem, data ?? dia);
  });
}

/** Aprova: grava quem entra (e o início), data a etapa final (Aprovação) e propaga → nasce a admissão. */
export async function aprovar(ator: Ator, id: string, dados: z.infer<typeof s.aprovar>) {
  return mutar(ator, id, async (tx, ctx, dia) => {
    const ultima = ctx.regua[ctx.regua.length - 1];
    if (!ultima) throw regraNegocio('Régua de etapas vazia');
    await atualizarTx(tx, ator, id, semIndefinidos({ aprovado: dados.aprovado, inicio: dados.inicio ?? undefined }));
    await definirEtapaTx(tx, ctx, ator, id, ultima.ordem, dados.data ?? dia);
  });
}

export async function excluir(ator: Ator, id: string) {
  await prisma.$transaction(async (tx) => {
    const antes = await tx.vaga.findUnique({ where: { id }, include: { etapas: true } });
    if (!antes) throw naoEncontrado('Vaga', id);
    await tx.vaga.delete({ where: { id } });
    await auditar(tx, ator, { acao: 'EXCLUIR', entidade: 'Vaga', entidadeId: id, antes });
  });
}

export async function historico(ator: Ator, id: string) {
  const v = await prisma.vaga.findUnique({ where: { id } });
  if (!v) throw naoEncontrado('Vaga', id);
  podeVer(ator, v);
  return repo.historicoVaga(prisma, id);
}
