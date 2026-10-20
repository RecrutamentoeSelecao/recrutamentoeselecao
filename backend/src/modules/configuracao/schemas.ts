import { z } from 'zod';
import { dataISO, texto } from '../../shared/http/schemas.js';
import { LISTAS_BASE } from './regras.js';

export const parametrosAtualizar = z.object({
  agingVerde: z.number().min(0).max(5),
  agingAmarelo: z.number().min(0).max(5),
  expP1: z.number().int().min(1).max(365),
  expP2: z.number().int().min(1).max(365),
  slaCiee: z.number().int().min(0).max(60),
  metaSla: z.number().min(0).max(1),
  metaEfetivacao: z.number().min(0).max(1),
  metaCandVaga: z.number().min(0),
  metaComparecimento: z.number().min(0).max(1),
  empresaIntegracao: texto(120),
  empresasUniforme: z.array(texto(120)),
  integracaoCriticaDias: z.number().int().min(1),
  experienciaAlertaDias: z.number().int().min(0),
  admissaoAlertaDias: z.number().int().min(0),
}).partial().refine((p) => p.agingVerde == null || p.agingAmarelo == null || p.agingVerde <= p.agingAmarelo,
  { message: 'agingVerde deve ser ≤ agingAmarelo' });

export const reguaAtualizar = z.object({
  etapas: z.array(z.object({ ordem: z.number().int().min(1), nome: texto(80).min(1), slaDias: z.number().int().min(0) }))
    .min(1).max(20),
});

export const feriadoCriar = z.object({ data: dataISO, descricao: texto(120).default('') });
export const paramData = z.object({ data: dataISO });

export const nomeLista = z.enum(LISTAS_BASE);
export const paramLista = z.object({ lista: nomeLista });
export const itemListaCriar = z.object({ valor: texto(160).min(1), cor: z.string().max(20).nullish(), ordem: z.number().int().optional() });
export const itemListaAtualizar = z.object({ valor: texto(160).min(1).optional(), cor: z.string().max(20).nullish(), ordem: z.number().int().optional() });
export const paramItemLista = z.object({ lista: nomeLista, id: z.string().uuid() });
