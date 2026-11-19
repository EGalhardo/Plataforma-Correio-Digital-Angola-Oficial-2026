# RELATÓRIO DE AUDITORIA DE PERFORMANCE E INTEROPERABILIDADE (2026)
**Correio Digital Angola (CDA) — Plataforma Nacional Oficial 2026**  
**Data:** 15 de Outubro de 2026  
**Auditor:** Especialista em Engenharia de Performance Web e Otimização de Sistemas  
**Ambiente de Teste:** Playwright Chromium Headless / HTTP Localhost :3000 / Perfil Multi-Sessão  

---

## 1. RESUMO EXECUTIVO

Foi executada uma auditoria técnica de performance e telemetria ponta a ponta na plataforma **Correio Digital Angola (CDA 2026)**, cobrindo:
1. **Métricas de Carregamento e Renderização (Core Web Vitals)** em todas as páginas públicas e autenticadas.
2. **Consumo de Memória (JS Heap) e Complexidade do DOM** nas 3 áreas (Cidadão, Instituição e Administração Central).
3. **Latência de Interoperabilidade Triangular em Tempo Real** (Cidadão ↔ Instituição ↔ SOC Admin).

---

## 2. MÉTRICAS CORE WEB VITALS E NAVEGAÇÃO

| Área | Página / Rota | TTFB (ms) | FCP (ms) | Transição / Render (ms) | Nós DOM | Estado |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Público** | Login Cidadão (`/`) | 729 | 676 | — | 19 | 🟢 Excelente |
| **Público** | Login Institucional (`/institucional`) | 445 | 440 | — | 19 | 🟢 Excelente |
| **Público** | Login Admin (`/admin`) | 466 | 444 | — | 19 | 🟢 Excelente |
| **Cidadão** | Painel Principal (`home`) | 6 | 676 | 1619 (Auth) | 301 | 🟢 Excelente |
| **Cidadão** | Correio Digital (`correspondencias`) | 6 | — | 335 | 159 | 🟢 Excelente |
| **Cidadão** | Contactos (`contatos`) | 6 | — | 346 | 159 | 🟢 Excelente |
| **Cidadão** | Meu Perfil (`perfil`) | 6 | — | 322 | 167 | 🟢 Excelente |
| **Cidadão** | Vídeo-Atendimento (`video-atendimento`) | 6 | — | 327 | 162 | 🟢 Excelente |
| **Cidadão** | Inquéritos (`inqueritos`) | 6 | — | 322 | 194 | 🟢 Excelente |
| **Cidadão** | Comunicados (`comunicados`) | 6 | — | 328 | 177 | 🟢 Excelente |
| **Cidadão** | Ocorrências Locais (`ocorrencias`) | 6 | — | 321 | 162 | 🟢 Excelente |
| **Cidadão** | Denúncia (`nova-denuncia`) | 6 | — | 326 | 446 | 🟢 Excelente |
| **Cidadão** | Livro de Reclamações (`denuncias`) | 6 | — | 397 | 226 | 🟢 Excelente |
| **Cidadão** | Sondagens (`sondagens`) | 6 | — | 331 | 226 | 🟢 Excelente |
| **Cidadão** | Notificações (`notificacoes`) | 6 | — | 329 | 162 | 🟢 Excelente |
| **Cidadão** | Histórico (`historico`) | 6 | — | 325 | 162 | 🟢 Excelente |
| **Cidadão** | Documentos (`documentos`) | 6 | — | 330 | 264 | 🟢 Excelente |
| **Cidadão** | Directório de Órgãos (`directorio-orgaos`) | 6 | — | 328 | 233 | 🟢 Excelente |
| **Instituição** | Painel Institucional (`home`) | 4 | 440 | 2939 (Auth) | 355 | 🟢 Excelente |
| **Instituição** | Correio Institucional (`correspondencias`) | 4 | — | 327 | 215 | 🟢 Excelente |
| **Instituição** | Equipa da Instituição (`gov-contatos`) | 4 | — | 340 | 269 | 🟢 Excelente |
| **Instituição** | Validação QR Code (`inst-qrcode`) | 4 | — | 360 | 270 | 🟢 Excelente |
| **Instituição** | Assistente IA (`inst-ai-assistant`) | 4 | — | 325 | 270 | 🟢 Excelente |
| **Instituição** | Perfil Institucional (`perfil`) | 4 | — | 384 | 437 | 🟢 Excelente |
| **Instituição** | Vídeo-Atendimento (`video-atendimento`) | 4 | — | 376 | 420 | 🟢 Excelente |
| **Instituição** | Inquéritos Recebidos (`inqueritos`) | 4 | — | 338 | 244 | 🟢 Excelente |
| **Instituição** | Comunicados Emitidos (`comunicados`) | 4 | — | 326 | 231 | 🟢 Excelente |
| **Instituição** | Ocorrências Recebidas (`ocorrencias`) | 4 | — | 325 | 212 | 🟢 Excelente |
| **Instituição** | Denúncias Recebidas (`denuncias`) | 4 | — | 329 | 227 | 🟢 Excelente |
| **Instituição** | Sondagens (`sondagens`) | 4 | — | 328 | 312 | 🟢 Excelente |
| **Instituição** | Notificações (`notificacoes`) | 4 | — | 332 | 212 | 🟢 Excelente |
| **Instituição** | Histórico (`historico`) | 4 | — | 330 | 212 | 🟢 Excelente |
| **Instituição** | Documentos (`documentos`) | 4 | — | 328 | 212 | 🟢 Excelente |
| **Admin** | Painel SOC Nacional (`gov-dashboard`) | 9 | 444 | 2206 (Auth) | 989 | 🟢 Excelente |
| **Admin** | Interoperabilidade (`gov-interoperabilidade`) | 9 | — | 506 | 823 | 🟢 Excelente |
| **Admin** | Correspondências Globais (`gov-correspondencias`) | 9 | — | 320 | 826 | 🟢 Excelente |
| **Admin** | Cadastro de Cidadãos (`gov-contatos`) | 9 | — | 323 | 826 | 🟢 Excelente |
| **Admin** | Equipa Central (`gov-trabalhadores`) | 9 | — | 367 | 386 | 🟢 Excelente |
| **Admin** | Centro de Relatórios (`gov-relatorio`) | 9 | — | 343 | 389 | 🟢 Excelente |
| **Admin** | Assistência IA Nacional (`gov-ia`) | 9 | — | 332 | 660 | 🟢 Excelente |
| **Admin** | Auditoria & Segurança (`gov-seguranca`) | 9 | — | 376 | 663 | 🟢 Excelente |
| **Admin** | Perfil Administrativo (`gov-perfil`) | 9 | — | 343 | 246 | 🟢 Excelente |
| **Admin** | Emissão Documental (`gov-emissao`) | 9 | — | 370 | 292 | 🟢 Excelente |
| **Admin** | Directório Central (`directorio-orgaos`) | 9 | — | 371 | 241 | 🟢 Excelente |

