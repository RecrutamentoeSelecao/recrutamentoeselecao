# Backend — Controle de Vagas, SLA e Experiência

API REST que substitui o armazenamento em arquivo único (`dados.json` / `localStorage` / sincronização via GitHub) do `index.html` por um backend com banco relacional, autenticação real, controle de acesso no servidor, trilha de auditoria e tratamento LGPD. As regras de negócio foram levantadas em `docs/01-inventario-sistema-atual.md` e conferidas no `index.html` (as funções do legado estão citadas nos comentários do código).

**Stack:** Node 22 + TypeScript · Fastify 5 · Prisma 6 + PostgreSQL 16 · Zod 4 · JWT (access) + refresh token opaco com rotação · argon2id · Vitest · OpenAPI 3 (`@fastify/swagger`).

## Como rodar

### Opção 1 — Docker Compose (PostgreSQL + API)

```bash
cd backend
export JWT_ACCESS_SECRET="$(openssl rand -base64 48)"
docker compose up -d --build          # sobe o banco e a API (aplica as migrações no start)
# primeiro usuário ADMIN (rodar da máquina, apontando para o banco do compose):
DATABASE_URL="postgresql://rs:rs-dev-local@localhost:5432/rs_fagron?schema=public" \
SEED_ADMIN_EMAIL=voce@empresa.com SEED_ADMIN_SENHA='uma-senha-forte' npm run seed
```

API em `http://localhost:3333`, documentação interativa em `http://localhost:3333/docs`.

### Opção 2 — Local

```bash
cd backend
cp .env.example .env                  # preencha DATABASE_URL e JWT_ACCESS_SECRET
npm install
npx prisma migrate deploy             # cria as tabelas (prisma/migrations)
npm run seed                          # régua de 8 etapas, parâmetros, status de vaga e o ADMIN
npm run dev                           # http://localhost:3333 (recarrega ao salvar)
```

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `npm start` | API em modo desenvolvimento / produção (`dist/`) |
| `npm run build` | Compila para `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: regras puras + HTTP sem banco (não precisa de PostgreSQL) |
| `npm run openapi` | Gera `openapi.json` (sem banco) |
| `npm run importar -- dados.json [--gravar]` | Migra o `dados.json`/pacote do sistema antigo (veja abaixo) |
| `npx tsx scripts/smoke-e2e.ts` | Teste ponta a ponta contra uma API rodando com banco (`API_URL`, `SMOKE_EMAIL`, `SMOKE_SENHA`) |

## Arquitetura

Organização por domínio. Cada módulo tem `routes.ts` (HTTP + RBAC + schema Zod/OpenAPI), `service.ts` (casos de uso, transação, auditoria), `repository.ts` (Prisma), `schemas.ts` (Zod) e, quando há regra de negócio, `regras.ts` com **funções puras** (sem banco, sem relógio: `hoje` entra como parâmetro), cobertas por testes unitários.

```
                    ┌──────────────────────────── Fastify ────────────────────────────┐
  HTTP  ──────────► │ helmet · cors · rate-limit · @fastify/jwt · Zod (validação)     │
                    │ swagger (/docs) · tratamento de erros (AppError/Prisma/Zod)       │
                    └───────────────┬──────────────────────────────────────────────────┘
                                    │ preHandler permitir(...papéis)  → 401 / 403
            ┌───────────────────────▼────────────────────────┐
            │ modules/<domínio>/routes.ts                     │
            │   auth · usuarios · configuracao · vagas ·      │
            │   candidatos · candidaturas · admissoes ·       │
            │   experiencias · integracoes · contratos ·      │
            │   uniformes · notas · painel · exportacao ·     │
            │   importacao · auditoria                        │
            └───────────────────────┬────────────────────────┘
                                    │
            ┌───────────────────────▼────────────────────────┐      ┌──────────────────────────┐
            │ service.ts  ── prisma.$transaction ──┐          │      │ regras.ts (PURAS)         │
            │   1. carrega contexto (parâmetros,   │          │◄────►│ vagas: SLA, farol, TTF/TTH│
            │      régua, feriados, checklist)     │          │      │ experiencias: 45/90       │
            │   2. grava a mutação                 │          │      │ contratos: CIEE dias úteis│
            │   3. propagarVaga() ──► plano puro   │          │      │ admissoes: % checklist    │
            │   4. auditar(antes, depois)          │          │      │ propagacao: plano vaga→…  │
            └───────────────────────┬──────────────┘          │      │ painel: calendário/baldes │
                                    │                         │      │ candidatos: retenção LGPD │
            ┌───────────────────────▼────────────────────────┐      └──────────────────────────┘
            │ repository.ts (Prisma Client) → PostgreSQL      │
            └─────────────────────────────────────────────────┘

  shared/  errors · datas (dias úteis/feriados) · texto (caixa alta, CPF, telefone) · csv
           auth (rbac, senha argon2id, tipos JWT) · audit (auditar, delta) · codigos (V0001…) · crud auditado
