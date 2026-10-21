# 04a — Engenharia reversa (REA) de testes comportamentais e de habilidades em software open-source

> Objetivo: entender como softwares **open-source e publicamente distribuídos** implementam testes comportamentais (personalidade/Big Five) e de habilidades (itens com gabarito, tarefas cognitivas, código), para orientar um módulo de testes no backend (`backend/` — Fastify + TS + Prisma). Nenhum código do repositório foi alterado; somente este arquivo foi criado.
>
> Data: 2026-10-21. Ferramenta: `rea-agents` 6.7.0 via CLI (`npx -y rea-agents@latest … --json`). Workspace: `/home/user/repos/rea-workspace/`.

Legenda usada abaixo:
- **[REA]** = fato observado no Evidence do REA (análise estática, sem executar nada).
- **[Fonte]** = leitura direta do código-fonte/pacote (sem REA).
- **[Inferência]** = conclusão nossa, não comprovada por evidência.

---

## 1. Método

### 1.1 Alvos escolhidos (todos open-source)

| # | Alvo | Origem | Versão / commit | Licença do código | Por que foi escolhido |
|---|---|---|---|---|---|
| 1 | `@alheimsins/b5-johnson-120-ipip-neo-pi-r`, `@alheimsins/bigfive-calculate-score`, `@alheimsins/b5-result-text` | `npm pack` | 6.0.13 / 3.0.3 / 5.0.5 | MIT | Itens IPIP-120 (inclui **pt-br**), algoritmo de pontuação por domínio/faceta, textos de laudo em pt-br |
| 2 | `alheimsins/bigfive-web` | `git clone --depth 1` | `5c4eb2e` | MIT | Aplicação completa: fluxo da sessão, autosave, timer, API de resultado |
| 3 | `jspsych/jsPsych` (core + `plugin-survey-likert`) | `git clone --depth 1` | `5887b4a` (jspsych 8.3.1) | MIT | Framework de tarefas comportamentais/cognitivas: randomização, tempo de reação, registro de perda de foco |
| 4 | `qti3-item-player` (Amp-up.io) | `npm pack` (bundle) + `git clone` (fonte `.vue`) | 1.1.20 / `2e304fd` | MIT | Motor de itens QTI 3 (padrão 1EdTech): modelo de item com gabarito, response processing, estado serializável |
| 5 | `judge0/judge0` | `git clone --depth 1` | `4f630ff` | **GPL-3.0** | Avaliação de código (testes de habilidade técnica): limites, veredito |

Descartados/considerados: `oat-sa/qti-sdk` (TAO) — clonado, mas é **PHP e GPL-2.0**, fora do alcance do analisador JS do REA e com licença copyleft; substituído pelo player QTI 3 em MIT. `@citolab/qti-components` — **GPL-3.0-only** (verificado com `npm view`), descartado. Moodle quiz — GPL-3.0 e monorrepo PHP enorme; não analisado. OpenCATS já foi analisado em rodada anterior (`_out/opencats_js.json`) e não possui módulo de testes relevante.

### 1.2 Comandos executados

```bash
cd /home/user/repos/rea-workspace
# aquisição
npm pack @alheimsins/b5-johnson-120-ipip-neo-pi-r @alheimsins/bigfive-calculate-score @alheimsins/b5-result-text   # em bigfive-npm/
npm pack qti3-item-player                                                                                         # em qti3-npm/
git clone --depth 1 https://github.com/{alheimsins/bigfive-web,jspsych/jsPsych,judge0/judge0,amp-up-io/qti3-item-player,oat-sa/qti-sdk}.git
# REA (em paralelo; saída em _out/<nome>.json, progresso em _out/<nome>.err)
npx -y rea-agents@latest analyze-javascript-application <abs>/bigfive-npm                          --json
npx -y rea-agents@latest analyze-javascript-application <abs>/bigfive-web                          --json
npx -y rea-agents@latest analyze-javascript-application <abs>/jsPsych/packages/jspsych/src         --json
npx -y rea-agents@latest analyze-javascript-application <abs>/jsPsych/packages/plugin-survey-likert/src --json
npx -y rea-agents@latest analyze-javascript-application <abs>/qti3-bundle   # contém só dist/qti3Player.common.js
```

