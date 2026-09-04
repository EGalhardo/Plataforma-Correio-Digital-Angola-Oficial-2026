-- ============================================================
-- EMAIL DE NOTIFICAÇÃO DE APROVAÇÃO - CORREIO DIGITAL ANGOLA
-- ============================================================
-- Trigger UPDATE: dispara quando status muda para "Aprovado"
-- Envia email de notificação ao utilizador
-- ============================================================

-- ============================================================
-- 1. Função para enviar email de aprovação via Resend API
-- ============================================================
CREATE OR REPLACE FUNCTION public.enviar_email_aprovacao(
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
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none; }
    .info-box { background: #f0f4f9; border-left: 4px solid #0c2340; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Correio Digital Angola</h1>
      <p>Plataforma Oficial de Comunicação Governamental</p>
    </div>
    <div class="content">
      <h2>Registo Aprovado!</h2>
      <p>Olá <strong>' || COALESCE(p_nome, 'Utilizador') || '</strong>,</p>
      <p>Temos boas notícias! O seu registo na plataforma <strong>Correio Digital Angola</strong> foi <strong>aprovado</strong>.</p>
      
      <div class="success-box">
        <strong>A sua conta está activa e pronta a usar!</strong><br>
        Já pode fazer login e aceder a todas as funcionalidades da plataforma.
      </div>
      
      <div class="info-box">
        <strong>Informações de acesso:</strong><br>
        Email: ' || p_email || '<br>
        Plataforma: https://correio-digital-angola-oficial-2026.vercel.app
      </div>
      
      <h3>Próximos passos:</h3>
      <ul>
        <li>Faça login com o seu email e senha</li>
        <li>Complete o seu perfil institucional</li>
        <li>Explore as funcionalidades da plataforma</li>
      </ul>
      
      <p style="text-align: center;">
        <a href="https://correio-digital-angola-oficial-2026.vercel.app" class="btn">Aceder à Plataforma →</a>
      </p>
      
      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        Se não solicitou este registo, contacte imediatamente a administração da plataforma.
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
    'subject', 'Registo Aprovado — Correio Digital Angola',
    'html', v_html_content
  );

  -- Enviar via pg_net (assíncrono)
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
-- 2. Trigger UPDATE: disparar quando status muda para "Aprovado"
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_enviar_aprovacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Só enviar se:
  -- 1. O status anterior NÃO era "Aprovado"
  -- 2. O novo status É "Aprovado"
  -- 3. Há email válido
  -- 4. Não é conta interna de agente
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'Aprovado'
     AND NEW.email IS NOT NULL
     AND NEW.email != ''
     AND NEW.email NOT LIKE '%@inst.correiodigital.ao' THEN
    
    -- Enviar email de aprovação
    PERFORM public.enviar_email_aprovacao(
      p_email := NEW.email,
      p_nome := COALESCE(NEW.nome, 'Utilizador')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Criar o trigger na tabela solicitacoes_registo
-- ============================================================
-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trg_solicitacoes_aprovacao ON public.solicitacoes_registo;

-- Criar trigger AFTER UPDATE
CREATE TRIGGER trg_solicitacoes_aprovacao
AFTER UPDATE ON public.solicitacoes_registo
FOR EACH ROW
EXECUTE FUNCTION public.trg_enviar_aprovacao();

-- ============================================================
-- CONCLUÍDO!
-- ============================================================
-- Agora, quando um admin aprova uma solicitação (muda status para "Aprovado"),
-- o utilizador recebe automaticamente um email de notificação.
--
-- Para verificar emails enviados: https://resend.com/emails
-- ============================================================
