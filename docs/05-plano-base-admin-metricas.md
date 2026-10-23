# 05 — Plano de implementação: Solução 4, Base do Admin (métricas sem interferência nos resultados)

> **Status:** só planejamento. Nenhum código, migração ou commit foi feito.
> **Escopo escolhido:** apenas a Solução 4 de `04-cinco-solucoes-testes.md`. As Soluções 1 (Big Five) e 2 (banco de provas) **não** entram, então este plano inclui um **núcleo mínimo de avaliação** para que existam dados a medir.
> **Base:** `04-cinco-solucoes-testes.md` (premissas e Solução 4), `04b` §3–4 (CFP/LGPD, RBAC, métricas, checklist), `04a` §3 (modelo e pontuação), `backend/` (Fastify 5 + Prisma 6 + PostgreSQL 16, 22 modelos, `permitir(...)`, `auditar(tx, ...)`).

---

## 1. Objetivo e princípio central

**Objetivo:** dar ao Admin um painel de métricas sobre os testes (funil, tempo, qualidade dos itens, confiabilidade, equidade, funil até a contratação, validade preditiva), com **garantia técnica, e não só de interface,** de que olhar, recalcular ou exportar métricas nunca altera o resultado de nenhum candidato.

**Princípio: o Admin mede e não interfere.** Neste sistema, "não interferir" quer dizer seis regras verificáveis:

| # | Regra | Como é garantida |
|---|---|---|
| I1 | Não existe rota de escrita em `respostas_item`, `resultados_avaliacao`, `eventos_sessao` nem nos itens e gabaritos de uma versão **publicada**, para nenhum papel, Admin incluído | Rotas inexistentes + `REVOKE UPDATE, DELETE` + *triggers* no Postgres (seção 3.2) |
| I2 | O Admin **não vê resultado individual identificado** (nome, CPF, candidatura) | O módulo `metricas` lê só views sem identificadores; agregados com N mínimo (seção 5.0) |
| I3 | As métricas **não realimentam** aplicações em curso: nenhuma métrica ou alerta muda nota, corte, etapa da candidatura, status de sessão ou ordenação de candidatos | O serviço de métricas usa o papel de banco `rs_metricas` (somente `SELECT` nas fontes) e só grava na sua própria tabela de *snapshots* |
| I4 | Desativar item, mudar gabarito ou corte **só vale para versões futuras**. A sessão fica presa à versão do convite, e resultados passados nunca são recalculados | `SessaoAvaliacao.versaoTesteId` imutável; versão publicada congelada por *trigger*; desativar = nova versão em rascunho |
| I5 | Toda escrita (e toda leitura de resultado individual) fica no audit log **encadeado por hash** | Colunas de cadeia em `audit_log`, preenchidas por *trigger* + rota de verificação |
| I6 | Nenhuma eliminação automática (LGPD art. 20) | Corte só sugere ("abaixo do corte"); a mudança de etapa da candidatura continua sendo ação humana em `candidaturas` |

**Decisão: o Admin não vê resultado individual identificado, nem quando é a mesma pessoa que recruta.**
Justificativa: (a) separação de funções (04b §4.1): quem governa o catálogo e as métricas não deve ver nem influenciar casos concretos; (b) hoje `Usuario.papel` é **um único papel**, e quem precisa recrutar usa uma conta `RECRUTADOR` separada, o que deixa cada acesso atribuível no log; (c) LGPD (necessidade e minimização): o painel agregado cumpre a finalidade do Admin. **Única exceção:** a exportação do titular (`GET /candidatos/{id}/dados-pessoais`, art. 18), que hoje é do Admin/DPO. Ela passa a incluir os resultados do titular, exige motivo e é auditada como `EXPORTAR_TITULAR`. É leitura e não altera nada.

**Consequência no código atual:** o README diz que o `ADMIN` pode "tudo". O plano retira do `ADMIN` qualquer escrita no domínio de avaliação, exceto no catálogo (aprovar a publicação de uma **nova** versão, aposentar uma versão e propor a desativação de itens, que gera nova versão). Também bloqueia `DELETE /vagas/{id}` quando houver sessões vinculadas (409), porque hoje `Candidatura` usa `onDelete: Cascade`.

---

## 2. Núcleo mínimo de avaliação (necessário porque as Soluções 1 e 2 não foram escolhidas)

