/**
 * Aplica no banco o plano calculado por planejarPropagacao(). Sempre dentro da transação
 * da mutação que disparou (editar vaga, datar etapa, aprovar, mexer no checklist).
 */
import { auditar } from '../../shared/audit/auditoria.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { PREFIXOS, proximoCodigo } from '../../shared/codigos.js';
import { type DataISO, dateParaISO } from '../../shared/datas.js';
import { datasParaBanco } from '../../shared/http/conversao.js';
import type { Tx } from '../../shared/prisma.js';
import { percentualChecklist } from '../admissoes/regras.js';
import type { ContextoNegocio } from '../configuracao/repository.js';
import { vagaAprovada } from '../vagas/regras.js';
import { etapasAlinhadas } from '../vagas/repository.js';
import { type VagaOrigem, diferencas, planejarPropagacao } from './regras.js';

const DATAS = ['admissao', 'limite1', 'limite2', 'solic', 'retorno', 'assinado', 'dataIntegr', 'nascimento', 'dataEntrega'] as const;

export interface ResultadoPropagacao {
  criados: { entidade: string; id: string; codigo: string }[];
  espelhados: number;
}

/** Datas do registro como ISO, para comparar com o plano (que é todo em ISO). */
function comoISO(reg: Record<string, unknown>): Record<string, unknown> {
  const r = { ...reg };
  for (const c of DATAS) if (r[c] instanceof Date) r[c] = dateParaISO(r[c] as Date);
  return r;
}

export async function propagarVaga(tx: Tx, ator: Ator, vagaId: string, ctx: ContextoNegocio, hoje: DataISO): Promise<ResultadoPropagacao> {
  const v = await tx.vaga.findUniqueOrThrow({
    where: { id: vagaId },
    include: { etapas: true, admissao: { include: { itens: true } }, experiencia: true, integracao: true, contrato: true, uniforme: true },
  });
  const etapas = etapasAlinhadas(v.etapas, ctx.regua);
  const origem: VagaOrigem = {
    codigo: v.codigo,
    aprovada: vagaAprovada({ status: v.status, etapas }, ctx.regua.length, ctx.coresStatus.get(v.status)),
    aprovado: v.aprovado, empresa: v.empresa, cargo: v.cargo, depto: v.depto, gestor: v.gestor, tipo: v.tipo,
    inicio: dateParaISO(v.inicio),
  };
  const plano = planejarPropagacao(origem, {
    admissao: v.admissao ? { pct: percentualChecklist(v.admissao.itens) } : null,
    experiencia: !!v.experiencia, integracao: !!v.integracao, contrato: !!v.contrato, uniforme: !!v.uniforme,
  }, ctx.params, hoje);

  const res: ResultadoPropagacao = { criados: [], espelhados: 0 };
  const registrar = async (entidade: string, reg: { id: string; codigo: string }) => {
    res.criados.push({ entidade, id: reg.id, codigo: reg.codigo });
    await auditar(tx, ator, { acao: 'PROPAGACAO', entidade, entidadeId: reg.id, depois: { ...reg, vaga: v.codigo } });
  };

  if (plano.criarAdmissao) {
    const a = await tx.admissao.create({
      data: {
        codigo: await proximoCodigo(tx, PREFIXOS.admissao), vagaId, obs: plano.criarAdmissao.obs,
        itens: { create: ctx.checklist.map((tarefa, i) => ({ ordem: i + 1, tarefa, resposta: 'NAO' as const })) },
      },
    });
    await registrar('Admissao', a);
  }
  if (plano.criarExperiencia) {
    const e = await tx.experiencia.create({ data: { ...datasParaBanco(plano.criarExperiencia, DATAS), codigo: await proximoCodigo(tx, PREFIXOS.experiencia), vagaId } as never });
    await registrar('Experiencia', e);
  }
  if (plano.criarIntegracao) {
    const g = await tx.integracao.create({ data: { ...datasParaBanco(plano.criarIntegracao, DATAS), codigo: await proximoCodigo(tx, PREFIXOS.integracao), vagaId } as never });
    await registrar('Integracao', g);
  }
  if (plano.criarContrato) {
    const k = await tx.contratoEstagio.create({ data: { ...datasParaBanco(plano.criarContrato, DATAS), codigo: await proximoCodigo(tx, PREFIXOS.contrato), vagaId } as never });
    await registrar('ContratoEstagio', k);
  }
  if (plano.criarUniforme) {
    const u = await tx.uniforme.create({ data: { ...datasParaBanco(plano.criarUniforme, DATAS), codigo: await proximoCodigo(tx, PREFIXOS.uniforme), vagaId } as never });
    await registrar('Uniforme', u);
  }

  // Espelho: só nos registros que já existiam e nasceram desta vaga.
  const espelhar = async (entidade: string, reg: Record<string, unknown> | null, desejado: Record<string, unknown>,
    atualizar: (id: string, data: Record<string, unknown>) => Promise<unknown>) => {
    if (!reg) return;
    const atual = comoISO(reg);
    const mud = diferencas(atual, desejado);
    if (!Object.keys(mud).length) return;
    await atualizar(reg.id as string, datasParaBanco(mud, DATAS));
    const antes = Object.fromEntries(Object.keys(mud).map((k) => [k, atual[k]]));
    await auditar(tx, ator, { acao: 'PROPAGACAO', entidade, entidadeId: reg.id as string, antes, depois: mud });
    res.espelhados++;
  };
  await espelhar('Experiencia', v.experiencia, plano.espelho.experiencia, (id, data) => tx.experiencia.update({ where: { id }, data }));
  await espelhar('Integracao', v.integracao, plano.espelho.integracao, (id, data) => tx.integracao.update({ where: { id }, data }));
  await espelhar('Uniforme', v.uniforme, plano.espelho.uniforme, (id, data) => tx.uniforme.update({ where: { id }, data }));
  await espelhar('ContratoEstagio', v.contrato, plano.espelho.contrato, (id, data) => tx.contratoEstagio.update({ where: { id }, data }));

  return res;
}
