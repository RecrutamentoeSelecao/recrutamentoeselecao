/**
 * Importa o dados.json (ou o pacote de cópia de segurança) do sistema antigo direto no banco.
 *   npm run importar -- caminho/dados.json [--gravar] [--senha-env VAR]
 * Sem --gravar roda em modo simulação. A senha do cofre é lida da variável de ambiente
 * indicada em --senha-env (padrão SENHA_COFRE) para não ficar no histórico do shell.
 */
import { readFile } from 'node:fs/promises';
import { importarLegado } from '../src/modules/importacao/service.js';
import { prisma } from '../src/shared/prisma.js';

const args = process.argv.slice(2);
const arquivo = args.find((a) => !a.startsWith('--'));
if (!arquivo) {
  console.error('Uso: npm run importar -- <dados.json|pacote.txt> [--gravar] [--senha-env VAR]');
  process.exit(1);
}
const gravar = args.includes('--gravar');
const iEnv = args.indexOf('--senha-env');
const senha = process.env[iEnv >= 0 ? args[iEnv + 1] ?? 'SENHA_COFRE' : 'SENHA_COFRE'];

try {
  const texto = await readFile(arquivo, 'utf8');
  const r = await importarLegado({ id: null, nome: 'IMPORTACAO-CLI', papel: 'SISTEMA' }, texto, { senha, simular: !gravar });
  console.log(JSON.stringify(r, null, 2));
  if (!gravar) console.log('\n(simulação — nada foi gravado; use --gravar para importar)');
} catch (e) {
  console.error('Falha na importação:', (e as Error).message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