```

### Propagação "a vaga manda"

```
Vaga aprovada (data da etapa Aprovação OU status fechado) ──► Admissão (1:1, checklist copiado da Base)
Admissão + empresa = empresaIntegracao + aprovado ───────────► Integração
Admissão + cargo contém "ESTAGI" + aprovado ─────────────────► Contrato CIEE (solicitação = hoje)
Admissão + empresa ∈ empresasUniforme + aprovado ────────────► Uniforme
Admissão com checklist 100% ─────────────────────────────────► Experiência (limites 45/90 calculados)
Editar a vaga (início, aprovado, empresa, cargo, depto, gestor, tipo) ──► espelha nos registros nascidos dela
```

`propagacao/regras.ts → planejarPropagacao()` calcula **o que** criar/espelhar (puro, testado); `propagacao/service.ts` aplica dentro da mesma transação da mutação e registra cada criação/espelho no audit log (`acao = PROPAGACAO`). Cada registro nasce uma única vez por vaga; registros manuais (sem vaga) nunca são espelhados.

## Regras de negócio implementadas

| Regra | Onde | Legado |
|---|---|---|
| SLA por etapa: prazo = abertura + SLA acumulado (dias **corridos**); sem data e vencida = ATRASADO; DENTRO se nenhuma atrasada; só com `medirSla` | `vagas/regras.ts` `flagsSla` | `calcVaga` L955 |
| Farol de aging: ≤ 0,7×SLA total saudável; ≤ 1,0 atenção; acima crítico; aprovada/encerrada = concluída | `farolAging` | L990 |
| Aging para na aprovação; TTF = abertura → admissão; TTH = Divulgação → Aprovação | `calcularVaga` | regras 4–5 |
| Calendário: próxima etapa em **dias úteis** (sáb., dom. e feriados da Base fora) | `proximaEtapaPendente`, `painel/regras.ts` | `compromissos` L2803 |
| Experiência: limite1 = admissão + 45 − 1; limite2 = admissão + 90 − 1 (corridos); alerta ≤ 7 dias; não prorrogado encerra aos 45 | `experiencias/regras.ts` | `calcExp` L1001 |
| CIEE: limite = solicitação + 2 dias úteis com feriados; retorno/assinatura em dias úteis | `contratos/regras.ts` | `calcContrato` L2100 |
| Admissão: % = SIM ÷ (itens − N/A); ≤ 5 dias para o início = alerta; início passado sem 100% = "Admitido com pendência" | `admissoes/regras.ts` | `calcAdm` L1905 |
| Integração: pendente > 30 dias = crítico; N/A sai da fila | `integracoes/regras.ts` | `calcIntegr` L2010 |
| Texto em CAIXA ALTA (exceto e-mail, CPF, telefone, currículo); máscaras de CPF e telefone; empresa comparada sem caixa/acento | `shared/texto.ts` | L1173–1204 |
| Renomear item da Base propaga para os registros | `configuracao/service.ts` | `renomearValor` |

Os limites (0,7 / 1,0 / 45 / 90 / 2 / 30 / 7 / 5 dias, metas) são **parâmetros** (`PUT /configuracao/parametros`), não constantes.

### Diferenças intencionais em relação ao legado

- **Vaga "em aberto":** no `index.html`, `c.aberta` lê `c.admissao` antes de atribuí-lo, então toda vaga com status aberto conta como aberta. Aqui segue a regra documentada: sai de "Em aberto" quando tem aprovação **e** data de admissão.
- **Integração N/A** não aparece no calendário (no legado aparecia, embora saísse da fila da aba).
- **Checklist da admissão** guarda o texto da tarefa em cada item (o legado guardava só a posição), então mudar a Base não desalinha admissões antigas.
- **Excluir vaga** apaga a admissão junto (1:1) e deixa experiência/integração/contrato/uniforme sem vínculo, em vez de órfãos com `idVaga` quebrado.
- **Códigos** continuam `V0001`, `A0001`… (sequência no banco). Na importação, o próximo número considera só os dígitos logo após a letra (`V0012EA7` → 12).

## Segurança, papéis e auditoria

- Senhas com **argon2id**; login com tempo constante para e-mail inexistente; rate limit de 10/min em login/refresh.
- **Access token JWT** (15 min, configurável) + **refresh token opaco** (guardado só como SHA-256, rotação a cada uso; reuso de um refresh já usado revoga todas as sessões da pessoa). Desativar a pessoa ou trocar a senha revoga as sessões.
- **Controle de acesso no servidor** (no legado era só na interface):

| Papel | Pode |
|---|---|
| `ADMIN` | Tudo: usuários, parâmetros/régua, exportar CSV, importar legado, auditoria, anonimizar/eliminar titular, excluir vaga/admissão |
| `RECRUTADOR` | Lançar e editar vagas, candidatos, candidaturas, admissão, experiência, integração, contratos, uniformes, notas, feriados e listas |
| `GESTOR` | Ler somente as vagas e experiências em que é o `gestorUsuarioId`; registrar decisão e avaliação de experiência |
| `LEITOR` | Somente leitura, **sem** candidatos e uniformes (CPF, nascimento, telefone, currículo) |

- **Audit log** (`audit_log`): toda mutação grava quem (id e nome), quando, ação, entidade, id, `antes` e `depois` (só os campos alterados nas edições), IP e user-agent, na **mesma transação**. Também registra login, falha de login, logout, exportação CSV, exportação de titular, importação e anonimização. Segredos (`senhaHash`, tokens) são redigidos.
- **Controle otimista** na vaga: envie `versao` no `PATCH`; se outra pessoa salvou antes, a API responde 409.

## LGPD

- `Candidato` tem **base legal**, data/versão do **consentimento**, revogação, **retenção** (`retencaoAte`, padrão hoje + `RETENCAO_CANDIDATO_MESES`) e `anonimizadoEm`. Cadastrar com base CONSENTIMENTO exige o aceite do termo. Deduplicação por CPF/e-mail.
- `GET /candidatos/{id}/dados-pessoais`: exporta tudo sobre o titular (dados, candidaturas, linha do tempo, registro de operações) — art. 18.
- `POST /candidatos/{id}/anonimizar`: apaga identificadores, mantém o registro para indicadores com pseudônimo não reversível e **expurga o conteúdo pessoal do audit log** desse titular (fica só o fato).
- `POST /candidatos/expurgo?simular=true|false`: rotina que anonimiza quem passou da retenção ou revogou o consentimento (contratados ficam de fora).
- Uniformes (CPF/nascimento/telefone) e candidatos ficam fora do alcance de `LEITOR` e `GESTOR`. Exportações CSV são só para ADMIN e auditadas.
- Pontos ainda a decidir com o jurídico: prazos de retenção por categoria (trabalhista × recrutamento), aviso de privacidade e criptografia de colunas sensíveis em repouso.

## Migração do sistema antigo

O importador lê o mesmo formato que o `index.html` grava: `dados.json` (ou o conteúdo de `localStorage['fagron-rs-html']`), **em claro ou cifrado pelo cofre** (PBKDF2-SHA256 310.000 + AES-GCM, igual ao legado), ou o texto do bloco `----- PACOTE R&S FAGRON -----` da "Cópia de segurança".

```bash
# simulação (não grava): mostra o resumo e os avisos
SENHA_COFRE='senha de uma pessoa do sistema antigo' npm run importar -- caminho/dados.json
# gravação
SENHA_COFRE='...' npm run importar -- caminho/dados.json --gravar
```

ou `POST /api/v1/importacao/legado` com `{ "dados": <json ou texto>, "senha": "...", "simular": true }` (ADMIN).

O que faz: régua (inclusive a conversão da régua antiga de 10 → 8 etapas e "Admissão concluída" → início), parâmetros, listas da Base com cores, feriados (`DD/MM/AAAA` ou ISO), vagas e datas das etapas, admissões com o checklist, experiência (limites recalculados), integração, contratos, uniformes, anotações e a coleção legada de candidatos (com base legal "legítimo interesse" e retenção, avisando para coletar consentimento). É **idempotente** (upsert por código) e roda numa transação. Vínculos quebrados, duplicidades e datas inválidas viram **avisos** em vez de erro. As senhas do cofre **não** são migradas: cadastre as pessoas em `/usuarios`.

## Pontos de extensão (benchmark `docs/02-benchmark-sistemas-rh.md`)

- Formulário de avaliação 45/90: `AvaliacaoExperiencia` (`nota`, `recomendacao`, `criterios` JSON) + `POST /experiencias/{id}/avaliacoes`.
- Linha do tempo por vaga e candidatura: `VagaHistorico`, `CandidaturaEvento` e o audit log.
- Scorecard estruturado de entrevista: `Candidatura.scorecard` (JSON).
- Visão restrita de gestor: `Vaga.gestorUsuarioId` + papel `GESTOR`.
- Deduplicação de candidatos por CPF/e-mail e rotina de expurgo LGPD.
- Indicadores (TTF/TTH, SLA por etapa, efetivação) prontos para conversão por fonte (`Candidatura.fonte`) e turnover precoce.

## Endpoints

Prefixo: `/api/v1` (exceto `/health` e `/docs`). Autenticação: `Authorization: Bearer <accessToken>`. Erros no formato `{ "erro": "CODIGO", "mensagem": "...", "detalhes": ... }` (400 validação, 401, 403, 404, 409 conflito/duplicidade/versão, 422 regra de negócio). Datas de negócio em `AAAA-MM-DD`.

#### Sistema

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/health` | Saúde do serviço |

