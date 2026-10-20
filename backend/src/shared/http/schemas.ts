import { z } from 'zod';
import { ehDataISO } from '../datas.js';

export const dataISO = z.string().refine(ehDataISO, { message: 'Data inválida (use AAAA-MM-DD)' })
  .meta({ example: '2026-10-20' });
export const dataISOOpcional = dataISO.nullable().optional();
export const texto = (max = 200) => z.string().trim().max(max);

export const paramId = z.object({ id: z.string().uuid() });

export const paginacao = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(500).default(50),
});

export const respostaErro = z.object({
  erro: z.string(),
  mensagem: z.string(),
  detalhes: z.unknown().optional(),
});

export function paginar<T>(itens: T[], pagina: number, porPagina: number) {
  const inicio = (pagina - 1) * porPagina;
  return { total: itens.length, pagina, porPagina, itens: itens.slice(inicio, inicio + porPagina) };
}
