import { describe, expect, it } from 'vitest';
import {
  conjuntoFeriados, diasUteisEntre, diferencaDias, ehDataISO, ehDiaUtil, hojeISO, mediana,
  normalizarData, somarDias, somarDiasUteis,
} from '../../src/shared/datas.js';

const semFeriados = conjuntoFeriados([]);

describe('datas — dias corridos', () => {
  it('soma e subtrai atravessando mês e ano', () => {
    expect(somarDias('2026-01-31', 1)).toBe('2026-02-01');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('não sofre com horário de verão', () => {
    expect(diferencaDias('2018-11-03', '2018-11-05')).toBe(2);
  });
  it('diferença negativa quando b < a', () => {
    expect(diferencaDias('2026-10-20', '2026-10-10')).toBe(-10);
  });
  it('valida datas reais', () => {
    expect(ehDataISO('2026-02-29')).toBe(false);
    expect(ehDataISO('2028-02-29')).toBe(true);
    expect(ehDataISO('20/10/2026')).toBe(false);
  });
  it('aceita feriado em DD/MM/AAAA como na Base legada', () => {
    expect(normalizarData('25/12/2026')).toBe('2026-12-25');
    expect(normalizarData(' 2026-11-20 ')).toBe('2026-11-20');
    expect(normalizarData('lixo')).toBeNull();
  });
  it('mediana par e ímpar', () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
    expect(mediana([])).toBeNull();
  });
  it('hoje no fuso do negócio', () => {
    // 02:30 UTC de 21/10 ainda é 20/10 em São Paulo (UTC−3)
    expect(hojeISO('America/Sao_Paulo', new Date('2026-10-21T02:30:00Z'))).toBe('2026-10-20');
  });
});

describe('datas — dias úteis', () => {
  const feriados = conjuntoFeriados(['20/11/2026', '2026-12-25']);

  it('sábado, domingo e feriado não são úteis', () => {
    expect(ehDiaUtil('2026-10-17', semFeriados)).toBe(false); // sábado
    expect(ehDiaUtil('2026-10-18', semFeriados)).toBe(false); // domingo
    expect(ehDiaUtil('2026-11-20', feriados)).toBe(false);    // feriado (sexta)
    expect(ehDiaUtil('2026-11-20', semFeriados)).toBe(true);
  });
  it('soma dias úteis a partir do dia seguinte, pulando fim de semana', () => {
    // sexta + 2 úteis = terça
    expect(somarDiasUteis('2026-10-16', 2, semFeriados)).toBe('2026-10-20');
    expect(somarDiasUteis('2026-10-16', 0, semFeriados)).toBe('2026-10-16');
  });
  it('pula feriado da Base', () => {
    // quinta 19/11 + 1 útil: sexta 20/11 é feriado → segunda 23/11
    expect(somarDiasUteis('2026-11-19', 1, feriados)).toBe('2026-11-23');
  });
  it('conta dias úteis entre datas, com sinal', () => {
    expect(diasUteisEntre('2026-10-16', '2026-10-20', semFeriados)).toBe(2);
    expect(diasUteisEntre('2026-10-20', '2026-10-16', semFeriados)).toBe(-2);
    expect(diasUteisEntre('2026-11-19', '2026-11-23', feriados)).toBe(1);
    expect(diasUteisEntre('2026-10-20', '2026-10-20', semFeriados)).toBe(0);
  });
});