| Entra (mínimo) | Fica para depois |
|---|---|
| `TesteAvaliacao` (catálogo) + `VersaoTeste` imutável depois de publicada, com `hashConteudo` e `hashGabarito` (SHA-256 de JSON canônico) e corte fixado na publicação | Banco de itens Big Five/IPIP (Sol. 1) e provas prontas (Sol. 2) |
| `ItemAvaliacao` com `codigo` estável entre versões, tipos **objetivos**: `ESCOLHA_UNICA`, `ESCOLHA_MULTIPLA`, `LIKERT` (pontuação `match_correct`, `map_response` e soma Likert com chave ±1) | Itens dissertativos, código (Judge0), correção cega com rubrica (Sol. 3) |
| `SessaoAvaliacao` ligada a `Candidatura`, convite por token de uso único (`tokenHash`), semente de embaralhamento, prazo controlado no servidor | Proctoring por imagem (desligado; dado biométrico) |
| `RespostaItem` **append-only**: o autosave insere uma nova linha (`seq`) e vale a última antes do envio | Normas/percentis, TRI, DIF Mantel-Haenszel |
| `ResultadoAvaliacao` imutável, com `algoritmoVersao`, `hashGabarito` e `hashRespostas`, pontuado no servidor | Recorreção formal com dupla aprovação (desenho em 9.4) |
| `EventoSessao` (blur/focus/colar/retomada): só informativo, nunca muda nota | Integração por API/webhook com fornecedores (Sol. 5) |
| **Importação de resultado externo** (manual, JSON/CSV), gravada como `ResultadoAvaliacao` com `origem = EXTERNO`, somente leitura, com `payloadOriginal` e hash | Conector automático por fornecedor |
| Página pública mínima de aplicação (`aplicacao.html`, sem login, via token) | Acomodações PCD avançadas (o campo `acomodacoes` já existe; a UI de Libras e similares fica para depois) |

Classificação obrigatória do teste (04b §4.6): `CONHECIMENTO | TECNICO | COMPORTAMENTAL_NAO_PRIVATIVO | PSICOLOGICO_PRIVATIVO`. `PSICOLOGICO_PRIVATIVO` só pode ser publicado com o parâmetro `modoPsicologo = true` e um `responsavelCrpId` (CFP 31/2022). Os rótulos da UI seguem 04b §3.1 (sem "teste psicológico", "laudo" ou "QI").

---

## 3. Modelo de dados proposto (Prisma, mesmo estilo do `schema.prisma`)

### 3.1 Esquema

> O nome `Resposta` já é um enum (SIM/NAO/NA) e `Nota` já é um modelo. Por isso o plano usa `RespostaItem` e `pontuacao`.

