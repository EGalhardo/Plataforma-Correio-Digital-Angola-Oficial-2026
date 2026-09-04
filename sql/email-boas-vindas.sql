-- ============================================================
-- EMAIL AUTOMÁTICO DE BOAS-VINDAS - CORREIO DIGITAL ANGOLA
-- Versão corrigida para pg_net 0.20.3
-- ============================================================
-- REQUISITOS:
-- 1. Extensão pg_net activada (Database → Extensions)
-- 2. API key do Resend válida
-- ============================================================

-- ============================================================
-- 1. Função para enviar email de boas-vindas via Resend API
-- ============================================================
CREATE OR REPLACE FUNCTION public.enviar_email_boas_vindas(
  p_email TEXT,
  p_nome TEXT,
  p_api_key TEXT DEFAULT ''  -- API key Resend (configurar via variável de ambiente ou chamada)
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id BIGINT;
  v_html_content TEXT;
  v_body JSONB;
BEGIN
  -- Validar email
  IF p_email IS NULL OR p_email = '' THEN
    RETURN 'erro: email vazio';
  END IF;
  
  -- Construir conteúdo HTML do email
  v_html_content := '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0c2340 0%, #1a4a8a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .welcome-box { background: #f0f4f9; border-left: 4px solid #0c2340; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .btn { display: inline-block; background: #0c2340; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none; }
    .features { margin: 20px 0; }
    .feature-item { padding: 10px 0; border-bottom: 1px solid #eee; }
    .feature-item:last-child { border-bottom: none; }
    .emoji { font-size: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Correio Digital Angola</h1>
      <p>Plataforma Oficial de Comunicação Governamental</p>
    </div>
    <div class="content">
      <h2>Bem-vindo(a) à plataforma!</h2>
      <p>Olá <strong>' || COALESCE(p_nome, 'Utilizador') || '</strong>,</p>
      <p>O seu registo na plataforma <strong>Correio Digital Angola</strong> foi concluído com sucesso!</p>
      
      <div class="welcome-box">
        <strong>A sua conta está activa e pronta a usar.</strong><br>
        Já pode aceder a todas as funcionalidades da plataforma.
      </div>
      
      <h3>O que pode fazer agora:</h3>
      <div class="features">
        <div class="feature-item">Enviar e receber comunicações oficiais</div>
        <div class="feature-item">Gerir documentos digitais com protocolo</div>
        <div class="feature-item">Usar o assistente de IA integrado</div>
        <div class="feature-item">Participar em videoconferências seguras</div>
        <div class="feature-item">Receber notificações em tempo real</div>
      </div>
      
      <p style="text-align: center;">
        <a href="https://correio-digital-angola-oficial-2026.vercel.app" class="btn">Aceder à Plataforma</a>
      </p>
      
      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        Se não reconhece este registo, ignore este email. A sua conta não será afectada.
      </p>
    </div>
    <div class="footer">
      <p><strong>Correio Digital Angola</strong><br>
      República de Angola — Plataforma Oficial</p>
      <p style="font-size: 11px;">Este é um email automático. Por favor não responda.</p>
    </div>
  </div>
</body>
</html>';

  -- Construir body do request
  v_body := jsonb_build_object(
    'from', 'onboarding@resend.dev',
    'to', p_email,
    'subject', 'Bem-vindo(a) ao Correio Digital Angola!',
    'html', v_html_content
  );

  -- Enviar via pg_net (assíncrono — retorna request_id)
  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || p_api_key,
      'Content-Type', 'application/json'
    ),
    body := v_body
  ) INTO v_request_id;

  IF v_request_id IS NOT NULL THEN
    RETURN 'sucesso: request_id=' || v_request_id || ' email=' || p_email;
  ELSE
    RETURN 'erro: request_id nulo';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN 'excepcao: ' || SQLERRM;
END;
$$;

-- ============================================================
-- 2. Trigger: disparar email após INSERT em profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_enviar_boas_vindas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Só enviar se houver email válido e não for conta de sistema
  IF NEW.email IS NOT NULL 
     AND NEW.email != ''
     AND NEW.email NOT LIKE '%@inst.correiodigital.ao'  -- excluir contas de agentes internos
     AND NEW.role != 'system' THEN
    
    -- Enviar email de forma assíncrona (não bloqueia a transacção)
    PERFORM public.enviar_email_boas_vindas(
      p_email := NEW.email,
      p_nome := COALESCE(NEW.name, 'Utilizador')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Criar o trigger na tabela profiles
-- ============================================================
-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trg_profiles_boas_vindas ON public.profiles;

-- Criar trigger AFTER INSERT
CREATE TRIGGER trg_profiles_boas_vindas
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_enviar_boas_vindas();

-- ============================================================
-- CONCLUÍDO!
-- ============================================================
-- Sempre que um novo perfil for criado com email válido,
-- um email de boas-vindas será enviado automaticamente.
--
-- Para verificar emails enviados: https://resend.com/emails
-- ============================================================
