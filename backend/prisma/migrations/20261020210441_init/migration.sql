-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'RECRUTADOR', 'GESTOR', 'LEITOR');

-- CreateEnum
CREATE TYPE "Resposta" AS ENUM ('SIM', 'NAO', 'NA');

-- CreateEnum
CREATE TYPE "SimNao" AS ENUM ('SIM', 'NAO');

-- CreateEnum
CREATE TYPE "EtapaCandidatura" AS ENUM ('TRIAGEM', 'BANCO_TALENTOS', 'ENTREVISTA_RH', 'PARECER', 'ENTREVISTA_GESTOR', 'APROVADO', 'REPROVADO', 'DESISTIU');

-- CreateEnum
CREATE TYPE "BaseLegal" AS ENUM ('CONSENTIMENTO', 'EXECUCAO_CONTRATO', 'LEGITIMO_INTERESSE', 'OBRIGACAO_LEGAL');

-- CreateEnum
CREATE TYPE "TipoHistoricoVaga" AS ENUM ('ETAPA', 'STATUS', 'INICIO', 'APROVADO');

-- CreateEnum
CREATE TYPE "MarcoExperiencia" AS ENUM ('PRIMEIRO_PERIODO', 'SEGUNDO_PERIODO');

-- CreateEnum
CREATE TYPE "RecomendacaoExperiencia" AS ENUM ('PRORROGAR', 'EFETIVAR', 'DESLIGAR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'LEITOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_regua" (
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "slaDias" INTEGER NOT NULL,

    CONSTRAINT "etapas_regua_pkey" PRIMARY KEY ("ordem")
);

