# 01 — Inventário funcional do sistema atual

**Sistema:** Controle de Vagas Fagron ("Controle de Vagas, SLA e Experiência", Recrutamento & Seleção, Grupo Fagron)
**Artefato analisado:** `index.html` (arquivo único, ~311 KB, 5.826 linhas, HTML + CSS + JavaScript inline, sem build e sem dependências além da fonte Inter do Google Fonts)
**Versão do programa no código:** `VERSAO_APP = 18`; formato de dados `versao: 2`; carimbo de reset da semente `2026-08-22-limpeza-2`
**Data do levantamento:** 20/10/2026
**Escopo:** leitura estática do código. Nada foi executado nem alterado em `index.html`.

> As referências `L####` apontam para linhas de `index.html`.

---

## 1. Visão geral da arquitetura

| Bloco | Linhas | Conteúdo |
|---|---|---|
| Script de "versão avulsa" | L10–60 | Intercepta `fetch('dados.json')` (relativo) e o devolve a partir do `localStorage['fagron-rs-html']`; cria um `window.claude.use('artifact').publish()` falso que grava no mesmo `localStorage`. Assim o mesmo código roda como artefato do Claude ou como arquivo/GitHub Pages. |
| `<head>`, CSS | L61–762 | Estilos, tema claro/escuro, fonte Inter. |
| Esqueleto HTML | L764–822 | Topbar (botões Exportar CSV, Enviar alterações, Cópia de segurança, Assistente, Sincronizar, Salvar), barra de abas, aviso de cópia local, 10 `<section class="panel">`, painel do assistente (`as-*`), toast, modal, cadeado. |
| Semente JSON | L824 | `<script type="application/json" id="semente">` com parâmetros padrão, listas vazias, coleções vazias e `"trancado": true`. |
| Aplicação | L826–5446 | Estado global `S`, cálculos, renderizadores de cada aba, eventos, salvamento, CSV, criptografia, pacotes, sincronização GitHub, migração/normalização e inicialização. |
| Assistente | L5447–5822 | IIFE isolada: prioridades, perguntas calculadas, interpretação de frases, ditado por voz. |

Padrão de implementação: estado único em memória (`S`), renderização por concatenação de *template strings* em `innerHTML` (com `esc()` para escapar HTML), delegação de eventos em `document` (`change`, `click`, `input`, `keydown`, `focusout`, `paste`) baseada em atributos `data-*`.

---

## 2. Módulos / abas

Abas definidas em `ABAS` (L3046): Painel, Calendário, Vagas, Admissão, Experiência, Integração, Contratos, Uniformes, Base, Parâmetros. As badges das abas mostram vagas abertas, admissões pendentes, experiências atrasadas, integrações pendentes e compromissos atrasados (`renderTabs`, L3058).

> Observação: `p-sinc` e `p-senha` **não são abas**. São botões dentro da aba Parâmetros que abrem os modais de Sincronização (`telaSinc`) e de Senhas/Pessoas (`telaSenhas` / `telaUsuarios`). Existem também `p-receber` (receber pacote) e `p-zerar` (zerar registros).

### 2.1 Painel (`p-painel`, `renderPainel` L1048)
Somente leitura, com indicadores:
- **Cartões:** vagas em aberto; aging médio das abertas (alvo = SLA total, mais a mediana); vagas críticas; Time to Fill médio e mediana; % dentro do SLA (contra `metaSla`); avaliações de experiência atrasadas e vencendo em até 7 dias; taxa de efetivação.
- **Aging da carteira aberta:** barras por vaga, com linha vertical no SLA total e cor do farol.
- **SLA por etapa:** tabela com etapa, SLA, no prazo, atrasadas e %.
- **Admissões por mês:** colunas dos últimos 12 meses, pela data de admissão das vagas fechadas.
- **Por empresa:** abertas, fechadas, TTF médio e mediana.

### 2.2 Calendário (`p-calendario`, `renderCalendario` L2990, `compromissos` L2803)
Visão para a frente: tudo o que está pendente, com a data em que deveria acontecer.
- **Fontes de compromissos:**
  - Vaga aberta: a próxima etapa não cumprida, com prazo = abertura + SLA da etapa em **dias úteis**.
  - Vaga aprovada sem data de admissão: "Informar a data de admissão".
  - Experiência: decisão de prorrogação (45 d) e de efetivação (90 d), em **dias corridos**.
  - Contrato CIEE sem retorno: limite = solicitação + `slaCiee` dias úteis.
  - Integração não feita: a data-alvo é a admissão.
  - Uniforme não entregue: a data-alvo é a admissão.
  - Anotações com data de lembrete.
