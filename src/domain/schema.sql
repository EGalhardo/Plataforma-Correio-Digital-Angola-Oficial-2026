-- =========================================================================
-- CANONICAL RELATIONAL MODEL SPECIFICATION - CORREIO DIGITAL ANGOLA
-- SCHEMA & DATA DEFINITION LANGUAGE (DDL) WITH INITIAL GOVERNMENT SEEDS
-- =========================================================================

-- =========================================================================
-- TEXT-BASED PSEUDO-ERD (ENTITY-RELATIONSHIP DIAGRAM)
-- =========================================================================
--
--  +------------------------+                           +-------------------------+
--  |      institutions      | <----+                     |        profiles         |
--  +------------------------+      |                     +-------------------------+
--  | PK id (varchar)        |      |                     | PK id (uuid)            |
--  |    name (varchar)      |      |                     |    bi (varchar, unique) |
--  |    category (enum)     |      |                     |    nif (varchar, unique)|
--  |    status (enum)       |      |                     |    role (varchar)       |
--  |    code (varchar)      |      |                     |    status (varchar)     |
--  +------------------------+      |                     +-------------------------+
--               ^                  |                                  ^
--               |                  |                                  | (1:1 optional)
--               | (1:N)            | (1:N)                            |
--  +------------------------+      |                     +-------------------------+
--  |        workers         |      |                     |        citizens         |
--  +------------------------+      |                     +-------------------------+
--  | PK id (uuid)           |      |                     | PK bi (varchar)         |
--  | FK institution_id -----+      |                     | FK user_id --------------+
--  |    role (varchar)      |      |                     |    full_name (varchar)  |
--  +------------------------+      |                     |    birth_date (date)    |
--                                  |                     |    phone (varchar)      |
--                                  |                     +-------------------------+
--                                  |                          |    ^          ^
--                                  |                    (1:N) |    | (1:N)    | (1:N)
--  +------------------------+      |                           |    |          |
--  |   knowledge_chunks     |      |           +---------------+    |          +----------+
--  +------------------------+      |           |                    |                     |
--  | PK id (uuid)           |      |           v                    |                     |
--  | FK institution_id -----+      |   +-------------------+        |               +-------------------+
--  |    content (text)      |      |   |     contacts      |        |               |   notifications   |
--  +------------------------+      |   +-------------------+        |               +-------------------+
--                                  |   | PK id (bigint)    |        |               | PK id (bigint)    |
--                                  |   | FK owner_bi ------+        |               | FK target_bi -----+
--                                  |   +-------------------+        |               +-------------------+
--  +------------------------+      |                                |
--  |   digital_protocols    | <----+---------------------+          |
--  +------------------------+      | (1:N)               |          |
--  | PK id (uuid)           |      |                     |          |
--  |    protocol_number     |      |                     |          |
--  +------------------------+      |                     |          |
--            ^     ^               |                     | (1:N)    | (1:N)
--            |     | (1:1)         v                     v          |
--            |  +--------------------+               +--------------------+
--      (1:1) |  |   correspondences  |               |     documents      |
--            |  +--------------------+               +--------------------+
--            |  | PK id (bigint)     |               | PK id (uuid)       |
--            |  | FK sender_bi ------+ (or inst)     | FK holder_bi ------+
--            |  | FK recipient_bi ---+               | FK protocol_id --+ |
--            |  | FK protocol_id ----+               +------------------|-+
--            |  +--------------------+                                  |
--            |                                                          |
--            +----------------------------------------------------------+
--
--  +------------------------+               +--------------------+
--  |        invoices        |               |   payment_records  |
--  +------------------------+               +--------------------+
--  | PK id (varchar)        |               | PK id (varchar)    |
--  | FK institution_id -----+               |    reference (text)|
--  |    reference (varchar) |               |    receipt_number  |
--  +------------------------+               +--------------------+
--
--  +------------------------+               +--------------------+
--  |     user_requests      |               |     audit_logs     |
--  +------------------------+               +--------------------+
--  | PK id (bigint)         |               | PK id (bigint)    |
--  | FK user_bi ------------+ (or generic)  |    username/actor  |
--  +------------------------+               +--------------------+
--

