import type { Db } from '../../shared/prisma.js';

export async function fotografia(db: Db, gestorUsuarioId: string | null) {
  const filtroVaga = gestorUsuarioId ? { gestorUsuarioId } : {};
  const [vagas, experiencias, contratos, integracoes, uniformes, notas] = await Promise.all([
    db.vaga.findMany({ where: filtroVaga, include: { etapas: true } }),
    db.experiencia.findMany({ where: gestorUsuarioId ? { vaga: filtroVaga } : {} }),
    gestorUsuarioId ? [] : db.contratoEstagio.findMany({ where: { retorno: null } }),
    gestorUsuarioId ? [] : db.integracao.findMany({ where: { feito: 'NAO' } }),
    gestorUsuarioId ? [] : db.uniforme.findMany({ where: { OR: [{ entregue: null }, { entregue: 'NAO' }] } }),
    gestorUsuarioId ? [] : db.nota.findMany({ where: { feito: false } }),
  ]);
  return { vagas, experiencias, contratos, integracoes, uniformes, notas };
}
