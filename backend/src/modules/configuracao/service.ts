import type { Ator } from '../../shared/auth/tipos.js';
import { auditar } from '../../shared/audit/auditoria.js';
import { dateParaISO, isoParaDate } from '../../shared/datas.js';
import { conflito, naoEncontrado, regraNegocio } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';
import { caixaAlta } from '../../shared/texto.js';
import { carregarContexto } from './repository.js';
import type { NomeLista, Parametros } from './regras.js';

/** Onde cada lista da Base é usada — renomear propaga para os registros (renomearValor do legado). */
const USOS: Partial<Record<NomeLista, [string, string][]>> = {
  empresas: [['vaga', 'empresa'], ['experiencia', 'empresa'], ['integracao', 'empresa'], ['contratoEstagio', 'empresa'], ['uniforme', 'empresa']],
  cargos: [['vaga', 'cargo'], ['experiencia', 'cargo'], ['uniforme', 'cargo']],
  gestores: [['vaga', 'gestor'], ['experiencia', 'gestor'], ['integracao', 'gestor']],
  departamentos: [['vaga', 'depto'], ['experiencia', 'depto'], ['integracao', 'setor'], ['uniforme', 'setor']],
  statusVaga: [['vaga', 'status']],
  tipoVaga: [['vaga', 'tipo']],
  prioridade: [['vaga', 'prioridade']],
  instituicoes: [['contratoEstagio', 'faculdade']],
  terceiros: [['uniforme', 'terceiro']],
  fontes: [['candidatura', 'fonte']],
  motivos: [['candidatura', 'motivoPerda']],
};

export async function obterParametros() {
  const ctx = await carregarContexto(prisma);
  return { parametros: ctx.params, regua: ctx.regua };
}

export async function atualizarParametros(ator: Ator, novos: Partial<Parametros>) {
  return prisma.$transaction(async (tx) => {
    const antes = (await carregarContexto(tx)).params;
    for (const [chave, valor] of Object.entries(novos)) {
      if (valor === undefined) continue;
      const v = Array.isArray(valor) ? valor.map((x) => caixaAlta(String(x))) : typeof valor === 'string' ? caixaAlta(valor) : valor;
      await tx.parametro.upsert({ where: { chave }, create: { chave, valor: v }, update: { valor: v } });
    }
    const depois = (await carregarContexto(tx)).params;
    if (depois.expP1 > depois.expP2) throw regraNegocio('expP1 deve ser menor ou igual a expP2');
    await auditar(tx, ator, { acao: 'ATUALIZAR', entidade: 'Parametro', antes, depois });
    return depois;
  });
}

export async function atualizarRegua(ator: Ator, etapas: { ordem: number; nome: string; slaDias: number }[]) {
  const ordens = etapas.map((e) => e.ordem);
  if (new Set(ordens).size !== ordens.length) throw regraNegocio('Ordens de etapa repetidas');
  return prisma.$transaction(async (tx) => {
    const antes = await tx.etapaRegua.findMany({ orderBy: { ordem: 'asc' } });
    await tx.etapaRegua.deleteMany({ where: { ordem: { notIn: ordens } } });
    for (const e of etapas) await tx.etapaRegua.upsert({ where: { ordem: e.ordem }, create: e, update: e });
    const depois = await tx.etapaRegua.findMany({ orderBy: { ordem: 'asc' } });
    await auditar(tx, ator, { acao: 'ATUALIZAR', entidade: 'EtapaRegua', antes, depois });
    return depois;
  });
}

export async function listarFeriados() {
  const f = await prisma.feriado.findMany({ orderBy: { data: 'asc' } });
  return f.map((x) => ({ data: dateParaISO(x.data), descricao: x.descricao }));
}

