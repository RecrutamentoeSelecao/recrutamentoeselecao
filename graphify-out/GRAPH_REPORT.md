# Graph Report - recrutamentoeselecao  (2026-10-20)

## Corpus Check
- Corpus is ~32,613 words - fits in a single context window. You may not need a graph.

## Summary
- 281 nodes · 870 edges · 18 communities (15 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Constantes e Abas UI
- Pacote, Assinatura e Auto-salvar
- Tabelas e Colunas
- Prazos e Calendario
- Usuarios, Cofre e CSV
- Sincronizacao GitHub
- Portao de Senha e Cofre
- Assistente (as-*)
- Cadastro e Normalizacao
- Propagacao Vaga->Modulos
- Colunas Fixas
- Redesenho de UI
- Cores e Base de Listas
- Interpretador de Comandos
- Sugestoes de Autocompletar
- Barras de Percentual
- Status de Vaga Fechada

## God Nodes (most connected - your core abstractions)
1. `esc()` - 47 edges
2. `toast()` - 24 edges
3. `iso()` - 22 edges
4. `renderExperiencia()` - 22 edges
5. `renderContratos()` - 21 edges
6. `marcarSujo()` - 21 edges
7. `renderVagas()` - 16 edges
8. `renderIntegracao()` - 16 edges
9. `fmtD()` - 15 edges
10. `renderAdmissao()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `aplicar()` --calls--> `fmtD()`  [EXTRACTED]
  graphify-out/src/app.js → graphify-out/src/app.js  _Bridges community 3 → community 7_
- `interpretar()` --calls--> `fmtD()`  [EXTRACTED]
  graphify-out/src/app.js → graphify-out/src/app.js  _Bridges community 3 → community 13_
- `renderAdmissao()` --calls--> `fmtD()`  [EXTRACTED]
  graphify-out/src/app.js → graphify-out/src/app.js  _Bridges community 3 → community 2_
- `resolverCompromisso()` --calls--> `fmtD()`  [EXTRACTED]
  graphify-out/src/app.js → graphify-out/src/app.js  _Bridges community 3 → community 1_
- `calcAdm()` --calls--> `iso()`  [EXTRACTED]
  graphify-out/src/app.js → graphify-out/src/app.js  _Bridges community 3 → community 9_

## Import Cycles
- None detected.

## Communities (18 total, 3 thin omitted)

### Community 0 - "Constantes e Abas UI"
Cohesion: 0.05
Nodes (28): ABAS, BUSCAS, CAL_BALDES, CAL_ITENS, CAL_ROTULO, CAL_TIPOS, CHAVES_VAGAS, COLECAO (+20 more)

### Community 1 - "Pacote, Assinatura e Auto-salvar"
Cohesion: 0.10
Nodes (42): abrirConteudo(), agendarAuto(), ajustarEtapasVaga(), aplicarDoRemoto(), aplicarPacote(), aplicarSenhas(), arrancar(), assinar() (+34 more)

### Community 2 - "Tabelas e Colunas"
Cohesion: 0.16
Nodes (38): aplicarOrdem(), autoriaAttr(), autoriaTexto(), avg(), btnOrdemPadrao(), cBase(), cBaseQ(), cDate() (+30 more)

### Community 3 - "Prazos e Calendario"
Cohesion: 0.15
Nodes (32): ABERTO(), addD(), baldeDe(), blocoAnotacoes(), calcContrato(), calcExp(), calcIntegr(), calcVaga() (+24 more)

### Community 4 - "Usuarios, Cofre e CSV"
Cohesion: 0.20
Nodes (18): adicionarUsuario(), b64(), cabecalhoCofre(), cargaParaSalvar(), cifrar(), csv(), ehAdmin(), embrulhar() (+10 more)

### Community 5 - "Sincronizacao GitHub"
Cohesion: 0.18
Nodes (18): baixarDoGit(), cabecalhos(), conferirRepo(), confSinc(), erroGit(), guardarSinc(), guardarSincLocal(), guardarToken() (+10 more)

### Community 6 - "Portao de Senha e Cofre"
Cohesion: 0.20
Nodes (16): abrirCofre(), chaveDaSenha(), deb64(), decifrar(), desembrulhar(), ehCofre(), iniciar(), lerLocal() (+8 more)

### Community 7 - "Assistente (as-*)"
Cohesion: 0.23
Nodes (14): alternar(), aplicar(), confirmar(), diz(), enviar(), eu(), fn(), lancarPendentes() (+6 more)

### Community 8 - "Cadastro e Normalizacao"
Cohesion: 0.20
Nodes (12): addValor(), cadastrarNaBase(), caixaAlta(), chaveEtapa(), checklistEntrou(), confirmarCadastro(), fmtCPF(), fmtTel() (+4 more)

### Community 9 - "Propagacao Vaga->Modulos"
Cohesion: 0.38
Nodes (12): calcAdm(), EH_ESTAGIO(), mesmaEmpresa(), propagarSeVaga(), propagarVaga(), proxId(), sincronizarAdmissao(), sincronizarContratos() (+4 more)

### Community 10 - "Colunas Fixas"
Cohesion: 0.36
Nodes (9): calcularFixas(), calcularFixasAdm(), calcularFixasCon(), calcularFixasExp(), calcularFixasInt(), calcularFixasUni(), definirFixas(), larguraAuto() (+1 more)

### Community 11 - "Redesenho de UI"
Cohesion: 0.33
Nodes (7): aplicarRolagens(), contextoUI(), novaAnotacao(), redesenhar(), redesenharDepois(), redesenharTudo(), restaurarUI()

### Community 12 - "Cores e Base de Listas"
Cohesion: 0.40
Nodes (6): contarUso(), coresDe(), corStatus(), cStt(), orfaos(), renderBase()

### Community 13 - "Interpretador de Comandos"
Cohesion: 0.67
Nodes (4): acharEtapa(), acharVaga(), interpretar(), melhorDe()

### Community 14 - "Sugestoes de Autocompletar"
Cohesion: 0.50
Nodes (4): colecaoAtual(), escolherSugestao(), fecharSugestoes(), gravarWrap()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `esc()` connect `Tabelas e Colunas` to `Constantes e Abas UI`, `Pacote, Assinatura e Auto-salvar`, `Prazos e Calendario`, `Usuarios, Cofre e CSV`, `Sincronizacao GitHub`, `Portao de Senha e Cofre`, `Assistente (as-*)`, `Cadastro e Normalizacao`, `Cores e Base de Listas`, `Interpretador de Comandos`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Should `Constantes e Abas UI` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Why does `toast()` connect `Pacote, Assinatura e Auto-salvar` to `Constantes e Abas UI`, `Usuarios, Cofre e CSV`, `Sincronizacao GitHub`, `Assistente (as-*)`, `Cadastro e Normalizacao`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Should `Pacote, Assinatura e Auto-salvar` be split into smaller, more focused modules?**
  _Cohesion score 0.0975609756097561 - nodes in this community are weakly interconnected._
- **Why does `iso()` connect `Prazos e Calendario` to `Constantes e Abas UI`, `Pacote, Assinatura e Auto-salvar`, `Assistente (as-*)`, `Propagacao Vaga->Modulos`, `Redesenho de UI`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Should `Prazos e Calendario` be split into smaller, more focused modules?**
  _Cohesion score 0.14919354838709678 - nodes in this community are weakly interconnected._