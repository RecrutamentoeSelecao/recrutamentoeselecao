import type { Db } from './prisma.js';

/** Próximo código legível (V0001, A0001...). Incremento atômico na tabela de sequências. */
export async function proximoCodigo(db: Db, prefixo: string): Promise<string> {
  const s = await db.sequencia.upsert({
    where: { prefixo },
    create: { prefixo, valor: 1 },
    update: { valor: { increment: 1 } },
  });
  return prefixo + String(s.valor).padStart(4, '0');
}

export const PREFIXOS = {
  vaga: 'V', admissao: 'A', experiencia: 'E', integracao: 'I', contrato: 'K', uniforme: 'U', nota: 'N',
} as const;