```prisma
enum Papel { ADMIN RECRUTADOR GESTOR LEITOR PSICOLOGO_CRP }        // + PSICOLOGO_CRP (opcional, via parâmetro)

enum ClassificacaoTeste { CONHECIMENTO TECNICO COMPORTAMENTAL_NAO_PRIVATIVO PSICOLOGICO_PRIVATIVO }
enum StatusVersaoTeste  { RASCUNHO EM_APROVACAO PUBLICADA APOSENTADA }
enum TipoItemAvaliacao  { ESCOLHA_UNICA ESCOLHA_MULTIPLA LIKERT }
enum StatusSessao       { CONVIDADA EM_ANDAMENTO ENVIADA PONTUADA EXPIRADA CANCELADA }
enum OrigemResultado    { INTERNO EXTERNO }

model Usuario { /* ...existente... */ crp String? }                 // obrigatório quando papel = PSICOLOGO_CRP

model TesteAvaliacao {
  id                String             @id @default(uuid())
  codigo            String             @unique                       // T0001 (Sequencia)
  nome              String
  classificacao     ClassificacaoTeste
  responsavelCrpId  String?
  criadoEm          DateTime           @default(now())
  versoes           VersaoTeste[]
  @@map("testes_avaliacao")
}

/// Imutável depois de PUBLICADA (trigger). Desativar item ou mudar gabarito = nova versão.
model VersaoTeste {
  id               String            @id @default(uuid())
  testeId          String
  teste            TesteAvaliacao    @relation(fields: [testeId], references: [id], onDelete: Restrict)
  versao           Int
  status           StatusVersaoTeste @default(RASCUNHO)
  instrucoes       String            @default("")
  tempoLimiteSeg   Int?
  embaralharItens  Boolean           @default(true)
  corte            Decimal?          @db.Decimal(8, 2)               // fixado antes de aplicar (Angoff etc.)
  metodoCorte      String            @default("NENHUM")
  hashConteudo     String?                                           // SHA-256 dos itens sem gabarito
  hashGabarito     String?                                           // SHA-256 de gabarito + pontos + corte
  baseadaEmId      String?                                           // versão anterior
  motivoMudanca    String            @default("")                    // ex.: "item Q7 desativado: rpb < 0"
  autorId          String
  aprovadoPorId    String?                                           // != autorId (4 olhos)
  publicadaEm      DateTime?
  aposentadaEm     DateTime?
  itens            ItemAvaliacao[]
  sessoes          SessaoAvaliacao[]
  @@unique([testeId, versao])
  @@map("versoes_teste")
}

model ItemAvaliacao {
  id           String            @id @default(uuid())
  versaoId     String
  versao       VersaoTeste       @relation(fields: [versaoId], references: [id], onDelete: Restrict)
  codigo       String                                                // estável entre versões (métricas por item)
  ordem        Int
  tipo         TipoItemAvaliacao
  enunciado    String
  opcoes       Json                                                  // [{id, texto}] — o que o candidato vê
  gabarito     Json                                                  // NUNCA serializado para a aplicação
  chave        Int               @default(1)                         // LIKERT: +1 / -1 (invertido)
  pontos       Decimal           @default(1) @db.Decimal(8, 2)
  @@unique([versaoId, codigo])
  @@map("itens_avaliacao")
}

model SessaoAvaliacao {
  id             String          @id @default(uuid())
  versaoTesteId  String                                              // presa ao convite (I4)
  versaoTeste    VersaoTeste     @relation(fields: [versaoTesteId], references: [id], onDelete: Restrict)
  candidaturaId  String
  candidatura    Candidatura     @relation(fields: [candidaturaId], references: [id], onDelete: Restrict)
  tokenHash      String          @unique
  status         StatusSessao    @default(CONVIDADA)                 // trigger: só transições para a frente
  semente        String
  acomodacoes    Json?                                               // tempo extra PCD (não é sinal de fraude)
  convidadaPorId String
  convidadaEm    DateTime        @default(now())
  iniciadaEm     DateTime?
  expiraEm       DateTime
  enviadaEm      DateTime?
  respostas      RespostaItem[]
  eventos        EventoSessao[]
  resultados     ResultadoAvaliacao[]
  @@index([candidaturaId])
  @@index([versaoTesteId, status])
  @@map("sessoes_avaliacao")
}

/// APPEND-ONLY. Autosave = nova linha; vale a de maior seq por item até enviadaEm.
model RespostaItem {
  id         BigInt          @id @default(autoincrement())
  sessaoId   String
  sessao     SessaoAvaliacao @relation(fields: [sessaoId], references: [id], onDelete: Restrict)
  itemId     String
  valorBruto Json                                                    // opção(ões)/posição escolhida — nunca score
  rtMs       Int?
  seq        Int
  em         DateTime        @default(now())
  @@unique([sessaoId, itemId, seq])
  @@map("respostas_item")
}

model EventoSessao {                                                 // APPEND-ONLY, só informativo
  id       BigInt          @id @default(autoincrement())
  sessaoId String
  sessao   SessaoAvaliacao @relation(fields: [sessaoId], references: [id], onDelete: Restrict)
  tipo     String                                                    // blur|focus|colar|retomada|fullscreen_exit
  itemId   String?
  em       DateTime        @default(now())
  @@map("eventos_sessao")
}

/// IMUTÁVEL. Correção futura = nova linha com substituiId (nunca UPDATE).
model ResultadoAvaliacao {
  id              String              @id @default(uuid())
  origem          OrigemResultado     @default(INTERNO)
  sessaoId        String?                                            // null quando EXTERNO
  sessao          SessaoAvaliacao?    @relation(fields: [sessaoId], references: [id], onDelete: Restrict)
  candidaturaId   String
  versaoTesteId   String?
  hashGabarito    String?                                            // cópia: prova qual gabarito foi usado
  hashRespostas   String?                                            // SHA-256 das respostas finais usadas
  algoritmoVersao String                                             // ex.: "pontuacao@1.0.0"
  pontuacao       Decimal?            @db.Decimal(10, 2)
  maximo          Decimal?            @db.Decimal(10, 2)
  porItem         Json?                                              // [{codigo, acerto|valor}] — base da psicometria
  abaixoDoCorte   Boolean?                                           // só sugestão (I6)
  sinaisIntegridade Json?
  fornecedor      String?                                            // EXTERNO
  payloadOriginal Json?                                              // EXTERNO, como recebido
  substituiId     String?
  motivo          String?
  checksum        String                                             // SHA-256 da própria linha (teste de aceite)
  calculadoEm     DateTime            @default(now())
  @@index([candidaturaId])
  @@index([versaoTesteId])
  @@map("resultados_avaliacao")
}

/// LGPD art. 11: opt-in, finalidade exclusiva de auditoria de equidade. SEM relação Prisma com Candidato
/// (não dá para usar include), e a aplicação NÃO tem SELECT (inserção por $executeRaw sem RETURNING).
model DemografiaEquidade {
  id               String   @id @default(uuid())
  candidatoId      String   @unique
  consentimentoEm  DateTime
  termoVersao      String
  faixaEtaria      String?
  genero           String?
  racaCor          String?                                           // categorias IBGE
  pcd              Boolean?
  @@map("equidade_demografia")
}

model SnapshotMetrica {                                              // única tabela que o serviço de métricas grava
  id              String   @id @default(uuid())
  tipo            String                                             // FUNIL|ITENS|ALFA|EQUIDADE|VALIDADE...
  escopo          Json                                               // {versaoTesteId, periodo, empresa...}
  n               Int
  valores         Json
  algoritmoVersao String
  hashEntrada     String                                             // hash das linhas lidas (reprodutível)
  calculadoEm     DateTime @default(now())
  @@index([tipo, calculadoEm])
  @@map("snapshots_metrica")
}

model AuditLog { /* ...existente... */
  seq           BigInt  @unique @default(autoincrement())
  hashConteudo  String?                                              // SHA-256(antes||depois), sobrevive à anonimização
  hashAnterior  String?
  hash          String?                                              // SHA-256(hashAnterior||seq||em||usuarioId||acao||entidade||entidadeId||hashConteudo)
}
```

Relações reversas a adicionar: `Candidatura.sessoesAvaliacao`. Se `TesteAvaliacao` usar código legível, ele entra em `Sequencia` com o prefixo `T`.

