import { dateParaISO, isoParaDate } from '../datas.js';

/** Converte campos de dia civil (AAAA-MM-DD) para Date antes de gravar. */
export function datasParaBanco<T extends Record<string, unknown>>(obj: T, campos: readonly string[]): T {
  const r: Record<string, unknown> = { ...obj };
  for (const c of campos) if (c in r) r[c] = r[c] == null || r[c] === '' ? null : isoParaDate(r[c] as string);
  return r as T;
}

/** Converte Date de colunas @db.Date para AAAA-MM-DD e Decimal para number ao responder. */
export function paraResposta<T extends Record<string, unknown>>(obj: T, campos: readonly string[]): Record<string, unknown> {
  const r: Record<string, unknown> = { ...obj };
  for (const c of campos) if (c in r) r[c] = dateParaISO(r[c] as Date | null);
  for (const [k, v] of Object.entries(r)) {
    if (v && typeof v === 'object' && 'toNumber' in v && typeof (v as { toNumber: unknown }).toNumber === 'function') {
      r[k] = (v as { toNumber: () => number }).toNumber();
    }
  }
  return r;
}

/** Remove chaves undefined (PATCH parcial). */
export function semIndefinidos<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