Não foi executado `setup`, `doctor` nem alteração de configuração do REA.

### 1.3 Evidence produzidos

| Alvo | Evidence ID | Arquivos JS analisados | Achados | Observações de cobertura |
|---|---|---|---|---|
| bigfive-npm | `ev_ae00bf3a754956bea93373a8744ca0a21796cdc08594619dd0f3675eb0f45315` | 131 | 321 | 3 nós `package`; sem endpoints |
| bigfive-web | `ev_b081e0c6149d8abf7eddefc24dab0978f25b53ccfa5a9d5981e945c1d1b878bc` | 48 | 374 | 7 endpoints, 3 storage (`localStorage`), 3 timers |
| jsPsych core | `ev_d01bd754844e5d6484af3d43808fe947a45598f2a1ba95a27a8522a1c662d822` | 31 | 339 | cobertura do grafo marcada **incompleta** |
| jsPsych survey-likert | `ev_37a087dbdf363d82acfb40a48e0f41bc63b04f44d1b3662691129d2543e38f15` | 2 | 14 | — |
| qti3 bundle | `ev_322087cc0ef78e9f12fde9ca22b1917bc129c803968913377344c290f2c26c3c` | 1 (3,2 MB, 325 mil nós AST) | 14 | cobertura **parcial e truncada** (20 000 unknowns retidos; ~16 mil chamadas dinâmicas omitidas) |

Todos com `confidence: derived`, `authority: shipped-artifact`. Limitações declaradas pelo REA em todos: JS/HTML lidos como texto inerte, nada foi executado; imports/endpoints/storage estáticos **não provam execução**; caminhos dinâmicos podem ficar sem resolução.

### 1.4 Falhas e limites (honestamente)

- **REA não lê `.vue`**: o código-fonte do player QTI 3 é quase todo em Single-File Components. Por isso o REA foi aplicado ao **bundle distribuído** (`dist/qti3Player.common.js`) e a lógica foi lida no fonte `.vue` [Fonte]. No bundle, o REA retornou grafo pequeno (16 nós de alto nível) e cobertura truncada — útil para inventário, pouco para semântica.
- **Falsos positivos de endpoint no QTI**: o REA marcou `candidateIdentifier`, `testIdentifier`, `environmentIdentifier` como *candidatos* a endpoint. Na leitura do fonte, são campos do registro de contexto QTI (`store/store.js:350-352`, `QtiContextDeclaration.vue:107-109`), não URLs. O nó `storage swal-initiation` é da biblioteca SweetAlert, não do motor de itens.
- **Judge0 é Ruby on Rails**: fora do escopo do analisador do REA; análise **somente por leitura de fonte**.
- **REA não faz semântica de pontuação**: o REA mostrou *onde* estão storage, timers, endpoints e fluxo de módulos; o algoritmo de pontuação foi confirmado por leitura do fonte.
- Nenhuma observação em tempo de execução (browser) foi feita; não havia necessidade, pois o código-fonte está completo.

---

## 2. Achados por alvo

### 2.1 Big Five IPIP-120 (pacotes npm da Alheimsins)

**Modelo de item [Fonte]** (`data/<lang>/questions.json`):
```json
{ "id": "43c98ce8-…", "text": "Me preocupo com as coisas", "keyed": "plus", "domain": "N", "facet": 1 }
```
- 120 itens; 24 por domínio (N, E, O, A, C); 6 facetas × 4 itens por domínio. Na versão pt-br: 65 itens `plus` e 55 `minus` (contados no JSON).
- `id` UUID **estável entre idiomas** (o mesmo id em `en` e `pt-br`) → a tradução é só troca de `text`.
- Escala em `choices.js` por idioma: 5 opções Likert ("Discordo totalmente" … "Concordo totalmente"). **Itens invertidos** são resolvidos *na própria escala*: para `keyed: "minus"` a opção "Concordo totalmente" vale `score: 1`; para `plus` vale `5`. Ou seja, a resposta gravada **já vem invertida** (ponto de atenção: não grava a posição bruta escolhida).
- `getItems(lang, shuffle)` aplica `knuthShuffle` opcional e numera (`num`).

