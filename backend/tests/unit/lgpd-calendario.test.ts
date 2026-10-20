import { describe, expect, it } from 'vitest';
import { conjuntoFeriados } from '../../src/shared/datas.js';
import { camposAnonimizados, elegivelParaExpurgo, pseudonimo, somarMeses } from '../../src/modules/candidatos/regras.js';
import { contarPorEtapa, etapaDoStatusLegado, validarMovimento } from '../../src/modules/candidaturas/regras.js';
import { PARAMETROS_PADRAO as P, REGUA_PADRAO as R } from '../../src/modules/configuracao/regras.js';
import { baldeDe, fimDaSemana, listarCompromissos } from '../../src/modules/painel/regras.js';

describe('LGPD — retenção e anonimização', () => {
  const base = { anonimizadoEm: null, retencaoAte: '2026-10-19', baseLegal: 'LEGITIMO_INTERESSE' as const, consentimentoRevogadoEm: null, contratado: false };
  it('soma meses respeitando fim de mês', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(somarMeses('2026-10-20', 24)).toBe('2028-10-20');
  });
  it('retenção vencida é elegível; contratado e já anonimizado não', () => {
    expect(elegivelParaExpurgo(base, '2026-10-20')).toEqual({ elegivel: true, motivo: 'prazo de retenção vencido' });
    expect(elegivelParaExpurgo({ ...base, retencaoAte: '2026-10-20' }, '2026-10-20').elegivel).toBe(false);
    expect(elegivelParaExpurgo({ ...base, contratado: true }, '2026-10-20').elegivel).toBe(false);
    expect(elegivelParaExpurgo({ ...base, anonimizadoEm: new Date() }, '2026-10-20').elegivel).toBe(false);
  });
  it('consentimento revogado é elegível', () => {
    const r = elegivelParaExpurgo({ ...base, retencaoAte: null, baseLegal: 'CONSENTIMENTO', consentimentoRevogadoEm: new Date() }, '2026-10-20');
    expect(r.motivo).toBe('consentimento revogado');
  });
  it('anonimização apaga identificadores e usa pseudônimo estável', () => {
    const c = camposAnonimizados('abc', new Date('2026-10-20T00:00:00Z'));
    expect(c).toMatchObject({ email: null, cpf: null, telefone: null, curriculoTexto: null });
    expect(c.nome).toBe(pseudonimo('abc'));
    expect(c.nome).not.toBe(pseudonimo('abd'));
  });
});

describe('funil de candidatura', () => {
  it('reprovação exige motivo; mapeia status legado', () => {
    expect(validarMovimento('TRIAGEM', 'REPROVADO')).toMatch(/motivo/);
    expect(validarMovimento('TRIAGEM', 'ENTREVISTA_RH')).toBeNull();
    expect(etapaDoStatusLegado('Banco de talentos')).toBe('BANCO_TALENTOS');
    expect(etapaDoStatusLegado('Não compareceu')).toBe('DESISTIU');
    expect(etapaDoStatusLegado('Aprovado(a)')).toBe('APROVADO');
    expect(contarPorEtapa([{ etapa: 'TRIAGEM' }, { etapa: 'TRIAGEM' }]).TRIAGEM).toBe(2);
  });
});

describe('calendário — baldes e compromissos', () => {
  const hoje = '2026-10-20'; // terça
  it('baldes como no legado (semana termina no domingo)', () => {
    expect(fimDaSemana(hoje)).toBe('2026-10-25');
    expect(fimDaSemana('2026-10-25')).toBe('2026-10-25');
    expect(baldeDe('2026-10-19', hoje)).toBe('atrasado');
    expect(baldeDe('2026-10-20', hoje)).toBe('hoje');
    expect(baldeDe('2026-10-21', hoje)).toBe('amanha');
    expect(baldeDe('2026-10-25', hoje)).toBe('semana');
    expect(baldeDe('2026-11-04', hoje)).toBe('quinze');
    expect(baldeDe('2026-11-05', hoje)).toBe('depois');
  });
  it('gera compromissos de todas as fontes, ordenados por data', () => {
    const lista = listarCompromissos({
      vagas: [{ id: 'v1', codigo: 'V0001', cargo: 'ANALISTA', empresa: 'X', aprovado: '', status: 'TRIAR', abertura: '2026-10-16', inicio: null, medirSla: true, etapas: Array(8).fill(null) }],
      experiencias: [{ id: 'e1', nome: 'ANA', admissao: '2026-09-10', prorrog: null, efetiv: null }],
      contratos: [{ id: 'k1', nome: 'JOÃO', solic: '2026-10-16', retorno: null }],
      integracoes: [{ id: 'i1', nome: 'ANA', admissao: '2026-10-01', feito: 'NAO' }, { id: 'i2', nome: 'NA', admissao: '2026-10-01', feito: 'NA' }],
      uniformes: [{ id: 'u1', nome: 'ANA', admissao: '2026-10-22', entregue: null }],
      notas: [{ id: 'n1', texto: 'LIGAR', quando: '2026-10-20', feito: false }],
    }, { regua: R, params: P, feriados: conjuntoFeriados([]) }, hoje);
    expect(lista.map((c) => c.tipo)).toEqual(['integracao', 'vaga', 'contrato', 'nota', 'uniforme', 'experiencia', 'experiencia']);
    const vaga = lista.find((c) => c.tipo === 'vaga')!;
    expect(vaga).toMatchObject({ data: '2026-10-19', titulo: 'Alinhamento', balde: 'atrasado', faltam: -1, corridos: false });
    expect(lista.find((c) => c.tipo === 'contrato')).toMatchObject({ data: '2026-10-20', balde: 'hoje' });
    expect(lista.filter((c) => c.tipo === 'experiencia').map((c) => c.data)).toEqual(['2026-10-24', '2026-12-08']);
  });
});
