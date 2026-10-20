import { describe, expect, it } from 'vitest';
import { conjuntoFeriados } from '../../src/shared/datas.js';
import { calcularContrato, ehEstagio, limiteCiee } from '../../src/modules/contratos/regras.js';

const sem = conjuntoFeriados([]);
const comFeriado = conjuntoFeriados(['2026-10-19']);

describe('contrato CIEE — 2 dias úteis com feriados da Base', () => {
  it('sexta + 2 úteis = terça', () => {
    expect(limiteCiee('2026-10-16', 2, sem)).toBe('2026-10-20');
  });
  it('feriado na segunda empurra para quarta', () => {
    expect(limiteCiee('2026-10-16', 2, comFeriado)).toBe('2026-10-21');
  });
  it('sem retorno e antes do limite: faltam N d úteis', () => {
    const c = calcularContrato({ nome: 'ANA', solic: '2026-10-16', retorno: null, assinado: null }, '2026-10-16', 2, sem);
    expect(c.prazo).toEqual({ k: 'ok', t: 'faltam 2d úteis' });
    expect(c.situacao.t).toBe('Aguardando CIEE');
  });
  it('vence hoje', () => {
    const c = calcularContrato({ nome: 'ANA', solic: '2026-10-16', retorno: null, assinado: null }, '2026-10-20', 2, sem);
    expect(c.prazo.t).toBe('vence hoje');
  });
  it('atrasado em dias úteis', () => {
    const c = calcularContrato({ nome: 'ANA', solic: '2026-10-16', retorno: null, assinado: null }, '2026-10-23', 2, sem);
    expect(c.prazo).toEqual({ k: 'crit', t: 'atrasado há 3d úteis' });
  });
  it('retorno no prazo e fora do prazo', () => {
    const ok = calcularContrato({ nome: 'ANA', solic: '2026-10-16', retorno: '2026-10-20', assinado: null }, '2026-10-30', 2, sem);
    expect(ok.prazo.t).toBe('no prazo (2d)');
    expect(ok.situacao.t).toBe('Aguardando assinatura');
    const tarde = calcularContrato({ nome: 'ANA', solic: '2026-10-16', retorno: '2026-10-22', assinado: '2026-10-23' }, '2026-10-30', 2, sem);
    expect(tarde.prazo.t).toBe('2d além do prazo');
    expect(tarde.diasAssinatura).toBe(1);
    expect(tarde.situacao.t).toBe('Assinado');
  });
  it('só cargos de estágio', () => {
    expect(ehEstagio('ESTAGIÁRIO DE RH')).toBe(true);
    expect(ehEstagio('estagiaria')).toBe(true);
    expect(ehEstagio('ANALISTA')).toBe(false);
  });
});
