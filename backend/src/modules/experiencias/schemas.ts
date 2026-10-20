import { z } from 'zod';
import { dataISO, dataISOOpcional, paginacao, texto } from '../../shared/http/schemas.js';

const simNao = z.enum(['SIM', 'NAO']).nullable();
const campos = {
  nome: texto(160), empresa: texto(120), cargo: texto(120), depto: texto(120), gestor: texto(120),
  admissao: dataISO.nullable(), env1: dataISO.nullable(), prorrog: simNao, env2: dataISO.nullable(), efetiv: simNao, obs: texto(2000),
};
export const experienciaCriar = z.object(campos).partial().extend({ nome: texto(160).min(1), admissao: dataISO });
export const experienciaAtualizar = z.object(campos).partial();
export const filtroExperiencias = paginacao.extend({
  filtro: z.enum(['atrasadas', 'emCurso', 'todas']).default('emCurso'),
  empresa: z.string().optional(), busca: z.string().max(100).optional(),
  de: dataISOOpcional, ate: dataISOOpcional,
});
export const decisao = z.object({
  marco: z.enum(['PRORROGACAO', 'EFETIVACAO']),
  decisao: z.enum(['SIM', 'NAO']),
  data: dataISOOpcional,
});
export const avaliacaoCriar = z.object({
  marco: z.enum(['PRIMEIRO_PERIODO', 'SEGUNDO_PERIODO']),
  nota: z.number().int().min(1).max(5).optional(),
  recomendacao: z.enum(['PRORROGAR', 'EFETIVAR', 'DESLIGAR']),
  comentario: texto(4000).default(''),
  /** Ponto de extensão: critérios livres (ex.: {"pontualidade": 4, "tecnica": 5}) */
  criterios: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});
