import argon2 from 'argon2';

const OPCOES = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const gerarHashSenha = (senha: string): Promise<string> => argon2.hash(senha, OPCOES);

export async function conferirSenha(hash: string, senha: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, senha);
  } catch {
    return false;
  }
}

/** Hash fixo usado quando o e-mail não existe, para não vazar isso pelo tempo de resposta. */
let hashFalso: Promise<string> | null = null;
export const hashParaTempoConstante = (): Promise<string> => (hashFalso ??= gerarHashSenha('senha-inexistente-0000'));