-- CreateTable
CREATE TABLE "parametros" (
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametros_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "feriados" (
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "feriados_pkey" PRIMARY KEY ("data")
);

-- CreateTable
CREATE TABLE "itens_lista" (
    "id" TEXT NOT NULL,
    "lista" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "cor" TEXT,

    CONSTRAINT "itens_lista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequencias" (
    "prefixo" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sequencias_pkey" PRIMARY KEY ("prefixo")
);

-- CreateTable
CREATE TABLE "vagas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "empresa" TEXT NOT NULL DEFAULT '',
    "cargo" TEXT NOT NULL DEFAULT '',
    "depto" TEXT NOT NULL DEFAULT '',
    "tipo" TEXT NOT NULL DEFAULT '',
    "substituido" TEXT NOT NULL DEFAULT '',
    "gestor" TEXT NOT NULL DEFAULT '',
    "gestorUsuarioId" TEXT,
    "salario" DECIMAL(12,2),
    "abertura" DATE,
    "status" TEXT NOT NULL DEFAULT 'TRIAR',
    "prioridade" TEXT NOT NULL DEFAULT '',
    "aprovado" TEXT NOT NULL DEFAULT '',
    "inicio" DATE,
    "talent" TEXT NOT NULL DEFAULT '',
    "medirSla" BOOLEAN NOT NULL DEFAULT true,
    "obs" TEXT NOT NULL DEFAULT '',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vagas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaga_etapas" (
    "vagaId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "registradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradaPorId" TEXT,

    CONSTRAINT "vaga_etapas_pkey" PRIMARY KEY ("vagaId","ordem")
);

-- CreateTable
CREATE TABLE "vaga_historico" (
    "id" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "tipo" "TipoHistoricoVaga" NOT NULL,
    "etapaOrdem" INTEGER,
    "de" TEXT,
    "para" TEXT,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "porId" TEXT,

    CONSTRAINT "vaga_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatos" (
    "id" TEXT NOT NULL,
    "codigoLegado" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "cpf" TEXT,
    "cidade" TEXT,
    "fonte" TEXT,
    "curriculoUrl" TEXT,
    "curriculoTexto" TEXT,
    "baseLegal" "BaseLegal" NOT NULL DEFAULT 'CONSENTIMENTO',
    "consentimentoEm" TIMESTAMP(3),
    "consentimentoVersao" TEXT,
    "consentimentoRevogadoEm" TIMESTAMP(3),
    "retencaoAte" DATE,
    "anonimizadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidaturas" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "etapa" "EtapaCandidatura" NOT NULL DEFAULT 'TRIAGEM',
    "statusLegado" TEXT,
    "fonte" TEXT,
    "motivoPerda" TEXT,
    "scorecard" JSONB,
    "etapaAtualizadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatura_eventos" (
    "id" TEXT NOT NULL,
    "candidaturaId" TEXT NOT NULL,
    "de" "EtapaCandidatura",
    "para" "EtapaCandidatura" NOT NULL,
    "motivo" TEXT,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "porId" TEXT,

    CONSTRAINT "candidatura_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissoes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "obs" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissao_itens" (
    "admissaoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tarefa" TEXT NOT NULL,
    "resposta" "Resposta" NOT NULL DEFAULT 'NAO',
    "respondidoEm" TIMESTAMP(3),

    CONSTRAINT "admissao_itens_pkey" PRIMARY KEY ("admissaoId","ordem")
);

-- CreateTable
CREATE TABLE "experiencias" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "vagaId" TEXT,
    "nome" TEXT NOT NULL DEFAULT '',
    "empresa" TEXT NOT NULL DEFAULT '',
    "cargo" TEXT NOT NULL DEFAULT '',
    "depto" TEXT NOT NULL DEFAULT '',
    "gestor" TEXT NOT NULL DEFAULT '',
    "admissao" DATE,
    "limite1" DATE,
    "limite2" DATE,
    "env1" DATE,
    "prorrog" "SimNao",
    "env2" DATE,
    "efetiv" "SimNao",
    "obs" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes_experiencia" (
    "id" TEXT NOT NULL,
    "experienciaId" TEXT NOT NULL,
    "marco" "MarcoExperiencia" NOT NULL,
    "avaliadorId" TEXT,
    "nota" INTEGER,
    "recomendacao" "RecomendacaoExperiencia" NOT NULL,
    "comentario" TEXT NOT NULL DEFAULT '',
    "criterios" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_experiencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracoes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "vagaId" TEXT,
    "admissao" DATE,
    "nome" TEXT NOT NULL DEFAULT '',
    "empresa" TEXT NOT NULL DEFAULT '',
    "setor" TEXT NOT NULL DEFAULT '',
    "gestor" TEXT NOT NULL DEFAULT '',
    "feito" "Resposta" NOT NULL DEFAULT 'NAO',
    "dataIntegr" DATE,
    "obs" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos_estagio" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "vagaId" TEXT,
    "nome" TEXT NOT NULL DEFAULT '',
    "empresa" TEXT NOT NULL DEFAULT '',
    "faculdade" TEXT NOT NULL DEFAULT '',
    "solic" DATE,
    "retorno" DATE,
    "assinado" DATE,
    "obs" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_estagio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uniformes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "vagaId" TEXT,
    "empresa" TEXT NOT NULL DEFAULT '',
    "nome" TEXT NOT NULL DEFAULT '',
    "tipoVaga" TEXT NOT NULL DEFAULT '',
    "nascimento" DATE,
    "telefone" TEXT NOT NULL DEFAULT '',
    "cpf" TEXT NOT NULL DEFAULT '',
    "admissao" DATE,
    "cargo" TEXT NOT NULL DEFAULT '',
    "setor" TEXT NOT NULL DEFAULT '',
    "terceiro" TEXT NOT NULL DEFAULT 'NA',
    "sapato" TEXT NOT NULL DEFAULT '',
    "camisa" TEXT NOT NULL DEFAULT '',
    "calca" TEXT NOT NULL DEFAULT '',
    "entregue" "SimNao",
    "dataEntrega" DATE,
    "obs" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uniformes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "texto" VARCHAR(400) NOT NULL,
    "vagaId" TEXT,
    "quando" DATE,
    "feito" BOOLEAN NOT NULL DEFAULT false,
    "criada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "usuarioNome" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "antes" JSONB,
    "depois" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuarioId_idx" ON "refresh_tokens"("usuarioId");

-- CreateIndex
CREATE INDEX "itens_lista_lista_ordem_idx" ON "itens_lista"("lista", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "itens_lista_lista_valor_key" ON "itens_lista"("lista", "valor");

-- CreateIndex
CREATE UNIQUE INDEX "vagas_codigo_key" ON "vagas"("codigo");

-- CreateIndex
CREATE INDEX "vagas_status_idx" ON "vagas"("status");

-- CreateIndex
CREATE INDEX "vagas_empresa_idx" ON "vagas"("empresa");

-- CreateIndex
CREATE INDEX "vagas_gestorUsuarioId_idx" ON "vagas"("gestorUsuarioId");

-- CreateIndex
CREATE INDEX "vaga_historico_vagaId_em_idx" ON "vaga_historico"("vagaId", "em");

-- CreateIndex
CREATE UNIQUE INDEX "candidatos_codigoLegado_key" ON "candidatos"("codigoLegado");

-- CreateIndex
CREATE UNIQUE INDEX "candidatos_cpf_key" ON "candidatos"("cpf");

-- CreateIndex
CREATE INDEX "candidatos_email_idx" ON "candidatos"("email");

-- CreateIndex
CREATE INDEX "candidatos_retencaoAte_idx" ON "candidatos"("retencaoAte");

-- CreateIndex
CREATE INDEX "candidaturas_vagaId_etapa_idx" ON "candidaturas"("vagaId", "etapa");

-- CreateIndex
CREATE UNIQUE INDEX "candidaturas_candidatoId_vagaId_key" ON "candidaturas"("candidatoId", "vagaId");

-- CreateIndex
CREATE INDEX "candidatura_eventos_candidaturaId_em_idx" ON "candidatura_eventos"("candidaturaId", "em");

-- CreateIndex
CREATE UNIQUE INDEX "admissoes_codigo_key" ON "admissoes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "admissoes_vagaId_key" ON "admissoes"("vagaId");

-- CreateIndex
CREATE UNIQUE INDEX "experiencias_codigo_key" ON "experiencias"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "experiencias_vagaId_key" ON "experiencias"("vagaId");

-- CreateIndex
CREATE INDEX "experiencias_limite1_idx" ON "experiencias"("limite1");

-- CreateIndex
CREATE INDEX "experiencias_limite2_idx" ON "experiencias"("limite2");

-- CreateIndex
CREATE INDEX "avaliacoes_experiencia_experienciaId_idx" ON "avaliacoes_experiencia"("experienciaId");

-- CreateIndex
CREATE UNIQUE INDEX "integracoes_codigo_key" ON "integracoes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "integracoes_vagaId_key" ON "integracoes"("vagaId");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_estagio_codigo_key" ON "contratos_estagio"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_estagio_vagaId_key" ON "contratos_estagio"("vagaId");

-- CreateIndex
CREATE UNIQUE INDEX "uniformes_codigo_key" ON "uniformes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "uniformes_vagaId_key" ON "uniformes"("vagaId");

-- CreateIndex
CREATE UNIQUE INDEX "notas_codigo_key" ON "notas"("codigo");

-- CreateIndex
CREATE INDEX "notas_quando_idx" ON "notas"("quando");

-- CreateIndex
CREATE INDEX "audit_log_entidade_entidadeId_idx" ON "audit_log"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "audit_log_usuarioId_em_idx" ON "audit_log"("usuarioId", "em");

-- CreateIndex
CREATE INDEX "audit_log_em_idx" ON "audit_log"("em");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vagas" ADD CONSTRAINT "vagas_gestorUsuarioId_fkey" FOREIGN KEY ("gestorUsuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaga_etapas" ADD CONSTRAINT "vaga_etapas_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaga_historico" ADD CONSTRAINT "vaga_historico_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "candidatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatura_eventos" ADD CONSTRAINT "candidatura_eventos_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "candidaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissoes" ADD CONSTRAINT "admissoes_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissao_itens" ADD CONSTRAINT "admissao_itens_admissaoId_fkey" FOREIGN KEY ("admissaoId") REFERENCES "admissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiencias" ADD CONSTRAINT "experiencias_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes_experiencia" ADD CONSTRAINT "avaliacoes_experiencia_experienciaId_fkey" FOREIGN KEY ("experienciaId") REFERENCES "experiencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes" ADD CONSTRAINT "integracoes_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_estagio" ADD CONSTRAINT "contratos_estagio_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uniformes" ADD CONSTRAINT "uniformes_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
