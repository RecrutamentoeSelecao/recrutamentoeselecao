/** Regras PURAS do funil de candidatura. */
export type EtapaCandidatura =
  | 'TRIAGEM' | 'BANCO_TALENTOS' | 'ENTREVISTA_RH' | 'PARECER' | 'ENTREVISTA_GESTOR' | 'APROVADO' | 'REPROVADO' | 'DESISTIU';

export const ETAPAS_FINAIS: ReadonlySet<EtapaCandidatura> = new Set(['APROVADO', 'REPROVADO', 'DESISTIU']);

/** Reprovação e desistência exigem motivo (lista "motivos" da Base) para medir perdas. */
export function validarMovimento(de: EtapaCandidatura, para: EtapaCandidatura, motivo?: string): string | null {
  if (de === para) return 'A candidatura já está nesta etapa';
  if ((para === 'REPROVADO' || para === 'DESISTIU') && !motivo) return 'Informe o motivo da perda';
  return null;
}

/** Conversão do funil: quantos chegaram a cada etapa (para o painel por vaga). */
export function contarPorEtapa(lista: { etapa: EtapaCandidatura }[]): Record<EtapaCandidatura, number> {
  const base: Record<EtapaCandidatura, number> = {
    TRIAGEM: 0, BANCO_TALENTOS: 0, ENTREVISTA_RH: 0, PARECER: 0, ENTREVISTA_GESTOR: 0, APROVADO: 0, REPROVADO: 0, DESISTIU: 0,
  };
  for (const c of lista) base[c.etapa]++;
  return base;
}

/** Mapeia o status de candidato do legado (lista statusCand) para a etapa do funil. */
export function etapaDoStatusLegado(status: string | null | undefined): EtapaCandidatura {
  const s = String(status ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (/BANCO/.test(s)) return 'BANCO_TALENTOS';
  if (/ENTREVISTA RH/.test(s)) return 'ENTREVISTA_RH';
  if (/PARECER/.test(s)) return 'PARECER';
  if (/ENTREVISTA GESTOR/.test(s)) return 'ENTREVISTA_GESTOR';
  if (/APROVAD/.test(s)) return 'APROVADO';
  if (/REPROVAD/.test(s)) return 'REPROVADO';
  if (/DESISTIU|NAO POSSUI INTERESSE|JA ESTA TRABALHANDO|SEM RETORNO|NAO COMPARECEU/.test(s)) return 'DESISTIU';
  return 'TRIAGEM';
}
