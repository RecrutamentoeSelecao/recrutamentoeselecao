import { restricaoGestor } from '../../shared/auth/rbac.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { dateParaISO } from '../../shared/datas.js';
import { hoje } from '../../shared/hoje.js';
import { prisma } from '../../shared/prisma.js';
import { carregarContexto } from '../configuracao/repository.js';
import { calcularVaga } from '../vagas/regras.js';
import { etapasAlinhadas } from '../vagas/repository.js';
import { type Balde, type TipoCompromisso, indicadoresExperiencia, indicadoresVagas, listarCompromissos } from './regras.js';
import * as repo from './repository.js';

async function montar(ator: Ator) {
  const ctx = await carregarContexto(prisma);
  const dia = hoje();
  const f = await repo.fotografia(prisma, restricaoGestor(ator));
  const vagas = f.vagas.map((v) => ({
    id: v.id, codigo: v.codigo, cargo: v.cargo, empresa: v.empresa, aprovado: v.aprovado, status: v.status,
    abertura: dateParaISO(v.abertura), inicio: dateParaISO(v.inicio), medirSla: v.medirSla, etapas: etapasAlinhadas(v.etapas, ctx.regua),
  }));
  const experiencias = f.experiencias.map((e) => ({ id: e.id, nome: e.nome, admissao: dateParaISO(e.admissao), prorrog: e.prorrog, efetiv: e.efetiv }));
  return { ctx, dia, f, vagas, experiencias };
}

export async function indicadores(ator: Ator) {
  const { ctx, dia, vagas, experiencias } = await montar(ator);
  const linhas = vagas.map((v) => ({ empresa: v.empresa, abertura: v.abertura, inicio: v.inicio, calc: calcularVaga(v, ctx.regua, ctx.params, dia) }));
  return {
    hoje: dia,
    vagas: indicadoresVagas(linhas, ctx.regua, ctx.params.metaSla, dia),
    experiencia: indicadoresExperiencia(experiencias, ctx.params, dia),
    agingCarteira: vagas.map((v, i) => ({ id: v.id, codigo: v.codigo, cargo: v.cargo, empresa: v.empresa, dias: linhas[i]!.calc.dias, farol: linhas[i]!.calc.farol }))
      .filter((_, i) => linhas[i]!.calc.aberta && linhas[i]!.calc.dias != null)
      .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0)),
  };
}

export async function compromissos(ator: Ator, filtro: { tipos?: TipoCompromisso[]; baldes?: Balde[] }) {
  const { ctx, dia, f, vagas, experiencias } = await montar(ator);
  const lista = listarCompromissos({
    vagas, experiencias,
    contratos: f.contratos.map((k) => ({ id: k.id, nome: k.nome, solic: dateParaISO(k.solic), retorno: dateParaISO(k.retorno) })),
    integracoes: f.integracoes.map((g) => ({ id: g.id, nome: g.nome, admissao: dateParaISO(g.admissao), feito: g.feito })),
    uniformes: f.uniformes.map((u) => ({ id: u.id, nome: u.nome, admissao: dateParaISO(u.admissao), entregue: u.entregue })),
    notas: f.notas.map((n) => ({ id: n.id, texto: n.texto, quando: dateParaISO(n.quando), feito: n.feito })),
  }, ctx, dia);
  return lista.filter((c) => (!filtro.tipos?.length || filtro.tipos.includes(c.tipo)) && (!filtro.baldes?.length || filtro.baldes.includes(c.balde)));
}
