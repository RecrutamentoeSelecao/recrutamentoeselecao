# 03 — Plano estruturado de evolução do Controle de Vagas Fagron

> Entradas: `docs/01-inventario-sistema-atual.md` (inventário) e `docs/02-benchmark-sistemas-rh.md` (benchmark REA + documentação pública).
> Data: 20/10/2026. Esforço medido para **1 dev full-stack**: **P** = até 1 semana · **M** = 1–2 semanas · **G** = 3+ semanas.
> **Situação do `backend/`:** implementado neste branch — Fastify + TypeScript + Prisma + PostgreSQL, 16 módulos por domínio (`backend/src/modules/`), 22 modelos em `backend/prisma/schema.prisma`, 93 operações REST (OpenAPI em `/docs`), 87 testes unitários passando. Detalhes em `backend/README.md`. A Fase 0 e boa parte da Fase 1 abaixo já têm base no código; o trabalho restante é endurecimento, implantação e migração do frontend.

---

## 1. Resumo executivo

Hoje o app é um `index.html` único (~5.800 linhas). Os dados ficam num JSON inteiro guardado em `localStorage` e sincronizado no GitHub com um **token pessoal em texto claro no navegador**. O controle de acesso existe só na interface e não há auditoria.
O plano leva o app para uma **API própria (Fastify/TS) com PostgreSQL**, autenticação por usuário, perfis de acesso e log de auditoria, **sem parar a operação do RH**. A tela atual passa a consumir a API aos poucos, aba por aba.
São quatro fases. **Fase 0:** segurança e LGPD. **Fase 1:** paridade funcional com migração de dados. **Fase 2:** Top 10 do benchmark (avaliação de experiência, gatilhos, scorecard, indicadores). **Fase 3:** recursos avançados (portal de vagas, autoatendimento de admissão, assinatura eletrônica, IA de triagem).
Prazo estimado para 1 dev: **Fases 0–1 em ~10 semanas; Fase 2 em ~12 semanas; Fase 3 sob demanda (~12+ semanas)**.

### Objetivos mensuráveis

| # | Objetivo | Linha de base | Meta | Fase |
|---|---|---|---|---|
| O1 | Tokens/segredos no navegador | PAT do GitHub no `localStorage` | **0 tokens no navegador**; segredos só no servidor | 0 |
| O2 | Alterações com trilha de auditoria (quem, quando, antes/depois) | só `_por`/`_em` do último autor | **100%** das escritas na API | 0 |
| O3 | Avaliações de experiência decididas no prazo (45/90 d) | não medido de forma confiável | **≥ 95%** no prazo; **0** efetivações por esquecimento | 2 |
| O4 | Time to Fill (abertura → admissão) | Painel atual (alvo 18 d) | medir por cargo/gestor/fonte; **reduzir a mediana em 15%** em 6 meses | 2 |
| O5 | Vagas dentro do SLA | `metaSla` 90% | **≥ 90%** sustentado por 3 meses | 1–2 |
| O6 | Admissões "com pendência" | calculado no checklist | **−50%** em 6 meses | 2 |
| O7 | Perda de dados / RPO | depende de localStorage e GitHub | **RPO ≤ 24 h, RTO ≤ 4 h**, restauração testada todo mês | 0 |
| O8 | Candidatos não contratados com retenção vencida | sem política | **0** registros fora da política (expurgo automático) | 0/2 |

---

## 2. Arquitetura alvo

```
[Navegador: index.html → SPA modular]  --HTTPS + cookie de sessão-->  [API Fastify/TS]
        (sem token, sem dados cifrados no cliente)                      |  módulos por domínio
                                                                       |  Prisma ORM
                                                     [PostgreSQL 16] <-+-> [Jobs agendados: lembretes, expurgo LGPD, backup]
                                                                       +-> [E-mail transacional] (Fase 2)
```