**Algoritmo de pontuação [Fonte]** (`bigfive-calculate-score/lib/reduce-factors.js`):
1. Para cada resposta `{domain, facet, score}`: soma `score` no domínio e na faceta; conta itens.
2. Classificação: `média = soma / quantidade`; `> 3` → `high`, `< 3` → `low`, `= 3` → `neutral` (função `calculateResultDefault`, substituível por `calculateResult` customizado).
3. Saída: `{ N: { score, count, result, facet: { "1": { score, count, result }, … } }, … }` — domínio vai de 24 a 120; faceta de 4 a 20.
- **Não há normas nem percentis**: a classificação é por ponto médio da escala, não por comparação populacional. [Inferência] Para uso sério em seleção, seria preciso norma brasileira (média/desvio por domínio) para converter em escore-z/percentil.

**Laudo [Fonte]** (`b5-result-text`): templates por idioma (há `pt-br`) com, por domínio, `title`, `shortDescription`, `description`, `results[ low|neutral|high ].text` e `facets[].{title,text}`. `generateResult(scores, template)` só faz *lookup* do texto pela faixa — o laudo é **texto fixo por faixa**, sem geração dinâmica.

### 2.2 bigfive-web (aplicação de referência)

**Fluxo da sessão** (`pages/test.js`) [Fonte], corroborado por [REA] `ev_b081e0c6…`:
- Paginação: 4 itens por página (1 em tela < 600 px; nesse modo avança sozinho após 700 ms — `lib/sleep.js`, nó REA `timer` + `promise` em `lib/sleep.js:1`).
- **Autosave no navegador**: a cada resposta, `populateData` grava `{answers, progress, position, items}` em `localStorage` (`b5data`, `inProgress`). REA: 3 nós `storage` (`localStorage.setItem/getItem/clear`) em `lib/localStorageStore.js`. Ao reabrir, restaura e oferece "começar de novo".
- **Timer** apenas informativo (`components/alheimsins/Timer.js:31`, nó REA `timer`); o tempo total (`timeElapsed`, em s) é enviado junto do resultado. Não há limite de tempo.
- **Sem antifraude**: nenhuma detecção de troca de aba, nenhum token de sessão, nenhum controle de tentativa.
- Envio: `POST /api/save` com `{ ...getInfo(), lang, answers:[{domain,facet,score}], timeElapsed, dateStamp }`. REA: endpoints literais `/api/save`, candidatos `/api/get/:id`, `/api/login`.

**Servidor** (`server.js`) [Fonte]: `/api/save` insere o payload **como veio** no MongoDB (sem validação, sem autenticação) e devolve o `_id`; `/api/get/:id` devolve o documento. **A pontuação é recalculada no cliente** a cada visualização (`pages/showResult.js:23-24`: `calculateScore(data)` → `getResult({scores, lang})`).
- [Inferência] Lição negativa: como o cliente envia `score` já calculado por item, um candidato pode forjar o resultado. No nosso backend, o servidor deve receber a **opção escolhida** por `itemId` e calcular tudo.
- Comparação entre pessoas (`lib/repack-results.js`): agrega escores de várias pessoas por domínio/faceta para gráfico comparativo — útil para "candidato vs. perfil da vaga".

### 2.3 jsPsych (framework de tarefas comportamentais/cognitivas)

