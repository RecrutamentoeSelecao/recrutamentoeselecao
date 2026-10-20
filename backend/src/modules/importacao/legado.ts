/**
 * Leitura do formato legado: dados.json (texto puro ou "cofre" cifrado) e "PACOTE R&S FAGRON"
 * (cópia de segurança em base64). A cifra replica o index.html (L3930–4110):
 *   chave da pessoa = PBKDF2-SHA256(senha, sal, 310.000) → AES-GCM-256
 *   chave de dados  = AES-GCM-decrypt(emb.ct, iv=emb.iv)   (embrulhada por pessoa)
 *   conteúdo        = AES-GCM-decrypt(ct, iv) com a chave de dados → JSON do estado S
 */
import { webcrypto } from 'node:crypto';
import { regraNegocio } from '../../shared/errors.js';

const ITER = 310_000;
const subtle = webcrypto.subtle;
const deb64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64'));

interface Embrulho { sal: string; iv: string; ct: string }
interface UsuarioCofre { id?: string; nome?: string; papel?: string; ativo?: boolean; emb: Embrulho }
interface Cofre { cofre: number; ct: string; iv: string; usuarios?: UsuarioCofre[]; admin?: Embrulho; equipe?: Embrulho }

export const ehCofre = (d: unknown): d is Cofre => {
  const c = d as Cofre | null;
  return !!(c && c.cofre && c.ct && ((c.usuarios && c.usuarios.length) || c.admin || c.equipe));
};

function usuariosDoCofre(c: Cofre): UsuarioCofre[] {
  if (c.usuarios?.length) return c.usuarios.map((u) => ({ ativo: true, ...u }));
  const us: UsuarioCofre[] = [];
  if (c.admin) us.push({ id: 'U1', nome: 'ADMINISTRADORA', papel: 'admin', ativo: true, emb: c.admin });
  if (c.equipe) us.push({ id: 'U2', nome: 'EQUIPE', papel: 'equipe', ativo: true, emb: c.equipe });
  return us;
}

async function abrirCofre(c: Cofre, senha: string): Promise<unknown> {
  for (const u of usuariosDoCofre(c).filter((x) => x.ativo !== false)) {
    try {
      const base = await subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
      const k = await subtle.deriveKey({ name: 'PBKDF2', salt: deb64(u.emb.sal), iterations: ITER, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const cru = await subtle.decrypt({ name: 'AES-GCM', iv: deb64(u.emb.iv) }, k, deb64(u.emb.ct));
      const dk = await subtle.importKey('raw', cru, { name: 'AES-GCM' }, false, ['decrypt']);
      const claro = await subtle.decrypt({ name: 'AES-GCM', iv: deb64(c.iv) }, dk, deb64(c.ct));
      return JSON.parse(new TextDecoder().decode(claro));
    } catch {
      /* não era a senha desta pessoa */
    }
  }
  throw regraNegocio('Senha do cofre incorreta: não foi possível decifrar os dados');
}

/** Aceita objeto JSON, texto JSON ou bloco "----- PACOTE R&S FAGRON -----". Devolve o estado S em claro. */
export async function abrirEntradaLegada(entrada: unknown, senha?: string): Promise<Record<string, unknown>> {
  let dados: unknown = entrada;
  if (typeof entrada === 'string') {
    const t = entrada.trim();
    if (t.startsWith('{')) dados = JSON.parse(t);
    else {
      const bruto = t.replace(/-{3,}[^\n]*-{3,}/g, '').replace(/\s+/g, '');
      try {
        dados = JSON.parse(Buffer.from(bruto, 'base64').toString('utf8'));
      } catch {
        throw regraNegocio('Conteúdo não reconhecido: envie o dados.json ou o bloco do pacote inteiro');
      }
    }
  }
  if (ehCofre(dados)) {
    if (!senha) throw regraNegocio('Os dados estão cifrados (cofre). Informe a senha de uma pessoa cadastrada no sistema antigo.');
    dados = await abrirCofre(dados, senha);
  }
  const d = dados as Record<string, unknown> | null;
  if (d && d.pacote && d.estado) return d.estado as Record<string, unknown>;
  if (!d || typeof d !== 'object' || !Array.isArray(d.vagas)) throw regraNegocio('Formato inesperado: falta a coleção "vagas"');
  return d;
}

/** Para testes e ferramentas: cifra um estado no mesmo formato do legado. */
export async function cifrarComoLegado(estado: unknown, senha: string): Promise<Cofre> {
  const rnd = (n: number) => webcrypto.getRandomValues(new Uint8Array(n));
  const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');
  const dk = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const sal = rnd(16);
  const ivEmb = rnd(12);
  const base = await subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  const k = await subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const emb = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: ivEmb }, k, await subtle.exportKey('raw', dk)));
  const iv = rnd(12);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, dk, new TextEncoder().encode(JSON.stringify(estado))));
  return { cofre: 1, iv: b64(iv), ct: b64(ct), usuarios: [{ id: 'U1', nome: 'ADMINISTRADORA', papel: 'admin', ativo: true, emb: { sal: b64(sal), iv: b64(ivEmb), ct: b64(emb) } }] };
}
