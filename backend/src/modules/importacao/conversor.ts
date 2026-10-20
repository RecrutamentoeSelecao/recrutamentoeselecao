/**
 * Conversão PURA do estado legado S (normalizar, index.html L5211) para registros do novo modelo.
 * Não toca no banco: devolve um plano + avisos. O serviço grava com upsert por código (idempotente).
 */
import { type DataISO, ehDataISO, normalizarData } from '../../shared/datas.js';
import { fmtCPF, padronizarObjeto } from '../../shared/texto.js';
import { etapaDoStatusLegado, type EtapaCandidatura } from '../candidaturas/regras.js';
import {
  type EtapaReguaDef, LISTAS_BASE, type Parametros, REGUA_PADRAO, STATUS_VAGA_PADRAO, mesclarParametros,
} from '../configuracao/regras.js';
import { retencaoPadrao } from '../candidatos/regras.js';
import { calcularPrazosExperiencia } from '../experiencias/regras.js';

type Obj = Record<string, unknown>;
type SimNao = 'SIM' | 'NAO' | null;

export interface PlanoImportacao {
  parametros: Parametros;
  regua: EtapaReguaDef[];
  feriados: { data: DataISO; descricao: string }[];
  listas: { lista: string; valor: string; ordem: number; cor: string | null }[];
  vagas: { codigo: string; dados: Obj; etapas: { ordem: number; nome: string; data: DataISO }[] }[];
  admissoes: { codigo: string; vagaCodigo: string; obs: string; itens: { ordem: number; tarefa: string; resposta: 'SIM' | 'NAO' | 'NA' }[] }[];
  experiencias: { codigo: string; vagaCodigo: string | null; dados: Obj }[];
  integracoes: { codigo: string; vagaCodigo: string | null; dados: Obj }[];
  contratos: { codigo: string; vagaCodigo: string | null; dados: Obj }[];
  uniformes: { codigo: string; vagaCodigo: string | null; dados: Obj }[];
  notas: { codigo: string; vagaCodigo: string | null; dados: Obj }[];
  candidatos: { codigoLegado: string; dados: Obj; vagaCodigo: string | null; etapa: EtapaCandidatura; statusLegado: string | null; fonte: string | null; motivoPerda: string | null }[];
  sequencias: Record<string, number>;
  avisos: string[];
}

const str = (v: unknown): string => (v == null ? '' : String(v)).trim();
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Obj[]) : []);

function data(v: unknown, avisos: string[], onde: string): DataISO | null {
  const s = str(v);
  if (!s) return null;
  const d = ehDataISO(s) ? s : normalizarData(s);
  if (!d) avisos.push(`${onde}: data inválida "${s}" descartada`);
  return d;
}

export function simNao(v: unknown): SimNao {
  const s = str(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s === 'SIM') return 'SIM';
  if (s === 'NAO') return 'NAO';
  return null;
}

export function resposta(v: unknown): 'SIM' | 'NAO' | 'NA' {
  const s = str(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return s === 'SIM' ? 'SIM' : s === 'N/A' || s === 'NA' ? 'NA' : 'NAO';
}

export function numero(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = str(v).replace(/[^\d,.-]/g, '');
  if (!s) return null;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) ? n : null;
}

