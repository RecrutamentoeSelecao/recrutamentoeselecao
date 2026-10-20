import { z } from 'zod';
import { dataISO, dataISOOpcional, paginacao, texto } from '../../shared/http/schemas.js';

const campos = {
  admissao: dataISO.nullable(), nome: texto(160), empresa: texto(120), setor: texto(120), gestor: texto(120),
  feito: z.enum(['SIM', 'NAO', 'NA']), dataIntegr: dataISO.nullable(), obs: texto(2000),
};
export const integracaoCriar = z.object(campos).partial().extend({ nome: texto(160).min(1) });
export const integracaoAtualizar = z.object(campos).partial();
export const filtroIntegracoes = paginacao.extend({
  filtro: z.enum(['pendentes', 'todas']).default('pendentes'),
  empresa: z.string().optional(), busca: z.string().max(100).optional(),
  de: dataISOOpcional, ate: dataISOOpcional,
});
export const realizar = z.object({ data: dataISOOpcional });
