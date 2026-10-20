import { describe, expect, it } from 'vitest';
import { converterLegado, numero, resposta, simNao } from '../../src/modules/importacao/conversor.js';
import { abrirEntradaLegada, cifrarComoLegado } from '../../src/modules/importacao/legado.js';

/** Estado no formato do index.html (normalizar, L5211). */
const estadoLegado = () => ({
  versao: 2, reset: '2026-08-22-limpeza-2',
  params: {
    etapas: [
      { n: 1, nome: 'Alinhamento', sla: 1 }, { n: 2, nome: 'Divulgação', sla: 2 }, { n: 3, nome: 'Triagem CV RH', sla: 5 },
      { n: 4, nome: 'Triagem CV Gestor', sla: 7 }, { n: 5, nome: 'Entrevista RH', sla: 9 }, { n: 6, nome: 'Parecer', sla: 10 },
      { n: 7, nome: 'Entrevista Gestor', sla: 15 }, { n: 8, nome: 'Aprovação', sla: 18 },
    ],
    etapasV: 2, agingVerde: 0.7, agingAmarelo: 1, expP1: 45, expP2: 90, slaCiee: 2, empresaIntegracao: 'FAGRON SERVICES',
    empresasUniforme: ['FAGRON SERVICES'], cores: { statusVaga: { 'OK FINAL': 's-good' } },
  },
  listas: { empresas: ['FAGRON SERVICES'], statusVaga: ['TRIAR', 'FECHADA', 'OK FINAL'], checklist: ['EXAME ADMISSIONAL', 'CONTA BANCÁRIA', 'LANÇAR NA PLANILHA INTEGRAÇÃO'],
    feriados: ['20/11/2026', '2026-12-25', 'lixo'] },
  vagas: [
    { id: 'V0001', empresa: 'FAGRON SERVICES', cargo: 'ANALISTA', status: 'FECHADA', abertura: '2026-09-01',
      etapas: ['2026-09-01', '2026-09-02', null, null, null, null, null, '2026-09-20'], aprovado: 'MARIA', inicio: '2026-10-01', medirSla: true, salario: 'R$ 3.500,00' },
    { id: 'V0012EA7', empresa: 'FAGRON SERVICES', cargo: 'ESTAGIÁRIO', status: 'TRIAR', abertura: '2026-10-10', etapas: [], medirSla: false },
  ],
  admissao: [
    { id: 'A0001', idVaga: 'V0001', itens: ['SIM', 'N/A', 'NÃO'], obs: '' },
    { id: 'A0002', idVaga: 'V9999', itens: [] },
  ],
  experiencia: [
    { id: 'E0001', idVaga: 'V0001', nome: 'MARIA', admissao: '2026-10-01', prorrog: 'SIM', efetiv: '' },
    { id: 'E0002', idVaga: 'V0001', nome: 'DUPLICADA', admissao: '2026-10-01' },
    { id: 'E0003', idVaga: '', nome: 'MANUAL', admissao: '01/02/2026' },
  ],
  integracao: [{ id: 'I0001', idVaga: 'V0001', nome: 'MARIA', feito: 'N/A' }],
  contratos: [{ id: 'K0003', idVaga: 'V0012EA7', nome: 'JOÃO', solic: '2026-10-16' }],
  uniformes: [{ id: 'U0001', idVaga: 'V0001', nome: 'MARIA', vaga: 'Reposição', cpf: '12345678901', entregue: 'NÃO' }],
  notas: [{ id: 'N0001', texto: 'Ligar para o gestor', idVaga: 'V0001', quando: '2026-10-21', feito: false, criada: '2026-10-20' }],
  candidatos: [{ status: 'Entrevista RH agendada', nome: 'Pedro', idVaga: 'V0012EA7', fonte: 'INDEED', curriculoTexto: 'cv...' }],
});