---

## 3. PERFIL DE MEMÓRIA E RECURSOS

- **Uso de Memória JS Heap:** **~20.69 MB** (Total alocado: ~23.37 MB).
  - *Avaliação:* Consumo extremamente reduzido para uma SPA empresarial com WebRTC, OCR, mapas interativos e gráficos Recharts. Sem fugas de memória (*memory leaks*) após 45+ transições de rota contínuas.
- **Árvore DOM:**
  - Telas leves: ~160 a 270 nós.
  - Telas densas (SOC Nacional / Dashboard Interoperabilidade): ~820 a 989 nós (dentro do limite recomendado pela Google de < 1.500 nós).

---

## 4. BENCHMARK DE INTEROPERABILIDADE TRIANGULAR

Circuito de emissão concorrente testado: **Cidadão (Edlásio Galhardo) ➔ Instituição (INAPEM) ➔ SOC Central Admin**:

| Etapa do Circuito | Ação Realizada | Tempo Medido (ms) | SLA de Referência | Estado |
|---|---|:---:|:---:|:---:|
| **1. Emissão Cidadão** | Validação, hash e submissão | **1.125 ms** | < 2.000 ms | 🟢 Ótimo |
| **2. Recepção Instituição** | Entrega e renderização na Caixa de Entrada | **844 ms** | < 1.500 ms | 🟢 Ótimo |
| **3. Auditoria SOC Admin** | Contabilização e registo central | **839 ms** | < 1.500 ms | 🟢 Ótimo |
| **Tempo Total Round-Trip** | Ciclo completo triangular | **2.808 ms** (~2.8s) | < 5.000 ms | 🟢 Ótimo |

---

## 5. CONCLUSÕES DA AUDITORIA

1. **Eficiência de Renderização:** O roteamento interno por hash (`window.location.hash`) responde em média entre **320 ms e 380 ms**, garantindo fluidez instantânea ao utilizador.
2. **Consumo de Memória:** O footprint de ~20 MB é exemplar e ideal para dispositivos com recursos limitados (smartphones de entrada e tablets).
3. **Interoperabilidade:** O transporte de mensagens, atualizações de status e auditoria ocorrem em menos de 3 segundos no ciclo completo triangular.
4. **Estado Atual:** A aplicação encontra-se otimizada, estável e com métricas de desempenho situadas na faixa **"Good" (Excelente)** dos padrões internacionais da Web.
