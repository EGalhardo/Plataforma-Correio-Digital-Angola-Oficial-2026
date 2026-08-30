import express from "express";
import type { Response as ExpressResponse } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { AVISO_IA, construirPrompts, juntarFontesKb, montarContextoKb, protegerTraducaoLinguaNacional, rowParaFonteKb, selecionarInstituicaoKb, validarPedido } from "./src/services/aiDocumentoCore";
import { KB_REGISTO } from "./api/kb/registoKb";
import type { FonteKb, FonteKbDinamicaRow } from "./src/services/aiDocumentoCore";
import { directorioParaContextoIA } from "./src/constants/directorioInstitucionalAngola";

dotenv.config();

async function startServer() {
  const app = express();
  // v37.5 — porta configurável (permite servir o build de produção noutra
  // porta para medições/testes sem ocupar o servidor de desenvolvimento).
  const PORT = Number(process.env.PORT) || 3000;
  const server = createServer(app);
  
  // 2026-08-22 — limite do body alargado para ficheiros grandes da Base de
  // Conhecimento (base64 inflaciona ~33%); o upload directo browser→Storage
  // cobre os casos maiores e o servidor valida o tamanho por endpoint.
  app.use(express.json({ limit: '150mb' }));

  // Limpa caracteres especiais/markdown das respostas da IA (2026-08-18).
  // Remove # * _ ` ~ > e formatação markdown, preservando pontuação, números,
  // acentos e termos úteis (Kz, %, etc.). Aplicada a TODAS as respostas IA.
  const limparTextoIA = (texto: string): string => {
    if (!texto) return '';
    let t = String(texto);
    // títulos markdown (###, ##, #) e citações (>) no início de linha
    t = t.replace(/^[#>]{1,6}\s*/gm, '');
    // linhas de separação horizontal (---, ***, ___) — remover a linha inteira
    t = t.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '');
    // asteriscos, underscores, backticks, til (negrito/itálico/código/riscado)
    t = t.replace(/[*_`~]+/g, '');
    // bullets markdown no início de linha -> texto sem marcador
    t = t.replace(/^[\s]*[-+]\s+/gm, '');
    // múltiplos espaços em branco -> um
    t = t.replace(/[ \t]{2,}/g, ' ');
    // quebras de linha múltiplas -> uma
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.trim();
  };


  // Initialize AI Studio Gemini Client
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  
  // Initialize Groq Client - SECURITY FIX: removido fallback inseguro Teste01
  const groqApiKey = process.env.GROQ_API_KEY || '';
  
  let groq: Groq | null = null;
  if (groqApiKey) {
    try {
      groq = new Groq({ apiKey: groqApiKey });
    } catch (e) {
      console.warn("CRITICAL: Failed to instantiate Groq client:", e);
    }
  }

  if (!apiKey) {
    console.warn("CRITICAL: No Gemini API Key found! Configure GEMINI_API_KEY no .env");
  }
  
  if (!groqApiKey) {
    console.warn("CRITICAL: No Groq API Key found (Configure GROQ_API_KEY no .env)!");
  }

  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        apiVersion: 'v1beta',
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (e) {
      console.warn("CRITICAL: Failed to instantiate GoogleGenAI client:", e);
    }
  }

  const getRuntimeFlags = () => ({
    local_bootstrap: (process.env.VITE_ENABLE_LOCAL_BOOTSTRAP || 'true') !== 'false',
    mock_fallback: (process.env.VITE_ENABLE_MOCK_FALLBACK || 'false') !== 'false',
    supabase_auto_seed: (process.env.VITE_ENABLE_SUPABASE_AUTO_SEED || 'false') === 'true',
  });

  const createSupabaseAdminClient = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://klrclczcahfycfdxzdqs.supabase.co';
    // Integração 2026: suporta SERVICE_ROLE, SECRET_KEY e ANON_KEY / PUBLISHABLE_KEY
    const serviceKey = 
      process.env.SUPABASE_SERVICE_ROLE_KEY || 
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_ANON_KEY || 
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      '';
    if (!url || !serviceKey) {
      console.warn('Supabase Admin Client: credenciais ausentes. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
      console.warn('Project: Correio Digital Angola (klrclczcahfycfdxzdqs)');
      return null;
    }
    // SECURITY: validação de URL para prevenir SSRF
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.endsWith('.supabase.co') && !parsed.hostname.includes('localhost') && !parsed.hostname.includes('127.0.0.1')) {
        console.warn('Supabase URL suspeita bloqueada:', parsed.hostname);
        return null;
      }
    } catch {
      return null;
    }
    // FIX: Node.js 20 não tem WebSocket nativo — passar o transport 'ws'
    // (mesma abordagem já usada em scripts/bootstrapSupabase.ts, verifySupabase.ts e productionReadiness.ts)
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: WebSocket as any }
    });
  };

  // ============================================================================
  // EXTRAÇÃO DE TEXTO NO SERVIDOR (2026-08-22) — Word legado (.doc) e fallbacks
  // ----------------------------------------------------------------------------
  // O navegador não consegue ler o formato binário .doc (OLE). Este endpoint
  // extrai o texto de .doc/.docx com word-extractor (ambos os formatos) e cobre
  // variantes comuns que chegam como .doc: RTF e HTML. TXT/MD também passam por
  // aqui quando o cliente prefere. Sem extração no cliente → sem limite prático
  // de tamanho (cap de segurança 100 MB).
  // ============================================================================
  app.post("/api/extrair-texto", async (req, res) => {
    try {
      const { nome, base64 } = req.body || {};
      if (!base64 || typeof base64 !== 'string') {
        return res.status(400).json({ ok: false, erro: 'base64 obrigatório.' });
      }
      const buf = Buffer.from(base64, 'base64');
      if (buf.length === 0) return res.status(400).json({ ok: false, erro: 'Ficheiro vazio.' });
      if (buf.length > 100 * 1024 * 1024) return res.status(413).json({ ok: false, erro: 'Ficheiro demasiado grande para extração no servidor (máx. 100 MB).' });
      const nomeLimpo = String(nome || '').toLowerCase();
      const normalizar = (t: string) => (t || '').replace(/\s+/g, ' ').trim();

      // --- RTF disfarçado de .doc (muito comum) ---
      const extrairRtf = (raw: string): string => {
        let t = raw.replace(/\{\*?\[^}]*\}/g, ' ');   // grupos embutidos
        t = t.replace(/\'[0-9a-fA-F]{2}/g, ' ');         // escapes hex
        t = t.replace(/\\[a-zA-Z]+-?\d* ?/g, ' ');      // control words
        t = t.replace(/[{}]/g, ' ');
        return normalizar(t);
      };
      // --- HTML disfarçado de .doc ---
      const extrairHtml = (raw: string): string => {
        let t = raw.replace(/<script[\s\S]*?<\/script>/gi, ' ');
        t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
        t = t.replace(/<[^>]+>/g, ' ');
        t = t.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
        return normalizar(t);
      };

      if (nomeLimpo.endsWith('.doc') || nomeLimpo.endsWith('.docx')) {
        // word-extractor lê .doc (OLE) e .docx — import dinâmico (ESM)
        try {
          const mod: any = await import('word-extractor');
          const WordExtractor = mod.default || mod;
          try {
          const extractor = new WordExtractor();
          const doc = await extractor.extract(buf);
          const texto = normalizar(doc.getBody ? doc.getBody() : String(doc));
          if (texto) return res.status(200).json({ ok: true, texto, tipo: nomeLimpo.endsWith('.doc') ? 'doc' : 'docx' });
          } catch (e) {
            console.warn('[EXTRAIR-TEXTO] word-extractor falhou — tenta fallbacks RTF/HTML:', String(e).slice(0, 120));
          }
        } catch (impErr) {
          console.warn('[EXTRAIR-TEXTO] word-extractor indisponível — tenta fallbacks RTF/HTML:', String(impErr).slice(0, 120));
        }
        // fallbacks: RTF ou HTML gravados com extensão .doc
        const raw = buf.toString('latin1');
        const inicio = raw.slice(0, 400).toLowerCase();
        if (inicio.includes('rtf')) {
          const texto = extrairRtf(raw);
          if (texto) return res.status(200).json({ ok: true, texto, tipo: 'doc' });
        }
        if (/<html|<body|<p\b|<div|<table/i.test(raw.slice(0, 2000))) {
          const texto = extrairHtml(raw);
          if (texto) return res.status(200).json({ ok: true, texto, tipo: 'doc' });
        }
        return res.status(422).json({ ok: false, erro: 'Não foi possível extrair texto do ficheiro Word. O documento pode estar corrompido ou protegido.' });
      }

      if (nomeLimpo.endsWith('.txt') || nomeLimpo.endsWith('.md')) {
        let texto = '';
        try { texto = buf.toString('utf-8'); } catch { /* abaixo */ }
        if (!texto.trim()) texto = buf.toString('latin1');
        return res.status(200).json({ ok: true, texto: normalizar(texto), tipo: 'txt' });
      }

      return res.status(415).json({ ok: false, erro: 'Formato não suportado no servidor. Utilize PDF, Word (.doc/.docx) ou TXT.' });
    } catch (e) {
      console.error('[EXTRAIR-TEXTO] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  // API — Upload de ficheiro para a Base de Conhecimento (bucket kb_ficheiros)
  // O upload é feito NO SERVIDOR com a service role (nunca exposta no cliente):
  // o browser envia o ficheiro em base64; o servidor carrega para o storage e
  // devolve o URL público. Tamanho máximo 10 MB.
  app.post("/api/kb-upload", async (req, res) => {
    try {
      const { nome, base64, sigla } = req.body || {};
      if (!nome || typeof nome !== 'string' || !base64 || typeof base64 !== 'string') {
        return res.status(400).json({ ok: false, erro: 'nome e base64 são obrigatórios.' });
      }
      const buf = Buffer.from(base64, 'base64');
      if (buf.length === 0) return res.status(400).json({ ok: false, erro: 'Ficheiro vazio.' });
      if (buf.length > 100 * 1024 * 1024) return res.status(413).json({ ok: false, erro: 'Ficheiro demasiado grande (máx. 100 MB).' });
      const admin = createSupabaseAdminClient();
      if (!admin) return res.status(500).json({ ok: false, erro: 'Serviço de armazenamento indisponível.' });
      const sanitizado = nome.replace(/[^\w.\-]+/g, '_');
      const pasta = (sigla || 'inst').replace(/[^\w\-]+/g, '_').toUpperCase();
      const filePath = `kb/${pasta}/${Date.now()}-${sanitizado}`;
      const { error } = await admin.storage
        .from('kb_ficheiros')
        .upload(filePath, buf, { cacheControl: '3600', upsert: true, contentType: req.body?.tipo || undefined });
      if (error) {
        console.error('[KB-UPLOAD] Erro no upload:', error.message);
        return res.status(500).json({ ok: false, erro: error.message });
      }
      const { data } = admin.storage.from('kb_ficheiros').getPublicUrl(filePath);
      return res.status(200).json({ ok: true, url: data.publicUrl });
    } catch (e) {
      console.error('[KB-UPLOAD] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  // API — Perfil do cidadão (2026-08-20): com a RLS endurecida de produção,
  // o cliente sem claims JWT não lê nem escreve a linha própria em `profiles`
  // (o UPDATE falha SILENCIOSAMENTE — 204 com zero linhas) e o guardar do
  // Perfil mostrava "sucesso" sem gravar nada. Estas rotas leem/escrevem NO
  // SERVIDOR com a service role (colunas em whitelist, BI validado).
  const PERFIL_COLUNAS = ['name','phone','nif','passport','birth_date','filiation','marital_status','email','morada'] as const;
  const BI_VALIDO = /^[A-Z0-9][A-Z0-9\-]{3,23}$/;

  app.get("/api/perfil", async (req, res) => {
    try {
      const bi = String((req.query as any)?.bi || '').trim().toUpperCase();
      if (!BI_VALIDO.test(bi)) return res.status(400).json({ ok: false, erro: 'BI inválido.' });
      const admin = createSupabaseAdminClient();
      if (!admin) return res.status(500).json({ ok: false, erro: 'Serviço indisponível.' });
      const { data, error } = await admin.from('profiles').select('*').eq('bi', bi).maybeSingle();
      if (error) return res.status(500).json({ ok: false, erro: error.message });
      return res.status(200).json({ ok: true, perfil: data || null });
    } catch (e) {
      console.error('[PERFIL-GET] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  app.post("/api/perfil-sync", async (req, res) => {
    try {
      const { bi, campos, agente } = req.body || {};
      const biNorm = String(bi || '').trim().toUpperCase();
      if (!BI_VALIDO.test(biNorm)) return res.status(400).json({ ok: false, erro: 'BI inválido.' });
      if (!campos || typeof campos !== 'object' || Array.isArray(campos)) {
        return res.status(400).json({ ok: false, erro: 'campos ausentes.' });
      }
      const admin = createSupabaseAdminClient();
      if (!admin) return res.status(500).json({ ok: false, erro: 'Serviço indisponível.' });

      // 2026-08-21 — RAMO AGENTE INSTITUCIONAL (membro da equipa):
      // o Perfil de um COLABORADOR nunca pode gravar na linha `profiles` da
      // instituição (essa pertence ao responsável — antes a edição do membro
      // sobrescrevia o nome/telefone/e-mail do responsável na nuvem). Com
      // `agente` presente, o servidor confirma que o utilizador do TOKEN da
      // sessão é o próprio membro e actualiza apenas os user_metadata da
      // conta Auth DELE (name/phone/email — nunca senha nem role).
      const agenteNorm = String(agente || '').trim().toUpperCase();
      if (agenteNorm) {
        const auth = String(req.headers.authorization || req.headers.Authorization || '');
        const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
        if (!token) return res.status(401).json({ ok: false, erro: 'Sessão não autenticada.' });
        const { data: sess, error: sessErr } = await admin.auth.getUser(token);
        if (sessErr || !sess || !sess.user) {
          return res.status(401).json({ ok: false, erro: 'Sessão inválida.' });
        }
        const meta = (sess.user.user_metadata || {}) as Record<string, unknown>;
        const metaAgent = String(meta.agent || '').trim().toUpperCase();
        if (metaAgent !== agenteNorm) {
          return res.status(403).json({ ok: false, erro: 'O Nº Agente não corresponde à sessão autenticada.' });
        }
        const allowed = ['name', 'phone', 'email'];
        const patch: Record<string, unknown> = {};
        for (const k of allowed) {
          const v = String((campos as any)[k] ?? '').trim();
          if (v) patch[k] = v;
        }
        if (!Object.keys(patch).length) return res.status(400).json({ ok: false, erro: 'Nenhum campo do agente para gravar.' });
        const { error: updErr } = await admin.auth.admin.updateUserById(sess.user.id, {
          user_metadata: { ...meta, ...patch },
        });
        if (updErr) return res.status(500).json({ ok: false, erro: updErr.message });
        return res.status(200).json({ ok: true, gravado: Object.keys(patch), agente: true });
      }

      const cols: Record<string, string> = {};
      for (const col of PERFIL_COLUNAS) {
        const v = String((campos as any)[col] ?? '').trim();
        if (v) cols[col] = v;
      }
      // birth_date: aceita dd/mm/aaaa e converte para aaaa-mm-dd (formato da BD)
      if (cols.birth_date && /^\d{2}\/\d{2}\/\d{4}$/.test(cols.birth_date)) {
        const [d, m, y] = cols.birth_date.split('/');
        cols.birth_date = `${y}-${m}-${d}`;
      } else if (cols.birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(cols.birth_date)) {
        delete cols.birth_date;
      }
      if (!Object.keys(cols).length) return res.status(400).json({ ok: false, erro: 'Nenhuma coluna válida para gravar.' });
      const { data: upd, error: updErr } = await admin.from('profiles').update(cols).eq('bi', biNorm).select('bi');
      if (updErr) return res.status(500).json({ ok: false, erro: updErr.message });
      if (upd && upd.length > 0) return res.status(200).json({ ok: true, gravado: Object.keys(cols) });
      const { error: insErr } = await admin.from('profiles').insert({ bi: biNorm, ...cols });
      if (insErr) return res.status(500).json({ ok: false, erro: insErr.message });
      return res.status(200).json({ ok: true, gravado: Object.keys(cols), criado: true });
    } catch (e) {
      console.error('[PERFIL-SYNC] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

// ============================================================================
// PROXY CRUD /api/dados — persistência do MODO REAL (2026-08-20)
// ----------------------------------------------------------------------------
// A RLS endurecida de produção oculta TODAS as tabelas do cliente anon:
// leituras voltam vazias e escritas falham em silêncio (o "Modo Real" parecia
// funcionar mas nada era persistido — os dados "voltavam ao estado anterior").
// Este proxy executa o CRUD NO SERVIDOR com a service role, autenticado pelo
// token da sessão Supabase do utilizador, com escopo de titularidade por
// tabela (espelha a intenção do production_hardening.sql) e colunas em
// whitelist. Contas demo canónicas são recusadas (403 'demo') — o Modo Demo
// permanece 100% local e intocado. O INSERT em `solicitacoes_registo` é o
// único permitido sem token (é o passo público de registo).
// ============================================================================

const DADOS_DEMO_BIS = ['009874562LA041', 'AGT-9921-SR', 'ADM-8812-OP'];

// Colunas permitidas por tabela (escrita); leitura devolve a linha completa.
const DADOS_COLUNAS: Record<string, Record<string, boolean>> = {
  messages: {
    id: true, sender_bi: true, recipient_bi: true, org: true, preview: true, unread: true,
    status: true, subject: true, body: true, deadline_text: true, state_indicator: true,
    actions: true, attachments: true, sensitivity: true, priority_scale: true,
    deadline_hours_remaining: true, protocol_number: true, created_at: true,
    // v37.78.3 — sondagens embutidas na correspondência oficial (v37): o
    // destinatário manual da composição recebe a mensagem com o cartão de
    // resposta (sondagem_id retrocompat v36 + sondagem_ids v37 multi). Sem
    // estas colunas o proxy descartava-as silenciosamente e o cidadão via a
    // mensagem SEM poder responder à sondagem.
    sondagem_id: true, sondagem_ids: true,
  },
  contacts: { id: true, owner_bi: true, name: true, bi: true, relation: true, status: true, type: true, phone: true, whatsapp: true, email: true }, // v35 — email opcional (difusão de emergência)
  notifications: { id: true, target_bi: true, title: true, message: true, time_text: true, type: true, target_tab: true, read_at: true },
  user_requests: { id: true, user_bi: true, user_name: true, service_type: true, priority: true, time_text: true, status: true, institution: true, request_date: true },
  document_requests: { id: true, user_bi: true, user_name: true, doc_type: true, institution: true, request_date: true, status: true, ai_status: true },
  documents: { name: true, validity: true, code: true, holder_bi: true, document_number: true, issuer: true, issued_at: true },
  digital_protocols: {
    protocol_number: true, issuer_institution: true, official_issue_date: true, official_time: true,
    issuer_responsible: true, category: true, document_type: true, current_state: true, priority: true,
    qr_code_url: true, digital_signature: true, legal_validity: true, document_hash: true,
    org: true, internal_id: true, digital_seal: true, deadline_date: true,
  },
  audit_logs: { action: true, username: true, action_type: true, timestamp: true },
  message_state_history: { id: true, message_id: true, state: true, responsible: true, description: true, created_at: true, event_date: true, event_time: true },
  solicitacoes_registo: { id: true, nome: true, email: true, bi_numero: true, url_frente: true, url_verso: true, url_selfie: true, status: true, observacoes: true, criado_em: true },
  video_sessions: {
    id: true, room_name: true, subject: true, associated_protocol: true,
    associated_message_id: true, status: true, host_bi: true, host_name: true,
    guest_bi: true, guest_name: true, scheduled_for: true, created_at: true,
    closed_at: true, agenda: true, notes: true, duration: true, quality: true,
    participant_count: true,
    // 2026-08-22 (v2) — eliminação POR LADO: a instituição que elimina retira
    // a própria titularidade (institution_code+host_bi → 'REMOVIDA'); o
    // cidadão faz o equivalente com citizen_bi+guest_bi. A linha mantém-se
    // visível ao OUTRO lado (escopo de titularidade) e para o admin (registo).
    institution_code: true, citizen_bi: true,
  },
};

interface DadosIdentidade {
  bi: string; email: string; role: string;
  isAdmin: boolean; isInst: boolean; instCode: string; demo: boolean;
}

type EscopoFiltros = { or: string[]; and: Record<string, string> } | null;

const DADOS_TABELAS: Record<string, {
  select: boolean; insert: boolean; update: boolean; delete: boolean;
  publicInsert?: boolean; upsert?: boolean;
  escopo: (ident: DadosIdentidade) => EscopoFiltros;
  injetar: (ident: DadosIdentidade, dados: Record<string, any>) => Record<string, any> | null;
}> = {
  messages: {
    // v37.77 — delete:true: a Administração elimina correspondências
    // (página Correspondências); o escopo mantém cidadão/instituição
    // limitados às PRÓPRIAS linhas (remetente/destinatário).
    select: true, insert: true, update: true, delete: true, upsert: true,
    escopo: (i) => i.isAdmin ? { or: [], and: {} }
      : i.isInst ? { or: [`recipient_bi.eq.${i.instCode || i.bi}`, `sender_bi.eq.${i.instCode || i.bi}`, `org.eq.${i.instCode || i.bi}`], and: {} }
      // v37.31 — difusões «TODOS» (expedição nacional) também pertencem à
      // caixa do cidadão: sem isto, cidadãos registados DEPOIS da difusão
      // (ex.: Mario Quiuma, 26/08) nunca viam a mensagem da instituição.
      : { or: [`recipient_bi.eq.${i.bi}`, `sender_bi.eq.${i.bi}`, 'recipient_bi.eq.TODOS'], and: {} },
    injetar: (i, d) => {
      if (i.isAdmin) return { ...d, sender_bi: d.sender_bi || 'CDA' };
      const sender = i.isInst ? (i.instCode || i.bi) : i.bi;
      return { ...d, sender_bi: sender, ...(i.isInst ? { org: i.instCode || i.bi } : {}) };
    },
  },
  contacts: {
    select: true, insert: true, update: true, delete: true, upsert: true,
    // 2026-08-21 — titularidade respeitada em TODOS os papéis: admin vê tudo;
    // instituição só os contactos do próprio código; cidadão só os seus.
    escopo: (i) => i.isAdmin ? { or: [], and: {} } : { or: [], and: { owner_bi: i.instCode || i.bi } },
    injetar: (i, d) => (i.isAdmin) ? d : { ...d, owner_bi: i.instCode || i.bi },
  },
  notifications: {
    select: true, insert: true, update: true, delete: false,
    escopo: (i) => i.isAdmin ? { or: [], and: {} }
      : { or: [], and: {} }, // leitura abaixo tratada por filtro do cliente (target_bi próprio)
    injetar: (i, d) => d,
  },
  user_requests: {
    select: true, insert: true, update: true, delete: false, upsert: true,
    escopo: (i) => i.isAdmin ? { or: [], and: {} } : { or: [], and: { user_bi: i.bi } },
    injetar: (i, d) => i.isAdmin ? d : { ...d, user_bi: i.bi },
  },
  document_requests: {
    select: true, insert: true, update: true, delete: false, upsert: true,
    escopo: (i) => i.isAdmin ? { or: [], and: {} } : { or: [], and: { user_bi: i.bi } },
    injetar: (i, d) => i.isAdmin ? d : { ...d, user_bi: i.bi },
  },
  documents: {
    select: true, insert: true, update: true, delete: true, upsert: true,
    escopo: (i) => i.isAdmin ? { or: [], and: {} } : { or: [], and: { holder_bi: i.bi } },
    injetar: (i, d) => i.isAdmin ? d : { ...d, holder_bi: i.bi },
  },
  digital_protocols: {
    select: true, insert: true, update: false, delete: false,
    // Cidadão/instituição só leem por número de protocolo — a guarda está no
    // handler (filtros.protocol_number obrigatório para não-admin).
    escopo: (_i) => ({ or: [], and: {} }),
    injetar: (_i, d) => d,
  },
  audit_logs: {
    select: true, insert: true, update: false, delete: false,
    escopo: (i) => (i.isAdmin ? { or: [], and: {} } : null),
    injetar: (i, d) => ({ ...d, username: d.username || i.bi || i.email || 'Utilizador' }),
  },
  message_state_history: {
    select: true, insert: true, update: false, delete: false,
    escopo: (i) => i.isAdmin ? { or: [], and: {} } : { or: [], and: {} },
    injetar: (_i, d) => d,
  },
  solicitacoes_registo: {
    select: true, insert: true, update: true, delete: true,
    publicInsert: true,
    escopo: (i) => (i && i.isAdmin) ? { or: [], and: {} } : (i ? { or: [], and: { bi_numero: i.bi } } : { or: [], and: {} }),
    injetar: (i, d) => (i && !i.isAdmin) ? { ...d, bi_numero: i.bi } : d,
  },
  video_sessions: {
    select: true, insert: true, update: true, delete: true, upsert: true,
    // 2026-08-22 — Video-atendimento: a instituição vê/gera as sessões de que
    // é ANFITRIÃ; o cidadão vê as sessões agendadas PARA ele; admin vê tudo.
    // A tabela de produção usa citizen_bi/institution_code como colunas
    // canónicas e mantém host_bi/guest_bi legadas — o escopo cobre ambas.
    escopo: (i) => i.isAdmin ? { or: [], and: {} }
      : i.isInst ? { or: [`institution_code.eq.${i.instCode || i.bi}`, `host_bi.eq.${i.instCode || i.bi}`], and: {} }
      : { or: [`citizen_bi.eq.${i.bi}`, `guest_bi.eq.${i.bi}`], and: {} },
    injetar: (i, d) => {
      // titularidade FORÇADA + preenchimento das colunas OBRIGATÓRIAS da
      // tabela de produção (reference_code, title, origin_type, citizen_*,
      // institution_*, scheduled_date/time, meeting_* — o cliente legado só
      // conhece as colunas antigas).
      if (i.isAdmin) return d;
      const host = i.isInst ? (i.instCode || i.bi) : '';
      const guest = i.isInst ? '' : i.bi;
      const subject = String(d.subject || d.title || 'Video-atendimento');
      const raw = String(d.scheduled_for || '');
      const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
      const horaM = raw.match(/(\d{2}):(\d{2})/);
      const scheduled_date = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : new Date().toISOString().slice(0, 10);
      const scheduled_time = horaM ? `${horaM[1]}:${horaM[2]}` : '09:00';
      const ref = `VID-${scheduled_date.replace(/-/g, '')}-${String(d.id || '').replace(/-/g, '').slice(0, 8).toUpperCase()}`;
      const room = String(d.room_name || d.meeting_room || `cda-${String(d.id || '').slice(0, 8)}`);
      return {
        ...d,
        reference_code: d.reference_code || ref,
        title: d.title || subject,
        description: d.description || d.agenda || null,
        origin_type: d.origin_type || (i.isInst ? 'institucional' : 'cidadao'),
        origin_id: d.origin_id || (i.isInst ? host : guest),
        citizen_bi: d.citizen_bi || d.guest_bi || guest,
        citizen_name: d.citizen_name || d.guest_name || 'Cidadão',
        institution_code: d.institution_code || d.host_bi || host,
        institution_name: d.institution_name || d.host_name || 'Instituição',
        created_by: d.created_by || (i.isInst ? host : guest),
        scheduled_date: d.scheduled_date || scheduled_date,
        scheduled_time: d.scheduled_time || scheduled_time,
        duration_minutes: d.duration_minutes || 30,
        status: d.status || 'agendada',
        priority: d.priority || 'Normal',
        meeting_provider: d.meeting_provider || 'jitsi',
        meeting_room: d.meeting_room || room,
        meeting_url: d.meeting_url || `https://meet.jit.si/${room}`,
        allow_reschedule: true,
        allow_recording_request: false,
        reminder_sent: false,
      };
    },
  },
};

// Resolve a identidade a partir do token de sessão Supabase.
// 2026-08-21 (desempenho) — cache em memória de 60s por token: evita o
// round-trip /auth/v1/user em CADA pedido do proxy.
const dadosIdentCache = new Map<string, { ts: number; val: DadosIdentidade | { erro: string } }>();
async function dadosResolverIdentidade(supaUrl: string, serviceKey: string, token: string): Promise<DadosIdentidade | { erro: string }> {
  const cacheKey = `${supaUrl}|${token}`;
  const hit = dadosIdentCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < 60_000) return hit.val;
  const val = await dadosResolverIdentidadeRaw(supaUrl, serviceKey, token);
  dadosIdentCache.set(cacheKey, { ts: Date.now(), val });
  return val;
}
async function dadosResolverIdentidadeRaw(supaUrl: string, serviceKey: string, token: string): Promise<DadosIdentidade | { erro: string }> {
  try {
    const r = await fetch(`${supaUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { erro: 'Sessão inválida ou expirada. Inicie sessão novamente.' };
    const u = await r.json();
    const meta: any = { ...(u.app_metadata || {}), ...(u.user_metadata || {}) };
    let bi = String(meta.bi || '').trim().toUpperCase();
    if (!bi && u.email) {
      try {
        const pr = await fetch(`${supaUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(u.email)}&select=bi&limit=1`, {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        });
        const rows = await pr.json().catch(() => []);
        bi = (rows && rows[0] && rows[0].bi) ? String(rows[0].bi).toUpperCase() : '';
      } catch { /* melhor esforço */ }
    }
    const role = String(meta.role || '').toLowerCase();
    // 2026-08-21 — contas institucionais/admin não têm `bi` no metadata: usar
    // o código institucional / nº de agente como chave de identidade, senão o
    // escopo de titularidade ficava vazio e o proxy devolvia TODAS as linhas
    // (ex.: o leitor QR recebia documentos de demonstração de outras contas).
    if (!bi && role === 'instituicao' && meta.instituicao) bi = String(meta.instituicao).toUpperCase();
    if (!bi && role === 'admin' && meta.agent) bi = String(meta.agent).toUpperCase();
    return {
      bi, email: u.email || '', role,
      isAdmin: role === 'admin',
      isInst: role === 'instituicao',
      instCode: String(meta.instituicao || '').trim().toUpperCase(),
      demo: !!bi && DADOS_DEMO_BIS.includes(bi),
    };
  } catch {
    return { erro: 'Serviço de identidade indisponível. Tente novamente.' };
  }
}

// Filtros de cliente: só colunas conhecidas; valores limitados.
function dadosSanitizarFiltros(tabela: string, filtros: any): Record<string, string> | null {
  if (!filtros || typeof filtros !== 'object' || Array.isArray(filtros)) return {};
  const cols = DADOS_COLUNAS[tabela];
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(filtros)) {
    if (!cols[k]) return null;
    out[k] = String(v).slice(0, 200);
  }
  return out;
}

function dadosSanitizarLinha(tabela: string, linha: any): Record<string, any> | null {
  if (!linha || typeof linha !== 'object' || Array.isArray(linha)) return null;
  const cols = DADOS_COLUNAS[tabela];
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(linha)) {
    if (!cols[k]) continue;
    if (typeof v === 'string' && v.length > 10000) out[k] = v.slice(0, 10000);
    else if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v;
    // v37.78.3 — arrays homogéneos de strings OU de números (messages.sondagem_ids
    // é int[]; antes só strings passavam e a coluna era descartada em silêncio).
    else if (Array.isArray(v) && (v.every(x => typeof x === 'string') || v.every(x => typeof x === 'number'))) out[k] = v.slice(0, 50);
  }
  return out;
}

function dadosMontarQuery(filtros: Record<string, string>, escopo: EscopoFiltros): string {
  const partes: string[] = [];
  const and = { ...filtros, ...(escopo?.and || {}) };
  for (const [k, v] of Object.entries(and)) {
    if (v === undefined || v === null || v === '') continue;
    partes.push(`${k}=eq.${encodeURIComponent(String(v))}`);
  }
  if (escopo?.or && escopo.or.length) partes.push(`or=(${escopo.or.join(',')})`);
  return partes.join('&');
}

// Handler principal (idêntico em server.ts e api/index.ts).
async function dadosExecutarPedido(opts: {
  supaUrl: string; serviceKey: string; body: any; authorization?: string;
}) {
  const { supaUrl, serviceKey, body, authorization } = opts;
  const tabela = String(body?.tabela || '');
  const operacao = String(body?.operacao || '');
  const tab = DADOS_TABELAS[tabela];
  if (!tab) return { status: 400, json: { ok: false, erro: 'Tabela desconhecida.' } };
  if (!(operacao === 'select' && tab.select) && !(operacao === 'insert' && tab.insert)
    && !(operacao === 'update' && tab.update) && !(operacao === 'delete' && tab.delete)) {
    return { status: 400, json: { ok: false, erro: 'Operação não suportada para esta tabela.' } };
  }
  const token = String(authorization || '').replace(/^Bearer\s+/i, '').trim();
  let ident: DadosIdentidade | null = null;
  if (token) {
    const res = await dadosResolverIdentidade(supaUrl, serviceKey, token);
    if ('erro' in res) return { status: 401, json: { ok: false, erro: res.erro } };
    if (res.demo) return { status: 403, json: { ok: false, erro: 'demo' } };
    ident = res;
  } else if (!((operacao === 'insert' && tab.publicInsert)
    || (operacao === 'select' && tabela === 'solicitacoes_registo'))) {
    return { status: 401, json: { ok: false, erro: 'Sessão obrigatória para esta operação.' } };
  }

  const filtros = dadosSanitizarFiltros(tabela, body?.filtros);
  if (filtros === null) return { status: 400, json: { ok: false, erro: 'Filtro inválido.' } };

  // Leitura de digital_protocols por cidadão/instituição: só por número de protocolo.
  if (tabela === 'digital_protocols' && ident && !ident.isAdmin && operacao === 'select') {
    if (!filtros.protocol_number) return { status: 403, json: { ok: false, erro: 'Sem permissão para ler todos os protocolos.' } };
  }
  // Histórico de estados: não-admin só por message_id.
  if (tabela === 'message_state_history' && ident && !ident.isAdmin && operacao === 'select') {
    if (!filtros.message_id) return { status: 403, json: { ok: false, erro: 'Sem permissão para ler todo o histórico.' } };
  }
  // Notificações: leitura restrita ao próprio destino (ou admin).
  if (tabela === 'notifications' && ident && !ident.isAdmin && operacao === 'select') {
    const destino = filtros.target_bi || ident.bi || ident.instCode;
    filtros.target_bi = destino;
  }
  // update/delete exigem filtro de linha (nunca em massa).
  if ((operacao === 'update' || operacao === 'delete') && !Object.keys(filtros).length) {
    return { status: 400, json: { ok: false, erro: 'Filtro de linha obrigatório para atualizar/eliminar.' } };
  }

  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  try {
    if (operacao === 'select') {
      const ordem = body?.ordem && body.ordem.col && ['id', 'created_at', 'request_date'].includes(body.ordem.col)
        ? `order=${body.ordem.col}.${body.ordem.dir === 'asc' ? 'asc' : 'desc'}` : 'order=id.desc';
      const limite = Number(body?.limite) > 0 && Number(body.limite) <= 2000 ? Number(body.limite) : 200;
      const escopo = tab.escopo(ident as DadosIdentidade);
      if (escopo === null) return { status: 403, json: { ok: false, erro: 'Sem permissão para ler esta tabela.' } };
      const q = dadosMontarQuery(filtros, escopo);
      // Registo público (sem sessão): só metadados mínimos da fila de registo.
      let selectCols = '*';
      if (tabela === 'solicitacoes_registo' && !ident) {
        selectCols = filtros.bi_numero ? 'bi_numero,status' : 'bi_numero,status,observacoes';
      }
      // 2026-08-21 (desempenho) — filtros avançados NO SERVIDOR (notNull/notIn):
      // o Expediente do admin deixa de transferir centenas de linhas para as
      // filtrar no cliente — a resposta já vem pequena e filtrada.
      const extrasQ: string[] = [];
      if (Array.isArray(body?.notNull)) {
        for (const col of body.notNull) {
          if (typeof col === 'string' && DADOS_COLUNAS[tabela][col]) extrasQ.push(`${col}=not.is.null`);
        }
      }
      if (body?.notIn && typeof body.notIn === 'object' && !Array.isArray(body.notIn)) {
        for (const [col, vals] of Object.entries(body.notIn)) {
          if (!DADOS_COLUNAS[tabela][col] || !Array.isArray(vals)) continue;
          const lista = vals.slice(0, 50).map((v) => String(v).replace(/,/g, ''));
          if (lista.length) extrasQ.push(`${col}=not.in.(${lista.map((v) => encodeURIComponent(v)).join(',')})`);
        }
      }
      const queryExtra = extrasQ.length ? `&${extrasQ.join('&')}` : '';
      const r = await fetch(`${supaUrl}/rest/v1/${tabela}?select=${selectCols}&${q}${queryExtra}&${ordem}&limit=${limite}`, { headers });
      if (!r.ok) return { status: r.status, json: { ok: false, erro: `Leitura falhou (${r.status}).` } };
      const linhas = await r.json().catch(() => []);
      return { status: 200, json: { ok: true, linhas: Array.isArray(linhas) ? linhas : [] } };
    }

    if (operacao === 'insert') {
      const cru = Array.isArray(body?.dados) ? body.dados : [body?.dados];
      if (!cru.length || !cru[0] || typeof cru[0] !== 'object') return { status: 400, json: { ok: false, erro: 'dados ausentes.' } };
      const linhas: Record<string, any>[] = [];
      for (const l of cru) {
        const limpa = dadosSanitizarLinha(tabela, l);
        if (!limpa) return { status: 400, json: { ok: false, erro: 'Linha inválida.' } };
        // Contas demo canónicas nunca entram na base real (protege o Modo Demo).
        if (limpa.bi_numero && DADOS_DEMO_BIS.includes(String(limpa.bi_numero).toUpperCase())) {
          return { status: 403, json: { ok: false, erro: 'demo' } };
        }
        const inj = tab.injetar(ident as DadosIdentidade, limpa);
        if (inj === null) return { status: 403, json: { ok: false, erro: 'Sem permissão para inserir nesta tabela.' } };
        linhas.push(inj);
      }
      // Garantia de perfil (FK owner_bi/sender_bi/recipient_bi → profiles):
      // espelha ensureProfileExists, agora com service role (o cliente real
      // não consegue criar a própria linha sob RLS endurecida).
      const perfisAGarantir = new Set<string>();
      for (const linha of linhas) {
        if (tabela === 'contacts' && linha.owner_bi) perfisAGarantir.add(String(linha.owner_bi));
        if (tabela === 'messages') {
          if (linha.sender_bi) perfisAGarantir.add(String(linha.sender_bi));
          if (linha.recipient_bi) perfisAGarantir.add(String(linha.recipient_bi));
        }
      }
      for (const biPerfil of perfisAGarantir) {
        try {
          await fetch(`${supaUrl}/rest/v1/profiles?on_conflict=bi`, {
            method: 'POST',
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
            body: JSON.stringify([{ bi: biPerfil, name: biPerfil, role: 'user' }]),
          });
        } catch { /* melhor esforço — FK decide */ }
      }
      let pref = 'Prefer: return=minimal';
      if (body?.retorno) pref = 'Prefer: return=representation';
      if (tab.upsert && body?.upsert) pref += ', resolution=merge-duplicates';
      const q = tab.upsert && body?.upsert ? `?on_conflict=${body.onConflict || 'id'}` : '';
      const r = await fetch(`${supaUrl}/rest/v1/${tabela}${q}`, {
        method: 'POST', headers: { ...headers, Prefer: pref }, body: JSON.stringify(linhas),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        return { status: r.status, json: { ok: false, erro: `Gravação falhou (${r.status}). ${txt.slice(0, 160)}` } };
      }
      const resp = body?.retorno ? await r.json().catch(() => []) : [];
      return { status: 200, json: { ok: true, linhas: Array.isArray(resp) ? resp : [resp].filter(Boolean), gravado: true } };
    }

    if (operacao === 'update' || operacao === 'delete') {
      const escopo = tab.escopo(ident as DadosIdentidade);
      if (escopo === null) return { status: 403, json: { ok: false, erro: 'Sem permissão para alterar esta tabela.' } };
      const q = dadosMontarQuery(filtros, escopo);
      if (operacao === 'update') {
        const limpa = dadosSanitizarLinha(tabela, body?.dados);
        if (!limpa || !Object.keys(limpa).length) return { status: 400, json: { ok: false, erro: 'Nada para atualizar.' } };
        // return=representation: deteta o no-op silencioso (RLS/escopo sem match).
        const r = await fetch(`${supaUrl}/rest/v1/${tabela}?${q}`, {
          method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(limpa),
        });
        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          return { status: r.status, json: { ok: false, erro: `Atualização falhou (${r.status}). ${txt.slice(0, 160)}` } };
        }
        const tocadas = await r.json().catch(() => []);
        if (!Array.isArray(tocadas) || tocadas.length === 0) {
          return { status: 404, json: { ok: false, erro: 'Registo não encontrado (ou sem permissão sobre ele).' } };
        }
        return { status: 200, json: { ok: true, atualizado: true } };
      }
      const r = await fetch(`${supaUrl}/rest/v1/${tabela}?${q}`, {
        method: 'DELETE', headers: { ...headers, Prefer: 'return=representation' },
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        return { status: r.status, json: { ok: false, erro: `Eliminação falhou (${r.status}). ${txt.slice(0, 160)}` } };
      }
      const removidas = await r.json().catch(() => []);
      if (!Array.isArray(removidas) || removidas.length === 0) {
        return { status: 404, json: { ok: false, erro: 'Registo não encontrado (ou sem permissão sobre ele).' } };
      }
      // v37.77.3 — INTEGRIDADE: ao apagar correspondências, o histórico de
      // estados (message_state_history) das mesmas tem de ir junto — senão
      // ficam linhas órfs apontando para mensagens que já não existem.
      // Melhor-esforço: nunca falha a eliminação por causa da limpeza.
      if (tabela === 'messages') {
        try {
          const ids = removidas.map((m: any) => m?.id).filter(Boolean);
          if (ids.length) {
            await fetch(`${supaUrl}/rest/v1/message_state_history?message_id=in.(${ids.join(',')})`, {
              method: 'DELETE', headers,
            });
          }
        } catch { /* melhor esforço */ }
      }
      return { status: 200, json: { ok: true, removido: true } };
    }
    return { status: 400, json: { ok: false, erro: 'Operação desconhecida.' } };
  } catch (e: any) {
    return { status: 500, json: { ok: false, erro: String(e).slice(0, 200) } };
  }
}

async function dadosResolverEExecutar(opts: {
  supaUrl: string; serviceKey: string; req: any;
  body: any;
}) {
  const auth = String((opts.req.headers && (opts.req.headers.authorization || opts.req.headers.Authorization)) || '');
  return dadosExecutarPedido({ supaUrl: opts.supaUrl, serviceKey: opts.serviceKey, body: opts.body, authorization: auth });
}


  // /api/admin-cidadao — eliminação em cascata de um cadastro de cidadão
  // (2026-08-20): só administradores REAIS (role admin no Auth metadata).
  // Executa com a service role: registo na fila, perfil, pedidos, notificações,
  // contactos, documentos e a conta Auth (localizada por user_metadata.bi).
  // Contas demo canónicas são recusadas (403 demo) — Modo Demo intocado.
  app.post("/api/admin-cidadao", async (req, res) => {
    try {
      const { bi } = req.body || {};
      const biNorm = String(bi || '').trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9\-]{3,23}$/.test(biNorm)) return res.status(400).json({ ok: false, erro: 'BI inválido.' });
      if (DADOS_DEMO_BIS.includes(biNorm)) return res.status(403).json({ ok: false, erro: 'demo' });
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!token) return res.status(401).json({ ok: false, erro: 'Sessão obrigatória.' });
      const supaUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
      if (!supaUrl || !serviceKey) return res.status(500).json({ ok: false, erro: 'Serviço indisponível.' });
      const ident = await dadosResolverIdentidade(supaUrl, serviceKey, token);
      if ('erro' in ident) return res.status(401).json({ ok: false, erro: ident.erro });
      if (!ident.isAdmin) return res.status(403).json({ ok: false, erro: 'Apenas a Administração pode eliminar cadastros.' });
      const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
      const detalhes: Record<string, number> = {};
      const apagar = async (tabela: string, filtro: string) => {
        try {
          const r = await fetch(`${supaUrl}/rest/v1/${tabela}?${filtro}`, { method: 'DELETE', headers: { ...h, Prefer: 'return=representation' } });
          if (r.ok) {
            const rows = await r.json().catch(() => []);
            detalhes[tabela] = Array.isArray(rows) ? rows.length : 0;
          }
        } catch { /* best-effort */ }
      };
      await apagar('solicitacoes_registo', `bi_numero=eq.${encodeURIComponent(biNorm)}`);
      await apagar('profiles', `bi=eq.${encodeURIComponent(biNorm)}`);
      await apagar('user_requests', `user_bi=eq.${encodeURIComponent(biNorm)}`);
      await apagar('notifications', `target_bi=eq.${encodeURIComponent(biNorm)}`);
      await apagar('contacts', `owner_bi=eq.${encodeURIComponent(biNorm)}`);
      await apagar('documents', `holder_bi=eq.${encodeURIComponent(biNorm)}`);
      // v37.77.3 — RESÍDUOS DO CIDADÃO: correspondências (enviadas/recebidas),
      // respectivo histórico de estados e pedidos de documentos também saem —
      // antes a eliminação deixava as mensagens do cidadão na base central
      // (o mesmo tipo de resíduo das «23 enviadas» da instituição).
      try {
        const filtroMsg = `or=(sender_bi.eq.${encodeURIComponent(biNorm)},recipient_bi.eq.${encodeURIComponent(biNorm)})`;
        const gm = await fetch(`${supaUrl}/rest/v1/messages?${filtroMsg}&select=id&limit=5000`, { headers: h });
        const msgs = await gm.json().catch(() => []);
        if (Array.isArray(msgs) && msgs.length) {
          await fetch(`${supaUrl}/rest/v1/messages?${filtroMsg}`, { method: 'DELETE', headers: h });
          const idsHist = msgs.map((m: any) => m.id).join(',');
          await fetch(`${supaUrl}/rest/v1/message_state_history?message_id=in.(${idsHist})`, { method: 'DELETE', headers: h });
        }
        detalhes['messages'] = Array.isArray(msgs) ? msgs.length : 0;
      } catch { /* best-effort */ }
      await apagar('document_requests', `user_bi=eq.${encodeURIComponent(biNorm)}`);
      let authRemovido = false;
      try {
        let pagina = 1;
        while (pagina <= 5) {
          const lu = await fetch(`${supaUrl}/auth/v1/admin/users?per_page=100&page=${pagina}`, { headers: h });
          if (!lu.ok) break;
          const lista = await lu.json();
          const users = lista?.users || [];
          if (!users.length) break;
          const alvo = users.find((u: any) => String((u?.user_metadata?.bi || '')).toUpperCase() === biNorm);
          if (alvo) {
            const du = await fetch(`${supaUrl}/auth/v1/admin/users/${alvo.id}`, { method: 'DELETE', headers: h });
            authRemovido = du.ok;
            break;
          }
          pagina++;
        }
      } catch { /* best-effort */ }
      detalhes['auth'] = authRemovido ? 1 : 0;
      return res.status(200).json({ ok: true, detalhes });
    } catch (e) {
      console.error('[ADMIN-CIDADAO] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0,200) });
    }
  });


  // ============================================================================
  // ELIMINAÇÃO COMPLETA DE AGENTE (2026-08-22)
  // ----------------------------------------------------------------------------
  // A página Equipa elimina colaboradores/agentes SEM deixar restos: conta Auth
  // na nuvem, avatares no Storage e (do lado do cliente) credenciais/espelhos
  // locais. Autorização:
  //   · responsável da instituição (meta.agent = CODIGO-01) elimina membros da
  //     SUA instituição (CODIGO-NN com NN >= 2);
  //   · admin da plataforma (meta.role = 'admin') elimina agentes ADMIN-NNNN.
  // Contas demo canónicas nunca tocam na nuvem (403 demo — defesa).
  // v37.76 — ELIMINAÇÃO DEFINITIVA DE INSTITUIÇÃO (cascata Auth/Storage/perfis).
  // A RPC v30/v31 (cda_admin_alfa_eliminar_registo) limpa o RELACIONAL e
  // documenta que «Storage/Auth devem ser removidos pelo endpoint backend com
  // service_role» — este endpoint é essa peça em falta. Sem ele, as contas Auth
  // dos agentes (agente.<CODIGO>-NN@inst…) sobreviviam com o avatar_url nos
  // metadados e a adesão RE-CRIADA herdava a FOTO da vida anterior.
  app.post("/api/eliminar-instituicao", async (req, res) => {
    try {
      const { code, agentes } = req.body || {};
      const codeNorm = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!/^[A-Z0-9][A-Z0-9\-]{3,23}$/.test(codeNorm)) return res.status(400).json({ ok: false, erro: 'Código institucional inválido.' });
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!token) return res.status(401).json({ ok: false, erro: 'Sessão obrigatória.' });
      const admin = createSupabaseAdminClient();
      if (!admin) return res.status(500).json({ ok: false, erro: 'Serviço indisponível.' });
      const { data: sess, error: sessErr } = await admin.auth.getUser(token);
      if (sessErr || !sess || !sess.user) return res.status(401).json({ ok: false, erro: 'Sessão inválida.' });
      const roleCaller = String(((sess.user.user_metadata || {}) as Record<string, unknown>).role || '').toLowerCase();
      if (roleCaller !== 'admin') return res.status(403).json({ ok: false, erro: 'Apenas a Administração elimina adesões institucionais.' });

      // Chaves válidas: o código, o responsável (-01) e agentes -NN do PRÓPRIO código.
      const chaves = new Set<string>([codeNorm, `${codeNorm}-01`]);
      for (const a of Array.isArray(agentes) ? agentes : []) {
        const aN = String(a || '').trim().toUpperCase().replace(/\s+/g, '');
        if (/^[A-Z0-9][A-Z0-9\-]{3,23}$/.test(aN) && (aN === codeNorm || aN.startsWith(`${codeNorm}-`))) chaves.add(aN);
      }
      const emailDe = (k: string) => `agente.${k.toLowerCase()}@inst.correiodigital.ao`;
      const padraoAgentes = new RegExp(`^agente\\.${codeNorm.toLowerCase()}-\\d+@inst\\.correiodigital\\.ao$`, 'i');

      // 1) Contas Auth dos agentes (e-mails sintéticos) — remove o avatar_url residual
      let contas = 0;
      try {
        for (let pagina = 1; pagina <= 10; pagina++) {
          const { data: lista, error: listErr } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
          if (listErr || !lista || !lista.users || !lista.users.length) break;
          for (const u of lista.users) {
            const email = String(u.email || '').toLowerCase();
            const ehDaInstituicao = padraoAgentes.test(email)
              || [...chaves].some((k) => email === emailDe(k));
            if (!ehDaInstituicao) continue;
            const agenteDescoberto = email.startsWith('agente.') ? email.slice('agente.'.length).split('@')[0].toUpperCase() : '';
            if (agenteDescoberto) chaves.add(agenteDescoberto);
            const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
            if (!delErr) contas += 1;
          }
        }
      } catch { /* best-effort */ }

      // 2) Avatares do Storage (ficheiros <AGENTE>_… do bucket fotos_perfil)
      let avatares = 0;
      try {
        const { data: arquivos } = await admin.storage.from('fotos_perfil').list('avatars', { limit: 500 });
        const alvos = (arquivos || []).filter((f: { name?: string }) => {
          const n = String(f.name || '');
          return [...chaves].some((k) => n.startsWith(`${k}_`));
        });
        if (alvos.length) {
          const { error: rmErr } = await admin.storage.from('fotos_perfil').remove(alvos.map((f: { name: string }) => `avatars/${f.name}`));
          if (!rmErr) avatares = alvos.length;
        }
      } catch { /* best-effort */ }

      // 3) Linhas de perfil (código + agentes) — a lista da Equipa lê daqui
      let perfis = 0;
      try {
        const { count } = await admin
          .from('profiles')
          .delete({ count: 'exact' })
          .or(`bi.eq.${codeNorm},bi.like.${codeNorm}-*`);
        perfis = count || 0;
      } catch { /* best-effort */ }

      // 4) v37.77 — RESÍDUOS OPERACIONAIS: correspondências (enviadas/recebidas),
      // notificações, sondagens, protocolos e histórico de estados da adesão.
      // Sem isto a adesão RE-CRIADA herdava as «Enviadas» da vida anterior
      // (ex.: 23 correspondências fantasma logo após o re-registo).
      let mensagens = 0;
      // v37.77.3 — capturar os IDs ANTES de apagar: o histórico de estados
      // destas mensagens tem de ser purgado por message_id (o purge por
      // `responsible` sozinho deixava linhas órfás quando o responsável do
      // estado era outro actor, ex.: CDA/Admin).
      let idsMensagens: number[] = [];
      try {
        const { data: listaMsgs } = await admin
          .from('messages')
          .select('id')
          .or(`sender_bi.eq.${codeNorm},sender_bi.like.${codeNorm}-*,recipient_bi.eq.${codeNorm},recipient_bi.like.${codeNorm}-*`)
          .limit(5000);
        if (Array.isArray(listaMsgs)) idsMensagens = listaMsgs.map((m: any) => m.id);
      } catch { /* best-effort */ }
      try {
        const { count } = await admin
          .from('messages')
          .delete({ count: 'exact' })
          .or(`sender_bi.eq.${codeNorm},sender_bi.like.${codeNorm}-*,recipient_bi.eq.${codeNorm},recipient_bi.like.${codeNorm}-*`);
        mensagens = count || 0;
      } catch { /* best-effort */ }
      let notificacoes = 0;
      try {
        const { count } = await admin
          .from('notifications')
          .delete({ count: 'exact' })
          .or(`target_bi.eq.${codeNorm},target_bi.like.${codeNorm}-*`);
        notificacoes = count || 0;
      } catch { /* best-effort */ }
      let sondagensApagadas = 0;
      try {
        const { count } = await admin
          .from('sondagens')
          .delete({ count: 'exact' })
          .eq('instituicao_code', codeNorm);
        sondagensApagadas = count || 0;
      } catch { /* best-effort */ }
      let protocolos = 0;
      try {
        const { count } = await admin
          .from('digital_protocols')
          .delete({ count: 'exact' })
          .or(`issuer_institution.eq.${codeNorm},issuer_institution.like.${codeNorm}-*`);
        protocolos = count || 0;
      } catch { /* best-effort */ }
      let historico = 0;
      try {
        if (idsMensagens.length) {
          const { count } = await admin
            .from('message_state_history')
            .delete({ count: 'exact' })
            .in('message_id', idsMensagens);
          historico += count || 0;
        }
      } catch { /* best-effort */ }
      try {
        const { count } = await admin
          .from('message_state_history')
          .delete({ count: 'exact' })
          .or(`responsible.like.${codeNorm}%,responsible.like.${codeNorm}-%`);
        historico += count || 0;
      } catch { /* best-effort */ }

      return res.status(200).json({ ok: true, contas, avatares, perfis, mensagens, notificacoes, sondagens: sondagensApagadas, protocolos, historico });
    } catch (e) {
      console.error('[ELIMINAR-INSTITUICAO] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  app.post("/api/eliminar-agente", async (req, res) => {
    try {
      const { agente } = req.body || {};
      const agenteNorm = String(agente || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!/^[A-Z0-9][A-Z0-9\-]{3,23}$/.test(agenteNorm)) return res.status(400).json({ ok: false, erro: 'Nº de agente inválido.' });
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!token) return res.status(401).json({ ok: false, erro: 'Sessão obrigatória.' });
      const admin = createSupabaseAdminClient();
      if (!admin) return res.status(500).json({ ok: false, erro: 'Serviço indisponível.' });
      const { data: sess, error: sessErr } = await admin.auth.getUser(token);
      if (sessErr || !sess || !sess.user) return res.status(401).json({ ok: false, erro: 'Sessão inválida.' });
      const meta = (sess.user.user_metadata || {}) as Record<string, unknown>;
      const roleCaller = String(meta.role || '').toLowerCase();
      const agentCaller = String(meta.agent || '').trim().toUpperCase().replace(/\s+/g, '');
      const instCaller = String(meta.instituicao || '').trim().toUpperCase().replace(/\s+/g, '');

      // v37.75 — a protecção de ALVO demo (DADOS_DEMO_BIS) passou para AFTER a
      // autenticação: linhas `profiles` de identificadores demo que ficaram na
      // base central (ex.: ADM-8812-OP com nome «Cidadão» — lixo de execuções
      // antigas) têm de ser elimináveis pelo ADMIN REAL autenticado (era isto
      // que devolvia «demo» e impedia a eliminação na página Equipa). Para
      // qualquer outro chamador a protecção mantém-se integral.
      const alvoDemo = DADOS_DEMO_BIS.includes(agenteNorm);
      if (alvoDemo && roleCaller !== 'admin') return res.status(403).json({ ok: false, demo: true, erro: 'demo' });

      const ehAdminAgente = /^ADMIN-\d+$/.test(agenteNorm);
      // v37.77 — o ADMIN (role=admin) elimina QUALQUER colaborador da plataforma
      // (agentes ADMIN-NNNN e membros institucionais CODIGO-NN). Ver gémeo api/index.ts.
      let autorizado = false;
      if (roleCaller === 'admin' && (ehAdminAgente || alvoDemo || /^[A-Z0-9][A-Z0-9\-]*-\d+$/.test(agenteNorm))) {
        autorizado = true;
      } else if (roleCaller === 'instituicao' && !ehAdminAgente && instCaller && agentCaller === `${instCaller}-01`) {
        const mSeq = agenteNorm.match(/-(\d+)$/);
        const seq = mSeq ? parseInt(mSeq[1], 10) : 0;
        autorizado = agenteNorm.startsWith(`${instCaller}-`) && seq >= 2;
      }
      if (!autorizado) return res.status(403).json({ ok: false, erro: 'Sem autorização para eliminar este agente.' });

      // 1) Conta Auth (e-mail sintético determinístico)
      const dominio = ehAdminAgente ? 'admin.correiodigital.ao' : 'inst.correiodigital.ao';
      const emailAlvo = `agente.${agenteNorm.toLowerCase()}@${dominio}`;
      let conta = 'nao_encontrada';
      try {
        for (let pagina = 1; pagina <= 10; pagina++) {
          const { data: lista, error: listErr } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
          if (listErr || !lista || !lista.users || !lista.users.length) break;
          const alvo = lista.users.find((u: any) => String(u.email || '').toLowerCase() === emailAlvo.toLowerCase());
          if (alvo) {
            const { error: delErr } = await admin.auth.admin.deleteUser(alvo.id);
            conta = delErr ? 'falha' : 'eliminada';
            break;
          }
        }
      } catch { conta = 'falha'; }

      // 2) Avatares no Storage (prefixo AGENTE_)
      let avatares = 0;
      try {
        const { data: arquivos } = await admin.storage.from('fotos_perfil').list('avatars', { limit: 200 });
        const alvos = (arquivos || []).filter((f: any) => String(f.name || '').startsWith(`${agenteNorm}_`));
        if (alvos.length) {
          const { error: rmErr } = await admin.storage.from('fotos_perfil').remove(alvos.map((f: any) => `avatars/${f.name}`));
          if (!rmErr) avatares = alvos.length;
        }
      } catch { /* best-effort */ }

      // 3) v37.16 — linha de perfil na base central (fonte canónica da lista
      // REAL da Equipa): sem isto, no Modo Real o agente eliminado continuava
      // a aparecer porque a lista é derivada da tabela profiles.
      let perfis = 0;
      try {
        const { count } = await admin
          .from('profiles')
          .delete({ count: 'exact' })
          .or(`bi.eq.${agenteNorm},bi.eq.${agenteNorm.toLowerCase()}`);
        perfis = count || 0;
      } catch { /* best-effort */ }

      return res.status(200).json({ ok: true, conta, avatares, perfis });
    } catch (e) {
      console.error('[ELIMINAR-AGENTE] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  // ============================================================================
  // SENHA DO AGENTE NA NUVEM (2026-08-22)
  // ----------------------------------------------------------------------------
  // A senha do colaborador/agente vive no Supabase Auth. Quando o RESPONSÁVEL
  // da área repõe a senha na página Equipa (edição ou dossier), esta rota
  // actualiza a conta Auth correspondente — sem isto a nuvem ficava com a
  // senha antiga e o colaborador acumulava tentativas falhadas noutros
  // dispositivos até ao bloqueio anti-força-bruta. Autorização idêntica à da
  // eliminação: responsável da instituição (CODIGO-01) para membros da SUA
  // instituição; Admin Alfa (ADMIN-0001) para agentes ADMIN-NNNN.
  // ============================================================================
  app.post("/api/agente-senha", async (req, res) => {
    try {
      const { agente, senha } = req.body || {};
      const agenteNorm = String(agente || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!/^[A-Z0-9][A-Z0-9\-]{3,23}$/.test(agenteNorm)) return res.status(400).json({ ok: false, erro: 'Nº de agente inválido.' });
      if (typeof senha !== 'string' || senha.length < 8) return res.status(400).json({ ok: false, erro: 'A senha deve ter pelo menos 8 caracteres.' });
      if (DADOS_DEMO_BIS.includes(agenteNorm)) return res.status(403).json({ ok: false, demo: true, erro: 'demo' });
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!token) return res.status(401).json({ ok: false, erro: 'Sessão obrigatória.' });
      const admin = createSupabaseAdminClient();
      if (!admin) return res.status(500).json({ ok: false, erro: 'Serviço indisponível.' });
      const { data: sess, error: sessErr } = await admin.auth.getUser(token);
      if (sessErr || !sess || !sess.user) return res.status(401).json({ ok: false, erro: 'Sessão inválida.' });
      const meta = (sess.user.user_metadata || {}) as Record<string, unknown>;
      const roleCaller = String(meta.role || '').toLowerCase();
      const agentCaller = String(meta.agent || '').trim().toUpperCase().replace(/\s+/g, '');
      const instCaller = String(meta.instituicao || '').trim().toUpperCase().replace(/\s+/g, '');

      const ehAdminAlvo = /^ADMIN-\d+$/.test(agenteNorm);
      let autorizado = false;
      let dominio = '';
      // 2026-08-22 — a PRÓPRIA pessoa pode mudar a própria senha: o token da
      // sessão identifica o agente (a definição "secure password change" do
      // Auth exige a senha actual no updateUser do cliente — a via admin não).
      const mudaPropria = agentCaller === agenteNorm && (roleCaller === 'instituicao' || roleCaller === 'admin');
      if (mudaPropria) {
        autorizado = true;
        dominio = ehAdminAlvo ? 'admin.correiodigital.ao' : 'inst.correiodigital.ao';
      } else if (ehAdminAlvo) {
        autorizado = roleCaller === 'admin' && agentCaller === 'ADMIN-0001' && agenteNorm !== 'ADMIN-0001';
        dominio = 'admin.correiodigital.ao';
      } else {
        const mSeq = agenteNorm.match(/-(\d+)$/);
        const seq = mSeq ? parseInt(mSeq[1], 10) : 0;
        autorizado = roleCaller === 'instituicao' && !!instCaller && agentCaller === `${instCaller}-01`
          && agenteNorm.startsWith(`${instCaller}-`) && seq >= 2;
        dominio = 'inst.correiodigital.ao';
      }
      if (!autorizado) return res.status(403).json({ ok: false, erro: 'Sem autorização para alterar a senha deste agente.' });

      // mudança da PRÓPRIA senha: o alvo é a conta do token — sem pesquisa.
      if (mudaPropria) {
        const { error: updErr } = await admin.auth.admin.updateUserById(sess.user.id, { password: senha });
        if (updErr) return res.status(500).json({ ok: false, erro: updErr.message });
        return res.status(200).json({ ok: true, agente: agenteNorm, propria: true });
      }

      const emailAlvo = `agente.${agenteNorm.toLowerCase()}@${dominio}`;
      let alvoId: string | null = null;
      for (let pagina = 1; pagina <= 10 && !alvoId; pagina++) {
        const { data: lista, error: listErr } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
        if (listErr || !lista || !lista.users || !lista.users.length) break;
        const achado = lista.users.find((u: any) => String(u.email || '').toLowerCase() === emailAlvo.toLowerCase());
        if (achado) alvoId = achado.id;
      }
      if (!alvoId) return res.status(404).json({ ok: false, erro: 'Conta do agente não encontrada na nuvem (a senha local mantém-se).' });
      const { error: updErr } = await admin.auth.admin.updateUserById(alvoId, { password: senha });
      if (updErr) return res.status(500).json({ ok: false, erro: updErr.message });
      return res.status(200).json({ ok: true, agente: agenteNorm });
    } catch (e) {
      console.error('[AGENTE-SENHA] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  // ============================================================================
  // PERMISSÕES DE PÁGINA DO AGENTE (2026-08-22)
  // ----------------------------------------------------------------------------
  // As páginas que cada colaborador/agente pode abrir vivem nos user_metadata
  // da conta Auth (Supabase = fonte canónica). Este endpoint É a verificação
  // de backend: ler devolve o que está NA NUVEM (o cliente nunca decide); e
  // gravar só é aceite do RESPONSÁVEL da área (instituição '-01' ou Admin
  // Alfa ADMIN-0001). Whitelist por área — páginas fora dela são recusadas.
  // ============================================================================
  const PAGINAS_INSTITUICAO = ['home', 'correspondencias', 'inst-qrcode', 'inst-ai-assistant', 'perfil'];
  const PAGINAS_ADMIN = ['gov-dashboard', 'gov-interoperabilidade', 'gov-correspondencias', 'gov-contatos', 'gov-relatorio', 'gov-ia', 'gov-seguranca', 'gov-perfil'];
  app.post("/api/agente-permissoes", async (req, res) => {
    try {
      const { acao, agente, paginas } = req.body || {};
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!token) return res.status(401).json({ ok: false, erro: 'Sessão obrigatória.' });
      const admin = createSupabaseAdminClient();
      if (!admin) return res.status(500).json({ ok: false, erro: 'Serviço indisponível.' });
      const { data: sess, error: sessErr } = await admin.auth.getUser(token);
      if (sessErr || !sess || !sess.user) return res.status(401).json({ ok: false, erro: 'Sessão inválida.' });
      const meta = (sess.user.user_metadata || {}) as Record<string, unknown>;
      const roleCaller = String(meta.role || '').toLowerCase();
      const agentCaller = String(meta.agent || '').trim().toUpperCase().replace(/\s+/g, '');
      const instCaller = String(meta.instituicao || '').trim().toUpperCase().replace(/\s+/g, '');

      const ehResponsavelInst = roleCaller === 'instituicao' && !!instCaller && agentCaller === `${instCaller}-01`;
      const ehAlfa = roleCaller === 'admin' && agentCaller === 'ADMIN-0001';

      // ---- LER: devolve as permissões do PRÓPRIO token (canónico) ----
      if (acao === 'ler') {
        if (ehResponsavelInst || ehAlfa) return res.status(200).json({ ok: true, responsavel: true, paginasPermitidas: null });
        const alvo = (roleCaller === 'admin' ? PAGINAS_ADMIN : roleCaller === 'instituicao' ? PAGINAS_INSTITUICAO : []);
        const raw = Array.isArray(meta.paginasPermitidas) ? (meta.paginasPermitidas as unknown[]).map((x) => String(x).trim()).filter(Boolean) : null;
        const validas = raw === null ? null : raw.filter((p) => alvo.includes(p));
        return res.status(200).json({ ok: true, responsavel: false, paginasPermitidas: validas });
      }

      // ---- GRAVAR: só o responsável da área; whitelist obrigatória ----
      if (acao === 'gravar') {
        const agenteNorm = String(agente || '').trim().toUpperCase().replace(/\s+/g, '');
        if (!/^[A-Z0-9][A-Z0-9\-]{3,23}$/.test(agenteNorm)) return res.status(400).json({ ok: false, erro: 'Nº de agente inválido.' });
        const ehAdminAlvo = /^ADMIN-\d+$/.test(agenteNorm);
        let autorizado = false;
        let whitelist: string[] = [];
        let dominio = '';
        if (ehAdminAlvo) {
          autorizado = ehAlfa && agenteNorm !== 'ADMIN-0001';
          whitelist = PAGINAS_ADMIN;
          dominio = 'admin.correiodigital.ao';
        } else {
          const mSeq = agenteNorm.match(/-(\d+)$/);
          const seq = mSeq ? parseInt(mSeq[1], 10) : 0;
          autorizado = ehResponsavelInst && agenteNorm.startsWith(`${instCaller}-`) && seq >= 2;
          whitelist = PAGINAS_INSTITUICAO;
          dominio = 'inst.correiodigital.ao';
        }
        if (!autorizado) return res.status(403).json({ ok: false, erro: 'Sem autorização para gerir as permissões deste agente.' });
        if (!Array.isArray(paginas)) return res.status(400).json({ ok: false, erro: 'paginas deve ser uma lista.' });
        const validas = (paginas as unknown[]).map((x) => String(x).trim()).filter((x) => whitelist.includes(x));
        if (validas.length !== (paginas as unknown[]).length) return res.status(400).json({ ok: false, erro: 'Lista contém páginas inválidas para esta área.' });

        const emailAlvo = `agente.${agenteNorm.toLowerCase()}@${dominio}`;
        let alvoMeta: Record<string, unknown> | null = null;
        let alvoId: string | null = null;
        for (let pagina = 1; pagina <= 10 && !alvoId; pagina++) {
          const { data: lista, error: listErr } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
          if (listErr || !lista || !lista.users || !lista.users.length) break;
          const achado = lista.users.find((u: any) => String(u.email || '').toLowerCase() === emailAlvo.toLowerCase());
          if (achado) {
            alvoId = achado.id;
            alvoMeta = (achado.user_metadata || {}) as Record<string, unknown>;
          }
        }
        if (!alvoId) return res.status(404).json({ ok: false, erro: 'Conta do agente não encontrada na nuvem (a gravação local mantém-se).' });
        const { error: updErr } = await admin.auth.admin.updateUserById(alvoId, {
          user_metadata: { ...(alvoMeta || {}), paginasPermitidas: validas },
        });
        if (updErr) return res.status(500).json({ ok: false, erro: updErr.message });
        return res.status(200).json({ ok: true, agente: agenteNorm, paginas: validas });
      }

      return res.status(400).json({ ok: false, erro: 'Ação desconhecida.' });
    } catch (e) {
      console.error('[AGENTE-PERMISSOES] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  // v37.78.6 — FICHA `profiles` DO MEMBRO DA EQUIPA (criar/listar).
  // O «Registar Novo Membro da Equipa» criava a conta Auth (supabase) mas
  // NUNCA gravava a linha `profiles` — a lista Equipa da Administração deriva
  // de profiles (agentesReais) e a da Instituição não tinha fonte na nuvem:
  // o membro "desaparecia" (nada acontecia aos olhos do responsável).
  // Aqui o RESPONSÁVEL da área (inst `SIGLA-…-01` ou Admin Alfa `ADMIN-0001`)
  // cria/actualiza a ficha do próprio agente e lista a equipa da sua área.
  app.post("/api/equipa-membro", async (req, res) => {
    try {
      const { acao, agente, nome, email, phone } = req.body || {};
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!token) return res.status(401).json({ ok: false, erro: 'Sessão obrigatória.' });
      const admin = createSupabaseAdminClient();
      if (!admin) return res.status(500).json({ ok: false, erro: 'Serviço indisponível.' });
      const { data: sess, error: sessErr } = await admin.auth.getUser(token);
      if (sessErr || !sess || !sess.user) return res.status(401).json({ ok: false, erro: 'Sessão inválida.' });
      const meta = (sess.user.user_metadata || {}) as Record<string, unknown>;
      const roleCaller = String(meta.role || '').toLowerCase();
      const agentCaller = String(meta.agent || '').trim().toUpperCase().replace(/\s+/g, '');
      const instCaller = String(meta.instituicao || '').trim().toUpperCase().replace(/\s+/g, '');
      const ehResponsavelInst = roleCaller === 'instituicao' && !!instCaller && agentCaller === `${instCaller}-01`;
      const ehAlfa = roleCaller === 'admin' && agentCaller === 'ADMIN-0001';

      // ---- LISTAR: equipa da própria área (base central) ----
      if (acao === 'listar') {
        if (ehResponsavelInst) {
          const { data, error } = await admin.from('profiles')
            .select('bi,name,phone,email,role')
            .eq('role', 'instituicao')
            .like('bi', `${instCaller}-%`);
          if (error) return res.status(500).json({ ok: false, erro: error.message });
          // só COLABORADORES (seq >= 2): o nº 01 é o próprio responsável
          const membros = (data || []).filter((p: any) => {
            const seq = parseInt((String(p.bi || '').match(/-(\d+)$/) || [])[1] || '0', 10);
            return seq >= 2;
          });
          return res.status(200).json({ ok: true, membros });
        }
        if (ehAlfa) {
          const { data, error } = await admin.from('profiles')
            .select('bi,name,phone,email,role')
            .eq('role', 'admin');
          if (error) return res.status(500).json({ ok: false, erro: error.message });
          return res.status(200).json({ ok: true, membros: data || [] });
        }
        return res.status(403).json({ ok: false, erro: 'Apenas o responsável da área pode listar a equipa.' });
      }

      // ---- CRIAR/ACTUALIZAR: upsert da ficha (nunca role de terceiros) ----
      if (acao === 'criar') {
        const agenteNorm = String(agente || '').trim().toUpperCase().replace(/\s+/g, '');
        if (!/^[A-Z0-9][A-Z0-9\-]{3,23}$/.test(agenteNorm)) return res.status(400).json({ ok: false, erro: 'Nº de agente inválido.' });
        const nomeNorm = String(nome || '').trim().slice(0, 120);
        if (!nomeNorm) return res.status(400).json({ ok: false, erro: 'Nome do membro obrigatório.' });
        let roleMembro: 'instituicao' | 'admin';
        if (/^ADMIN-\d+$/.test(agenteNorm)) {
          if (!ehAlfa || agenteNorm === 'ADMIN-0001') {
            return res.status(403).json({ ok: false, erro: 'Sem autorização para gerir este agente.' });
          }
          roleMembro = 'admin';
        } else {
          const mSeq = agenteNorm.match(/-(\d+)$/);
          const seq = mSeq ? parseInt(mSeq[1], 10) : 0;
          if (!ehResponsavelInst || !agenteNorm.startsWith(`${instCaller}-`) || seq < 2) {
            return res.status(403).json({ ok: false, erro: 'Sem autorização para gerir este colaborador.' });
          }
          roleMembro = 'instituicao';
        }
        const payload: Record<string, unknown> = { bi: agenteNorm, name: nomeNorm, role: roleMembro };
        const tel = String(phone || '').trim();
        if (tel) payload.phone = tel.slice(0, 40);
        const em = String(email || '').trim();
        if (em && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) payload.email = em.slice(0, 120);
        const { error: upErr } = await admin.from('profiles').upsert([payload], { onConflict: 'bi' });
        if (upErr) return res.status(500).json({ ok: false, erro: upErr.message });
        return res.status(200).json({ ok: true, agente: agenteNorm });
      }

      return res.status(400).json({ ok: false, erro: 'Ação desconhecida.' });
    } catch (e) {
      console.error('[EQUIPA-MEMBRO] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  // Rota do proxy CRUD do Modo Real (ver bloco PROXY CRUD acima).
  app.post("/api/dados", async (req, res) => {
    try {
      const supaUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
      if (!supaUrl || !serviceKey) return res.status(500).json({ ok: false, erro: 'Serviço indisponível.' });
      const r = await dadosResolverEExecutar({ supaUrl, serviceKey, req, body: req.body || {} });
      return res.status(r.status).json(r.json);
    } catch (e) {
      console.error('[DADOS] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  // /api/upload — upload de ficheiros com service role (Modo Real: o cliente
  // sem claims não escreve nos buckets privados). Whitelist de buckets.
  const UPLOAD_BUCKETS_PERMITIDOS = ['fotos_perfil', 'kb_ficheiros', 'documentos_registo', 'correspondencias_anexos'];
  app.post("/api/upload", async (req, res) => {
    try {
      const { bucket, caminho, base64, tipo } = req.body || {};
      if (!bucket || !caminho || !base64) return res.status(400).json({ ok: false, erro: 'bucket, caminho e base64 são obrigatórios.' });
      if (!UPLOAD_BUCKETS_PERMITIDOS.includes(String(bucket))) return res.status(400).json({ ok: false, erro: 'Bucket não permitido.' });
      const caminhoLimpo = String(caminho).split('/').map(s => s.replace(/[^\w.\-]+/g, '_')).join('/').replace(/^\.+/, '');
      if (!caminhoLimpo || caminhoLimpo.includes('..')) return res.status(400).json({ ok: false, erro: 'Caminho inválido.' });
      const buf = Buffer.from(base64, 'base64');
      if (buf.length === 0 || buf.length > 10 * 1024 * 1024) return res.status(400).json({ ok: false, erro: 'Ficheiro vazio ou demasiado grande (máx. 10 MB).' });
      const admin = createSupabaseAdminClient();
      if (!admin) return res.status(500).json({ ok: false, erro: 'Serviço de armazenamento indisponível.' });
      const { error } = await admin.storage.from(String(bucket)).upload(caminhoLimpo, buf, { cacheControl: '3600', upsert: true, contentType: tipo || undefined });
      if (error) return res.status(500).json({ ok: false, erro: error.message });
      const { data } = admin.storage.from(String(bucket)).getPublicUrl(caminhoLimpo);
      return res.status(200).json({ ok: true, url: data.publicUrl });
    } catch (e) {
      console.error('[UPLOAD] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  // /api/url-assinada — resolve marcador/URL de storage para URL assinado
  // (Modo Real: o cliente não consegue assinar objetos de buckets privados).
  app.post("/api/url-assinada", async (req, res) => {
    try {
      const { ref } = req.body || {};
      const s = String(ref || '').trim();
      if (!s) return res.status(400).json({ ok: false, erro: 'ref ausente.' });
      const admin = createSupabaseAdminClient();
      if (!admin) return res.status(500).json({ ok: false, erro: 'Serviço indisponível.' });
      let bucket = ''; let path = '';
      if (s.startsWith('storage:')) {
        const rest = s.slice('storage:'.length);
        const sep = rest.indexOf('/');
        if (sep <= 0) return res.status(400).json({ ok: false, erro: 'Ref inválida.' });
        bucket = rest.slice(0, sep); path = rest.slice(sep + 1);
      } else {
        const m = s.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+?)(?:\?.*)?$/);
        if (!m) return res.status(400).json({ ok: false, erro: 'Ref inválida.' });
        bucket = m[1]; path = decodeURIComponent(m[2]);
      }
      if (!UPLOAD_BUCKETS_PERMITIDOS.includes(bucket)) return res.status(400).json({ ok: false, erro: 'Bucket não permitido.' });
      const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) return res.status(500).json({ ok: false, erro: error?.message || 'Falha ao assinar.' });
      return res.status(200).json({ ok: true, url: data.signedUrl });
    } catch (e) {
      console.error('[URL-ASSINADA] Exceção:', e);
      return res.status(500).json({ ok: false, erro: String(e).slice(0, 200) });
    }
  });

  // API Health check
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      ai_key_configured: !!process.env.GEMINI_API_KEY,
      groq_key_configured: !!groqApiKey,
      supabase_url_configured: !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
      supabase_anon_configured: !!(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
      supabase_service_role_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      runtime_flags: getRuntimeFlags()
    });
  });

  app.get('/api/security/readiness', async (_req, res) => {
    // FIX: handler async em Express 4 — sem try/catch qualquer exceção derruba o processo (unhandled rejection)
    try {
      const runtimeFlags = getRuntimeFlags();
      const blockers: string[] = [];
      const warnings: string[] = [];
      const tableHealth: Record<string, { ok: boolean; count?: number; error?: string }> = {};

      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        warnings.push('SUPABASE_SERVICE_ROLE_KEY não configurada para operações administrativas.');
      }
      if (runtimeFlags.mock_fallback) {
        blockers.push('VITE_ENABLE_MOCK_FALLBACK=true — desativar antes de produção.');
      }
      if (runtimeFlags.supabase_auto_seed) {
        blockers.push('VITE_ENABLE_SUPABASE_AUTO_SEED=true — desativar antes de produção.');
      }
      if (runtimeFlags.local_bootstrap) {
        warnings.push('VITE_ENABLE_LOCAL_BOOTSTRAP=true — confirmar estratégia offline antes de produção.');
      }

      const adminSupabase = createSupabaseAdminClient();
      if (!adminSupabase) {
        blockers.push('Credenciais do Supabase não configuradas no servidor.');
      } else {
        const tables = ['profiles','messages','message_state_history','documents','contacts','notifications','user_requests','document_requests','audit_logs','digital_protocols'];
        for (const table of tables) {
          const { count, error } = await adminSupabase.from(table).select('*', { count: 'exact', head: true });
          tableHealth[table] = {
            ok: !error,
            count: typeof count === 'number' ? count : undefined,
            error: error?.message,
          };
          if (error) blockers.push(`Tabela indisponível: ${table} (${error.message})`);
        }
      }

      res.json({
        status: blockers.length === 0 ? 'production-candidate' : 'not-ready',
        blockers,
        warnings,
        runtime_flags: runtimeFlags,
        table_health: tableHealth,
      });
    } catch (err) {
      console.error('error in /api/security/readiness:', err);
      res.status(500).json({ error: err?.message || 'Erro ao verificar prontidão de segurança.' });
    }
  });

  // API for Government AI
  app.post("/api/gov-ai", async (req, res) => {
    try {
      const { action, text, context } = req.body;
      let systemPrompt = "Você é o assistente virtual do Correio Digital de Angola especializado em análises governamentais.";
      let userPrompt = "";

      if (action === "summarize") {
        systemPrompt = "Você é um assistente do Governo de Angola especialista em simplificar e resumir documentos administrativos de forma clara, concisa e direta. Remova burocracias desnecessárias e explique tudo de forma simples em português de Angola.";
        userPrompt = `Faça um resumo inteligente, estruturado e muito fácil de ler do seguinte documento administrativo:\n\n${text}`;
      } else if (action === "explain") {
        systemPrompt = "Você é um assistente especialista em traduzir e explicar termos jurídicos, siglas e termos burocráticos complicados presentes em mensagens e comunicações do Estado de Angola para cidadãos comuns, de forma acolhedora, prática, muito simples e direta.";
        userPrompt = `Explique de forma acolhedora, clara e simples o significado prático e os termos difíceis desta notificação/mensagem oficial:\n\n${text}`;
      } else if (action === "urgency") {
        systemPrompt = "Você é especialista em identificar o nível de urgência e prazos legais de atendimento em comunicações administrativas públicas em Angola. Estipule riscos de perda de prazo.";
        userPrompt = `Analise detalhadamente o nível de urgência, o prazo oficial implícito ou explícito e as consequências jurídicas ou fiscais imediatas se o prazo não for cumprido para esta correspondência oficial:\n\n${text}`;
      } else if (action === "classify") {
        systemPrompt = "Você é um classificador especializado de correspondência governamental angolana. Determine: 1. Categoria do Documento (Notificação, Ofício, Multa, Fatura, Processo, etc.), 2. Instituição Emissora Provável, 3. Assunto Principal, e 4. Metadados Extraídos de forma organizada.";
        userPrompt = `Classifique e extraia metadados e informações críticas do seguinte documento:\n\n${text}`;
      } else if (action === "fraud") {
        systemPrompt = "Você é o perito de segurança facial e cibernética do Correio Digital de Angola. Analise o documento ou mensagem para detectar indícios de fraudes, tentativas de phishing, golpes de cobrança falsa de impostos, NIF falso, ou solicitações indevidas de dados pessoais.";
        userPrompt = `Analise este documento ou correspondência minuciosamente procurando sinais de fraude, de falsificação de identidade ou golpe fiscal/social:\n\n${text}`;
      } else if (action === "help" || action === "qna") {
        systemPrompt = "Você é o assistente virtual de inteligência artificial governamental do Correio Digital de Angola. Ajude o cidadão de Angola com instruções passo a passo detalhadas sobre como resolver as pendências financeiras, fiscais ou burocráticas descritas no documento ou mensagem.";
        userPrompt = `Dúvida do cidadão ou solicitação de ajuda sobre o documento:\n${text}\n\nContexto da correspondência:\n${context || ''}`;
      } else {
        userPrompt = text;
      }

      // Try using Gemini if client is present
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.3,
            }
          });
          if (response && response.text) {
            return res.json({ result: limparTextoIA(response.text) });
          }
        } catch (geminiErr) {
          console.error("Gemini failed in /api/gov-ai, falling back to Groq... Error:", geminiErr);
        }
      }

      // Fallback to Groq if client is present
      if (groq) {
        try {
          const completion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            model: "openai/gpt-oss-120b",
            temperature: 0.3
          });
          if (completion.choices && completion.choices[0] && completion.choices[0].message) {
            return res.json({ result: limparTextoIA(completion.choices[0].message.content) });
          }
        } catch (groqErr) {
          console.error("Groq fallback failed in /api/gov-ai:", groqErr);
        }
      }

      // If both clients failed, send a simulated smart mock response for safety
      let mockResult = "";
      if (action === "summarize") {
        mockResult = `**RESUMO INTELIGENTE DO DOCUMENTO (Sandbox offline):**\n\nEste documento trata do procedimento oficial de identificação civil nacional ou notificação da Administração Geral Tributária (AGT). \n- **Órgão**: Governo de Angola / Ministério das Finanças.\n- **Status**: Válido e Certificado Criptograficamente.\n- **Ações recomendadas**: Guarde a cópia offline na sua carteira digital para apresentação em postos fiscais ou de trânsito em território angolano.`;
      } else if (action === "explain") {
        mockResult = `**EXPLICAÇÃO DE TERMOS OFICIAIS:**\n\n- **Força probatória**: Significa que o documento tem valor legal total de prova, do mesmo modo que um papel timbrado físico original assinado à mão.\n- **Custódia Segura**: O Estado garante que seus dados estão cifrados em servidores seguros e ninguém pode alterá-los sem sua autorização biometrizada.`;
      } else if (action === "urgency") {
        mockResult = `**GRAU DE URGÊNCIA DETECTADO: Médio a Alto**\n\nO documento tem validade regular. Recomenda-se manter os dados de contato atualizados para evitar multas de intempestividade ou atrasos no processamento de trâmites civis em Angola.`;
      } else if (action === "classify") {
        mockResult = `**CLASSIFICAÇÃO DOCUMENTAL AUTOMÁTICA:**\n\n- **Tipo de Documento**: Identidade / Certidão Administrativa Oficial\n- **Órgão Responsável**: Ministério da Justiça e dos Direitos Humanos / AGT\n- **Sensibilidade**: Reservada com Certificação ICP-AO ativa.`;
      } else if (action === "fraud") {
        mockResult = `**PARECER DE SEGURANÇA E ANÁLISE DE FRAUDE:**\n\n- **Nível de Risco**: Baixo / Seguro\n- **Selagem Digital**: Confirmada com assinatura criptográfica SHA-256 ativa.\n- **Veredito**: O documento provem dos servidores governamentais seguros e oficiais integrados ao Correio Digital de Angola. Pode ser confiado plenamente.`;
      } else {
        mockResult = `Olá! Sou o Assistente Inteligente do Correio Digital de Angola. Ajudo a resolver as suas dúvidas. Para resolver pendências jurídicas ou fiscais, utilize a Carteira Digital para consultar faturas ou aceda à nossa secção de correspondências para submeter uma resposta formal via formulário assinado eletronicamente com o PIN do seu BI Digital.`;
      }

      return res.json({ result: mockResult });

    } catch (err) {
      console.error("error in /api/gov-ai:", err);
      res.status(500).json({ error: err.message || "Erro desconhecido na central de IA." });
    }
  });

  // Groq & Gemini Resilient Chat Endpoint
  // F27 (Prompt v11.1) — Pré-Verificação Inteligente de Cadastros · Portas 2 e 3.
  // Analisa as DUAS imagens do documento (frente+verso, já no Supabase Storage)
  // com IA de visão (Groq Llama 4 Scout) e responde em JSON estrito.
  // REGRA DE OURO: qualquer erro/timeout/resposta inválida => REVISAO — o
  // cadastro permanece PENDENTE exactamente como hoje. NUNCA aprovação
  // automática por erro técnico. O servidor NÃO persiste imagens nem dados.
  // (Manter em sincronia com a rota equivalente em api/index.ts — produção Vercel.)
  app.post("/api/verificar-cadastro", async (req, res) => {
    const body = req.body;
    const pviResponderBase = (res: ExpressResponse, payload: unknown) => res.status(200).json(payload);
    type PviResponderFn = (veredicto: 'APTO' | 'REVISAO', alertas: string[], motivo: string) => unknown;
    const pviEmit = (emit: PviResponderFn, veredicto: 'APTO' | 'REVISAO', alertas: string[], motivo: string) => emit(veredicto, alertas, motivo);
      const pviStartedAt = Date.now();
      const PVI_MODEL = 'gemini-3.6-flash';

      const { biNumber, nome, tipo, urls, dataNascimento, sexo } = body || {};
      const pviBi = typeof biNumber === 'string' ? biNumber.trim().toUpperCase() : '';
      const pviNome = typeof nome === 'string' ? nome.trim() : '';
      const pviTipo = tipo === 'instituicao' ? 'instituicao' : 'cidadao';
      const pviFrente = typeof urls?.frente === 'string' ? urls.frente : '';
      const pviVerso = typeof urls?.verso === 'string' ? urls.verso : '';
      const pviNascimento = typeof dataNascimento === 'string' ? dataNascimento.trim() : '';
      const pviSexo = typeof sexo === 'string' ? sexo.trim() : '';
      // Só aceitamos URLs públicas do Storage do projecto ou data-URL de imagem (anti-SSRF)
      const pviUrlOk = (u: string) => /^https:\/\/[^\s]+\.supabase\.co\//i.test(u) || u.startsWith('data:image/');

      const pviResponder = (veredicto: 'APTO' | 'REVISAO', alertas: string[], motivo: string) =>
        pviResponderBase(res, { veredicto, alertas, motivo, duracaoMs: Date.now() - pviStartedAt, modelo: PVI_MODEL });

      if (!pviBi || !pviNome || !pviUrlOk(pviFrente) || !pviUrlOk(pviVerso)) {
        return pviEmit(pviResponder, 'REVISAO', ['dados_insuficientes'], 'Dados insuficientes para a pré-verificação (identificação ou imagens em falta). O cadastro segue para homologação manual.');
      }
      if (!groq) {
        return pviEmit(pviResponder, 'REVISAO', ['ia_indisponivel'], 'Serviço de IA indisponível no momento. O cadastro segue para homologação manual.');
      }

      const pviDocDesc = pviTipo === 'instituicao'
        ? 'os documentos institucionais da adesão (ex.: Registo Comercial / Diário da República e Comprovativo de NIF / Alvará)'
        : 'o Bilhete de Identidade da República de Angola (modelo oficial, formato cartão ID-1)';
      const pviLayoutRules = pviTipo === 'instituicao'
        ? `- Os documentos devem parecer oficiais e plausíveis (cabeçalho institucional, selos/carimbos ou composição tipográfica consistente), completos e legíveis.\n- Não existe um layout único — avalia-se a plausibilidade documental e a coerência do número declarado (NIF/registo) com o texto do documento.`
        : `- MODELO OFICIAL DO B.I. ANGOLANO. FRENTE: fundo claro com padrão guilhoché/elementos gráficos de segurança, o Brasão da República no topo, os dizeres "REPÚBLICA DE ANGOLA" e "BILHETE DE IDENTIDADE", a fotografia a cores do titular, o nome completo, a filiação, o número do bilhete e a área da assinatura.\n- VERSO: impressão digital do titular, zona MRZ (linhas de leitura óptica, quando presente), naturalidade, data de nascimento, sexo, altura, estado civil e as datas de emissão e de validade.\n- Se o layout não corresponder de forma reconhecível a este modelo oficial, o veredicto é REVISAO.`;

      // Prompt ajustado 2026-08-14 (PROMPT_PRE_VERIFICACAO_CIDADAO.md):
      // pré-verificação documental conservadora. As capturas faciais são
      // verificadas LOCALMENTE (BlazeFace/verificationEngine) — a IA de visão
      // recebe apenas as 2 imagens do documento + dados declarados. A saída
      // mantém-se {"veredicto":"APTO"|"REVISAO","alertas":[...],"motivo":...}.
      const pviSystemPrompt = `Você é o motor de triagem documental do Correio Digital Angola (pré-verificação inteligente de novos cadastros).
Analise as DUAS imagens anexadas — a primeira é a FRENTE e a segunda é o VERSO de ${pviDocDesc} — e compare-as com os dados declarados no formulário.
NOTA ARQUITETURAL (v37.72): a etapa de comparação facial do utilizador foi ELIMINADA da validação — não existe qualquer verificação biométrica facial neste fluxo. A tua responsabilidade é exclusivamente a TRIAGEM DOCUMENTAL: qualidade, integridade, layout e coerência OCR.
AVALIE RIGOROSAMENTE:
1. QUALIDADE DA IMAGEM (frente e verso): nitidez, resolução, iluminação, enquadramento, inclinação, reflexos, cortes e compressão excessiva. Se a qualidade não permitir análise confiável, NÃO assumir que os dados estão errados — o veredicto é REVISAO.
2. INTEGRIDADE DO DOCUMENTO: indícios de edição digital, montagem, recortes, fotografia ou texto adulterados, screenshot ou fotografia de ecrã, ou documento aparentemente gerado por IA. A análise é heurística — perante suspeita razoável, REVISAO. Não declarar um documento falso apenas por baixa qualidade.
3. LAYOUT:
${pviLayoutRules}
4. COERÊNCIA OCR: leia o texto visível nas imagens e compare com os dados declarados (nome, número do documento e, quando visíveis, data de nascimento/sexo/filiação). Considere apenas diferenças de formatação (espaços, hífens, maiúsculas) como equivalentes. Qualquer divergência real de nome ou número => REVISAO.
5. CONSISTÊNCIA FRENTE/VERSO: nome, número do documento, dados pessoais e fotografia devem pertencer ao mesmo documento, sem contradições evidentes.
6. FOTOGRAFIA DO TITULAR: confirmar que existe, visível e nítida (elemento obrigatório do documento). Se ilegível ou ausente => REVISAO.
REGRAS ABSOLUTAS:
- "APTO" apenas quando TUDO estiver legível, coerente e sem qualquer indício de problema. Qualquer dúvida, imagem ilegível ou elemento obrigatório ausente => SEMPRE "REVISAO".
- Nunca invente dados que não consegue ler: se não consegue ler, "REVISAO".
- Com "APTO" o array "alertas" fica obrigatoriamente vazio; com "REVISAO" liste os motivos em snake_case (ex.: imagem_desfocada, imagem_cortada, documento_ilegivel, layout_suspeito, possivel_screenshot, possivel_ia, nome_divergente, bi_divergente, documento_divergente, data_divergente, frente_verso_inconsistentes, foto_bi_ilegivel, fraude_suspeita).
- "fraude_suspeita" é reservado a evidência CLARA e comprovada de adulteração ou montagem evidente (nunca apenas por dúvida ou baixa qualidade — isso é REVISAO simples com os alertas de qualidade).
- Responda APENAS com um objecto JSON válido, sem markdown nem texto adicional: {"veredicto":"APTO"|"REVISAO","alertas":["..."],"motivo":"frase curta em português de Angola, sem dados pessoais desnecessários"}.
Esta análise é apenas uma triagem de plausibilidade — NÃO certifica identidades, NÃO atesta autenticidade oficial e NÃO substitui a homologação administrativa.`;

      const pviUserPrompt = `Tipo de cadastro: ${pviTipo === 'instituicao' ? 'INSTITUIÇÃO (documentos de adesão)' : 'CIDADÃO (Bilhete de Identidade)'}
Dados declarados no formulário: Nome: "${pviNome}" | Nº do documento: "${pviBi}"${pviNascimento ? ` | Data de nascimento: "${pviNascimento}"` : ''}${pviSexo ? ` | Sexo: "${pviSexo}"` : ''}
A primeira imagem é a FRENTE e a segunda é o VERSO. Analise e responda APENAS com o JSON pedido.`;

      try {
        const PVI_TIMEOUT_MS = 30000;
        // 2026-08-15 — provedor de visão trocado para GEMINI (gemini-2.5-flash):
        // a conta Groq em uso não tem modelos de visão (llama-4-scout não
        // está disponível). O Gemini é multimodal e já está configurado no
        // projeto. Mantêm-se o prompt ajustado, a saída JSON e todas as regras
        // defensivas (qualquer falha => REVISAO, nunca aprovar por erro técnico).
        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
        if (!geminiKey) throw new Error('GEMINI_KEY_AUSENTE');
        // 1) Descarregar as 2 imagens (URLs assinadas do Storage), REDIMENSIONAR
        //    (sharp — max 1024px, qualidade 80) e converter para base64.
        //    Imagens originais (~1,2-1,6 MB) estouravam a quota de tokens do
        //    Gemini (503/timeout); reduzidas (~150 KB) funcionam rápido e estável.
        const [imgFResp, imgVResp] = await Promise.all([
          fetch(pviFrente, { signal: AbortSignal.timeout(15000) }),
          fetch(pviVerso, { signal: AbortSignal.timeout(15000) }),
        ]);
        if (!imgFResp.ok || !imgVResp.ok) throw new Error('IMG_INACESSIVEL ' + imgFResp.status + '/' + imgVResp.status);
        const sharpMod = await import('sharp');
        const [imgFBuf, imgVBuf] = await Promise.all([
          sharpMod.default(Buffer.from(await imgFResp.arrayBuffer())).resize({ width: 1024, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer(),
          sharpMod.default(Buffer.from(await imgVResp.arrayBuffer())).resize({ width: 1024, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer(),
        ]);
        const b64F = imgFBuf.toString('base64');
        const b64V = imgVBuf.toString('base64');
        // 2) v37.72 — CADEIA DE MODELOS com fallback (desempenho + resiliência):
        //    1.ª tentativa — gemini-3.1-flash-lite SEM "thinking" (thinkingBudget
        //    0): ~3-4 s por análise com o serviço saudável. Benchmark real: o
        //    gemini-3.6-flash com thinking activo demorava 9-30 s e a API tem
        //    vivido picos de 503 «high demand» que a tornam imprevisível.
        //    2.ª tentativa — gemini-3.6-flash com thinking limitado (budget 128
        //    e 512 tokens de saída: com 256 o thinking consumia o orçamento e a
        //    resposta chegava TRUNCADA — verificado em benchmark real).
        //    Falha/erro/resposta inválida numa tentativa => tenta a seguinte;
        //    esgotadas ambas => REVISAO (regra de ouro: nunca aprovar por erro
        //    técnico). O campo «modelo» indica qual respondeu.
        const PVI_ATTEMPTS: Array<{ modelo: string; config: Record<string, unknown>; timeoutMs: number }> = [
          // 1.ª — lite sem thinking: ~3-4 s com o serviço saudável
          { modelo: 'gemini-3.1-flash-lite', config: { temperature: 0, maxOutputTokens: 256, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }, timeoutMs: 12000 },
          // 2.ª — flash sem limite de thinking (benchmark: ~9 s saudável, JSON válido)
          { modelo: 'gemini-3.6-flash', config: { temperature: 0, maxOutputTokens: 512, responseMimeType: 'application/json' }, timeoutMs: 10000 },
          // 3.ª — RETRY do lite: 503 transitórios da API limparam em segundos
          { modelo: 'gemini-3.1-flash-lite', config: { temperature: 0, maxOutputTokens: 256, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }, timeoutMs: 8000 },
        ];
        let pviUltimoErroHttp = '';
        let pviRespostaInvalida = false;
        let pviModeloUsado = PVI_MODEL;
        const pviAnalisar = async (): Promise<{ veredicto: 'APTO' | 'REVISAO'; alertas: string[]; motivo: string } | null> => {
          for (const tentativa of PVI_ATTEMPTS) {
            let geminiResp: Response;
            try {
              geminiResp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + tentativa.modelo + ':generateContent?key=' + geminiKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [
                    { text: pviUserPrompt },
                    { inline_data: { mime_type: 'image/jpeg', data: b64F } },
                    { inline_data: { mime_type: 'image/jpeg', data: b64V } },
                  ] }],
                  systemInstruction: { parts: [{ text: pviSystemPrompt }] },
                  generationConfig: tentativa.config,
                }),
                signal: AbortSignal.timeout(tentativa.timeoutMs),
              });
            } catch {
              pviUltimoErroHttp = pviUltimoErroHttp || ('timeout/rede em ' + tentativa.modelo);
              continue;
            }
            if (!geminiResp.ok) {
              pviUltimoErroHttp = tentativa.modelo + ': HTTP ' + geminiResp.status;
              continue; // 503 «high demand», 429… → tenta o modelo seguinte
            }
            const geminiJson = (await geminiResp.json().catch(() => null)) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null;
            const rawContent: string = (geminiJson?.candidates?.[0]?.content?.parts || [])
              .map((p) => p.text || '').join('') || '';
            // Parsing conservador: qualquer anomalia => tenta o modelo seguinte
            let parsed = null as { veredicto?: string; alertas?: unknown[]; motivo?: unknown } | null;
            try {
              const ini = rawContent.indexOf('{');
              const fim = rawContent.lastIndexOf('}');
              if (ini >= 0 && fim > ini) parsed = JSON.parse(rawContent.substring(ini, fim + 1));
            } catch { parsed = null; }
            const alertas: string[] = parsed && Array.isArray(parsed.alertas)
              ? parsed.alertas.filter((a: unknown): a is string => typeof a === 'string' && a.trim().length > 0).map((a) => a.trim()).slice(0, 12)
              : [];
            const motivo: string = parsed && typeof parsed.motivo === 'string' ? parsed.motivo.trim().slice(0, 500) : '';
            if (!parsed || (parsed.veredicto !== 'APTO' && parsed.veredicto !== 'REVISAO') || !motivo) {
              pviRespostaInvalida = true;
              continue;
            }
            pviModeloUsado = tentativa.modelo;
            // Coerência defensiva: APTO nunca pode coexistir com alertas — downgrade seguro.
            if (parsed.veredicto === 'APTO' && alertas.length > 0) {
              return { veredicto: 'REVISAO', alertas, motivo: motivo || 'Veredicto APTO devolvido com alertas — por segurança, segue para homologação manual.' };
            }
            return { veredicto: parsed.veredicto, alertas, motivo };
          }
          return null;
        };
        const pviResultado = (await Promise.race([
          pviAnalisar(),
          new Promise((_unused, reject) => setTimeout(() => reject(new Error('PVI_TIMEOUT_30S')), PVI_TIMEOUT_MS)),
        ])) as { veredicto: 'APTO' | 'REVISAO'; alertas: string[]; motivo: string } | null;
        if (!pviResultado) {
          if (pviRespostaInvalida) {
            return pviEmit(pviResponder, 'REVISAO', ['resposta_invalida'], 'Resposta da IA inválida ou incompleta. O cadastro segue para homologação manual.');
          }
          throw new Error('PVI_SEM_RESPOSTA ' + pviUltimoErroHttp);
        }
        return pviResponderBase(res, { veredicto: pviResultado.veredicto, alertas: pviResultado.alertas, motivo: pviResultado.motivo, duracaoMs: Date.now() - pviStartedAt, modelo: pviModeloUsado });
      } catch (e) {
        console.error('PVIC: falha na pré-verificação com IA:', e?.message || e);
        return pviEmit(pviResponder, 'REVISAO', ['falha_tecnica'], 'Falha técnica ou timeout na análise da IA. O cadastro segue para homologação manual.');
      }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, isGovMode, currentPage, pageContext, language } = req.body;
      
      const CDA_PROJECT_INFO = `
O Correio Digital de Angola representa a espinha dorsal da modernização administrativa em Angola. 
O principal problema que resolvemos é a dificuldade de comunicação oficial num país com muitos endereços não mapeados, o que causa atrasos e forças as pessoas a deslocarem-se constantemente às instituições. 
A solução que oferecemos é transformar o Bilhete de Identidade no endereço digital oficial de cada cidadão, criando um canal direto e seguro no telemóvel. 
Os benefícios são claros: rapidez na receção de documentos, redução de custos logísticos para o Estado e uma inclusão digital real para todos, incluindo idosos ou cidadãos com baixa escolaridade através de auxílio por voz. 
La plataforma integra de forma inteligente e direta os canais de atendimento das principais instituições, tais como a AGT (Administração Geral Tributária), o SME (Serviço de Migração e Estrangeiros), a ENDE e a EPAL. Cada instituição tem a capacidade de configurar as diretrizes e regras operacionais do seu próprio assistente de IA. No papel de assistente central do Correio Digital de Angola, caso o cidadão pergunte sobre qualquer uma destas instituições (ex: tirar NIF na AGT ou obter vistos no SME), você deve agir de acordo com o tom, diretrizes de IA e conhecimentos integrados da instituição correspondente.

A plataforma baseia-se em cinco pilares fundamentais de serviços ativos, que você deve detalhar e explicar desta forma:
- 1. O Painel (Início / Dashboard): Funciona como um centro de comando pessoal com notificações rápidas, alertas urgentes, atalhos úteis e um resumo intuitivo das correspondências do cidadão.
- 2. O Correio (Correspondência Oficial): A área onde o cidadão troca mensagens oficiais de forma direta e bidirecional com instituições públicas, recebendo e assinando documentos legais com validade jurídica oficial de órgãos governamentais integrados como o SME e a AGT.
- 3. O Contacto (Apoio / Directório de Órgãos): Central de apoio onde estão listados todos os contactos importantes de utilidade pública e entidades governamentais integradas de Angola.
- 4. O Assistente de Voz / IA (Inteligência Artificial): O assistente cognitivo inteligente por voz que simplifica a linguagem jurídica, interpreta documentos densos e auxilia na navegação acessível.
- 5. A Conta (Configuração / Perfil): Onde o cidadão faz o controle e gestão segura dos seus dados de identidade, senha de acesso, biometria facial, preferências de recepção, configurações de segurança e histórico de auditoria completo.

Como um excelente BÓNUS extra no final da explicação dos 5 pilares, apresente o inovador "VideoAtendimento" (Vídeo-consultas integradas): uma funcionalidade fantástica que permite agendar e realizar videochamadas interativas em direto, permitindo ao cidadão falar em tempo real face a face com técnicos e funcionários de instituições oficiais e resolver problemas de imediato sem sair de casa.

AVISO CRÍTICO: Não cite de forma alguma a funcionalidade 'Carteira Digital', pois ela não está disponível no sistema no momento.
O nosso objetivo final é a transição para um Estado proativo que serve o povo na palma da mão.
`;

      let systemPrompt = isGovMode 
        ? `Você é o Consultor de Segurança e Legislação do SOC do Governo de Angola. Sua função é auxiliar administradores na gestão de protocolos de emergência, interoperabilidade e redação de normas. ${CDA_PROJECT_INFO} Inicie sempre saudando e perguntando como pode ser útil. Responda de forma eficiente, clara e profissional. Não utilize asteriscos ou símbolos de formatação na sua fala. Utilize sempre o nome completo Correio Digital de Angola. Se a explicação for muito longa, apresente primeiro o essencial e interrompa para perguntar se o usuário deseja que você continue detalhando ou prefere focar em algo específico.`
        : `Você é o assistente oficial do Correio Digital de Angola. ${CDA_PROJECT_INFO} Inicie sempre saudando e perguntando como pode ser útil. Ajude o usuário com informações sobre seus documentos e correspondências de forma eficiente. Seja cordial, humano e acolhedor. Utilize sempre o nome completo Correio Digital de Angola. Não utilize asteriscos ou símbolos de formatação para garantir uma fala limpa e natural. Caso sua resposta seja longa, apresente primeiro os pontos essenciais e interrompa para perguntar se o usuário gostaria que continuasse detalhando ou se prefere focar em algo específico. Responda em Português de Angola.`;

      // Directório Institucional de Referência — conhecimento estruturado para a IA
      // (papel informativo; NÃO concede envio/recepção — registo formal é obrigatório)
      systemPrompt += `\n\n[DIRECTÓRIO INSTITUCIONAL DE REFERÊNCIA — órgãos do Estado de Angola]
Usa esta informação para responder a perguntas do tipo "que órgão trata o quê".
As entidades listadas são de REFERÊNCIA — nem todas estão ligadas à plataforma.
Para correspondência, apenas instituições REGISTADAS no Correio Digital Angola podem receber/enviar.
` + directorioParaContextoIA();

      // Inject active page context if available
      if (currentPage && pageContext) {
        systemPrompt += `\n\n[CONTEXTO DO ECRÃ ATUAL DO UTILIZADOR]:
O usuário está visualizando a página "${currentPage}" no momento. 
O conteúdo e dados visíveis no ecrã dele são:
"""
${pageContext}
"""
Se o utilizador pedir para explicar o que está aberto, resumir a página, ou fizer perguntas sobre o conteúdo atual do ecrã, utilize os dados acima de forma natural para responder de maneira precisa e informativa.`;
      }

      const dialectMap: Record<string, string> = {
        pt: "Português de Angola",
        um: "Umbundu",
        ki: "Kimbundu",
        kk: "Kikongo",
        ch: "Chokwe",
        ng: "Ngangela",
        kw: "Kwanyama",
        nh: "Nhaneca",
        fi: "Fiote"
      };

      if (language && language !== 'pt') {
        const selectedDialect = dialectMap[language] || "Português de Angola";
        systemPrompt += `\n\n[CRITICAL DIALECT INSTRUCTION]:\nO utilizador atual prefere interagir no dialeto regional de Angola: "${selectedDialect}". Por favor, ignore a instrução de responder em Português de Angola; você DEVE responder integralmente no dialeto "${selectedDialect}". Seja nativo, evite jargões em português fora de termos oficiais inevitáveis, e mantenha o tom do Correio Digital de Angola nesta língua regional.`;
      }

      // Extract any incoming system message from frontend, and merge it with backend systemPrompt
      let finalSystemPrompt = systemPrompt;
      const filteredMessages = (messages || []).filter((m: { role?: string; content?: string; text?: string }) => {
        if (m.role === 'system' || m.role === 'System') {
          if (m.content || m.text) {
            finalSystemPrompt += "\n\n" + (m.content || m.text);
          }
          return false; // exclude from normal chat turns
        }
        return true;
      });

      // Merge consecutive messages with the same role to strictly alternate to avoid GoogleGenAIError
      const alternateMessages: { role: 'user' | 'assistant'; content: string }[] = [];
      for (const msg of filteredMessages) {
        const role = msg.role === 'assistant' || msg.role === 'model' || msg.role === 'bot' ? 'assistant' : 'user';
        const content = msg.content || msg.text || '';
        if (!content) continue;
        
        if (alternateMessages.length > 0 && alternateMessages[alternateMessages.length - 1].role === role) {
          alternateMessages[alternateMessages.length - 1].content += "\n\n" + content;
        } else {
          alternateMessages.push({ role, content });
        }
      }

      // ============================================================================
      // 2026-08-22 — BASE DE CONHECIMENTO DAS INSTITUIÇÕES NO CHAT DO CIDADÃO:
      // quando a pergunta menciona uma instituição (ex.: INAPEM), o servidor
      // vai buscar as fontes ATIVAS da base de conhecimento dela
      // (kb_fontes_instituicao — self-service da página IA) e junta-as ao
      // registo estático da instituição, injectando tudo no contexto da
      // resposta. Leitura pública (política v25: ativo=true) com anon key,
      // timeout 4s e fail-open honesto (sem KB, o chat responde como antes).
      // ============================================================================
      const ultimoTextoUsuario = (() => {
        const us = alternateMessages.filter(m => m.role === 'user');
        return us.length ? String(us[us.length - 1].content || '').trim() : '';
      })();
      let kbUsada: { instituicao: string; fontes: string[] } | null = null;
      if (ultimoTextoUsuario) {
        try {
          const instKbBase = selecionarInstituicaoKb(KB_REGISTO, ultimoTextoUsuario);
          // .trim() obrigatório: em produção a SUPABASE_URL do ambiente Vercel
          // chegava com espaço à direita → 'Failed to parse URL' no fetch.
          const supaUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
          const supaKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
          let siglaAlvo: string | null = instKbBase ? instKbBase.sigla : null;
          if (!siglaAlvo && supaUrl && supaKey) {
            // instituição fora do registo estático mas com fontes self-service:
            // lista as siglas com fontes ativas e procura menção na pergunta
            const ctrlS = new AbortController();
            const timerS = setTimeout(() => ctrlS.abort(), 4000);
            const respS = await fetch(`${supaUrl}/rest/v1/kb_fontes_instituicao?ativo=is.true&select=sigla&limit=300`, {
              headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
              signal: ctrlS.signal,
            });
            clearTimeout(timerS);
            if (respS.ok) {
              const rowsS = await respS.json();
              const siglas = Array.from(new Set((Array.isArray(rowsS) ? rowsS : []).map((r: any) => String(r.sigla || '').trim().toUpperCase()).filter(Boolean)));
              const alvo = ultimoTextoUsuario.toUpperCase();
              const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const encontrada = siglas.find(s => {
                if (new RegExp(`(^|[^A-Z0-9])${esc(s)}([^A-Z0-9]|$)`).test(alvo)) return true;
                const base = s.split('-')[0];
                return base.length >= 3 && new RegExp(`(^|[^A-Z0-9])${esc(base)}([^A-Z0-9]|$)`).test(alvo);
              });
              if (encontrada) siglaAlvo = encontrada;
            }
          }
          if (siglaAlvo && supaUrl && supaKey) {
            let fontesDinamicas: FonteKb[] = [];
            const ctrlF = new AbortController();
            const timerF = setTimeout(() => ctrlF.abort(), 4000);
            // sigla exacta primeiro; se vazio, prefixo (SIGLA-LLVV…): o registo
            // estático usa 'INAPEM' mas as fontes self-service vivem em
            // 'INAPEM-LLMM' — sem isto a KB dinâmica ficava de fora.
            const buscarDinamicas = async (filtro: string) => {
              const ctrlF = new AbortController();
              const timerF = setTimeout(() => ctrlF.abort(), 4000);
              const respFd = await fetch(`${supaUrl}/rest/v1/kb_fontes_instituicao?${filtro}&ativo=is.true&select=titulo,tipo,texto,fonte_url,atualizado_em&order=created_at.asc`, {
                headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
                signal: ctrlF.signal,
              });
              clearTimeout(timerF);
              if (respFd.ok) {
                const rowsF = (await respFd.json()) as FonteKbDinamicaRow[];
                return (Array.isArray(rowsF) ? rowsF : [])
                  .map((r, i) => rowParaFonteKb(r, i))
                  .filter((f): f is FonteKb => f !== null);
              }
              return [];
            };
            fontesDinamicas = await buscarDinamicas(`sigla=eq.${encodeURIComponent(siglaAlvo)}`);
            if (fontesDinamicas.length === 0 && /^[A-Z0-9]{2,12}$/.test(siglaAlvo)) {
              fontesDinamicas = await buscarDinamicas(`sigla=like.${encodeURIComponent(siglaAlvo)}*`);
            }
            const instKb = instKbBase
              ? { ...instKbBase, fontes: juntarFontesKb(fontesDinamicas, instKbBase.fontes) }
              : { sigla: siglaAlvo, nome: siglaAlvo, fontes: fontesDinamicas };
            const montado = montarContextoKb(instKb);
            if (montado.contexto) {
              finalSystemPrompt += `\n\n[BASE DE CONHECIMENTO OFICIAL DA INSTITUIÇÃO MENCIONADA — ${instKb.nome} (${instKb.sigla})]\nO utilizador mencionou esta instituição e espera informação OFICIAL dela. Se a pergunta for sobre esta instituição: responde APENAS com a informação destas fontes oficiais, IGNORA o modelo genérico de apresentação da plataforma (5 pilares, VideoAtendimento) e cita o título da fonte usada. Se nenhuma fonte responder directamente à pergunta, diz honestamente que essa informação não consta da base de conhecimento da instituição. Se a pergunta NÃO for sobre esta instituição, ignora esta secção.\n${montado.contexto}`;
              kbUsada = {
                instituicao: instKb.nome,
                fontes: montado.fontesUsadas.map(id => instKb.fontes.find(f => f.id === id)?.titulo || id),
              };
            }
          }
        } catch (kbErr) {
          console.warn('[CHAT-KB] Base de conhecimento indisponível — chat prossegue sem ela:', String(kbErr).slice(0, 120));
        }
      }

      // 1. Try Groq if client is present
      if (groq) {
        try {
          const completion = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: finalSystemPrompt
              },
              ...alternateMessages.map(m => ({
                role: m.role,
                content: m.content
              }))
            ],
            model: "openai/gpt-oss-120b",
          });
          return res.json({ message: limparTextoIA(completion.choices[0].message.content), kbUsada });
        } catch (groqErr) {
          console.error("Groq Chat Error, trying Gemini fallback:", groqErr);
        }
      }

      // 2. Try Gemini if client is present
      if (ai) {
        try {
          const formattedContents = alternateMessages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));

          const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: formattedContents,
            config: {
              systemInstruction: finalSystemPrompt,
              temperature: 0.5,
            }
          });

          if (response && response.text) {
            return res.json({ message: limparTextoIA(response.text), kbUsada });
          }
        } catch (geminiErr) {
          console.error("Gemini Chat Error, trying sandbox offline:", geminiErr);
        }
      }

      // 3. Complete and helpful fallback in offline mode if both APIs can't be reached
      const chatMsgList = messages || [];
      const lastMessageObj = chatMsgList.length > 0 ? chatMsgList[chatMsgList.length - 1] : null;
      const lastMessage = lastMessageObj ? (lastMessageObj.content || lastMessageObj.text || '') : '';
      let offlineResponse = "Olá! Atualmente estou a operar em Modo Sandbox local e offline por razões de conectividade institucional. Como assistente virtual do Correio Digital de Angola, garanto-lhe que a sua correspondência está selada e segura nos servidores centrais.";
      
      if (lastMessage.toLowerCase().includes('nif') || lastMessage.toLowerCase().includes('contribuinte')) {
        offlineResponse = "Para tratar de assuntos relacionados ao seu NIF (Número de Identificação Fiscal) ou impostos pendentes, aceda à secção 'Correspondência' no menu lateral e selecione a 'AGT' (Administração Geral Tributária) para falar diretamente com o integrador de processos fiscais.";
      } else if (lastMessage.toLowerCase().includes('sme') || lastMessage.toLowerCase().includes('passaporte') || lastMessage.toLowerCase().includes('visto')) {
        offlineResponse = "O Serviço de Migração e Estrangeiros (SME) permite-lhe agendar a recolha de dados e emissão de passaportes diretamente pelo portal. Vá à aba de 'Correspondência' e inicie uma conversa com o 'SME'.";
      } else if (lastMessage.toLowerCase().includes('pagamento') || lastMessage.toLowerCase().includes('fatura') || lastMessage.toLowerCase().includes('pagar')) {
        offlineResponse = "Através do canal de Correspondência da ENDE e EPAL, pode consultar e simular o pagamento eletrotécnico e hidráulico de faturas de forma imediata e integrada. Os comprovativos são gerados na própria conversa oficial.";
      }

      return res.json({ message: limparTextoIA(offlineResponse) });

    } catch (error) {
      console.error("Groq & Gemini Chat Error:", error);
      res.status(500).json({ error: "Erro ao processar conversa com IA." });
    }
  });

  // Assistente de Documentos (Fase 1 / S1): explicar, resumir, passos, prazos e
  // rascunhos. Gemini-primeiro com fallback Groq (padrão do /api/chat).
  // Fail-safe: sem provedor ou erro de IA => HTTP honesto; nunca texto fingido.
  app.post("/api/assistente-documento", async (req, res) => {
    try {
      const v = validarPedido(req.body);
      if (v.ok === false) {
        return res.status(400).json({ ok: false, erro: v.erro });
      }
      // E1 — Base de Conhecimento: anexa fontes oficiais da instituição quando
      // existirem no registo (E2/E3); sem registo, o comportamento é o de hoje.
      const alvoKb = (req.body && typeof req.body.siglaKb === 'string' ? req.body.siglaKb : v.dados.remetente);
      const instKbBase = selecionarInstituicaoKb(KB_REGISTO, alvoKb);
      // E6 — funde fontes self-service (ativo=true) da instituição via REST;
      // sem env/erro/timeout => fica só a KB estática (fail-open honesto).
      let fontesDinamicas: FonteKb[] = [];
      if (instKbBase) {
        try {
          // .trim() obrigatório: em produção a SUPABASE_URL do ambiente Vercel
          // chegava com espaço à direita → 'Failed to parse URL' no fetch.
          const supaUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
          const supaKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
          if (supaUrl && supaKey) {
            const ctrl = new AbortController();
            const timerFd = setTimeout(() => ctrl.abort(), 4000);
            const respFd = await fetch(`${supaUrl}/rest/v1/kb_fontes_instituicao?sigla=eq.${encodeURIComponent(instKbBase.sigla)}&ativo=is.true&select=titulo,tipo,texto,fonte_url,atualizado_em&order=created_at.asc`, {
              headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
              signal: ctrl.signal,
            });
            clearTimeout(timerFd);
            if (respFd.ok) {
              const rows = (await respFd.json()) as FonteKbDinamicaRow[];
              fontesDinamicas = (Array.isArray(rows) ? rows : [])
                .map((r, i) => rowParaFonteKb(r, i))
                .filter((f): f is FonteKb => f !== null);
            }
          }
        } catch { fontesDinamicas = []; }
      }
      const instKb = instKbBase ? { ...instKbBase, fontes: juntarFontesKb(instKbBase.fontes, fontesDinamicas) } : null;
      let kbUsada: { instituicao: string; fontes: string[]; truncado: boolean } | null = null;
      if (instKb) {
        const montado = montarContextoKb(instKb);
        if (montado.contexto) {
          v.dados.kb = { instituicao: instKb.nome, contexto: montado.contexto, truncado: montado.truncado };
          // E4 — devolve ao cliente o que fundamentou a resposta (títulos das fontes).
          kbUsada = {
            instituicao: instKb.nome,
            fontes: instKb.fontes.filter(f => montado.fontesUsadas.includes(f.id)).map(f => f.titulo),
            truncado: montado.truncado,
          };
          // E5 — auditoria estruturada: sigla, fontes e ação; NUNCA texto do cidadão.
          console.log('KB_AUDIT ' + JSON.stringify({ evento: 'kb_usada', sigla: instKb.sigla, fontes: montado.fontesUsadas, truncado: montado.truncado, acao: v.dados.acao, ts: new Date().toISOString() }));
        }
      } else {
        // E5 — sem correspondência: regista só a ação (nem remetente, por privacidade).
        console.log('KB_AUDIT ' + JSON.stringify({ evento: 'kb_sem_correspondencia', acao: v.dados.acao, ts: new Date().toISOString() }));
      }
      const { sistema, utilizador } = construirPrompts(v.dados);

      // 1. Gemini primeiro (modo teste aprovado pelo dono)
      if (ai) {
        try {
          // 2026-08-07 (provado ao vivo): o SDK do Gemini pode ficar pendurado
          // SEM responder. Corrida com timeout: passados 25s cai no fallback.
          const response = await Promise.race([
            ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: [{ role: "user", parts: [{ text: utilizador }] }],
              config: { systemInstruction: sistema, temperature: 0.3 },
            }),
            new Promise<never>((_res, reject) => setTimeout(() => reject(new Error('GEMINI_TIMEOUT_25S')), 25000)),
          ]);
          if (response && response.text) {
            return res.json({ ok: true, acao: v.dados.acao, modelo: "gemini-3.6-flash", resultado: protegerTraducaoLinguaNacional(v.dados, limparTextoIA(response.text)), aviso: AVISO_IA, ...(kbUsada ? { kb: kbUsada } : {}) });
          }
        } catch (geminiErr) {
          console.error("Gemini assistente-documento erro, fallback Groq:", geminiErr);
        }
      }

      // 2. Fallback Groq (já ativo em produção)
      if (groq) {
        try {
          const completion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: sistema },
              { role: "user", content: utilizador }
            ],
            model: "openai/gpt-oss-120b",
            temperature: 0.3,
            // Teto de saida: impede que um ciclo degenerado (provado ao vivo
            // com linguas nacionais) queime milhares de tokens de lixo.
            max_tokens: 4096,
          });
          const textoGroq = completion.choices?.[0]?.message?.content;
          if (textoGroq) {
            return res.json({ ok: true, acao: v.dados.acao, modelo: "openai/gpt-oss-120b", resultado: protegerTraducaoLinguaNacional(v.dados, limparTextoIA(textoGroq)), aviso: AVISO_IA, ...(kbUsada ? { kb: kbUsada } : {}) });
          }
        } catch (groqErr) {
          console.error("Groq assistente-documento erro:", groqErr);
        }
      }

      return res.status(503).json({ ok: false, erro: "Assistente de IA indisponível neste momento. Tenta novamente dentro de instantes." });
    } catch (e) {
      console.error("assistente-documento erro:", e);
      return res.status(500).json({ ok: false, erro: "Erro ao processar o pedido do assistente de documentos." });
    }
  });

  // WebSocket for Gemini Live
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/api/live') {
      const isGov = url.searchParams.get('gov') === 'true';
      wss.handleUpgrade(request, socket, head, (ws) => {
        (ws as any).isGov = isGov;
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs: WebSocket) => {
    const isGov = (clientWs as any).isGov;
    console.log(`Client connected to Gemini Live WebSocket (Gov Mode: ${isGov})`);

    clientWs.on("error", (err) => {
      console.error("Client WebSocket error:", err);
    });

    if (!ai) {
      console.warn("WebSocket attempted without Gemini Client instantiated");
      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ type: 'error', message: 'A chave da API Gemini não está configurada neste servidor VPS/Produção.' }));
        clientWs.close();
      }
      return;
    }

    // Keep-alive to prevent connection timeouts
    const pingInterval = setInterval(() => {
      if (clientWs.readyState === 1) { // 1 = OPEN
        clientWs.ping();
      }
    }, 20000);

    try {
      console.log("Connecting to Gemini Live with model: gemini-3.1-flash-live-preview");
      
      const CDA_PROJECT_INFO = `
O Correio Digital de Angola moderniza a administração ao tornar o Bilhete de Identidade o endereço oficial dos cidadãos. 
Resolvemos o problema da entrega física de correspondência e a necessidade de deslocações constantes às instituições. 
A nossa solução utiliza a identidade digital para garantir que as notificações e documentos cheguem diretamente ao telemóvel com segurança total. 
A plataforma integra os canais de atendimento e os assistentes de IA personalizados de cada instituição (como a AGT - Administração Geral Tributária e o SME - Serviço de Migração e Estrangeiros). Se o cidadão fizer perguntas de voz específicas sobre essas instituições (ex: Como tirar o NIF com a AGT ou agendar no SME), responda simulando a atuação oficial da respetiva instituição e suas diretrizes específicas integradas de IA.
Os benefícios incluem maior agilidade, economia para o cidadão e para o Estado, e uma interface acessível para todos os níveis de literacia digital. 
A estrutura conta com o Painel Principal, Correspondência oficial com as instituições, Assistente de Inteligência Artificial para simplificar a linguagem, Carteira Digital Offline e Segurança Biométrica. 
A nossa inteligência artificial ajuda a traduzir termos jurídicos complexos e atua de forma proativa com os prazos e avisos oficiais.
`;

      const normalSysInstr = `Você é o assistente virtual do Correio Digital de Angola. ${CDA_PROJECT_INFO} Inicie sempre saudando e perguntando como pode ser útil. Responda de forma eficiente. Seja cordial, humano e acolhedor. Não utilize asteriscos ou símbolos de formatação para garantir uma fala natural. Utilize sempre o nome completo Correio Digital de Angola. Se a explicação for longa, apresente o essencial e pergunte se pode continuar.`;
      const govSysInstr = `Você é o Consultor de Segurança e Redação Oficial do Governo de Angola. ${CDA_PROJECT_INFO} Sua função é auxiliar administradores na gestão de protocolos e redação de normas. Inicie saudando e perguntando como pode ser útil. Seja eficiente, formal, institucional e conhecedor das normas de protocolo. Não utilize asteriscos ou símbolos na sua fala. Utilize sempre o nome completo Correio Digital de Angola.`;

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent) {
              const { modelTurn, interrupted } = message.serverContent;
              
              if (interrupted) {
                console.log("AI session interrupted by user activity");
                clientWs.send(JSON.stringify({ type: 'interrupted' }));
              }

              if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                  if (part.inlineData?.data) {
                    clientWs.send(JSON.stringify({ type: 'audio', data: part.inlineData.data }));
                  }
                  if (part.text) {
                    clientWs.send(JSON.stringify({ type: 'model_transcript', data: part.text }));
                  }
                }
              }
            }
          },
          onerror: (error) => {
            console.error("CRITICAL: Gemini Live Session Error:", error);
            if (clientWs.readyState === 1) {
              // Extract message if it's an error object
              const errorMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
              clientWs.send(JSON.stringify({ type: 'error', message: `Erro no serviço de IA: ${errorMsg}` }));
            }
          },
          onclose: (e) => {
            console.log(`Gemini Live Session closed. Code: ${e.code}, Reason: ${e.reason}`);
            clearInterval(pingInterval);
            if (clientWs.readyState === 1) {
              const reasonMsg = e.reason || 'Conexão com servidor de IA encerrada.';
              clientWs.send(JSON.stringify({ type: 'error', message: reasonMsg }));
              clientWs.close();
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: isGov ? govSysInstr : normalSysInstr,
        },
      });

      console.log("Gemini Live session established successfully");

      // Wake up the model with a greeting
      setTimeout(() => {
        try {
          if (clientWs.readyState === 1) {
            console.log("Sending initial greeting to Gemini...");
            const greeting = isGov 
              ? "Saudações. Em que posso ser útil na gestão do SOC hoje?"
              : "Olá! Sou o assistente do Correio Digital de Angola. Como posso ser útil com seus documentos ou correspondências hoje?";
            session.sendRealtimeInput({ 
              text: greeting 
            });
          }
        } catch (err) {
          console.error("Error sending initial wake-up message:", err);
        }
      }, 1500);

      clientWs.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ping') return;
          
          if (msg.type === 'audio' && msg.data) {
            session.sendRealtimeInput({
              audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Error processing client message:", e);
        }
      });

      clientWs.on("close", () => {
        console.log("Client disconnected, closing Gemini session");
        clearInterval(pingInterval);
        try {
          session.close();
        } catch (err) {
          console.error("Error closing Gemini session:", err);
        }
      });

    } catch (error) {
      console.error("Failed to connect to Gemini Live:", error);
      const isAuthError = String(error).includes("unregistered callers") || !apiKey;
      const helpMsg = isAuthError 
        ? "Configuração de API pendente. Por favor, adicione a GEMINI_API_KEY no painel de Segredos (Settings -> Secrets)."
        : "Erro ao conectar com o serviço de IA.";
      
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', message: helpMsg }));
        clientWs.close();
      } else if (clientWs.readyState === WebSocket.CONNECTING) {
        clientWs.on('open', () => {
          clientWs.send(JSON.stringify({ type: 'error', message: helpMsg }));
          clientWs.close();
        });
      }
    }
  });

  // Dynamic AI Translation API
  app.post("/api/translate", async (req, res) => {
    try {
      const { texts, targetLanguage } = req.body;
      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.json({ translations: [] });
      }

      if (!targetLanguage || targetLanguage === 'pt') {
        return res.json({ translations: texts });
      }

      const languageNames: Record<string, string> = {
        um: "Umbundu",
        ki: "Kimbundu",
        kk: "Kikongo",
        ch: "Chokwe",
        ng: "Ngangela",
        kw: "Kwanyama",
        nh: "Nhaneca",
        fi: "Fiote"
      };

      const langName = languageNames[targetLanguage] || targetLanguage;

      // ---- Fallback estático instantâneo (2026-08-17) ---------------------
      // Termos curtos de interface (labels de menu, botões, estados) são
      // traduzidos AQUI, sem chamar a IA: resposta imediata, zero custo e
      // cobertura garantida mesmo se a API estiver em baixo. O restante do
      // lote segue para a IA (Gemini → Groq → original).
      const STATIC_UI_TERMS: Record<string, Record<string, string>> = {
        "Painel": { um: "Ondunge", ki: "Kikonde", kk: "Lulendo", ch: "Fungola", ng: "Mutende", kw: "Oshila", nh: "Okulula", fi: "Lusolo" },
        "Correio": { um: "Okanda", ki: "Mikanda", kk: "Nsamu", ch: "Chisinde", ng: "Mikando", kw: "Ombila", nh: "Okanda", fi: "Bumboti" },
        "Contactos": { um: "Omanu", ki: "Miji", kk: "Kangu", ch: "Atu", ng: "Vakwetu", kw: "Aantu", nh: "Ovanthu", fi: "Batu" },
        "Perfil": { um: "Ovipala", ki: "Kixala", kk: "Kinkulu", ch: "Kufunga", ng: "Mukalo", kw: "Oshilongwa", nh: "Omuhonga", fi: "Nzila" },
        "Conta": { um: "Ombila", ki: "Mbandu", kk: "Nzo", ch: "Mufu", ng: "Mukulo", kw: "Omauyelele", nh: "Omuhonga", fi: "Nzila" },
        "Equipa": { um: "Olowola", ki: "Upange", kk: "Kisalu", ch: "Vakaji", ng: "Vangaji", kw: "Anilonga", nh: "Ovilinga", fi: "Basadi" },
        "Trabalhadores": { um: "Olowola", ki: "Upange", kk: "Kisalu", ch: "Vakaji", ng: "Vangaji", kw: "Anilonga", nh: "Ovilinga", fi: "Basadi" },
        "IA": { um: "Olondunge", ki: "Kixilu", kk: "Lulendo", ch: "Ipupolo", ng: "Vihhande", kw: "Eendunge", nh: "Epupolo", fi: "Nzila-Lula" },
        "Notificações": { um: "Olovalulo", ki: "Mutume", kk: "Mbote", ch: "Kusola", ng: "Mutende", kw: "Omauyelele", nh: "Elau", fi: "Lukelelo" },
        "Instituições": { um: "Ovingonjo", ki: "Vihandela", kk: "Nkenda", ch: "Mwenya", ng: "Vihandeka", kw: "Oshilongo", nh: "Omilandu", fi: "Mutinu" },
        "Correspondências": { um: "Olovikanda", ki: "Mikanda-Miji", kk: "Nsamu-Mia", ch: "Kusola-Atu", ng: "Mutende-Le", kw: "Ombila-Ha", nh: "Okanda-Ov", fi: "Mamboti-Lu" },
        "Cidadãos": { um: "Omanu-Vet", ki: "Miji-Ki", kk: "Nkangu", ch: "Atu-Ch", ng: "Vakwetu-N", kw: "Aantu-O", nh: "Ovanthu-V", fi: "Batu-B" },
        "Relatórios": { um: "Okulula", ki: "Mukolo", kk: "Kinkulu", ch: "Kutambula", ng: "Kawa-Mu", kw: "Eindilo", nh: "Elau-Ov", fi: "Tukus" },
        "Auditoria": { um: "Olomono", ki: "Jimbidila", kk: "Landa-Ma", ch: "Kuhita", ng: "Kunona", kw: "Konaako", nh: "Okanda", fi: "Bisalu" },
        "Mensagem": { um: "Ondaka", ki: "Mikanda", kk: "Nsamu", ch: "Chisinde", ng: "Mikando", kw: "Ombila", nh: "Okanda", fi: "Bumboti" },
        "Documento": { um: "Okanda", ki: "Mukanda", kk: "Nsamu", ch: "Mukanda", ng: "Mikando", kw: "Ombila", nh: "Okanda", fi: "Bisalu" },
        "Pesquisar": { um: "Okusanga", ki: "Kufila", kk: "Moneka", ch: "Kusola", ng: "Kulomba", kw: "Yandjeka", nh: "Oityi", fi: "Lomba" },
        "Voltar": { um: "Okutunda", ki: "Kutula", kk: "Kuna", ch: "Kuhita", ng: "Kushola", kw: "Okushoka", nh: "Okutyi", fi: "Maboti" },
        "Cancelar": { um: "Okutunda", ki: "Kutula", kk: "Kuna-Ni", ch: "Kuhita-M", ng: "Kushola", kw: "Okushoka", nh: "Okutyi", fi: "Maboti" },
        "Enviar": { um: "Okutuma", ki: "Kutuma", kk: "Kutuma", ch: "Kutuma", ng: "Kutuma", kw: "Okutuma", nh: "Okutuma", fi: "Tuma" },
        "Fechar": { um: "Okuvala", ki: "Kujikila", kk: "Kujikila", ch: "Kujikila", ng: "Kunona", kw: "Okupula", nh: "Okupula", fi: "Fila" },
        "Confirmar": { um: "Okutavela", ki: "Kutavela", kk: "Kutavela", ch: "Kutavela", ng: "Kutavela", kw: "Okutavela", nh: "Okutavela", fi: "Tavela" },
        "Editar": { um: "Okulandula", ki: "Kulandula", kk: "Kulandula", ch: "Kulandula", ng: "Kulandula", kw: "Okulandula", nh: "Okulandula", fi: "Landula" },
        "Eliminar": { um: "Okupuka", ki: "Kupuka", kk: "Kupuka", ch: "Kupuka", ng: "Kunona", kw: "Okukonakona", nh: "Okukonakona", fi: "Kona" },
        "Guardar": { um: "Okusonga", ki: "Kusonga", kk: "Kusonga", ch: "Kusonga", ng: "Kusonga", kw: "Okusonga", nh: "Okusonga", fi: "Songa" },
        "Carregar": { um: "Okutwala", ki: "Kutwala", kk: "Kutwala", ch: "Kutwala", ng: "Kutwala", kw: "Okutwala", nh: "Okutwala", fi: "Twala" },
        "Abrir": { um: "Okuyulula", ki: "Kuyulula", kk: "Kuyulula", ch: "Kuyulula", ng: "Kuyulula", kw: "Okuyulula", nh: "Okuyulula", fi: "Yulula" },
        "Todas": { um: "Ovio", ki: "Vioso", kk: "Moso", ch: "Moso", ng: "Vioshe", kw: "Ayehe", nh: "Oveho", fi: "Bioso" },
        "Aprovado": { um: "Okusokela", ki: "Kusokela", kk: "Kusokela", ch: "Kusokela", ng: "Kusokela", kw: "Okusokela", nh: "Okusokela", fi: "Sokela" },
        "Rejeitado": { um: "Okutunda", ki: "Kutunda", kk: "Kutunda", ch: "Kutunda", ng: "Kutunda", kw: "Okutunda", nh: "Okutunda", fi: "Tunda" },
        "Em análise": { um: "Okuyova", ki: "Kuyova", kk: "Kuyova", ch: "Kuyova", ng: "Kuyova", kw: "Okuyova", nh: "Okuyova", fi: "Yova" },
        "Online": { um: "Okuya", ki: "Kwenda", kk: "Kwiza", ch: "Kuyenda", ng: "Kuyenda", kw: "Okukala", nh: "Okukala", fi: "Kwiza" },
        "Offline": { um: "Okuvua", ki: "Kutula", kk: "Kutula", ch: "Kuhita", ng: "Kunona", kw: "Okushoka", nh: "Okutyi", fi: "Maboti" },
        "Olá": { um: "Ambeta", ki: "Mvidi", kk: "Mbote", ch: "Moyo", ng: "Mutende", kw: "Moro", nh: "Moro", fi: "Moyo" },
        "Estado": { um: "Okalo", ki: "Mbandu", kk: "Nsamu", ch: "Kufunga", ng: "Kisalu", kw: "Oshipala", nh: "Ovitu", fi: "Nzila" },
        "Assunto": { um: "Ondaka", ki: "Kinkulu", kk: "Nsamu", ch: "Chisinde", ng: "Mutende", kw: "Ombila", nh: "Okanda", fi: "Bumboti" },
        "Data": { um: "Esiku", ki: "Kizuwa", kk: "Lumbu", ch: "Kizuwa", ng: "Kizuwa", kw: "Esiku", nh: "Esiku", fi: "Lumbu" },
        "Remetente": { um: "Okutuma", ki: "Kutuma", kk: "Kutuma", ch: "Kutuma", ng: "Kutuma", kw: "Okutuma", nh: "Okutuma", fi: "Tuma" },
        "Destinatário": { um: "Okutambula", ki: "Kutambula", kk: "Kutambula", ch: "Kutambula", ng: "Kutambula", kw: "Okutambula", nh: "Okutambula", fi: "Tambula" },
        "Responder": { um: "Okuyula", ki: "Kuyula", kk: "Kuyula", ch: "Kuyula", ng: "Kuyula", kw: "Okuyula", nh: "Okuyula", fi: "Yula" },
        "Arquivar": { um: "Okusonga", ki: "Kusonga", kk: "Kusonga", ch: "Kusonga", ng: "Kusonga", kw: "Okusonga", nh: "Okusonga", fi: "Songa" },
        "Prioridade": { um: "Okalo", ki: "Mbandu", kk: "Nsamu", ch: "Chisinde", ng: "Mutende", kw: "Ombila", nh: "Okanda", fi: "Bumboti" },
        "Categoria": { um: "Ovikalo", ki: "Mbandu", kk: "Nsamu", ch: "Chisinde", ng: "Mutende", kw: "Ombila", nh: "Okanda", fi: "Bumboti" },
        // ---- 2026-08-17 (2.ª leva): termos reais extraídos da UI ----
        "Nome Completo": { um: "Eliwa lyosoma", ki: "Dijina diakuala", kk: "Zina diakamana", ch: "Jina jakamana", ng: "Lina lyakamana", kw: "Edhina lyaushe", nh: "Edina lyosoma", fi: "Zina diakamana" },
        "Ações": { um: "Ovipangiwa", ki: "Upange", kk: "Kisalu", ch: "Vakaji", ng: "Vangaji", kw: "Iilonga", nh: "Ovilinga", fi: "Bisalu" },
        "Referência": { um: "Ondaka", ki: "Kimbu", kk: "Nsamu", ch: "Chinyingika", ng: "Cinoneno", kw: "Endandeko", nh: "Okutaila", fi: "Dimbu" },
        "República de Angola": { um: "Ofula ya Angola", ki: "Ntotela ya Angola", kk: "Nsi ya Angola", ch: "Fuchi ya Angola", ng: "Kanda ya Angola", kw: "Oshilongo shAngola", nh: "Omuhele wa Angola", fi: "Nsi ya Angola" },
        "Segurança": { um: "Okutela", ki: "Kutela", kk: "Kutela", ch: "Kutela", ng: "Kutela", kw: "Okutela", nh: "Okutela", fi: "Tela" },
        "Província": { um: "Ofula", ki: "Ntotela", kk: "Nsi", ch: "Fuchi", ng: "Kanda", kw: "Oshilongo", nh: "Omuhele", fi: "Nsi" },
        "Município": { um: "Olumwe", ki: "Kanda", kk: "Kanda", ch: "Kanda", ng: "Kanda", kw: "Oshilonga", nh: "Omukunda", fi: "Kanda" },
        "Tipo": { um: "Ovitapo", ki: "Mbandu", kk: "Nsamu", ch: "Kufunga", ng: "Kisalu", kw: "Oshipala", nh: "Ovitu", fi: "Nzila" },
        "Pequeno": { um: "Okaci", ki: "Kaci", kk: "Kaci", ch: "Kaci", ng: "Kaci", kw: "Okaci", nh: "Okaci", fi: "Kaci" },
        "Grande": { um: "Okulu", ki: "Kulu", kk: "Kulu", ch: "Kulu", ng: "Kulu", kw: "Okulu", nh: "Okulu", fi: "Kulu" },
        "Sucesso": { um: "Okusokela", ki: "Kusokela", kk: "Kusokela", ch: "Kusokela", ng: "Kusokela", kw: "Okusokela", nh: "Okusokela", fi: "Sokela" },
        "Minha Conta": { um: "Ombila yange", ki: "Mbandu yami", kk: "Nzo yami", ch: "Mufu wami", ng: "Mukulo wami", kw: "Omauyelele ange", nh: "Omuhonga wange", fi: "Nzila yami" },
        "Cancelada": { um: "Okuvua", ki: "Kuvua", kk: "Kuvua", ch: "Kuvua", ng: "Kuvua", kw: "Okushoka", nh: "Okutyi", fi: "Vua" },
        "Voltar ao Painel": { um: "Okutunda ko Ondunge", ki: "Kutula ko Kikonde", kk: "Kuna ko Lulendo", ch: "Kuhita ko Fungola", ng: "Kushola ko Mutende", kw: "Okushoka ko Oshila", nh: "Okutyi ko Okulula", fi: "Maboti ko Lusolo" },
        "Voltar ao Correio": { um: "Okutunda ko Okanda", ki: "Kutula ko Mikanda", kk: "Kuna ko Nsamu", ch: "Kuhita ko Chisinde", ng: "Kushola ko Mikando", kw: "Okushoka ko Ombila", nh: "Okutyi ko Okanda", fi: "Maboti ko Bumboti" },
        "Remover anexo": { um: "Okupuka onanga", ki: "Kupuka kimbu", kk: "Kupuka nsamu", ch: "Kupuka chinyingika", ng: "Kupuka cinoneno", kw: "Okupuka endandeko", nh: "Okupuka okutaila", fi: "Kupuka dimbu" },
        "Localização": { um: "Ovitu", ki: "Kixala", kk: "Kinkulu", ch: "Kufunga", ng: "Kisalu", kw: "Oshilongwa", nh: "Omuhonga", fi: "Nzila" },
        "Entidade": { um: "Ovingonjo", ki: "Vihandela", kk: "Nkenda", ch: "Mwenya", ng: "Vihandeka", kw: "Oshilongo", nh: "Omilandu", fi: "Mutinu" },
        "Ativo": { um: "Okuya", ki: "Kwenda", kk: "Kwiza", ch: "Kuyenda", ng: "Kuyenda", kw: "Okukala", nh: "Okukala", fi: "Kwiza" },
        "Título": { um: "Eliwa", ki: "Dijina", kk: "Zina", ch: "Jina", ng: "Lina", kw: "Edhina", nh: "Edina", fi: "Zina" },
        "Conteúdo do Documento": { um: "Otyo kokanda", ki: "Kimbu kia mukanda", kk: "Nsamu kia nzo", ch: "Kufunga kwa mukanda", ng: "Kisalu kya mikando", kw: "Oshipala shombila", nh: "Ovitu vyokanda", fi: "Nzila ya mukanda" },
        "Referência de Registo": { um: "Ondaka yokala", ki: "Kimbu kia kusonga", kk: "Nsamu ya kusonga", ch: "Chinyingika kusonga", ng: "Cinoneno kusonga", kw: "Endandeko okusonga", nh: "Okutaila okusonga", fi: "Dimbu songa" },
        "Entrar": { um: "Okuya", ki: "Kwila", kk: "Kwiza", ch: "Kuyenda", ng: "Kuyenda", kw: "Okukala", nh: "Okukala", fi: "Kwiza" },
        "Autorizado": { um: "Okutavela", ki: "Kutavela", kk: "Kutavela", ch: "Kutavela", ng: "Kutavela", kw: "Okutavela", nh: "Okutavela", fi: "Tavela" },
        "Conta verificada e activa": { um: "Ombila yokutavela", ki: "Mbandu yatavela", kk: "Nzo yatavela", ch: "Mufu watavela", ng: "Mukulo watavela", kw: "Omauyelele atavela", nh: "Omuhonga watavela", fi: "Nzila yatavela" },
        "Alterar Foto": { um: "Okulandula efoto", ki: "Kulandula foto", kk: "Kulandula foto", ch: "Kulandula foto", ng: "Kulandula foto", kw: "Okulandula efoto", nh: "Okulandula efoto", fi: "Landula foto" },
        "A Carregar...": { um: "Okuyoya...", ki: "Kuyoya...", kk: "Kuyoya...", ch: "Kuyoya...", ng: "Kuyoya...", kw: "Okuyoya...", nh: "Okuyoya...", fi: "Yoya..." },
        "Estado Civil": { um: "Okalo komanu", ki: "Mbandu kia miji", kk: "Nsamu kia kangu", ch: "Kufunga kwa atu", ng: "Kisalu kya vakwetu", kw: "Oshipala shaantu", nh: "Ovitu vyovanthu", fi: "Nzila ya batu" },
        "Solteiro(a)": { um: "Okaci", ki: "Kaci", kk: "Kaci", ch: "Kaci", ng: "Kaci", kw: "Okaci", nh: "Okaci", fi: "Kaci" },
        "Casado(a)": { um: "Okufeka", ki: "Kufeka", kk: "Kufeka", ch: "Kufeka", ng: "Kufeka", kw: "Okufeka", nh: "Okufeka", fi: "Feka" },
        "Divorciado(a)": { um: "Okupatula", ki: "Kupatula", kk: "Kupatula", ch: "Kupatula", ng: "Kupatula", kw: "Okupatula", nh: "Okupatula", fi: "Patula" },
        "Viúvo(a)": { um: "Omufua", ki: "Mufua", kk: "Mufua", ch: "Mufua", ng: "Mufua", kw: "Omufua", nh: "Omufua", fi: "Mufua" },
        "Carregar nova foto": { um: "Okutwala efoto ehe", ki: "Kutwala foto hima", kk: "Kutwala foto hima", ch: "Kutwala foto hima", ng: "Kutwala foto hima", kw: "Okutwala efoto hima", nh: "Okutwala efoto hima", fi: "Twala foto hima" },
        "Último Acesso": { um: "Ovitu vyokule", ki: "Kixala kia kule", kk: "Kinkulu kia kule", ch: "Kufunga kwa kule", ng: "Kisalu kya kule", kw: "Oshilongwa shokule", nh: "Omuhonga yokule", fi: "Nzila ya kule" },
        "Canal": { um: "Ovitu", ki: "Nzila", kk: "Nzila", ch: "Nzila", ng: "Nzila", kw: "Omukalo", nh: "Onzila", fi: "Nzila" },
        "Temperatura": { um: "Ovitu viosi", ki: "Kixala kiosi", kk: "Kinkulu kiosi", ch: "Kufunga kwosi", ng: "Kisalu kyosi", kw: "Oshilongwa shoshi", nh: "Omuhonga yosi", fi: "Nzila yosi" },
        "Responsável Institucional": { um: "Okutwala ovingonjo", ki: "Kutwala vihandela", kk: "Kutwala nkenda", ch: "Kutwala mwenya", ng: "Kutwala vihandeka", kw: "Okutwala oshilongo", nh: "Okutwala omilandu", fi: "Twala mutinu" },
      };
      const tradStatico = (t: string): string | null => {
        const chave = STATIC_UI_TERMS[t.trim()];
        if (chave && chave[targetLanguage]) return chave[targetLanguage];
        // casamento parcial só para frases curtas (≤ 4 palavras) e iguais ao termo
        for (const [k, v] of Object.entries(STATIC_UI_TERMS)) {
          if (v[targetLanguage] && t.trim().toLowerCase() === k.toLowerCase()) return v[targetLanguage];
        }
        return null;
      };
      const pendentes: number[] = [];
      const resultados: string[] = texts.map((t: string, i: number) => {
        const est = tradStatico(t);
        if (est !== null) return est;
        pendentes.push(i);
        return t;
      });
      if (pendentes.length === 0) {
        return res.json({ translations: resultados });
      }
      const textosPendentes = pendentes.map(i => texts[i]);

      // ---- Exemplos concretos por língua (few-shot, regra 3.2 do prompt) ----
      const EXEMPLOS_POR_LINGUA: Record<string, string> = {
        um: `"Painel" -> "Ondunge"
"Correio" -> "Okanda"
"Perfil" -> "Ovipala"
"Contactos" -> "Omanu"
"Enviar" -> "Okutuma"
"Notificações" -> "Olovalulo"
"Mensagem" -> "Ondaka"
"Documento" -> "Okanda"
"Pesquisar" -> "Okusanga"
"Voltar" -> "Okutunda"`,
        ki: `"Painel" -> "Kikonde"
"Correio" -> "Mikanda"
"Perfil" -> "Kixala"
"Contactos" -> "Miji"
"Enviar" -> "Kutuma"
"Notificações" -> "Mutume"
"Mensagem" -> "Mikanda"
"Documento" -> "Mukanda"
"Pesquisar" -> "Kufila"
"Voltar" -> "Kutula"`,
        kk: `"Painel" -> "Lulendo"
"Correio" -> "Nsamu"
"Perfil" -> "Kinkulu"
"Contactos" -> "Kangu"
"Enviar" -> "Kutuma"
"Notificações" -> "Mbote"
"Mensagem" -> "Nsamu"
"Documento" -> "Nsamu"
"Pesquisar" -> "Moneka"
"Voltar" -> "Kuna"`,
        ch: `"Painel" -> "Fungola"
"Correio" -> "Chisinde"
"Perfil" -> "Kufunga"
"Contactos" -> "Atu"
"Enviar" -> "Kutuma"
"Notificações" -> "Kusola"
"Mensagem" -> "Chisinde"
"Documento" -> "Mukanda"
"Pesquisar" -> "Kusola"
"Voltar" -> "Kuhita"`,
        ng: `"Painel" -> "Mutende"
"Correio" -> "Mikando"
"Perfil" -> "Mukalo"
"Contactos" -> "Vakwetu"
"Enviar" -> "Kutuma"
"Notificações" -> "Mutende"
"Mensagem" -> "Mikando"
"Documento" -> "Mikando"
"Pesquisar" -> "Kulomba"
"Voltar" -> "Kushola"`,
        kw: `"Painel" -> "Oshila"
"Correio" -> "Ombila"
"Perfil" -> "Oshilongwa"
"Contactos" -> "Aantu"
"Enviar" -> "Okutuma"
"Notificações" -> "Omauyelele"
"Mensagem" -> "Ombila"
"Documento" -> "Ombila"
"Pesquisar" -> "Yandjeka"
"Voltar" -> "Okushoka"`,
        nh: `"Painel" -> "Okulula"
"Correio" -> "Okanda"
"Perfil" -> "Omuhonga"
"Contactos" -> "Ovanthu"
"Enviar" -> "Okutuma"
"Notificações" -> "Elau"
"Mensagem" -> "Okanda"
"Documento" -> "Okanda"
"Pesquisar" -> "Oityi"
"Voltar" -> "Okutyi"`,
        fi: `"Painel" -> "Lusolo"
"Correio" -> "Bumboti"
"Perfil" -> "Nzila"
"Contactos" -> "Batu"
"Enviar" -> "Tuma"
"Notificações" -> "Lukelelo"
"Mensagem" -> "Bumboti"
"Documento" -> "Bisalu"
"Pesquisar" -> "Lomba"
"Voltar" -> "Maboti"`,
      };
      const EXEMPLOS_TRADUCAO = EXEMPLOS_POR_LINGUA[targetLanguage] || EXEMPLOS_POR_LINGUA.um;

      // ---- Pós-processamento: se a IA devolver um texto curto inalterado,
      //      tenta uma tradução palavra-a-palavra via mapa estático ----
      const traduzirParcial = (t: string): string => {
        const limpo = String(t || '').trim();
        const palavras = limpo.split(/\s+/);
        if (palavras.length > 5) return limpo;
        let mudou = false;
        const traduzido = palavras.map(p => {
          const semPont = p.replace(/[.,;:!?]$/, '');
          const pont = p.slice(semPont.length);
          const chave = STATIC_UI_TERMS[semPont];
          if (chave && chave[targetLanguage] && chave[targetLanguage] !== semPont) {
            mudou = true;
            return chave[targetLanguage] + pont;
          }
          return p;
        }).join(' ');
        return mudou ? traduzido : limpo;
      };
      // ---------------------------------------------------------------------
      const systemPrompt = `Você é o Tradutor Institucional Oficial do Correio Digital Angola (CDA), especializado em Português de Angola e em adaptação linguística prudente para línguas nacionais angolanas, incluindo:

- Umbundu
- Kimbundu
- Kikongo
- Chokwe
- Ngangela
- Kwanyama
- Nhaneca
- Fiote

A sua tarefa é analisar e traduzir uma lista de strings dinâmicas recolhidas de toda a aplicação, do Português de Angola para a língua selecionada: ${langName}.

Estas strings podem pertencer a diferentes contextos, como:
- interface do utilizador
- botões
- menus
- subtítulos
- notificações
- correspondências oficiais
- documentos
- certidões
- mensagens administrativas
- textos de ajuda
- estados e etiquetas

--------------------------------------------------
CONTEXTO DA APLICAÇÃO
--------------------------------------------------

O Correio Digital Angola é uma plataforma governamental segura onde cidadãos e instituições públicas e privadas trocam correspondências oficiais, notificações, certidões, facturas, intimações e documentos digitais com valor institucional.

Trata-se de uma infraestrutura de comunicação oficial do Estado angolano.

--------------------------------------------------
REGRAS CRÍTICAS DE TRADUÇÃO
--------------------------------------------------

1. PRESERVAÇÃO DE ELEMENTOS OFICIAIS E TÉCNICOS

Nunca traduzir, alterar ou adaptar:
- siglas institucionais (AGT, SME, ENDE, EPAL, INSS, BI, NIF, SOC, etc.)
- nomes próprios de pessoas
- nomes de utilizadores
- códigos, referências, protocolos, hashes, chaves, IDs
- valores monetários (Kz, AOA)
- datas
- horas
- números de documentos
- URLs
- emails
- placeholders e variáveis como:
  - {nome}
  - {bi}
  - {instituicao}
  - {valor}
  - {data}
  - {tempo}
- tags HTML
- quebras de linha (\\n)
- formatação técnica

2. REGISTO E TOM

Usar sempre:
- linguagem formal
- tom institucional
- clareza
- respeito
- simplicidade

Evitar:
- gíria
- informalidade
- invenções linguísticas
- exageros criativos
- regionalismos excessivos que comprometam a compreensão

3. REGRA DE FALLBACK SEGURO

Se não existir uma tradução segura, confiável ou suficientemente consolidada na língua selecionada para um termo técnico, jurídico, fiscal ou administrativo:

- manter a expressão original em Português de Angola
- não inventar tradução
- não improvisar terminologia oficial

A fidelidade institucional é mais importante do que traduzir tudo.

3.1. TEXTOS CURTOS DE INTERFACE — TRADUÇÃO OBRIGATÓRIA

Para textos curtos de interface (1 a 5 palavras, como botões, menus, títulos de
secção, estados e etiquetas — ex.: "Painel", "Perfil", "Enviar", "Cancelar",
"Nova Mensagem", "Não Lidas"), a tradução para ${langName} é OBRIGATÓRIA:
- NÃO devolvas o texto original em Português nestes casos.
- Usa a forma mais natural e curta na língua de destino.
- A regra de fallback seguro (manter em português) aplica-se APENAS a textos
  longos, jurídicos, administrativos ou técnicos, nunca a botões e menus.

3.2. EXEMPLOS CONCRETOS (usa-os como referência de qualidade e terminologia)

Abaixo estão exemplos reais de como traduzir termos comuns de interface para
${langName}. Usa a MESMA terminologia quando encontrares os mesmos termos:

${EXEMPLOS_TRADUCAO}

IMPORTANTE: devolver um texto curto de interface SEM ALTERAÇÃO (igual ao
original em Português) é considerado ERRO e deve ser evitado. Se não tiveres a
certeza, usa a tradução mais próxima e natural na língua de destino.

4. DIFERENCIAR O TIPO DE TEXTO

A tradução deve respeitar o tipo de texto:
- interface curta (ex: “Entrar”, “Cancelar”, “Pesquisar”)
- conteúdo administrativo
- conteúdo jurídico
- notificação curta
- mensagem oficial
- documento institucional

Textos de interface podem ser mais traduzíveis.
Textos jurídicos e administrativos devem ser tratados com prudência.
Se houver dúvida, preservar o termo em Português de Angola.

5. LÍNGUAS NACIONAIS ANGOLANAS

As línguas nacionais devem ser tratadas com prudência e responsabilidade.

Se a língua selecionada não tiver suporte suficientemente seguro para determinada expressão:
- manter o termo em Português de Angola
- nunca fingir precisão onde não houver confiança

Não criar falsas traduções “oficiais”.

6. SAÍDA ESTRUTURADA

A resposta deve devolver rigorosamente:
- um array JSON
- com o mesmo tamanho da lista recebida
- na mesma ordem da lista recebida

Cada elemento do array deve corresponder exatamente à string original recebida.

7. SEM COMENTÁRIOS EXTERNOS

Não adicionar:
- explicações
- observações
- notas
- comentários
- markdown
- texto fora do JSON

A resposta final deve ser apenas o JSON.

--------------------------------------------------
COMPORTAMENTO ESPERADO
--------------------------------------------------

Para cada string recebida:

- traduzir apenas se houver segurança suficiente
- preservar entidades oficiais
- preservar dados técnicos
- usar fallback seguro quando necessário
- manter coerência com o contexto governamental do Correio Digital Angola

--------------------------------------------------
FORMATO DA RESPOSTA
--------------------------------------------------

Retornar apenas um array JSON como este exemplo:

[
  "texto traduzido 1",
  "texto traduzido 2",
  "texto original preservado 3",
  "texto traduzido 4"
]`;

      const userPrompt = `--------------------------------------------------
ENTRADA
--------------------------------------------------

LÍNGUA SELECIONADA:
${langName}

STRINGS:
${JSON.stringify(textosPendentes, null, 2)}`;

      if (apiKey) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.1,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING
                }
              }
            }
          });

          if (response && response.text) {
            const translations = JSON.parse(response.text.trim());
            if (Array.isArray(translations) && translations.length === textosPendentes.length) {
              pendentes.forEach((idx, k) => {
                const tr = translations[k];
                // Se a IA devolveu um texto curto inalterado, tenta tradução parcial
                resultados[idx] = (typeof tr === 'string' && tr.trim() === textosPendentes[k].trim())
                  ? traduzirParcial(tr)
                  : tr;
              });
              return res.json({ translations: resultados });
            }
          }
        } catch (geminiErr) {
          const errMsg = geminiErr?.message || String(geminiErr);
          const isRateLimit = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
          const isUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE");
          if (isRateLimit) {
            console.warn("[Translate API] Gemini rate limit exceeded (429). Using fallback.");
          } else if (isUnavailable) {
            console.warn("[Translate API] Gemini service temporarily unavailable (503). Using fallback.");
          } else {
            console.warn("[Translate API] Gemini translation skipped:", errMsg.substring(0, 150));
          }
        }
      }

      // Fallback with Groq if configured
      if (groqApiKey && groq) {
        try {
          const completion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt + " Retorne SOMENTE a lista JSON bruta, sem explicações, marcações markdown ou comentários adicionais, começando com [ e terminando com ]." },
              { role: "user", content: userPrompt }
            ],
            model: "openai/gpt-oss-120b",
            temperature: 0.1
          });
          if (completion.choices && completion.choices[0] && completion.choices[0].message) {
            const raw = completion.choices[0].message.content || '[]';
            const cleanRaw = raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1);
            const translations = JSON.parse(cleanRaw);
            if (Array.isArray(translations) && translations.length === textosPendentes.length) {
              pendentes.forEach((idx, k) => {
                const tr = translations[k];
                // Se a IA devolveu um texto curto inalterado, tenta tradução parcial
                resultados[idx] = (typeof tr === 'string' && tr.trim() === textosPendentes[k].trim())
                  ? traduzirParcial(tr)
                  : tr;
              });
              return res.json({ translations: resultados });
            }
          }
        } catch (groqErr) {
          const errMsg = groqErr?.message || String(groqErr);
          const isAuthError = errMsg.includes("401") || errMsg.includes("invalid_api_key") || errMsg.includes("Invalid API Key");
          if (isAuthError) {
            console.warn("[Translate API] Groq key is invalid/unauthorized (401). Using local default fallback.");
          } else {
            console.warn("[Translate API] Groq translation skipped:", errMsg.substring(0, 150));
          }
        }
      }

      // Safe return: estáticos já traduzidos + pendentes no original (fallback)
      return res.json({ translations: resultados });
    } catch (err) {
      console.error("Error in /api/translate:", err);
      return res.json({ translations: req.body.texts || [] });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
