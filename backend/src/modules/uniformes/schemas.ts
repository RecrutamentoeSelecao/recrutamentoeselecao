import { z } from 'zod';
import { dataISO, dataISOOpcional, paginacao, texto } from '../../shared/http/schemas.js';

const campos = {
  empresa: texto(120), nome: texto(160), tipoVaga: texto(40), nascimento: dataISO.nullable(),
  telefone: texto(30), cpf: texto(20), admissao: dataISO.nullable(), cargo: texto(120), setor: texto(120),
  terceiro: texto(80), sapato: texto(10), camisa: texto(10), calca: texto(10),
  entregue: z.enum(['SIM', 'NAO']).nullable(), dataEntrega: dataISO.nullable(), obs: texto(2000),
};
export const uniformeCriar = z.object(campos).partial().extend({ nome: texto(160).min(1) });
export const uniformeAtualizar = z.object(campos).partial();
export const filtroUniformes = paginacao.extend({
  filtro: z.enum(['pendentes', 'todos']).default('pendentes'),
  empresa: z.string().optional(), busca: z.string().max(100).optional(),
  de: dataISOOpcional, ate: dataISOOpcional,
});
export const entregar = z.object({ data: dataISOOpcional });