- **Baldes:** Atrasado, Hoje, Amanhã, Ainda esta semana, Próximos 15 dias, Mais para a frente.
- **Vistas:** Lista ou Mês (grade seg–dom, navegação entre meses). Filtros por tipo.
- **Ações:** o ✓ marca como feito hoje e grava a data no registro. O clique na linha abre um modal para escolher a data, responder Sim/Não (experiência) ou marcar a anotação como resolvida (`resolverCompromisso`, L2929). Quando o compromisso é de vaga, a ação dispara a propagação (`propagarVaga`).

### 2.3 Vagas (`p-vagas`, `renderVagas` L1336)
Grade principal do funil, com colunas fixas e ordenação por cabeçalho.
- **Filtros:** Em aberto / Críticas / Fora do SLA / Todas, empresa e busca (cargo, empresa, aprovado, substituído, ID).
- **Campos editáveis:**
  - Identificação: `status` (lista Base com cor), `empresa`, `cargo`, `substituido`, `aprovado`, `inicio` (data de admissão).
  - Prazos: `abertura`, as 8 datas de etapa (`etapas[]`).
  - Detalhes: `tipo`, `depto`, `gestor`, `salario`, `obs`, `medirSla` (checkbox).
  - O modelo também tem `prioridade` e `talent`, que não aparecem na grade (`novaVaga`, L3715).
- **Colunas calculadas (`calcVaga`, L986):** farol de aging (Saudável / Atenção / Crítico / Concluída), dias em aberto, etapa atual, dias na etapa, status de SLA (Dentro/Fora com nº de etapas atrasadas), cor de cada etapa (OK/ATRASADO), TTF.
- **Ações:** + Nova vaga (ID `V0001`…, status inicial `TRIAR`, `medirSla=true`), excluir, voltar à ordem original.
- **Anotações rápidas** (`blocoAnotacoes`, L1428) abaixo da grade: texto (até 400 caracteres), vaga vinculada opcional, data de lembrete, marcar como feita, apagar, limpar concluídas.

### 2.4 Admissão (`p-admissao`, `renderAdmissao` L1927, `calcAdm` L1905)
Checklist do processo admissional. A linha nasce automaticamente quando a vaga é aprovada ou fechada.
- **Campos:** `idVaga` (com datalist de vagas) e `itens[]` (um SIM / NÃO / N/A por tarefa da lista `checklist` da Base). Empresa, cargo, gestor, substituído, colaborador e início são **lidos da vaga**, não ficam armazenados na admissão.
- **Cálculos:** % concluído (SIM ÷ itens diferentes de N/A), próxima pendência e situação (Concluída / Em andamento / Início em N d se faltarem até 5 dias / Admitido com pendência).
- **Ações:** clique na célula alterna NÃO → SIM → N/A; Lançar admissões varre as vagas fechadas; excluir; filtros (Em andamento/Todas, empresa, busca).
- Ao mexer no checklist, chama `sincronizarExperiencia/Integracao/Contratos/Uniformes`.

### 2.5 Experiência (`p-experiencia`, `renderExperiencia` L1487, `calcExp` L1021)
Controle do contrato de experiência (CLT).
- **Campos:** `empresa`, `gestor`, `cargo`, `nome`, `admissao`, `prorrog` (SIM/NÃO), `efetiv` (SIM/NÃO). Também existem `depto`, `env1`, `env2` (históricos), `obs` e `idVaga`.
- **Cálculos:** limite do 1º período = admissão + 45 − 1; limite total = admissão + 90 − 1; dias de casa; marco (vencido / vence em ≤7 d / faltam N d / decidido); ação sugerida.
- **Indicadores da aba:** em experiência, decisões atrasadas, vencendo em 7 dias, taxa de prorrogação, taxa de efetivação, tempo médio de casa, efetivação por empresa (barra com a meta) e efetivação mês a mês (pelo mês do limite de 90 dias).
- **Ações:** Lançar experiências (traz da Admissão com 100%), + Novo colaborador, filtros (Atrasadas/Em curso/Todas, empresa, período de admissão, busca).