Evidence `ev_d01bd754…` (core) e `ev_37a087db…` (Likert). jsPsych **não pontua** testes: ele aplica a tarefa e entrega dados brutos por tentativa (trial). Padrões úteis [Fonte]:
- **Linha do tempo declarativa** (`timeline/Timeline.ts`): `timeline_variables`, `randomize_order`, `repetitions`, `conditional_function`, `loop_function` (repete bloco até critério, ex.: treino até acertar), e `sample` com tipos `with-replacement`, `without-replacement`, `fixed-repetitions`, `alternate-groups`, `custom` (linhas 181-222).
- **Randomização reprodutível** (`modules/randomization.ts:10`): `setSeed(seed)` troca `Math.random` por PRNG `alea` semeado → mesma ordem para auditoria. Também `shuffleNoRepeats`, `factorial`, `sampleWithoutReplacement`.
- **Registro por tentativa** (`timeline/Trial.ts:217-222`): todo resultado recebe `trial_type`, `trial_index`, `plugin_version`, mais `time_elapsed` global (`JsPsych.ts:408`) e `rt` (tempo de reação em ms, medido com `performance.now()` no plugin Likert).
- **Limite de tempo por item**: `trial_duration` + `response_ends_trial` (ex.: `plugin-html-keyboard-response`), via `pluginAPI.setTimeout`.
- **Sinais de integridade** (`modules/data/index.ts:115-153`): ouve `blur`, `focus`, `fullscreenchange` e grava `InteractionRecord { event, trial, time }`; callback `on_interaction_data_update`. Plugin `fullscreen` força tela cheia; `browser-check` valida navegador/tamanho.
- **Autosave para servidor**: callback `on_data_update(result)` a cada tentativa (`JsPsych.ts:418`) e `on_close` em `beforeunload` (`JsPsych.ts:378`) — o padrão é o aplicador mandar cada trial ao backend.
- Likert (`plugin-survey-likert`): `questions[{prompt, labels, required, name}]`, `randomize_question_order`; resposta gravada como **índice inteiro** da posição escolhida (`response: {Q0: 2}`) + `rt`. [Fonte] — confirma o desenho recomendado: guardar posição bruta e pontuar depois.
- REA: o grafo do core está marcado com cobertura incompleta; nós `timer` em `timeline/util.ts:32` e muitos `promise` (fluxo assíncrono das trials). Nenhum endpoint de rede no core (apenas `src` de áudio) — confirma que o envio é responsabilidade de quem integra.

### 2.4 QTI 3 Item Player (motor de itens com gabarito — padrão 1EdTech)

Evidence `ev_322087cc…` (bundle; cobertura truncada) + leitura do fonte `.vue`.

**Modelo de item [Fonte]** (padrão QTI): cada item declara
- `qti-response-declaration` (identificador `RESPONSE`, `cardinality` single/multiple/ordered/record, `baseType`, `correctResponse` e opcional `mapping` com `mapEntry`, `defaultValue`, `lowerBound`, `upperBound`);
- `qti-outcome-declaration` (ex.: `SCORE`, `MAXSCORE`);
- interações: choice, order, match, gap-match, text-entry, extended-text, hotspot, inline-choice, PCI customizada etc. (`components/qti/interactions/…`), com `shuffle` nativo nas interações de associação/escolha.

**Pontuação [Fonte]** (`processing/QtiResponseProcessing.vue:35-80`), três *templates* padrão:
- `match_correct`: `SCORE = 1` se `RESPONSE == correctResponse`, senão `0` (certo/errado).
- `map_response`: `SCORE = soma dos valores mapeados` de cada opção marcada, limitada por `lowerBound/upperBound` (crédito parcial, penalidade por erro).
- `map_response_point`: idem para áreas clicáveis.
- Além disso, response processing arbitrário (`qti-response-condition/if/else`, `set-outcome-value`, `lookup-outcome-value` para tabelas de conversão).

**Sessão [Fonte]** (`shared/helpers/SessionControlFactory.js`): `max_attempts`, `allow_skipping`, `allow_review`, `show_feedback`, `show_solution`, `validate_responses`, `max_time` + `allow_late_submission`. Variáveis automáticas `numAttempts` e `duration` por item (`QtiAssessmentItem.vue:134,538`).
**Estado/autosave [Fonte]** (`ItemStateFactory.js`): estado serializável `{identifier, guid, contextVariables, responseVariables[{identifier,cardinality,baseType,value,state,correctResponse?}], outcomeVariables, templateVariables, validationMessages}`. Eventos do player: `suspendAttempt` (salvar sem pontuar), `endAttempt` (submeter e pontuar), `scoreAttempt` (`Qti3Player.vue:136-231`). O estado é devolvido ao *host* para persistir e pode ser reidratado.
- [Inferência] A separação "suspender × encerrar tentativa" é exatamente o que precisamos para autosave + submissão final.
- Observação de segurança [Inferência]: o `correctResponse` vem no XML entregue ao navegador; num teste de seleção o gabarito **não pode** ir para o cliente — pontuar no servidor.