#### Autenticação

| Método | Caminho | O que faz |
|---|---|---|
| POST | `/auth/login` | Entrar (access + refresh token) |
| POST | `/auth/refresh` | Renovar tokens (rotação do refresh) |
| POST | `/auth/logout` | Sair (revoga o refresh) |
| GET | `/auth/me` | Usuário atual |

#### Usuários

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/usuarios/` | Pessoas com acesso |
| POST | `/usuarios/` | Cadastrar pessoa (senha com hash argon2id) |
| PATCH | `/usuarios/{id}` | Editar papel, nome, senha ou ativo |
| DELETE | `/usuarios/{id}` | Desativar (revoga sessões) |

#### Configuração

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/configuracao/parametros` | Parâmetros e régua de SLA |
| PUT | `/configuracao/parametros` | Atualizar parâmetros (parcial) |
| PUT | `/configuracao/regua` | Substituir a régua de etapas/SLA |
| GET | `/configuracao/feriados` | Feriados (dias úteis) |
| POST | `/configuracao/feriados` | Cadastrar feriado |
| DELETE | `/configuracao/feriados/{data}` | Remover feriado |
| GET | `/configuracao/listas` | Todas as listas da Base |
| GET | `/configuracao/listas/{lista}` | Uma lista da Base |
| POST | `/configuracao/listas/{lista}` | Incluir item na lista |
| PATCH | `/configuracao/listas/{lista}/{id}` | Renomear/reordenar item (renomear propaga aos registros) |
| DELETE | `/configuracao/listas/{lista}/{id}` | Remover item da lista |

