# 02 — Benchmark de sistemas de RH (ATS, admissão e período de experiência)

> Objetivo: comparar o **Controle de Vagas Fagron** (`index.html`, arquivo único) com sistemas de recrutamento e de gestão de pessoas, para encontrar funcionalidades que ainda faltam no app.
> Data: 20/10/2026. O `index.html` **não foi alterado**.

---

## 1. Método

### 1.1 Escopo legal e ético

- **REA (Reverse Engineer Anything)** foi usado **somente em projetos open source** baixados com `git clone --depth 1` para `/home/user/repos/rea-workspace/<alvo>`:
  - **Frappe HR** (`frappe/hrms`, GPL-3.0): `frappe-hrms/`
  - **OrangeHRM 5** (`orangehrm/orangehrm`, GPL-3.0): `orangehrm/`
  - **OpenCATS** (`opencats/OpenCATS`, licença própria open source): `opencats/`
- Os **produtos comerciais** (Gupy, Sólides, Recrutei, Convenia, Greenhouse, Lever e Workable) **não passaram por engenharia reversa**. Sobre eles foram consultadas apenas páginas públicas (sites, blogs e comparadores) por busca na web. Neste documento, essa fonte aparece como **"documentação pública"**.
- O REA não foi configurado nem registrado como MCP. Usei apenas a CLI `npx -y rea-agents@latest` (versão **rea 6.7.0**).

### 1.2 Comandos REA executados e evidência gerada

| Alvo | Comando | Resultado | Evidence ID | O que foi observado |
|---|---|---|---|---|
| Frappe HR, app mobile/PWA (`frontend/src`) | `analyze-javascript-application <dir> --json` | OK (exit 0, 6,7 MB de JSON) | `ev_5e4b15af16c2…1526` | 31 módulos JS analisados, 297 achados e 3.282 nós semânticos. Módulos: `leaves`, `attendance`, `claims`, `advances`, `salary_slips`, `notifications`, `workflow.js`, `realtime.js` (socket) e `pushNotifications.js`. O único endpoint literal encontrado foi `hrms.api._download_pdf`. |
| OrangeHRM 5, cliente Vue (`src/client/src`) | idem | OK (26,6 MB) | `ev_d90c3e80a44e…3f1e` | 63 módulos e 897 achados. Plugins: Recruitment, Performance (`useReviewEvaluation`, `useReviewActions`), PIM, Leave, Time, Attendance, Claim, Buzz, Dashboard, OpenID/OAuth/LDAP. Composable `usePasswordPolicy` e ACL (`core/plugins/acl/acl.ts`). |
| OpenCATS (`js/`) | idem | **Parcial** (100 MB) | `ev_465a459aa0d0…ba2` | 40 de 41 arquivos analisados. Módulos: `candidateParser.js`, `careerPortalApply.js`, `careerportal.js`, `pipeline.js`, `match.js`, `questionnaire.js`, `eeo.js`, `massImport.js`, `searchSaved.js`, `emailHandler.js`, `charts.js` e `backup.js`. **Limitação:** `suneditor.min.js` esgotou o heap do worker do REA e a cobertura ficou `partial/truncated`. |

**Limitações honestas do REA nesta análise:**
- O REA analisou só arquivos `.js` e `.ts`. Os componentes **`.vue` (SFC)**, onde ficam as telas, não entraram no grafo. A maior parte das funcionalidades do OrangeHRM e do Frappe está nesses arquivos `.vue` e nos *doctypes* Python/JSON. O REA também não detectou endpoints de API do OrangeHRM (0 literais `/api/v2/...`) e encontrou apenas 1 endpoint no Frappe.
- Todas as conclusões do REA vêm de **análise estática**: nenhum app foi executado. O próprio REA declara a cobertura do grafo como incompleta ("unavailable facts remain explicit and must not be read as absence").
- **Complemento sem REA:** para mapear telas e entidades, inventariei o código-fonte com ferramentas comuns (`ls`/`grep`). Foram vistos:
  - os *pages* `.vue` dos plugins Recruitment e Performance do OrangeHRM;
  - os *doctypes* `hrms/hr/doctype/*` do Frappe (`job_requisition`, `job_opening`, `job_applicant`, `interview`, `interview_feedback`, `job_offer`, `appointment_letter`, `employee_onboarding(_template)`, `appraisal*`, `employee_separation`, `exit_interview`, `staffing_plan`, `employee_referral`, `skill_assessment`) e o portal público `hrms/www/jobs`;
  - os módulos PHP do OpenCATS (`modules/candidates`: Duplicates, Merge, HotList, Questionnaire, ResumeView, SendEmail; `careers/`; `lib/DocumentToText.php`).
