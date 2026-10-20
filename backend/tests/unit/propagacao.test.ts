import { describe, expect, it } from 'vitest';
import { PARAMETROS_PADRAO as P } from '../../src/modules/configuracao/regras.js';
import { type EstadoDependentes, type VagaOrigem, diferencas, planejarPropagacao } from '../../src/modules/propagacao/regras.js';

const HOJE = '2026-10-20';
const nada: EstadoDependentes = { admissao: null, experiencia: false, integracao: false, contrato: false, uniforme: false };
const vaga = (o: Partial<VagaOrigem> = {}): VagaOrigem => ({
  codigo: 'V0001', aprovada: true, aprovado: 'MARIA SILVA', empresa: 'FAGRON SERVICES', cargo: 'ANALISTA',
  depto: 'RH', gestor: 'JOÃO', tipo: 'SUBSTITUIÇÃO', inicio: '2026-11-03', ...o,
});

describe('propagação vaga → admissão → controles', () => {
  it('vaga não aprovada não cria nada', () => {
    const p = planejarPropagacao(vaga({ aprovada: false }), nada, P, HOJE);
    expect(p.criarAdmissao).toBeNull();
    expect(p.criarIntegracao).toBeNull();
    expect(p.criarUniforme).toBeNull();
  });
  it('aprovação cria admissão e, na mesma passada, integração e uniforme (FAGRON SERVICES)', () => {
    const p = planejarPropagacao(vaga(), nada, P, HOJE);
    expect(p.criarAdmissao).not.toBeNull();
    expect(p.criarExperiencia).toBeNull(); // checklist ainda não está 100%
    expect(p.criarIntegracao).toMatchObject({ nome: 'MARIA SILVA', setor: 'RH', admissao: '2026-11-03', feito: 'NAO' });
    expect(p.criarUniforme).toMatchObject({ tipoVaga: 'REPOSIÇÃO', cargo: 'ANALISTA', terceiro: 'NA' });
    expect(p.criarContrato).toBeNull(); // não é estágio
  });
  it('compara empresa sem caixa e sem acento', () => {
    const p = planejarPropagacao(vaga({ empresa: 'fagron services' }), nada, P, HOJE);
    expect(p.criarIntegracao).not.toBeNull();
  });
  it('outra empresa: sem integração; distribution tem uniforme', () => {
    const p = planejarPropagacao(vaga({ empresa: 'FAGRON DISTRIBUTION' }), nada, P, HOJE);
    expect(p.criarIntegracao).toBeNull();
    expect(p.criarUniforme).not.toBeNull();
  });
  it('estagiário gera contrato CIEE com solicitação = hoje', () => {
    const p = planejarPropagacao(vaga({ cargo: 'ESTAGIÁRIO ADMINISTRATIVO', empresa: 'OUTRA' }), nada, P, HOJE);
    expect(p.criarContrato).toMatchObject({ solic: HOJE, nome: 'MARIA SILVA', empresa: 'OUTRA' });
    expect(p.criarUniforme).toBeNull();
  });
  it('sem nome do aprovado: só a admissão nasce', () => {
    const p = planejarPropagacao(vaga({ aprovado: '' }), nada, P, HOJE);
    expect(p.criarAdmissao).not.toBeNull();
    expect(p.criarIntegracao).toBeNull();
    expect(p.criarUniforme).toBeNull();
  });
  it('checklist 100% cria experiência com limites 45/90', () => {
    const p = planejarPropagacao(vaga(), { ...nada, admissao: { pct: 1 }, integracao: true, uniforme: true }, P, HOJE);
    expect(p.criarAdmissao).toBeNull();
    expect(p.criarExperiencia).toMatchObject({ admissao: '2026-11-03', limite1: '2026-12-17', limite2: '2027-01-31' });
    expect(p.criarIntegracao).toBeNull(); // já existe: nasce uma vez só
  });
  it('não duplica o que já existe', () => {
    const tudo: EstadoDependentes = { admissao: { pct: 1 }, experiencia: true, integracao: true, contrato: true, uniforme: true };
    const p = planejarPropagacao(vaga({ cargo: 'ESTAGIÁRIO' }), tudo, P, HOJE);
    expect([p.criarAdmissao, p.criarExperiencia, p.criarIntegracao, p.criarContrato, p.criarUniforme]).toEqual([null, null, null, null, null]);
  });
  it('espelho: contrato só recebe nome e empresa; diferencas() acha só o que mudou', () => {
    const p = planejarPropagacao(vaga(), nada, P, HOJE);
    expect(Object.keys(p.espelho.contrato).sort()).toEqual(['empresa', 'nome']);
    expect(diferencas({ nome: 'MARIA SILVA', empresa: 'X' }, p.espelho.contrato)).toEqual({ empresa: 'FAGRON SERVICES' });
    expect(diferencas({ admissao: null }, { admissao: null })).toEqual({});
  });
});