-- =========================================================================
-- 1. DATABASE CONFIGURATIONS & ENUMS
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Standard Domain Roles
CREATE TYPE app_mode_enum AS ENUM ('user', 'institution', 'admin');

-- Sector/Category of State Entities
CREATE TYPE inst_category_enum AS ENUM (
    'Finanças', 'Infraestrutura', 'Serviços', 'Segurança', 'Saúde', 'Justiça', 'Educação'
);

-- Active status of State Entities
CREATE TYPE inst_status_enum AS ENUM ('Ativa', 'Inativa');

-- Cryptographic sensitivity levels
CREATE TYPE sensitivity_level_enum AS ENUM (
    'Público', 'Privado', 'Sensível', 'Restrito', 'Ultra Restrito'
);

-- Urgency classification scales 
CREATE TYPE priority_scale_enum AS ENUM ('Normal', 'Importante', 'Urgente', 'Crítico');

-- Mail processing states
CREATE TYPE correspondence_status_enum AS ENUM (
    'Não Lida', 'Lida', 'Enviada', 'Recebida', 'Em Análise', 'Respondida', 'Arquivada', 'Cancelada'
);

-- Process urgencies
CREATE TYPE process_priority_enum AS ENUM ('Alta', 'Média', 'Baixa');

-- Process execution milestones
CREATE TYPE process_status_enum AS ENUM (
    'Pendente', 'Urgente', 'Processando', 'Concluido', 'Rejeitado'
);

-- AI System pre-approvals
CREATE TYPE ai_pre_approval_enum AS ENUM ('pre-approved', 'manual-review');

-- Trusted network relationships states
CREATE TYPE contact_status_enum AS ENUM ('Pendente', 'Confirmado');
CREATE TYPE contact_type_enum AS ENUM ('Normal', 'Emergência');

-- Debts states
CREATE TYPE invoice_status_enum AS ENUM ('Pendente', 'Pago', 'Atrasado');

-- System alerts classifications
CREATE TYPE notification_type_enum AS ENUM ('success', 'warning', 'info');


-- =========================================================================
// 2. STAGE TABLES CREATION
-- =========================================================================

-- 2.1 INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS institutions (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'inst-agt'
    name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    category inst_category_enum NOT NULL,
    province VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    status inst_status_enum DEFAULT 'Ativa',
    inst_code VARCHAR(50) UNIQUE NOT NULL,
    type_inst VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    comuna VARCHAR(100) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    responsible_name VARCHAR(255) NOT NULL,
    responsible_role VARCHAR(100) NOT NULL,
    registration_date DATE DEFAULT CURRENT_DATE,
    logo_url TEXT,
    
    -- Calculated stats caching points
    total_correspondence INT DEFAULT 0,
    total_agents INT DEFAULT 0,
    last_activity VARCHAR(100),
    response_rate VARCHAR(20) DEFAULT '100%',
    ai_usage_rate VARCHAR(20) DEFAULT '0%',
    performance_score VARCHAR(20) DEFAULT '100%'
);

-- 2.2 SYSTEM PROFILES / AUTH USERS
CREATE TABLE IF NOT EXISTS system_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role app_mode_enum DEFAULT 'user',
    status VARCHAR(50) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Pendente', 'Bloqueado')),
    last_login TIMESTAMP DEFAULT NOW()
);