- Os artefatos ficaram em `/home/user/repos/rea-workspace/_out/*.json`.

### 1.3 Documentação pública (sem REA)

| Produto | O que foi encontrado | Confiabilidade |
|---|---|---|
| Gupy (gupy.io, páginas de setor e de preços) | Triagem e ordenação de currículos por agentes de IA, score de pré-entrevista, testes de mapeamento comportamental e fit cultural (Big Five), testes de habilidades, etapa de vídeo, candidatura pelo WhatsApp com login sem senha, dashboards de funil, diversidade e tempo de preenchimento. O Gupy Admissão faz validação de documentos por IA, integrada ao R&S. | Material de marketing do fornecedor; os recursos variam por plano. |
| Recrutei | Videoentrevista, chatbot de WhatsApp, assistente de IA (descrição de vaga, roteiro de entrevista, e-mails, recomendação de candidatos), banco de talentos, agendamento automático. | Fontes secundárias (b2bstack, rankmyai). |
| Sólides | ATS, avaliação de desempenho, e anúncio de "acompanhar e avaliar desempenho no período de experiência". | Página institucional sem detalhes. |
| Convenia | Não encontrei documentação pública específica. As regras de eSocial usadas como referência (S-2200 na admissão, envio até a véspera do início, contrato de experiência informado como contrato normal) vêm de conteúdo da Senior. | Fonte secundária. |
| Greenhouse / Lever / Workable | Greenhouse: *scorecards* e *interview kits* estruturados, revisão anônima de currículo. Lever: ATS + CRM de candidatos (nurture) e agendamento. Workable: publicação em vários portais com um clique, sourcing de passivos, scorecards compartilhados. | Comparadores (G2, pitchnhire e outros). |

Pipefy RH e Kenoby não foram pesquisados a fundo e ficaram fora da tabela.

### 1.4 O que o app atual já tem (linha de base)

Inventário por `grep` no `index.html` (sem modificar o arquivo):
- **Vagas:** etapas com SLA (Triagem CV RH, Triagem CV Gestor, Entrevista RH, Parecer, Entrevista Gestor, Aprovação…), régua de SLA, *aging* da carteira e status por cor no funil.
- **Candidatos:** registro simples. Cadastros auxiliares de fonte do candidato e motivo de perda; "Banco de talentos" existe só como status.
- **Admissão:** checklist com ASO e alerta "admitido com pendência".
- **Experiência:** 1ª e 2ª avaliação (45/90 dias, configuráveis), prorrogação e efetivação mês a mês e por empresa.
- **Outros módulos:**
  - Integração (status realizada/não se aplica)
  - Contratos de estágio (retorno do CIEE e tempo de assinatura por instituição)
  - Uniformes
  - Calendário com exportação `.ics`
  - Parâmetros e feriados
  - Metas de gestão
- **Dados e acesso:**
  - Senha e cofre cifrado
  - "Pacote de alterações" para trocar dados por e-mail/WhatsApp
  - Sincronização pelo GitHub
  - CSV e backup
- **Assistente:** comandos em linguagem natural, com voz (SpeechRecognition), e "Piloto automático".

---

## 2. Mapa de funcionalidades por sistema

Legenda: **●** tem · **◐** parcial/básico · **○** não tem · **?** não confirmado
Fontes: **REA+fonte** (open source) ou **doc. pública** (comercial).

