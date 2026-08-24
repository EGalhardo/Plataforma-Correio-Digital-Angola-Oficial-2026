#!/usr/bin/env bash
# ============================================================
# CDA — Push para GitHub com credenciais do ficheiro .env.deploy
# Uso: bash scripts/push_github.sh ["mensagem opcional não é usada; push direto"]
# Requer: .env.deploy com GITHUB_TOKEN=... (gitignored)
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="EGalhardo/Plataforma-Correio-Digital-Angola-Oficial-2026"

if [ ! -f .env.deploy ]; then
  echo "ERRO: falta .env.deploy com GITHUB_TOKEN (ver .env.deploy)." >&2
  exit 1
fi

TOKEN=$(grep -E '^GITHUB_TOKEN=' .env.deploy | head -1 | cut -d= -f2- | tr -d '"' )

if [ -z "$TOKEN" ]; then
  echo "ERRO: GITHUB_TOKEN vazio em .env.deploy." >&2
  exit 1
fi

git remote set-url origin "https://${TOKEN}@github.com/${REPO}.git"
echo "→ Remote autenticado. A fazer push de $(git branch --show-current)..."
git push origin "$(git branch --show-current)"
echo "✓ Push concluído para ${REPO}"
