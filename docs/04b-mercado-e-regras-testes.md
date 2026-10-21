# 04b — Mercado de testes comportamentais e de habilidades + regras legais e éticas (Brasil)

> **Escopo.** Levantamento feito **apenas com fontes públicas** (sites institucionais, blogs oficiais, central de ajuda, notícias, normas). Não houve engenharia reversa, raspagem de dados nem acesso a áreas logadas. Data da pesquisa: **out/2026**.
>
> **Como ler.** Quase toda alegação de validade vem do **próprio fornecedor** (marketing ou manual técnico). Quando isso acontece, está marcado como *(fornecedor)*. Onde a fonte pública não detalha algo, aparece **"n/d público"**. Isso não quer dizer que o recurso não exista, só que não está documentado publicamente.
>
> **Aviso jurídico.** Este documento orienta o produto, mas não é parecer jurídico. Antes de lançar, valide as seções 3 e 4 com o jurídico/DPO e com um(a) psicólogo(a) com CRP ativo.

---

## Sumário executivo

1. **No Brasil, o padrão de mercado é teste de perfil comportamental (DISC ou Big Five) + lógica + inglês + conhecimentos específicos**, com ranking por "aderência" à vaga. A Gupy (que comprou a Kenoby em 2022) e a Sólides (Profiler/DISC) dominam esse padrão.
2. **No mundo, o que diferencia é a evidência psicométrica publicada**: manual técnico, certificação EFPA, auditoria de impacto adverso (NYC Local Law 144), percentis com grupo normativo e antifraude em camadas (pool randômico, proctoring, similaridade de código, reteste de verificação).
3. **A regra mais crítica no Brasil é a do CFP**: teste psicológico (com parecer no SATEPSI) é de **uso privativo de psicólogo** (Res. CFP 31/2022; Lei 4.119/1962, art. 13). Sem psicólogo responsável, o sistema **não pode aplicar nem rotular** nada como "teste psicológico", "avaliação psicológica" ou "laudo". Deve usar instrumentos não privativos e nomenclatura neutra.
4. **LGPD**: perfil comportamental não está, em si, na lista de dado sensível do art. 5º, II. Mas inferências (saúde, por exemplo) e biometria (foto/webcam) podem estar. O **art. 20** dá direito à revisão de decisão **unicamente automatizada**, então corte automático sem revisão humana é risco.
5. **Camada de métricas para admin**: deve ser **somente leitura**, com resultados **imutáveis** (append-only), **gabaritos versionados**, **log de auditoria**, **segregação de funções** e **avaliação às cegas**. A seção 4 traz o desenho recomendado.

---

## 1. Mercado brasileiro

### 1.1 Quadro comparativo

| Fornecedor | Tipos de teste (público) | Como o resultado aparece | Corte / ranking | Antifraude | Evidência de validade declarada |
|---|---|---|---|---|---|
| **Gupy** (inclui a antiga **Kenoby**) | Teste de Perfil comportamental (Big Five + mapeamento de comportamentos; materiais citam também *Growth Mindset* e *Grit*); testes de **lógica**, **inglês** e **conhecimentos específicos**; fit cultural (terceiros citam base no *Organizational Culture Profile*); permite questionário próprio, testes prontos de parceiro e **integração com provedores externos** | Pontuação e ordenação por afinidade/aderência à vaga. A IA **Gaia** lê o currículo e **ordena** os candidatos | A Gupy afirma que a Gaia **ordena e não elimina**: todos os currículos ficam disponíveis ao recrutador. Pontuação de múltipla escolha pode servir de desempate (imprensa). Perguntas de pré-requisito podem ser eliminatórias | n/d público (a imprensa cita variações de banco de questões) | A Gupy diz que o teste comportamental "não deve ser o único diagnóstico" de compatibilidade *(fornecedor)*. Não há manual técnico público |
| **Sólides** (Profiler) | Profiler: inventário de adjetivos de base **DISC** combinado com "outras sete teorias", em duas etapas ("como você é" e "como os outros acham que deveria ser"); ~7 min | Relatório de perfil comportamental e "match" com o perfil da vaga e do time | Comparação com o perfil desejado para a vaga. Fórmula n/d pública | n/d público | "97% de precisão", "validado por USP e UFMG" *(fornecedor)*. Não encontramos estudo publicado que sustente esses números |
| **Mindsight** (controlada pela Sankhya) | Plataforma de gestão de pessoas e *people analytics*: avaliação de **potencial**, competências, sucessão, calibração | Dashboards de people analytics | n/d público | n/d público | Não encontramos documentação psicométrica pública sobre testes para candidatos |
| **Recrutei** | "Testes e avaliações de habilidades"; usuários relatam **DISC** e testes comportamentais | n/d público | n/d público | n/d público | n/d público (só depoimentos de usuários em diretórios) |
| **Pandapé** (InfoJobs/StepStone) | Testes **personalizados** e **ponderados** (peso por pergunta), questionários de filtro, testes com anexo; **Midot Lite** (integridade, 8–12 min); **Genoma** (avaliação gamificada cognitiva, comportamental e de personalidade, +100 jogos) | Resultados "em tempo real" (Genoma) | Pesos por pergunta permitem nota ponderada e corte | n/d público | Neurociência e gamificação *(fornecedor)* |
| **Vagas.com** (Vagas for Business) | Testes online variados: cognitivos (raciocínio, memória, atenção), conhecimentos técnicos, **idiomas**, personalidade; quem define é a empresa | IA destaca os currículos "mais compatíveis". A decisão é do recrutador, que recebe relatórios de testes e entrevistas | A IA só destaca, a decisão é humana *(fornecedor)* | n/d público | n/d público |
| **Caliper** (hoje Talogy) | Caliper Profile: personalidade, motivação e comportamentos ligados ao desempenho; **98 itens**, sem tempo (~1 h); disponível em **pt-BR** | Relatório comparado a **normas do país** onde a pessoa vai trabalhar | Ajuste ao perfil da função | n/d público | "Confiável, válido e defensável", construído segundo as diretrizes do U.S. DoL e da SIOP *(fornecedor)* |

