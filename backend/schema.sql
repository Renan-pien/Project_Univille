CREATE DATABASE IF NOT EXISTS agenda_eventos
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE agenda_eventos;

DROP TABLE IF EXISTS solicitacao_historico;
DROP TABLE IF EXISTS solicitacao_recursos;
DROP TABLE IF EXISTS solicitacoes;
DROP TABLE IF EXISTS ambiente_recursos;
DROP TABLE IF EXISTS recursos;
DROP TABLE IF EXISTS ambientes;
DROP TABLE IF EXISTS temas;
DROP TABLE IF EXISTS cursos;
DROP TABLE IF EXISTS centros_custo;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  nome_completo   VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  senha_hash      VARCHAR(255) NOT NULL,
  perfil          ENUM('SOLICITANTE', 'ADMINISTRADOR') NOT NULL DEFAULT 'SOLICITANTE',
  ativo           TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_email (email)
);

CREATE TABLE centros_custo (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  codigo          VARCHAR(30)  NOT NULL,
  nome            VARCHAR(150) NOT NULL,
  ativo           TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_centros_custo_codigo (codigo)
);

CREATE TABLE cursos (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  nome            VARCHAR(150) NOT NULL,
  centro_custo_id BIGINT       NOT NULL,
  ativo           TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cursos_nome (nome),
  KEY idx_cursos_centro_custo (centro_custo_id),
  CONSTRAINT fk_cursos_centro_custo
    FOREIGN KEY (centro_custo_id) REFERENCES centros_custo (id) ON DELETE RESTRICT
);

CREATE TABLE temas (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  nome            VARCHAR(100) NOT NULL,
  ativo           TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_temas_nome (nome)
);

CREATE TABLE ambientes (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  nome            VARCHAR(100) NOT NULL,
  descricao       VARCHAR(255) NULL,
  capacidade      INT          NULL,
  ativo           TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ambientes_nome (nome),
  CONSTRAINT ck_ambientes_capacidade CHECK (capacidade IS NULL OR capacidade > 0)
);

CREATE TABLE recursos (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  nome            VARCHAR(100) NOT NULL,
  ativo           TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_recursos_nome (nome)
);

CREATE TABLE ambiente_recursos (
  ambiente_id     BIGINT NOT NULL,
  recurso_id      BIGINT NOT NULL,
  PRIMARY KEY (ambiente_id, recurso_id),
  KEY idx_ambiente_recursos_recurso (recurso_id),
  CONSTRAINT fk_ambiente_recursos_ambiente
    FOREIGN KEY (ambiente_id) REFERENCES ambientes (id) ON DELETE CASCADE,
  CONSTRAINT fk_ambiente_recursos_recurso
    FOREIGN KEY (recurso_id) REFERENCES recursos (id) ON DELETE RESTRICT
);

