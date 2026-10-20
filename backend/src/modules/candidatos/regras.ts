/** Regras PURAS de LGPD para candidatos: retenção, elegibilidade de expurgo e anonimização. */
import { createHash } from 'node:crypto';
import type { DataISO } from '../../shared/datas.js';

export function somarMeses(base: DataISO, meses: number): DataISO {
  const [a, m, d] = base.split('-').map(Number) as [number, number, number];
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimoDia));
  return alvo.toISOString().slice(0, 10);
}

/** Retenção padrão: hoje + N meses (configurável em RETENCAO_CANDIDATO_MESES). */
export const retencaoPadrao = (hoje: DataISO, meses: number): DataISO => somarMeses(hoje, meses);

export interface EstadoLgpd {
  anonimizadoEm: Date | null;
  retencaoAte: DataISO | null;
  baseLegal: 'CONSENTIMENTO' | 'EXECUCAO_CONTRATO' | 'LEGITIMO_INTERESSE' | 'OBRIGACAO_LEGAL';
  consentimentoRevogadoEm: Date | null;
  /** Foi contratado (candidatura APROVADO): dados passam a seguir a retenção trabalhista, fora deste expurgo */
  contratado: boolean;
}

export function elegivelParaExpurgo(c: EstadoLgpd, hoje: DataISO): { elegivel: boolean; motivo?: string } {
  if (c.anonimizadoEm) return { elegivel: false };
  if (c.contratado) return { elegivel: false };
  if (c.baseLegal === 'CONSENTIMENTO' && c.consentimentoRevogadoEm) return { elegivel: true, motivo: 'consentimento revogado' };
  if (c.retencaoAte && c.retencaoAte < hoje) return { elegivel: true, motivo: 'prazo de retenção vencido' };
  return { elegivel: false };
}

/** Pseudônimo estável e não reversível (para estatística sem identificar a pessoa). */
export const pseudonimo = (id: string): string => 'ANONIMIZADO-' + createHash('sha256').update(id).digest('hex').slice(0, 10).toUpperCase();

/** Campos a gravar na anonimização: apaga identificadores diretos, mantém o registro para indicadores. */
export function camposAnonimizados(id: string, agora: Date) {
  return {
    nome: pseudonimo(id), email: null, telefone: null, cpf: null, cidade: null,
    curriculoUrl: null, curriculoTexto: null, codigoLegado: null, anonimizadoEm: agora,
  };
}
