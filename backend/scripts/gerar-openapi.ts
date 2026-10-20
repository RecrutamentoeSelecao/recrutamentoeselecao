/** Gera openapi.json a partir das rotas (não precisa de banco). npm run openapi */
import { writeFile } from 'node:fs/promises';
import { construirApp } from '../src/app.js';

const app = await construirApp({ logger: false });
await app.ready();
await writeFile('openapi.json', JSON.stringify(app.swagger(), null, 2));
const caminhos = Object.keys((app.swagger() as { paths: object }).paths);
console.log(`openapi.json gerado com ${caminhos.length} caminhos`);
await app.close();
