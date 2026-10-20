import type { z } from 'zod';
import { auditar } from '../../shared/audit/auditoria.js';
import type { Ator } from '../../shared/auth/tipos.js';
import { PREFIXOS } from '../../shared/codigos.js';
import { criarCrud } from '../../shared/crud.js';
import { paginar } from '../../shared/http/schemas.js';
import { prisma } from '../../shared/prisma.js';
import * as repo from './repository.js';
import type * as s from './schemas.js';

export const crud = criarCrud({ entidade: 'Nota', prefixo: PREFIXOS.nota, datas: ['quando'], delegate: repo.delegate, semPadronizar: ['texto'] });

export async function listar(f: z.infer<typeof s.filtroNotas>) {
  const linhas = (await repo.listar(prisma, f)).map((n) => crud.apresentar(n as never));
  return paginar(linhas, f.pagina, f.porPagina);
}

export const criar = (ator: Ator, d: z.infer<typeof s.notaCriar>) => crud.criar(ator, { ...d, autorId: ator.id });
export const concluir = (ator: Ator, id: string) => crud.atualizar(ator, id, { feito: true });

export async function limparConcluidas(ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const antes = await repo.concluidas(tx);
    const r = await repo.apagarConcluidas(tx);
    await auditar(tx, ator, { acao: 'EXCLUIR', entidade: 'Nota', antes: antes.map((n) => n.codigo), depois: { apagadas: r.count } });
    return { apagadas: r.count };
  });
}
