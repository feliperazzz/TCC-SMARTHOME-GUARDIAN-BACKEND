-- ============================================================
-- SMART HOME GUARDIAN - SCHEMA DO BANCO DE DADOS
-- MySQL 8.x — cria a estrutura completa do sistema
-- Uso: conectar no banco (Aiven ou local) e executar este script
-- No Aiven: aba "Queries" do serviço no console, ou Workbench/DBeaver
-- ============================================================

-- ------------------------------------------------------------
-- TABELA: usuarios
-- Autenticação JWT — senha armazenada como hash bcrypt
-- "armado" guarda o estado do sistema (0 = desarmado, 1 = armado)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(120)  NOT NULL,
  email      VARCHAR(160)  NOT NULL UNIQUE,
  senha_hash VARCHAR(255)  NOT NULL,
  armado     TINYINT(1)    NOT NULL DEFAULT 0,
  criado_em  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABELA: ambientes
-- Cada ambiente pertence a um usuário (isolamento por conta)
-- "icone" define o ícone no app (home, sala, cozinha...)
-- "status" indica a situação do ambiente (seguro, alerta...)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ambientes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT           NOT NULL,
  nome       VARCHAR(100)  NOT NULL,
  icone      VARCHAR(50)   NOT NULL DEFAULT 'home',
  status     VARCHAR(20)   NOT NULL DEFAULT 'seguro',
  criado_em  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABELA: eventos
-- Alertas gerados pelos sensores IoT — "lido" alimenta o swipe
-- do app e o badge do sino
-- "usuario_id" isola os eventos por conta (o app só vê os seus)
-- "titulo"/"severidade" alimentam a lista do app e as cores
-- "ambiente_id" aceita NULL (eventos sem ambiente específico)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT           NOT NULL,
  ambiente_id  INT           NULL,
  tipo         VARCHAR(60)   NOT NULL,
  titulo       VARCHAR(120)  NOT NULL,
  descricao    VARCHAR(255)  NOT NULL,
  severidade   VARCHAR(20)   NOT NULL DEFAULT 'info',
  lido         TINYINT(1)    NOT NULL DEFAULT 0,
  criado_em    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (ambiente_id) REFERENCES ambientes(id) ON DELETE CASCADE
) ENGINE=InnoDB;