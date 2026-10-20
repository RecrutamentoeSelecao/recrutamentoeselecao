/** Erro de domínio com status HTTP. Tudo que não for AppError vira 500 sem vazar detalhe. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly codigo: string,
    message: string,
    public readonly detalhes?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const naoEncontrado = (entidade: string, id?: string) =>
  new AppError(404, 'NAO_ENCONTRADO', `${entidade} não encontrado(a)${id ? `: ${id}` : ''}`);
export const conflito = (msg: string, detalhes?: unknown) => new AppError(409, 'CONFLITO', msg, detalhes);
export const regraNegocio = (msg: string, detalhes?: unknown) => new AppError(422, 'REGRA_NEGOCIO', msg, detalhes);
export const naoAutenticado = (msg = 'Não autenticado') => new AppError(401, 'NAO_AUTENTICADO', msg);
export const proibido = (msg = 'Sem permissão para esta ação') => new AppError(403, 'PROIBIDO', msg);