export async function criarFeriado(ator: Ator, data: string, descricao: string) {
  return prisma.$transaction(async (tx) => {
    const f = await tx.feriado.upsert({ where: { data: isoParaDate(data)! }, create: { data: isoParaDate(data)!, descricao }, update: { descricao } });
    await auditar(tx, ator, { acao: 'CRIAR', entidade: 'Feriado', entidadeId: data, depois: { data, descricao } });
    return { data: dateParaISO(f.data), descricao: f.descricao };
  });
}

export async function excluirFeriado(ator: Ator, data: string) {
  await prisma.$transaction(async (tx) => {
    const f = await tx.feriado.findUnique({ where: { data: isoParaDate(data)! } });
    if (!f) throw naoEncontrado('Feriado', data);
    await tx.feriado.delete({ where: { data: f.data } });
    await auditar(tx, ator, { acao: 'EXCLUIR', entidade: 'Feriado', entidadeId: data, antes: { data, descricao: f.descricao } });
  });
}

export async function listarListas(lista?: NomeLista) {
  const itens = await prisma.itemLista.findMany({ where: lista ? { lista } : {}, orderBy: [{ lista: 'asc' }, { ordem: 'asc' }] });
  const porLista: Record<string, { id: string; valor: string; cor: string | null; ordem: number }[]> = {};
  for (const i of itens) (porLista[i.lista] ??= []).push({ id: i.id, valor: i.valor, cor: i.cor, ordem: i.ordem });
  return porLista;
}

export async function criarItemLista(ator: Ator, lista: NomeLista, dados: { valor: string; cor?: string | null; ordem?: number }) {
  const valor = caixaAlta(dados.valor);
  return prisma.$transaction(async (tx) => {
    if (await tx.itemLista.findUnique({ where: { lista_valor: { lista, valor } } })) throw conflito(`"${valor}" já está na lista ${lista}`);
    const ordem = dados.ordem ?? ((await tx.itemLista.aggregate({ where: { lista }, _max: { ordem: true } }))._max.ordem ?? 0) + 1;
    const item = await tx.itemLista.create({ data: { lista, valor, cor: dados.cor ?? null, ordem } });
    await auditar(tx, ator, { acao: 'CRIAR', entidade: 'ItemLista', entidadeId: item.id, depois: item });
    return item;
  });
}

/** Renomear propaga o novo valor para todos os registros que usam o antigo. */
export async function atualizarItemLista(ator: Ator, lista: NomeLista, id: string,
  dados: { valor?: string; cor?: string | null; ordem?: number }) {
  return prisma.$transaction(async (tx) => {
    const antes = await tx.itemLista.findFirst({ where: { id, lista } });
    if (!antes) throw naoEncontrado('Item da lista', id);
    const valor = dados.valor ? caixaAlta(dados.valor) : antes.valor;
    const depois = await tx.itemLista.update({ where: { id }, data: { valor, cor: dados.cor === undefined ? antes.cor : dados.cor, ordem: dados.ordem ?? antes.ordem } });
    let propagados = 0;
    if (valor !== antes.valor) {
      for (const [modelo, campo] of USOS[lista] ?? []) {
        const delegate = (tx as unknown as Record<string, { updateMany(a: unknown): Promise<{ count: number }> }>)[modelo]!;
        propagados += (await delegate.updateMany({ where: { [campo]: antes.valor }, data: { [campo]: valor } })).count;
      }
    }
    await auditar(tx, ator, { acao: 'ATUALIZAR', entidade: 'ItemLista', entidadeId: id, antes, depois: { ...depois, propagados } });
    return { ...depois, propagados };
  });
}

export async function excluirItemLista(ator: Ator, lista: NomeLista, id: string) {
  await prisma.$transaction(async (tx) => {
    const antes = await tx.itemLista.findFirst({ where: { id, lista } });
    if (!antes) throw naoEncontrado('Item da lista', id);
    await tx.itemLista.delete({ where: { id } });
    await auditar(tx, ator, { acao: 'EXCLUIR', entidade: 'ItemLista', entidadeId: id, antes });
  });
}