### 2.6 Integração (`p-integracao`, `renderIntegracao` L2016, `calcIntegr` L2005)
Controle de integração de **uma empresa só** (`params.empresaIntegracao`, padrão FAGRON SERVICES).
- **Campos:** `admissao`, `empresa`, `nome`, `setor`, `gestor`, `feito` (SIM/NÃO/N/A), `dataIntegr`, `obs`, `idVaga`.
- **Situação:** Realizada (com dias entre admissão e integração) / Não se aplica / Sem data de admissão / Pendente / Pendente há N d (acima de 30 dias vira crítico).
- **Ações:** lançar integrações, + novo, preencher a empresa em lote nos registros históricos sem empresa, filtros.

### 2.7 Contratos (`p-contratos`, `renderContratos` L2123, `calcContrato` L2101)
Contratos de estágio via CIEE.
- **Campos:** `empresa`, `nome` (estagiário), `faculdade` (lista `instituicoes`), `solic`, `retorno`, `assinado`, `obs`, `idVaga`.
- **Cálculos (dias úteis, sem feriados da Base):**
  - Limite CIEE = solicitação + `slaCiee` (2) dias úteis.
  - Dias de retorno e dias até a assinatura.
  - Prazo: atrasado / vence hoje / faltam N d / no prazo / N d além.
  - Situação: Aguardando CIEE / Aguardando assinatura / Assinado.
- **Análises:** contratos em aberto, fora do prazo (voltaram atrasados + ainda devendo), retorno médio, pior retorno, % de cumprimento, assinatura média, retorno médio por instituição, retorno mês a mês, tabela de desempenho por instituição.
- **Ações:** lançar contratos, + novo, filtros (Em aberto/Todos, empresa, período de solicitação, busca).

### 2.8 Uniformes (`p-uniformes`, `renderUniformes` L2352, `renderFolhaUniformes` L2319)
Somente para as empresas em `params.empresasUniforme` (padrão FAGRON SERVICES e FAGRON DISTRIBUTION).
- **Campos:**
  - Vindos da vaga: `empresa`, `nome`, `vaga` (Nova posição/Reposição), `admissao`, `cargo`, `setor`.
  - Preenchidos à mão: `nascimento`, `telefone`, `cpf`, `terceiro` (lista `terceiros`, padrão NA), `sapato`, `camisa`, `calca` (lista `tamanhos` PP–XG), `entregue` (SIM/NÃO), `dataEntrega`, `obs`, `idVaga`.
- **Ações:** lançar uniformes, + novo, **Ver para imprimir** (folha em texto puro para print ou envio ao fornecedor), filtros. Aviso de registros sem tamanho.
- **Atenção LGPD:** aba com CPF, data de nascimento e telefone.

### 2.9 Base (`p-base`, `renderBase` L2711)
Cadastro das listas que alimentam todos os menus (`LISTAS_META`, L2680): empresas, cargos, gestores, departamentos, statusVaga, tipoVaga, statusCand, fontes, motivos, instituicoes, terceiros, tamanhos, feriados e checklist.
- Adicionar, remover (pede confirmação se o valor estiver em uso) e renomear. **Renomear propaga para todos os registros** (`renomearValor`).
- Contagem de uso por item, itens "fora da lista, mas em uso" (órfãos) com botão para incluir, reordenação ↑↓ nas listas ordenadas e cor de status (paleta fixa) para statusVaga e statusCand.
- O checklist mantém as respostas das admissões alinhadas ao incluir, remover ou trocar posição (`checklistEntrou/Saiu/Trocou`).
- Os menus permitem "＋ cadastrar novo…" direto na grade (`cadastrarNaBase`).

### 2.10 Parâmetros (`p-parametros`, `renderParametros` L1655)
- Régua de SLA: dias corridos acumulados por etapa. O maior valor é o TTF alvo.
- Aging: `agingVerde` (0,7) e `agingAmarelo` (1,0) como fração do SLA total.
- Experiência: `expP1` (45) e `expP2` (90).
- Contratos: `slaCiee` (2 dias úteis).
- Uniformes: empresas que fornecem uniforme (checkbox).
- Integração: empresa controlada.
- Metas: `metaSla` (0,9) e `metaEfetivacao` (0,7). Na semente existem também `metaCandVaga` (8) e `metaComparecimento` (0,7), sem uso na interface atual.
- **Sincronização** (botão `p-sinc` → `telaSinc`).
- **Pessoas com acesso** (botão `p-senha` → `telaSenhas` ou `telaUsuarios`).
- Piloto automático: `autoSalvar` (grava 25 s após a última edição) e `autoBuscar` (puxa a cada 45 s).
- Versão do programa: local × remota, com aviso de desatualizada.
- **Somente administradora:** Receber pacote (`p-receber`) e Zerar registros (`p-zerar`, apaga todas as coleções e mantém Base e parâmetros).