### 2.1 Backend (API)
- **Stack:** Fastify + TypeScript + Prisma + PostgreSQL. Validação com JSON Schema/Zod na entrada de cada rota (regra "validar na fronteira").
- **Módulos por domínio** (espelham as comunidades do Graphify e as abas atuais):
  `auth`, `usuarios`, `auditoria`, `cadastros` (Base: empresas, cargos, gestores, feriados, checklist…), `parametros`, `vagas` (etapas, SLA, aging), `candidatos`, `admissao`, `experiencia`, `integracao`, `contratos` (CIEE), `uniformes`, `notas`, `calendario` (compromissos calculados), `indicadores`, `lgpd` (consentimento, retenção, solicitações do titular), `importacao` (dados.json).
- **Regras de prazo** (dias úteis/corridos, feriados, `calcVaga`, `calcExp`, `calcAdm`, `calcContrato`) saem do `index.html` para um **pacote de domínio puro** com testes unitários. Esses testes reproduzem os 16 itens de regra do inventário (§4) e valem como casos de aceite.
- **Propagação "a vaga manda"** (Vaga → Admissão → Experiência/Integração/Contrato/Uniforme) roda **no servidor**, numa transação, com eventos registrados na auditoria.
- **Integridade:** chaves estrangeiras reais (`vaga_id`) e Base por ID, não por nome. Com isso, renomear um item não exige varrer os registros.
- **API:** REST `/api/v1/...`, paginação, filtros iguais aos atuais, OpenAPI gerado (Swagger) e `ETag`/`updatedAt` para concorrência otimista **por registro** (fim do merge do arquivo inteiro).

### 2.2 Banco
- PostgreSQL gerenciado. Tabelas principais: `vaga`, `vaga_etapa`, `candidato`, `candidatura`, `admissao`, `admissao_item`, `experiencia`, `integracao`, `contrato_estagio`, `uniforme`, `nota`, `cadastro_item` (tipo + valor + ordem + cor), `parametro`, `usuario`, `sessao`, `audit_log`, `consentimento`, `solicitacao_titular`.
- `audit_log` (append-only): `id, ts, usuario_id, acao, entidade, entidade_id, antes jsonb, depois jsonb, ip, user_agent`.
- Dados sensíveis (CPF, nascimento, telefone, salário) em colunas próprias, com acesso controlado por perfil e **mascarados** em listagens e exportações.

### 2.3 Frontend: migração incremental do `index.html`
1. **Camada de dados única.** Criar `api.js`, que substitui `fetch('dados.json')`, `publish()` e a sincronização GitHub. Por trás de uma *feature flag* `MODO = 'local' | 'api'`, o app antigo segue funcionando.
2. **Aba por aba** (ordem: Base/Parâmetros → Vagas → Admissão → Experiência → Integração/Contratos/Uniformes → Calendário/Painel → Assistente): o render continua igual, mas lê e grava pela API.
3. Remover cofre, pacotes, sincronização GitHub e autosave de arquivo inteiro quando todas as abas estiverem na API.
4. Depois disso, opcionalmente, quebrar o arquivo em módulos ES com Vite (sem framework obrigatório) e adicionar CSP estrita e fonte Inter servida localmente.

### 2.4 Autenticação e autorização
- Login por e-mail + senha (argon2id), **sessão em cookie `HttpOnly; Secure; SameSite=Strict`**, expiração por inatividade (30 min) e bloqueio após 5 tentativas. Recuperação de senha por e-mail com link de uso único.
- Opcional na Fase 2: SSO Microsoft Entra ID / Google Workspace (OIDC), se a Fagron usar.
- **Perfis (RBAC no servidor):**
  - `admin_rh`: tudo, inclusive exportação, parâmetros e usuários.
  - `recrutadora`: vagas, candidatos, admissão, experiência; exportação mascarada.
  - `gestor`: somente as próprias vagas e experiências; preenche avaliações; não vê salário de outros nem CPF.
  - `dp_leitura`: admissão e uniformes.
  - `auditor`: só leitura do `audit_log`.

### 2.5 Hospedagem sugerida (baixo custo)
| Opção | Composição | Custo aproximado/mês | Observação |
|---|---|---|---|
| **A (recomendada)** | API em Render/Railway/Fly.io (1 instância pequena) + Postgres gerenciado (Neon/Supabase/Render) com região no Brasil ou nos EUA + front estático (mesmo serviço ou Cloudflare Pages) | US$ 15–40 | Deploy por Git, TLS automático, backups do provedor |
| B | VM única (Hetzner/Lightsail/Oracle) com Docker Compose (API + Postgres + Caddy) | US$ 5–15 | Mais barata; o RH/TI cuida de patches e backup |
| C | Infra corporativa da Fagron (Azure/AWS da TI) | conforme contrato | Melhor para compliance; depende da TI |