-- 2.3 CIVIL IDENTITIES DB (CITIZENS)
CREATE TABLE IF NOT EXISTS citizens (
    bi VARCHAR(20) PRIMARY KEY, -- Primary Key, used in all official correspondence
    nif VARCHAR(20) UNIQUE NOT NULL,
    passport VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    filiation TEXT NOT NULL,
    marital_status VARCHAR(50) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    verification_level VARCHAR(50) DEFAULT 'Pendente' CHECK (verification_level IN ('Verificado', 'Totalmente Verificado', 'Pendente')),
    confidence_score INT DEFAULT 0,
    user_id UUID REFERENCES system_users(id) ON DELETE SET NULL, -- Null if not registered yet
    avatar_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_citizens_user_id ON citizens(user_id);
CREATE INDEX IF NOT EXISTS idx_citizens_nif ON citizens(nif);

-- 2.4 WORKERS / CIVIL SERVANTS
CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY REFERENCES system_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    institution_id VARCHAR(50) REFERENCES institutions(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    last_active TIMESTAMP DEFAULT NOW()
);

-- 2.5 DIGITAL CERTIFICATION PROTOCOLS (PROOF OF SECURITY)
CREATE TABLE IF NOT EXISTS digital_protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol_number VARCHAR(100) UNIQUE NOT NULL,
    issuer_institution VARCHAR(255) NOT NULL,
    official_issue_date DATE NOT NULL,
    official_time TIME NOT NULL,
    issuer_responsible VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    current_state VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    deadline_date DATE,
    qr_code_url TEXT,
    digital_signature TEXT NOT NULL,
    digital_seal VARCHAR(100),
    document_hash VARCHAR(100),
    institutional_certificate VARCHAR(100),
    signature_date TIMESTAMPTZ DEFAULT NOW(),
    legal_validity VARCHAR(255)
);

-- 2.6 SECURE POSTAL MESSAGES / CORRESPONDENCES
CREATE TABLE IF NOT EXISTS correspondences (
    id BIGSERIAL PRIMARY KEY,
    sender_bi VARCHAR(20) NOT NULL, -- Holds citizen biography identification or institution ID
    recipient_bi VARCHAR(20) NOT NULL REFERENCES citizens(bi) ON DELETE CASCADE,
    org VARCHAR(100) NOT NULL, -- e.g. "SME"
    preview VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unread BOOLEAN DEFAULT TRUE,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sensitivity sensitivity_level_enum DEFAULT 'Privado',
    priority_scale priority_scale_enum DEFAULT 'Normal',
    state_indicator VARCHAR(100),
    actions TEXT[] DEFAULT '{}',
    attachments TEXT[] DEFAULT '{}',
    protocol_id UUID REFERENCES digital_protocols(id) ON DELETE SET NULL,
    deadline_hours_remaining INT
);

CREATE INDEX IF NOT EXISTS idx_correspondences_recipient ON correspondences(recipient_bi);

-- 2.7 CORRESPONDENCE TRANSITIONS HISTORY
CREATE TABLE IF NOT EXISTS correspondence_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correspondence_id BIGINT REFERENCES correspondences(id) ON DELETE CASCADE,
    state correspondence_status_enum NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    responsible VARCHAR(255) NOT NULL,
    description TEXT NOT NULL
);

-- 2.8 INDIVIDUAL DOCUMENTS (DIGITAL WALLET FILE SYSTEM)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    holder_bi VARCHAR(20) NOT NULL REFERENCES citizens(bi) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g. "BI Digital", "Passaporte"
    validity VARCHAR(100) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    issued_at VARCHAR(100) NOT NULL,
    protocol_id UUID REFERENCES digital_protocols(id) ON DELETE SET NULL
);

-- 2.9 INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(100) PRIMARY KEY, -- e.g. "FAT-ENDE-2026-991"
    institution_id VARCHAR(50) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    contract_number VARCHAR(100) NOT NULL,
    reference VARCHAR(100) UNIQUE NOT NULL,
    amount VARCHAR(50) NOT NULL,
    amount_kz NUMERIC(15, 2) NOT NULL,
    period VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status_enum DEFAULT 'Pendente'
);

-- 2.10 COMPLETED FINANCIAL PAYMENTS HISTORY
CREATE TABLE IF NOT EXISTS payment_records (
    id VARCHAR(100) PRIMARY KEY, -- e.g. "PAY-00129"
    reference VARCHAR(100) NOT NULL,
    amount VARCHAR(50) NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    date_time TIMESTAMPTZ DEFAULT NOW(),
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Liquidado'
);

-- 2.11 AUDIT TRAILS LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    username VARCHAR(255) NOT NULL, -- User email or citizen name
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action_type VARCHAR(50) DEFAULT 'info'
);