### 2.11 Assistente (`as-*`, L5447–5822)
Painel lateral aberto pelo botão "Assistente", com badge de atrasados atualizada a cada 2 s.
- **Ordem do dia:** `prioridades()` reaproveita `compromissos()` e aplica peso por tipo (experiência 300, vaga 180, contrato 140, integração 120, uniforme 100, nota 60), somado a uma componente de atraso ou proximidade. Mostra o top 4 com o motivo.
- **Perguntas prontas (chips):** "O que está fora do SLA?", "O que vence esta semana?", "Qual a vaga mais crítica?", "Como está a experiência?", "Como estamos no mês?". As respostas são calculadas, sem LLM.
- **Lançamento por linguagem natural (regras e regex, sem IA):**
  - Etapa de vaga + data. A vaga é achada por ID `V0001` ou por similaridade de cargo, empresa ou aprovado; a etapa, por sinônimos. Datas aceitas: hoje, amanhã, dd/mm, "dia 20", dia da semana.
  - Decisão de experiência (prorrogar/efetivar SIM ou NÃO).
  - Anotação com lembrete.
- **Confirmação:** sempre mostra uma ficha "É isto que eu entendi?" e só grava após confirmar.
- **Voz:** ditado via Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition`, `pt-BR`). O código avisa que o áudio sai da máquina (no Chrome é processado em servidor do Google).

### 2.12 Recursos transversais
- **Exportar CSV desta aba** (`exportarCSV`, L4462): somente administradora. Gera CSV com `;` e BOM, inclui as colunas calculadas e é exibido num textarea para copiar, sem download. Abas cobertas: vagas (padrão), experiência, admissão, integração, contratos, uniformes.
- **Cópia de segurança / Enviar alterações** (`gerarPacote`, L4572): bloco de texto `----- PACOTE R&S FAGRON -----` em base64, cifrado com a chave do cofre quando há senha, para guardar ou mandar por e-mail/WhatsApp.
- **Receber pacote** (`telaReceber` / `lerPacote` / `compararPacote` / `aplicarPacote`): mostra o diff (novos, alterados, apagados, conflitos dos dois lados) e incorpora. Por padrão mantém a versão local nos conflitos.
- **Autoria por registro:** `_por` e `_em` carimbados antes de gravar (`carimbarAutoria`) e exibidos no *tooltip* da linha. É a única trilha de alteração existente.
- Atalhos e proteções: Ctrl/Cmd+S salva; aviso `beforeunload` com alterações pendentes; salva ao esconder a aba; puxa ao voltar o foco.
- Ao editar, o sistema preserva o scroll e o foco (`contextoUI` / `restaurarUI`).

---

## 3. Modelo de dados inferido

Estado raiz `S` (normalizado em `normalizar`, L5233):

```
S = { versao, reset, migr{}, params{...}, listas{...},
      vagas[], candidatos[], experiencia[], admissao[], integracao[],
      contratos[], uniformes[], notas[] }