> Decisão de TI e DPO: verificar transferência internacional de dados (LGPD art. 33). Se o servidor ficar fora do Brasil, registrar a cláusula contratual do provedor.

### 2.6 Backups
- Backup automático diário do provedor **+ `pg_dump` cifrado diário** para outro provedor/bucket (retenção: 7 diários, 4 semanais, 12 mensais).
- **Teste de restauração todo mês** num banco descartável, registrado em checklist (meta O7).
- Exportação JSON completa (formato compatível com `dados.json` v2) disponível ao `admin_rh`, como plano de saída.

---

## 3. Fases, entregas e critérios de aceite

### Fase 0 — Fundação e segurança (≈ 5 semanas)
| ID | Entrega | Esforço | Critério de aceite |
|---|---|---|---|
| F0.1 | Esqueleto da API (Fastify/TS/Prisma), CI com lint, testes e build, ambientes dev/homolog/prod | M (1,5 sem) | Pipeline verde; `GET /health` em produção; migrações Prisma versionadas |
| F0.2 | Auth + sessões + RBAC (5 perfis) | M (1,5 sem) | Testes de autorização por perfil; nenhum token/segredo no navegador (O1); varredura do `localStorage` limpa |
| F0.3 | `audit_log` em todas as escritas + consulta pelo auditor | P (0,5 sem) | 100% das rotas de escrita geram evento com antes/depois (O2) |
| F0.4 | Base LGPD: registro de tratamento, aviso de privacidade, tabela de consentimento, política de retenção documentada | P (0,5 sem) + RH/DPO | Documento aprovado pelo DPO; aviso visível no login |
| F0.5 | Backups + restauração testada | P (0,5 sem) | Restauração cronometrada ≤ 4 h (O7) |
| F0.6 | **Medida imediata no app atual** (antes da API): orientar a revogação dos PATs antigos e a troca por *fine-grained* com prazo curto; confirmar que o repositório de dados é privado; desligar o ditado por voz por padrão | P (2 dias) | Checklist assinado por TI e RH |

**Dependências:** F0.1 → F0.2 → F0.3. F0.4 corre em paralelo (RH/DPO). F0.6 não depende de nada e deve ser feita **já**.

### Fase 1 — Paridade funcional (≈ 5 semanas)
| ID | Entrega | Esforço | Critério de aceite |
|---|---|---|---|
| F1.1 | Pacote de domínio de prazos (SLA, aging, dias úteis, experiência 45/90, CIEE) com testes | M (1 sem) | Mesmos resultados do `index.html` em amostra real: **diferença 0** em farol, SLA, TTF e limites de experiência |
| F1.2 | CRUD via API: Base, Parâmetros, Vagas (+ etapas), Notas | M (1 sem) | Filtros e ordenação equivalentes; renomear item da Base não quebra registros |
| F1.3 | Admissão, Experiência, Integração, Contratos, Uniformes + propagação no servidor | M (1,5 sem) | Todos os cenários de `sincronizar*`/`espelharDaVaga` cobertos por teste |
| F1.4 | Calendário/compromissos e Painel/indicadores via API | P (0,5 sem) | Mesmos baldes e mesmos números do Painel atual |
| F1.5 | Importador `dados.json` → Postgres (ver §4) + validação cruzada | P (0,5 sem) | Relatório de reconciliação sem divergências |
| F1.6 | `index.html` em `MODO='api'` aba por aba; Exportar CSV no servidor com máscara | M (1 sem, em paralelo) | Usuárias executam o roteiro de homologação sem regressão |

**Dependências:** Fase 0 completa (F0.1–F0.3). F1.1 antes de F1.3/F1.4.