const chaveEtapa = (t: unknown) => str(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ');
const ETAPA_DE_PARA: Record<string, string> = {
  'ALINHAMENTO COM O GESTOR': 'ALINHAMENTO', 'DIVULGACAO PUBLICADA': 'DIVULGACAO', 'TRIAGEM CONCLUIDA': 'TRIAGEM CV RH',
  'ENVIO DE PARECER / SHORTLIST': 'PARECER', 'ENTREVISTA COM O GESTOR': 'ENTREVISTA GESTOR', 'APROVACAO DO GESTOR': 'APROVACAO',
};
/** Régua antiga de 10 etapas → 8 (DE_10_PARA_8, L923). Índice 9 era "Admissão concluída" → vira o início. */
const DE_10_PARA_8 = [0, 1, 2, 5, 6, 7, -1, -1, -1, -1];

const numeroDoCodigo = (c: string) => parseInt(c.replace(/^[A-Z]/, '').replace(/\D.*$/, ''), 10) || 0;

export function converterLegado(S: Obj, hoje: DataISO, retencaoMeses = 24): PlanoImportacao {
  const avisos: string[] = [];
  const P = (S.params ?? {}) as Obj;
  const L = (S.listas ?? {}) as Record<string, unknown[]>;

  // ---- régua
  const reguaLegada = arr(P.etapas).map((e, i) => ({ ordem: Number(e.n) || i + 1, nome: str(e.nome), slaDias: Number(e.sla) || 0 }))
    .sort((a, b) => a.ordem - b.ordem);
  const antiga10 = reguaLegada.length === 10 && !(Number(P.etapasV) >= 2);
  const regua = !reguaLegada.length || antiga10 ? REGUA_PADRAO : reguaLegada;
  if (antiga10) avisos.push('Régua antiga de 10 etapas convertida para a régua de 8 (mesma regra do sistema antigo)');
  const destino = new Map(regua.map((e, i) => [chaveEtapa(e.nome), i]));
  const mapaPorNome = reguaLegada.map((e) => destino.get(chaveEtapa(e.nome)) ?? destino.get(chaveEtapa(ETAPA_DE_PARA[chaveEtapa(e.nome)])) ?? -1);

  // ---- parâmetros, listas, feriados
  const parametros = mesclarParametros(P);
  const cores = ((P.cores ?? {}) as Record<string, Record<string, string>>);
  const listas: PlanoImportacao['listas'] = [];
  for (const nome of LISTAS_BASE) {
    const valores = [...new Set((L[nome] ?? []).map((v) => str(v).toLocaleUpperCase('pt-BR')).filter(Boolean))];
    valores.forEach((valor, i) => listas.push({
      lista: nome, valor, ordem: i + 1,
      cor: cores[nome]?.[valor] ?? (nome === 'statusVaga' ? STATUS_VAGA_PADRAO.find((s) => s.valor === valor)?.cor ?? null : null),
    }));
  }
  const checklist = listas.filter((l) => l.lista === 'checklist').map((l) => l.valor);
  const feriados = [...new Set((L.feriados ?? []).map((f) => normalizarData(str(f))).filter((d): d is DataISO => !!d))]
    .map((d) => ({ data: d, descricao: '' }));

  // ---- vagas
  const codigosVaga = new Set<string>();
  const vagas: PlanoImportacao['vagas'] = [];
  for (const v of arr(S.vagas)) {
    const codigo = str(v.id);
    if (!codigo || codigosVaga.has(codigo)) { avisos.push(`Vaga sem ID ou repetida ignorada (${codigo || 'sem id'})`); continue; }
    codigosVaga.add(codigo);
    const onde = `Vaga ${codigo}`;
    const brutas = Array.isArray(v.etapas) ? (v.etapas as unknown[]) : [];
    let inicio = data(v.inicio, avisos, onde);
    const alinhadas: (DataISO | null)[] = regua.map(() => null);
    brutas.forEach((d, i) => {
      const iso = data(d, avisos, `${onde} etapa ${i + 1}`);
      if (!iso) return;
      const j = antiga10 && brutas.length === 10 ? DE_10_PARA_8[i]! : reguaLegada.length ? (mapaPorNome[i] ?? -1) : i;
      if (antiga10 && i === 9 && !inicio) inicio = iso;
      if (j >= 0 && j < regua.length && !alinhadas[j]) alinhadas[j] = iso;
    });
    vagas.push({
      codigo,
      dados: padronizarObjeto({
        empresa: str(v.empresa), cargo: str(v.cargo), depto: str(v.depto), tipo: str(v.tipo), substituido: str(v.substituido),
        gestor: str(v.gestor), salario: numero(v.salario), abertura: data(v.abertura, avisos, onde), status: str(v.status) || 'TRIAR',
        prioridade: str(v.prioridade), aprovado: str(v.aprovado), inicio, talent: str(v.talent),
        medirSla: v.medirSla === undefined ? true : !!v.medirSla, obs: str(v.obs),
      }),
      etapas: alinhadas.flatMap((d, i) => (d ? [{ ordem: regua[i]!.ordem, nome: regua[i]!.nome, data: d }] : [])),
    });
  }
  const vagaValida = (id: unknown, onde: string): string | null => {
    const c = str(id);
    if (!c) return null;
    if (!codigosVaga.has(c)) { avisos.push(`${onde}: vaga ${c} não existe; vínculo removido`); return null; }
    return c;
  };

  // ---- admissões (exigem vaga; 1 por vaga)
  const admissoes: PlanoImportacao['admissoes'] = [];
  const vagasComAdm = new Set<string>();
  for (const a of arr(S.admissao)) {
    const codigo = str(a.id);
    const vagaCodigo = vagaValida(a.idVaga, `Admissão ${codigo}`);
    if (!codigo || !vagaCodigo) { avisos.push(`Admissão ${codigo || 'sem id'} sem vaga válida ignorada`); continue; }
    if (vagasComAdm.has(vagaCodigo)) { avisos.push(`Admissão ${codigo}: a vaga ${vagaCodigo} já tem admissão; ignorada`); continue; }
    vagasComAdm.add(vagaCodigo);
    const respostas = Array.isArray(a.itens) ? (a.itens as unknown[]) : [];
    if (respostas.length !== checklist.length) avisos.push(`Admissão ${codigo}: ${respostas.length} respostas para ${checklist.length} tarefas do checklist`);
    admissoes.push({
      codigo, vagaCodigo, obs: str(a.obs),
      itens: checklist.map((tarefa, i) => ({ ordem: i + 1, tarefa, resposta: resposta(respostas[i]) })),
    });
  }

  // ---- controles com vínculo opcional e único por vaga
  const unicos = <T>(nome: string, lista: Obj[], montar: (o: Obj, onde: string) => Obj) => {
    const usadas = new Set<string>();
    const saida: { codigo: string; vagaCodigo: string | null; dados: Obj }[] = [];
    const vistos = new Set<string>();
    for (const o of lista) {
      const codigo = str(o.id);
      if (!codigo || vistos.has(codigo)) { avisos.push(`${nome} sem ID ou repetido ignorado (${codigo || 'sem id'})`); continue; }
      vistos.add(codigo);
      let vagaCodigo = vagaValida(o.idVaga, `${nome} ${codigo}`);
      if (vagaCodigo && usadas.has(vagaCodigo)) { avisos.push(`${nome} ${codigo}: segundo registro da vaga ${vagaCodigo}; fica sem vínculo`); vagaCodigo = null; }
      if (vagaCodigo) usadas.add(vagaCodigo);
      saida.push({ codigo, vagaCodigo, dados: montar(o, `${nome} ${codigo}`) });
    }
    return saida as unknown as T;
  };

  const experiencias = unicos<PlanoImportacao['experiencias']>('Experiência', arr(S.experiencia), (e, onde) => {
    const admissao = data(e.admissao, avisos, onde);
    return padronizarObjeto({
      nome: str(e.nome), empresa: str(e.empresa), cargo: str(e.cargo), depto: str(e.depto), gestor: str(e.gestor), admissao,
      ...calcularPrazosExperiencia(admissao, parametros.expP1, parametros.expP2),
      env1: data(e.env1, avisos, onde), prorrog: simNao(e.prorrog), env2: data(e.env2, avisos, onde), efetiv: simNao(e.efetiv), obs: str(e.obs),
    });
  });
  const integracoes = unicos<PlanoImportacao['integracoes']>('Integração', arr(S.integracao), (g, onde) => padronizarObjeto({
    admissao: data(g.admissao, avisos, onde), nome: str(g.nome), empresa: str(g.empresa), setor: str(g.setor), gestor: str(g.gestor),
    feito: resposta(g.feito), dataIntegr: data(g.dataIntegr, avisos, onde), obs: str(g.obs),
  }));
  const contratos = unicos<PlanoImportacao['contratos']>('Contrato', arr(S.contratos), (k, onde) => padronizarObjeto({
    nome: str(k.nome), empresa: str(k.empresa), faculdade: str(k.faculdade),
    solic: data(k.solic, avisos, onde), retorno: data(k.retorno, avisos, onde), assinado: data(k.assinado, avisos, onde), obs: str(k.obs),
  }));
  const uniformes = unicos<PlanoImportacao['uniformes']>('Uniforme', arr(S.uniformes), (u, onde) => padronizarObjeto({
    empresa: str(u.empresa), nome: str(u.nome), tipoVaga: str(u.vaga), nascimento: data(u.nascimento, avisos, onde),
    telefone: str(u.telefone), cpf: str(u.cpf), admissao: data(u.admissao, avisos, onde), cargo: str(u.cargo), setor: str(u.setor),
    terceiro: str(u.terceiro) || 'NA', sapato: str(u.sapato), camisa: str(u.camisa), calca: str(u.calca),
    entregue: simNao(u.entregue), dataEntrega: data(u.dataEntrega, avisos, onde), obs: str(u.obs),
  }));

  const notas: PlanoImportacao['notas'] = [];
  for (const n of arr(S.notas)) {
    const codigo = str(n.id);
    if (!codigo || !str(n.texto)) continue;
    const onde = `Nota ${codigo}`;
    notas.push({ codigo, vagaCodigo: vagaValida(n.idVaga, onde), dados: {
      texto: str(n.texto).slice(0, 400), quando: data(n.quando, avisos, onde), feito: !!n.feito, criada: data(n.criada, avisos, onde),
    } });
  }

  // ---- candidatos (coleção legada sem tela): base legal LEGÍTIMO INTERESSE até haver consentimento
  const candidatos: PlanoImportacao['candidatos'] = [];
  const cpfs = new Set<string>();
  arr(S.candidatos).forEach((c, i) => {
    const codigoLegado = str(c.id) || `CAND-${String(i + 1).padStart(4, '0')}`;
    let cpf: string | null = fmtCPF(str(c.cpf)) || null;
    if (cpf && cpfs.has(cpf)) { avisos.push(`Candidato ${codigoLegado}: CPF repetido descartado`); cpf = null; }
    if (cpf) cpfs.add(cpf);
    const curriculo = str(c.curriculo);
    candidatos.push({
      codigoLegado,
      dados: {
        nome: str(c.nome).toLocaleUpperCase('pt-BR') || 'SEM NOME', email: str(c.email).toLowerCase() || null,
        telefone: str(c.telefone) || null, cpf, cidade: str(c.cidade) || null, fonte: str(c.fonte) || null,
        curriculoUrl: /^https?:\/\//i.test(curriculo) ? curriculo : null, curriculoTexto: str(c.curriculoTexto) || null,
        baseLegal: 'LEGITIMO_INTERESSE', retencaoAte: retencaoPadrao(hoje, retencaoMeses),
      },
      vagaCodigo: vagaValida(c.idVaga, `Candidato ${codigoLegado}`),
      etapa: etapaDoStatusLegado(str(c.status)), statusLegado: str(c.status) || null,
      fonte: str(c.fonte) || null, motivoPerda: str(c.motivo) || null,
    });
  });
  if (candidatos.length) avisos.push(`${candidatos.length} candidato(s) legado(s) importado(s) com base legal LEGÍTIMO INTERESSE e retenção até ${retencaoPadrao(hoje, retencaoMeses)}: colete o consentimento ou anonimize`);

  const maxPrefixo = (codigos: string[]) => Math.max(0, ...codigos.map(numeroDoCodigo));
  const sequencias = {
    V: maxPrefixo(vagas.map((x) => x.codigo)), A: maxPrefixo(admissoes.map((x) => x.codigo)),
    E: maxPrefixo(experiencias.map((x) => x.codigo)), I: maxPrefixo(integracoes.map((x) => x.codigo)),
    K: maxPrefixo(contratos.map((x) => x.codigo)), U: maxPrefixo(uniformes.map((x) => x.codigo)), N: maxPrefixo(notas.map((x) => x.codigo)),
  };

  return { parametros, regua, feriados, listas, vagas, admissoes, experiencias, integracoes, contratos, uniformes, notas, candidatos, sequencias, avisos };
}

export function resumoPlano(p: PlanoImportacao) {
  return {
    vagas: p.vagas.length, admissoes: p.admissoes.length, experiencias: p.experiencias.length, integracoes: p.integracoes.length,
    contratos: p.contratos.length, uniformes: p.uniformes.length, notas: p.notas.length, candidatos: p.candidatos.length,
    feriados: p.feriados.length, itensDeLista: p.listas.length, etapasDaRegua: p.regua.length,
  };
}