describe('importação — conversão do formato legado', () => {
  const p = converterLegado(estadoLegado(), '2026-10-20', 24);

  it('converte vagas com etapas alinhadas à régua e salário em texto', () => {
    expect(p.vagas).toHaveLength(2);
    expect(p.vagas[0]!.etapas.map((e) => e.ordem)).toEqual([1, 2, 8]);
    expect(p.vagas[0]!.dados.salario).toBe(3500);
    expect(p.vagas[1]!.codigo).toBe('V0012EA7');
    expect(p.vagas[1]!.dados.medirSla).toBe(false);
  });
  it('checklist vira itens com a tarefa e SIM/NÃO/N/A mapeados', () => {
    expect(p.admissoes).toHaveLength(1);
    expect(p.admissoes[0]!.itens.map((i) => i.resposta)).toEqual(['SIM', 'NA', 'NAO']);
    expect(p.avisos.some((a) => a.includes('A0002'))).toBe(true);
  });
  it('experiência: calcula limites, aceita data BR e não deixa duas na mesma vaga', () => {
    expect(p.experiencias[0]!.dados).toMatchObject({ limite1: '2026-11-14', limite2: '2026-12-29', prorrog: 'SIM', efetiv: null });
    expect(p.experiencias[1]!.vagaCodigo).toBeNull();
    expect(p.experiencias[2]!.dados.admissao).toBe('2026-02-01');
  });
  it('feriados normalizados, cor verde do status e sequências', () => {
    expect(p.feriados.map((f) => f.data)).toEqual(['2026-11-20', '2026-12-25']);
    expect(p.listas.find((l) => l.valor === 'OK FINAL')?.cor).toBe('s-good');
    expect(p.listas.find((l) => l.valor === 'FECHADA')?.cor).toBe('s-good');
    expect(p.sequencias).toMatchObject({ V: 12, A: 1, E: 3, K: 3 });
  });
  it('candidato legado: base legal, retenção e etapa a partir do status', () => {
    expect(p.candidatos[0]).toMatchObject({ etapa: 'ENTREVISTA_RH', vagaCodigo: 'V0012EA7' });
    expect(p.candidatos[0]!.dados).toMatchObject({ nome: 'PEDRO', baseLegal: 'LEGITIMO_INTERESSE', retencaoAte: '2028-10-20' });
  });
  it('uniforme: CPF mascarado e entregue NÃO', () => {
    expect(p.uniformes[0]!.dados).toMatchObject({ cpf: '123.456.789-01', entregue: 'NAO', tipoVaga: 'REPOSIÇÃO' });
  });
  it('régua antiga de 10 etapas: converte posições e a 10ª vira o início', () => {
    const S = estadoLegado();
    S.params.etapas = Array.from({ length: 10 }, (_, i) => ({ n: i + 1, nome: `ETAPA ${i + 1}`, sla: i + 1 }));
    S.params.etapasV = 1;
    S.vagas = [{ id: 'V0001', status: 'TRIAR', abertura: '2026-01-01', etapas: ['2026-01-01', null, '2026-01-03', null, null, '2026-01-06', null, null, null, '2026-02-01'] } as never];
    const r = converterLegado(S, '2026-10-20');
    expect(r.regua).toHaveLength(8);
    expect(r.vagas[0]!.etapas.map((e) => e.ordem)).toEqual([1, 3, 8]); // DE_10_PARA_8: índice 5 → posição 7
    expect(r.vagas[0]!.dados.inicio).toBe('2026-02-01');
  });
  it('utilitários de valores', () => {
    expect(simNao('NÃO')).toBe('NAO');
    expect(simNao('')).toBeNull();
    expect(resposta('N/A')).toBe('NA');
    expect(numero('1.234,56')).toBe(1234.56);
  });
});

describe('importação — leitura do cofre e do pacote', () => {
  it('abre JSON em texto e pacote base64 em claro', async () => {
    const S = estadoLegado();
    expect((await abrirEntradaLegada(JSON.stringify(S))).vagas).toHaveLength(2);
    const pacote = '----- PACOTE R&S FAGRON -----\n' + Buffer.from(JSON.stringify({ pacote: 1, estado: S, base: null })).toString('base64').replace(/(.{76})/g, '$1\n') + '\n----- FIM DO PACOTE -----';
    expect((await abrirEntradaLegada(pacote)).vagas).toHaveLength(2);
  });
  it('decifra o cofre AES-GCM/PBKDF2 com a senha certa e recusa a errada', async () => {
    const cofre = await cifrarComoLegado(estadoLegado(), 'senha-da-laila');
    expect((await abrirEntradaLegada(cofre, 'senha-da-laila')).vagas).toHaveLength(2);
    await expect(abrirEntradaLegada(cofre, 'errada')).rejects.toThrow(/Senha do cofre/);
    await expect(abrirEntradaLegada(cofre)).rejects.toThrow(/cifrados/);
  }, 20_000);
});
