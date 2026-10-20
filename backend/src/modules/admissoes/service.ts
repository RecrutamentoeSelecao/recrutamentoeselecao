import type { z } from 'zod';
import { auditar } from '../../shared/audit/auditoria.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { type DataISO, dateParaISO } from '../../shared/datas.js';
import { naoEncontrado } from '../../shared/errors.js';
import { hoje } from '../../shared/hoje.js';
import { paginar } from '../../shared/http/schemas.js';
import { type Tx, prisma } from '../../shared/prisma.js';
import { type ContextoNegocio, carregarContexto } from '../configuracao/repository.js';
import { type ResultadoPropagacao, propagarVaga } from '../propagacao/service.js';
import { type RespostaItem, calcularAdmissao, proximaResposta } from './regras.js';
import * as repo from './repository.js';
import type * as s from './schemas.js';

export function apresentar(a: repo.AdmissaoCompleta, ctx: ContextoNegocio, dia: DataISO) {
  const inicio = dateParaISO(a.vaga.inicio);
  return {
    id: a.id, codigo: a.codigo, obs: a.obs, criadoEm: a.criadoEm,
    // Empresa, cargo, gestor, colaborador e início são LIDOS da vaga (a vaga manda).
    vaga: { ...a.vaga, inicio },
    itens: a.itens.map((i) => ({ ordem: i.ordem, tarefa: i.tarefa, resposta: i.resposta, respondidoEm: i.respondidoEm })),
    calculado: calcularAdmissao(a.itens, inicio, dia, ctx.params.admissaoAlertaDias),
  };
}

export async function listar(f: z.infer<typeof s.filtroAdmissoes>) {
  const ctx = await carregarContexto(prisma);
  const dia = hoje();
  const linhas = (await repo.listar(prisma, f)).map((a) => apresentar(a, ctx, dia))
    .filter((l) => f.filtro === 'todas' || !l.calculado.concluida);
  return paginar(linhas, f.pagina, f.porPagina);
}

export async function obter(id: string) {
  const a = await repo.buscar(prisma, id);
  if (!a) throw naoEncontrado('Admissão', id);
  return apresentar(a, await carregarContexto(prisma), hoje());
}

/** Toda mudança no checklist reavalia a vaga: 100% → nasce a experiência (e integração/contrato/uniforme). */
async function mutarItens(ator: Ator, id: string, fn: (tx: Tx, a: repo.AdmissaoCompleta) => Promise<void>) {
  return prisma.$transaction(async (tx) => {
    const ctx = await carregarContexto(tx);
    const dia = hoje();
    const a = await repo.buscar(tx, id);
    if (!a) throw naoEncontrado('Admissão', id);
    await fn(tx, a);
    const propagacao: ResultadoPropagacao = await propagarVaga(tx, ator, a.vagaId, ctx, dia);
    return { admissao: apresentar((await repo.buscar(tx, id))!, ctx, dia), propagacao };
  });
}

async function gravarItem(tx: Tx, ator: Ator, a: repo.AdmissaoCompleta, ordem: number, resposta: RespostaItem) {
  const item = a.itens.find((i) => i.ordem === ordem);
  if (!item) throw naoEncontrado('Item do checklist', String(ordem));
  if (item.resposta === resposta) return;
  await tx.admissaoItem.update({ where: { admissaoId_ordem: { admissaoId: a.id, ordem } }, data: { resposta, respondidoEm: new Date() } });
  await auditar(tx, ator, { acao: 'ATUALIZAR', entidade: 'Admissao', entidadeId: a.id,
    antes: { item: item.tarefa, resposta: item.resposta }, depois: { item: item.tarefa, resposta } });
}

export const definirItem = (ator: Ator, id: string, ordem: number, resposta: RespostaItem) =>
  mutarItens(ator, id, (tx, a) => gravarItem(tx, ator, a, ordem, resposta));

export const alternarItem = (ator: Ator, id: string, ordem: number) =>
  mutarItens(ator, id, async (tx, a) => {
    const item = a.itens.find((i) => i.ordem === ordem);
    if (!item) throw naoEncontrado('Item do checklist', String(ordem));
    await gravarItem(tx, ator, a, ordem, proximaResposta(item.resposta));
  });

/** Conclui o checklist (todo NÃO vira SIM; N/A fica) → dispara a criação da experiência. */
export const concluir = (ator: Ator, id: string) =>
  mutarItens(ator, id, async (tx, a) => {
    for (const i of a.itens.filter((x) => x.resposta === 'NAO')) await gravarItem(tx, ator, a, i.ordem, 'SIM');
  });

export async function atualizarObs(ator: Ator, id: string, obs: string) {
  return prisma.$transaction(async (tx) => {
    const a = await tx.admissao.findUnique({ where: { id } });
    if (!a) throw naoEncontrado('Admissão', id);
    await tx.admissao.update({ where: { id }, data: { obs } });
    await auditar(tx, ator, { acao: 'ATUALIZAR', entidade: 'Admissao', entidadeId: id, antes: { obs: a.obs }, depois: { obs } });
    return { id, obs };
  });
}

export async function excluir(ator: Ator, id: string) {
  await prisma.$transaction(async (tx) => {
    const a = await repo.buscar(tx, id);
    if (!a) throw naoEncontrado('Admissão', id);
    await tx.admissao.delete({ where: { id } });
    await auditar(tx, ator, { acao: 'EXCLUIR', entidade: 'Admissao', entidadeId: id, antes: a });
  });
}

/** "Lançar admissões": varre todas as vagas e aplica a propagação (idempotente). */
export async function lancar(ator: Ator) {
  const ids = (await prisma.vaga.findMany({ select: { id: true } })).map((v) => v.id);
  const criados: ResultadoPropagacao['criados'] = [];
  let espelhados = 0;
  for (const id of ids) {
    const r = await prisma.$transaction(async (tx) => propagarVaga(tx, ator, id, await carregarContexto(tx), hoje()));
    criados.push(...r.criados);
    espelhados += r.espelhados;
  }
  return { vagasAvaliadas: ids.length, criados, espelhados };
}
