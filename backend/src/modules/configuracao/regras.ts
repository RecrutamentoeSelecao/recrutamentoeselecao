/** Parâmetros do negócio e seus padrões (semente do legado, index.html L824). Puro. */

export interface EtapaReguaDef {
  ordem: number;
  nome: string;
  /** Prazo acumulado desde a abertura, em dias corridos */
  slaDias: number;
}

export interface Parametros {
  agingVerde: number;
  agingAmarelo: number;
  expP1: number;
  expP2: number;
  slaCiee: number;
  metaSla: number;
  metaEfetivacao: number;
  metaCandVaga: number;
  metaComparecimento: number;
  empresaIntegracao: string;
  empresasUniforme: string[];
  /** Integração pendente há mais de N dias vira crítica */
  integracaoCriticaDias: number;
  /** Alerta de experiência quando faltam até N dias */
  experienciaAlertaDias: number;
  /** Alerta de admissão quando faltam até N dias para o início */
  admissaoAlertaDias: number;
}

export const PARAMETROS_PADRAO: Parametros = {
  agingVerde: 0.7,
  agingAmarelo: 1.0,
  expP1: 45,
  expP2: 90,
  slaCiee: 2,
  metaSla: 0.9,
  metaEfetivacao: 0.7,
  metaCandVaga: 8,
  metaComparecimento: 0.7,
  empresaIntegracao: 'FAGRON SERVICES',
  empresasUniforme: ['FAGRON SERVICES', 'FAGRON DISTRIBUTION'],
  integracaoCriticaDias: 30,
  experienciaAlertaDias: 7,
  admissaoAlertaDias: 5,
};

export const REGUA_PADRAO: EtapaReguaDef[] = [
  { ordem: 1, nome: 'Alinhamento', slaDias: 1 },
  { ordem: 2, nome: 'Divulgação', slaDias: 2 },
  { ordem: 3, nome: 'Triagem CV RH', slaDias: 5 },
  { ordem: 4, nome: 'Triagem CV Gestor', slaDias: 7 },
  { ordem: 5, nome: 'Entrevista RH', slaDias: 9 },
  { ordem: 6, nome: 'Parecer', slaDias: 10 },
  { ordem: 7, nome: 'Entrevista Gestor', slaDias: 15 },
  { ordem: 8, nome: 'Aprovação', slaDias: 18 },
];

/** Listas da Base reconhecidas (LISTAS_META, index.html L2680) */
export const LISTAS_BASE = [
  'empresas', 'cargos', 'gestores', 'departamentos', 'statusVaga', 'tipoVaga', 'prioridade',
  'statusCand', 'fontes', 'motivos', 'instituicoes', 'terceiros', 'tamanhos', 'checklist',
] as const;
export type NomeLista = (typeof LISTAS_BASE)[number];

export const STATUS_VAGA_PADRAO: { valor: string; cor: string }[] = [
  { valor: 'ABORDAGENS', cor: 't1' }, { valor: 'TRIAR', cor: 't1' },
  { valor: 'PRIMEIRA ETAPA', cor: 't2' }, { valor: 'SEGUNDA ETAPA', cor: 't2' },
  { valor: 'FAZER PARECER', cor: 't3' }, { valor: 'PARECER ENVIADO', cor: 't3' },
  { valor: 'FECHADA', cor: 's-good' },
  { valor: 'AGUARDAR', cor: 's-warn' }, { valor: 'PRECISA ALINHAR', cor: 's-warn' },
  { valor: 'CONGELADA', cor: 's-off' }, { valor: 'CANCELADA', cor: 's-off' },
];

/** Mescla valores salvos sobre os padrões, descartando chaves desconhecidas e tipos errados. */
export function mesclarParametros(salvos: Record<string, unknown>): Parametros {
  const p: Parametros = { ...PARAMETROS_PADRAO, empresasUniforme: [...PARAMETROS_PADRAO.empresasUniforme] };
  for (const k of Object.keys(PARAMETROS_PADRAO) as (keyof Parametros)[]) {
    const v = salvos[k];
    if (v === undefined || v === null) continue;
    const padrao = PARAMETROS_PADRAO[k];
    if (Array.isArray(padrao) ? Array.isArray(v) : typeof v === typeof padrao) {
      (p as unknown as Record<string, unknown>)[k] = v;
    }
  }
  return p;
}

export const slaTotal = (regua: EtapaReguaDef[]): number => Math.max(0, ...regua.map((e) => e.slaDias));