**Fontes 1.1**
- Gupy, testes e Big Five: <https://gupy.io/blog/big-five-metodologia-recrutamento> · <https://www.gupy.io/blog/testes-psicologicos> · <https://www.gupy.io/blog/conheca-os-principais-testes-para-recrutamento-e-selecao>
- Gupy, Gaia: <https://gupy.io/blog/gaia-inteligencia-artificial-gupy> · <https://www.gupy.io/blog-do-emprego/o-que-a-gaia-avalia>
- Gupy, integração com provedores externos de testes: <https://www.gupy.io/integracao/integracao-testes-provedores-externos>
- Gupy, testes de perfil, lógica e inglês (caso Embraer): <https://mundorh.com.br/rh-da-embraer-inova-e-passa-usar-inteligencia-artificial-para-identificar-novos-talentos>
- Gupy, uso de pontuação como desempate (imprensa): <https://bpmoney.com.br/?p=146580> · como funciona: <https://tecnoblog.net/responde/o-que-e-e-como-funciona-a-gupy/>
- Gupy, fit cultural (terceiro): <https://napratica.org.br/noticias/como-passar-no-teste-de-fit-cultural-da-gupy-e-destravar-a-sua-aprovacao>
- Gupy compra Kenoby: <https://startups.com.br/noticias/justificando-o-aporte-gupy-compra-a-concorrente-kenoby/> · <https://www.baguete.com.br/noticias/gupy-compra-kenoby> · <https://startups.com.br/negocios/hrtech/compra-da-kenoby-foi-exercicio-de-humildade-diz-ceo-da-gupy/>
- Sólides Profiler: <https://solides.com.br/blog/disc-x-profiler/> · <https://solides.com.br/lp/experimente-profiler/> · <https://solides.com.br/llm/profiler-da-solides-como-funciona-o-teste-e-como-ler-o-relatorio-comportamental.html>
- Mindsight: <https://www.b2bstack.com.br/product/mindsight/funcionalidades> · <https://itforum.com.br/noticias/sankhya-adquire-a-mindsight/amp/>
- Recrutei: <https://www.softwareadvice.com.au/software/252127/recrutei> · <https://www.b2bstack.com.br/compare/recruitee-vs-recrutei>
- Pandapé: <https://supportcenter.pandape.com/hc/en-us/articles/41246023723793-Create-test-and-questionnaire-templates> · <https://supportcenter.pandape.com/hc/es/articles/41245979780625-C%C3%B3mo-usar-el-Midot-Lite-test-de-integridad> · <https://www.pandape.com/en/?p=9309> · <https://www.b2bstack.com.br/product/pandape>
- Vagas.com: <https://www.vagas.com.br/blog/?p=1409> · <https://www.vagas.com.br/blog/?p=3387> · <https://www.vagas.com.br/blog/?p=4600>
- Caliper: <https://calipercorp.com/faq/> · <https://support.talogy.com/hc/en-us/articles/11134068643091-CALIPER-Design-of-the-Caliper-Profile-Assessment>

### 1.2 Leitura do mercado BR

- **DISC e Big Five dominam o "perfil comportamental"**, quase sempre vendidos como *fit* com a vaga ou a cultura. A validade preditiva publicada é **fraca ou inexistente** nos materiais públicos brasileiros. A própria Gupy recomenda não usar o teste comportamental como critério único.
- **Lógica e inglês** são etapas comuns em programas de estágio e trainee e em grandes empresas.
- **A tendência é "a IA ordena e o humano decide"** (Gupy/Gaia, Vagas). Esse discurso se alinha ao art. 20 da LGPD (seção 3.3).
- **Acessibilidade virou diferencial**: a Gupy anunciou páginas de carreira em **Libras** e **31 melhorias** para candidatos cegos e com baixa visão. Não há confirmação pública de que o *Teste de Perfil* tenha versão em Libras.
  - <https://www.gupy.io/blog/acessibilidade-pessoas-surdas-e-teste-de-perfil> · <https://mundorh.com.br/gupy-promove-inclusao-avancos-beneficiam-candidatos-cegos-e-com-baixa-visao>
