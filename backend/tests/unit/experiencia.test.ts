import { describe, expect, it } from 'vitest';
import { calcularExperiencia, calcularPrazosExperiencia, taxaEfetivacao } from '../../src/modules/experiencias/regras.js';

const P = { expP1: 45, expP2: 90, experienciaAlertaDias: 7 };

describe('experiência — prazos 45/90 (dias corridos, admissão é o 1º dia)', () => {
  it('limite1 = admissão + 45 − 1 e limite2 = admissão + 90 − 1', () => {
    expect(calcularPrazosExperiencia('2026-01-01')).toEqual({ limite1: '2026-02-14', limite2: '2026-03-31' });
    expect(calcularPrazosExperiencia('2026-10-20')).toEqual({ limite1: '2026-12-03', limite2: '2027-01-17' });
  });
  it('sem admissão não há prazo', () => {
    expect(calcularPrazosExperiencia(null)).toEqual({ limite1: null, limite2: null });
  });
  it('respeita parâmetros customizados', () => {
    expect(calcularPrazosExperiencia('2026-01-01', 30, 60).limite1).toBe('2026-01-30');
  });
});

describe('experiência — marcos e ação', () => {
  const adm = '2026-01-01';
  it('faltando mais de 7 dias: ok, decidir prorrogação', () => {
    const c = calcularExperiencia({ admissao: adm, prorrog: null, efetiv: null }, '2026-02-01', P);
    expect(c.m1).toMatchObject({ k: 'ok', dias: 13 });
    expect(c.acao).toBe('Decidir prorrogação');
    expect(c.diasDeCasa).toBe(32);
    expect(c.atrasada).toBe(false);
  });
  it('faltando até 7 dias: alerta', () => {
    const c = calcularExperiencia({ admissao: adm, prorrog: null, efetiv: null }, '2026-02-07', P);
    expect(c.m1.k).toBe('warn');
  });
  it('vencido sem decisão: atrasada', () => {
    const c = calcularExperiencia({ admissao: adm, prorrog: null, efetiv: null }, '2026-02-15', P);
    expect(c.m1).toMatchObject({ k: 'crit', t: 'venceu há 1d' });
    expect(c.atrasada).toBe(true);
  });
  it('prorrogado: aguarda efetivação aos 90', () => {
    const c = calcularExperiencia({ admissao: adm, prorrog: 'SIM', efetiv: null }, '2026-04-01', P);
    expect(c.m1.k).toBe('good');
    expect(c.m2.k).toBe('crit');
    expect(c.acao).toBe('Decidir efetivação');
    expect(c.atrasada).toBe(true);
  });
  it('não prorrogado: encerra aos 45, sem marco de 90', () => {
    const c = calcularExperiencia({ admissao: adm, prorrog: 'NAO', efetiv: null }, '2026-05-01', P);
    expect(c.semSegundo).toBe(true);
    expect(c.pendente).toBe(false);
    expect(c.atrasada).toBe(false);
    expect(c.m2.t).toBe('encerra aos 45 dias');
  });
  it('efetivado: encerrado', () => {
    const c = calcularExperiencia({ admissao: adm, prorrog: 'SIM', efetiv: 'SIM' }, '2026-05-01', P);
    expect(c.acao).toBe('— encerrado');
    expect(c.m2.t).toBe('efetivado');
  });
  it('taxa de efetivação considera só decididos', () => {
    expect(taxaEfetivacao([{ efetiv: 'SIM' }, { efetiv: 'NAO' }, { efetiv: null }, { efetiv: 'SIM' }])).toBeCloseTo(2 / 3);
    expect(taxaEfetivacao([{ efetiv: null }])).toBeNull();
  });
});
