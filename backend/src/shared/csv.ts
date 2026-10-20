/**
 * CSV no padrão do legado (exportarCSV, index.html L4462): separador ";" e BOM UTF-8
 * para abrir certo no Excel em pt-BR. Agora com download real.
 */
export interface ColunaCsv<T> {
  titulo: string;
  valor: (linha: T) => unknown;
}

function celula(v: unknown): string {
  if (v == null) return '';
  let s: string;
  if (v instanceof Date) s = v.toISOString().slice(0, 10);
  else if (typeof v === 'number') s = String(Math.round(v * 10000) / 10000).replace('.', ',');
  else if (typeof v === 'boolean') s = v ? 'SIM' : 'NÃO';
  else {
    s = String(v);
    // Neutraliza injeção de fórmula (=, +, -, @) ao abrir no Excel
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  }
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function gerarCsv<T>(linhas: T[], colunas: ColunaCsv<T>[]): string {
  const cab = colunas.map((c) => celula(c.titulo)).join(';');
  const corpo = linhas.map((l) => colunas.map((c) => celula(c.valor(l))).join(';'));
  return '﻿' + [cab, ...corpo].join('\r\n') + '\r\n';
}