```
Quando o cofre está ativo, o arquivo gravado inclui ainda o cabeçalho do cofre: `cofre, v, app, usuarios[]`, além de `iv` e `ct`.

### 3.1 Entidades

| Entidade | Prefixo ID | Campos principais | Chave de ligação |
|---|---|---|---|
| **Vaga** | `V0001` | id, empresa, cargo, depto, tipo, substituido, gestor, salario, abertura, status, prioridade, etapas[8], aprovado, inicio, talent, medirSla, obs, _por, _em | — (raiz) |
| **Admissão** | `A0001` | id, idVaga, itens[] (SIM/NÃO/N/A por tarefa do checklist), obs | `idVaga` → Vaga (1:1) |
| **Experiência** | `E0001` | id, idVaga, nome, empresa, cargo, depto, gestor, admissao, env1, prorrog, env2, efetiv, obs | `idVaga` → Vaga (opcional) |
| **Integração** | `I0001` | id, idVaga, admissao, nome, empresa, setor, gestor, feito, dataIntegr, obs | `idVaga` (opcional) |
| **Contrato (CIEE)** | `K0001` | id, idVaga, nome, empresa, faculdade, solic, retorno, assinado, obs | `idVaga` (opcional) |
| **Uniforme** | `U0001` | id, idVaga, empresa, nome, vaga, nascimento, telefone, cpf, admissao, cargo, setor, terceiro, sapato, camisa, calca, entregue, dataEntrega, obs | `idVaga` (opcional) |
| **Anotação** | `N0001` | id, texto, idVaga, quando, feito, criada | `idVaga` (opcional) |
| **Candidato** | — | status, fonte, motivo, empresa, cargo, curriculo, curriculoArq, curriculoTexto… | **Coleção legada:** existe no estado, na Base (statusCand, fontes, motivos) e nas cores, mas **não há aba nem tela** na versão atual. |
| **Usuário (cofre)** | `U1`, `U2`… | id, nome, papel (`admin`/`equipe`), ativo, emb {sal, iv, ct} | — |

Quem trabalha como "equipe" ou em cópia local gera IDs com sufixo aleatório (`V0012EA7`) para evitar colisão (`proxId`, L3705).

### 3.2 Relacionamentos e propagação ("a vaga manda")

```
Vaga ──(aprovada: data da última etapa OU status fechado)──► Admissão (1:1, automática)
Admissão ──(checklist 100%)──────────────────────────────────► Experiência
Admissão ──(empresa = empresaIntegracao e aprovado preenchido)─► Integração
Admissão ──(cargo contém "ESTAGI" e aprovado preenchido)──────► Contrato CIEE
Admissão ──(empresa ∈ empresasUniforme e aprovado preenchido)─► Uniforme
Vaga ──(espelharDaVaga)──► atualiza inicio/aprovado/empresa/cargo/depto/gestor/tipo
                           em Experiência, Integração, Uniforme (Contrato: só nome e empresa)
```
- Os registros nascem uma única vez por `idVaga` (`sincronizar*`, L2464–2620). Registros criados à mão, sem `idVaga`, não são espelhados.
- Campos espelhados: `ESPELHADOS = ['inicio','aprovado','empresa','cargo','depto','gestor','tipo']`.
- As pontes **não** rodam no carregamento, apenas quando há edição ou quando se usa "Lançar …".

### 3.3 Estados e workflows

- **Status da vaga.** Cores padrão em `COR_STATUS_VAGA`; a lista real vem da Base:
  - Andando: ABORDAGENS, TRIAR → PRIMEIRA ETAPA, SEGUNDA ETAPA → FAZER PARECER, PARECER ENVIADO.
  - Parada: AGUARDAR, PRECISA ALINHAR.
  - Encerrada: FECHADA (verde), CONGELADA, CANCELADA.
  - `ABERTO(st)` considera aberta qualquer vaga fora de FECHADA, CANCELADA e CONGELADA. `VAGA_FECHADA` aceita regex `FECHAD|CONCLU|ADMITID|CONTRATAD` ou cor verde.
- **Régua de etapas (v2, 8 etapas, SLA acumulado desde a abertura, em dias corridos):** 1 Alinhamento (1), 2 Divulgação (2), 3 Triagem CV RH (5), 4 Triagem CV Gestor (7), 5 Entrevista RH (9), 6 Parecer (10), 7 Entrevista Gestor (15), 8 Aprovação (18). Migração automática da régua antiga de 10 etapas (`migrarEtapas`, `DE_10_PARA_8`); a antiga "Admissão concluída" virou `inicio`.
- **Ciclo da vaga:** abertura → etapas datadas → Aprovação (encerra o aging) → data de admissão (sai de "Em aberto") → admissão/checklist → experiência/integração/contrato/uniforme.
- **Status de candidato (legado):** Em triagem, Banco de talentos, Entrevista RH agendada/realizada, Parecer enviado, Entrevista gestor agendada/realizada, Aprovado(a), Reprovado(a), Não compareceu, Sem retorno, Não possui interesse, Já está trabalhando, Desistiu.
- **Experiência:** sem decisão → prorrog SIM (aguarda a efetivação aos 90) ou NÃO (encerra aos 45) → efetiv SIM/NÃO.
- **Contrato:** Aguardando CIEE → Aguardando assinatura → Assinado.
- **Integração:** NÃO → SIM (Realizada) ou N/A.
- **Uniforme:** entregue vazio/NÃO → SIM.

### 3.4 Persistência

| Mecanismo | Detalhe |
|---|---|
| **Semente embutida** | JSON em `#semente` (L824) com padrões e `trancado: true`. Na versão publicada a página não traz dado nenhum. |
| **`localStorage['fagron-rs-html']`** | Faz o papel do "dados.json" na versão avulsa (*shim* L10–60). |
| **`localStorage['fagron-rs-local']`** | Cópia de trabalho de quem não consegue gravar na cópia de todos (`{ts, carga}`), possivelmente cifrada. |
| **`localStorage['fagron-rs-token']`** | **Token do GitHub (PAT) em texto claro** no navegador. |
| **`localStorage['fagron-rs-sinc']`** | `{repo, arquivo, branch}` para a tela de entrada saber onde buscar. |
| **Plataforma de artefatos do Claude** | `window.claude.use('artifact').publish({'dados.json': …})`; plano B: reescrever a página inteira substituindo a semente (`publicarPaginaInteira`). |
| **GitHub (sincronização)** | REST API `https://api.github.com/repos/{repo}/contents/{arquivo}` (GET com `?ref=branch`; PUT com `message`, `content` em base64, `branch`, `sha`). Cabeçalhos: `Authorization: Bearer <token>`, `X-GitHub-Api-Version: 2022-11-28`. Padrão da semente: repo `RecrutamentoeSelecao/rs-fagron-dados`, arquivo `dados.json`, branch `main`. Controle otimista por `sha`: em 409/422 baixa, funde (`compararPacote` + `fundirParams` + `fundirUsuarios`) e tenta mais uma vez. Recusa gravar se a versão remota for mais nova (`desatualizado`). Orienta o uso de *fine-grained token* com Contents: Read and write, só no repositório privado. |