- **Crítica pública recorrente**: excesso de testes em vagas simples. Um artigo de opinião cita até 10 testes e 40 a 90 minutos no total: <https://www.dio.me/articles/processos-seletivos-da-gupy-muito-teste-pouca-humanidade-7b69a283fcb2>

---

## 2. Mercado global

### 2.1 Quadro comparativo

| Fornecedor | Tipos de teste | Como o resultado aparece | Corte / ranking | Antifraude | Evidência de validade declarada |
|---|---|---|---|---|---|
| **TestGorilla** | Biblioteca de testes cognitivos, de personalidade (inclusive Big Five), idiomas, técnicos/código, SJT e cultura; **perguntas customizadas** | **Ranking por percentil** (padrão) ou pontuação bruta, por teste e por pergunta customizada; correção manual e *override* da nota da IA em perguntas customizadas | Padrões de dificuldade e pontuação definidos por **Angoff modificado** e/ou dados reais de candidatos *(fornecedor)* | *Snapshots* de webcam com consentimento, bloqueio de copiar/colar, monitoramento de IP, detecção de saída da tela cheia, questões randomizadas, política de honestidade que proíbe uso de IA. A própria TestGorilla admite que nenhum teste é à prova de cola e que podem ocorrer falsos alarmes | Página "science"; manuais por teste *(fornecedor)* |
| **HackerRank** | Testes de código, tarefas de projeto, entrevistas técnicas | Relatório com nota por questão, casos de teste, *code playback*, eventos de copiar/colar, saídas de aba, comentários do avaliador | Pontos e corte **definidos pelo empregador**, então a nota só tem significado dentro daquele teste | Detecção de plágio a partir de **≥75% de similaridade** de código, refinada com sinais comportamentais; **AI plagiarism detection**; *image proctoring* | Foco em validade de conteúdo (tarefa ≈ trabalho) |
| **Codility** | Testes de código, entrevistas ao vivo | Relatório com **Integrity Risk** agregado; *Code Evolution Chart* | Corte definido pelo cliente | Checagem de similaridade com outras soluções (com revisão manual), proctoring comportamental (colar, sair da IDE, rapidez anormal). A Codility apresenta o sinal como **apoio à decisão, não veredito** | Validade de conteúdo |
| **SHL** | **Verify** (raciocínio numérico, verbal, indutivo/dedutivo; Verify G+; Verify Interactive), **OPQ32** (personalidade ipsativa), SJT, idiomas, código | Relatórios por norma (percentis); relatórios para gestor e candidato | Cortes por norma ou por perfil de cargo | **Testes randomizados** a partir de banco de itens, *data forensics*, **reteste de verificação** supervisionado | Manuais técnicos com confiabilidade (teste-reteste, consistência interna) e validade de conteúdo, construto e critério *(fornecedor)*. Estudo independente do OPQ32i encontrou consistência interna alta, mas validade de critério baixa |
| **Criteria Corp** | **CCAT** (cognitivo, 50 itens: espacial, verbal, matemática e lógica), personalidade, emocional, habilidades, **games** | Nota bruta (de 50) + **percentil** contra grupo normativo + subescores | **Faixas sugeridas por função**, baseadas em grandes amostras e estudos de validação | n/d público detalhado | Correlação de 0,55 a 0,80 com outros testes de aptidão; caso com r = 0,30 em relação ao desempenho (n = 62) *(fornecedor)* |
| **Harver / pymetrics** | **Games** cognitivos e socioemocionais, SJT, testes de aptidão | Ajuste ao modelo do cargo | Modelo treinado com profissionais de sucesso no cargo | n/d público | **Auditoria de impacto adverso**: Northeastern (2020–21), que concluiu que o sistema atende à **regra dos 4/5**, mas **não avaliou a validade preditiva**; auditoria NYC LL144 (BABL AI, 2023) |
| **Hogan** | **HPI** (personalidade "lado claro"), **HDS** (descarriladores), **MVPI** (valores e motivos) | Relatórios por competência e cargo | Perfis derivados de **análise de cargo** e síntese de validade | n/d público | Mais de 450 estudos de validação do HPI *(fornecedor)*; segundo fonte secundária, r ≈ 0,29 (HPI) e 0,54 (HPI + HDS + MVPI); α médio ≈ 0,71–0,76 |
| **Predictive Index (PI)** | **Behavioral Assessment** (adjetivos, 4 fatores) e **Cognitive Assessment** | Padrões de referência comparados a um **Job Target** definido pelo gestor | Comparação com o *Job Target* | n/d público | Segue os **Standards AERA/APA/NCME** e os princípios da SIOP; **certificação EFPA** (DNV-GL) para o cognitivo (2020) e o comportamental (2018, versões nórdicas); α de 0,82 a 0,87 (fonte secundária) |
| **Plum** (comprada pela Phenom em abr/2026) | *Discovery Survey* de ~25 min: personalidade (10 traços mapeados para o Big Five), resolução de problemas, inteligência social | Ajuste a "talentos" exigidos pelo cargo | Ranking por *match* | n/d público | "Até 3× mais válido", auditoria anual de impacto adverso (resumo 2022–23) *(fornecedor)* |

