import { createHash, randomBytes } from 'node:crypto';
import type { Usuario } from '@prisma/client';
import { env } from '../../config/env.js';
import { auditar } from '../../shared/audit/auditoria.js';
import { conferirSenha, hashParaTempoConstante } from '../../shared/auth/senha.js';
import type { Ator, UsuarioToken } from '../../shared/auth/tipos.js';
import { naoAutenticado } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';
import * as repo from './repository.js';

export type AssinarAccess = (payload: UsuarioToken) => string;

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

async function emitirTokens(usuario: Usuario, assinar: AssinarAccess) {
  const refreshToken = randomBytes(48).toString('base64url');
  const expira = new Date(Date.now() + env.REFRESH_TTL_DIAS * 86_400_000);
  await repo.criarRefresh(prisma, usuario.id, hashToken(refreshToken), expira);
  return {
    accessToken: assinar({ sub: usuario.id, nome: usuario.nome, papel: usuario.papel }),
    refreshToken,
    tokenType: 'Bearer' as const,
    expiraEm: expira.toISOString(),
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
  };
}

export async function login(email: string, senha: string, contexto: Pick<Ator, 'ip' | 'userAgent'>, assinar: AssinarAccess) {
  const usuario = await repo.buscarUsuarioPorEmail(prisma, email);
  const ok = await conferirSenha(usuario?.senhaHash ?? (await hashParaTempoConstante()), senha);
  if (!usuario || !ok || !usuario.ativo) {
    await auditar(prisma, { id: usuario?.id ?? null, nome: email, papel: 'SISTEMA', ...contexto },
      { acao: 'LOGIN_FALHA', entidade: 'Usuario', entidadeId: usuario?.id ?? null });
    throw naoAutenticado('E-mail ou senha inválidos');
  }
  await auditar(prisma, { id: usuario.id, nome: usuario.nome, papel: usuario.papel, ...contexto },
    { acao: 'LOGIN', entidade: 'Usuario', entidadeId: usuario.id });
  return emitirTokens(usuario, assinar);
}

/** Rotação: o refresh usado é revogado e um novo é emitido. Reuso de token revogado derruba todas as sessões. */
export async function renovar(refreshToken: string, assinar: AssinarAccess) {
  const r = await repo.buscarRefresh(prisma, hashToken(refreshToken));
  if (!r) throw naoAutenticado('Refresh token inválido');
  if (r.revogadoEm) {
    await repo.revogarTodosDoUsuario(prisma, r.usuarioId);
    throw naoAutenticado('Refresh token já utilizado; sessões encerradas por segurança');
  }
  if (r.expiraEm < new Date() || !r.usuario.ativo) throw naoAutenticado('Refresh token expirado');
  await repo.revogarRefresh(prisma, r.id);
  return emitirTokens(r.usuario, assinar);
}

export async function logout(refreshToken: string, ator: Ator) {
  const r = await repo.buscarRefresh(prisma, hashToken(refreshToken));
  if (r && !r.revogadoEm && r.usuarioId === ator.id) await repo.revogarRefresh(prisma, r.id);
  await auditar(prisma, ator, { acao: 'LOGOUT', entidade: 'Usuario', entidadeId: ator.id });
}

export async function eu(id: string) {
  const u = await repo.buscarUsuario(prisma, id);
  if (!u || !u.ativo) throw naoAutenticado();
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel };
}
