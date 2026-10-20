/** Regras PURAS da admissão (calcAdm, index.html L1905). */
import { type DataISO, diferencaDias } from '../../shared/datas.js';

export type RespostaItem = 'SIM' | 'NAO' | 'NA';

export interface ItemChecklist {
  ordem: number;
  tarefa: string;
  resposta: RespostaItem;
}

export type SituacaoAdmissao =
  | { k: 'good'; t: 'Concluída' }
  | { k: 'neut'; t: 'Em andamento' }
  | { k: 'crit'; t: 'Admitido com pendência' }
  | { k: 'warn'; t: string };

export interface CalculoAdmissao {
  /** SIM ÷ (itens − N/A); 0 quando não há itens aplicáveis */
  pct: number;
  concluida: boolean;
  pendentes: number;
  proxima: string;
  situacao: SituacaoAdmissao;
}

export function percentualChecklist(itens: Pick<ItemChecklist, 'resposta'>[]): number {
  const aplicaveis = itens.filter((i) => i.resposta !== 'NA').length;
  const sim = itens.filter((i) => i.resposta === 'SIM').length;
  return aplicaveis ? sim / aplicaveis : 0;
}

export function calcularAdmissao(
  itens: ItemChecklist[],
  inicio: DataISO | null,
  hoje: DataISO,
  alertaDias = 5,
): CalculoAdmissao {
  const ordenados = [...itens].sort((a, b) => a.ordem - b.ordem);
  const pct = percentualChecklist(ordenados);
  const pendente = ordenados.find((i) => i.resposta === 'NAO');
  const faltam = inicio ? diferencaDias(hoje, inicio) : null;
  let situacao: SituacaoAdmissao;
  if (pct >= 1) situacao = { k: 'good', t: 'Concluída' };
  else if (faltam == null) situacao = { k: 'neut', t: 'Em andamento' };
  else if (faltam < 0) situacao = { k: 'crit', t: 'Admitido com pendência' };
  else if (faltam <= alertaDias) situacao = { k: 'warn', t: `Início em ${faltam}d` };
  else situacao = { k: 'neut', t: 'Em andamento' };
  return {
    pct,
    concluida: pct >= 1,
    pendentes: ordenados.filter((i) => i.resposta === 'NAO').length,
    proxima: pendente ? pendente.tarefa : '— tudo concluído',
    situacao,
  };
}

/** Ciclo do clique na célula do legado: NÃO → SIM → N/A → NÃO */
export function proximaResposta(r: RespostaItem): RespostaItem {
  return r === 'NAO' ? 'SIM' : r === 'SIM' ? 'NA' : 'NAO';
}