### 2.5 Judge0 (teste de habilidade em programação)

Somente [Fonte] (Ruby; REA não aplicável).
- **Submissão** (`app/models/submission.rb`): `source_code`, `language_id`, `stdin`, `expected_output`, limites `cpu_time_limit`, `wall_time_limit`, `memory_limit`, `stack_limit`, `max_processes_and_or_threads`, `max_file_size`, `number_of_runs`; saídas `stdout`, `stderr`, `compile_output`, `time`, `wall_time`, `memory`, `status`; `callback_url` para notificação assíncrona.
- **Veredito** (`app/jobs/isolate_job.rb:349-368`): executa em sandbox `isolate`; `TO` → Time Limit Exceeded; `SG` → erro de runtime por sinal; `RE` → NZEC; senão compara `expected_output` com `stdout` após remover espaços à direita de cada linha (`strip`) → `Accepted` (id 3) ou `Wrong Answer` (id 4). Status enumerados em `app/enumerations/status.rb`.
- Pontuação de um desafio = [Inferência] nº de casos de teste aceitos / total (Judge0 avalia **um** caso por submissão; o agregador é de quem integra, via batch).
- Licença **GPL-3.0**: [Inferência] usar como **serviço separado** via API HTTP (sem incorporar código ao nosso backend) é a forma usual de evitar obrigações de copyleft sobre o nosso código; confirmar com jurídico. Existe também a API hospedada (comercial).

---

## 3. Padrões técnicos reutilizáveis (proposta para o backend)

### 3.1 Modelo de dados (Prisma — esboço, não aplicado)

```prisma
enum TipoTeste      { COMPORTAMENTAL HABILIDADE CODIGO COGNITIVO }
enum TipoItem       { LIKERT ESCOLHA_UNICA ESCOLHA_MULTIPLA ORDENACAO TEXTO_CURTO DISSERTATIVO CODIGO }
enum StatusSessao   { CONVIDADO EM_ANDAMENTO SUSPENSA ENVIADA PONTUADA EXPIRADA ANULADA }

model Teste {                       // "instrumento", versionado e imutável após publicado
  id, codigo, versao Int, tipo TipoTeste, titulo, instrucoes,
  tempoLimiteSeg Int?, embaralharItens Boolean, embaralharOpcoes Boolean,
  maxTentativas Int @default(1), permitirVoltar Boolean, permitirPular Boolean,
  fonteConteudo String, licencaConteudo String,           // ex.: "IPIP – domínio público"
  escalas Escala[], itens Item[], normas Norma[], publicadoEm DateTime?
  @@unique([codigo, versao])
}
model Escala { id, testeId, codigo /*"E", "E1"*/, nome, paiId String? /* faceta → domínio */ }
model Item {
  id, testeId, ordem, tipo TipoItem, enunciado, opcoes Json /*[{id,texto,valor}]*/,
  escalaId String?, chave Int @default(1) /* +1 normal, -1 invertido (keyed minus) */,
  gabarito Json? /* NUNCA serializado ao candidato */, mapeamento Json? /* {opcaoId: pontos, min, max} */,
  pontos Decimal @default(1), casosTeste Json? /* CODIGO */, limiteTempoSeg Int?
}
model Norma { id, testeId, escalaId, populacao, n Int, media Decimal, desvio Decimal, fonte }

model SessaoTeste {                  // ligada a Candidatura (já existe no schema)
  id, testeId, candidaturaId, tokenHash String @unique, status StatusSessao,
  semente String /* ordem reprodutível (jsPsych setSeed) */, ordemItens Json,
  iniciadaEm, expiraEm, enviadaEm, tempoTotalSeg Int?, tentativa Int @default(1),
  respostas Resposta[], eventos EventoSessao[], resultado ResultadoTeste?
}
model Resposta {                     // upsert = autosave ("suspendAttempt")
  id, sessaoId, itemId, valorBruto Json /* posição/opções escolhidas, texto ou código */,
  rtMs Int?, respondidaEm, versao Int /* concorrência otimista */
  @@unique([sessaoId, itemId])
}
model EventoSessao { id, sessaoId, tipo /* blur|focus|fullscreen_exit|copy|paste|retomada */, itemId?, em }
model ResultadoTeste {
  id, sessaoId @unique, algoritmoVersao String, escores Json /* por escala: bruto, n, média, z, percentil, faixa */,
  pontuacaoTotal Decimal?, maximo Decimal?, laudo Json?, sinaisIntegridade Json, calculadoEm
}
```

