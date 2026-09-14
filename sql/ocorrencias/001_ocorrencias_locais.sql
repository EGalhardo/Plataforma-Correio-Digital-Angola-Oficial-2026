-- CDA — Ocorrências Locais / Ocorrências recebidas
-- Executar integralmente no SQL Editor do projecto Supabase do CDA.
-- Migração aditiva e transaccional. Não altera Correspondência, Contactos ou Auth.
-- As funções de escrita são exclusivas do backend (service_role).
-- O backend tem de verificar o token Auth e construir p_actor; nunca receber
-- identidade/papel/instituição directamente do formulário do utilizador.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cda_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  cidadao_id uuid NOT NULL REFERENCES auth.users(id),
  cidadao_bi text NOT NULL CHECK (char_length(cidadao_bi) BETWEEN 3 AND 30),
  cidadao_nome text NOT NULL CHECK (char_length(cidadao_nome) BETWEEN 1 AND 160),
  instituicao_codigo text NOT NULL,
  instituicao_nome text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('Iluminação pública','Estradas e vias','Água','Saneamento','Resíduos','Infraestruturas públicas','Árvores e espaços verdes','Outra')),
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 5 AND 160),
  descricao text NOT NULL CHECK (char_length(btrim(descricao)) BETWEEN 10 AND 5000),
  provincia text NOT NULL CHECK (char_length(btrim(provincia)) BETWEEN 2 AND 100),
  municipio text NOT NULL CHECK (char_length(btrim(municipio)) BETWEEN 2 AND 100),
  bairro text NOT NULL CHECK (char_length(btrim(bairro)) BETWEEN 2 AND 160),
  rua text NOT NULL DEFAULT '' CHECK (char_length(rua) <= 180),
  referencia text NOT NULL CHECK (char_length(btrim(referencia)) BETWEEN 3 AND 500),
  estado text NOT NULL DEFAULT 'submetida' CHECK (estado IN ('submetida','recebida','em_analise','encaminhada','em_resolucao','aguarda_informacao','resolvida','encerrada','reabertura_solicitada')),
  responsavel text CHECK (char_length(responsavel) <= 160),
  versao integer NOT NULL DEFAULT 1 CHECK (versao > 0),
  pedido_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cidadao_id, pedido_id)
);

CREATE INDEX IF NOT EXISTS cda_ocorrencias_cidadao_idx ON public.cda_ocorrencias(cidadao_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS cda_ocorrencias_instituicao_idx ON public.cda_ocorrencias(instituicao_codigo, estado, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.cda_ocorrencias_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  ocorrencia_id uuid NOT NULL REFERENCES public.cda_ocorrencias(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  actor_papel text NOT NULL CHECK (actor_papel IN ('cidadao','instituicao')),
  actor_nome text NOT NULL,
  actor_instituicao text,
  acao text NOT NULL,
  estado_anterior text,
  estado_novo text NOT NULL,
  descricao text NOT NULL CHECK (char_length(descricao) BETWEEN 1 AND 5000),
  destino_codigo text,
  pedido_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, pedido_id)
);
CREATE INDEX IF NOT EXISTS cda_ocorrencias_eventos_lista_idx ON public.cda_ocorrencias_eventos(ocorrencia_id, ordem);

CREATE TABLE IF NOT EXISTS public.cda_ocorrencias_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid REFERENCES public.cda_ocorrencias(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES auth.users(id),
  caminho text NOT NULL UNIQUE,
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 180),
  mime text NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')),
  tamanho integer NOT NULL CHECK (tamanho > 0 AND tamanho <= 3145728),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cda_ocorrencias_fotos_ocorrencia_idx ON public.cda_ocorrencias_fotos(ocorrencia_id);
CREATE INDEX IF NOT EXISTS cda_ocorrencias_fotos_temporarias_idx ON public.cda_ocorrencias_fotos(autor_id, criado_em) WHERE ocorrencia_id IS NULL;

CREATE TABLE IF NOT EXISTS public.cda_ocorrencias_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL REFERENCES public.cda_ocorrencias(id) ON DELETE CASCADE,
  evento_id uuid NOT NULL REFERENCES public.cda_ocorrencias_eventos(id) ON DELETE CASCADE,
  destinatario_tipo text NOT NULL CHECK (destinatario_tipo IN ('cidadao','instituicao')),
  destinatario_chave text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, destinatario_tipo, destinatario_chave)
);
CREATE INDEX IF NOT EXISTS cda_ocorrencias_notificacoes_destino_idx ON public.cda_ocorrencias_notificacoes(destinatario_tipo, destinatario_chave, criado_em DESC);

