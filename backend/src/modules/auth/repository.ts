import type { Db } from '../../shared/prisma.js';

export const buscarUsuarioPorEmail = (db: Db, email: string) => db.usuario.findUnique({ where: { email } });
export const buscarUsuario = (db: Db, id: string) => db.usuario.findUnique({ where: { id } });

export const criarRefresh = (db: Db, usuarioId: string, tokenHash: string, expiraEm: Date) =>
  db.refreshToken.create({ data: { usuarioId, tokenHash, expiraEm } });

export const buscarRefresh = (db: Db, tokenHash: string) =>
  db.refreshToken.findUnique({ where: { tokenHash }, include: { usuario: true } });

export const revogarRefresh = (db: Db, id: string) =>
  db.refreshToken.update({ where: { id }, data: { revogadoEm: new Date() } });

export const revogarTodosDoUsuario = (db: Db, usuarioId: string) =>
  db.refreshToken.updateMany({ where: { usuarioId, revogadoEm: null }, data: { revogadoEm: new Date() } });