Pontos de desenho tirados dos alvos:
- Item com **id estável** e conteúdo traduzível à parte (Big Five). Versão do teste imutável depois de publicada (QTI identifica item/teste).
- Guardar **resposta bruta** (posição/opção) e aplicar a chave/gabarito no servidor (jsPsych Likert grava posição; bigfive-web grava score já invertido no cliente — evitar).
- **Gabarito e mapeamento só no servidor**; a API de aplicação devolve item sem `gabarito`/`mapeamento`/`chave`.
- **Autosave** = `PUT /sessoes/:id/respostas/:itemId` (upsert idempotente) — equivalente ao `suspendAttempt` do QTI e ao `on_data_update` do jsPsych; o `localStorage` do bigfive-web pode ser só cache do front.
- **Tempo** controlado no servidor (`expiraEm`); o timer do front é apenas visual. Respostas após `expiraEm` rejeitadas (`allow_late_submission=false`).
- **Randomização com semente** gravada na sessão → ordem reprodutível para auditoria/contestação.
- **Sinais de integridade** (blur/focus/fullscreen como no jsPsych) registrados como eventos e resumidos no resultado; servem de **alerta para revisão humana**, nunca de reprovação automática (LGPD art. 20 — decisão automatizada).

### 3.2 Algoritmos de pontuação

**Comportamental (Likert, estilo IPIP)** — função pura, no estilo `regras.ts` do projeto:
```
para cada resposta r do item i (escala k, pontos 1..K):
    v = chave_i == -1 ? (K + 1 - r) : r          // reverse-keyed
    bruto[k] += v ; n[k] += 1  (e também no pai, se k for faceta)
media[k] = bruto[k] / n[k]
se há Norma(k):  z = (media[k] - μ) / σ ;  percentil = Φ(z)·100 ;  faixa por percentil (ex.: <30 baixo, 30–70 médio, >70 alto)
senão:           faixa por ponto médio da escala (regra Alheimsins: >3 alto, <3 baixo, =3 neutro) — marcar "sem norma"
mínimo de itens respondidos por escala (ex.: ≥ 80%) senão escala = "indeterminada"
```
**Habilidades (gabarito)** — templates QTI:
- `match_correct`: 1 se resposta == gabarito, senão 0 (× `pontos`).
- `map_response`: soma dos valores das opções marcadas, recortada em `[min, max]` (crédito parcial / penalidade).
- total = Σ itens; percentual = total / máximo; corte por vaga.
**Código** — Judge0: para cada caso de teste, submissão com `stdin`/`expected_output` e limites; nota = casos `Accepted` / total (pesos opcionais); guardar `time`/`memory` como critério de desempate.

Sempre gravar `algoritmoVersao` no resultado para recálculo reprodutível.

### 3.3 API sugerida (Fastify)

`POST /testes` (RH cria/versiona) · `POST /candidaturas/:id/sessoes-teste` (gera convite com token de uso único) · `GET /aplicacao/:token` (instruções + itens sem gabarito, na ordem da semente) · `PUT /aplicacao/:token/respostas/:itemId` (autosave) · `POST /aplicacao/:token/eventos` (integridade) · `POST /aplicacao/:token/enviar` (encerra e pontua no servidor) · `GET /sessoes-teste/:id/resultado` (RBAC: só RH/gestor da vaga; auditado).

