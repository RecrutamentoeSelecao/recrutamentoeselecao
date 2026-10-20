import type { z } from 'zod';
import { auditar } from '../../shared/audit/auditoria.js';
import { restricaoGestor } from '../../shared/auth/rbac.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { PREFIXOS } from '../../shared/codigos.js';
import { criarCrud } from '../../shared/crud.js';
import { type DataISO, media } from '../../shared/datas.js';
import { naoEncontrado, proibido, regraNegocio } from '../../shared/errors.js';
import { hoje } from '../../shared/hoje.js';
import { paginar } from '../../shared/http/schemas.js';
import { prisma } from '../../shared/prisma.js';
import { carregarContexto } from '../configuracao/repository.js';
import { type Decisao, calcularExperiencia, calcularPrazosExperiencia, taxaEfetivacao } from './regras.js';
import * as repo from './repository.js';
import type * as s from './schemas.js';

export const DATAS_EXPERIENCIA = ['admissao', 'limite1', 'limite2', 'env1', 'env2'] as const;
export const crud = criarCrud({ entidade: 'Experiencia', prefixo: PREFIXOS.experiencia, datas: DATAS_EXPERIENCIA, delegate: repo.delegate });

type ExpISO = { admissao: DataISO | null; prorrog: Decisao; efetiv: Decisao; empresa: string };

async function comPrazos(dados: Record<string, unknown>) {
  if (!('admissao' in dados)) return dados;
  const { params } = await carregarContexto(prisma);
  return { ...dados, ...calcularPrazosExperiencia((dados.admissao as DataISO | null) ?? null, params.expP1, params.expP2) };
}

async function garantirAcesso(ator: Ator, id: string) {
  const e = await repo.buscarComVaga(prisma, id);
  if (!e) throw naoEncontrado('Experiência', id);
  const g = restricaoGestor(ator);
  if (g && e.vaga?.gestorUsuarioId !== g) throw proibido('Colaborador de outro gestor');
  return e;
}

export async function listar(ator: Ator, f: z.infer<typeof s.filtroExperiencias>) {
  const { params } = await carregarContexto(prisma);
  const dia = hoje();
  const todas = (await repo.listar(prisma, { ...f, gestorUsuarioId: restricaoGestor(ator) })).map((r) => {
    const { vaga, ...resto } = r;
    const a = crud.apresentar(resto as never) as ExpISO & Record<string, unknown>;
    return { ...a, vagaCodigo: vaga?.codigo ?? null, calculado: calcularExperiencia(a, dia, params) };
  });
  const linhas = todas.filter((l) => f.filtro === 'todas' || (f.filtro === 'atrasadas' ? l.calculado.atrasada : l.calculado.pendente));
  const prorrogDecididos = todas.filter((l) => l.prorrog);
  const indicadores = {
    emExperiencia: todas.filter((l) => l.calculado.pendente).length,
    decisoesAtrasadas: todas.filter((l) => l.calculado.atrasada).length,
    vencendoEm7Dias: todas.filter((l) => l.calculado.pendente && !l.calculado.atrasada && (l.calculado.m1.k === 'warn' || l.calculado.m2.k === 'warn')).length,
    taxaProrrogacao: prorrogDecididos.length ? prorrogDecididos.filter((l) => l.prorrog === 'SIM').length / prorrogDecididos.length : null,
    taxaEfetivacao: taxaEfetivacao(todas),
    metaEfetivacao: params.metaEfetivacao,
    tempoMedioDeCasa: media(todas.filter((l) => l.calculado.pendente && l.calculado.diasDeCasa != null).map((l) => l.calculado.diasDeCasa!)),
  };
  return { ...paginar(linhas, f.pagina, f.porPagina), indicadores };
}

export async function obter(ator: Ator, id: string) {
  const { vaga, ...e } = await garantirAcesso(ator, id);
  const { params } = await carregarContexto(prisma);
  const a = crud.apresentar(e as never) as ExpISO & Record<string, unknown>;
  return { ...a, vagaCodigo: vaga?.codigo ?? null, calculado: calcularExperiencia(a, hoje(), params) };
}

export const criar = async (ator: Ator, d: z.infer<typeof s.experienciaCriar>) => crud.criar(ator, await comPrazos(d));
export const atualizar = async (ator: Ator, id: string, d: z.infer<typeof s.experienciaAtualizar>) => crud.atualizar(ator, id, await comPrazos(d));

/** Decisão de prorrogação (marco 45) ou efetivação (marco 90). */
export async function decidir(ator: Ator, id: string, d: z.infer<typeof s.decisao>) {
  const e = await garantirAcesso(ator, id);
  const data = d.data ?? hoje();
  if (d.marco === 'EFETIVACAO' && e.prorrog === 'NAO') throw regraNegocio('Não prorrogado: o contrato encerrou no 1º período, não há efetivação');
  const campos = d.marco === 'PRORROGACAO' ? { prorrog: d.decisao, env1: data } : { efetiv: d.decisao, env2: data };
  return crud.atualizar(ator, id, campos);
}

export async function listarAvaliacoes(ator: Ator, id: string) {
  await garantirAcesso(ator, id);
  return repo.listarAvaliacoes(prisma, id);
}

export async function avaliar(ator: Ator, id: string, d: z.infer<typeof s.avaliacaoCriar>) {
  await garantirAcesso(ator, id);
  return prisma.$transaction(async (tx) => {
    const av = await tx.avaliacaoExperiencia.create({ data: { ...d, experienciaId: id, avaliadorId: ator.id } });
    await auditar(tx, ator, { acao: 'CRIAR', entidade: 'AvaliacaoExperiencia', entidadeId: av.id, depois: av });
    return av;
  });
}
