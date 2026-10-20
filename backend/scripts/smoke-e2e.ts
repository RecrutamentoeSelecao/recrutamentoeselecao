/**
 * Teste de fumaça ponta a ponta contra uma API rodando com banco real.
 *   API_URL=http://localhost:3333 SMOKE_EMAIL=... SMOKE_SENHA=... npx tsx scripts/smoke-e2e.ts
 * Percorre: login → vaga → avançar → aprovar (admissão+integração+uniforme) → concluir checklist (experiência)
 * → espelho da vaga → estágio (CIEE) → painel/calendário → CSV → LGPD → refresh com rotação → importação legada.
 */
import { cifrarComoLegado } from '../src/modules/importacao/legado.js';

const BASE = (process.env.API_URL ?? 'http://localhost:3333') + '/api/v1';
let token = '';
let falhas = 0;

function ok(cond: unknown, msg: string) {
  if (cond) console.log(`  ✔ ${msg}`);
  else { console.log(`  ✘ ${msg}`); falhas++; }
}

async function req(metodo: string, caminho: string, corpo?: unknown) {
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: { ...(corpo !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  const tipo = r.headers.get('content-type') ?? '';
  // .text() descarta o BOM; para CSV lemos os bytes crus
  const dados = tipo.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()).toString('utf8');
  return { status: r.status, dados: dados as any, headers: r.headers }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

console.log('1. autenticação');
const login = await req('POST', '/auth/login', { email: process.env.SMOKE_EMAIL, senha: process.env.SMOKE_SENHA });
ok(login.status === 200 && login.dados.accessToken, 'login devolve access + refresh');
token = login.dados.accessToken;
const r1 = await req('POST', '/auth/refresh', { refreshToken: login.dados.refreshToken });
ok(r1.status === 200, 'refresh com rotação');
const reuso = await req('POST', '/auth/refresh', { refreshToken: login.dados.refreshToken });
ok(reuso.status === 401, 'reuso do refresh antigo é recusado (401)');
const relog = await req('POST', '/auth/login', { email: process.env.SMOKE_EMAIL, senha: process.env.SMOKE_SENHA });
token = relog.dados.accessToken;
ok((await req('POST', '/auth/login', { email: process.env.SMOKE_EMAIL, senha: 'errada-123456' })).status === 401, 'senha errada → 401');

console.log('2. Base: checklist e feriado');
const sufixo = Date.now().toString(36).toUpperCase();
for (const t of [`EXAME ADMISSIONAL ${sufixo}`, `CONTA BANCÁRIA ${sufixo}`]) await req('POST', '/configuracao/listas/checklist', { valor: t });
ok((await req('POST', '/configuracao/feriados', { data: '2026-11-20', descricao: 'Consciência Negra' })).status === 201, 'feriado cadastrado');

console.log('3. vaga → avançar → aprovar');
const nova = await req('POST', '/vagas', { empresa: 'Fagron Services', cargo: 'Analista de RH', tipo: 'Substituição', depto: 'RH', abertura: '2026-10-01' });
ok(nova.status === 201 && /^V\d{4}$/.test(nova.dados.vaga.codigo), `vaga criada (${nova.dados.vaga?.codigo}) e texto em caixa alta (${nova.dados.vaga?.empresa})`);
const id = nova.dados.vaga.id;
await req('POST', `/vagas/${id}/avancar`, { data: '2026-10-02' });
const av = await req('POST', `/vagas/${id}/avancar`, { data: '2026-10-05' });
ok(av.dados.vaga.calculado.etapaNome === 'Divulgação', 'avançou até Divulgação');
ok(av.dados.vaga.etapas[1].situacao === 'ATRASADO', 'Divulgação em 05/10 (prazo 03/10) marcada ATRASADO');
const ap = await req('POST', `/vagas/${id}/aprovar`, { aprovado: 'Maria Silva', data: '2026-10-15', inicio: '2026-11-03' });
const criados = ap.dados.propagacao.criados.map((c: { entidade: string }) => c.entidade);
ok(ap.status === 200 && criados.includes('Admissao'), 'aprovar cria a admissão');
ok(criados.includes('Integracao') && criados.includes('Uniforme') && !criados.includes('ContratoEstagio'), `propagação: ${criados.join(', ')}`);
ok(ap.dados.vaga.calculado.farol === 'concluida' && ap.dados.vaga.calculado.tth === 10, 'aprovada: farol concluída, TTH = 10 (Divulgação 05/10 → Aprovação 15/10)');
const hist = await req('GET', `/vagas/${id}/historico`);
ok(hist.dados.filter((h: { tipo: string }) => h.tipo === 'ETAPA').length === 3, 'histórico de etapas com carimbo de tempo');
ok((await req('PATCH', `/vagas/${id}`, { obs: 'x', versao: 1 })).status === 409, 'controle otimista: versão velha → 409');

console.log('4. admissão → experiência');
const adms = await req('GET', `/admissoes?filtro=todas&busca=${nova.dados.vaga.codigo}`);
const adm = adms.dados.itens[0];
ok(adm && adm.itens.length >= 2 && adm.calculado.pct === 0, 'checklist nasceu com as tarefas da Base, 0%');
const conc = await req('POST', `/admissoes/${adm.id}/concluir`);
ok(conc.dados.admissao.calculado.concluida && conc.dados.propagacao.criados.some((c: { entidade: string }) => c.entidade === 'Experiencia'), 'concluir checklist cria a experiência');
const exps = await req('GET', '/experiencias?filtro=todas&busca=MARIA%20SILVA');
const exp = exps.dados.itens.find((e: { vagaCodigo: string }) => e.vagaCodigo === nova.dados.vaga.codigo);
ok(exp?.limite1 === '2026-12-17' && exp?.limite2 === '2027-01-31', `limites 45/90: ${exp?.limite1} / ${exp?.limite2}`);

console.log('5. a vaga manda: mudar a admissão espelha');
const v = await req('GET', `/vagas/${id}`);
const pat = await req('PATCH', `/vagas/${id}`, { inicio: '2026-11-10', versao: v.dados.versao });
ok(pat.dados.propagacao.espelhados >= 3, `espelhados: ${pat.dados.propagacao.espelhados}`);
const exp2 = await req('GET', `/experiencias/${exp.id}`);
ok(exp2.dados.admissao === '2026-11-10' && exp2.dados.limite1 === '2026-12-24', 'experiência recalculada com a nova admissão');
const dec = await req('POST', `/experiencias/${exp.id}/decisao`, { marco: 'PRORROGACAO', decisao: 'SIM', data: '2026-12-20' });
ok(dec.dados.prorrog === 'SIM', 'decisão de prorrogação registrada');
ok((await req('POST', `/experiencias/${exp.id}/avaliacoes`, { marco: 'PRIMEIRO_PERIODO', nota: 4, recomendacao: 'PRORROGAR', comentario: 'bom' })).status === 201, 'avaliação 45 dias');

console.log('6. estágio → contrato CIEE (dias úteis)');
const est = await req('POST', '/vagas', { empresa: 'Outra Empresa', cargo: 'Estagiário Administrativo', abertura: '2026-10-01' });
const apE = await req('POST', `/vagas/${est.dados.vaga.id}/aprovar`, { aprovado: 'João Souza', data: '2026-10-16' });
ok(apE.dados.propagacao.criados.some((c: { entidade: string }) => c.entidade === 'ContratoEstagio'), 'estagiário gera contrato CIEE');
const k = await req('GET', '/contratos?filtro=todos&busca=JO');
const kk = k.dados.itens.find((x: { nome: string }) => x.nome === 'JOÃO SOUZA');
ok(kk?.calculado?.limite, `limite CIEE calculado: ${kk?.calculado?.limite}`);
const kr = await req('PATCH', `/contratos/${kk.id}`, { solic: '2026-11-19' });
ok(kr.status === 200, 'solicitação alterada');
const k2 = await req('GET', '/contratos?filtro=todos&busca=JO');
ok(k2.dados.itens.find((x: { id: string }) => x.id === kk.id).calculado.limite === '2026-11-24', 'feriado 20/11 respeitado: 19/11 + 2 úteis = 24/11');

console.log('7. painel, calendário, CSV');
const painel = await req('GET', '/painel');
ok(painel.status === 200 && typeof painel.dados.vagas.abertas === 'number', `painel: ${painel.dados.vagas.abertas} abertas, ${painel.dados.vagas.slaPorEtapa.length} etapas`);
const cal = await req('GET', '/painel/compromissos?tipo=experiencia&tipo=uniforme');
ok(cal.status === 200 && cal.dados.every((c: { tipo: string }) => ['experiencia', 'uniforme'].includes(c.tipo)), `calendário filtrado: ${cal.dados.length} compromissos`);
const csv = await req('GET', '/exportacao/vagas.csv');
ok(csv.status === 200 && csv.headers.get('content-disposition')?.includes('attachment') && (csv.dados as string).startsWith('﻿ID;Status;'), 'CSV para download com BOM e ;');

console.log('8. LGPD');
const cand = await req('POST', '/candidatos', { nome: 'Pedro Teste', email: `pedro.${sufixo.toLowerCase()}@example.com`, cpf: `${String(Date.now()).slice(-11)}`.padStart(11, '1'), consentimento: { aceito: true, versao: 'v1' } });
ok(cand.status === 201 && cand.dados.consentimentoVersao === 'v1' && cand.dados.retencaoAte, 'candidato com consentimento e retenção');
ok((await req('POST', '/candidatos', { nome: 'Sem termo' })).status === 422, 'sem consentimento → 422');
const cdt = await req('POST', '/candidaturas', { candidatoId: cand.dados.id, vagaId: id });
ok((await req('POST', `/candidaturas/${cdt.dados.id}/mover`, { etapa: 'REPROVADO' })).status === 422, 'reprovar sem motivo → 422');
ok((await req('POST', `/candidaturas/${cdt.dados.id}/mover`, { etapa: 'ENTREVISTA_RH' })).status === 200, 'mover no funil');
const tit = await req('GET', `/candidatos/${cand.dados.id}/dados-pessoais`);
ok(tit.status === 200 && tit.dados.titular.nome === 'PEDRO TESTE' && tit.dados.registroDeOperacoes.length >= 1, 'exportação do titular');
const an = await req('POST', `/candidatos/${cand.dados.id}/anonimizar`);
ok(an.dados.nome.startsWith('ANONIMIZADO-') && an.dados.email === null && an.dados.cpf === null, 'anonimizado');
const aud = await req('GET', `/auditoria?entidade=Candidato&entidadeId=${cand.dados.id}`);
ok(!JSON.stringify(aud.dados).includes('PEDRO TESTE'), 'audit log do titular expurgado (sem o nome)');
ok(aud.dados.itens.some((i: { acao: string }) => i.acao === 'ANONIMIZAR'), 'anonimização registrada no audit log');

console.log('9. auditoria');
const audV = await req('GET', `/auditoria?entidade=Vaga&entidadeId=${id}`);
ok(audV.dados.total >= 5, `vaga com ${audV.dados.total} entradas de auditoria`);

console.log('10. importação legada (cofre cifrado)');
const estado = {
  versao: 2, params: { etapasV: 2, etapas: [{ n: 1, nome: 'Alinhamento', sla: 1 }, { n: 2, nome: 'Divulgação', sla: 2 }, { n: 3, nome: 'Triagem CV RH', sla: 5 }, { n: 4, nome: 'Triagem CV Gestor', sla: 7 }, { n: 5, nome: 'Entrevista RH', sla: 9 }, { n: 6, nome: 'Parecer', sla: 10 }, { n: 7, nome: 'Entrevista Gestor', sla: 15 }, { n: 8, nome: 'Aprovação', sla: 18 }] },
  listas: { checklist: [`EXAME ADMISSIONAL ${sufixo}`], feriados: ['25/12/2026'] },
  vagas: [{ id: `V9${sufixo.slice(-3)}`, empresa: 'FAGRON SERVICES', cargo: 'AUXILIAR', status: 'FECHADA', abertura: '2026-08-01', etapas: ['2026-08-01'], aprovado: 'ANA', inicio: '2026-09-01', medirSla: true }],
  admissao: [{ id: `A9${sufixo.slice(-3)}`, idVaga: `V9${sufixo.slice(-3)}`, itens: ['SIM'] }],
  experiencia: [{ id: `E9${sufixo.slice(-3)}`, idVaga: `V9${sufixo.slice(-3)}`, nome: 'ANA', admissao: '2026-09-01', prorrog: 'SIM' }],
  integracao: [], contratos: [], uniformes: [], notas: [], candidatos: [],
};
const cofre = await cifrarComoLegado(estado, 'senha-antiga');
const sim = await req('POST', '/importacao/legado', { dados: cofre, senha: 'senha-antiga', simular: true });
ok(sim.status === 200 && sim.dados.resumo.vagas === 1 && sim.dados.simulacao, 'simulação decifra e resume');
const imp = await req('POST', '/importacao/legado', { dados: cofre, senha: 'senha-antiga', simular: false });
ok(imp.status === 200 && !imp.dados.simulacao, 'importação gravada');
const imp2 = await req('POST', '/importacao/legado', { dados: cofre, senha: 'senha-antiga', simular: false });
ok(imp2.status === 200, 'reimportar é idempotente');
const vi = await req('GET', `/vagas?filtro=todas&busca=V9${sufixo.slice(-3)}`);
ok(vi.dados.total === 1 && vi.dados.itens[0].etapas[0].data === '2026-08-01', 'vaga importada com etapa');
const nova2 = await req('POST', '/vagas', { empresa: 'X', cargo: 'Y' });
ok(nova2.status === 201, `sequência continua depois da importação: ${nova2.dados.vaga.codigo}`);

console.log(falhas ? `\n${falhas} verificação(ões) falharam` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
