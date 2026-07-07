-- ============================================================================
-- SUPABASE STORAGE SETUP - CORREIO DIGITAL ANGOLA (CDA)
-- ============================================================================
-- Este script configura os buckets de armazenamento necessários para o CDA:
-- 1. `documentos_registo`: Para guardar fotos de BI (Frente/Verso) e Selfies de registo.
-- 2. `correspondencias_anexos`: Para guardar os ficheiros anexados às correspondências.
-- ============================================================================

-- 1. CRIAR OS BUCKETS CASO NÃO EXISTAM
-- Os buckets são definidos como públicos (public = true) para permitir a obtenção das URLs públicas dos ficheiros anexados.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documentos_registo', 'documentos_registo', true, 5242880, '{"image/jpeg", "image/png", "image/webp", "application/pdf"}'),
  ('correspondencias_anexos', 'correspondencias_anexos', true, 10485760, '{"image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}'),
  ('fotos_perfil', 'fotos_perfil', true, 5242880, '{"image/jpeg", "image/png", "image/webp"}')
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. REMOVER POLÍTICAS EXISTENTES PARA EVITAR DUPLICADOS
DROP POLICY IF EXISTS "Permitir leitura pública em documentos_registo" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload/modificação em documentos_registo" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública em correspondencias_anexos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload/modificação em correspondencias_anexos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública em fotos_perfil" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload/modificação em fotos_perfil" ON storage.objects;

-- 3. CRIAR POLÍTICAS DE ACESSO PARA `documentos_registo`
-- Permite leitura pública de qualquer ficheiro dentro de documentos_registo
CREATE POLICY "Permitir leitura pública em documentos_registo"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos_registo');

-- Permite operações de inserção, atualização e eliminação
CREATE POLICY "Permitir upload/modificação em documentos_registo"
ON storage.objects FOR ALL
USING (bucket_id = 'documentos_registo')
WITH CHECK (bucket_id = 'documentos_registo');

-- 4. CRIAR POLÍTICAS DE ACESSO PARA `correspondencias_anexos`
-- Permite leitura pública dos anexos carregados
CREATE POLICY "Permitir leitura pública em correspondencias_anexos"
ON storage.objects FOR SELECT
USING (bucket_id = 'correspondencias_anexos');

-- Permite inserção e controle total dos anexos
CREATE POLICY "Permitir upload/modificação em correspondencias_anexos"
ON storage.objects FOR ALL
USING (bucket_id = 'correspondencias_anexos')
WITH CHECK (bucket_id = 'correspondencias_anexos');

-- 5. CRIAR POLÍTICAS DE ACESSO PARA `fotos_perfil`
-- Permite leitura pública das fotos de perfil
CREATE POLICY "Permitir leitura pública em fotos_perfil"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos_perfil');

-- Permite inserção e controle total das fotos de perfil
CREATE POLICY "Permitir upload/modificação em fotos_perfil"
ON storage.objects FOR ALL
USING (bucket_id = 'fotos_perfil')
WITH CHECK (bucket_id = 'fotos_perfil');