---

## 4. Licenças — o que pode ser reutilizado comercialmente em português

| Componente | Licença | Uso comercial | Itens/conteúdo em pt-BR |
|---|---|---|---|
| Itens IPIP (Johnson 120 / IPIP-NEO) | **Domínio público** segundo o site oficial do IPIP (ipip.ori.org) | Sim, inclusive adaptar e traduzir | Tradução pt-br pronta no pacote npm (MIT). |
| `@alheimsins/b5-johnson-120-ipip-neo-pi-r` (código + traduções) | MIT | Sim, mantendo o aviso de copyright/licença | Sim (`data/pt-br`) |
| `@alheimsins/bigfive-calculate-score` | MIT | Sim | n/a (algoritmo trivial; reimplementar em TS é simples) |
| `@alheimsins/b5-result-text` (textos de laudo) | MIT (declarado) | Sim, com ressalva | Sim (`lib/data/pt-br`). **Ressalva**: a origem dos textos não está documentada no pacote; parecem derivados dos relatórios narrativos de J. A. Johnson. Recomendo reescrever os laudos. A tradução pt-br tem erros de digitação ("pscicanalista", "sitações"). |
| bigfive-web | MIT | Sim | Interface em vários idiomas |
| jsPsych | MIT | Sim | Não traz testes prontos; os plugins são genéricos |
| qti3-item-player | MIT | Sim | O padrão QTI é aberto (1EdTech); itens de exemplo não servem para seleção |
| Judge0 | **GPL-3.0** | Sim como serviço separado via API; incorporar o código obriga o projeto derivado a ser GPL | n/a |
| TAO qti-sdk / Citolab qti-components / Moodle | GPL-2.0 / GPL-3.0 / GPL-3.0 | Evitar incorporar | — |

Alertas importantes [Inferência — validar com jurídico/psicólogo]:
1. **Não usar o nome "NEO-PI-R"** como nome do produto: é marca e instrumento comercial da PAR. Os itens IPIP são *análogos* de domínio público; chamar de "Inventário Big Five (IPIP-120)".
2. **Regulação no Brasil**: o uso de *testes psicológicos* para decisão é privativo de psicólogo e depende de parecer favorável no **SATEPSI/CFP**. O IPIP-120 em pt-br **não tem** validação nem normas brasileiras publicadas no pacote. Recomendação: tratá-lo como **inventário de perfil/autoconhecimento**, sem caráter eliminatório, com interpretação por psicólogo quando usado em seleção, e mostrar ao candidato a finalidade (transparência LGPD).
3. **Normas/percentis**: nenhum dos alvos traz normas. Sem uma amostra normativa própria, apresentar só a faixa por ponto médio e marcar "sem norma".
4. Testes de habilidade (conhecimento/código) não sofrem a restrição do item 2, mas os **itens** precisam ser próprios ou licenciados; nenhum alvo fornece banco de itens de habilidade reutilizável.

---

## 5. Checklist de respostas

| Pergunta | Status |
|---|---|
| Modelo de item/questão | Respondida (Big Five, QTI, jsPsych, Judge0) |
| Pontuação (bruto → normalizado → percentil, itens invertidos, facetas) | Respondida; **percentil/normas: nenhum alvo implementa** (negativo dentro dos 5 alvos) |
| Fluxo da sessão (timer, randomização, antifraude, autosave) | Respondida (bigfive-web, jsPsych, QTI) |
| Modelo de resultado e laudo | Respondida (b5-result-text, QTI outcome variables, Judge0 status) |
| Licença dos itens/conteúdo | Respondida; ressalvas sobre origem dos laudos e regulação CFP/SATEPSI |
| Observação em tempo de execução | Não realizada (desnecessária: código-fonte completo) |

Artefatos: `/home/user/repos/rea-workspace/_out/{bigfive_npm,bigfive_web,jspsych_core,jspsych_likert,qti3_bundle}.json`.