### 3.2 Proteções no banco (migração SQL manual ao lado da gerada pelo Prisma)

1. **Papéis Postgres** (`prisma/sql/papeis.sql`, executado pela operação porque exige superusuário): `rs_owner` (migrações), `rs_app` (API), `rs_metricas` (somente leitura + `INSERT` em `snapshots_metrica`, `default_transaction_read_only` desligado só nessa tabela via função) e `rs_lgpd` (expurgo). Hoje o `docker-compose.yml` usa um usuário só, e isso muda.
2. `REVOKE UPDATE, DELETE ON respostas_item, eventos_sessao, resultados_avaliacao FROM rs_app;` e `REVOKE UPDATE, DELETE ON audit_log FROM rs_app` (com exceção da função de anonimização, item 6).
3. **Triggers** `BEFORE UPDATE OR DELETE` → `RAISE EXCEPTION 'imutavel'` nas mesmas tabelas. Elas valem também para quem é dono da tabela, como defesa em profundidade.
4. Trigger em `versoes_teste`/`itens_avaliacao`: com `OLD.status IN ('PUBLICADA','APOSENTADA')`, bloqueia qualquer mudança, exceto `status → APOSENTADA` e `aposentadaEm`. Bloqueia `INSERT` de item em versão que não esteja em `RASCUNHO`. Exige `aprovadoPorId <> autorId` para publicar.
5. Trigger em `sessoes_avaliacao`: impede mudar `versaoTesteId`, `candidaturaId` e `semente`. Aceita só transições para a frente (`CONVIDADA→EM_ANDAMENTO→ENVIADA→PONTUADA`, `→EXPIRADA`, `CONVIDADA→CANCELADA`). Trigger em `respostas_item`: rejeita `INSERT` se a sessão não estiver `EM_ANDAMENTO` ou se `now() > expiraEm` (com acomodação somada).
6. **Cadeia de hash do audit log:** trigger `BEFORE INSERT` com `pg_advisory_xact_lock` calcula `hashConteudo`, `hashAnterior` (= `hash` da última linha) e `hash`. A aplicação não consegue forjar a cadeia. A anonimização LGPD existente (que expurga `antes/depois`) passa a ser feita pela função `SECURITY DEFINER lgpd_redigir_auditoria(candidatoId)`. Ela troca só o conteúdo e **preserva** `hashConteudo`, então a cadeia continua verificável. Âncora diária: job grava o último `hash` em `ancora_auditoria` e no log da aplicação. Cópia WORM fica para depois.
7. **Expurgo do titular (art. 18 VI):** função `rs_lgpd.expurgar_avaliacoes(candidatoId, motivo)` com `SET LOCAL app.expurgo_lgpd = on`, que as triggers aceitam. Ela apaga `respostas_item`/`eventos_sessao` do titular, mantém o `ResultadoAvaliacao` pseudonimizado (sem `payloadOriginal`) para as estatísticas e audita a operação. Na rotina `/candidatos/expurgo`, contratados continuam fora.
8. `equidade_demografia`: `GRANT INSERT, DELETE` para `rs_app` (sem `SELECT`), `SELECT` só para `rs_metricas`.
9. **Views materializadas** (dono `rs_metricas`, sem identificadores): `mv_aval_sessoes` (versão, empresa, cargo, depto, mês, status, duração, pontuação, aprovado/contratado), `mv_aval_itens` (versão, código do item, acerto/valor, pontuação total da sessão), `mv_aval_equidade` (grupo × etapa, já **agregada**) e `mv_aval_validade` (pontuação × nota/recomendação 45/90). Refresh `CONCURRENTLY` noturno ou sob demanda. Se houver réplica de leitura, `DATABASE_URL_METRICAS` aponta para ela.

---

## 4. Papéis e permissões

`CANDIDATO` não é um `Papel` de login: acessa só por token de uso único da sessão. `PSICOLOGO_CRP` só fica ativo com o parâmetro `modoPsicologo`.

| Ação | ADMIN | RECRUTADOR | GESTOR | LEITOR | PSICOLOGO_CRP | CANDIDATO |
|---|---|---|---|---|---|---|
| Criar teste/rascunho de versão (itens, gabarito, corte) | — | ✔ | — | — | ✔ | — |
| Aprovar publicação (≠ autor) | ✔ (não privativo) | ✔ (≠ autor) | — | — | ✔ (privativo: só ele) | — |
| Aposentar versão / propor desativação de item (gera nova versão) | ✔ | ✔ | — | — | ✔ | — |
| Ver gabarito de versão | só durante a aprovação | ✔ | — | — | ✔ | **nunca** |
| Convidar candidato / cancelar convite não iniciado | — | ✔ | — | — | ✔ | — |
| Responder teste | — | — | — | — | — | ✔ (1×/sessão) |
| Ver resultado individual da vaga | **—** (exceto exportação do titular) | ✔ (auditado) | resumo da sua vaga | — | ✔ | devolutiva própria |
| Ver respostas item a item | — | não privativo | — | — | ✔ | — |
| Importar resultado externo | — | ✔ | — | — | ✔ | — |
| Alterar resposta/resultado/gabarito publicado | **ninguém** | **ninguém** | **ninguém** | **ninguém** | **ninguém** | **ninguém** |
| Pedir revisão humana (art. 20) | — | ✔ | — | — | ✔ | ✔ |
| Métricas agregadas (psicometria, funil, validade) | ✔ todas | só suas vagas/testes | só suas vagas | só funil agregado | ✔ | — |
| Equidade (4/5) | ✔ agregada, N mín. | — | — | — | ✔ agregada | — |
| Dados demográficos individuais | **nunca** | **nunca** | **nunca** | **nunca** | **nunca** | os próprios (opt-in/revogar) |
| Exportar | CSV agregado; exportação do titular (LGPD) | lista da vaga | — | — | — | — |
| Verificar cadeia de auditoria | ✔ | — | — | — | — | — |

