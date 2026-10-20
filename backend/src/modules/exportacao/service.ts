/** Exportação CSV (";" + BOM), com as colunas calculadas — como o exportarCSV do legado, mas com download real. */
import { auditar } from '../../shared/audit/auditoria.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { type ColunaCsv, gerarCsv } from '../../shared/csv.js';
import { hoje } from '../../shared/hoje.js';
import { prisma } from '../../shared/prisma.js';
import * as admissoes from '../admissoes/service.js';
import * as contratos from '../contratos/service.js';
import * as experiencias from '../experiencias/service.js';
import * as integracoes from '../integracoes/service.js';
import * as uniformes from '../uniformes/service.js';
import * as vagas from '../vagas/service.js';

export const RECURSOS = ['vagas', 'experiencias', 'admissoes', 'integracoes', 'contratos', 'uniformes'] as const;
export type Recurso = (typeof RECURSOS)[number];

const TUDO = { pagina: 1, porPagina: 1_000_000 } as const;
type Linha = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const col = (titulo: string, valor: (l: Linha) => unknown): ColunaCsv<Linha> => ({ titulo, valor });

async function montar(ator: Ator, r: Recurso): Promise<{ linhas: Linha[]; colunas: ColunaCsv<Linha>[] }> {
  switch (r) {
    case 'vagas': {
      const { itens } = await vagas.listar(ator, { ...TUDO, filtro: 'todas' });
      const nEtapas = itens[0]?.etapas.length ?? 0;
      return {
        linhas: itens,
        colunas: [
          col('ID', (l) => l.codigo), col('Status', (l) => l.status), col('Empresa', (l) => l.empresa), col('Cargo', (l) => l.cargo),
          col('Departamento', (l) => l.depto), col('Tipo', (l) => l.tipo), col('Substituído', (l) => l.substituido), col('Gestor', (l) => l.gestor),
          col('Salário', (l) => l.salario), col('Abertura', (l) => l.abertura),
          ...Array.from({ length: nEtapas }, (_, i) => col(itens[0]!.etapas[i]!.nome, (l) => l.etapas[i]?.data)),
          col('Aprovado', (l) => l.aprovado), col('Admissão', (l) => l.inicio),
          col('Farol', (l) => l.calculado.farol), col('Dias em aberto', (l) => l.calculado.dias), col('Etapa atual', (l) => l.calculado.etapaNome),
          col('Dias na etapa', (l) => l.calculado.diasEtapa), col('SLA', (l) => l.calculado.statusSla), col('Etapas atrasadas', (l) => l.calculado.etapasAtrasadas),
          col('TTF', (l) => l.calculado.ttf), col('TTH', (l) => l.calculado.tth), col('Obs', (l) => l.obs),
        ],
      };
    }
    case 'experiencias': {
      const { itens } = await experiencias.listar(ator, { ...TUDO, filtro: 'todas' });
      return {
        linhas: itens,
        colunas: [
          col('ID', (l) => l.codigo), col('Vaga', (l) => l.vagaCodigo), col('Nome', (l) => l.nome), col('Empresa', (l) => l.empresa),
          col('Cargo', (l) => l.cargo), col('Gestor', (l) => l.gestor), col('Admissão', (l) => l.admissao),
          col('Limite 45', (l) => l.limite1), col('Prorrogado', (l) => l.prorrog), col('Limite 90', (l) => l.limite2), col('Efetivado', (l) => l.efetiv),
          col('Dias de casa', (l) => l.calculado.diasDeCasa), col('Marco 45', (l) => l.calculado.m1.t), col('Marco 90', (l) => l.calculado.m2.t),
          col('Ação', (l) => l.calculado.acao), col('Obs', (l) => l.obs),
        ],
      };
    }
    case 'admissoes': {
      const { itens } = await admissoes.listar({ ...TUDO, filtro: 'todas' });
      return {
        linhas: itens,
        colunas: [
          col('ID', (l) => l.codigo), col('Vaga', (l) => l.vaga.codigo), col('Colaborador', (l) => l.vaga.aprovado), col('Empresa', (l) => l.vaga.empresa),
          col('Cargo', (l) => l.vaga.cargo), col('Início', (l) => l.vaga.inicio), col('% concluído', (l) => l.calculado.pct),
          col('Próxima pendência', (l) => l.calculado.proxima), col('Situação', (l) => l.calculado.situacao.t),
          col('Checklist', (l) => (l.itens as { tarefa: string; resposta: string }[]).map((i) => `${i.tarefa}: ${i.resposta}`).join(' | ')),
        ],
      };
    }
    case 'integracoes': {
      const { itens } = await integracoes.listar({ ...TUDO, filtro: 'todas' });
      return {
        linhas: itens,
        colunas: [
          col('ID', (l) => l.codigo), col('Admissão', (l) => l.admissao), col('Empresa', (l) => l.empresa), col('Nome', (l) => l.nome),
          col('Setor', (l) => l.setor), col('Gestor', (l) => l.gestor), col('Feito', (l) => l.feito), col('Data integração', (l) => l.dataIntegr),
          col('Situação', (l) => l.calculado.t), col('Dias até integrar', (l) => l.calculado.dias), col('Obs', (l) => l.obs),
        ],
      };
    }
    case 'contratos': {
      const { itens } = await contratos.listar({ ...TUDO, filtro: 'todos' });
      return {
        linhas: itens,
        colunas: [
          col('ID', (l) => l.codigo), col('Empresa', (l) => l.empresa), col('Estagiário', (l) => l.nome), col('Instituição', (l) => l.faculdade),
          col('Solicitação', (l) => l.solic), col('Limite CIEE', (l) => l.calculado.limite), col('Retorno', (l) => l.retorno),
          col('Dias úteis de retorno', (l) => l.calculado.diasRetorno), col('Assinado', (l) => l.assinado),
          col('Prazo', (l) => l.calculado.prazo.t), col('Situação', (l) => l.calculado.situacao.t), col('Obs', (l) => l.obs),
        ],
      };
    }
    case 'uniformes': {
      const { itens } = await uniformes.listar({ ...TUDO, filtro: 'todos' });
      return {
        linhas: itens,
        colunas: [
          col('ID', (l) => l.codigo), col('Empresa', (l) => l.empresa), col('Nome', (l) => l.nome), col('Vaga', (l) => l.tipoVaga),
          col('Nascimento', (l) => l.nascimento), col('Telefone', (l) => l.telefone), col('CPF', (l) => l.cpf), col('Admissão', (l) => l.admissao),
          col('Cargo', (l) => l.cargo), col('Setor', (l) => l.setor), col('Terceiro', (l) => l.terceiro), col('Sapato', (l) => l.sapato),
          col('Camisa', (l) => l.camisa), col('Calça', (l) => l.calca), col('Entregue', (l) => l.entregue), col('Data entrega', (l) => l.dataEntrega),
          col('Obs', (l) => l.obs),
        ],
      };
    }
  }
}

export async function exportar(ator: Ator, recurso: Recurso) {
  const { linhas, colunas } = await montar(ator, recurso);
  const csv = gerarCsv(linhas, colunas);
  await auditar(prisma, ator, { acao: 'EXPORTAR', entidade: recurso, depois: { linhas: linhas.length, formato: 'csv' } });
  return { csv, nomeArquivo: `${recurso}-${hoje()}.csv` };
}
