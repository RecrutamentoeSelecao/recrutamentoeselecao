import { describe, expect, it } from 'vitest';
import { conjuntoFeriados } from '../../src/shared/datas.js';
import { PARAMETROS_PADRAO as P, REGUA_PADRAO as R } from '../../src/modules/configuracao/regras.js';
import {
  type VagaParaCalculo, calcularVaga, farolAging, proximaEtapaPendente, statusAberto, statusFechado,
  tipoVagaUniforme, vagaAprovada,
} from '../../src/modules/vagas/regras.js';

const vazia = (): (string | null)[] => Array(8).fill(null);
const vaga = (o: Partial<VagaParaCalculo> = {}): VagaParaCalculo =>
  ({ status: 'TRIAR', abertura: '2026-10-01', etapas: vazia(), inicio: null, medirSla: true, ...o });

describe('farol de aging (0,7 / 1,0 do SLA total de 18 dias)', () => {
  it.each([
    [0, 'saudavel'], [12, 'saudavel'], [12.6, 'saudavel'], [13, 'atencao'], [18, 'atencao'], [19, 'critico'],
  ])('%s dias → %s', (dias, esperado) => {
    expect(farolAging(dias, 18, false, P)).toBe(esperado);
  });
  it('encerrada = concluída; sem abertura = vazio', () => {
    expect(farolAging(40, 18, true, P)).toBe('concluida');
    expect(farolAging(null, 18, false, P)).toBe('');
  });
});

describe('calcularVaga', () => {
  it('conta aging até hoje e marca etapas vencidas como ATRASADO (dias corridos)', () => {
    const c = calcularVaga(vaga({ etapas: ['2026-10-02', '2026-10-05', ...Array(6).fill(null)] }), R, P, '2026-10-20');
    expect(c.slaTotal).toBe(18);
    expect(c.dias).toBe(19);
    expect(c.farol).toBe('critico');
    // Alinhamento: prazo 02/10 → OK; Divulgação: prazo 03/10, feita 05/10 → ATRASADO
    expect(c.flags.slice(0, 2)).toEqual(['OK', 'ATRASADO']);
    // Etapas 3..7 sem data com prazo vencido → ATRASADO; Aprovação (prazo 19/10) vencida também
    expect(c.flags.slice(2)).toEqual(Array(6).fill('ATRASADO'));
    expect(c.statusSla).toBe('FORA');
    expect(c.etapaNome).toBe('Divulgação');
    expect(c.diasEtapa).toBe(15);
    expect(c.aberta).toBe(true);
  });
  it('etapa futura ainda não vencida é PENDENTE', () => {
    const c = calcularVaga(vaga({ abertura: '2026-10-19' }), R, P, '2026-10-20');
    expect(c.flags[0]).toBe('PENDENTE'); // prazo 20/10, hoje 20/10 → ainda não venceu
    expect(c.flags[7]).toBe('PENDENTE');
    expect(c.statusSla).toBe('DENTRO');
    expect(c.farol).toBe('saudavel');
  });
  it('medirSla=false não calcula SLA', () => {
    const c = calcularVaga(vaga({ medirSla: false }), R, P, '2026-10-20');
    expect(c.statusSla).toBe('');
    expect(c.flags.every((f) => f === '')).toBe(true);
  });
  it('aprovação encerra o aging, calcula TTH e TTF', () => {
    const etapas = ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-15'];
    const c = calcularVaga(vaga({ etapas, inicio: '2026-11-03' }), R, P, '2026-12-01');
    expect(c.dias).toBe(14);
    expect(c.farol).toBe('concluida');
    expect(c.tth).toBe(13); // Divulgação → Aprovação
    expect(c.ttf).toBe(33); // abertura → admissão
    expect(c.statusSla).toBe('DENTRO');
    expect(c.aberta).toBe(false); // aprovação + data de admissão
    expect(c.diasEtapa).toBe(0);
  });
  it('aprovada sem data de admissão continua "em aberto" (falta o dado)', () => {
    const etapas = [...vazia().slice(0, 7), '2026-10-15'];
    const c = calcularVaga(vaga({ etapas }), R, P, '2026-10-20');
    expect(c.encerrada).toBe(true);
    expect(c.aberta).toBe(true);
  });
  it('status encerrado: não está aberta', () => {
    expect(calcularVaga(vaga({ status: 'CANCELADA' }), R, P, '2026-10-20').aberta).toBe(false);
  });
});

describe('status e aprovação', () => {
  it('aberto/fechado', () => {
    expect(statusAberto('TRIAR')).toBe(true);
    expect(statusAberto('CONGELADA')).toBe(false);
    expect(statusFechado('VAGA FECHADA')).toBe(true);
    expect(statusFechado('CONTRATADO')).toBe(true);
    expect(statusFechado('OK FINAL', 's-good')).toBe(true);
    expect(statusFechado('TRIAR')).toBe(false);
  });
  it('aprovada pela última etapa ou pelo status', () => {
    expect(vagaAprovada({ status: 'TRIAR', etapas: [...vazia().slice(0, 7), '2026-10-15'] }, 8)).toBe(true);
    expect(vagaAprovada({ status: 'FECHADA', etapas: vazia() }, 8)).toBe(true);
    expect(vagaAprovada({ status: 'TRIAR', etapas: ['2026-10-15', ...vazia().slice(1)] }, 8)).toBe(false);
  });
});

describe('calendário: próxima etapa em DIAS ÚTEIS', () => {
  it('abertura sexta 16/10, Alinhamento (1 útil) → segunda 19/10; com feriado → terça', () => {
    const v = vaga({ abertura: '2026-10-16' });
    expect(proximaEtapaPendente(v, R, conjuntoFeriados([]))?.prazo).toBe('2026-10-19');
    expect(proximaEtapaPendente(v, R, conjuntoFeriados(['19/10/2026']))?.prazo).toBe('2026-10-20');
  });
  it('vaga encerrada ou completa não gera compromisso', () => {
    expect(proximaEtapaPendente(vaga({ status: 'FECHADA' }), R, conjuntoFeriados([]))).toBeNull();
    expect(proximaEtapaPendente(vaga({ etapas: Array(8).fill('2026-10-02') }), R, conjuntoFeriados([]))).toBeNull();
  });
});

it('uniforme: Reposição para Substituição', () => {
  expect(tipoVagaUniforme('SUBSTITUIÇÃO')).toBe('REPOSIÇÃO');
  expect(tipoVagaUniforme('Substituição')).toBe('REPOSIÇÃO');
  expect(tipoVagaUniforme('AUMENTO DE QUADRO')).toBe('NOVA POSIÇÃO');
  expect(tipoVagaUniforme('')).toBe('');
});