| Funcionalidade | Fagron (atual) | Frappe HR (REA+fonte) | OrangeHRM 5 (REA+fonte) | OpenCATS (REA+fonte) | Gupy (doc. pública) | Recrutei (doc. pública) | Greenhouse/Lever/Workable (doc. pública) |
|---|---|---|---|---|---|---|---|
| Requisição/aprovação de vaga | ◐ (etapa "Aprovação") | ● `job_requisition`, `staffing_plan` | ○ | ○ | ● | ? | ● |
| Funil com SLA por etapa | ● | ◐ | ◐ (status/ações) | ● `pipeline.js` | ● | ● | ● |
| Perfil completo do candidato + histórico de ações | ◐ | ● `job_applicant` | ● `ViewCandidateProfile`, `ViewActionHistory` | ● | ● | ● | ● |
| Página pública de vagas / candidatura online | ○ | ● `www/jobs` | ● `ApplyJobVacancy` | ● `careers/`, `careerPortalApply.js` | ● (inclusive WhatsApp) | ● | ● |
| Anexo e leitura de currículo (parsing) | ○ | ◐ | ● (anexos) | ● `candidateParser.js`, `DocumentToText.php` | ● (IA) | ● | ● |
| Detecção/mescla de duplicados | ○ | ● `prevent_duplicate_applicant` | ? | ● `Duplicates`, `Merge` | ? | ? | ● |
| Banco de talentos / listas / busca salva | ◐ (status) | ◐ | ◐ | ● `HotList`, `searchSaved.js` | ● | ● | ● (CRM Lever) |
| Agendamento de entrevista | ◐ (datas manuais, .ics) | ● `interview` | ● `InterviewScheduleAction` | ● calendário | ● | ● (automático) | ● |
| Scorecard / feedback estruturado de entrevista | ○ | ● `interview_feedback`, `skill_assessment` | ◐ (aprovado/reprovado) | ◐ `questionnaire.js` | ● | ● | ● (Greenhouse) |
| Testes comportamentais/técnicos | ○ | ○ | ○ | ◐ questionário | ● (Big Five, habilidades) | ? | ◐ |
| Proposta (oferta) e carta | ○ | ● `job_offer`, `appointment_letter_template` | ● `OfferJobAction`, `DeclineOfferAction` | ○ | ● | ? | ● |
| E-mail/WhatsApp ao candidato com template | ○ (só envio de pacote) | ● | ◐ | ● `emailHandler.js`, `SendEmail` | ● | ● (chatbot) | ● |
| Admissão digital (candidato envia documentos) | ○ (checklist interno) | ◐ | ○ | ○ | ● (validação por IA) | ? | ○ |
| Onboarding por template de atividades com responsável | ◐ (status de integração) | ● `employee_onboarding_template`, `employee_boarding_activity` | ○ | ○ | ? | ? | ◐ |
| Avaliação do período de experiência com formulário | ◐ (datas/resultado) | ● `appraisal`, `appraisal_template` | ● `SelfEvaluation`, `AdminEvaluation`, KPI | ○ | ? | ? | ○ |
| Autoavaliação + avaliação do gestor | ○ | ● | ● | ○ | ? | ? | ○ |
| Desligamento / entrevista de saída | ○ | ● `employee_separation`, `exit_interview` | ○ | ○ | ○ | ○ | ○ |
| Indicação de colaboradores | ○ | ● `employee_referral` | ○ | ○ | ● | ? | ● |
| Dashboards (funil, time-to-fill, fonte) | ● (SLA, aging, efetivação) | ● | ● Dashboard | ● `charts.js`, reports | ● (+diversidade) | ● | ● |
| Diversidade/EEO | ○ | ○ | ○ | ● `eeo.js` | ● | ? | ● |
| Perfis de acesso (ACL), política de senha, SSO | ◐ (senha única/cofre) | ● | ● `acl.ts`, `usePasswordPolicy`, OpenID/LDAP | ● | ● | ● | ● |
| Importação em massa | ◐ (CSV) | ● | ● | ● `massImport.js` | ● | ● | ● |
| Notificações (push/e-mail) | ◐ (alertas na tela) | ● `pushNotifications.js`, `realtime.js` | ● | ◐ | ● | ● | ● |
| App mobile / PWA | ○ | ● (Ionic/PWA) | ● Mobile plugin | ○ | ● | ● | ● |
| IA (triagem, geração de textos) | ◐ (assistente por comandos) | ○ | ○ | ◐ `match.js` (por regras) | ● | ● (assistente "Rê") | ◐ |

---

