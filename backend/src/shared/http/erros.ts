import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors.js';

export function registrarTratamentoDeErros(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.status(400).send({
        erro: 'VALIDACAO', mensagem: 'Dados inválidos',
        detalhes: err.validation.map((v) => ({ campo: v.instancePath, mensagem: v.message })),
      });
    }
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ erro: err.codigo, mensagem: err.message, detalhes: err.detalhes });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return reply.status(409).send({ erro: 'CONFLITO', mensagem: 'Registro duplicado', detalhes: err.meta });
      if (err.code === 'P2025') return reply.status(404).send({ erro: 'NAO_ENCONTRADO', mensagem: 'Registro não encontrado' });
      if (err.code === 'P2003') return reply.status(409).send({ erro: 'CONFLITO', mensagem: 'Referência inválida', detalhes: err.meta });
    }
    if (err.statusCode && err.statusCode < 500) {
      return reply.status(err.statusCode).send({ erro: err.code ?? 'REQUISICAO', mensagem: err.message });
    }
    req.log.error({ err }, 'erro não tratado');
    return reply.status(500).send({ erro: 'INTERNO', mensagem: 'Erro interno' });
  });
}
