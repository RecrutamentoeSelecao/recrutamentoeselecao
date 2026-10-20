/**
 * Testes HTTP sem banco: o PrismaClient só conecta na primeira consulta, e estas rotas
 * param antes disso (validação, autenticação, autorização, OpenAPI).
 */
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { construirApp } from '../../src/app.js';

let app: FastifyInstance;
const token = (papel: 'ADMIN' | 'RECRUTADOR' | 'GESTOR' | 'LEITOR') =>
  app.jwt.sign({ sub: '00000000-0000-4000-8000-000000000000', nome: 'TESTE', papel });

beforeAll(async () => { app = await construirApp({ logger: false }); await app.ready(); });
afterAll(async () => { await app.close(); });

describe('HTTP sem banco', () => {
  it('health', async () => {
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true });
  });

  it('gera OpenAPI 3 com as rotas e o esquema bearer', async () => {
    const r = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(r.statusCode).toBe(200);
    const doc = r.json();
    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    for (const p of ['/api/v1/vagas/', '/api/v1/vagas/{id}/aprovar', '/api/v1/admissoes/{id}/concluir', '/api/v1/candidatos/{id}/anonimizar',
      '/api/v1/importacao/legado', '/api/v1/painel/compromissos', '/api/v1/auth/login']) {
      expect(Object.keys(doc.paths)).toContain(p);
    }
  });

  it('sem token → 401', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/v1/vagas' });
    expect(r.statusCode).toBe(401);
    expect(r.json().erro).toBe('NAO_AUTENTICADO');
  });

  it('token adulterado → 401', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/v1/vagas', headers: { authorization: `Bearer ${token('ADMIN')}x` } });
    expect(r.statusCode).toBe(401);
  });

  it('RBAC: LEITOR não cria vaga, RECRUTADOR não exporta CSV, GESTOR não vê candidatos → 403', async () => {
    const casos = [
      { method: 'POST' as const, url: '/api/v1/vagas', papel: 'LEITOR' as const, payload: { empresa: 'X', cargo: 'Y' } },
      { method: 'GET' as const, url: '/api/v1/exportacao/vagas.csv', papel: 'RECRUTADOR' as const },
      { method: 'GET' as const, url: '/api/v1/candidatos', papel: 'GESTOR' as const },
      { method: 'GET' as const, url: '/api/v1/uniformes', papel: 'LEITOR' as const },
      { method: 'GET' as const, url: '/api/v1/auditoria', papel: 'RECRUTADOR' as const },
      { method: 'POST' as const, url: '/api/v1/importacao/legado', papel: 'RECRUTADOR' as const, payload: { dados: {} } },
    ];
    for (const c of casos) {
      const r = await app.inject({ method: c.method, url: c.url, payload: c.payload, headers: { authorization: `Bearer ${token(c.papel)}` } });
      expect(r.statusCode, `${c.method} ${c.url} como ${c.papel}`).toBe(403);
    }
  });

  it('validação Zod → 400 com detalhes', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'nao-e-email', senha: '' } });
    expect(r.statusCode).toBe(400);
    expect(r.json().erro).toBe('VALIDACAO');
  });

  it('data inválida no corpo → 400 (antes de tocar no banco)', async () => {
    const r = await app.inject({
      method: 'PUT', url: '/api/v1/vagas/00000000-0000-4000-8000-000000000001/etapas/1',
      payload: { data: '2026-02-30' }, headers: { authorization: `Bearer ${token('RECRUTADOR')}` },
    });
    expect(r.statusCode).toBe(400);
  });
});