## 3. Funcionalidades ausentes no app atual

Esforço considerando a arquitetura atual (arquivo único, dados locais, sincronização por GitHub e pacotes de alteração): **P** = até 2 dias · **M** = 3 a 10 dias · **G** = mais de 10 dias ou exige backend/serviço externo.

### 3.1 Recrutamento / ATS

| Funcionalidade | Prioridade | Valor para RH | Esforço |
|---|---|---|---|
| **Ficha do candidato com linha do tempo** (cada mudança de etapa registrada com data, usuário e comentário, como em `ViewActionHistory`/OrangeHRM) | Alta | Rastreabilidade do processo e defesa em auditorias; acaba com o "quem moveu?" | M |
| **Kanban de candidatos por vaga** (arrastar entre etapas) | Alta | Visão do funil por vaga, não só da vaga; reduz cliques | M |
| **Detecção de candidato duplicado** (CPF/e-mail/telefone) e mescla (OpenCATS `Duplicates/Merge`) | Alta | Evita retrabalho e conflito entre recrutadoras | P |
| **Banco de talentos real** com tags, busca salva e "reaproveitar em outra vaga" (OpenCATS `HotList`, `searchSaved`) | Média | Reduz time-to-fill de vagas recorrentes (operação, laboratório) | M |
| **Scorecard estruturado de entrevista** (critérios com nota 1–5 por competência e parecer padronizado; Greenhouse e Frappe `interview_feedback`) | Alta | Decisões mais justas e comparáveis; alimenta o "Parecer" já existente | M |
| **Proposta/carta-oferta por template** com aceite/recusa e motivo (Frappe `job_offer`, OrangeHRM `OfferJob/DeclineOffer`) | Média | Padroniza ofertas e mede a taxa de recusa | P–M |
| **Requisição de vaga com aprovação do gestor/diretoria** e quadro planejado (Frappe `job_requisition`, `staffing_plan`) | Média | Controle orçamentário de headcount | M |
| Página pública de vagas / formulário de candidatura | Baixa | Atração direta, mas exige hospedagem e cuidados com LGPD | G |
| Anexo de currículo com extração de texto (parsing) | Baixa | Busca por palavra-chave, mas pesa no arquivo único | G |

### 3.2 Admissão digital

| Funcionalidade | Prioridade | Valor para RH | Esforço |
|---|---|---|---|
| **Checklist de documentos por cargo/empresa** (modelos: CLT, estágio, PCD, menor aprendiz) com status por documento e prazo | Alta | Menos admissões "com pendência" e dados para cobrar o candidato | P–M |
| **Link/formulário para o candidato preencher os dados admissionais** (ficha cadastral, dependentes, conta bancária) | Média | Elimina redigitação; é o carro-chefe do Gupy Admissão | G (precisa de coleta externa, por exemplo um formulário Tally ou Google Forms importado) |
| **Controle de ASO e exames** com clínica, data agendada, resultado (apto/inapto) e alerta | Alta | O ASO já é citado no app; falta o fluxo completo | P |
| **Prazo do eSocial S-2200** (alerta "enviar até D-1 do início") | Alta | Evita multa; é exigência legal | P |
| **Geração de documentos** (contrato de experiência, termo de uniforme, carta de boas-vindas) a partir de template | Média | Padronização e menos erro de digitação | M |
| Assinatura eletrônica integrada | Baixa | Ganho real, mas depende de fornecedor pago | G |

### 3.3 Experiência e avaliação

| Funcionalidade | Prioridade | Valor para RH | Esforço |
|---|---|---|---|
| **Formulário de avaliação de experiência** (critérios + nota + recomendação: efetivar/prorrogar/desligar) nos marcos de 45 e 90 dias (OrangeHRM `AdminEvaluation`, Frappe `appraisal_template`) | Alta | Hoje o app guarda datas e resultados, mas não a avaliação em si; dá base à decisão e à defesa trabalhista | M |
| **Autoavaliação do colaborador + avaliação do gestor** | Média | Engajamento e feedback bilateral | M |
| **Lembrete ativo ao gestor** (e-mail/WhatsApp com link, X dias antes do vencimento) | Alta | Reduz efetivação automática por esquecimento (passar dos 90 dias) | P–M |
| **Plano de desenvolvimento de 30/60/90 dias** vinculado à avaliação | Baixa | Acompanhamento qualitativo | M |
| **Desligamento no período e entrevista de saída** (motivos padronizados; Frappe `exit_interview`) | Média | Explica turnover precoce por vaga, gestor e fonte | P–M |

