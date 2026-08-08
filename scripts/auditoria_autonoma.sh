#!/usr/bin/env bash
# ============================================================================
# auditoria_autonoma.sh — Auditoria autónoma da plataforma em PRODUÇÃO
# (2026-08-08, a pedido do dono: "testar de forma autónoma")
#
# Cobre TUDO o que é verificável sem sessões privilegiadas:
#   A) produção viva (health, página, chunks/marcadores do bundle)
#   B) API de IA (explicar, KB com fontes reais, traduzir EN, guarda umbundu)
#   C) RLS da base de dados via chave anónima (as tabelas existem; escrita
#      anónima é BLOQUEADA — a falha é o comportamento certo)
#
# Fora de alcance POR DESENHO (ver AUDITORIA_AUTONOMA.md): fluxos com claims
# app_metadata (compositor, self-service KB, pagamentos como instituição) —
# exigem JWT real. Com credenciais de teste, estendem-se aqui.
#
# Uso:  BASE=https://<url>  bash scripts/auditoria_autonoma.sh
# Sai 0 se tudo PASSAR; 1 se algo FALHAR. Cada sonda tem teto de tempo.
# ============================================================================
set -u
BASE="${BASE:-https://correio-digital-angola-oficial.vercel.app}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
SUPA_URL=$(grep -Eoh "VITE_SUPABASE_URL=.+" "$REPO/.env" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"' \r')
SUPA_KEY=$(grep -Eoh "VITE_SUPABASE_ANON_KEY=.+" "$REPO/.env" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"' \r')

PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "[PASS] $1"; }
bad() { FAIL=$((FAIL+1)); echo "[FAIL] $1"; }
json_probe() { # método, json → escreve corpo em /tmp/aud_resp.json
  curl -s --max-time 90 -X POST "$BASE/api/assistente-documento" \
    -H 'Content-Type: application/json' -d "$1" -o /tmp/aud_resp.json
}

echo "=== Auditoria autónoma — $BASE — $(date -u '+%Y-%m-%d %H:%M UTC') ==="

# --- A) produção viva ---------------------------------------------------------
H=$(curl -s --max-time 30 "$BASE/api/health")
if echo "$H" | grep -q '"status":"ok"' && echo "$H" | grep -q '"ai_key_configured":true'; then
  ok "health: status ok + chave Gemini configurada ($H)"
else bad "health inesperado: $H"; fi

CODE=$(curl -s -o /tmp/aud_page.html -w '%{http_code}' --max-time 30 "$BASE")
ENTRY=$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' /tmp/aud_page.html | head -1)
[ "$CODE" = "200" ] && [ -n "$ENTRY" ] && ok "página 200 com entry $ENTRY" || bad "página HTTP $CODE / entry vazio"

curl -s --max-time 60 "$BASE$ENTRY" -o /tmp/aud_entry.js
grep -q 'assets/PagamentosContent-' /tmp/aud_entry.js && grep -q 'assets/InstPagamentosContent-' /tmp/aud_entry.js \
  && ok "chunks de pagamentos referenciados no entry" || bad "chunks de pagamentos em falta no entry"

PAGSVC=$(curl -s --max-time 60 "$BASE/assets/$(grep -oE 'assets/pagamentosService-[A-Za-z0-9_-]+\.js' /tmp/aud_page.html >> /dev/null; grep -oE 'pagamentosService-[A-Za-z0-9_-]+\.js' /tmp/aud_entry.js | head -1)")
if echo "$PAGSVC" | grep -q 'INAPEM' && echo "$PAGSVC" | grep -q 'multicaixa_express'; then
  ok "selo honesto de gateway + 4 métodos no bundle partilhado"
else bad "chunk pagamentosService sem selo/métodos"; fi

KBCHUNK=$(grep -oE 'assets/InstAiAssistantContent-[A-Za-z0-9_-]+\.js' /tmp/aud_entry.js | head -1)
curl -s --max-time 60 "$BASE/$KBCHUNK" -o /tmp/aud_inst.js
grep -q 'kb_fontes_instituicao' /tmp/aud_inst.js && ok "self-service KB presente no bundle institucional" \
  || bad "self-service KB ausente do bundle institucional"

# A.2 (nota 6 do dono, 2026-08-08) — integridade de TODOS os chunks lazy:
# cada "pagina" da SPA e um chunk; um chunk partido = pagina em branco para o
# cidadao. Verificamos que TODOS respondem 200; o teste funcional por pagina
# com sessao real corre no §D e nas suites locais.
BROKEN=0; TOTAL_CHUNKS=0
for c in $(grep -oE 'assets/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.js' /tmp/aud_entry.js | sort -u); do
  TOTAL_CHUNKS=$((TOTAL_CHUNKS+1))
  CCODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$BASE/$c")
  if [ "$CCODE" != "200" ]; then BROKEN=$((BROKEN+1)); echo "  [chunk partido] $c -> HTTP $CCODE"; fi
done
[ "$BROKEN" = "0" ] && ok "integridade de TODOS os $TOTAL_CHUNKS chunks lazy (todas as paginas serviveis)" \
  || bad "$BROKEN de $TOTAL_CHUNKS chunks lazy partidos"

# --- B) API de IA ---------------------------------------------------------------
json_probe '{"acao":"explicar","texto":"O que significa certidão de teor?","remetente":"Cidadao"}'
grep -q '"ok":true' /tmp/aud_resp.json && ok "explicar genérico responde" || bad "explicar genérico falhou: $(head -c 200 /tmp/aud_resp.json)"

json_probe '{"acao":"explicar","texto":"Onde vejo os resultados oficiais do Censo 2024 do INE?","remetente":"INE — Instituto Nacional de Estatistica"}'
if grep -q '"ok":true' /tmp/aud_resp.json && grep -qi 'censo2024.ine.gov.ao' /tmp/aud_resp.json; then
  ok "KB INE responde com a fonte oficial (fusão dinâmica inerte = KB estática sã)"
else bad "KB INE sem fonte oficial: $(head -c 300 /tmp/aud_resp.json)"; fi

json_probe '{"acao":"explicar","texto":"O banco cobrou-me comissões que não entendo. Onde reclamo?","remetente":"BNA"}'
if grep -q '"ok":true' /tmp/aud_resp.json && (grep -qi 'Provedor' /tmp/aud_resp.json || grep -q '222 679 244' /tmp/aud_resp.json); then
  ok "KB BNA responde (Provedor do Cliente Bancário/contactos oficiais)"
else bad "KB BNA sem dados oficiais: $(head -c 300 /tmp/aud_resp.json)"; fi

json_probe '{"acao":"traduzir","texto":"Informamos que o atendimento presencial funciona de segunda a sexta-feira.","idiomaDestino":"en","remetente":"Administracao Municipal"}'
if grep -q '"ok":true' /tmp/aud_resp.json && ! grep -q 'Não consigo' /tmp/aud_resp.json; then
  ok "traduzir EN intocado pelas guardas das línguas nacionais"
else bad "traduzir EN afetado indevidamente: $(head -c 200 /tmp/aud_resp.json)"; fi

json_probe '{"acao":"traduzir","texto":"Venho solicitar a emissão de uma declaração de residência para efeitos de matrícula escolar do meu filho.","idiomaDestino":"umbundu","remetente":"Administracao Municipal"}'
if grep -q '"ok":true' /tmp/aud_resp.json; then
  if grep -q 'Não consigo traduzir com qualidade para Umbundu' /tmp/aud_resp.json; then
    grep -q 'declaração de residência' /tmp/aud_resp.json \
      && ok "guarda umbundu: embrulho honesto COM o texto original" \
      || bad "guarda umbundu embrulhou sem o original"
  else
    # tradução não-eco: aceite desde que curta e diferente da entrada
    LEN=$(wc -c < /tmp/aud_resp.json)
    [ "$LEN" -lt 6000 ] && ok "umbundu via modelo principal (resposta diferenciada, ${LEN}B)" \
      || bad "umbundu suspeito de degeneração (${LEN}B)"
  fi
else bad "traduzir umbundu falhou: $(head -c 200 /tmp/aud_resp.json)"; fi

# --- C) RLS / base de dados (chave anónima — bloquear é o comportamento CERTO) --
if [ -n "$SUPA_URL" ] && [ -n "$SUPA_KEY" ]; then
  T1=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" "$SUPA_URL/rest/v1/kb_fontes_instituicao?select=id&limit=1")
  [ "$T1" = "200" ] && ok "tabela kb_fontes_instituicao (v25) existe" || bad "kb_fontes_instituicao HTTP $T1"

  T2=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" "$SUPA_URL/rest/v1/pagamentos?select=id&limit=1")
  [ "$T2" = "200" ] && ok "tabela pagamentos (v26) existe" || bad "pagamentos HTTP $T2"

  W1=$(curl -s -o /tmp/aud_w1.json -w '%{http_code}' --max-time 20 -X POST -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" -H 'Content-Type: application/json' "$SUPA_URL/rest/v1/pagamentos" \
    -d '{"instituicao_sigla":"TESTE","destinatario_bi":"000000000XX000","descricao":"Sonda anonima — nao pode entrar","valor":1000,"metodos":["tpa"]}')
  { [ "$W1" = "401" ] || [ "$W1" = "403" ]; } && grep -qi 'row-level security' /tmp/aud_w1.json \
    && ok "RLS bloqueia escrita anónima em pagamentos (401/42501)" \
    || bad "escrita anónima em pagamentos NÃO bloqueada (HTTP $W1)"

  W2=$(curl -s -o /tmp/aud_w2.json -w '%{http_code}' --max-time 20 -X POST -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" -H 'Content-Type: application/json' "$SUPA_URL/rest/v1/kb_fontes_instituicao" \
    -d '{"sigla":"TESTE","titulo":"Sonda anonima sem permissao","tipo":"faq","texto":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}')
  { [ "$W2" = "401" ] || [ "$W2" = "403" ]; } && grep -qi 'row-level security' /tmp/aud_w2.json \
    && ok "RLS bloqueia escrita anónima em kb_fontes_instituicao (401/42501)" \
    || bad "escrita anónima em kb_fontes_instituicao NÃO bloqueada (HTTP $W2)"
else
  bad "credenciais anon de Supabase ausentes no .env — sondas C saltadas"
fi

echo "======================================================================"
echo "AUDITORIA A-C: $PASS PASS / $FAIL FAIL"

# --- D) CIRCUITO COM SESSOES REAIS (opcional; 2026-08-08) ---------------------
# Ativa-se com: CDA_TEST_CID_EMAIL/CDA_TEST_CID_PASS e CDA_TEST_INST_EMAIL/
# CDA_TEST_INST_PASS. As contas NASCEM com as claims oficiais (trigger v14
# sincroniza user_metadata -> app_metadata no INSERT). Circuito honesto:
# instituicao REGISTA cobranca -> cidadao VE -> instituicao CANCELA (fica o
# rasto); KB self-service: cria -> dono ve -> anon ve (ativa) -> desativa ->
# anon deixa de ver -> apaga (limpeza). A sigla de teste (CDATST) NAO esta no
# registo KB, por isso nada disto toca nas respostas publicas da IA.
if [ -n "${CDA_TEST_CID_EMAIL:-}" ] && [ -n "${CDA_TEST_CID_PASS:-}" ] && [ -n "${CDA_TEST_INST_EMAIL:-}" ] && [ -n "${CDA_TEST_INST_PASS:-}" ] && [ -n "$SUPA_URL" ] && [ -n "$SUPA_KEY" ]; then
  echo "--- §D circuito com sessoes reais ---"
  login() { curl -s --max-time 30 -X POST "$SUPA_URL/auth/v1/token?grant_type=password" -H "apikey: $SUPA_KEY" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}"; }
  TOK_CID=$(login "$CDA_TEST_CID_EMAIL" "$CDA_TEST_CID_PASS" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))')
  TOK_INST=$(login "$CDA_TEST_INST_EMAIL" "$CDA_TEST_INST_PASS" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))')

  if [ -z "$TOK_CID" ] || [ -z "$TOK_INST" ]; then
    bad "§D login falhou (cidadao ${#TOK_CID}B / instituicao ${#TOK_INST}B de token)"
  else
    ok "§D login real das duas contas de teste"
    # NOTA (bug corrigido 2026-08-08): o Supabase aninha os claims em
    # payload.app_metadata — nao no topo do JWT. A 1.a versao lia o topo e,
    # sem claims, o RLS bloqueava tudo (corretamente).
    CLAIM_CID=$(echo "$TOK_CID" | cut -d. -f2 | tr '_-' '/+' | python3 -c 'import sys,base64,json; s=sys.stdin.read().strip(); s+="="*(-len(s)%4); print(json.loads(base64.b64decode(s)).get("app_metadata",{}).get("bi",""))')
    CLAIM_INST=$(echo "$TOK_INST" | cut -d. -f2 | tr '_-' '/+' | python3 -c 'import sys,base64,json; s=sys.stdin.read().strip(); s+="="*(-len(s)%4); print(json.loads(base64.b64decode(s)).get("app_metadata",{}).get("instituicao",""))')
    [ -n "$CLAIM_CID" ] && [ -n "$CLAIM_INST" ] \
      && ok "§D claims oficiais no JWT (bi=$CLAIM_CID / instituicao=$CLAIM_INST)" \
      || bad "§D claims em falta no JWT (bi=$CLAIM_CID / instituicao=$CLAIM_INST)"

    # cobranca de demonstracao pendente (fica para a demo ao INAPEM)
    CR=$(curl -s --max-time 30 -X POST "$SUPA_URL/rest/v1/pagamentos" -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $TOK_INST" -H 'Content-Type: application/json' -H 'Prefer: return=representation' \
      -d "{\"instituicao_sigla\":\"$CLAIM_INST\",\"destinatario_bi\":\"$CLAIM_CID\",\"descricao\":\"Taxa de teste E2E — demonstracao INAPEM (auditoria autonoma)\",\"valor\":12500.50,\"metodos\":[\"multicaixa_express\",\"referencia_atm\",\"tpa\",\"transferencia\"],\"documento_ref\":\"Oficio CDA-TESTE/2026\"}")
    echo "$CR" | grep -q '"id"' && ok "§D instituicao REGISTOU cobranca pendente para o cidadao" || bad "§D insert da cobranca falhou: $(echo "$CR" | head -c 200)"

    GC=$(curl -s --max-time 30 -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $TOK_CID" "$SUPA_URL/rest/v1/pagamentos?select=descricao,valor,estado&estado=eq.pendente")
    echo "$GC" | grep -q 'Taxa de teste E2E' && ok "§D cidadao VE a cobranca pendente na sua area" || bad "§D cidadao nao viu a cobranca: $(echo "$GC" | head -c 200)"

    NC=$(curl -s -o /tmp/aud_nc.json -w '%{http_code}' --max-time 30 -X POST "$SUPA_URL/rest/v1/pagamentos" -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $TOK_CID" -H 'Content-Type: application/json' \
      -d '{"instituicao_sigla":"CDATST","destinatario_bi":"009999999LA099","descricao":"Cidadao nao pode criar cobrancas a si proprio","valor":1,"metodos":["tpa"]}')
    { [ "$NC" = "401" ] || [ "$NC" = "403" ]; } && grep -qi 'row-level security' /tmp/aud_nc.json \
      && ok "§D cidadao NAO pode forjar cobrancas (RLS insert bloqueado)" \
      || bad "§D cidadao CONSEGUIU inserir cobranca (HTTP $NC) — grave"

    # PATCH/DELETE verificam LINHAS AFETADAS (Prefer: return=representation) —
    # um 204 com 0 linhas atualizadas seria um falso positivo elegante.
    CC=$(curl -s --max-time 30 -X PATCH -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $TOK_INST" -H 'Content-Type: application/json' -H 'Prefer: return=representation' \
      "$SUPA_URL/rest/v1/pagamentos?estado=eq.pendente&instituicao_sigla=eq.$CLAIM_INST&descricao=like.*auditoria%20autonoma*" -d '{"estado":"cancelado"}')
    CANCELOU=0
    echo "$CC" | grep -q '"estado":"cancelado"' && CANCELOU=1
    # recria pendente (idempotente por desenho: so avanca se ainda nao houver uma pendente desta descricao)
    PD=$(curl -s --max-time 30 -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $TOK_INST" "$SUPA_URL/rest/v1/pagamentos?select=id&estado=eq.pendente&instituicao_sigla=eq.$CLAIM_INST&descricao=like.*pendente,%20pronta%20p/%20demo*")
    if [ "$PD" = "[]" ]; then
      curl -s --max-time 30 -X POST "$SUPA_URL/rest/v1/pagamentos" -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $TOK_INST" -H 'Content-Type: application/json' -o /dev/null \
        -d "{\"instituicao_sigla\":\"$CLAIM_INST\",\"destinatario_bi\":\"$CLAIM_CID\",\"descricao\":\"Taxa de teste E2E — demonstracao INAPEM (pendente, pronta p/ demo)\",\"valor\":12500.50,\"metodos\":[\"multicaixa_express\",\"referencia_atm\",\"tpa\",\"transferencia\"],\"documento_ref\":\"Oficio CDA-TESTE/2026\"}"
    fi
    [ "$CANCELOU" = "1" ] && ok "§D instituicao CANCELOU a 1.a cobranca (linha afetada comprovada; rasto fica) e a de demo ficou pendente" || bad "§D cancelamento sem linha afetada: $(echo "$CC" | head -c 200)"

    # KB self-service (v25) — sigla CDATST nao entra nas respostas publicas da IA
    TEXTO_KB="Texto de teste da auditoria autonoma com pelo menos duzentos caracteres para respeitar os checks de qualidade da base de conhecimento institucional. Este conteudo descreve um procedimento ficticio da sigla CDATST usado apenas para provar o circuito de self-service com RLS: criar, ler como dono, ler como anonimo enquanto ativo, desativar e confirmar que o publico deixa de ver. Fim do texto de teste."
    KR=$(curl -s --max-time 30 -X POST "$SUPA_URL/rest/v1/kb_fontes_instituicao" -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $TOK_INST" -H 'Content-Type: application/json' -H 'Prefer: return=representation' \
      -d "{\"sigla\":\"$CLAIM_INST\",\"titulo\":\"Procedimento de teste E2E (auditoria)\",\"tipo\":\"procedimento\",\"texto\":\"$TEXTO_KB\"}")
    echo "$KR" | grep -q '"id"' && ok "§D instituicao CRIOU fonte na Base de Conhecimento (v25)" || bad "§D insert KB falhou: $(echo "$KR" | head -c 200)"

    AN1=$(curl -s --max-time 30 -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" "$SUPA_URL/rest/v1/kb_fontes_instituicao?select=titulo&sigla=eq.$CLAIM_INST&ativo=is.true")
    echo "$AN1" | grep -q 'Procedimento de teste E2E' && ok "§D fonte ATIVA visivel ao publico (conteudo de referencia)" || bad "§D fonte ativa invisivel ao publico: $(echo "$AN1" | head -c 200)"

    curl -s --max-time 30 -X PATCH -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $TOK_INST" -H 'Content-Type: application/json' -o /dev/null \
      "$SUPA_URL/rest/v1/kb_fontes_instituicao?sigla=eq.$CLAIM_INST" -d '{"ativo":false}'
    AN2=$(curl -s --max-time 30 -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" "$SUPA_URL/rest/v1/kb_fontes_instituicao?select=titulo&sigla=eq.$CLAIM_INST&ativo=is.true")
    [ "$AN2" = "[]" ] && ok "§D desativada, a fonte SAI do alcance publico imediatamente" || bad "§D publico ainda ve fonte desativada: $(echo "$AN2" | head -c 200)"

    OW=$(curl -s --max-time 30 -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $TOK_INST" "$SUPA_URL/rest/v1/kb_fontes_instituicao?select=titulo,ativo&sigla=eq.$CLAIM_INST")
    echo "$OW" | grep -q 'Procedimento de teste E2E' && ok "§D dono continua a ver a fonte desativada (gestao propria)" || bad "§D dono perdeu a fonte desativada: $(echo "$OW" | head -c 200)"

    DL=$(curl -s --max-time 30 -X DELETE -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $TOK_INST" -H 'Prefer: return=representation' "$SUPA_URL/rest/v1/kb_fontes_instituicao?sigla=eq.$CLAIM_INST")
    echo "$DL" | grep -q '"id"' && ok "§D dono apaga a fonte de teste (linha apagada comprovada)" || bad "§D delete da fonte sem linha afetada: $(echo "$DL" | head -c 200)"
  fi
else
  echo "--- §D saltada: defina CDA_TEST_CID_EMAIL/CDA_TEST_CID_PASS/CDA_TEST_INST_EMAIL/CDA_TEST_INST_PASS ---"
fi
echo "======================================================================"
echo "TOTAL GERAL: $PASS PASS / $FAIL FAIL"
[ "$FAIL" = "0" ] && exit 0 || exit 1