-- Leitura por pessoa: um colaborador não marca as notificações dos restantes.
CREATE TABLE IF NOT EXISTS public.cda_ocorrencias_leituras (
  notificacao_id uuid NOT NULL REFERENCES public.cda_ocorrencias_notificacoes(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  lida_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notificacao_id, actor_id)
);

ALTER TABLE public.cda_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cda_ocorrencias_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cda_ocorrencias_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cda_ocorrencias_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cda_ocorrencias_leituras ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cda_ocorrencias, public.cda_ocorrencias_eventos,
  public.cda_ocorrencias_fotos, public.cda_ocorrencias_notificacoes,
  public.cda_ocorrencias_leituras FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.cda_ocorrencias, public.cda_ocorrencias_eventos,
  public.cda_ocorrencias_fotos, public.cda_ocorrencias_notificacoes,
  public.cda_ocorrencias_leituras TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.cda_ocorrencias_numero_seq,
  public.cda_ocorrencias_eventos_ordem_seq TO service_role;

-- Só registos institucionais formalmente aprovados podem ser destinatários.
-- A escolha do cidadão é manual; aprovação não certifica competência territorial.
CREATE OR REPLACE FUNCTION public.cda_ocorrencias_instituicao_habilitada(p_codigo text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.nome FROM public.solicitacoes_registo r
  WHERE upper(btrim(r.bi_numero)) = upper(btrim(p_codigo))
    AND position('[INST:' IN coalesce(r.observacoes, '')) > 0
    AND upper(btrim(r.status)) IN ('APROVADO','APROVADA','ATIVO','ATIVA','ACTIVE','APPROVED')
  ORDER BY r.criado_em DESC LIMIT 1;
$$;

-- Uma única transacção grava a ocorrência, vincula as fotografias, cria o
-- histórico inicial e notifica a instituição. Retries não duplicam o registo.
CREATE OR REPLACE FUNCTION public.cda_ocorrencias_criar(
  p_actor jsonb, p_dados jsonb, p_fotos uuid[], p_pedido uuid
) RETURNS public.cda_ocorrencias
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v public.cda_ocorrencias;
  nome_inst text;
  eid uuid;
  quantidade integer;
  actor uuid := (p_actor->>'id')::uuid;
BEGIN
  IF p_actor->>'papel' IS DISTINCT FROM 'cidadao' OR actor IS NULL OR p_pedido IS NULL THEN
    RAISE EXCEPTION 'Apenas o cidadão autenticado pode criar ocorrências.' USING ERRCODE = '42501';
  END IF;
  -- Serializa a mesma chave de idempotência sem bloquear outros cidadãos.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || p_pedido::text, 0));
  SELECT * INTO v FROM public.cda_ocorrencias WHERE cidadao_id = actor AND pedido_id = p_pedido;
  IF FOUND THEN RETURN v; END IF;
  nome_inst := public.cda_ocorrencias_instituicao_habilitada(p_dados->>'instituicao_codigo');
  IF nome_inst IS NULL THEN
    RAISE EXCEPTION 'A instituição de destino não está habilitada.' USING ERRCODE = '22023';
  END IF;
  IF coalesce(cardinality(p_fotos), 0) > 5 THEN
    RAISE EXCEPTION 'Pode adicionar no máximo cinco fotografias.' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.cda_ocorrencias_fotos WHERE id = ANY(coalesce(p_fotos, ARRAY[]::uuid[])) FOR UPDATE;
  SELECT count(*) INTO quantidade FROM public.cda_ocorrencias_fotos
    WHERE id = ANY(coalesce(p_fotos, ARRAY[]::uuid[])) AND autor_id = actor
      AND ocorrencia_id IS NULL AND criado_em > now() - interval '24 hours';
  IF quantidade <> coalesce(cardinality(p_fotos), 0) THEN
    RAISE EXCEPTION 'Fotografia inválida, duplicada, expirada ou pertencente a outra conta.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.cda_ocorrencias(
    cidadao_id, cidadao_bi, cidadao_nome, instituicao_codigo, instituicao_nome,
    categoria, titulo, descricao, provincia, municipio, bairro, rua, referencia, pedido_id
  ) VALUES (
    actor, p_actor->>'identificador', p_actor->>'nome', upper(btrim(p_dados->>'instituicao_codigo')), nome_inst,
    p_dados->>'categoria', btrim(p_dados->>'titulo'), btrim(p_dados->>'descricao'),
    btrim(p_dados->>'provincia'), btrim(p_dados->>'municipio'), btrim(p_dados->>'bairro'),
    btrim(coalesce(p_dados->>'rua','')), btrim(p_dados->>'referencia'), p_pedido
  ) RETURNING * INTO v;
  UPDATE public.cda_ocorrencias_fotos SET ocorrencia_id = v.id
    WHERE id = ANY(coalesce(p_fotos, ARRAY[]::uuid[]));
  INSERT INTO public.cda_ocorrencias_eventos(ocorrencia_id, actor_id, actor_papel, actor_nome,
    acao, estado_novo, descricao, pedido_id)
  VALUES(v.id, actor, 'cidadao', p_actor->>'nome', 'submeter', 'submetida',
    'Ocorrência submetida no CDA. Aguarda confirmação de recepção pela instituição.', p_pedido)
  RETURNING id INTO eid;
  INSERT INTO public.cda_ocorrencias_notificacoes(ocorrencia_id, evento_id, destinatario_tipo,
    destinatario_chave, titulo, mensagem)
  VALUES(v.id, eid, 'instituicao', v.instituicao_codigo, 'Nova ocorrência submetida', v.titulo);
  RETURN v;