**Criptografia ("cofre", L3930–4100):** AES-256-GCM sobre o JSON completo. A chave de dados é aleatória e fica embrulhada para cada usuário com PBKDF2-SHA256 (310.000 iterações, sal de 16 bytes). A lista de usuários (nome, papel, ativo) fica **em claro** no cabeçalho. Não há recuperação de senha. Senha mínima de 8 caracteres e sem repetição entre usuários.

**Fluxo de inicialização (`iniciar`, L5392):** com semente trancada → se a sincronização está configurada, baixa do GitHub e pede a senha; senão tenta a cópia local cifrada; senão mostra o "portão" (ligar este computador = configurar repositório e token). A cópia local não enviada é recuperada após a senha.

### 3.5 Controle de acesso
- Papéis **admin** (administradora: tudo, exporta CSV, backup, gerencia pessoas, recebe pacote, zera) e **equipe** (lança e consulta; não exporta CSV nem faz backup).
- O controle é **apenas na interface**: quem tem a senha e a chave descriptografa todo o JSON no navegador.

---

## 4. Regras de negócio encontradas no código

1. **SLA de vaga:** cada etapa tem prazo acumulado desde a abertura (abertura + `sla` dias **corridos** no indicador do Painel). Etapa sem data e com prazo vencido = ATRASADO; com data ≤ limite = OK. Status SLA = DENTRO se nenhuma etapa estiver atrasada. Só vale quando `medirSla = true` (histórico migrado vem desmarcado).
2. **SLA total / TTF alvo** = maior SLA da régua (18 dias).
3. **Farol de aging:** dias ≤ 70% do SLA total = Saudável; ≤ 100% = Atenção; acima = Crítico; aprovada ou fechada = Concluída.
4. **Aging** para na data de aprovação. A vaga só sai de "Em aberto" quando tem aprovação **e** data de admissão.
5. **Time to Fill** = abertura → admissão (`inicio`). **Time to Hire** = Divulgação (etapa 2) → Aprovação.
6. **No Calendário** as etapas de vaga contam **dias úteis** (sábado, domingo e feriados da Base ficam fora), enquanto o indicador de SLA do Painel continua em dias corridos (inconsistência intencional para preservar o histórico).
7. **Experiência:** a data de admissão é o 1º dia; limite 1 = admissão + 45 − 1; limite 2 = admissão + 90 − 1 (dias corridos, prazo legal da CLT). Alerta com ≤ 7 dias. Não prorrogado = encerra aos 45 (sem marco de 90). A meta de efetivação padrão é 70%.
8. **Contrato CIEE:** limite = solicitação + 2 dias úteis (`slaCiee`). Retorno e assinatura medidos em dias úteis.
9. **Integração:** só para a empresa configurada (padrão FAGRON SERVICES), e só se houver nome do aprovado. Pendente há mais de 30 dias = crítico. N/A sai da fila.
10. **Contratos:** só para cargos que contêm "ESTAGI".
11. **Uniforme:** só para as empresas configuradas (padrão FAGRON SERVICES e FAGRON DISTRIBUTION). Vaga = "Reposição" se o tipo é Substituição, senão "Nova posição". Prazo de entrega = data de admissão.
12. **Admissão:** % = SIM ÷ (itens − N/A); faltando ≤ 5 dias para o início = alerta; início passado sem 100% = "Admitido com pendência".
13. **Padronização de digitação:** tudo em CAIXA ALTA, exceto email, curriculo, curriculoTexto, telefone e cpf. Máscaras de telefone `(62)9 9814-2277` e de CPF `000.000.000-00`. A padronização é reaplicada a todo o dado carregado.
14. **Comparação de empresa** sem caixa e sem acento (`mesmaEmpresa`).
15. **Migrações embutidas:** régua de 10 → 8 etapas; retirada de 4 tarefas de captação do checklist (22/08); reset por carimbo `reset` (descarta os registros e mantém as listas); conversão do cofre de 2 senhas para lista de usuários.
16. **Conflitos de edição:** assinatura FNV-1a por registro (ignorando os campos `_`) contra o "ponto de partida" da sessão. Mexido só do lado remoto: entra. Mexido dos dois lados: fica a versão local (no pacote manual, a escolha é por checkbox). Exclusões propagam se o registro não foi alterado localmente.