### Fase 2 — Top 10 do benchmark (≈ 12 semanas)
| ID | Entrega (ordem do Top 10) | Esforço | Critério de aceite |
|---|---|---|---|
| F2.1 | **Formulário de avaliação de experiência** (critérios, nota, recomendação efetivar/prorrogar/desligar) + **lembrete ao gestor** por e-mail em D-7/D-3/D-1 com link autenticado | M (2 sem) | Gestor avalia pelo link; ≥ 95% no prazo após 2 meses (O3) |
| F2.2 | **Linha do tempo** por vaga e candidato (lida do `audit_log`) | P (1 sem) | Todas as mudanças de etapa visíveis com autor e comentário |
| F2.3 | **Gatilhos entre módulos** configuráveis (aprovado → admissão → experiência + onboarding + uniforme) | M (1 sem) | Zero digitação dupla nos fluxos padrão |
| F2.4 | **Checklist de admissão por modelo** (CLT, estágio, PCD, aprendiz) + **ASO** (clínica, data, apto/inapto) + **alerta eSocial S-2200 até D-1** | M (1,5 sem) | Alertas no Calendário; queda de "com pendência" (O6) |
| F2.5 | **Indicadores:** TTF/TTH por cargo, gestor e fonte; conversão por etapa e fonte; **turnover precoce ≤ 90 d** | M (1,5 sem) | Painel bate com consulta SQL de conferência (O4) |
| F2.6 | **Candidatos de verdade:** ficha, Kanban por vaga e **scorecard de entrevista** que alimenta o Parecer | G (2,5 sem) | Parecer gerado a partir do scorecard; reativa a coleção legada `candidatos` |
| F2.7 | **Templates de onboarding** com responsável e prazo (TI, EPI, NR, uniforme) | M (1 sem) | Integração deixa de ser um status único e vira uma lista de tarefas |
| F2.8 | **Retenção/anonimização automática** + consentimento do banco de talentos + atendimento ao titular | P (1 sem) | Job diário; 0 registros vencidos (O8) |
| F2.9 | **Templates de comunicação** WhatsApp (`wa.me`) e e-mail + `.ics` por entrevista | P (0,5 sem) | Mensagens geradas sem digitação |
| F2.10 | **Deduplicação** de candidatos por CPF, e-mail ou telefone, com mescla | P (0,5 sem) | Aviso de duplicado ao cadastrar; mescla preserva o histórico |

**Dependências:** Fase 1. F2.2 depende de F0.3. F2.6 antes de F2.10. F2.1 precisa de e-mail transacional (SMTP corporativo ou Resend/SES).

### Fase 3 — Avançado (sob demanda, ≈ 12+ semanas)
| ID | Entrega | Esforço | Pré-requisitos |
|---|---|---|---|
| F3.1 | **Portal público de vagas** + candidatura com aceite do aviso de privacidade | G (3 sem) | F2.6, F2.8; captcha; rate limit |
| F3.2 | **Autoatendimento de admissão:** link único para o candidato enviar dados e documentos (armazenamento S3 cifrado) | G (3 sem) | F2.4; armazenamento de arquivos; antivírus no upload |
| F3.3 | **Assinatura eletrônica** (Clicksign/D4Sign/DocuSign via API) de contrato de experiência e termos | M (2 sem) + contrato | F3.2; fornecedor contratado |
| F3.4 | **IA de triagem e textos** (descrição de vaga, roteiro, parecer, resumo de CV) com **revisão humana obrigatória** e explicação | G (3 sem) | F2.6; DPIA/RIPD; chave de API **só no servidor**; LGPD art. 20 |
| F3.5 | PWA/mobile para gestores (avaliar experiência, aprovar requisição) | M (2 sem) | F2.1 |

---

## 4. Migração de dados (dados.json → PostgreSQL) e rollback

**Origem:** `dados.json` (formato `versao: 2`) do repositório privado de dados, normalmente cifrado (cofre AES-256-GCM).