**Fontes 2.1**
- TestGorilla: <https://support.testgorilla.com/hc/en-us/articles/30054006666011> · <https://www.testgorilla.com/blog/intro-to-percentile-scores/> · <https://www.testgorilla.com/assessments-technology/> · <https://www.testgorilla.com/blog/talent-assessment-tools-anti-cheating/> · <https://www.testgorilla.com/blog/cheating-detection-skills-assessments/> · <https://www.testgorilla.com/it/politica-onesta-candidati/>
- HackerRank: <https://hackerrank-knowledge-base.help.usepylon.com/articles/4291690360-plagiarism-best-practices-guide> · <https://hackerrank-knowledge-base.help.usepylon.com/articles/1079706165>
- Codility: <https://support.codility.com/hc/en-us/articles/360043319434-Anti-Cheating-Methods> · <https://www.codility.com/1p/codility-proctoring-integrity/>
- SHL: <https://www.shl.com/products/assessments/> · brochura Verify: <https://www.getfeedback.net/assets/com_product/00008/Verify%20Brochure.pdf> · estudo OPQ32i (UCT): <https://open.uct.ac.za/server/api/core/bitstreams/93fd0071-c96b-415c-96de-0b93f630ec05/content>
- Criteria: <https://www.criteriacorp.com/solution/ccat.php> · <https://www.criteriacorp.com/files/Criteria-ScoreReportGuide-CCAT.pdf> · <https://www.criteriacorp.com/case-study/financial-firm-predicts-employee-performance-ccat>
- Harver/pymetrics: <https://www.technologyreview.com/2021/02/11/1017955/auditors-testing-ai-hiring-algorithms-bias-big-questions-remain/> · <https://cbw.sh/pymetrics/pymetrics_audit_result_whitepaper.pdf> · <https://www.paramount.com/sites/g/files/dxjhpe226/files/2023-07/Harver_Pymetrics-Final_Audit_Summary-2023-06-29.pdf>
- Hogan: <https://www.hoganassessments.com/sites/default/files/uploads/High%20Potential%20Tech%20Manual%20-%20S.pdf> · <https://hoganassessments.foleon.com/content/hpi-validity-faq/> · <https://www.Peterberry.com.au/media/1792/guide-to-validity-reliability.pdf>
- Predictive Index: <https://www.predictiveindex.com/support-category/science-basics/> · <https://www.predictiveindex.com/news-press/news/the-predictive-index-pi-cognitive-assessment-joins-pis-behavioral-assessment-as-certified-by-the-efpa/>
- Plum: <https://plum.io/science> · <https://www.plum.io/hubfs/Resources/Audit/2022-2023/2022-2023_Plum_Audit_Report_Summary.pdf> · <https://siliconangle.com/2026/04/28/phenom-adds-plum-psychometric-science-agentic-ai-hiring-stack/>

### 2.2 Boas práticas recorrentes nos líderes globais

| Prática | Quem faz | O que adotar no nosso sistema |
|---|---|---|
| **Percentil contra grupo normativo explícito**, além da nota bruta | TestGorilla, Criteria, SHL | Mostrar a nota bruta, o percentil e **qual norma** foi usada (ex.: "candidatos desta vaga" ou "todos os candidatos do tenant") |
| **Corte definido antes**, por método documentado (Angoff ou faixa por função) | TestGorilla, Criteria | Registrar o corte junto com a versão da vaga e do teste. Corte alterado depois da aplicação gera **nova versão** e entra no log |
| **Sinais de integridade como apoio, não veredito** | Codility, HackerRank, TestGorilla | Exibir "alerta de integridade" para revisão humana. **Nunca** eliminar automaticamente por causa desse alerta |
| **Reteste de verificação** para teste não supervisionado | SHL; ITC Guidelines | Em etapas decisivas, reaplicar versão curta de forma supervisionada (entrevista ou presencial) |
| **Auditoria de impacto adverso** (regra dos 4/5) | pymetrics, Plum (NYC LL144) | Relatório agregado periódico (seção 4) |
| **Documentação psicométrica** (α, validade, DIF) | Hogan, PI (EFPA), SHL | Para testes próprios, calcular α, dificuldade e discriminação por item e manter uma "ficha técnica" versionada |

---

## 3. Regras legais e éticas no Brasil

### 3.1 CFP — Resolução nº 31/2022 e SATEPSI

**O que a norma diz** (síntese das fontes):
- Estabelece diretrizes para a avaliação psicológica, regulamenta o **SATEPSI** e revoga a Res. CFP 09/2018. Entrou em vigor 60 dias após a publicação (dez/2022).
- O uso de **testes psicológicos** é **privativo de psicólogo** (Lei 4.119/1962, art. 13, §1º).
- Aplicação, correção e interpretação devem seguir o **manual técnico aprovado** no SATEPSI.
- O SATEPSI mantém listas de testes **favoráveis**, **desfavoráveis**, **não avaliados** e **instrumentos não privativos**. Na dúvida sobre a natureza de um instrumento, a comissão consultiva (CCAP) o classifica como "teste psicológico" ou "não privativo".
- Para o psicólogo, usar teste **desfavorável** ou **não avaliado** fora de pesquisa ou ensino é **falta ética**.
- Em **jul/2026** o CFP reiterou que aplicar teste psicológico é prática privativa e que tomará medidas judiciais, em resposta ao Parecer Cofen nº 28/2026.

