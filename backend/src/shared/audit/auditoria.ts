import type { Prisma } from '@prisma/client';
import type { Ator } from '../auth/tipos.js';
import type { Db } from '../prisma.js';

export type AcaoAuditoria =
  | 'CRIAR' | 'ATUALIZAR' | 'EXCLUIR' | 'ACAO' | 'PROPAGACAO' | 'EXPORTAR' | 'IMPORTAR'
  | 'LOGIN' | 'LOGIN_FALHA' | 'LOGOUT' | 'ANONIMIZAR' | 'EXPORTAR_TITULAR';

const CAMPOS_SIGILOSOS = new Set(['senhaHash', 'senha', 'tokenHash', 'refreshToken']);

/** Converte para JSON puro (Date → ISO, Decimal → string) e remove segredos. */
export function paraJsonAuditavel(v: unknown): Prisma.InputJsonValue | undefined {
  if (v === undefined || v === null) return undefined;
  return JSON.parse(
    JSON.stringify(v, (k, val) => (CAMPOS_SIGILOSOS.has(k) ? '[REDIGIDO]' : val)),
  ) as Prisma.InputJsonValue;
}

export interface EntradaAuditoria {
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId?: string | null;
  antes?: unknown;
  depois?: unknown;
}

/** Grava no audit log. Chame com o mesmo `tx` da mutação para ser atômico. */
export async function auditar(db: Db, ator: Ator, e: EntradaAuditoria): Promise<void> {
  await db.auditLog.create({
    data: {
      usuarioId: ator.id,
      usuarioNome: ator.nome,
      acao: e.acao,
      entidade: e.entidade,
      entidadeId: e.entidadeId ?? null,
      antes: paraJsonAuditavel(e.antes),
      depois: paraJsonAuditavel(e.depois),
      ip: ator.ip ?? null,
      userAgent: ator.userAgent ?? null,
    },
  });
}

/** Só os campos que mudaram (para um log enxuto). */
export function delta(antes: Record<string, unknown>, depois: Record<string, unknown>) {
  const a: Record<string, unknown> = {};
  const d: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(antes), ...Object.keys(depois)])) {
    if (JSON.stringify(antes[k]) !== JSON.stringify(depois[k])) {
      a[k] = antes[k];
      d[k] = depois[k];
    }
  }
  return { antes: a, depois: d };
}
