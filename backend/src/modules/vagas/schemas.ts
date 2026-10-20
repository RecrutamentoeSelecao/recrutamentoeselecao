import { z } from 'zod';
import { dataISO, dataISOOpcional, paginacao, texto } from '../../shared/http/schemas.js';

const campos = {
  empresa: texto(120),
  cargo: texto(120),
  depto: texto(120),
  tipo: texto(60),
  substituido: texto(160),
  gestor: texto(120),
  gestorUsuarioId: z.string().uuid().nullable(),
  salario: z.number().nonnegative().nullable(),
  abertura: dataISO.nullable(),
  status: texto(60).min(1),
  prioridade: texto(30),
  aprovado: texto(160),
  inicio: dataISO.nullable(),
  talent: texto(160),
  medirSla: z.boolean(),
  obs: texto(2000),
};

export const vagaCriar = z.object(campos).partial().extend({ empresa: texto(120).min(1), cargo: texto(120).min(1) });
export const vagaAtualizar = z.object(campos).partial().extend({
  /** Controle otimista: envie a versão lida; se outra pessoa salvou antes, recebe 409 */
  versao: z.number().int().optional(),
});

export const filtroVagas = paginacao.extend({
  filtro: z.enum(['abertas', 'criticas', 'foraSla', 'todas']).default('abertas'),
  empresa: z.string().optional(),
  busca: z.string().max(100).optional(),
});

export const paramEtapa = z.object({ id: z.string().uuid(), ordem: z.coerce.number().int().min(1) });
export const etapaDefinir = z.object({ data: dataISO.nullable() });
export const avancar = z.object({ data: dataISOOpcional });
export const aprovar = z.object({
  aprovado: texto(160).min(1),
  data: dataISOOpcional,
  inicio: dataISOOpcional,
});
export const statusDefinir = z.object({ status: texto(60).min(1) });