### 3.4 Onboarding / integração

| Funcionalidade | Prioridade | Valor para RH | Esforço |
|---|---|---|---|
| **Template de atividades de onboarding** por cargo (TI, crachá, EPI, uniforme, treinamento NR, apresentação) com **responsável e prazo** (Frappe `employee_onboarding_template`) | Alta | Transforma "integração realizada" em um processo controlado; pode reaproveitar Uniformes | M |
| **Padrinho/buddy** e agenda da primeira semana | Baixa | Experiência do novo colaborador | P |
| **Pesquisa de satisfação do onboarding** (eNPS do recém-admitido aos 30 dias) | Média | Indicador de qualidade da integração | P |
| Treinamentos obrigatórios com validade (Frappe `training_event`) | Baixa | Compliance (NRs, BPF em farmácia/manipulação) | M |

### 3.5 People analytics

| Funcionalidade | Prioridade | Valor para RH | Esforço |
|---|---|---|---|
| **Time-to-fill e time-to-hire** por cargo, gestor, empresa e recrutadora (além do SLA por etapa) | Alta | KPIs clássicos que a diretoria cobra | P |
| **Conversão por etapa e por fonte** (funil de candidatos: inscritos → entrevistados → aprovados → admitidos → efetivados) | Alta | Mostra onde se perde gente e qual fonte traz quem fica | M |
| **Turnover precoce (≤90 dias)** e **taxa de efetivação por fonte/gestor** | Alta | Ligação direta entre a qualidade da contratação e a experiência, um diferencial do app | P |
| Taxa de aceite de proposta e motivos de recusa | Média | Calibra a política salarial | P |
| Indicadores de diversidade (opcionais e com consentimento; OpenCATS `eeo.js`) | Baixa | ESG, mas exige base legal da LGPD para dado sensível | M |

### 3.6 Integrações

| Funcionalidade | Prioridade | Valor para RH | Esforço |
|---|---|---|---|
| **Templates de mensagem** (WhatsApp `wa.me` e `mailto:` pré-preenchidos: convite para entrevista, devolutiva, documentos) | Alta | Comunicação padronizada sem backend | P |
| **Convite de calendário por entrevista** (o `.ics` já existe; gerar por candidato/entrevistador) | Média | Menos faltas | P |
| Importação de candidatos de portais (CSV do LinkedIn, Indeed, InfoJobs) | Média | Elimina digitação | M |
| Exportação para folha/eSocial (layout do sistema de DP) | Baixa | Evita redigitação no DP | G |
| Formulários externos (Tally/Google Forms) → importação no app | Média | Viabiliza autoatendimento sem servidor | M |

### 3.7 LGPD / segurança

| Funcionalidade | Prioridade | Valor para RH | Esforço |
|---|---|---|---|
| **Perfis de acesso** (admin, recrutadora, gestor só-leitura das suas vagas; OrangeHRM `acl.ts`) | Alta | Hoje a senha é única; gestor não deveria ver salário e dados de outros | M–G |
| **Log de auditoria** (quem alterou o quê e quando) | Alta | Exigência de accountability da LGPD (art. 37) | M |
| **Retenção e anonimização** de candidatos não contratados após X meses, com exclusão a pedido do titular | Alta | Base legal e minimização de dados (art. 6º e 16) | P–M |
| **Registro de consentimento/base legal** por candidato (banco de talentos) | Média | Permite reaproveitar candidatos legitimamente | P |
| Política de senha forte, bloqueio por tentativas, expiração de sessão (OrangeHRM `usePasswordPolicy`) | Média | Proteção do cofre local | P |
| Mascarar CPF/dados sensíveis em exportações CSV | Média | Reduz vazamento em planilhas circulando por e-mail | P |

### 3.8 Automação / IA