#### Vagas

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/vagas/` | Listar vagas com farol, SLA, TTF/TTH calculados |
| POST | `/vagas/` | Nova vaga (código V0001…, abertura = hoje) |
| GET | `/vagas/{id}` | Detalhe da vaga |
| PATCH | `/vagas/{id}` | Editar vaga (propaga para admissão/experiência/integração/contrato/uniforme) |
| DELETE | `/vagas/{id}` | Excluir vaga (admissão vai junto; demais ficam sem vínculo) |
| GET | `/vagas/{id}/historico` | Histórico de etapas/status com carimbo de tempo |
| PUT | `/vagas/{id}/etapas/{ordem}` | Datar (ou limpar com null) uma etapa da régua |
| POST | `/vagas/{id}/avancar` | Avançar etapa: data a próxima etapa pendente (padrão hoje) |
| POST | `/vagas/{id}/aprovar` | Aprovar candidato: data a Aprovação e cria a admissão |
| PUT | `/vagas/{id}/status` | Mudar status (FECHADA também gera admissão) |

#### Candidatos (LGPD)

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/candidatos/` | Listar candidatos (anonimizados ficam de fora por padrão) |
| POST | `/candidatos/` | Cadastrar candidato (com base legal e consentimento; deduplica por CPF/e-mail) |
| POST | `/candidatos/expurgo` | Rotina de expurgo LGPD (retenção vencida / consentimento revogado) |
| GET | `/candidatos/{id}` | Detalhe |
| PATCH | `/candidatos/{id}` | Editar |
| DELETE | `/candidatos/{id}` | Eliminar titular (exclusão física) |
| POST | `/candidatos/{id}/consentimento` | Registrar consentimento (versão do termo) |
| POST | `/candidatos/{id}/consentimento/revogar` | Revogar consentimento |
| GET | `/candidatos/{id}/dados-pessoais` | Exportar dados do titular (LGPD art. 18) |
| POST | `/candidatos/{id}/anonimizar` | Anonimizar titular (irreversível; expurga o audit log do registro) |

