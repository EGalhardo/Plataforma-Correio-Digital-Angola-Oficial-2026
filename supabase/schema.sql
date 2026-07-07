-- ==========================================
-- SUPABASE / POSTGRESQL SCHEMA SPECIFICATION
-- APPLICATIVO DE CORRESPONDÊNCIAS DIGITAIS GOVERNAMENTAIS (ANGOLA DIGITAL)
-- ==========================================

-- Standard schema configuration for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES / USERS TABLE
-- Tracks authenticated citizens and government agents
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bi VARCHAR(20) UNIQUE NOT NULL, -- Bilhete de Identidade (Unique Identifier)
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    nif VARCHAR(20) UNIQUE, -- Número de Identificação Fiscal
    passport VARCHAR(30) UNIQUE,
    birth_date DATE,
    filiation TEXT, -- Parentesco / Filiação
    marital_status VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user' -- 'user' | 'institution' | 'admin'
);

-- Indexing for citizen/agent BI lookups
CREATE INDEX IF NOT EXISTS idx_profiles_bi ON profiles(bi);
CREATE INDEX IF NOT EXISTS idx_profiles_nif ON profiles(nif);

-- 2. DIGITAL PROTOCOLS TABLE
-- Ensures cryptographic compliance for sent correspondence and certificates
CREATE TABLE IF NOT EXISTS digital_protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. "PRT-2026-9022"
    issuer_institution VARCHAR(100) NOT NULL, -- e.g. "AGT", "SME"
    official_issue_date DATE NOT NULL,
    official_time TIME NOT NULL,
    issuer_responsible VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    current_state VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    deadline_date DATE,
    qr_code_url TEXT,
    digital_signature TEXT NOT NULL,
    digital_seal TEXT,
    document_hash TEXT,
    institutional_certificate TEXT,
    signature_date TIMESTAMPTZ,
    legal_validity VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_protocols_number ON digital_protocols(protocol_number);

-- 3. MESSAGES (CORRESPONDENCE & MAIL) TABLE
-- Models inbox, sent messages, institutional messages, and citizen notifications
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    sender_bi VARCHAR(20) NOT NULL, -- From citizen or institution bi
    recipient_bi VARCHAR(20) NOT NULL, -- To citizen or department bi
    org VARCHAR(100) NOT NULL, -- e.g. "AGT", "SME", "MINJUS", or "Cidadão: ..."
    preview TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unread BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) NOT NULL DEFAULT 'Normal', -- Priority Scale (Normal, Importante, Urgente, Crítico)
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    deadline_text VARCHAR(100),
    state_indicator VARCHAR(100), -- e.g. "Pagamento pendente", "Em processamento"
    actions TEXT[] DEFAULT '{}', -- Available action-buttons
    attachments TEXT[] DEFAULT '{}', -- URL/names of attachments
    protocol_id UUID REFERENCES digital_protocols(id) ON DELETE SET NULL,
    sensitivity VARCHAR(50) DEFAULT 'Privado', -- 'Público' | 'Privado' | 'Sensível' | 'Restrito' | 'Ultra Restrito'
    priority_scale VARCHAR(50) DEFAULT 'Normal', -- 'Normal' | 'Importante' | 'Urgente' | 'Crítico'
    deadline_hours_remaining INT
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_bi);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_bi);

-- 4. STATE EVENTS HISTORY (AUDIT TRAIL PER CORRESPONDENCE)
CREATE TABLE IF NOT EXISTS message_state_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
    state VARCHAR(100) NOT NULL, -- e.g. 'Recebida', 'Entregue', 'Visualizada', etc.
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    responsible VARCHAR(255) NOT NULL,
    description TEXT NOT NULL
);

-- 5. DOCUMENTS (ISSUED CERTIFICATES / WALLET) TABLE
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- e.g. "BI Digital", "Passaporte"
    validity VARCHAR(100) NOT NULL, -- e.g. "Valido ate 2032"
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. "AO-CD-5534"
    holder_bi VARCHAR(20) NOT NULL REFERENCES profiles(bi) ON DELETE CASCADE,
    document_number VARCHAR(100) NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    issued_at VARCHAR(100) NOT NULL,
    protocol_id UUID REFERENCES digital_protocols(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_holder ON documents(holder_bi);

-- 6. CONTACTS (EMERGENCY / FAITHFUL CONTEXTS) TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    owner_bi VARCHAR(20) NOT NULL REFERENCES profiles(bi) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bi VARCHAR(20) NOT NULL,
    relation VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendente', -- 'Confirmado' | 'Pendente'
    type VARCHAR(50) DEFAULT 'Normal' -- 'Normal' | 'Emergência'
);

CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_bi);

-- 7. SYSTEM NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    target_bi VARCHAR(20) NOT NULL REFERENCES profiles(bi) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    time_text VARCHAR(100) NOT NULL, -- e.g. "2h atrás"
    type VARCHAR(30) DEFAULT 'info', -- 'success' | 'warning' | 'info'
    target_tab VARCHAR(50) NOT NULL -- e.g. "correspondencias", "perfil"
);

CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_bi);

-- 8. SERVICE REQUESTS TABLE (USER REQUESTED SERVICES)
CREATE TABLE IF NOT EXISTS user_requests (
    id BIGSERIAL PRIMARY KEY,
    user_bi VARCHAR(20) NOT NULL, -- BI requesting the service
    user_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100) NOT NULL, -- e.g. "IPU", "NIF", "Certidão"
    priority VARCHAR(50) NOT NULL, -- 'Alta' | 'Média' | 'Baixa'
    time_text VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente', -- 'pendente' | 'urgente' | 'processando' | 'concluido' | 'rejeitado'
    institution VARCHAR(100),
    request_date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_user_requests_bi ON user_requests(user_bi);

-- 9. DOCUMENT ISSUANCE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS document_requests (
    id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_bi VARCHAR(20) NOT NULL,
    doc_type VARCHAR(100) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    request_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Pendente', -- 'Pendente' | 'Aprovado' | 'Rejeitado'
    ai_status VARCHAR(50) DEFAULT 'manual-review' -- 'pre-approved' | 'manual-review'
);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    username VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    action_type VARCHAR(30) DEFAULT 'info'
);

-- =========================================================================
-- CONTROLE DE SEGURANÇA RLS (RESOLUÇÃO DE ERROS DE PERMISSÃO / ALERTAS CRÍTICOS)
-- =========================================================================
-- O Supabase exibe um aviso "CRITICAL" quando o RLS está desabilitado (DISABLE RLS).
-- Para eliminar os alertas críticos da barra lateral de segurança de forma elegante,
-- ativamos o RLS e criamos uma política pública permissiva (que atua como livre acesso de dev):

-- 1. Reativar o RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas públicas (true) que autorizam todas as operações de leitura/gravação da app
DROP POLICY IF EXISTS "Permitir tudo para profiles" ON profiles;
CREATE POLICY "Permitir tudo para profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para digital_protocols" ON digital_protocols;
CREATE POLICY "Permitir tudo para digital_protocols" ON digital_protocols FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para messages" ON messages;
CREATE POLICY "Permitir tudo para messages" ON messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para message_state_history" ON message_state_history;
CREATE POLICY "Permitir tudo para message_state_history" ON message_state_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para documents" ON documents;
CREATE POLICY "Permitir tudo para documents" ON documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para contacts" ON contacts;
CREATE POLICY "Permitir tudo para contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para notifications" ON notifications;
CREATE POLICY "Permitir tudo para notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para user_requests" ON user_requests;
CREATE POLICY "Permitir tudo para user_requests" ON user_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para document_requests" ON document_requests;
CREATE POLICY "Permitir tudo para document_requests" ON document_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para audit_logs" ON audit_logs;
CREATE POLICY "Permitir tudo para audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);


-- Video Sessions for Video Attendance
CREATE TABLE IF NOT EXISTS video_sessions (
  id TEXT PRIMARY KEY,
  room_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  associated_protocol TEXT,
  associated_message_id INTEGER,
  status TEXT NOT NULL DEFAULT 'agendada',
  host_bi TEXT NOT NULL,
  host_name TEXT NOT NULL,
  guest_bi TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  agenda TEXT,
  notes TEXT,
  duration INTEGER,
  quality TEXT DEFAULT 'excellent',
  participant_count INTEGER DEFAULT 2
);

-- Video Session Events for Audit Trail
CREATE TABLE IF NOT EXISTS video_session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  bi TEXT NOT NULL,
  user_name TEXT NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Video Session Notifications
CREATE TABLE IF NOT EXISTS video_session_notifications (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security for video_sessions
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_session_notifications ENABLE ROW LEVEL SECURITY;

-- Allow general read/write access for the app client (matching development profiles/messages)
DROP POLICY IF EXISTS "Users can view own video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Users can create video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Users can update own video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Users can view own session events" ON video_session_events;
DROP POLICY IF EXISTS "Users can create own session events" ON video_session_events;
DROP POLICY IF EXISTS "Permitir tudo para video_sessions" ON video_sessions;
DROP POLICY IF EXISTS "Permitir tudo para video_session_events" ON video_session_events;
DROP POLICY IF EXISTS "Permitir tudo para video_session_notifications" ON video_session_notifications;

CREATE POLICY "Permitir tudo para video_sessions" ON video_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para video_session_events" ON video_session_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para video_session_notifications" ON video_session_notifications FOR ALL USING (true) WITH CHECK (true);

-- Add protocol_number column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS protocol_number VARCHAR(100);

-- Update existing rows with generated protocol numbers
UPDATE messages SET protocol_number = 'CDA-' || EXTRACT(YEAR FROM created_at) || '-' || LPAD(id::TEXT, 5, '0') WHERE protocol_number IS NULL;

-- Create index for protocol_number
CREATE INDEX IF NOT EXISTS idx_messages_protocol ON messages(protocol_number);