---

## 5. Limitações técnicas e riscos

| # | Risco / limitação | Detalhe |
|---|---|---|
| 1 | **Arquivo único monolítico** | ~5.000 linhas de JS sem módulos, testes, *lint* ou build; estado global mutável (`S`, `ui`, `COFRE`, `DK`…). Manutenção arriscada; o grafo mostra baixa coesão nas comunidades centrais (0,05–0,16). |
| 2 | **Persistência = um JSON inteiro** | Cada gravação reescreve todo o arquivo (no GitHub, um commit por salvamento automático, a cada 25 s de inatividade). Não escala com volume e o histórico do repositório cresce sem limite. |
| 3 | **localStorage como armazenamento** | Pode ser limpo pelo navegador ou pelo usuário; limite de cerca de 5 MB; cópia local por navegador, sem visibilidade central. |
| 4 | **Token do GitHub no navegador** | PAT em texto claro em `localStorage['fagron-rs-token']`, acessível a qualquer script na mesma origem (XSS, extensões). Cada usuária precisa de conta GitHub e de token próprio. |
| 5 | **Sem multiusuário real** | A "sincronização" é *merge* otimista de um único arquivo, com uma única nova tentativa; o fluxo de pacotes por WhatsApp/e-mail é manual. Sem bloqueio, sem tempo real, sem resolução fina por campo. |
| 6 | **Controle de acesso só no cliente** | Papéis admin/equipe valem só na interface; quem tem uma senha descriptografa tudo. Tirar alguém do cofre não revoga o acesso ao repositório nem às cópias já baixadas. Não há recuperação de senha (perdeu todas as senhas de admin, perdeu os dados). |
| 7 | **Sem auditoria** | Só `_por` e `_em` (último autor) por registro. Sem log de quem viu, exportou ou apagou. A exclusão é definitiva e o "Zerar registros" não tem desfazer. O histórico do Git guarda apenas *blobs* cifrados. |
| 8 | **LGPD / dados pessoais** | Nome, CPF, data de nascimento, telefone, salário, nomes de substituídos, decisões de efetivação/desligamento e, na coleção legada, currículo e texto do currículo. Faltam base legal, aviso de privacidade, política de retenção e exclusão por titular, e registro de acesso. CSV e pacotes saem por copiar/colar, e-mail ou WhatsApp. O ditado por voz envia áudio a terceiros (Google). A lista de usuários (nomes) fica em claro no repositório. Repositório público é só avisado, não bloqueado. |
| 9 | **Dependência de plataforma** | O código se adapta ao artefato do Claude (sem rede) e ao GitHub Pages/arquivo local; comportamentos diferentes conforme o ambiente (`DENTRO_DO_ARTEFATO`). |
| 10 | **Datas e fuso** | Datas como string `AAAA-MM-DD` e `HOJE` fixado no carregamento da página (uma aba aberta de um dia para o outro calcula com a data velha). |
| 11 | **Integridade referencial fraca** | `idVaga` é texto livre na Admissão; apagar uma vaga deixa admissão/experiência órfãs. A Base guarda valores por nome, não por ID (renomear depende de varrer todos os registros). |
| 12 | **Funcionalidade legada** | Coleção `candidatos`, listas `statusCand/fontes/motivos/prioridade` e metas `metaCandVaga/metaComparecimento` existem sem tela, o que gera confusão sobre o escopo real. |
| 13 | **Desempenho de renderização** | Toda edição re-renderiza a aba por `innerHTML`; `compromissos()` roda várias vezes por render (abas, badge e assistente a cada 2 s). |
| 14 | **Segurança do HTML** | O uso de `esc()` é consistente, mas a montagem por *string* é frágil; não há CSP. Fonte externa (Google Fonts) carregada a cada abertura. |