| Funcionalidade | Prioridade | Valor para RH | Esforço |
|---|---|---|---|
| **Gatilhos automáticos** (ao mover para "Aprovação" → criar admissão; ao admitir → criar experiência + onboarding + uniforme) | Alta | Elimina digitação dupla entre módulos; amplia o "Piloto automático" | M |
| **Geração de descrição de vaga, roteiro de entrevista e parecer com IA** (como o assistente "Rê" da Recrutei; a skill de parecer já existe fora do app) | Média | Ganho de tempo da recrutadora | M (exige chave de API/LLM) |
| Ranking/triagem de currículos por IA | Baixa | Volume alto ajuda, mas há risco de viés e exige explicabilidade e revisão humana (LGPD art. 20) | G |
| Resumo semanal automático (vagas críticas, experiências a vencer) por e-mail | Média | Gestão proativa | M |

---

## 4. Top 10 recomendações

1. **Formulário de avaliação de experiência (45/90 dias) com recomendação e lembrete ao gestor.** Fecha a principal lacuna do módulo que é o diferencial do app.
2. **Linha do tempo e log de auditoria por candidato/vaga** (quem, quando, o quê). Ajuda na rastreabilidade e na LGPD.
3. **Gatilhos entre módulos** (aprovado → admissão → experiência + onboarding + uniforme). Elimina retrabalho e reaproveita o "Piloto automático".
4. **Checklist de admissão por modelo de contratação**, com controle de ASO e alerta do prazo do eSocial S-2200.
5. **Indicadores time-to-fill/time-to-hire, conversão por fonte e turnover precoce (≤90 dias).** Liga recrutamento e experiência em um painel único.
6. **Scorecard estruturado de entrevista** que alimente automaticamente o "Parecer".
7. **Templates de onboarding com responsável e prazo** (TI, EPI, treinamento, uniforme), em vez de um status único de "integração".
8. **Retenção/anonimização de candidatos e registro de consentimento** (LGPD), com rotina de expurgo.
9. **Templates de comunicação por WhatsApp/e-mail** (links `wa.me`/`mailto:` pré-preenchidos) e convite `.ics` por entrevista. Alto valor e esforço baixo.
10. **Perfis de acesso** (gestor com visão restrita às próprias vagas e experiências) e deduplicação de candidatos por CPF/e-mail.

> Ficaram de fora do Top 10 por exigirem backend ou fornecedor pago: portal público de vagas, admissão com autoatendimento do candidato, assinatura eletrônica, parsing de currículo e triagem por IA. São candidatos a uma fase 2, caso o app saia do modelo de arquivo único.

---

### Fontes (documentação pública)

- Gupy: https://www.gupy.io/setores-tecnologia · https://www.gupy.io/setores-saude · https://gupy.io/precos · https://www.gupy.io/blog/automacao-triagem-curriculos · https://gupy.io/software-de-admissao-digital (citada pela busca; o fetch direto falhou por DNS)
- Recrutei: https://www.b2bstack.com.br/product/recrutei/funcionalidades · https://www.rankmyai.com/tools/fded7ab5-edca-4761-8acf-1b9711b50f12/recrutei
- Sólides: https://solides.com.br/solucoes/desenvolvimento-e-performance/ · https://www.b2bstack.com.br/product/solides
- eSocial/admissão (Senior): https://www.senior.com.br/blog/admissao-esocial
- Greenhouse/Lever/Workable: https://www.g2.com/compare/greenhouse-vs-lever-talent-suite · https://www.pitchnhire.com/comparisons/greenhouse-vs-workable · https://peoplemanagingpeople.com/tools/workable-vs-greenhouse/

### Artefatos REA (locais)

- `/home/user/repos/rea-workspace/_out/frappe-hrms_frontend_src.json` (`ev_5e4b15af16c2597c1a0fb7e184e98908cec393652bef9a282c8ff8ae8bcb1526`)
- `/home/user/repos/rea-workspace/_out/orangehrm_src_client_src.json` (`ev_d90c3e80a44e07fd95b5fc8d8dacbddffe024a464446bc45f567ce287f1f3f1e`)
- `/home/user/repos/rea-workspace/_out/opencats_js.json` (`ev_465a459aa0d03ce5df66e283e5a2da0611d82c6b4f6435be7f12f07df2c48ba2`, cobertura parcial)
