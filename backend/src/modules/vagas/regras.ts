/**
 * Regras PURAS da vaga: SLA por etapa, farol de aging, TTF/TTH, aprovação.
 * Fonte: calcVaga (index.html L955), ABERTO (L953), VAGA_FECHADA/vagaAprovada (L2491–2499),
 * compromissos de vaga (L2814). Nenhuma dependência de banco.
 */
import {
  type DataISO, type Feriados, diferencaDias, somarDias, somarDiasUteis,
} from '../../shared/datas.js';
import { type EtapaReguaDef, type Parametros, slaTotal } from '../configuracao/regras.js';

export interface VagaParaCalculo {
  status: string;
  abertura: DataISO | null;
  /** Datas das etapas alinhadas à régua (índice 0 = 1ª etapa). null = não cumprida. */
  etapas: (DataISO | null)[];
  inicio: DataISO | null;
  medirSla: boolean;
}

export type FlagEtapa = '' | 'OK' | 'ATRASADO' | 'PENDENTE';
export type Farol = '' | 'saudavel' | 'atencao' | 'critico' | 'concluida';

export interface CalculoVaga {
  slaTotal: number;
  aprovacao: DataISO | null;
  encerrada: boolean;
  aberta: boolean;
  admissao: DataISO | null;
  dias: number | null;
  ttf: number | null;
  tth: number | null;
  etapaIdx: number;
  etapaNome: string;
  diasEtapa: number | null;
  flags: FlagEtapa[];
  etapasAtrasadas: number;
  statusSla: '' | 'DENTRO' | 'FORA';
  farol: Farol;
}

const ENCERRADOS = new Set(['FECHADA', 'CANCELADA', 'CONGELADA']);

/** Vaga "andando": qualquer status fora de FECHADA, CANCELADA e CONGELADA. */
export const statusAberto = (status: string | null | undefined): boolean =>
  !!status && !ENCERRADOS.has(status);

/** Status que representa contratação (regex do legado ou cor verde na Base). */
export function statusFechado(status: string | null | undefined, corDoStatus?: string | null): boolean {
  if (!status) return false;
  return /FECHAD|CONCLU|ADMITID|CONTRATAD/i.test(status) || corDoStatus === 's-good';
}

/** Aprovada = data da ÚLTIMA etapa da régua (Aprovação) preenchida, ou status fechado. */
export function vagaAprovada(
  v: Pick<VagaParaCalculo, 'etapas' | 'status'>,
  nEtapas: number,
  corDoStatus?: string | null,
): boolean {
  return (nEtapas > 0 && !!v.etapas[nEtapas - 1]) || statusFechado(v.status, corDoStatus);
}

/** Farol de aging: ≤ verde×SLA saudável; ≤ amarelo×SLA atenção; acima crítico; encerrada = concluída. */
export function farolAging(
  dias: number | null,
  slaTot: number,
  encerrada: boolean,
  p: Pick<Parametros, 'agingVerde' | 'agingAmarelo'>,
): Farol {
  if (dias == null) return '';
  if (encerrada) return 'concluida';
  if (dias <= slaTot * p.agingVerde) return 'saudavel';
  if (dias <= slaTot * p.agingAmarelo) return 'atencao';
  return 'critico';
}

/** SLA de cada etapa: prazo = abertura + sla (dias corridos, como no Painel do legado). */
export function flagsSla(v: VagaParaCalculo, regua: EtapaReguaDef[], hoje: DataISO): FlagEtapa[] {
  return regua.map((e, i) => {
    if (!v.abertura || !v.medirSla) return '';
    const limite = somarDias(v.abertura, e.slaDias);
    const feita = v.etapas[i];
    if (!feita) return hoje > limite ? 'ATRASADO' : 'PENDENTE';
    return feita <= limite ? 'OK' : 'ATRASADO';
  });
}

export function calcularVaga(
  v: VagaParaCalculo,
  regua: EtapaReguaDef[],
  p: Pick<Parametros, 'agingVerde' | 'agingAmarelo'>,
  hoje: DataISO,
): CalculoVaga {
  const nEt = regua.length;
  const slaTot = slaTotal(regua);
  const aprovacao = nEt ? (v.etapas[nEt - 1] ?? null) : null;
  const admissao = v.inicio ?? null;
  // Aprovada é vaga encerrada: o aging para aqui, mesmo sem mexer no status.
  const encerrada = !!aprovacao || !statusAberto(v.status);
  // Só sai de "Em aberto" com aprovação E data de admissão (regra 4 do inventário).
  // Obs.: no legado c.admissao era lido antes de ser atribuído; aqui segue a intenção documentada.
  const aberta = statusAberto(v.status) && !(aprovacao && admissao);
  const dias = v.abertura ? diferencaDias(v.abertura, aprovacao ?? hoje) : null;
  const ttf = v.abertura && admissao ? diferencaDias(v.abertura, admissao) : null;
  const divulgacao = v.etapas[1] ?? null;
  const tth = divulgacao && aprovacao ? diferencaDias(divulgacao, aprovacao) : null;

  let etapaIdx = -1;
  for (let i = 0; i < nEt; i++) if (v.etapas[i]) etapaIdx = i;
  const etapaNome = etapaIdx < 0 ? 'Requisição aberta' : regua[etapaIdx]!.nome;

  let diasEtapa: number | null = null;
  if (aprovacao) diasEtapa = 0;
  else if (v.abertura) {
    const marcos = [v.abertura, ...v.etapas.filter((d): d is DataISO => !!d)].sort();
    diasEtapa = diferencaDias(marcos[marcos.length - 1]!, hoje);
  }

  const flags = flagsSla(v, regua, hoje);
  const etapasAtrasadas = flags.filter((f) => f === 'ATRASADO').length;
  const statusSla: CalculoVaga['statusSla'] =
    !v.abertura || !v.medirSla ? '' : etapasAtrasadas === 0 ? 'DENTRO' : 'FORA';

  return {
    slaTotal: slaTot, aprovacao, encerrada, aberta, admissao, dias, ttf, tth,
    etapaIdx, etapaNome, diasEtapa, flags, etapasAtrasadas, statusSla,
    farol: farolAging(dias, slaTot, encerrada, p),
  };
}

/** Próxima etapa pendente e seu prazo no Calendário (em DIAS ÚTEIS, regra 6). */
export function proximaEtapaPendente(
  v: VagaParaCalculo,
  regua: EtapaReguaDef[],
  feriados: Feriados,
): { indice: number; etapa: EtapaReguaDef; prazo: DataISO | null } | null {
  if (!statusAberto(v.status)) return null;
  const k = regua.findIndex((_, i) => !v.etapas[i]);
  if (k < 0) return null;
  const etapa = regua[k]!;
  return { indice: k, etapa, prazo: v.abertura ? somarDiasUteis(v.abertura, etapa.slaDias, feriados) : null };
}

/** Uniforme: "Reposição" se o tipo é Substituição, senão "Nova posição" (vazio sem tipo). */
export function tipoVagaUniforme(tipo: string | null | undefined): string {
  if (!tipo) return '';
  return /^SUBSTITUI[ÇC][ÃA]O$/i.test(tipo.trim()) ? 'REPOSIÇÃO' : 'NOVA POSIÇÃO';
}
