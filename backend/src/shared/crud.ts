/**
 * CRUD auditado genérico para os módulos de controle (integração, contratos, uniformes, notas, experiência).
 * Cada mutação: transação → padroniza texto → converte datas → grava → audit log (antes/depois).
 */
import { auditar, delta } from './audit/auditoria.js';
import type { Ator } from './auth/tipos.js';
import { proximoCodigo } from './codigos.js';
import { naoEncontrado } from './errors.js';
import { datasParaBanco, paraResposta, semIndefinidos } from './http/conversao.js';
import { type Db, type Tx, prisma } from './prisma.js';
import { padronizarObjeto } from './texto.js';

type Registro = Record<string, unknown> & { id: string };

/** Subconjunto do delegate do Prisma que o CRUD usa (tipado de forma frouxa de propósito). */
export interface DelegateCrud {
  findUnique(args: { where: { id: string } }): Promise<Registro | null>;
  create(args: { data: never }): Promise<Registro>;
  update(args: { where: { id: string }; data: never }): Promise<Registro>;
  delete(args: { where: { id: string } }): Promise<Registro>;
}

export interface OpcoesCrud {
  entidade: string;
  prefixo?: string;
  datas: readonly string[];
  /** Campos que não passam pela caixa alta (além de email/cpf/telefone) */
  semPadronizar?: string[];
  delegate: (db: Db) => DelegateCrud;
  /** Ajusta os dados antes de gravar (ex.: recalcular limites da experiência) */
  preparar?: (dados: Record<string, unknown>, atual: Registro | null) => Record<string, unknown>;
  /** Roda dentro da transação depois de gravar (ex.: propagação) */
  depois?: (tx: Tx, ator: Ator, reg: Registro) => Promise<void>;
}

export function criarCrud(o: OpcoesCrud) {
  const apresentar = (r: Registro) => paraResposta(r, o.datas);

  async function obter(id: string, db: Db = prisma) {
    const r = await o.delegate(db).findUnique({ where: { id } });
    if (!r) throw naoEncontrado(o.entidade, id);
    return r;
  }

  async function criar(ator: Ator, dados: Record<string, unknown>) {
    return prisma.$transaction(async (tx) => {
      let d = semIndefinidos(padronizarObjeto(dados, o.semPadronizar));
      if (o.preparar) d = o.preparar(d, null);
      if (o.prefixo) d.codigo = await proximoCodigo(tx, o.prefixo);
      const r = await o.delegate(tx).create({ data: datasParaBanco(d, o.datas) as never });
      await auditar(tx, ator, { acao: 'CRIAR', entidade: o.entidade, entidadeId: r.id, depois: r });
      if (o.depois) await o.depois(tx, ator, r);
      return apresentar(r);
    });
  }

  async function atualizar(ator: Ator, id: string, dados: Record<string, unknown>) {
    return prisma.$transaction(async (tx) => {
      const antes = await obter(id, tx);
      let d = semIndefinidos(padronizarObjeto(dados, o.semPadronizar));
      if (o.preparar) d = o.preparar(d, antes);
      const r = await o.delegate(tx).update({ where: { id }, data: datasParaBanco(d, o.datas) as never });
      const mud = delta(apresentar(antes), apresentar(r));
      delete mud.antes.atualizadoEm;
      delete mud.depois.atualizadoEm;
      await auditar(tx, ator, { acao: 'ATUALIZAR', entidade: o.entidade, entidadeId: id, ...mud });
      if (o.depois) await o.depois(tx, ator, r);
      return apresentar(r);
    });
  }

  async function excluir(ator: Ator, id: string) {
    await prisma.$transaction(async (tx) => {
      const antes = await obter(id, tx);
      await o.delegate(tx).delete({ where: { id } });
      await auditar(tx, ator, { acao: 'EXCLUIR', entidade: o.entidade, entidadeId: id, antes });
    });
  }

  return { obter, criar, atualizar, excluir, apresentar };
}
