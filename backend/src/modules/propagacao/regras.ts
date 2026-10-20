/**
 * Propagação "a vaga manda" como função PURA: dado o estado atual, devolve um PLANO do que criar
 * e do que espelhar. O serviço aplica o plano no banco dentro de uma transação.
 *
 * Legado: propagarVaga, sincronizarAdmissao/Experiencia/Integracao/Contratos/Uniformes e
 * espelharDaVaga (index.html L2454–2650).
 *   Vaga aprovada (última etapa datada OU status fechado) ──► Admissão (1:1)
 *   Admissão com checklist 100% ─────────────────────────────► Experiência
 *   Admissão + empresa = empresaIntegracao + aprovado ───────► Integração
 *   Admissão + cargo contém "ESTAGI" + aprovado ─────────────► Contrato CIEE (solic = hoje)
 *   Admissão + empresa ∈ empresasUniforme + aprovado ────────► Uniforme
 * Cada registro nasce UMA vez por vaga. Registros sem vaga de origem nunca são espelhados.
 */
import type { DataISO } from '../../shared/datas.js';
import { mesmaEmpresa } from '../../shared/texto.js';
import type { Parametros } from '../configuracao/regras.js';
import { ehEstagio } from '../contratos/regras.js';
import { calcularPrazosExperiencia } from '../experiencias/regras.js';
import { tipoVagaUniforme } from '../vagas/regras.js';

export interface VagaOrigem {
  codigo: string;
  aprovada: boolean;
  aprovado: string;
  empresa: string;
  cargo: string;
  depto: string;
  gestor: string;
  tipo: string;
  inicio: DataISO | null;
}

export interface EstadoDependentes {
  admissao: { pct: number } | null;
  experiencia: boolean;
  integracao: boolean;
  contrato: boolean;
  uniforme: boolean;
}

export interface PlanoPropagacao {
  criarAdmissao: { obs: string } | null;
  criarExperiencia: Record<string, unknown> | null;
  criarIntegracao: Record<string, unknown> | null;
  criarContrato: Record<string, unknown> | null;
  criarUniforme: Record<string, unknown> | null;
  espelho: {
    experiencia: Record<string, unknown>;
    integracao: Record<string, unknown>;
    uniforme: Record<string, unknown>;
    contrato: Record<string, unknown>;
  };
}

type ParamsPropagacao = Pick<Parametros, 'empresaIntegracao' | 'empresasUniforme' | 'expP1' | 'expP2'>;

/** Campos da vaga que mandam em cada aba dependente (ESPELHADOS do legado). */
export function camposEspelhados(v: VagaOrigem, p: ParamsPropagacao): PlanoPropagacao['espelho'] {
  const prazos = calcularPrazosExperiencia(v.inicio, p.expP1, p.expP2);
  return {
    experiencia: { admissao: v.inicio, limite1: prazos.limite1, limite2: prazos.limite2,
      nome: v.aprovado, empresa: v.empresa, cargo: v.cargo, depto: v.depto, gestor: v.gestor },
    integracao: { admissao: v.inicio, nome: v.aprovado, empresa: v.empresa, setor: v.depto, gestor: v.gestor },
    uniforme: { admissao: v.inicio, nome: v.aprovado, empresa: v.empresa, cargo: v.cargo, setor: v.depto,
      tipoVaga: tipoVagaUniforme(v.tipo) },
    // No contrato a data que importa é a da solicitação; só nome e empresa espelham.
    contrato: { nome: v.aprovado, empresa: v.empresa },
  };
}

export const deveTerIntegracao = (v: VagaOrigem, p: ParamsPropagacao): boolean => {
  const alvo = (p.empresaIntegracao ?? '').trim();
  return !!v.aprovado && (!alvo || mesmaEmpresa(v.empresa, alvo));
};

export const deveTerContrato = (v: VagaOrigem): boolean => !!v.aprovado && ehEstagio(v.cargo);

export const deveTerUniforme = (v: VagaOrigem, p: ParamsPropagacao): boolean => {
  const permitidas = p.empresasUniforme ?? [];
  return !!v.aprovado && (!permitidas.length || permitidas.some((e) => mesmaEmpresa(e, v.empresa)));
};

export function planejarPropagacao(
  v: VagaOrigem,
  atual: EstadoDependentes,
  p: ParamsPropagacao,
  hoje: DataISO,
): PlanoPropagacao {
  const espelho = camposEspelhados(v, p);
  const origem = `VEIO DA ADMISSÃO ${v.codigo}`;

  const criarAdmissao = !atual.admissao && v.aprovada
    ? { obs: `ABERTA AUTOMATICAMENTE NA APROVAÇÃO DA VAGA ${v.codigo}` } : null;
  const temAdmissao = !!atual.admissao || !!criarAdmissao;
  const pct = atual.admissao?.pct ?? 0;

  const criarExperiencia = temAdmissao && pct >= 1 && !atual.experiencia
    ? { ...espelho.experiencia, obs: origem } : null;
  const criarIntegracao = temAdmissao && !atual.integracao && deveTerIntegracao(v, p)
    ? { ...espelho.integracao, feito: 'NAO', dataIntegr: null, obs: origem } : null;
  const criarContrato = temAdmissao && !atual.contrato && deveTerContrato(v)
    ? { ...espelho.contrato, faculdade: '', solic: hoje, retorno: null, assinado: null, obs: origem } : null;
  const criarUniforme = temAdmissao && !atual.uniforme && deveTerUniforme(v, p)
    ? { ...espelho.uniforme, terceiro: 'NA', obs: origem } : null;

  return { criarAdmissao, criarExperiencia, criarIntegracao, criarContrato, criarUniforme, espelho };
}

/** Diferença campo a campo (para espelhar só o que mudou e auditar antes/depois). */
export function diferencas(atual: Record<string, unknown>, desejado: Record<string, unknown>): Record<string, unknown> {
  const mud: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(desejado)) {
    const a = atual[k] ?? '';
    const b = v ?? '';
    if (a !== b) mud[k] = v;
  }
  return mud;
}