1. **Exportar:** a administradora abre o app atual, destrava o cofre e usa *Cópia de segurança* (ou baixa o JSON). Isso gera o arquivo **decifrado localmente**, que **nunca vai para o Git** e é apagado depois da importação.
2. **Importar** (`POST /api/v1/importacao/dados-json`, só `admin_rh`, ou CLI `npm run import -- arquivo.json`):
   - Roda as mesmas rotinas `normalizar`/`migrarEtapas` do app (portadas para TS).
   - Cadastros da Base → `cadastro_item`. Valores órfãos em uso são criados com a marca `origem='importacao'`.
   - IDs legados (`V0001`, `V0012EA7`…) ficam guardados em `codigo_legado` para busca e rastreio.
   - `idVaga` vira chave estrangeira; referências quebradas entram num relatório de órfãos, sem perder o registro.
   - `_por`/`_em` → `criado_por_legado`, `atualizado_em`, mais um evento `IMPORTACAO` no `audit_log`.
   - Usuários do cofre **não** são migrados com senha: cada pessoa recebe um convite para criar a senha nova.
3. **Reconciliar:** relatório com contagem por coleção, soma de vagas abertas, TTF médio, % SLA, experiências atrasadas e taxa de efetivação. **Precisa bater 100%** com o Painel do app antigo no mesmo dia.
4. **Idempotência:** a importação pode rodar de novo (upsert por `codigo_legado`) durante a convivência.

**Convivência temporária (2–4 semanas):**
- Semana 1: API em homologação; o app antigo segue oficial; importações diárias para comparar.
- Semana 2–3: **corte por aba**. Abas migradas gravam só na API; abas não migradas seguem no modo antigo, com **congelamento de escrita** das migradas no modo antigo (aviso na tela).
- Corte final: modo antigo em somente leitura; sincronização GitHub desligada; **revogar todos os PATs**; arquivar o repositório de dados como histórico cifrado.

**Rollback:**
- Até o corte final: voltar a flag `MODO='local'`. Um exportador `GET /api/v1/exportacao/dados-json` gera um `dados.json` v2 com as alterações feitas na API, para religar o app antigo sem perda.
- Depois do corte final: restaurar o backup do Postgres (RTO ≤ 4 h). O exportador continua como plano de saída.
- Critério para acionar o rollback: divergência de indicadores > 0 não explicada, perda de registro, ou indisponibilidade acima de 4 h no horário comercial.

---

## 5. LGPD

| Tema | Decisão proposta |
|---|---|
| **Bases legais (art. 7º/11)** | Candidatos em processo: procedimentos preliminares a contrato (art. 7º, V). Admitidos: execução do contrato e obrigação legal (CLT, eSocial; art. 7º, II e V). Banco de talentos para outras vagas: **consentimento** (art. 7º, I), registrado com data, texto e versão. Indicadores agregados: legítimo interesse com LIA documentado. Diversidade/PCD (dado sensível): consentimento específico ou cumprimento de obrigação legal (cota PCD), sempre opcional. |
| **Consentimento** | Tabela `consentimento` (titular, finalidade, versão do texto, canal, data, revogação). Revogar retira o candidato do banco de talentos na hora. |
| **Retenção** | Candidato não contratado: **6 meses** após o encerramento da vaga, ou **24 meses** com consentimento de banco de talentos. Colaborador: prazos trabalhistas e previdenciários (a definir com o Jurídico/DP). `audit_log`: 5 anos. Valores em `parametro`, não no código. |
| **Anonimização** | Job diário: substitui nome, CPF, e-mail, telefone, nascimento e currículo por *hash*/nulo, e mantém os campos estatísticos (cargo, fonte, datas, resultado) para os indicadores continuarem válidos. |
| **Direitos do titular (art. 18)** | Fluxo `solicitacao_titular` (acesso, correção, eliminação, portabilidade) com prazo de 15 dias e registro no `audit_log`. Canal: e-mail do DPO. |
| **Encarregado (DPO)** | Indicar o DPO do Grupo Fagron como aprovador do RIPD e da política de retenção; contato publicado no aviso de privacidade. |
| **Registro de tratamento (art. 37)** | Planilha ou página com finalidade, dados, base legal, compartilhamentos (provedor de nuvem, e-mail, assinatura), retenção e medidas de segurança. É mantido junto com o `docs/`. |
| **Minimização** | Uniformes: CPF e nascimento só se o fornecedor exigir; caso contrário, remover. CSV mascarado por padrão. |
| **Ditado por voz** | **Fim do envio de áudio ao Google por padrão.** Na Fase 0 o ditado fica desligado. Para reativar, opções: (a) consentimento explícito por usuária, com aviso claro de que o Chrome processa o áudio em servidor do Google; ou (b) transcrição no próprio servidor/dispositivo (ex.: Whisper local) numa fase futura. |
| **IA (Fase 3)** | Decisão automatizada **nunca** é final; revisão humana registrada; direito de explicação (art. 20); RIPD antes de entrar em produção; nenhum dado sensível enviado a LLM. |
| **Incidentes** | Plano de resposta com comunicação à ANPD e aos titulares em prazo razoável (Res. CD/ANPD 15/2024: 3 dias úteis). |