-- 2.12 PUSH NOTIFICATIONS
CREATE TABLE IF NOT EXISTS system_notifications (
    id BIGSERIAL PRIMARY KEY,
    target_bi VARCHAR(20) REFERENCES citizens(bi) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    time_text VARCHAR(100) NOT NULL,
    type notification_type_enum DEFAULT 'info',
    target_tab VARCHAR(50) NOT NULL
);

-- 2.13 CITIZEN PROCESS REQUESTS
CREATE TABLE IF NOT EXISTS user_requests (
    id BIGSERIAL PRIMARY KEY,
    user_bi VARCHAR(20) REFERENCES citizens(bi) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    priority process_priority_enum NOT NULL,
    time_text VARCHAR(100) NOT NULL,
    status process_status_enum DEFAULT 'Pendente',
    institution VARCHAR(100),
    request_date DATE DEFAULT CURRENT_DATE
);

-- 2.14 DOCUMENT INTERNAL FLOW PROCESSOR
CREATE TABLE IF NOT EXISTS document_requests (
    id BIGSERIAL PRIMARY KEY,
    user_bi VARCHAR(20) REFERENCES citizens(bi) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    doc_type VARCHAR(100) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    request_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Pendente',
    ai_status ai_pre_approval_enum DEFAULT 'manual-review'
);

-- 2.15 TRUSTED CONTACTS CIRCLE
CREATE TABLE IF NOT EXISTS contacts_circle (
    id BIGSERIAL PRIMARY KEY,
    owner_bi VARCHAR(20) REFERENCES citizens(bi) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_bi VARCHAR(20) NOT NULL,
    relation VARCHAR(100) NOT NULL,
    status contact_status_enum DEFAULT 'Pendente',
    type contact_type_enum DEFAULT 'Normal',
    phone VARCHAR(50) NOT NULL
);

-- 2.16 AI CHAT ASSISTANTS METADATA
CREATE TABLE IF NOT EXISTS ai_assistants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    prompt_theme TEXT NOT NULL,
    greeting_message TEXT NOT NULL,
    voice_pitch NUMERIC(3, 2) DEFAULT 1.0,
    voice_speed NUMERIC(3, 2) DEFAULT 1.0
);

-- 2.17 AI GROUNDING KNOWLEDGE BASIS TABLE
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id VARCHAR(50) REFERENCES institutions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    update_date DATE DEFAULT CURRENT_DATE
);


-- =========================================================================
-- 3. INITIAL SEED SCRIPTS (CANONICAL RECORDS BASED ON EDLASIO GALHARDO)
-- =========================================================================

-- Seed institutions
INSERT INTO institutions (id, name, full_name, category, province, municipio, status, inst_code, type_inst, cidade, comuna, contact_email, contact_phone, responsible_name, responsible_role, registration_date, ai_usage_rate, performance_score, total_correspondence, total_agents)
VALUES 
('inst-agt', 'AGT', 'Administração Geral Tributária', 'Finanças', 'Luanda', 'Ingombota', 'Ativa', 'AGT-001', 'Administração Geral', 'Luanda', 'Maculusso', 'geral@agt.gov.ao', '+244 923 111 222', 'Dr. Francisco Manuel', 'PCA de Transição', '2025-01-10', '94%', '98.5%', 342400, 45),
('inst-sme', 'SME', 'Serviço de Migração e Estrangeiros', 'Segurança', 'Luanda', 'Maianga', 'Ativa', 'SME-001', 'Direcção Pública', 'Luanda', 'Maianga Sede', 'geral@sme.gov.ao', '+244 923 000 000', 'Dr. António Fernando', 'Director Geral', '2025-02-15', '88%', '95.0%', 198250, 32);

-- Seed Edlasio's Auth User Account
INSERT INTO system_users (id, email, role, status)
VALUES ('777ef5cc-11aa-4bbb-9ccc-222ed9874562', 'edlasio.galhardo@gmail.com', 'user', 'Ativo');