Implementação: novas constantes em `shared/auth/rbac.ts` (`AUTORES_TESTE`, `LEEM_RESULTADO`, `LEEM_METRICAS`). `PSICOLOGO_CRP` **não** entra em `TODOS`, para não ganhar acesso a vagas e uniformes por tabela. O escopo "só suas vagas" reaproveita `restricaoGestor` e o filtro por `vagaId`.

---

## 5. Catálogo de métricas

### 5.0 Regras gerais
- Calculadas por `metricas/regras.ts` (**funções puras**, mesmo padrão de `vagas/regras.ts`), sobre as linhas das views. O `service.ts` usa um `PrismaClient` próprio (`prismaMetricas`, papel `rs_metricas`).
- **Supressão (k-anonimato, k = 5):** qualquer célula, filtro ou combinação com N < 5 aparece como "< 5". Grupos demográficos pequenos são somados em "Outros/Não informado", com **supressão secundária** quando o total menos as células visíveis revelaria a célula suprimida. Não há filtro por vaga isolada quando N < 5.
- Cada número traz `n`, período, versão do teste e `algoritmoVersao`. Abaixo do N mínimo, o painel mostra "amostra insuficiente" em vez do valor.
- Alertas são **somente informativos** (I3/I6): viram tarefa de revisão do catálogo e nunca mexem em candidaturas.
- Métricas por item usam só `origem = INTERNO`. Resultados externos entram em funil, distribuição e validade.

### 5.1 Tabela

| Métrica | Fórmula / definição | N mínimo | Verde | Amarelo | Vermelho (alerta) |
|---|---|---|---|---|---|
| Taxa de início | iniciadas ÷ convidadas | 10 convites | ≥ 80% | 60–80% | < 60% |
| Taxa de conclusão | enviadas ÷ iniciadas | 10 iniciadas | ≥ 85% | 70–85% | < 70% |
| Abandono por item | sessões cujo último item respondido foi i ÷ abandonos | 20 abandonos | — | item com > 2× a média | item com > 3× a média (UX/acessibilidade) |
| Tempo | mediana, P10, P90 da duração; mediana por item (`rtMs`) | 10 enviadas | — | P90 > 90% do limite | sessão < P10/2 → só contagem de alertas de integridade |
| Distribuição | histograma, média, DP, % no teto e % no chão | 30 resultados | teto/chão ≤ 20% | — | teto ou chão > 20% |
| Dificuldade p | acertos ÷ respondentes do item (Likert: média ÷ máximo) | 30/item (ideal 100) | 0,30–0,80 | 0,20–0,30 ou 0,80–0,90 | < 0,20 ou > 0,90 |
| Discriminação | ponto-bisserial **corrigida** r_pb = (M₁ − M₀)/s · √(p·q), com total sem o item | 50/item (ideal 100) | ≥ 0,30 | 0,20–0,30 | < 0,20; **< 0 = suspeita de gabarito** |
| Distratores | % de escolha por opção; média total por opção | 50/item | — | opção com 0% | distrator mais escolhido que o gabarito no tercil superior |
| α de Cronbach | k/(k−1)·(1 − Σσ²ᵢ/σ²ₜ) + "α se item removido" | 50 sessões e k ≥ 5 | ≥ 0,70 | 0,60–0,70 | < 0,60 ("não usar como corte") |
| Impacto adverso (4/5) | taxa de aprovação no teste (e de avanço de etapa) do grupo ÷ maior taxa; + Fisher exato (bilateral) e IC 95% | **30 avaliados por grupo** e ≥ 5 selecionados no grupo de referência; célula exibida só com n ≥ 5 | razão ≥ 0,80 | < 0,80 sem significância (p ≥ 0,05) | < 0,80 **e** p < 0,05 |
| Funil teste → contratação | convidados → enviados → acima do corte → entrevista → `APROVADO` (`CandidaturaEvento`) → `Admissao` → efetivado (`Experiencia.efetiv = SIM`) | 20 por coorte | — | conversão abaixo do corte > acima (corte invertido?) | — |
| Validade preditiva | Spearman ρ entre a pontuação e `AvaliacaoExperiencia.nota` (PRIMEIRO_PERIODO = 45 d, SEGUNDO_PERIODO = 90 d); ponto-bisserial com efetivado (EFETIVAR) × não; IC 95% por z de Fisher | 30 pares | ρ ≥ 0,20 | 0,10–0,20 | ρ ≤ 0 ou IC inclui 0 com N ≥ 100 |
| Integridade | % de sessões com ≥ 1 sinal, por tipo | 30 | — | > 15% | > 30% (tendência, nunca indivíduo) |
| Governança | pedidos de revisão (art. 20), tempo de resposta, versões publicadas sem 4 olhos (deve ser 0), cadeia de hash íntegra | — | cadeia OK | revisão > 15 dias | cadeia quebrada |