Fontes: <https://site.cfp.org.br/nova-resolucao-do-cfp-destaca-diretrizes-para-a-avaliacao-psicologica/> · <https://www.legisweb.com.br/legislacao/?id=473938> · <https://www.normasbrasil.com.br/norma/resolucao-31-2022_473938.html> · PDF: <https://ses.sp.bvs.br/wp-content/uploads/2022/12/U_RS-CFP-31_151222.pdf> · <https://site.cfp.org.br/cfp-destaca-que-aplicacao-de-testes-psicologicos-e-pratica-privativa-da-psicologia/> · <https://site.cfp.org.br/tag/satepsi/> · consulta às listas: <https://satepsi.cfp.org.br/>

**Consequências para um sistema de RH sem psicólogo responsável:**

| Pode | Não pode |
|---|---|
| Aplicar **provas de conhecimento** (técnico, idioma, legislação, ferramentas), **testes de código** e **amostras de trabalho** | Aplicar, hospedar para autoaplicação ou corrigir automaticamente **testes com parecer favorável no SATEPSI** (ex.: baterias de personalidade, atenção ou raciocínio comercializadas como testes psicológicos) |
| Aplicar **questionários/inventários não privativos** (lista "instrumentos não privativos" do SATEPSI) ou instrumentos próprios de **autodescrição comportamental**, com finalidade declarada | Usar os termos **"teste psicológico"**, **"avaliação psicológica"**, **"laudo"**, **"diagnóstico"**, **"psicodiagnóstico"** ou **"perfil psicológico"** em telas, relatórios e marketing |
| Aplicar **SJT** construído a partir de análise do cargo (situações reais da função), como questionário estruturado | Afirmar que mede **"inteligência", "QI" ou "personalidade"** em sentido psicométrico, ou prometer "precisão de X%" sem estudo publicado |
| **Integrar** com plataforma de terceiro em que um **psicólogo com CRP** é o responsável técnico; nosso sistema recebe só o **resultado liberado** pelo profissional | Mostrar ao recrutador interpretação clínica ou de traços patológicos (ex.: escalas de "descarriladores" do tipo HDS) sem psicólogo |
| Habilitar um **modo "Psicólogo(a) responsável"**: campo CRP obrigatório, perfil de acesso próprio, guarda de documentos sob responsabilidade dele(a) | Deixar que um admin sem CRP veja respostas item a item de teste psicológico |

**Rótulos recomendados na interface:** "Questionário de perfil comportamental (autodeclarado, não é teste psicológico)", "Prova de conhecimentos", "Prova de raciocínio aplicado à função", "Exercício situacional", "Teste técnico/código", "Avaliação de idioma".

> **Zona cinzenta.** Provas genéricas de raciocínio lógico, numérico ou verbal medem construtos cognitivos. Quando o instrumento se apresenta como medida de capacidade mental geral, ele se aproxima da definição de teste psicológico. Para reduzir o risco: (a) contextualizar as questões na função, como prova de conhecimento ou habilidade; (b) não usar normas ou percentis com rótulo de "inteligência"; (c) ou ter psicólogo(a) responsável. **Validar com o CRP regional.**

### 3.2 Status do DISC no Brasil

- O DISC **não aparece como teste psicológico favorável no SATEPSI**, segundo fontes secundárias de RH (inclusive e-book da Gupy). É vendido como "ferramenta de perfil comportamental" de uso por RH.
- Materiais de mercado relatam ressalvas do **CFP/CRP-SP** ao uso em **seleção** por falta de estudos de validade no contexto brasileiro. **Não localizamos nota oficial do CFP específica sobre o DISC**, então trate essa informação como secundária.
- Leitura prática: dá para oferecer o DISC como **autoconhecimento e insumo complementar não eliminatório**, com a ressalva escrita e **sem corte automático**. O status deve ser checado no SATEPSI antes do lançamento.

Fontes: e-book Gupy: <https://www.gupy.io/hubfs/e-Book-Teste-de-perfil-comportamental-pros-contras-e-quais-utilizar.pdf> · <https://www.fm2s.com.br/blog/disc> · <https://www.dio.me/articles/vagas-e-analise-de-perfil-comportamental-disc> · <https://fia.com.br/blog/teste-disc/>

### 3.3 LGPD (Lei 13.709/2018)