---

## 6. Riscos, RACI e backlog

### 6.1 Riscos e mitigação
| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Divergência de cálculo entre o app antigo e a API (SLA, dias úteis, 45/90) | Média | Alto | Testes de regra (F1.1) com dados reais; reconciliação obrigatória antes do corte |
| Vazamento do PAT atual antes da migração | Média | Alto | F0.6 imediata; tokens *fine-grained* com prazo; revogação no corte |
| Resistência ou queda de produtividade do RH na troca | Média | Médio | Mesma tela e mesmos atalhos; migração por aba; homologação com as usuárias |
| Dev único vira gargalo (bus factor) | Alta | Alto | README, OpenAPI, ADRs em `docs/`, testes, Graphify atualizado |
| Custo de nuvem ou fornecedores cresce | Baixa | Médio | Opção A/B; alertas de custo; Fase 3 só com caso de negócio |
| Gestores não preenchem a avaliação | Média | Alto | Lembretes escalonados, link de 1 clique, escalonamento ao RH em D-1 |
| Não conformidade LGPD (retenção, consentimento) | Média | Alto | Fase 0 com DPO; job de expurgo; auditoria |
| Perda de dados na migração | Baixa | Alto | Importação idempotente, backup antes/depois, exportador de rollback |

### 6.2 Matriz RACI (R = executa · A = aprova · C = consultado · I = informado)
| Atividade | RH (Recrutamento) | TI | Gestor | DPO/Jurídico |
|---|---|---|---|---|
| Arquitetura, hospedagem, backups | C | **A/R** | I | C |
| Auth, perfis e auditoria | C | **A/R** | I | C |
| Regras de negócio (SLA, 45/90, checklist) | **A** | R | C | I |
| Migração e reconciliação de dados | **A**/R (conferência) | R | I | I |
| Homologação por aba | **A/R** | C | C | I |
| Avaliação de experiência (formulário e uso) | **A** | R | **R** (preenche) | C |
| Política de retenção e consentimento | R | C | I | **A** |
| IA de triagem (Fase 3) | R | R | C | **A** |

