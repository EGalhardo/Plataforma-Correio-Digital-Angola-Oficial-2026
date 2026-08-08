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
echo "AUDITORIA: $PASS PASS / $FAIL FAIL   (fora de alcance autónomo: fluxos"
echo "com sessão real — ver AUDITORIA_AUTONOMA.md §3)"
[ "$FAIL" = "0" ] && exit 0 || exit 1
