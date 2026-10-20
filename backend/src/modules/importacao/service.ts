import { env } from '../../config/env.js';
import { auditar } from '../../shared/audit/auditoria.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { isoParaDate } from '../../shared/datas.js';
import { hoje } from '../../shared/hoje.js';
import { datasParaBanco } from '../../shared/http/conversao.js';
import { type Tx, prisma } from '../../shared/prisma.js';
import { type PlanoImportacao, converterLegado, resumoPlano } from './conversor.js';
import { abrirEntradaLegada } from './legado.js';

const DATAS = ['abertura', 'inicio', 'admissao', 'limite1', 'limite2', 'env1', 'env2', 'dataIntegr', 'solic', 'retorno', 'assinado',
  'nascimento', 'dataEntrega', 'quando', 'retencaoAte'] as const;

async function gravar(tx: Tx, p: PlanoImportacao) {
  for (const [chave, valor] of Object.entries(p.parametros)) {
    await tx.parametro.upsert({ where: { chave }, create: { chave, valor }, update: { valor } });
  }
  await tx.etapaRegua.deleteMany({ where: { ordem: { notIn: p.regua.map((e) => e.ordem) } } });
  for (const e of p.regua) await tx.etapaRegua.upsert({ where: { ordem: e.ordem }, create: e, update: e });
  for (const f of p.feriados) {
    const d = isoParaDate(f.data)!;
    await tx.feriado.upsert({ where: { data: d }, create: { data: d, descricao: f.descricao }, update: {} });
  }
  for (const l of p.listas) {
    await tx.itemLista.upsert({ where: { lista_valor: { lista: l.lista, valor: l.valor } }, create: l, update: { ordem: l.ordem, cor: l.cor } });
  }

  const idVaga = new Map<string, string>();
  for (const v of p.vagas) {
    const dados = datasParaBanco(v.dados, DATAS) as never;
    const r = await tx.vaga.upsert({ where: { codigo: v.codigo }, create: { ...(dados as object), codigo: v.codigo } as never, update: dados });
    idVaga.set(v.codigo, r.id);
    await tx.vagaEtapa.deleteMany({ where: { vagaId: r.id } });
    if (v.etapas.length) await tx.vagaEtapa.createMany({ data: v.etapas.map((e) => ({ vagaId: r.id, ordem: e.ordem, nome: e.nome, data: isoParaDate(e.data)! })) });
  }
  const vinc = (c: string | null) => (c ? idVaga.get(c) ?? null : null);

  for (const a of p.admissoes) {
    const r = await tx.admissao.upsert({
      where: { codigo: a.codigo }, create: { codigo: a.codigo, vagaId: vinc(a.vagaCodigo)!, obs: a.obs }, update: { obs: a.obs, vagaId: vinc(a.vagaCodigo)! },
    });
    await tx.admissaoItem.deleteMany({ where: { admissaoId: r.id } });
    if (a.itens.length) await tx.admissaoItem.createMany({ data: a.itens.map((i) => ({ ...i, admissaoId: r.id })) });
  }

  type Del = { upsert(args: unknown): Promise<unknown> };
  const controles: [Del, PlanoImportacao['experiencias']][] = [
    [tx.experiencia as unknown as Del, p.experiencias], [tx.integracao as unknown as Del, p.integracoes],
    [tx.contratoEstagio as unknown as Del, p.contratos], [tx.uniforme as unknown as Del, p.uniformes],
  ];
  for (const [delegate, lista] of controles) {
    for (const r of lista) {
      const dados = { ...datasParaBanco(r.dados, DATAS), vagaId: vinc(r.vagaCodigo) };
      await delegate.upsert({ where: { codigo: r.codigo }, create: { ...dados, codigo: r.codigo }, update: dados });
    }
  }
  for (const n of p.notas) {
    const dados = { texto: n.dados.texto as string, quando: isoParaDate(n.dados.quando as string | null), feito: n.dados.feito as boolean,
      criada: isoParaDate(n.dados.criada as string | null) ?? new Date(), vagaId: vinc(n.vagaCodigo) };
    await tx.nota.upsert({ where: { codigo: n.codigo }, create: { ...dados, codigo: n.codigo }, update: dados });
  }
  for (const c of p.candidatos) {
    const dados = datasParaBanco(c.dados, DATAS) as never;
    const r = await tx.candidato.upsert({ where: { codigoLegado: c.codigoLegado }, create: { ...(dados as object), codigoLegado: c.codigoLegado } as never, update: dados });
    const vagaId = vinc(c.vagaCodigo);
    if (vagaId) {
      const k = { etapa: c.etapa, statusLegado: c.statusLegado, fonte: c.fonte, motivoPerda: c.motivoPerda };
      await tx.candidatura.upsert({ where: { candidatoId_vagaId: { candidatoId: r.id, vagaId } }, create: { ...k, candidatoId: r.id, vagaId }, update: k });
    }
  }
  for (const [prefixo, valor] of Object.entries(p.sequencias)) {
    const atual = await tx.sequencia.findUnique({ where: { prefixo } });
    if (!atual || atual.valor < valor) await tx.sequencia.upsert({ where: { prefixo }, create: { prefixo, valor }, update: { valor } });
  }
}

/** Importa o dados.json / pacote legado. Com `simular`, só converte e devolve o resumo e os avisos. */
export async function importarLegado(ator: Ator, entrada: unknown, opcoes: { senha?: string; simular?: boolean }) {
  const estado = await abrirEntradaLegada(entrada, opcoes.senha);
  const plano = converterLegado(estado, hoje(), env.RETENCAO_CANDIDATO_MESES);
  const resumo = resumoPlano(plano);
  if (!opcoes.simular) {
    await prisma.$transaction(async (tx) => {
      await gravar(tx, plano);
      await auditar(tx, ator, { acao: 'IMPORTAR', entidade: 'Legado', depois: { resumo, avisos: plano.avisos.length } });
    }, { timeout: 300_000, maxWait: 10_000 });
  }
  return { simulacao: !!opcoes.simular, resumo, avisos: plano.avisos };
}
