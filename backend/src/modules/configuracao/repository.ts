import type { Db } from '../../shared/prisma.js';
import { type Feriados, conjuntoFeriados, dateParaISO } from '../../shared/datas.js';
import { type EtapaReguaDef, type Parametros, REGUA_PADRAO, mesclarParametros } from './regras.js';

export interface ContextoNegocio {
  params: Parametros;
  regua: EtapaReguaDef[];
  feriados: Feriados;
  checklist: string[];
  coresStatus: Map<string, string | null>;
}

/** Tudo que as regras puras precisam, lido de uma vez. */
export async function carregarContexto(db: Db): Promise<ContextoNegocio> {
  const [params, etapas, feriados, itens] = await Promise.all([
    db.parametro.findMany(),
    db.etapaRegua.findMany({ orderBy: { ordem: 'asc' } }),
    db.feriado.findMany(),
    db.itemLista.findMany({ where: { lista: { in: ['checklist', 'statusVaga'] } }, orderBy: { ordem: 'asc' } }),
  ]);
  return {
    params: mesclarParametros(Object.fromEntries(params.map((p) => [p.chave, p.valor]))),
    regua: etapas.length ? etapas : REGUA_PADRAO,
    feriados: conjuntoFeriados(feriados.map((f) => dateParaISO(f.data)!)),
    checklist: itens.filter((i) => i.lista === 'checklist').map((i) => i.valor),
    coresStatus: new Map(itens.filter((i) => i.lista === 'statusVaga').map((i) => [i.valor, i.cor])),
  };
}
