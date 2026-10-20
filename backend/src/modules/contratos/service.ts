import type { z } from 'zod';
import type { Ator } from '../../shared/auth/tipos.js';
import { PREFIXOS } from '../../shared/codigos.js';
import { criarCrud } from '../../shared/crud.js';
import { type DataISO, media } from '../../shared/datas.js';
import { hoje } from '../../shared/hoje.js';
import { paginar } from '../../shared/http/schemas.js';
import { prisma } from '../../shared/prisma.js';
import { carregarContexto } from '../configuracao/repository.js';
import { calcularContrato } from './regras.js';
import * as repo from './repository.js';
import type * as s from './schemas.js';

export const DATAS_CONTRATO = ['solic', 'retorno', 'assinado'] as const;
export const crud = criarCrud({ entidade: 'ContratoEstagio', prefixo: PREFIXOS.contrato, datas: DATAS_CONTRATO, delegate: repo.delegate });

type ContratoISO = { nome: string; faculdade: string; solic: DataISO | null; retorno: DataISO | null; assinado: DataISO | null };

export async function listar(f: z.infer<typeof s.filtroContratos>) {
  const { params, feriados } = await carregarContexto(prisma);
  const dia = hoje();
  const todas = (await repo.listar(prisma, f)).map((r) => {
    const a = crud.apresentar(r as never) as ContratoISO & Record<string, unknown>;
    return { ...a, calculado: calcularContrato(a, dia, params.slaCiee, feriados) };
  });
  const linhas = todas.filter((l) => f.filtro === 'todos' || !l.assinado);
  const retornos = todas.map((l) => l.calculado.diasRetorno).filter((x): x is number => x != null);
  const indicadores = {
    emAberto: todas.filter((l) => !l.assinado).length,
    foraDoPrazo: todas.filter((l) => l.calculado.prazo.k === 'crit').length,
    retornoMedioDiasUteis: media(retornos),
    piorRetornoDiasUteis: retornos.length ? Math.max(...retornos) : null,
    cumprimento: retornos.length ? retornos.filter((d) => d <= params.slaCiee).length / retornos.length : null,
  };
  return { ...paginar(linhas, f.pagina, f.porPagina), indicadores };
}

export const registrarRetorno = (ator: Ator, id: string, data?: DataISO | null) => crud.atualizar(ator, id, { retorno: data ?? hoje() });
export const registrarAssinatura = (ator: Ator, id: string, data?: DataISO | null) => crud.atualizar(ator, id, { assinado: data ?? hoje() });