| Ponto | Regra | Implicação para o produto |
|---|---|---|
| **Art. 5º, II: dado sensível** | Origem racial ou étnica, convicção religiosa, opinião política, filiação sindical ou a organização religiosa, filosófica ou política, saúde, vida sexual, dado genético ou **biométrico** | Perfil comportamental **não é, em si, dado sensível**. Viram dado sensível: (a) **foto/webcam usada para identificar** (biometria); (b) inferências de **saúde** (ansiedade, TDAH etc.); (c) raça, gênero e deficiência coletados para análise de equidade. A doutrina defende aplicar o regime de dado sensível também a **inferências** com potencial lesivo |
| **Art. 11** | Hipóteses específicas para dado sensível; **§1º proíbe uso discriminatório** | Coletar dados demográficos **separadamente**, com consentimento específico e **finalidade exclusiva de auditoria de equidade**. **Nunca** mostrar ao recrutador. Desligar o *proctoring* por imagem por padrão |
| **Art. 20, caput** | O titular pode pedir **revisão** de decisão tomada **unicamente** com base em tratamento automatizado que afete seus interesses, **inclusive perfil profissional e aspectos da personalidade** | Proibir **eliminação automática** sem revisão humana substantiva, ou oferecer um **canal de revisão** com SLA. Registrar quem revisou |
| **Art. 20, §1º** | Fornecer informações claras sobre **critérios e procedimentos**, respeitado o segredo comercial | Mostrar ao candidato o que foi avaliado, o peso de cada etapa e se houve corte |
| **Art. 20, §2º** | A ANPD pode **auditar** em caso de discriminação | Manter **log, versão de gabarito e relatório de impacto adverso** prontos para auditoria |
| Princípios (art. 6º) | Finalidade, necessidade, transparência, não discriminação | Não aplicar teste sem relação com o cargo. Definir retenção (ex.: X meses após o fim do processo) |

Fontes: <https://www.migalhas.com.br/depeso/356587/lgpd-e-novos-direitos-do-empregado-na-decisao-automatizada> · <https://www.migalhas.com.br/depeso/341100/os-dados-pessoais-sensiveis-na-era-do-big-data> · <https://confidata.com.br/blog/decisoes-automatizadas-lgpd-direitos-obrigacoes> · <https://confidata.com.br/blog/vies-algoritmico-discriminacao-lgpd> · texto oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm>

### 3.4 Discriminação e viés

- **Lei 9.029/1995**: proíbe prática discriminatória no acesso ao emprego por sexo, origem, raça, cor, estado civil, situação familiar, idade, entre outros. O rol foi ampliado pela LBI para incluir deficiência e reabilitação profissional; confirmar a redação vigente. Exigir teste ou atestado de gravidez ou esterilização é crime. A multa administrativa é de 10× o maior salário pago, +50% em caso de reincidência. Fontes: <https://legis.senado.leg.br/norma/550905/publicacao/15716037> · <https://www2.camara.leg.br/legin/fed/lei/1995/lei-9029-13-abril-1995-348798-norma-pl.html>
- **Regra dos 4/5** (*Uniform Guidelines*, EUA, 29 CFR 1607.4(D)): se a taxa de seleção de um grupo é **menor que 80%** da do grupo com maior taxa, há indício de impacto adverso. **Não é linha absoluta**: com amostra pequena, use teste estatístico e janelas maiores. O Brasil não tem regra equivalente, mas ela é a **referência técnica** usada em auditorias como NYC LL144. Fontes: <https://www.law.cornell.edu/cfr/text/29/1607.4> · <https://www.govinfo.gov/content/pkg/CFR-2024-title29-vol4/pdf/CFR-2024-title29-vol4-sec1607-4.pdf>
- **Riscos de viés específicos**: testes de inglês e raciocínio verbal tendem a refletir escolaridade e classe; *games* e testes cronometrados penalizam PCD; modelos treinados com "top performers" reproduzem o histórico; webcam e reconhecimento facial têm viés conhecido.

### 3.5 Acessibilidade (PCD)

- **LBI (Lei 13.146/2015), art. 34, §3º**: veda discriminação da PCD **inclusive nas etapas de recrutamento, seleção e contratação**. O **art. 38** obriga a entidade contratada para processo seletivo, público **ou privado**, a cumprir a LBI. Há previsão de **adaptação razoável** em provas de processo seletivo; confirmar o artigo exato no texto oficial. Fontes: <https://www.legjur.com/legislacao/nivel/lei_00131462015/-capitulo-vi-do-direito-ao-trabalho> · <https://www2.cnmp.mp.br/portal/images/Resolucoes/2021/Resoluo-n-240-2021.pdf>
- **Decreto 9.508/2018** (concursos federais, referência de boa prática): igualdade de conteúdo, critérios, horário e nota mínima; tecnologias assistivas (braille, ledor, **tempo adicional**). Fonte: <https://portaltj-hml.tjrj.jus.br/documents/10136/5408863/decreto-federal-n-9508-2018.pdf>
- **Requisitos de produto**: WCAG 2.1 AA (leitor de tela, contraste, teclado); **tempo adicional configurável** por candidato, registrado como *acomodação* e não como fraude; alternativa a *games* e itens só visuais; vídeo ou glossário em **Libras**; o pedido de acomodação **não pode ficar visível** ao avaliador da etapa.

---

## 4. Métricas para admin sem interferir nos resultados

### 4.1 Princípios

