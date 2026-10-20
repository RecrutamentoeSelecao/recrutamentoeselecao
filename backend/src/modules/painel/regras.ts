/**
 * Regras PURAS do Painel e do Calendário (renderPainel L1048, compromissos L2803, baldeDe L2784).
 * Vaga conta em DIAS ÚTEIS no calendário; experiência em dias corridos; contrato pelo limite CIEE.
 */
import {
  type DataISO, type Feriados, diasUteisEntre, diferencaDias, media, mediana, somarDias,
} from '../../shared/datas.js';
import type { EtapaReguaDef, Parametros } from '../configuracao/regras.js';
import { limiteCiee } from '../contratos/regras.js';
import { type Decisao, calcularExperiencia, taxaEfetivacao } from '../experiencias/regras.js';
import { type CalculoVaga, type VagaParaCalculo, proximaEtapaPendente, statusAberto } from '../vagas/regras.js';

export type Balde = 'atrasado' | 'hoje' | 'amanha' | 'semana' | 'quinze' | 'depois';

/** Domingo da semana corrente (semana seg–dom). */
export function fimDaSemana(hoje: DataISO): DataISO {
  const dow = new Date(`${hoje}T00:00:00Z`).getUTCDay() || 7;
  return somarDias(hoje, 7 - dow);
}

export function baldeDe(data: DataISO, hoje: DataISO): Balde {
  if (data < hoje) return 'atrasado';
  if (data === hoje) return 'hoje';
  if (data === somarDias(hoje, 1)) return 'amanha';
  if (data <= fimDaSemana(hoje)) return 'semana';
  if (data <= somarDias(hoje, 15)) return 'quinze';
  return 'depois';
}

export type TipoCompromisso = 'vaga' | 'experiencia' | 'contrato' | 'integracao' | 'uniforme' | 'nota';

export interface Compromisso {
  tipo: TipoCompromisso;
  data: DataISO;
  titulo: string;
  quem: string;
  referenciaId: string;
  corridos: boolean;
  faltam: number;
  balde: Balde;
}

export interface FotografiaCompromissos {
  vagas: (VagaParaCalculo & { id: string; codigo: string; cargo: string; empresa: string; aprovado: string })[];
  experiencias: { id: string; nome: string; admissao: DataISO | null; prorrog: Decisao; efetiv: Decisao }[];
  contratos: { id: string; nome: string; solic: DataISO | null; retorno: DataISO | null }[];
  integracoes: { id: string; nome: string; admissao: DataISO | null; feito: 'SIM' | 'NAO' | 'NA' }[];
  uniformes: { id: string; nome: string; admissao: DataISO | null; entregue: 'SIM' | 'NAO' | null }[];
  notas: { id: string; texto: string; quando: DataISO | null; feito: boolean }[];
}