---

## 6. Destaques do Graphify

Grafo gerado pela CLI `graphify` (caminho AST, sem LLM, 0 tokens). Como o detector classifica `.html` como documento, os dois blocos `<script>` foram extraídos para `graphify-out/src/head-boot.js` (L11–59) e `graphify-out/src/app.js` (L827–5822). **Linha N de `app.js` = linha N + 826 de `index.html`.**

- **Resultado:** 281 nós, 870 arestas, 18 comunidades. Health check: 1 *self-loop* e 88 arestas colapsadas (chamadas repetidas entre o mesmo par de funções), sem pontas soltas.
- **Saídas:**
  - Visualização interativa: `graphify-out/graph.html` (`/home/user/repos/recrutamentoeselecao/graphify-out/graph.html`)
  - Relatório: `graphify-out/GRAPH_REPORT.md`
  - Dados: `graphify-out/graph.json`

**God nodes (maior grau):**

| Nó | Grau | Leitura |
|---|---|---|
| `esc()` | 47 | escape de HTML; toda a UI depende dele (ponto crítico de segurança) |
| `toast()` | 24 | feedback ao usuário |
| `iso()` | 22 | utilitário de data |
| `renderExperiencia()` | 22 | maior renderizador |
| `renderContratos()` | 21 | |
| `marcarSujo()` | 21 | ponto único de "há alteração", que dispara o autosave |
| `renderVagas()` | 16 | |
| `renderIntegracao()` | 16 | |
| `fmtD()` | 15 | |
| `renderAdmissao()` | 15 | |

**Comunidades (rótulo · coesão · nº de nós):**

| Rótulo | Coesão | Nós |
|---|---|---|
| Constantes e Abas UI | 0,05 | 43 |
| Pacote, Assinatura e Auto-salvar | 0,10 | 42 |
| Tabelas e Colunas | 0,16 | 38 |
| Prazos e Calendário | 0,15 | 32 |
| Usuários, Cofre e CSV | 0,20 | 18 |
| Sincronização GitHub | 0,18 | 18 |
| Portão de Senha e Cofre | 0,20 | 16 |
| Assistente (as-*) | 0,23 | 14 |
| Cadastro e Normalização | 0,20 | 12 |
| Propagação Vaga→Módulos | 0,38 | 12 |
| Colunas Fixas | 0,36 | 9 |
| Redesenho de UI | 0,33 | 7 |
| Cores e Base de Listas | 0,40 | 6 |
| Interpretador de Comandos | 0,67 | 4 |
| Comunidades pequenas (sugestões, barras %, vaga fechada, boot) | — | — |

**Pontes surpreendentes:** `fmtD()` liga Prazos/Calendário ao Assistente, ao Interpretador, à Admissão e ao bloco de Pacote (`resolverCompromisso`); `calcAdm()` → `iso()` liga Propagação a Prazos. São utilitários de data compartilhados por domínios que, numa reescrita, deveriam ser serviços separados.

**Leitura para a reescrita:** os candidatos naturais a módulos/serviços são:
1. Domínio de prazos (calc*, dias úteis, feriados).
2. Propagação vaga → admissão → controles.
3. Persistência/sincronização (hoje misturada com criptografia e pacotes).
4. Identidade/cofre.
5. Assistente.

As comunidades de baixa coesão (Constantes/Abas e Pacote/Auto-salvar) indicam acoplamento alto via estado global.
