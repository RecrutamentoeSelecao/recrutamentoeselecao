/**
 * Semente: régua padrão de 8 etapas, parâmetros, status de vaga com cores e o primeiro ADMIN.
 * Idempotente. Lê SEED_ADMIN_EMAIL / SEED_ADMIN_SENHA do ambiente (nunca versione valores reais).
 */
import { PrismaClient } from '@prisma/client';
import { PARAMETROS_PADRAO, REGUA_PADRAO, STATUS_VAGA_PADRAO } from '../src/modules/configuracao/regras.js';
import { gerarHashSenha } from '../src/shared/auth/senha.js';

const prisma = new PrismaClient();

async function main() {
  for (const e of REGUA_PADRAO) await prisma.etapaRegua.upsert({ where: { ordem: e.ordem }, create: e, update: {} });
  for (const [chave, valor] of Object.entries(PARAMETROS_PADRAO)) {
    await prisma.parametro.upsert({ where: { chave }, create: { chave, valor }, update: {} });
  }
  for (const [i, s] of STATUS_VAGA_PADRAO.entries()) {
    await prisma.itemLista.upsert({ where: { lista_valor: { lista: 'statusVaga', valor: s.valor } }, create: { lista: 'statusVaga', valor: s.valor, cor: s.cor, ordem: i + 1 }, update: {} });
  }
  for (const [i, t] of ['PP', 'P', 'M', 'G', 'GG', 'XG'].entries()) {
    await prisma.itemLista.upsert({ where: { lista_valor: { lista: 'tamanhos', valor: t } }, create: { lista: 'tamanhos', valor: t, ordem: i + 1 }, update: {} });
  }
  for (const [i, t] of ['NOVA POSIÇÃO', 'SUBSTITUIÇÃO'].entries()) {
    await prisma.itemLista.upsert({ where: { lista_valor: { lista: 'tipoVaga', valor: t } }, create: { lista: 'tipoVaga', valor: t, ordem: i + 1 }, update: {} });
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.SEED_ADMIN_SENHA;
  if (email && senha) {
    if (senha.length < 10) throw new Error('SEED_ADMIN_SENHA precisa de ao menos 10 caracteres');
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (!existe) {
      await prisma.usuario.create({ data: { nome: 'ADMINISTRADORA', email, papel: 'ADMIN', senhaHash: await gerarHashSenha(senha) } });
      console.log(`ADMIN criado: ${email}`);
    }
  } else {
    console.log('SEED_ADMIN_EMAIL/SEED_ADMIN_SENHA ausentes: nenhum usuário criado');
  }
}

main().finally(() => prisma.$disconnect());
