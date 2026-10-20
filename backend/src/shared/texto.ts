/**
 * Padronização de texto herdada do legado (index.html L1173–1204, L2602):
 * tudo em CAIXA ALTA exceto email/curriculo/telefone/cpf; máscaras de telefone e CPF;
 * comparação de empresa sem caixa e sem acento.
 */

const SEM_CAIXA_ALTA = new Set(['email', 'curriculo', 'curriculoTexto', 'curriculoUrl', 'telefone', 'cpf', 'senha']);

export const caixaAlta = (v: string): string => v.toLocaleUpperCase('pt-BR');

/** Sem acento, sem caixa, espaços colapsados. */
export const normal = (v: unknown): string =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

export const mesmaEmpresa = (a: unknown, b: unknown): boolean => normal(a) === normal(b);

/** (62)9 9814-2277 para celular, (62) 3214-5678 para fixo. Fora disso, deixa como veio. */
export function fmtTel(v: string | null | undefined): string {
  if (!v) return '';
  let d = String(v).replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 12 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)})${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 9) return `${d[0]} ${d.slice(1, 5)}-${d.slice(5)}`;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return String(v).trim();
}

export function fmtCPF(v: string | null | undefined): string {
  if (!v) return '';
  const d = String(v).replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 10) return fmtCPF(d.padStart(11, '0')); // CPF que perdeu o zero da frente
  return String(v).trim();
}

export function padronizar(campo: string, valor: string): string {
  if (valor === '') return valor;
  if (campo === 'telefone') return fmtTel(valor);
  if (campo === 'cpf') return fmtCPF(valor);
  if (SEM_CAIXA_ALTA.has(campo)) return valor.trim();
  return caixaAlta(valor.trim());
}

/** Aplica padronizar() a todos os campos string de um objeto (exceto ids e datas ISO). */
export function padronizarObjeto<T extends Record<string, unknown>>(obj: T, ignorar: string[] = []): T {
  const saida: Record<string, unknown> = { ...obj };
  for (const [k, v] of Object.entries(saida)) {
    if (typeof v !== 'string' || !v) continue;
    if (k === 'id' || k.endsWith('Id') || ignorar.includes(k)) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) continue;
    saida[k] = padronizar(k, v);
  }
  return saida as T;
}