CREATE TABLE solicitacoes (
  id                       BIGINT       NOT NULL AUTO_INCREMENT,

  autor_id                 BIGINT       NOT NULL,
  solicitante_nome         VARCHAR(150) NULL,

  nome_evento              VARCHAR(200) NULL,
  tema_id                  BIGINT       NULL,
  data_evento              DATE         NULL,
  hora_inicio              TIME         NULL,
  hora_fim                 TIME         NULL,
  ambiente_id              BIGINT       NULL,
  curso_id                 BIGINT       NULL,
  centro_custo_id          BIGINT       NULL,
  palestrante              VARCHAR(200) NULL,
  publico_alvo             VARCHAR(255) NULL,
  justificativa            TEXT         NULL,
  objetivo                 TEXT         NULL,
  cerimonial               TINYINT(1)   NULL,
  havera_inscricoes        TINYINT(1)   NULL,
  necessidade_declaracoes  TINYINT(1)   NULL,
  observacoes              TEXT         NULL,

  status                   ENUM('RASCUNHO', 'AGUARDANDO_APROVACAO', 'REJEITADO', 'APROVADO', 'CANCELADO')
                           NOT NULL DEFAULT 'RASCUNHO',
  motivo_rejeicao          TEXT         NULL,
  motivo_cancelamento      TEXT         NULL,
  enviado_em               DATETIME     NULL,
  avaliado_por_id          BIGINT       NULL,
  avaliado_em              DATETIME     NULL,
  cancelado_por_id         BIGINT       NULL,
  cancelado_em             DATETIME     NULL,

  criado_em                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  KEY idx_solicitacoes_conflito (ambiente_id, data_evento, status, hora_inicio, hora_fim),
  KEY idx_solicitacoes_grade (status, data_evento, hora_inicio),
  KEY idx_solicitacoes_autor (autor_id, status),
  KEY idx_solicitacoes_tema (tema_id),
  KEY idx_solicitacoes_curso (curso_id),
  KEY idx_solicitacoes_centro_custo (centro_custo_id),

  CONSTRAINT fk_solicitacoes_autor
    FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_solicitacoes_tema
    FOREIGN KEY (tema_id) REFERENCES temas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_solicitacoes_ambiente
    FOREIGN KEY (ambiente_id) REFERENCES ambientes (id) ON DELETE RESTRICT,
  CONSTRAINT fk_solicitacoes_curso
    FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE RESTRICT,
  CONSTRAINT fk_solicitacoes_centro_custo
    FOREIGN KEY (centro_custo_id) REFERENCES centros_custo (id) ON DELETE RESTRICT,
  CONSTRAINT fk_solicitacoes_avaliado_por
    FOREIGN KEY (avaliado_por_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_solicitacoes_cancelado_por
    FOREIGN KEY (cancelado_por_id) REFERENCES usuarios (id) ON DELETE RESTRICT,

  CONSTRAINT ck_solicitacoes_horario CHECK (
    hora_inicio IS NULL OR hora_fim IS NULL OR
    (hora_fim > hora_inicio AND hora_inicio >= '00:00:00' AND hora_fim <= '23:59:59')
  ),
  CONSTRAINT ck_solicitacoes_rejeicao CHECK (
    status <> 'REJEITADO' OR (motivo_rejeicao IS NOT NULL AND motivo_rejeicao <> '')
  ),
  CONSTRAINT ck_solicitacoes_campos_envio CHECK (
    status = 'RASCUNHO' OR (
      nome_evento IS NOT NULL AND tema_id IS NOT NULL AND data_evento IS NOT NULL AND
      hora_inicio IS NOT NULL AND hora_fim IS NOT NULL AND ambiente_id IS NOT NULL AND
      curso_id IS NOT NULL AND centro_custo_id IS NOT NULL AND
      solicitante_nome IS NOT NULL AND palestrante IS NOT NULL AND
      publico_alvo IS NOT NULL AND justificativa IS NOT NULL AND objetivo IS NOT NULL AND
      cerimonial IS NOT NULL AND havera_inscricoes IS NOT NULL AND
      necessidade_declaracoes IS NOT NULL
    )
  )
);

CREATE TABLE solicitacao_recursos (
  solicitacao_id  BIGINT NOT NULL,
  recurso_id      BIGINT NOT NULL,
  PRIMARY KEY (solicitacao_id, recurso_id),
  KEY idx_solicitacao_recursos_recurso (recurso_id),
  CONSTRAINT fk_solicitacao_recursos_solicitacao
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes (id) ON DELETE CASCADE,
  CONSTRAINT fk_solicitacao_recursos_recurso
    FOREIGN KEY (recurso_id) REFERENCES recursos (id) ON DELETE RESTRICT
);

CREATE TABLE solicitacao_historico (
  id               BIGINT   NOT NULL AUTO_INCREMENT,
  solicitacao_id   BIGINT   NOT NULL,
  status_anterior  ENUM('RASCUNHO', 'AGUARDANDO_APROVACAO', 'REJEITADO', 'APROVADO', 'CANCELADO') NULL,
  status_novo      ENUM('RASCUNHO', 'AGUARDANDO_APROVACAO', 'REJEITADO', 'APROVADO', 'CANCELADO') NOT NULL,
  usuario_id       BIGINT   NOT NULL,
  comentario       TEXT     NULL,
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_historico_solicitacao (solicitacao_id, criado_em),
  KEY idx_historico_usuario (usuario_id),
  CONSTRAINT fk_historico_solicitacao
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes (id) ON DELETE CASCADE,
  CONSTRAINT fk_historico_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
);