1. **Separação de funções (SoD)**: quem **cria** o teste e o gabarito não é quem **avalia** candidatos, e nenhum dos dois **altera resultados**.
2. **Resultado imutável**: respostas e notas são gravadas uma vez (*append-only*). Correção gera **novo registro** que referencia o anterior, com motivo e aprovador.
3. **Gabarito versionado**: cada aplicação aponta para `scoring_key_version` + `hash`. Mudar o gabarito **não recalcula retroativamente** sem um processo formal.
4. **Analytics somente leitura e agregado**: o admin vê distribuições e indicadores, **não** edita nem vê dados sensíveis individuais.
5. **Auditabilidade**: log de toda leitura de dado individual sensível e de toda escrita.
6. **Avaliação às cegas**: o avaliador da etapa vê o conteúdo da resposta sem nome, foto, idade, gênero, raça, PCD ou instituição de ensino, até a decisão da etapa ser registrada.

Referências: ITC *Guidelines on Computer-Based and Internet-Delivered Testing* (2006) e *ITC Guidelines on Test Security* (2014); **ISO 10667** (entrega de serviços de avaliação); *Standards for Educational and Psychological Testing* (AERA/APA/NCME). Fontes: <https://www.cambridge.org/core/journals/industrial-and-organizational-psychology/article/abs/international-test-commission-guidelines-on-computerbased-and-internetdelivered-testing/F5CD98F957D779E5F05979DBF072CABA> · <https://www.bps.org.uk/node/9367> · Makransky & Glas, teste de confirmação: <https://test01.ku.dk/:obvius/pureproxy/3974268/en/publications/unproctored-internet-test-verification-using-adaptive-confirmatio>

### 4.2 Matriz de permissões (RBAC)

| Ação | Candidato | Recrutador | Gestor da vaga | Autor de testes | Admin RH | Psicólogo(a) CRP* | Auditor/DPO |
|---|---|---|---|---|---|---|---|
| Responder teste | ✔ (uma vez por versão) | — | — | — | — | — | — |
| Ver nota individual da vaga | Própria (devolutiva) | ✔ | ✔ (resumo) | — | — | ✔ | ✔ (com log) |
| Ver respostas item a item | — | Só provas abertas, às cegas | — | — | — | ✔ | ✔ (com log) |
| Criar ou editar itens e gabarito | — | — | — | ✔ (gera **nova versão**) | — | ✔ (instrumento privativo) | — |
| Publicar versão de teste | — | — | — | Propõe | Aprova (4 olhos) | Aprova (privativo) | — |
| Alterar nota ou resposta gravada | **Ninguém** | — | — | — | — | — | — |
| Solicitar recorreção | ✔ (art. 20) | ✔ | — | — | — | — | — |
| Executar recorreção (novo registro) | — | — | — | — | ✔ + justificativa | ✔ | Revisa |
| Ver métricas agregadas | — | Só da sua vaga | Só da sua vaga | Psicometria dos seus testes | ✔ | ✔ | ✔ |
| Ver dados demográficos | — | **Nunca** | **Nunca** | — | Só agregado (n ≥ 5) | Só agregado | ✔ (com log) |
| Exportar dados | Os próprios (LGPD) | Só lista da vaga | — | — | Agregado | — | ✔ |

\* Perfil opcional, ativado quando houver instrumento privativo.

### 4.3 Modelo de dados

```
assessment_template(id, nome, tipo, classificacao: {conhecimento|tecnico|comportamental_nao_privativo|psicologico_privativo}, responsavel_crp?)
assessment_version(id, template_id, versao, itens_hash, publicado_em, publicado_por, aprovado_por, status: draft|published|retired)   -- imutável após published
scoring_key_version(id, assessment_version_id, versao, regras_json, hash_sha256, corte_json, metodo_corte: {angoff|norma|faixa_funcao|nenhum}, criado_por, aprovado_por, criado_em)
attempt(id, candidato_id, vaga_id, assessment_version_id, iniciado_em, finalizado_em, acomodacoes_json, user_agent_hash)
response(id, attempt_id, item_id, resposta, respondido_em, tempo_ms)        -- INSERT-only
score_record(id, attempt_id, scoring_key_version_id, bruto, percentil, norma_ref, calculado_em, supersedes_id?, motivo?, executado_por)  -- INSERT-only; o "vigente" é o último da cadeia
integrity_signal(id, attempt_id, tipo, valor, gerado_em)                     -- só informativo, não altera a nota
stage_decision(id, candidato_id, vaga_id, etapa, decisao, decidido_por, decidido_em, revisao_humana: bool, blind: bool)
audit_log(id, ator, acao, entidade, entidade_id, antes_hash, depois_hash, ts, ip_hash, prev_log_hash)  -- encadeado por hash
demographics_optin(candidato_id, consentimento_em, dados_cifrados)          -- tabela separada, sem join na UI do recrutador
```

