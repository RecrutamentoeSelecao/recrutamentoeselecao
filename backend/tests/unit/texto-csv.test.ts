import { describe, expect, it } from 'vitest';
import { gerarCsv } from '../../src/shared/csv.js';
import { fmtCPF, fmtTel, mesmaEmpresa, padronizar, padronizarObjeto } from '../../src/shared/texto.js';

describe('padronização de texto', () => {
  it('máscaras de telefone e CPF do legado', () => {
    expect(fmtTel('62998142277')).toBe('(62)9 9814-2277');
    expect(fmtTel('+55 62 3214-5678')).toBe('(62) 3214-5678');
    expect(fmtCPF('1234567890')).toBe('012.345.678-90');
    expect(fmtCPF('123')).toBe('123');
  });
  it('caixa alta exceto email/cpf/telefone', () => {
    expect(padronizar('cargo', ' analista júnior ')).toBe('ANALISTA JÚNIOR');
    expect(padronizar('email', 'Ana@Ex.com ')).toBe('Ana@Ex.com');
    expect(padronizarObjeto({ nome: 'ana', abertura: '2026-10-01', vagaId: 'abc' }))
      .toEqual({ nome: 'ANA', abertura: '2026-10-01', vagaId: 'abc' });
  });
  it('empresa sem caixa e sem acento', () => {
    expect(mesmaEmpresa('Fagron Serviços', 'FAGRON  SERVICOS')).toBe(true);
  });
});

describe('CSV', () => {
  it('usa ; e BOM, escapa aspas e neutraliza fórmulas', () => {
    const csv = gerarCsv([{ a: 'x;y', b: '=SOMA(1)', c: 1.5, d: -3 }], [
      { titulo: 'A', valor: (r) => r.a }, { titulo: 'B', valor: (r) => r.b },
      { titulo: 'C', valor: (r) => r.c }, { titulo: 'D', valor: (r) => r.d },
    ]);
    expect(csv.startsWith('﻿A;B;C;D\r\n')).toBe(true);
    expect(csv).toContain(`"x;y";'=SOMA(1);1,5;-3`);
  });
});
