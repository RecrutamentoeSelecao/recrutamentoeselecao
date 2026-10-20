import type { z } from 'zod';
import { auditar } from '../../shared/audit/auditoria.js';
import { gerarHashSenha } from '../../shared/auth/senha.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { conflito, naoEncontrado, regraNegocio } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';
import * as repo from './repository.js';
import type * as s from './schemas.js';

export const listar = () => repo.listar(prisma);

export async function criar(ator: Ator, d: z.infer<typeof s.usuarioCriar>) {
  if (await prisma.usuario.findUnique({ where: { email: d.email } })) throw conflito('E-mail já cadastrado');
  const senhaHash = await gerarHashSenha(d.senha);
  return prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({ data: { nome: d.nome, email: d.email, papel: d.papel, senhaHash }, select: repo.SELECAO_PUBLICA });
    await auditar(tx, ator, { acao: 'CRIAR', entidade: 'Usuario', entidadeId: u.id, depois: u });
    return u;
  });
}

export async function atualizar(ator: Ator, id: string, d: z.infer<typeof s.usuarioAtualizar>) {
  const antes = await repo.buscar(prisma, id);
  if (!antes) throw naoEncontrado('Usuário', id);
  if (id === ator.id && (d.ativo === false || (d.papel && d.papel !== 'ADMIN'))) throw regraNegocio('Você não pode se desativar nem tirar o próprio papel de ADMIN');
  const senhaHash = d.senha ? await gerarHashSenha(d.senha) : undefined;
  return prisma.$transaction(async (tx) => {
    const u = await tx.usuario.update({ where: { id }, data: { nome: d.nome, papel: d.papel, ativo: d.ativo, senhaHash }, select: repo.SELECAO_PUBLICA });
    // Desativar ou trocar senha derruba as sessões abertas.
    if (d.ativo === false || senhaHash) await tx.refreshToken.updateMany({ where: { usuarioId: id, revogadoEm: null }, data: { revogadoEm: new Date() } });
    await auditar(tx, ator, { acao: 'ATUALIZAR', entidade: 'Usuario', entidadeId: id, antes, depois: { ...u, senhaAlterada: !!senhaHash } });
    return u;
  });
}

/** Não apaga (o audit log referencia): desativa e revoga as sessões. */
export const desativar = (ator: Ator, id: string) => atualizar(ator, id, { ativo: false });
