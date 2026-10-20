/** Regras PURAS do contrato de estágio CIEE (calcContrato, index.html L2100). Dias ÚTEIS com feriados. */
import { type DataISO, type Feriados, diasUteisEntre, somarDiasUteis } from '../../shared/datas.js';

export const ehEstagio = (cargo: string | null | undefined): boolean => /ESTAGI/i.test(cargo ?? '');

export interface CalculoContrato {
  limite: DataISO | null;
  diasRetorno: number | null;
  diasAssinatura: number | null;
  prazo: { k: 'neut' | 'crit' | 'warn' | 'ok' | 'good'; t: string };
  situacao: { k: 'neut' | 'good' | 'warn'; t: string };
}

export function limiteCiee(solic: DataISO, slaCiee: number, feriados: Feriados): DataISO {
  return somarDiasUteis(solic, slaCiee, feriados);
}

export function calcularContrato(
  k: { nome: string; solic: DataISO | null; retorno: DataISO | null; assinado: DataISO | null },
  hoje: DataISO,
  slaCiee: number,
  feriados: Feriados,
): CalculoContrato {
  const sla = slaCiee || 2;
  const limite = k.solic ? limiteCiee(k.solic, sla, feriados) : null;
  const diasRetorno = k.solic && k.retorno ? diasUteisEntre(k.solic, k.retorno, feriados) : null;
  const diasAssinatura = k.retorno && k.assinado ? diasUteisEntre(k.retorno, k.assinado, feriados) : null;
  let prazo: CalculoContrato['prazo'];
  if (!k.solic || !limite) prazo = { k: 'neut', t: '—' };
  else if (!k.retorno) {
    const rest = diasUteisEntre(hoje, limite, feriados);
    prazo = rest < 0 ? { k: 'crit', t: `atrasado há ${-rest}d úteis` }
      : rest === 0 ? { k: 'warn', t: 'vence hoje' }
      : { k: 'ok', t: `faltam ${rest}d úteis` };
  } else {
    prazo = diasRetorno! <= sla ? { k: 'good', t: `no prazo (${diasRetorno}d)` }
      : { k: 'crit', t: `${diasRetorno! - sla}d além do prazo` };
  }
  const situacao: CalculoContrato['situacao'] = !k.nome ? { k: 'neut', t: '—' }
    : k.assinado ? { k: 'good', t: 'Assinado' }
    : k.retorno ? { k: 'warn', t: 'Aguardando assinatura' }
    : { k: 'warn', t: 'Aguardando CIEE' };
  return { limite, diasRetorno, diasAssinatura, prazo, situacao };
}
