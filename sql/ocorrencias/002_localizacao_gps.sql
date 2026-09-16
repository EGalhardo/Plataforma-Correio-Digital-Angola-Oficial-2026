-- CDA — Ocorrências: localização automática (GPS) — migração 002
-- Executar integralmente no SQL Editor do projecto Supabase do CDA.
-- Migração aditiva e transaccional. Não altera os fluxos existentes:
-- ocorrências anteriores mantêm tipo_localizacao NULL (tratadas como "manual")
-- e o RPC antigo continua a funcionar para elas. A nova versão do RPC passa a
-- guardar, quando presentes, o modo de localização e as coordenadas GPS.
BEGIN;

ALTER TABLE public.cda_ocorrencias
  ADD COLUMN IF NOT EXISTS tipo_localizacao text
    CHECK (tipo_localizacao IN ('manual','automatica')),
  ADD COLUMN IF NOT EXISTS lat double precision
    CHECK (lat BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS lon double precision
    CHECK (lon BETWEEN -180 AND 180),
  ADD COLUMN IF NOT EXISTS precisao_m double precision
    CHECK (precisao_m > 0 AND precisao_m <= 10000);

-- Recria o RPC de criação com os campos aditivos (corpo idêntico ao da
-- migração 001, excepto a validação e o INSERT das colunas de GPS).
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
  tipo_loc text := btrim(coalesce(p_dados->>'tipo_localizacao',''));
  latv double precision;
  lonv double precision;
  precv double precision;
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
  -- Localização (aditivo): 'automatica' exige coordenadas válidas; vazio =
  -- 'manual' (comportamento da migração 001).
  IF tipo_loc IS NULL OR tipo_loc = '' THEN tipo_loc := 'manual'; END IF;
  IF tipo_loc NOT IN ('manual','automatica') THEN
    RAISE EXCEPTION 'Tipo de localização inválido.' USING ERRCODE = '22023';
  END IF;
  IF tipo_loc = 'automatica' THEN
    BEGIN
      latv := (p_dados->>'lat')::double precision;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Localização automática sem latitude válida.' USING ERRCODE = '22023';
    END;
    BEGIN
      lonv := (p_dados->>'lon')::double precision;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Localização automática sem longitude válida.' USING ERRCODE = '22023';
    END;
    IF latv IS NULL OR latv NOT BETWEEN -90 AND 90 THEN
      RAISE EXCEPTION 'Latitude fora do intervalo válido.' USING ERRCODE = '22023';
    END IF;
    IF lonv IS NULL OR lonv NOT BETWEEN -180 AND 180 THEN
      RAISE EXCEPTION 'Longitude fora do intervalo válido.' USING ERRCODE = '22023';
    END IF;
    precv := coalesce((p_dados->>'precisao_m')::double precision, 25);
    IF precv IS NULL OR precv <= 0 THEN precv := 25; END IF;
    IF precv > 10000 THEN precv := 10000; END IF;
  ELSE
    latv := NULL; lonv := NULL; precv := NULL;
  END IF;
  INSERT INTO public.cda_ocorrencias(
    cidadao_id, cidadao_bi, cidadao_nome, instituicao_codigo, instituicao_nome,
    categoria, titulo, descricao, provincia, municipio, bairro, rua, referencia,
    pedido_id, tipo_localizacao, lat, lon, precisao_m
  ) VALUES (
    actor, p_actor->>'identificador', p_actor->>'nome', upper(btrim(p_dados->>'instituicao_codigo')), nome_inst,
    p_dados->>'categoria', btrim(p_dados->>'titulo'), btrim(p_dados->>'descricao'),
    btrim(p_dados->>'provincia'), btrim(p_dados->>'municipio'), btrim(p_dados->>'bairro'),
    btrim(coalesce(p_dados->>'rua','')), btrim(p_dados->>'referencia'), p_pedido,
    tipo_loc, latv, lonv, precv
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

REVOKE ALL ON FUNCTION public.cda_ocorrencias_criar(jsonb,jsonb,uuid[],uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cda_ocorrencias_criar(jsonb,jsonb,uuid[],uuid)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Resultado esperado: quatro colunas novas em cda_ocorrencias.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cda_ocorrencias'
  AND column_name IN ('tipo_localizacao','lat','lon','precisao_m')
ORDER BY column_name;