END;
$$;

-- Transições e mensagens auditadas, com bloqueio da linha e controlo de versão.
CREATE OR REPLACE FUNCTION public.cda_ocorrencias_actuar(
  p_actor jsonb, p_id uuid, p_versao integer, p_acao text, p_dados jsonb, p_pedido uuid
) RETURNS public.cda_ocorrencias
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v public.cda_ocorrencias;
  actor uuid := (p_actor->>'id')::uuid;
  instituicao text := upper(btrim(coalesce(p_actor->>'instituicao','')));
  papel text := p_actor->>'papel';
  nota text := btrim(coalesce(p_dados->>'descricao',''));
  anterior text;
  novo text;
  eid uuid;
  novo_destino text;
  nome_destino text;
  assunto text;
BEGIN
  IF actor IS NULL OR p_pedido IS NULL OR papel NOT IN ('cidadao','instituicao') OR papel IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v FROM public.cda_ocorrencias WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'P0002'; END IF;
  IF (papel = 'cidadao' AND v.cidadao_id <> actor)
    OR (papel = 'instituicao' AND (v.instituicao_codigo <> instituicao
      OR public.cda_ocorrencias_instituicao_habilitada(instituicao) IS NULL)) THEN
    RAISE EXCEPTION 'Sem acesso a esta ocorrência.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cda_ocorrencias_eventos
    WHERE ocorrencia_id = p_id AND actor_id = actor AND pedido_id = p_pedido) THEN RETURN v; END IF;
  IF p_versao IS DISTINCT FROM v.versao THEN
    RAISE EXCEPTION 'A ocorrência foi actualizada por outro utilizador. Recarregue antes de continuar.' USING ERRCODE = '40001';
  END IF;
  anterior := v.estado; novo := v.estado;
  IF papel = 'cidadao' THEN
    CASE p_acao
      WHEN 'esclarecer' THEN
        IF v.estado NOT IN ('recebida','em_analise','em_resolucao','aguarda_informacao','encaminhada','reabertura_solicitada') THEN
          RAISE EXCEPTION 'Não é possível acrescentar esclarecimentos neste estado.' USING ERRCODE = '22023';
        END IF;
        assunto := 'Esclarecimento do cidadão';
      WHEN 'confirmar_resolucao' THEN
        IF v.estado <> 'resolvida' THEN RAISE EXCEPTION 'A ocorrência ainda não foi marcada como resolvida.' USING ERRCODE = '22023'; END IF;
        novo := 'encerrada'; nota := 'O cidadão confirmou a resolução da ocorrência.'; assunto := 'Resolução confirmada pelo cidadão';
      WHEN 'solicitar_reabertura' THEN
        IF v.estado NOT IN ('resolvida','encerrada') THEN RAISE EXCEPTION 'A reabertura só pode ser solicitada após resolução ou encerramento.' USING ERRCODE = '22023'; END IF;
        novo := 'reabertura_solicitada'; assunto := 'Reabertura solicitada';
      ELSE RAISE EXCEPTION 'Acção não permitida ao cidadão.' USING ERRCODE = '42501';
    END CASE;
  ELSE
    CASE p_acao
      WHEN 'receber' THEN
        IF v.estado NOT IN ('submetida','encaminhada') THEN RAISE EXCEPTION 'A recepção já foi confirmada.' USING ERRCODE = '22023'; END IF;
        novo := 'recebida'; nota := 'A instituição confirmou a recepção da ocorrência.'; assunto := 'Recepção confirmada';
      WHEN 'analisar' THEN
        IF v.estado NOT IN ('recebida','aguarda_informacao','reabertura_solicitada') THEN RAISE EXCEPTION 'Transição para análise não permitida.' USING ERRCODE = '22023'; END IF;
        novo := 'em_analise'; assunto := 'Ocorrência em análise';
      WHEN 'iniciar_resolucao' THEN
        IF v.estado <> 'em_analise' THEN RAISE EXCEPTION 'É necessário analisar a ocorrência antes de iniciar a resolução.' USING ERRCODE = '22023'; END IF;
        novo := 'em_resolucao'; assunto := 'Resolução iniciada';
      WHEN 'pedir_esclarecimento' THEN
        IF v.estado NOT IN ('recebida','em_analise','em_resolucao') THEN RAISE EXCEPTION 'Pedido de esclarecimento não permitido neste estado.' USING ERRCODE = '22023'; END IF;
        novo := 'aguarda_informacao'; assunto := 'Informação solicitada ao cidadão';
      WHEN 'resolver' THEN
        IF v.estado <> 'em_resolucao' THEN RAISE EXCEPTION 'A resolução ainda não foi iniciada.' USING ERRCODE = '22023'; END IF;
        novo := 'resolvida'; assunto := 'Ocorrência marcada como resolvida';
      WHEN 'encerrar' THEN
        IF v.estado NOT IN ('em_analise','em_resolucao','reabertura_solicitada') THEN RAISE EXCEPTION 'Encerramento não permitido neste estado.' USING ERRCODE = '22023'; END IF;
        novo := 'encerrada'; assunto := 'Ocorrência encerrada com justificação';
      WHEN 'atribuir' THEN
        IF v.estado IN ('resolvida','encerrada') THEN RAISE EXCEPTION 'A ocorrência já está concluída.' USING ERRCODE = '22023'; END IF;
        v.responsavel := btrim(p_dados->>'responsavel');
        IF v.responsavel IS NULL OR char_length(v.responsavel) NOT BETWEEN 2 AND 160 THEN
          RAISE EXCEPTION 'Indique o responsável ou a equipa de tratamento.' USING ERRCODE = '22023';
        END IF;
        nota := 'Responsável / equipa de tratamento: ' || v.responsavel; assunto := 'Responsável atribuído';
      WHEN 'encaminhar' THEN
        IF v.estado NOT IN ('recebida','em_analise','em_resolucao','aguarda_informacao','reabertura_solicitada') THEN
          RAISE EXCEPTION 'Encaminhamento não permitido neste estado.' USING ERRCODE = '22023';
        END IF;
        novo_destino := upper(btrim(p_dados->>'instituicao_codigo'));
        nome_destino := public.cda_ocorrencias_instituicao_habilitada(novo_destino);
        IF nome_destino IS NULL OR novo_destino = v.instituicao_codigo THEN
          RAISE EXCEPTION 'Escolha outra instituição habilitada.' USING ERRCODE = '22023';
        END IF;
        v.instituicao_codigo := novo_destino; v.instituicao_nome := nome_destino;
        v.responsavel := NULL; novo := 'encaminhada'; assunto := 'Ocorrência encaminhada';
      ELSE RAISE EXCEPTION 'Acção institucional desconhecida.' USING ERRCODE = '22023';
    END CASE;
  END IF;
  IF char_length(nota) NOT BETWEEN 5 AND 5000 THEN
    RAISE EXCEPTION 'Escreva uma descrição ou justificação entre 5 e 5000 caracteres.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.cda_ocorrencias SET estado = novo, responsavel = v.responsavel,
    instituicao_codigo = v.instituicao_codigo, instituicao_nome = v.instituicao_nome,
    versao = versao + 1, actualizado_em = now() WHERE id = p_id RETURNING * INTO v;
  INSERT INTO public.cda_ocorrencias_eventos(ocorrencia_id, actor_id, actor_papel, actor_nome,
    actor_instituicao, acao, estado_anterior, estado_novo, descricao, destino_codigo, pedido_id)
  VALUES(p_id, actor, papel, p_actor->>'nome', nullif(instituicao,''), p_acao, anterior, novo, nota, novo_destino, p_pedido)
  RETURNING id INTO eid;
  IF papel = 'instituicao' THEN
    INSERT INTO public.cda_ocorrencias_notificacoes(ocorrencia_id, evento_id, destinatario_tipo, destinatario_chave, titulo, mensagem)
    VALUES(p_id, eid, 'cidadao', v.cidadao_id::text, assunto, nota);
  END IF;
  IF papel = 'cidadao' OR p_acao = 'encaminhar' THEN
    INSERT INTO public.cda_ocorrencias_notificacoes(ocorrencia_id, evento_id, destinatario_tipo, destinatario_chave, titulo, mensagem)
    VALUES(p_id, eid, 'instituicao', v.instituicao_codigo, assunto, nota);
  END IF;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.cda_ocorrencias_instituicao_habilitada(text),
  public.cda_ocorrencias_criar(jsonb,jsonb,uuid[],uuid),
  public.cda_ocorrencias_actuar(jsonb,uuid,integer,text,jsonb,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cda_ocorrencias_instituicao_habilitada(text),
  public.cda_ocorrencias_criar(jsonb,jsonb,uuid[],uuid),
  public.cda_ocorrencias_actuar(jsonb,uuid,integer,text,jsonb,uuid)
  TO service_role;

-- Fotografias privadas: upload validado e URLs temporários emitidos pelo backend.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cda-ocorrencias','cda-ocorrencias',false,3145728,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Neutraliza eventuais políticas permissivas antigas apenas neste novo bucket.
DROP POLICY IF EXISTS cda_ocorrencias_fotos_protegidas ON storage.objects;
CREATE POLICY cda_ocorrencias_fotos_protegidas ON storage.objects AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING (bucket_id <> 'cda-ocorrencias') WITH CHECK (bucket_id <> 'cda-ocorrencias');

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Resultado esperado: cinco linhas com rls_activo=true.
SELECT c.relname AS tabela, c.relrowsecurity AS rls_activo
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN (
  'cda_ocorrencias','cda_ocorrencias_eventos','cda_ocorrencias_fotos',
  'cda_ocorrencias_notificacoes','cda_ocorrencias_leituras'
) ORDER BY c.relname;
