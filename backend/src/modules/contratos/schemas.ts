import { z } from 'zod';
import { dataISO, dataISOOpcional, paginacao, texto } from '../../shared/http/schemas.js';

const campos = {
  nome: texto(160), empresa: texto(120), faculdade: texto(160),
  solic: dataISO.nullable(), retorno: dataISO.nullable(), assinado: dataISO.nullable(), obs: texto(2000),
};
export const contratoCriar = z.object(campos).partial().extend({ nome: texto(160).min(1) });
export const contratoAtualizar = z.object(campos).partial();
export const filtroContratos = paginacao.extend({
  filtro: z.enum(['abertos', 'todos']).default('abertos'),
  empresa: z.string().optional(), busca: z.string().max(100).optional(),
  de: dataISOOpcional, ate: dataISOOpcional,
});
export const dataAcao = z.object({ data: dataISOOpcional });
