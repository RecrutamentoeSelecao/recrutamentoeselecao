/**
 * Regras PURAS do contrato de experiência (calcExp, index.html L1001).
 * A data de admissão é o 1º dia: limite1 = admissão + P1 − 1; limite2 = admissão + P2 − 1 (corridos, CLT).
 */
import { type DataISO, diferencaDias, somarDias } from '../../shared/datas.js';

export type Decisao = 'SIM' | 'NAO' | null;

export interface PrazosExperiencia {
  limite1: DataISO | null;
  limite2: DataISO | null;
}

export function calcularPrazosExperiencia(admissao: DataISO | null, p1 = 45, p2 = 90): PrazosExperiencia {
  if (!admissao) return { limite1: null, limite2: null };
  return { limite1: somarDias(admissao, p1 - 1), limite2: somarDias(admissao, p2 - 1) };
}

export type ClasseMarco = '' | 'good' | 'crit' | 'warn' | 'ok' | 'neut';
export interface Marco {
  k: ClasseMarco;
  t: string;
  dias: number | null;
}

export interface CalculoExperiencia extends PrazosExperiencia {
  diasDeCasa: number | null;
  m1: Marco;
  m2: Marco;
  semSegundo: boolean;
  pendente: boolean;
  atrasada: boolean;
  acao: string;
}

function marco(admissao: DataISO | null, limite: DataISO | null, decidido: boolean, rotulo: string,
  hoje: DataISO, alerta: number): Marco {
  if (!admissao || !limite) return { k: '', t: '', dias: null };
  if (decidido) return { k: 'good', t: rotulo, dias: null };
  const rest = diferencaDias(hoje, limite);
  if (rest < 0) return { k: 'crit', t: `venceu há ${-rest}d`, dias: rest };
  if (rest <= alerta) return { k: 'warn', t: `vence em ${rest}d`, dias: rest };
  return { k: 'ok', t: `faltam ${rest}d`, dias: rest };
}

export function calcularExperiencia(
  e: { admissao: DataISO | null; prorrog: Decisao; efetiv: Decisao },
  hoje: DataISO,
  p: { expP1: number; expP2: number; experienciaAlertaDias?: number },
): CalculoExperiencia {
  const alerta = p.experienciaAlertaDias ?? 7;
  const prazos = calcularPrazosExperiencia(e.admissao, p.expP1, p.expP2);
  const diasDeCasa = e.admissao ? diferencaDias(e.admissao, hoje) + 1 : null;
  const m1 = marco(e.admissao, prazos.limite1, !!e.prorrog,
    e.prorrog === 'SIM' ? 'prorrogado' : 'não prorrogado', hoje, alerta);
  // Não prorrogado: o contrato encerra aos P1 dias, não há marco de P2.
  const semSegundo = e.prorrog === 'NAO';
  const m2: Marco = semSegundo
    ? { k: 'neut', t: `encerra aos ${p.expP1} dias`, dias: null }
    : marco(e.admissao, prazos.limite2, !!e.efetiv, e.efetiv === 'SIM' ? 'efetivado' : 'não efetivado', hoje, alerta);
  const pendente = !e.efetiv && !semSegundo;
  const atrasada = (!e.prorrog && m1.k === 'crit') || (pendente && m2.k === 'crit');
  const acao = !e.admissao ? 'Informar admissão'
    : semSegundo ? '— não prorrogado'
    : e.efetiv ? '— encerrado'
    : !e.prorrog ? 'Decidir prorrogação' : 'Decidir efetivação';
  return { ...prazos, diasDeCasa, m1, m2, semSegundo, pendente, atrasada, acao };
}

/** Taxa de efetivação = SIM ÷ decididos (meta padrão 70%). */
export function taxaEfetivacao(lista: { efetiv: Decisao }[]): number | null {
  const decididos = lista.filter((x) => x.efetiv);
  return decididos.length ? decididos.filter((x) => x.efetiv === 'SIM').length / decididos.length : null;
}
