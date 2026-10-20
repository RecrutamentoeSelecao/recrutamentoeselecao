import { z } from 'zod';
import { paginacao, texto } from '../../shared/http/schemas.js';

export const etapa = z.enum(['TRIAGEM', 'BANCO_TALENTOS', 'ENTREVISTA_RH', 'PARECER', 'ENTREVISTA_GESTOR', 'APROVADO', 'REPROVADO', 'DESISTIU']);
export const candidaturaCriar = z.object({
  candidatoId: z.string().uuid(), vagaId: z.string().uuid(),
  etapa: etapa.optional(), fonte: texto(80).optional(),
});
export const candidaturaAtualizar = z.object({
  fonte: texto(80).nullable(), motivoPerda: texto(160).nullable(), statusLegado: texto(80).nullable(),
  /** Scorecard estruturado de entrevista (ponto de extensão) */
  scorecard: z.record(z.string(), z.unknown()).nullable(),
}).partial();
export const mover = z.object({ etapa, motivo: texto(160).optional() });
export const filtroCandidaturas = paginacao.extend({
  vagaId: z.string().uuid().optional(), candidatoId: z.string().uuid().optional(), etapa: etapa.optional(),
});