#### Candidaturas (funil)

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/candidaturas/` | Listar candidaturas + contagem do funil |
| POST | `/candidaturas/` | Inscrever candidato numa vaga |
| PATCH | `/candidaturas/{id}` | Editar (fonte, motivo, scorecard) |
| DELETE | `/candidaturas/{id}` | Excluir |
| POST | `/candidaturas/{id}/mover` | Mover de etapa no funil |
| GET | `/candidaturas/{id}/eventos` | Linha do tempo da candidatura |

#### Admissão

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/admissoes/` | Listar admissões com % do checklist e situação |
| POST | `/admissoes/lancar` | Lançar: varre as vagas aprovadas/fechadas e cria o que faltar |
| GET | `/admissoes/{id}` | Detalhe |
| PATCH | `/admissoes/{id}` | Editar observação |
| DELETE | `/admissoes/{id}` | Excluir |
| PUT | `/admissoes/{id}/itens/{ordem}` | Responder item do checklist (SIM/NAO/NA) |
| POST | `/admissoes/{id}/itens/{ordem}/alternar` | Alternar NÃO → SIM → N/A |
| POST | `/admissoes/{id}/concluir` | Concluir checklist → cria a experiência |

#### Experiência

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/experiencias/` | Listar com prazos 45/90, marcos e indicadores |
| POST | `/experiencias/` | Novo colaborador (manual, sem vaga) |
| GET | `/experiencias/{id}` | Detalhe com cálculo |
| PATCH | `/experiencias/{id}` | Editar (mudar admissão recalcula os limites) |
| DELETE | `/experiencias/{id}` | Excluir |
| POST | `/experiencias/{id}/decisao` | Registrar decisão de prorrogação (45) ou efetivação (90) |
| GET | `/experiencias/{id}/avaliacoes` | Avaliações registradas |
| POST | `/experiencias/{id}/avaliacoes` | Registrar avaliação de experiência (formulário 45/90) |

#### Integração

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/integracoes/` | Listar integrações com situação calculada |
| POST | `/integracoes/` | Nova integração (manual, sem vaga) |
| GET | `/integracoes/{id}` | Detalhe |
| PATCH | `/integracoes/{id}` | Editar |
| DELETE | `/integracoes/{id}` | Excluir |
| POST | `/integracoes/{id}/realizar` | Marcar como realizada (padrão hoje) |

