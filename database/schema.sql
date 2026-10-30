-- ============================================================
-- SMART HOME GUARDIAN - SCHEMA DO BANCO DE DADOS
-- MySQL 8.x — cria a estrutura completa do sistema
-- Uso: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS smarthome_guardian
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smarthome_guardian;

-- ------------------------------------------------------------
-- TABELA: usuarios
-- Autenticação JWT — senha armazenada como hash bcrypt
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(120)  NOT NULL,
  email      VARCHAR(160)  NOT NULL UNIQUE,
  senha_hash VARCHAR(255)  NOT NULL,
  criado_em  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABELA: ambientes
-- Cada ambiente pertence a um usuário (isolamento por conta)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ambientes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT           NOT NULL,
  nome       VARCHAR(100)  NOT NULL,
  criado_em  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABELA: eventos
-- Alertas gerados pelos sensores IoT — "lido" alimenta o swipe
-- do app e o badge do sino
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  ambiente_id  INT           NOT NULL,
  tipo         VARCHAR(60)   NOT NULL,
  descricao    VARCHAR(255)  NOT NULL,
  lido         TINYINT(1)    NOT NULL DEFAULT 0,
  criado_em    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ambiente_id) REFERENCES ambientes(id) ON DELETE CASCADE
) ENGINE=InnoDB;