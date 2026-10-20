import { z } from 'zod';
import { dataISO, paginacao, texto } from '../../shared/http/schemas.js';

const campos = {
  nome: texto(160).min(1),
  email: z.string().trim().toLowerCase().email().nullable(),
  telefone: texto(30).nullable(),
  cpf: z.string().trim().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido').nullable(),
  cidade: texto(120).nullable(),
  fonte: texto(80).nullable(),
  curriculoUrl: z.string().url().max(500).nullable(),
  curriculoTexto: z.string().max(50_000).nullable(),
  baseLegal: z.enum(['CONSENTIMENTO', 'EXECUCAO_CONTRATO', 'LEGITIMO_INTERESSE', 'OBRIGACAO_LEGAL']),
  retencaoAte: dataISO.nullable(),
};
export const candidatoCriar = z.object(campos).partial().extend({
  nome: campos.nome,
  /** Obrigatório quando baseLegal = CONSENTIMENTO (padrão): registra data/hora e versão do termo */
  consentimento: z.object({ aceito: z.literal(true), versao: z.string().min(1).max(40) }).optional(),
});
export const candidatoAtualizar = z.object(campos).partial();
export const filtroCandidatos = paginacao.extend({
  busca: z.string().max(100).optional(),
  incluirAnonimizados: z.coerce.boolean().default(false),
});
export const consentimento = z.object({ versao: z.string().min(1).max(40) });