### 6.3 Backlog priorizado
| ID | Item | Fase | Prioridade | Esforço | Dependência |
|---|---|---|---|---|---|
| B01 | Revogar/limitar PATs, repositório privado, desligar voz | 0 | Crítica | P (2 d) | — |
| B02 | Esqueleto da API + CI + ambientes | 0 | Crítica | M (1,5 sem) | — |
| B03 | Auth, sessão em cookie, RBAC 5 perfis | 0 | Crítica | M (1,5 sem) | B02 |
| B04 | `audit_log` em todas as escritas | 0 | Crítica | P (0,5 sem) | B03 |
| B05 | Registro de tratamento, aviso de privacidade, retenção (doc) | 0 | Alta | P (0,5 sem) | — |
| B06 | Backups + teste de restauração | 0 | Alta | P (0,5 sem) | B02 |
| B07 | Pacote de domínio de prazos + testes | 1 | Crítica | M (1 sem) | B02 |
| B08 | API Base/Parâmetros/Vagas/Notas | 1 | Crítica | M (1 sem) | B03, B07 |
| B09 | API Admissão/Experiência/Integração/Contratos/Uniformes + propagação | 1 | Crítica | M (1,5 sem) | B08 |
| B10 | Calendário e Painel via API | 1 | Alta | P (0,5 sem) | B09 |
| B11 | Importador `dados.json` + reconciliação + exportador de rollback | 1 | Crítica | P (0,5 sem) | B09 |
| B12 | `index.html` em modo API (aba por aba) + CSV mascarado | 1 | Crítica | M (1 sem) | B08–B11 |
| B13 | Avaliação de experiência + lembrete ao gestor | 2 | Alta | M (2 sem) | B12, e-mail |
| B14 | Linha do tempo por vaga e candidato | 2 | Alta | P (1 sem) | B04 |
| B15 | Gatilhos entre módulos configuráveis | 2 | Alta | M (1 sem) | B09 |
| B16 | Checklist por modelo + ASO + alerta S-2200 | 2 | Alta | M (1,5 sem) | B09 |
| B17 | Indicadores TTF/TTH, conversão por fonte, turnover ≤ 90 d | 2 | Alta | M (1,5 sem) | B12 |
| B18 | Candidatos: ficha, Kanban, scorecard → Parecer | 2 | Alta | G (2,5 sem) | B12 |
| B19 | Templates de onboarding com responsável e prazo | 2 | Média | M (1 sem) | B15 |
| B20 | Expurgo/anonimização automático + consentimento | 2 | Alta | P (1 sem) | B05, B18 |
| B21 | Templates WhatsApp/e-mail + `.ics` por entrevista | 2 | Média | P (0,5 sem) | B18 |
| B22 | Deduplicação e mescla de candidatos | 2 | Média | P (0,5 sem) | B18 |
| B23 | SSO corporativo (OIDC) | 2 | Baixa | P (1 sem) | B03 |
| B24 | Portal público de vagas | 3 | Média | G (3 sem) | B18, B20 |
| B25 | Autoatendimento de admissão (dados e documentos) | 3 | Média | G (3 sem) | B16 |
| B26 | Assinatura eletrônica | 3 | Baixa | M (2 sem) | B25, contrato |
| B27 | IA de triagem e textos com revisão humana | 3 | Baixa | G (3 sem) | B18, RIPD |
| B28 | PWA para gestores | 3 | Baixa | M (2 sem) | B13 |

**Somatório para 1 dev:** Fase 0 ≈ 5 sem · Fase 1 ≈ 5 sem · Fase 2 ≈ 12 sem · Fase 3 ≈ 13 sem (com 15–20% de folga para homologação e ajustes).

---

## 7. Como usar os agentes e ferramentas instalados

- **Ruflo (swarm) para executar as fases.** Uma fase por swarm hierárquico, com o papel de integradora para a pessoa dev:
  `npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 6 --strategy specialized`.
  - Roteamento sugerido: Fase 0 → `security-architect` + `backend-dev` + `security-auditor`; Fases 1–2 → `system-architect` + `coder` + `tester` + `reviewer`.
  - Regras do `CLAUDE.md`: cada agente que escreve código trabalha num *worktree* próprio, com escopo de arquivos definido (ex.: um agente por `src/modules/<domínio>`), e só a integradora mexe em `package.json`, lockfile e `schema.prisma`.
  - Cada item do backlog (B##) vira uma tarefa com os critérios de aceite deste documento.
- **Graphify para manter o mapa.** Depois de cada entrega que mude 5 ou mais arquivos, ou ao fim de cada fase, rodar `graphify --update` (no `index.html` extraído e no `backend/src`). Isso atualiza `graphify-out/GRAPH_REPORT.md`, e as comunidades e *god nodes* ajudam a decidir a próxima aba a migrar e a vigiar acoplamento.
- **REA para novos benchmarks.** Usar só em projetos **open source** (`npx -y rea-agents@latest analyze-javascript-application <dir> --json`), guardando os *evidence IDs* em `docs/`. Produtos comerciais: apenas documentação pública. Exemplo de uso: antes da Fase 3, para estudar o portal de vagas do Frappe (`hrms/www/jobs`) e o `ApplyJobVacancy` do OrangeHRM.
- **Skills de RH** (`parecer-de-candidatos`, `roteiro-entrevista-rs`, `interview-prep`, `onboarding`) servem de referência de conteúdo para os templates de scorecard (B18), roteiro e onboarding (B19).
