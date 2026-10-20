import type { DelegateCrud } from '../../shared/crud.js';
import type { Db } from '../../shared/prisma.js';

export const delegate = (db: Db) => db.nota as unknown as DelegateCrud;

export const listar = (db: Db, f: { filtro: 'pendentes' | 'todas'; vagaId?: string }) =>
  db.nota.findMany({
    where: { ...(f.filtro === 'pendentes' ? { feito: false } : {}), ...(f.vagaId ? { vagaId: f.vagaId } : {}) },
    orderBy: [{ feito: 'asc' }, { quando: 'asc' }, { criada: 'desc' }],
  });

export const concluidas = (db: Db) => db.nota.findMany({ where: { feito: true } });
export const apagarConcluidas = (db: Db) => db.nota.deleteMany({ where: { feito: true } });
