import type { z } from 'zod';
import type { Ator } from '../../shared/auth/tipos.js';
import { PREFIXOS } from '../../shared/codigos.js';
import { criarCrud } from '../../shared/crud.js';
import type { DataISO } from '../../shared/datas.js';
import { hoje } from '../../shared/hoje.js';
import { paginar } from '../../shared/http/schemas.js';
import { prisma } from '../../shared/prisma.js';
import * as repo from './repository.js';
import type * as s from './schemas.js';

export const DATAS_UNIFORME = ['nascimento', 'admissao', 'dataEntrega'] as const;
export const crud = criarCrud({ entidade: 'Uniforme', prefixo: PREFIXOS.uniforme, datas: DATAS_UNIFORME, delegate: repo.delegate });

export async function listar(f: z.infer<typeof s.filtroUniformes>) {
  const linhas = (await repo.listar(prisma, f)).map((r) => {
    const a = crud.apresentar(r as never);
    return { ...a, semTamanho: !a.camisa || !a.calca || !a.sapato };
  });
  return paginar(linhas, f.pagina, f.porPagina);
}

/** Folha em texto puro para imprimir ou mandar ao fornecedor ("Ver para imprimir" do legado). */
export async function folhaImpressao(f: z.infer<typeof s.filtroUniformes>) {
  const linhas = (await repo.listar(prisma, f)).map((r) => crud.apresentar(r as never));
  return linhas.map((u) => [u.nome, u.empresa, u.cargo, u.setor, `Admissão ${u.admissao ?? '—'}`,
    `Camisa ${u.camisa || '—'}`, `Calça ${u.calca || '—'}`, `Sapato ${u.sapato || '—'}`].join(' | ')).join('\n');
}

export const entregar = (ator: Ator, id: string, data?: DataISO | null) =>
  crud.atualizar(ator, id, { entregue: 'SIM', dataEntrega: data ?? hoje() });