**Ressalvas no painel:** validade sofre **restrição de amplitude** (só os contratados têm 45/90), então o painel mostra o aviso e não corrige estatisticamente na v1. A ligação resultado → experiência é `Resultado.candidaturaId → Candidatura(vagaId, etapa = APROVADO) → Experiencia.vagaId` e vale porque a admissão é 1:1 com a vaga. Vagas com mais de um aprovado ficam de fora e são contadas como "não vinculadas".

---

## 6. API (prefixo `/api/v1`, mesmo padrão `routes/service/repository/schemas/regras`)

| Módulo | Método | Caminho | Papéis | Observação |
|---|---|---|---|---|
| `avaliacoes` | GET | `/avaliacoes/testes` | ADMIN, RECRUTADOR, PSICOLOGO_CRP | catálogo e versões (sem gabarito) |
| | POST | `/avaliacoes/testes` | RECRUTADOR, PSICOLOGO_CRP | cria teste + versão 1 em rascunho |
| | POST | `/avaliacoes/testes/:id/versoes` | RECRUTADOR, PSICOLOGO_CRP | novo rascunho copiado da última versão |
| | PATCH | `/avaliacoes/versoes/:id` | autor | só `RASCUNHO` (senão 409/422) |
| | POST | `/avaliacoes/versoes/:id/submeter` | autor | → `EM_APROVACAO`, calcula hashes |
| | POST | `/avaliacoes/versoes/:id/publicar` | ADMIN, RECRUTADOR, PSICOLOGO_CRP (≠ autor) | congela; privativo só com CRP |
| | POST | `/avaliacoes/versoes/:id/aposentar` | ADMIN, RECRUTADOR, PSICOLOGO_CRP | novos convites deixam de usar |
| | POST | `/avaliacoes/versoes/:id/desativar-itens` | ADMIN, RECRUTADOR, PSICOLOGO_CRP | cria **novo rascunho** sem os itens + motivo |
| | GET | `/avaliacoes/versoes/:id/ficha-tecnica` | ADMIN, RECRUTADOR, PSICOLOGO_CRP | objetivo, cargo, corte, α, n |
| | POST | `/avaliacoes/candidaturas/:id/sessoes` | RECRUTADOR, PSICOLOGO_CRP | convite; fixa a versão publicada vigente |
| | GET | `/avaliacoes/candidaturas/:id/sessoes` | RECRUTADOR, GESTOR (sua vaga), PSICOLOGO_CRP | status e resumo |
| | POST | `/avaliacoes/sessoes/:id/cancelar` | RECRUTADOR, PSICOLOGO_CRP | só `CONVIDADA` |
| | GET | `/avaliacoes/sessoes/:id/resultado` | RECRUTADOR, GESTOR (resumo), PSICOLOGO_CRP | **leitura auditada** (`LER_RESULTADO`) |
| | POST | `/avaliacoes/resultados-externos` | RECRUTADOR, PSICOLOGO_CRP | importação somente-leitura (`origem = EXTERNO`) |
| | POST | `/avaliacoes/resultados/:id/revisao` | RECRUTADOR, PSICOLOGO_CRP | registra pedido de revisão; não altera o resultado |
| `aplicacao` (sem JWT, rate limit) | GET | `/aplicacao/:token` | candidato | instruções + itens **sem gabarito**, na ordem da semente |
| | POST | `/aplicacao/:token/iniciar` | candidato | `EM_ANDAMENTO`, fixa `expiraEm` |
| | POST | `/aplicacao/:token/respostas` | candidato | **append** (autosave) |
| | POST | `/aplicacao/:token/eventos` | candidato | sinais de integridade |
| | POST | `/aplicacao/:token/enviar` | candidato | encerra e pontua no servidor (transação) |
| | POST/DELETE | `/aplicacao/:token/demografia` | candidato | opt-in separado / revogação |
| | POST | `/aplicacao/:token/revisao` | candidato | pedido de revisão (art. 20) |
| `metricas` (só GET, exceto snapshot) | GET | `/metricas/visao-geral` | ADMIN, PSICOLOGO_CRP; RECRUTADOR/GESTOR com escopo; LEITOR só funil | cartões + alertas |
| | GET | `/metricas/versoes/:id/{funil,tempo,distribuicao,itens,confiabilidade}` | idem | |
| | GET | `/metricas/testes/:id/equidade` | ADMIN, PSICOLOGO_CRP | 4/5 com supressão |
| | GET | `/metricas/funil-contratacao` · `/metricas/validade` · `/metricas/alertas` | ADMIN, PSICOLOGO_CRP (+ escopo) | |
| | GET | `/metricas/exportar.csv` | ADMIN | só agregados suprimidos; auditado `EXPORTAR` |
| | POST | `/metricas/snapshots` | ADMIN | refresh das views + grava `snapshots_metrica`; nada mais |
| `auditoria` | GET | `/auditoria/cadeia/verificar?de=&ate=` | ADMIN | recalcula a cadeia; indica a 1ª quebra |
| `candidatos` (existente) | DELETE | `/candidatos/:id/demografia` | ADMIN (DPO) | revogação pelo canal do DPO |

