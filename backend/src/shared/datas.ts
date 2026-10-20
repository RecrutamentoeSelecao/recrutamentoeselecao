/**
 * Utilitários de data PUROS. Toda data de negócio é um dia civil em texto ISO "AAAA-MM-DD"
 * (como no sistema legado). A aritmética usa UTC para não sofrer com horário de verão.
 * Espelha parseD/addD/difD/somarDiasUteis/diasUteisEntre do index.html (L840–880).
 */

export type DataISO = string; // AAAA-MM-DD

const DIA_MS = 86_400_000;
const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function ehDataISO(s: unknown): s is DataISO {
  if (typeof s !== 'string') return false;
  const m = RE_ISO.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return d.getUTCFullYear() === +m[1]! && d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!;
}

function paraUTC(s: DataISO): number {
  const m = RE_ISO.exec(s);
  if (!m) throw new Error(`Data inválida: ${s}`);
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!);
}

function deUTC(ms: number): DataISO {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Soma n dias corridos (n pode ser negativo). */
export function somarDias(base: DataISO, n: number): DataISO {
  return deUTC(paraUTC(base) + n * DIA_MS);
}

/** Dias corridos de a até b (b − a). */
export function diferencaDias(a: DataISO, b: DataISO): number {
  return Math.round((paraUTC(b) - paraUTC(a)) / DIA_MS);
}

/** Aceita "AAAA-MM-DD" ou "DD/MM/AAAA" (a Base legada guarda feriados nos dois formatos). */
export function normalizarData(s: string): DataISO | null {
  const t = String(s ?? '').trim();
  const br = RE_BR.exec(t);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : t;
  return ehDataISO(iso) ? iso : null;
}

export type Feriados = ReadonlySet<DataISO>;

export function conjuntoFeriados(lista: Iterable<string>): Feriados {
  const s = new Set<DataISO>();
  for (const f of lista) {
    const d = normalizarData(f);
    if (d) s.add(d);
  }
  return s;
}

/** Dia útil = não é sábado, domingo nem feriado da Base. */
export function ehDiaUtil(d: DataISO, feriados: Feriados): boolean {
  const dow = new Date(paraUTC(d)).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !feriados.has(d);
}

/** Soma n dias úteis a partir do dia SEGUINTE à base (a base não conta). */
export function somarDiasUteis(base: DataISO, n: number, feriados: Feriados): DataISO {
  let ms = paraUTC(base);
  let faltam = n;
  while (faltam > 0) {
    ms += DIA_MS;
    if (ehDiaUtil(deUTC(ms), feriados)) faltam--;
  }
  return deUTC(ms);
}

/** Dias úteis entre a e b, contando os dias úteis em (a, b]. Negativo se b < a. */
export function diasUteisEntre(a: DataISO, b: DataISO, feriados: Feriados): number {
  const x = paraUTC(a);
  const y = paraUTC(b);
  const sinal = x > y ? -1 : 1;
  let ini = sinal > 0 ? x : y;
  const fim = sinal > 0 ? y : x;
  let n = 0;
  while (ini < fim) {
    ini += DIA_MS;
    if (ehDiaUtil(deUTC(ini), feriados)) n++;
  }
  return n * sinal;
}

/** "Hoje" como dia civil no fuso do negócio (padrão America/Sao_Paulo). */
export function hojeISO(fuso = 'America/Sao_Paulo', agora: Date = new Date()): DataISO {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

// ---- fronteira com o banco (@db.Date chega como Date UTC 00:00) ----

export function dateParaISO(d: Date | null | undefined): DataISO | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export function isoParaDate(s: DataISO | null | undefined): Date | null {
  return s ? new Date(paraUTC(s)) : null;
}

export function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const s = [...valores].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function media(valores: number[]): number | null {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
}
