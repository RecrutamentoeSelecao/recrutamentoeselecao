import { env } from '../config/env.js';
import { type DataISO, hojeISO } from './datas.js';

/** "Hoje" do negócio (dia civil no fuso configurado). */
export const hoje = (): DataISO => hojeISO(env.TZ_NEGOCIO);