Novas ações em `AcaoAuditoria`: `LER_RESULTADO`, `PUBLICAR`, `PONTUAR`, `IMPORTAR_RESULTADO`, `PEDIR_REVISAO`.

---

## 7. Painel do Admin (nova aba no `index.html` em modo API)

1. **Visão geral:** cartões (convites, conclusão, testes ativos, alertas abertos, estado da cadeia de auditoria) + lista de alertas com link para a tela.
2. **Por teste/versão:** funil de aplicação, tempo (mediana, P10/P90), histograma com teto e chão. Comparar versões lado a lado (v1 × v2) mostra o efeito de desativar um item **sem** recalcular o passado.
3. **Qualidade dos itens:** tabela por código de item (p, r_pb, distratores, α se removido) com semáforo. A ação "Propor nova versão sem estes itens" chama `desativar-itens`, que cria um rascunho e passa pelo fluxo de 4 olhos.
4. **Confiabilidade e ficha técnica:** α, n, método de corte, hash do gabarito e datas de publicação/aposentadoria.
5. **Equidade:** razões 4/5 por dimensão (faixa etária, gênero, raça/cor, PCD), com p de Fisher e IC, células "< 5" e o aviso "indício, não conclusão; não bloqueia processos".
6. **Funil teste → contratação** e **validade 45/90** (dispersão agregada em faixas, sem pontos individuais, e o aviso de restrição de amplitude).
7. **Governança:** pedidos de revisão e SLA, versões publicadas, verificação da cadeia e último snapshot.

**Filtros:** teste, versão, período (mês), empresa, cargo, depto; vaga só quando N ≥ 5. **Exportação:** CSV dos mesmos agregados já suprimidos. Não há tela, *tooltip* ou exportação com nome, código de candidato, candidatura ou linha individual.

---

## 8. Testes de aceitação (provam a não interferência)

Em `tests/app` (HTTP sem banco, como `http.test.ts`) e em uma nova suíte `tests/db` com Postgres efêmero (compose de teste):

| # | Teste | Critério |
|---|---|---|
| A1 | Varre o OpenAPI: toda rota `POST/PUT/PATCH/DELETE` sob `/avaliacoes/sessoes`, `/avaliacoes/resultados*` e `/aplicacao` com token `ADMIN` | 403 em todas; nenhuma rota `PUT/PATCH/DELETE` para resposta ou resultado existe |
| A2 | `ADMIN` em `GET /avaliacoes/sessoes/:id/resultado` e `/avaliacoes/candidaturas/:id/sessoes` | 403 |
| A3 | Todas as respostas JSON de `/metricas/*` (com dados semeados) | nenhum campo `candidaturaId`, `candidatoId`, `nome`, `cpf`, `email`, `sessaoId` (varredura recursiva) |
| A4 | `UPDATE`/`DELETE` em `respostas_item`, `resultados_avaliacao`, `eventos_sessao` como `rs_app` **e** como dono | erro (`permission denied` ou exceção `imutavel`) |
| A5 | `UPDATE` em item ou `hashGabarito` de versão `PUBLICADA` | exceção; mudar `versaoTesteId` de uma sessão também falha |
| A6 | Checksum: `SELECT sha256(string_agg(...))` de `resultados_avaliacao`, `respostas_item`, `sessoes_avaliacao` e `candidaturas` **antes e depois** de `POST /metricas/snapshots`, de todos os `GET /metricas/*` e do export | hashes idênticos |
| A7 | Publicar v2 com item desativado durante uma sessão em andamento na v1 | a sessão termina e é pontuada na v1 (`hashGabarito` da v1); só convites novos usam a v2 |
| A8 | Alerta vermelho (r_pb < 0, α < 0,6, 4/5 < 0,8) | nenhuma linha muda em `candidaturas`/`candidatura_eventos`/`resultados_avaliacao` |
| A9 | Cadeia de hash: inserir 100 eventos, verificar (OK); alterar uma linha como superusuário, verificar | indica a `seq` exata da quebra |
| A10 | Anonimizar candidato (`/candidatos/:id/anonimizar`) | `antes/depois` redigidos e a cadeia **continua** válida |
| A11 | Pontuação: gabarito nunca aparece em `GET /aplicacao/:token`; recalcular `pontuacao` com `algoritmoVersao` + respostas | igual ao gravado (reprodutível) |
| A12 | Supressão: filtro com N = 4 | "< 5"; supressão secundária impede a dedução por diferença |
| A13 | `rs_app` faz `SELECT` em `equidade_demografia` | `permission denied` |
| A14 | Resposta após `expiraEm` ou em sessão `ENVIADA` | rejeitada pelo trigger (e 422 na API) |
| A15 | Publicar com `aprovadoPorId = autorId` | 422 na API e exceção no trigger |