#### Contratos de estágio (CIEE)

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/contratos/` | Listar contratos com prazo CIEE em dias úteis e indicadores |
| POST | `/contratos/` | Novo contrato (manual) |
| GET | `/contratos/{id}` | Detalhe |
| PATCH | `/contratos/{id}` | Editar |
| DELETE | `/contratos/{id}` | Excluir |
| POST | `/contratos/{id}/retorno` | Registrar retorno do CIEE (padrão hoje) |
| POST | `/contratos/{id}/assinatura` | Registrar assinatura (padrão hoje) |

#### Uniformes

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/uniformes/` | Listar uniformes |
| POST | `/uniformes/` | Novo uniforme (manual) |
| GET | `/uniformes/folha` | Folha em texto para impressão/fornecedor |
| GET | `/uniformes/{id}` | Detalhe |
| PATCH | `/uniformes/{id}` | Editar (tamanhos, CPF, telefone...) |
| DELETE | `/uniformes/{id}` | Excluir |
| POST | `/uniformes/{id}/entregar` | Registrar entrega (padrão hoje) |

#### Anotações

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/notas/` | Listar anotações |
| POST | `/notas/` | Nova anotação (até 400 caracteres, lembrete opcional) |
| PATCH | `/notas/{id}` | Editar |
| DELETE | `/notas/{id}` | Apagar |
| POST | `/notas/{id}/concluir` | Marcar como feita |
| DELETE | `/notas/concluidas` | Limpar concluídas |

#### Painel e Calendário

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/painel/` | Indicadores: aging, TTF, % no SLA, SLA por etapa, por empresa, experiência |
| GET | `/painel/compromissos` | Calendário: tudo que está pendente, com prazo e balde (atrasado/hoje/amanhã/semana/15 dias/depois) |

#### Exportação

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/exportacao/{recurso}.csv` | Baixar CSV (; e BOM, com colunas calculadas) |

#### Importação

| Método | Caminho | O que faz |
|---|---|---|
| POST | `/importacao/legado` | Migrar o dados.json / localStorage / pacote do sistema antigo (idempotente, upsert por código) |

#### Auditoria

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/auditoria/` | Consultar o audit log |

## Testes e verificação

- `npm test` — 87 testes (Vitest), **sem banco**: regras puras (datas e dias úteis, SLA/farol/TTF/TTH, experiência 45/90, CIEE, admissão, propagação, calendário, LGPD, conversão do legado, decifragem do cofre) e HTTP com `fastify.inject` (OpenAPI, 401, 403 por papel, 400 de validação).
- `scripts/smoke-e2e.ts` — fluxo completo contra API + PostgreSQL reais (login/refresh, vaga → aprovar → admissão/integração/uniforme → concluir checklist → experiência → espelho → CIEE com feriado → painel/calendário → CSV → LGPD → auditoria → importação cifrada idempotente).
