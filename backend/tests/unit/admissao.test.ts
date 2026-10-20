import { describe, expect, it } from 'vitest';
import { type ItemChecklist, calcularAdmissao, percentualChecklist, proximaResposta } from '../../src/modules/admissoes/regras.js';

const itens = (...r: ItemChecklist['resposta'][]): ItemChecklist[] =>
  r.map((resposta, i) => ({ ordem: i + 1, tarefa: `TAREFA ${i + 1}`, resposta }));

describe('admissão — checklist', () => {
  it('% = SIM ÷ (itens − N/A)', () => {
    expect(percentualChecklist(itens('SIM', 'NAO', 'NA', 'SIM'))).toBeCloseTo(2 / 3);
    expect(percentualChecklist(itens('NA', 'NA'))).toBe(0);
    expect(percentualChecklist(itens('SIM', 'NA'))).toBe(1);
  });
  it('próxima pendência e situação', () => {
    const c = calcularAdmissao(itens('SIM', 'NAO', 'NAO'), '2026-10-25', '2026-10-20');
    expect(c.proxima).toBe('TAREFA 2');
    expect(c.pendentes).toBe(2);
    expect(c.situacao).toEqual({ k: 'warn', t: 'Início em 5d' });
  });
  it('mais de 5 dias: em andamento; início passado: admitido com pendência; 100%: concluída', () => {
    expect(calcularAdmissao(itens('NAO'), '2026-10-26', '2026-10-20').situacao.t).toBe('Em andamento');
    expect(calcularAdmissao(itens('NAO'), '2026-10-19', '2026-10-20').situacao.t).toBe('Admitido com pendência');
    expect(calcularAdmissao(itens('SIM', 'NA'), '2026-10-19', '2026-10-20').situacao.t).toBe('Concluída');
    expect(calcularAdmissao(itens('NAO'), null, '2026-10-20').situacao.t).toBe('Em andamento');
  });
  it('ciclo NÃO → SIM → N/A → NÃO', () => {
    expect(proximaResposta('NAO')).toBe('SIM');
    expect(proximaResposta('SIM')).toBe('NA');
    expect(proximaResposta('NA')).toBe('NAO');
  });
});