Funções puras de `metricas/regras.ts` (p, r_pb, α, 4/5, Fisher, Spearman, supressão) recebem testes unitários com valores de referência calculados à parte (planilha/R).

---

## 9. Fases, riscos, conformidade e fora do escopo

### 9.1 Fases (1 dev)

| Fase | Entrega | Estimativa | Depende de |
|---|---|---|---|
| F0 | Validar decisões (Admin sem dado individual, k = 5, limites) com o RH; consulta ao jurídico/DPO e, se houver privativo, ao CRP | 0,5 sem (calendário) | — |
| F1 | Migração Prisma + SQL: modelos, papéis Postgres, REVOKE, triggers, cadeia de hash, função de anonimização; ajuste do compose; testes A4, A5, A9, A10, A13–A15 | 1,5 sem | F0 |
| F2 | Núcleo: catálogo versionado e 4 olhos, convite/token, `aplicacao` (autosave append, prazo no servidor), pontuação pura + `algoritmoVersao`, resultado imutável, importação externa, página `aplicacao.html` mínima; A1, A2, A7, A11 | 2 sem | F1 |
| F3 | Métricas: views materializadas, `prismaMetricas`, `regras.ts` estatístico com testes, snapshots, rotas `/metricas`, supressão; A3, A6, A8, A12 | 1,5 sem | F2 (dados semeados) |
| F4 | Painel do Admin no `index.html` (modo API), exportação agregada, ficha técnica | 1 sem | F3 + B12 do plano 03 |
| F5 | Endurecimento: rodar o smoke e2e, documentação no README/OpenAPI, checklist LGPD/CFP, piloto com 1 teste | 0,5 sem | F4 |
| **Total** | | **~6,5–7 semanas** (o doc 04 estimava 2–3 semanas supondo o núcleo vindo das Sols. 1/2; o núcleo próprio soma ~3,5–4) | |

### 9.2 Riscos

| Risco | Mitigação |
|---|---|
| Volume baixo: psicometria precisa de ~100 aplicações por teste | N mínimo por métrica, "amostra insuficiente" explícito; começar com funil e tempo |
| Papéis Postgres e triggers fora do fluxo do `prisma migrate` (superusuário em banco gerenciado) | Script de operação separado e idempotente; testes A4/A13 no CI; documentar no deploy (Neon/Supabase aceitam `CREATE ROLE` pelo dono) |
| Prisma `create` usa `RETURNING` e falha sem `SELECT` | Inserir em `equidade_demografia` com `$executeRaw` |
| Contenção do advisory lock da cadeia de hash em pico de escrita | Volume atual é baixo; medir; alternativa: cadeia por lote |
| Cascades existentes (`Candidatura onDelete: Cascade`) apagariam sessões | `Restrict` nas novas FKs + 409 em `DELETE /vagas/:id` |
| Admin "tudo" no README conflita com o princípio | Atualizar README/rbac.ts; teste A1 impede regressão |
| Validade enviesada (restrição de amplitude, 45/90 subjetiva) | Aviso no painel; não usar para mudar corte sem estudo |
| Reidentificação via filtros | k = 5 + supressão secundária + sem filtro por vaga pequena |

### 9.3 Checklist LGPD/CFP

- [ ] Classificação de cada teste; privativo só com `PSICOLOGO_CRP` + CRP cadastrado (CFP 31/2022).
- [ ] Rótulos sem "teste psicológico", "laudo", "QI" ou "precisão de X%".
- [ ] Demografia opt-in em tabela separada, com termo próprio (art. 11), finalidade exclusiva de equidade, revogável, sem SELECT para a API.
- [ ] Sem eliminação automática; corte só sugere; canal de revisão com SLA (art. 20).
- [ ] Devolutiva ao candidato com critérios gerais (art. 20 §1º).
- [ ] Retenção: resultados seguem `Candidato.retencaoAte`; expurgo pela função `rs_lgpd`; contratados mantidos.
- [ ] Exportação do titular inclui resultados (art. 18) e é auditada.
- [ ] Log encadeado + versão/hash do gabarito + relatório 4/5 prontos para a ANPD (art. 20 §2º).
- [ ] Acomodação PCD registrada como acomodação, não como sinal de fraude (LBI art. 34).
- [ ] Proctoring por imagem desligado; RIPD atualizado.

### 9.4 Fora do escopo desta entrega

Conteúdo de testes (Big Five, provas, SJT), itens dissertativos/código e correção cega (Sols. 1–3); conectores de fornecedor e webhooks (Sol. 5); normas/percentis, TRI e DIF; cópia WORM externa da âncora de auditoria; correção estatística de restrição de amplitude; **recorreção** (desenho reservado: novo `ResultadoAvaliacao` com `substituiId`, motivo e duas aprovações de RECRUTADOR/PSICOLOGO_CRP distintos, **nunca** do ADMIN; o original permanece); painel para o candidato além da devolutiva básica.