-- Seed Edlasio's Civil Identity Form
INSERT INTO citizens (bi, nif, passport, full_name, birth_date, filiation, marital_status, phone, email, municipio, province, verification_level, confidence_score, user_id, avatar_url)
VALUES (
    '009874562LA041', 
    '5401329188', 
    'AO-P129384', 
    'Edlasio Galhardo', 
    '1995-03-12', 
    'António Galhardo & Maria Conceição', 
    'Solteiro', 
    '+244 923 000 111', 
    'edlasio.galhardo@gmail.com', 
    'Maianga', 
    'Luanda', 
    'Totalmente Verificado', 
    98, 
    '777ef5cc-11aa-4bbb-9ccc-222ed9874562', 
    'https://i.postimg.cc/J73QvnGv/Foto-Edlasio.png'
);

-- Seed Digital Security Protocols
INSERT INTO digital_protocols (id, protocol_number, issuer_institution, official_issue_date, official_time, issuer_responsible, category, document_type, current_state, priority, digital_signature, legal_validity)
VALUES ('e8f96112-be24-4fa0-b88d-6be6281735cb', 'CDA-2026-PT-901183', 'AGT', '2026-06-14', '08:30:15', 'Dr. Francisco Manuel', 'Notificação e Expediente', 'Tributário / IPU', 'Autenticado no Barramento do Estado', 'Alta', 'MIIEuwYJKoZIhvcNAQcCoIIErDCCBKgCAQExDzANBglghkgBZQMEAgEFADCBv', 'Lei Geral das Tecnologias de Informação (Nº 2/14)');

-- Seed Edlasio's Correspondences
INSERT INTO correspondences (id, sender_bi, recipient_bi, org, preview, subject, body, sensitivity, priority_scale, state_indicator, actions, protocol_id)
VALUES (1, 'inst-agt', '009874562LA041', 'AGT', 'Imposto pendente no valor de 18.500 Kz com prazo definido.', 'Pagamento Pendente IPU', 'Foi identificado um imposto pendente no seu registro fiscal referente ao IPU.\nInscreva a referência para liquidação imediata no Express.', 'Sensível', 'Urgente', 'Pagamento pendente', '{"Efetuar Pagamento", "Gerar Referência"}', 'e8f96112-be24-4fa0-b88d-6be6281735cb');

-- Seed Edlasio's Digital Wallet Documents
INSERT INTO documents (id, holder_bi, name, validity, code, document_number, issuer, issued_at)
VALUES 
('ee8f1211-12aa-3bee-9ccf-aa0011223344', '009874562LA041', 'BI Digital', 'Válido até 2032', 'AO-BI-9281', '009874562LA041', 'SME', '10 de Abril de 2022'),
('ee8f1211-55bb-3bee-9ccf-aa0011223344', '009874562LA041', 'NIF (Número de Identificação Fiscal)', 'Vitalício', 'AO-NIF-4412', '5401329188', 'AGT', '15 de Maio de 2018');

-- Seed Invoices
INSERT INTO invoices (id, institution_id, contract_number, reference, amount, amount_kz, period, due_date, status)
VALUES ('FAT-AGT-IPU-2026', 'inst-agt', 'NIF-5401329188', '889012344', '18.500 Kz', 18500.00, 'Ano Fiscal 2025', '2026-05-25', 'Pendente');

-- Seed AI Assistants Configurations
INSERT INTO ai_assistants (id, name, avatar_url, prompt_theme, greeting_message, voice_pitch, voice_speed)
VALUES 
('ai-gove-voice', 'Guia de Voz Angola Digital', 'https://i.postimg.cc/J73QvnGv/Foto-Edlasio.png', 'Voz Inclusiva', 'Olá Edlasio! Em que posso ajudar no Correio Digital de Angola?', 1.0, 0.95),
('ai-agt-chat', 'Assistente Fiscal Integrado AGT', 'https://i.postimg.cc/J73QvnGv/Foto-Edlasio.png', 'Técnico Tributário', 'Olá! Sou o assistente oficial de impostos da AGT. Como ajudo hoje?', 1.05, 1.0);