**Garantias técnicas:**
- No banco: `REVOKE UPDATE, DELETE` em `response`, `score_record` e `audit_log` para o papel da aplicação, ou *triggers* que rejeitam UPDATE e DELETE.
- `audit_log` com **cadeia de hash** (`prev_log_hash`) e cópia diária para armazenamento WORM, evidência contra adulteração.
- O analytics lê de **réplica/views materializadas** com usuário **somente leitura**.
- Agregados com **supressão de célula pequena** (n < 5 não exibe), para evitar reidentificação.
- Recalcular com novo gabarito gera **novos** `score_record` com `supersedes_id` e motivo, aprovados por duas pessoas. A UI mostra "nota recalculada em <data> (versão X → Y)".
- `integrity_signal` **nunca** muda a nota nem elimina automaticamente. Só aparece para revisão humana.

### 4.4 Métricas do painel admin (somente leitura)

| Grupo | Métrica | Definição / regra prática |
|---|---|---|
| **Funil** | Taxa de início e de conclusão; abandono por item | concluídos ÷ convidados; abandono alto em um item indica problema de UX ou de acessibilidade |
| **Tempo** | Mediana e P10/P90 de duração; tempo por item | Duração muito abaixo de P10 vai para **alerta de integridade**, não para punição |
| **Distribuição** | Histograma de notas, média, DP, efeito teto/chão | Mais de 20% na nota máxima ou mínima indica teste fácil ou difícil demais |
| **Dificuldade do item (p)** | Proporção de acertos | Ideal ~0,30–0,80; fora dessa faixa, revisar |
| **Discriminação do item** | Correlação ponto-bisserial item-total corrigida | < 0,20: revisar; negativa: provável **erro de gabarito**. Corrigir em nova versão, nunca editando o gabarito antigo |
| **Confiabilidade** | **α de Cronbach** = k/(k−1)·(1 − Σσ²ᵢ/σ²ₜ); "α se item removido" | ≥ 0,70 aceitável para triagem; < 0,60 não usar como corte |
| **Distratores** | % de escolha por alternativa | Distrator com 0% não funciona; distrator mais escolhido que o gabarito por quem tem nota alta indica gabarito suspeito |
| **Impacto adverso** | Razão de seleção por grupo ÷ grupo de maior taxa (**4/5**), + teste exato de Fisher ou qui-quadrado e IC | Só com dados demográficos **opt-in**, agregados, n ≥ 5 por célula. Mostrar alerta e não bloquear |
| **DIF** (opcional, n grande) | Mantel-Haenszel por item entre grupos | Item com DIF vai para revisão de conteúdo |
| **Integridade** | % de tentativas com alertas, por tipo | Monitorar a tendência, não o indivíduo |
| **Acessibilidade** | % com acomodação; comparação de conclusão PCD × não PCD | Diferença grande indica barreira no teste |
| **Validade (longo prazo)** | Correlação nota × desempenho em 6–12 meses, nota × turnover | Exige integração com avaliação de desempenho; manter na ficha técnica |
| **Governança** | Nº de recorreções, pedidos de revisão (art. 20), tempo de resposta | Indicador de conformidade com a LGPD |

### 4.5 Fluxo de avaliação às cegas e decisão

1. O candidato conclui a etapa e a nota é calculada pela `scoring_key_version` ativa **no momento da tentativa**.
2. O avaliador vê **código do candidato + respostas + nota + alertas**, sem identificação nem demografia.
3. O avaliador registra a decisão da etapa (`stage_decision`, `blind = true`, `revisao_humana = true`). Só então o nome é revelado.
4. Corte automático, se houver, só **sugere** (fila "abaixo do corte"). A eliminação exige clique humano e o motivo é registrado (art. 20).
5. O candidato recebe devolutiva com critérios gerais e um canal de **pedido de revisão**.

### 4.6 Checklist de lançamento

- [ ] Classificar cada teste na biblioteca: conhecimento / técnico / comportamental não privativo / **psicológico privativo** (este só com CRP responsável).
- [ ] Revisar textos da UI: remover "teste psicológico", "laudo", "QI", "precisão de X%".
- [ ] Ficha técnica por teste: objetivo, relação com o cargo, versão, método de corte, α, n.
- [ ] Banco: travas de imutabilidade + log encadeado + réplica somente leitura.
- [ ] Coleta demográfica opt-in separada, com consentimento específico e finalidade de auditoria.
- [ ] Sem eliminação 100% automática; canal de revisão (LGPD art. 20).
- [ ] Acomodações PCD (tempo extra, leitor de tela, Libras) sem rotular como fraude.
- [ ] Proctoring por imagem **desligado por padrão**; se ligado, avaliar no RIPD/DPIA como possível dado biométrico.
- [ ] Relatório trimestral de impacto adverso e de qualidade dos itens.
- [ ] Validar a seção 3 com jurídico/DPO e com psicólogo(a) (consulta ao CRP regional).

---

### Lacunas desta pesquisa

- Não foi possível ler diretamente as listas atuais do SATEPSI (status exato do DISC e de inventários específicos). **Consultar <https://satepsi.cfp.org.br/>.**
- Mindsight, Recrutei e Pandapé têm pouca documentação pública sobre testes. Detalhes de corte e antifraude ficam como "n/d público".
- Manuais técnicos completos (SHL, Hogan, PI, Criteria) não são de acesso aberto. Os números de validade citados são do fornecedor ou de fonte secundária.
