import type { Papel } from '@prisma/client';
import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { naoAutenticado, proibido } from '../errors.js';
import type { Ator } from './tipos.js';

export const TODOS: Papel[] = ['ADMIN', 'RECRUTADOR', 'GESTOR', 'LEITOR'];
export const EQUIPE: Papel[] = ['ADMIN', 'RECRUTADOR'];
export const SO_ADMIN: Papel[] = ['ADMIN'];
/** Dados pessoais sensíveis (CPF, nascimento, telefone, currículo): fora do alcance de LEITOR e GESTOR */
export const DADOS_PESSOAIS: Papel[] = ['ADMIN', 'RECRUTADOR'];

/**
 * preHandler de autenticação + autorização por papel.
 * Matriz resumida (detalhe no README):
 *   ADMIN       tudo, inclusive usuários, parâmetros, exportação CSV, importação, auditoria, LGPD
 *   RECRUTADOR  lança e edita vagas, candidatos, admissão, experiência, integração, contratos, uniformes
 *   GESTOR      lê as vagas/experiências em que é gestor e registra avaliação/decisão de experiência
 *   LEITOR      somente leitura, sem dados pessoais sensíveis
 */
export function permitir(...papeis: Papel[]): preHandlerAsyncHookHandler {
  return async function (req: FastifyRequest, _reply: FastifyReply) {
    try {
      await req.jwtVerify();
    } catch {
      throw naoAutenticado('Token ausente, inválido ou expirado');
    }
    if (!papeis.includes(req.user.papel)) throw proibido();
  };
}

export function atorDe(req: FastifyRequest): Ator {
  return {
    id: req.user.sub,
    nome: req.user.nome,
    papel: req.user.papel,
    ip: req.ip,
    userAgent: req.headers['user-agent']?.slice(0, 300),
  };
}

/** GESTOR só enxerga o que é dele; demais papéis não têm filtro. */
export const restricaoGestor = (ator: Ator): string | null => (ator.papel === 'GESTOR' ? ator.id : null);
