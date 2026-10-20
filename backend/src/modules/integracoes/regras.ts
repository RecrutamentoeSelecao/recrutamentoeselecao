/** Regras PURAS da integração (calcIntegr, index.html L2010). */
import { type DataISO, diferencaDias } from '../../shared/datas.js';

export interface CalculoIntegracao {
  k: 'good' | 'neut' | 'crit' | 'warn';
  t: string;
  pendente: boolean;
  dias: number | null;
}

export function calcularIntegracao(
  g: { feito: 'SIM' | 'NAO' | 'NA'; admissao: DataISO | null; dataIntegr: DataISO | null },
  hoje: DataISO,
  criticaDias = 30,
): CalculoIntegracao {
  if (g.feito === 'SIM') {
    return { k: 'good', t: 'Realizada', pendente: false,
      dias: g.admissao && g.dataIntegr ? diferencaDias(g.admissao, g.dataIntegr) : null };
  }
  // N/A: desligado, desistiu ou nunca entrou — sai da fila.
  if (g.feito === 'NA') return { k: 'neut', t: 'Não se aplica', pendente: false, dias: null };
  if (!g.admissao) return { k: 'neut', t: 'Sem data de admissão', pendente: true, dias: null };
  const d = diferencaDias(g.admissao, hoje);
  return d > criticaDias
    ? { k: 'crit', t: `Pendente há ${d}d`, pendente: true, dias: null }
    : { k: 'warn', t: 'Pendente', pendente: true, dias: null };
}