export function listarCompromissos(
  f: FotografiaCompromissos,
  ctx: { regua: EtapaReguaDef[]; params: Pick<Parametros, 'expP1' | 'expP2' | 'slaCiee'>; feriados: Feriados },
  hoje: DataISO,
): Compromisso[] {
  const saida: Compromisso[] = [];
  const por = (c: Omit<Compromisso, 'faltam' | 'balde'>) => saida.push({
    ...c,
    faltam: c.corridos ? diferencaDias(hoje, c.data) : diasUteisEntre(hoje, c.data, ctx.feriados),
    balde: baldeDe(c.data, hoje),
  });
  const nE = ctx.regua.length;

  for (const v of f.vagas) {
    const quem = [v.cargo, v.empresa].filter(Boolean).join(' · ') || v.codigo;
    if (v.abertura && statusAberto(v.status)) {
      const p = proximaEtapaPendente(v, ctx.regua, ctx.feriados);
      if (p?.prazo) por({ tipo: 'vaga', data: p.prazo, titulo: p.etapa.nome, quem, referenciaId: v.id, corridos: false });
    }
    // Aprovada sem data de admissão: integração, experiência e uniforme ficam sem prazo.
    const aprov = nE ? v.etapas[nE - 1] : null;
    if (aprov && !v.inicio) {
      por({ tipo: 'vaga', data: aprov, titulo: 'Informar a data de admissão', quem: v.aprovado || quem, referenciaId: v.id, corridos: false });
    }
  }
  for (const e of f.experiencias) {
    if (!e.admissao) continue;
    const c = calcularExperiencia(e, hoje, ctx.params);
    if (!e.prorrog) por({ tipo: 'experiencia', data: c.limite1!, titulo: `Decidir prorrogação — ${ctx.params.expP1} dias`, quem: e.nome, referenciaId: e.id, corridos: true });
    if (!e.efetiv && !c.semSegundo) por({ tipo: 'experiencia', data: c.limite2!, titulo: `Decidir efetivação — ${ctx.params.expP2} dias`, quem: e.nome, referenciaId: e.id, corridos: true });
  }
  for (const k of f.contratos) {
    if (!k.solic || k.retorno) continue;
    por({ tipo: 'contrato', data: limiteCiee(k.solic, ctx.params.slaCiee || 2, ctx.feriados), titulo: 'Retorno do contrato assinado', quem: k.nome, referenciaId: k.id, corridos: false });
  }
  for (const g of f.integracoes) {
    // N/A também sai da fila (consistente com a aba Integração)
    if (g.feito !== 'NAO' || !g.admissao) continue;
    por({ tipo: 'integracao', data: g.admissao, titulo: 'Integração pendente', quem: g.nome, referenciaId: g.id, corridos: false });
  }
  for (const u of f.uniformes) {
    if (u.entregue === 'SIM' || !u.admissao) continue;
    por({ tipo: 'uniforme', data: u.admissao, titulo: 'Entregar uniforme até a admissão', quem: u.nome, referenciaId: u.id, corridos: false });
  }
  for (const n of f.notas) {
    if (n.feito || !n.quando) continue;
    por({ tipo: 'nota', data: n.quando, titulo: n.texto, quem: '', referenciaId: n.id, corridos: false });
  }
  return saida.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

export interface LinhaVagaPainel {
  empresa: string;
  abertura: DataISO | null;
  inicio: DataISO | null;
  calc: CalculoVaga;
}

export function indicadoresVagas(linhas: LinhaVagaPainel[], regua: EtapaReguaDef[], metaSla: number, hoje: DataISO) {
  const abertas = linhas.filter((l) => l.calc.aberta && l.abertura);
  const agings = abertas.map((l) => l.calc.dias!).filter((d) => d != null);
  const ttfs = linhas.map((l) => l.calc.ttf).filter((x): x is number => x != null && x > 0);
  const medidas = linhas.filter((l) => l.calc.statusSla);
  const dentro = medidas.filter((l) => l.calc.statusSla === 'DENTRO').length;

  const slaPorEtapa = regua.map((e, i) => {
    const noPrazo = linhas.filter((l) => l.calc.flags[i] === 'OK').length;
    const atrasadas = linhas.filter((l) => l.calc.flags[i] === 'ATRASADO').length;
    return { etapa: e.nome, slaDias: e.slaDias, noPrazo, atrasadas, pct: noPrazo + atrasadas ? noPrazo / (noPrazo + atrasadas) : null };
  });

  const empresas = [...new Set(linhas.map((l) => l.empresa).filter(Boolean))].sort();
  const porEmpresa = empresas.map((emp) => {
    const daEmp = linhas.filter((l) => l.empresa === emp);
    const t = daEmp.map((l) => l.calc.ttf).filter((x): x is number => x != null && x > 0);
    return { empresa: emp, abertas: daEmp.filter((l) => l.calc.aberta).length, fechadas: daEmp.filter((l) => !l.calc.aberta).length,
      ttfMedio: media(t), ttfMediana: mediana(t) };
  });

  // Admissões dos últimos 12 meses, pela data de admissão das vagas fechadas.
  const meses: string[] = [];
  const [a, m] = hoje.split('-').map(Number) as [number, number];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    meses.push(d.toISOString().slice(0, 7));
  }
  const admissoesPorMes = meses.map((mes) => ({
    mes, quantidade: linhas.filter((l) => !l.calc.aberta && l.inicio?.startsWith(mes)).length,
  }));

  return {
    abertas: abertas.length,
    agingMedio: media(agings), agingMediana: mediana(agings), agingAlvo: Math.max(0, ...regua.map((e) => e.slaDias)),
    criticas: abertas.filter((l) => l.calc.farol === 'critico').length,
    ttfMedio: media(ttfs), ttfMediana: mediana(ttfs),
    pctDentroSla: medidas.length ? dentro / medidas.length : null, metaSla,
    slaPorEtapa, porEmpresa, admissoesPorMes,
  };
}

export function indicadoresExperiencia(
  lista: { admissao: DataISO | null; prorrog: Decisao; efetiv: Decisao }[],
  params: Pick<Parametros, 'expP1' | 'expP2' | 'experienciaAlertaDias' | 'metaEfetivacao'>,
  hoje: DataISO,
) {
  const calc = lista.map((e) => calcularExperiencia(e, hoje, params));
  return {
    atrasadas: calc.filter((c) => c.atrasada).length,
    vencendoEm7Dias: calc.filter((c) => c.pendente && !c.atrasada && (c.m1.k === 'warn' || c.m2.k === 'warn')).length,
    taxaEfetivacao: taxaEfetivacao(lista),
    metaEfetivacao: params.metaEfetivacao,
  };
}
