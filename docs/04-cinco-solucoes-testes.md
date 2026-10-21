# Testes comportamentais e de habilidades — 5 soluções encontradas

> Síntese de `04a-rea-testes-open-source.md` (REA sobre projetos open-source) e
> `04b-mercado-e-regras-testes.md` (documentação pública de Gupy, Sólides, TestGorilla,
> SHL, HackerRank etc. + CFP/SATEPSI, LGPD). **Nada foi implementado ainda** — este
> documento serve para escolher o que entra no plano.

## Premissas que valem para todas as soluções

- **CFP 31/2022 / SATEPSI:** sem psicólogo(a) responsável, o sistema não aplica testes
  psicológicos aprovados no SATEPSI nem usa os termos "avaliação psicológica", "laudo" ou "QI".
  Nomenclatura recomendada: "questionário de perfil", "prova de habilidades".
- **LGPD art. 20:** nenhuma eliminação 100% automática; o sistema ordena e sinaliza, quem decide é uma pessoa.
- **Perfil comportamental nunca é eliminatório** (nem Big Five, nem DISC).
- **Pontuação sempre no servidor**, com gabarito e chaves invisíveis ao navegador (o bigfive-web
  pontua no cliente — padrão a evitar).
- **Resultado imutável:** uma vez calculado, não se edita; correção = nova versão com justificativa.

---

## Solução 1 — Questionário de perfil Big Five (IPIP-120, pt-BR)

| | |
|---|---|
| **De onde veio** | REA nos pacotes `@alheimsins/b5-johnson-120-ipip-neo-pi-r` e `bigfive-calculate-score` (MIT; itens IPIP de domínio público, já traduzidos) |
| **Como funciona** | 120 itens Likert 1–5, 5 domínios × 6 facetas, itens invertidos; bruto → média → escore-z → percentil quando houver norma interna |
| **Mercado** | Mesmo tipo de teste de perfil da Gupy |
| **Prós** | Gratuito, uso comercial permitido, base científica conhecida, rápido de implementar |
| **Contras** | Sem normas brasileiras nem aprovação SATEPSI → só como insumo complementar; textos de laudo da biblioteca precisam ser reescritos; não usar o nome "NEO-PI-R" (marca) |
| **Esforço** | **M** (~2–3 semanas) |

## Solução 2 — Banco de provas de habilidades (lógica, numérica, verbal, idiomas, conhecimentos, SJT)

| | |
|---|---|
| **De onde veio** | REA no `qti3-item-player` (MIT) e no jsPsych (MIT); prática de TestGorilla/Criteria/Gupy |
| **Como funciona** | Itens próprios da empresa; correção objetiva no padrão QTI (`match_correct` certo/errado, `map_response` crédito parcial); tempo por prova/item, ordem aleatória com semente, autosave por item; julgamento situacional (SJT) com gabarito definido pelos gestores; **nota de corte definida antes** (método Angoff) |
| **Prós** | É onde está a maior validade preditiva para cargos operacionais/administrativos; não é teste psicológico |
| **Contras** | A empresa precisa escrever e revisar os itens (banco inicial de ~40–60 por prova) |
| **Esforço** | **M/G** (~3–4 semanas + produção de conteúdo pelo RH) |

## Solução 3 — Prova prática / técnica com correção cega

| | |
|---|---|
| **De onde veio** | REA/leitura do Judge0 (GPL-3.0, só como serviço separado via API); Codility/HackerRank |
| **Como funciona** | Para TI: código executado em sandbox com limites de CPU/memória e testes automáticos. Para as outras áreas: estudo de caso com **rubrica** e **avaliação às cegas** (avaliador não vê nome/foto/idade) |
| **Prós** | Mede a habilidade real do cargo; a correção cega reduz viés |
| **Contras** | O Judge0 exige servidor próprio isolado; as rubricas exigem calibração entre avaliadores |
| **Esforço** | **M** (rubrica + correção cega) / **G** (com código) |

## Solução 4 — Base do Admin: métricas sem interferência nos resultados ⭐

| | |
|---|---|
| **De onde veio** | Boas práticas de separação de funções, imutabilidade e psicometria (seção 4 do 04b) |
| **Como funciona** | **Camada só de leitura** sobre os resultados: o admin vê métricas agregadas e não tem nenhuma rota de escrita em respostas, notas ou gabaritos aplicados |
| **Métricas** | Taxa de conclusão e abandono, tempo médio, distribuição das notas, dificuldade e discriminação de cada item, confiabilidade (alfa de Cronbach), impacto adverso (regra dos 4/5, com dados demográficos opt-in em tabela separada), funil teste → contratação, validade (nota × avaliação de experiência 45/90) |
| **Garantias** | Respostas e resultados só por inclusão (*append-only*); gabarito versionado com hash (resultado guarda qual versão usou); log de auditoria encadeado; papéis separados: **Admin** (agregados), **Recrutador** (individual, sem editar), **Psicólogo CRP** (opcional, testes restritos); se um item mostrar problema, o admin pode **desativá-lo para aplicações futuras**, nunca recalcular as passadas |
| **Prós** | Atende exatamente ao "poder de metrificação sem interferir"; reaproveita a auditoria e o RBAC que o backend já tem |
| **Contras** | Métricas psicométricas só fazem sentido com volume (~100+ aplicações por teste) |
| **Esforço** | **M** (~2–3 semanas) |

## Solução 5 — Integração com fornecedores + Modo Psicólogo

| | |
|---|---|
| **De onde veio** | Documentação pública de Gupy, Sólides, TestGorilla, Pandapé (Midot/Genoma) |
| **Como funciona** | Em vez de aplicar internamente, envia o convite ao fornecedor e **importa o resultado** (webhook/API) como registro somente leitura; perfil "Psicólogo CRP" para testes SATEPSI aplicados por profissional habilitado |
| **Prós** | Acesso a testes validados e com normas; cobre o requisito do CFP |
| **Contras** | Custo por candidato ou assinatura; depende da API de cada fornecedor; dados do candidato passam por terceiros (contrato de operador LGPD) |
| **Esforço** | **M** por fornecedor |

---

## Recomendação

Começar por **4 + 1 + 2**: a Base do Admin (4) é a fundação que garante a integridade dos resultados,
e as soluções 1 e 2 cobrem perfil e habilidades com custo zero de licença. As soluções 3 e 5 entram
depois, conforme a demanda de cada área.

| Ordem | Solução | Semanas (1 dev) |
|---|---|---|
| 1 | 4 — Base do Admin (modelo de dados imutável + métricas) | 2–3 |
| 2 | 1 — Perfil Big Five | 2–3 |
| 3 | 2 — Provas de habilidades | 3–4 |
| 4 | 3 — Prova prática com correção cega | 2–4 |
| 5 | 5 — Integração com fornecedor / Modo Psicólogo | sob demanda |

**Validar antes de lançar:** Jurídico/DPO (LGPD, contrato com fornecedores) e um(a) psicólogo(a) ou o CRP
(nomenclatura, uso do IPIP sem normas brasileiras, status do DISC no SATEPSI).
