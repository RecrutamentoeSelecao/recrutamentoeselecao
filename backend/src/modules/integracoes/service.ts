import type { z } from 'zod';
import type { Ator } from '../../shared/auth/tipos.js';
import { PREFIXOS } from '../../shared/codigos.js';
import { criarCrud } from '../../shared/crud.js';
import type { DataISO } from '../../shared/datas.js';
import { hoje } from '../../shared/hoje.js';
import { paginar } from '../../shared/http/schemas.js';
import { prisma } from '../../shared/prisma.js';
import { carregarContexto } from '../configuracao/repository.js';
import { calcularIntegracao } from './regras.js';
import * as repo from './repository.js';
import type * as s from './schemas.js';

export const DATAS_INTEGRACAO = ['admissao', 'dataIntegr'] as const;
export const crud = criarCrud({ entidade: 'Integracao', prefixo: PREFIXOS.integracao, datas: DATAS_INTEGRACAO, delegate: repo.delegate });

export async function listar(f: z.infer<typeof s.filtroIntegracoes>) {
  const { params } = await carregarContexto(prisma);
  const dia = hoje();
  const linhas = (await repo.listar(prisma, f)).map((r) => {
    const a = crud.apresentar(r as never);
    return { ...a, calculado: calcularIntegracao(a as { feito: 'SIM' | 'NAO' | 'NA'; admissao: DataISO | null; dataIntegr: DataISO | null }, dia, params.integracaoCriticaDias) };
  }).filter((l) => f.filtro === 'todas' || l.calculado.pendente);
  return paginar(linhas, f.pagina, f.porPagina);
}

export const realizar = (ator: Ator, id: string, data?: DataISO | null) =>
  crud.atualizar(ator, id, { feito: 'SIM', dataIntegr: data ?? hoje() });
