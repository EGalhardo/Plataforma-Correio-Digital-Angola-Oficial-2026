// ============================================================================
// registoBgService — v37.78.17 · REGRAS UX: PROCESSAMENTO EM SEGUNDO PLANO
// (docs/REGRAS_UX_PROCESSAMENTO_EM_SEGUNDO_PLANO.md)
//
// O pipeline pesado do registo (uploads ao Storage + Pré-Verificação IA +
// provisionamento de conta na nuvem + insert na fila de homologação + desfecho)
// corre DEPOIS da confirmação imediata ao cidadão (popup com Nº de Acesso).
// Para o «segundo plano» ser REAL — e não morrer com um refresh/fecho da
// página no meio — o trabalho é descrito num JOB persistido no localStorage:
//   • gravarJob()       — persiste o job ANTES de o lançar;
//   • correrRegistoBg() — executa o pipeline (idempotente na retoma);
//   • retomarRegistosBg() — relança jobs sem desfecho (boot da aplicação ou
//     login — o cidadão que fechou o browser a meio não perde o registo);
//   • temRegistoBgAtivo() — usado pelo login para NÃO confundir a janela de
//     processamento com uma «conta eliminada» (F47 falso-positivo).
//
// Ideologias preservadas: F28 (falha/dúvida ⇒ nunca auto-aprovar ⇒ Pendente),
// F47 (re-registo de conta eliminada ⇒ nunca auto-aprovado), D3 (a nuvem
// nunca quebra o registo), porta de divergências REAIS ⇒ correcções.
// ============================================================================
import { supabase } from '../lib/supabaseClient';
import { registoPublicoProxy } from './supabaseService';
import { homologationStore, notifyAccountApproved } from './homologationStore';
import { requestPviVerification, buildPvicMarker, type PviVerdict } from './preVerificationService';
import { provisionCloudAccount, markCloudAccount, isSupabaseConfigured, syntheticCitizenEmail } from './cloudAuthService';
import { buildStorageRef } from '../lib/secureStorage';

export type AnaliseEstado = 'em_analise' | 'aprovado' | 'correcoes';
export type DesfechoBg = 'aprovado' | 'correcoes' | 'pendente';

export interface RegistoBgPayload {
  newUser: any;
  password: string;
  appMode: 'user' | 'institution' | string;
  /** data-URLs comprimidos (≤1024px) — a retoma não depende dos File objects. */
  frenteDataUrl: string;
  versoDataUrl: string;
  savedFacePhoto: string | null;
  dataNascimento: string;
  sexo: string;
  verificationReport: any | null;
}

export interface RegistoBgJob {
  bi: string;
  startedAt: number;
  tentativa: number;
  /** resultado do provisionamento já executado (idempotência na retoma) */
  provOutcome?: string | null;
  retomado?: boolean;
  payload: RegistoBgPayload;
}

const JOBS_KEY = 'cda_registo_bg_v1';
const TTL_MS = 24 * 60 * 60 * 1000; // jobs órfãos expiram em 24h

/** Evento DOM do desfecho — a UI viva (RegisterStepper) escuta-o se montado. */
export const EVENTO_DESFECHO_BG = 'cda-registo-bg-desfecho';

export interface BgHooks {
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
  setSubmitMessage?: (m: string) => void;
  setSubmitError?: (m: string) => void;
  setAnaliseEstado?: (e: AnaliseEstado) => void;
  setReprovacaoInfo?: (info: { motivo?: string; alertas?: string[] } | null) => void;
  setPviAutoApproved?: (v: boolean) => void;
  pedirPopupAprovado?: () => void;
}

// ------------------------------ base64 ↔ blob ------------------------------
const base64ToBlob = (base64Str: string): Blob => {
  try {
    const parts = base64Str.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const uInt8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
    return new Blob([uInt8Array], { type: contentType });
  } catch (e) {
    console.error('Error converting base64 to blob:', e);
    return new Blob([], { type: 'image/jpeg' });
  }
};

// ------------------------------ persistência ------------------------------
type JobsMap = Record<string, RegistoBgJob>;

const readJobs = (): JobsMap => {
  try { return JSON.parse(localStorage.getItem(JOBS_KEY) || '{}') as JobsMap; } catch { return {}; }
};
const writeJobs = (m: JobsMap): void => {
  try { localStorage.setItem(JOBS_KEY, JSON.stringify(m)); } catch { /* quota — ignora */ }
};

export const gravarJob = (job: RegistoBgJob): void => {
  const m = readJobs();
  m[job.bi] = job;
  writeJobs(m);
};
export const apagarJob = (bi: string): void => {
  const m = readJobs();
  delete m[bi];
  writeJobs(m);
};
export const temRegistoBgAtivo = (bi?: string): boolean => {
  if (!bi) return false;
  const j = readJobs()[String(bi).toUpperCase().replace(/\s+/g, '')];
  return !!j && Date.now() - j.startedAt < TTL_MS;
};
export const listarJobsAtivos = (): RegistoBgJob[] =>
  Object.values(readJobs()).filter((j) => Date.now() - j.startedAt < TTL_MS);

/** Actualiza a entrada do cidadão em gov_admin_citizens (best-effort). */
const actualizarCidadaoLocal = (bi: string, patch: Record<string, unknown>): void => {
  try {
    const lista: any[] = JSON.parse(localStorage.getItem('gov_admin_citizens') || '[]');
    const idx = lista.findIndex((c) => String(c.biNumber || '').toUpperCase() === String(bi).toUpperCase());
    if (idx >= 0) {
      lista[idx] = { ...lista[idx], ...patch };
      localStorage.setItem('gov_admin_citizens', JSON.stringify(lista));
    }
  } catch { /* melhor esforço */ }
};

const emitirDesfecho = (bi: string, tipo: DesfechoBg): void => {
  try { window.dispatchEvent(new CustomEvent(EVENTO_DESFECHO_BG, { detail: { bi, tipo } })); } catch { /* ignora */ }
};

// ============================================================================
// PIPELINE — uploads + PVI + provisionamento + insert + desfecho
// ============================================================================
export const correrRegistoBg = async (job: RegistoBgJob, hooks: BgHooks): Promise<DesfechoBg> => {
  const { newUser, password } = job.payload;
  const appMode = String(job.payload.appMode || 'user');
  const biClean = String(newUser.biNumber || '').replace(/\s+/g, '');
  job.tentativa += 1;
  gravarJob(job);

  let urlFrente = '';
  let urlVerso = '';
  let urlSelfie = '';
  let pviVerdict: PviVerdict | null = null;
  let pviAutoApproved = false;
  let cloudPreExisting = false;
  let provOutcome: string | null = job.provOutcome ?? null;
  let effectiveAutoApproved = false;
  let desfecho: DesfechoBg = 'pendente';
  let insertFalhouRede = false;

  const isSupabaseReady = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  try {
    if (isSupabaseReady) {
      hooks.setSubmitMessage?.('Enviando documentos para o Supabase Storage...');

      // v37.78.17 — as faces chegam já comprimidas em data-URL (gravadas no job);
      // o upload ao Storage usa o blob do data-URL (a PVI usa o data-URL directo).
      const frenteBlob: Blob | null = job.payload.frenteDataUrl ? base64ToBlob(job.payload.frenteDataUrl) : null;
      const versoBlob: Blob | null = job.payload.versoDataUrl ? base64ToBlob(job.payload.versoDataUrl) : null;
      const uploadTs = Date.now();

      const uploadsPromise = (async () => {
        const uploadFrente = async () => {
          if (!frenteBlob) return;
          const frontPath = `${biClean}/frente_${uploadTs}.jpg`;
          const { error: fErr } = await supabase.storage
            .from('documentos_registo')
            .upload(frontPath, frenteBlob, { contentType: frenteBlob.type || 'image/jpeg' });
          if (fErr) {
            console.error('Erro upload frente:', fErr);
            hooks.addAuditLog(`[PVIC] Upload da FRENTE do B.I. ao Storage falhou (${(fErr as any)?.message || 'erro'}) — a validação prossegue com a imagem local.`, 'warning');
          } else {
            urlFrente = buildStorageRef('documentos_registo', frontPath);
          }
        };
        const uploadVerso = async () => {
          if (!versoBlob) return;
          const backPath = `${biClean}/verso_${uploadTs}.jpg`;
          const { error: bErr } = await supabase.storage
            .from('documentos_registo')
            .upload(backPath, versoBlob, { contentType: versoBlob.type || 'image/jpeg' });
          if (bErr) {
            console.error('Erro upload verso:', bErr);
            hooks.addAuditLog(`[PVIC] Upload do VERSO do B.I. ao Storage falhou (${(bErr as any)?.message || 'erro'}) — a validação prossegue com a imagem local.`, 'warning');
          } else {
            urlVerso = buildStorageRef('documentos_registo', backPath);
          }
        };
        await Promise.all([uploadFrente(), uploadVerso()]);

        if (job.payload.savedFacePhoto) {
          try {
            let selfieBlob: Blob | null = null;
            if (job.payload.savedFacePhoto.startsWith('data:image/')) {
              selfieBlob = base64ToBlob(job.payload.savedFacePhoto);
            } else {
              try { const res = await fetch(job.payload.savedFacePhoto); selfieBlob = await res.blob(); } catch { /* usa directo */ }
            }
            if (selfieBlob) {
              const selfiePath = `${biClean}/selfie_${Date.now()}.jpg`;
              const { error: sErr } = await supabase.storage
                .from('documentos_registo')
                .upload(selfiePath, selfieBlob, { contentType: 'image/jpeg' });
              if (sErr) console.error('Erro upload selfie:', sErr);
              else urlSelfie = buildStorageRef('documentos_registo', selfiePath);
            } else {
              urlSelfie = job.payload.savedFacePhoto;
            }
          } catch (selfieErr) {
            console.error('Erro processando selfie upload:', selfieErr);
            urlSelfie = job.payload.savedFacePhoto;
          }
        }
      })();

      // F28 — Portas 2 e 3 da IA de visão; qualquer falha/dúvida ⇒ REVISAO.
      const pviPromise = (async (): Promise<PviVerdict> => {
        const frenteParaPvi = job.payload.frenteDataUrl || urlFrente;
        const versoParaPvi = job.payload.versoDataUrl || urlVerso;
        const uploadsOk = !!(urlFrente && urlVerso);
        if (uploadsOk || (frenteParaPvi && versoParaPvi)) {
          if (!uploadsOk) {
            hooks.addAuditLog('[PVIC] Imagens do B.I. não chegaram ao Storage — a Pré-Verificação prossegue com as imagens locais e a aprovação automática fica suprimida (homologação manual).', 'warning');
          }
          hooks.setSubmitMessage?.('Pré-Verificação Inteligente (IA): a analisar as imagens do documento...');
          return await requestPviVerification({
            biNumber: newUser.biNumber,
            nome: newUser.name,
            tipo: appMode === 'institution' ? 'instituicao' : 'cidadao',
            urls: { frente: frenteParaPvi, verso: versoParaPvi },
            ...(appMode !== 'institution' ? { dataNascimento: job.payload.dataNascimento, sexo: job.payload.sexo } : {}),
          });
        }
        return {
          veredicto: 'REVISAO',
          alertas: ['sem_imagens_nuvem'],
          motivo: 'Imagens do documento indisponíveis na nuvem — homologação manual.',
          duracaoMs: 0,
          modelo: 'meta-llama/llama-4-scout-17b-16e-instruct',
        };
      })();

      await Promise.all([uploadsPromise.catch(() => null), pviPromise]);
      pviVerdict = await pviPromise;
      const uploadCompleto = !!(urlFrente && urlVerso);
      const pviLocalEngineOk = job.payload.verificationReport != null && job.payload.verificationReport.iaResult === 'Aprovado';
      pviAutoApproved = pviVerdict.veredicto === 'APTO' && (appMode === 'institution' ? pviLocalEngineOk : true);
      hooks.addAuditLog(
        pviAutoApproved
          ? `[PVIC] Cadastro de ${newUser.name} APROVADO AUTOMATICAMENTE pela Pré-Verificação Inteligente (veredicto APTO — modelo ${pviVerdict.modelo}, ${pviVerdict.duracaoMs}ms).`
          : `[PVIC] Cadastro de ${newUser.name} enviado para homologação manual — veredicto ${pviVerdict.veredicto}${pviVerdict.alertas.length ? ` · alertas: ${pviVerdict.alertas.join(', ')}` : ''}${pviVerdict.motivo ? ` · ${pviVerdict.motivo}` : ''}`,
        pviAutoApproved ? 'success' : 'warning'
      );

      // Porta de divergências REAIS (nome/nº/data/sexo/documento) — falhas
      // técnicas (falha_tecnica, ia_indisponivel, sem_imagens_nuvem…) seguem F28.
      const ALERTAS_DIVERGENCIA = ['nome_divergente', 'bi_divergente', 'data_divergente', 'sexo_divergente', 'documento_divergente', 'frente_verso_inconsistentes'];
      const haDivergenciaReal = (pviVerdict.alertas || []).some((a: string) => ALERTAS_DIVERGENCIA.includes(a));
      if (appMode !== 'institution' && pviVerdict.veredicto !== 'APTO' && haDivergenciaReal) {
        // v37.78.17 — SEM bloquear: o resultado chega por correspondência
        // oficial e a conta fica «Em correcção» até repetir a validação.
        homologationStore.addMessage(
          newUser.biNumber,
          'admin',
          `Exmo(a). ${newUser.name}, a análise automática do seu registo foi concluída, mas foram identificados dados que necessitam de correcção. Motivo: "${pviVerdict.motivo || 'divergência entre o formulário e o documento apresentado'}". Por favor regresse ao registo, corrija os dados e repita a validação.`,
        );
        actualizarCidadaoLocal(newUser.biNumber, { status: 'Pendente', analiseEstado: 'correcoes', pviMotivo: pviVerdict.motivo, pviAlertas: pviVerdict.alertas });
        hooks.addAuditLog(`[PVIC] Divergências no registo de ${newUser.name} — correcções necessárias; cidadão informado por correspondência oficial.`, 'warning');
        hooks.setAnaliseEstado?.('correcoes');
        hooks.setReprovacaoInfo?.({ motivo: pviVerdict.motivo, alertas: pviVerdict.alertas });
        apagarJob(biClean);
        emitirDesfecho(biClean, 'correcoes');
        return 'correcoes';
      }
      if (appMode !== 'institution') {
        newUser.verificationScore = 100;
        newUser.reason = 'Registo aprovado automaticamente: dados do formulário conferidos com os dados extraídos do B.I. pela IA (sem biometria facial).';
      }

      // F47 — CONTA ELIMINADA ⇒ NUNCA auto-aprovar. Na RETOMA o
      // provisionamento já executado NÃO se repete (evita que a própria conta
      // da 1.ª tentativa pareça um «re-registo»).
      if (appMode !== 'institution' && provOutcome === null) {
        try {
          const cloudEmail = syntheticCitizenEmail(newUser.biNumber);
          const prov = await provisionCloudAccount(supabase, {
            email: cloudEmail,
            password,
            metadata: { bi: newUser.biNumber, role: 'cidadao', name: newUser.name },
          });
          provOutcome = prov.outcome;
          gravarJob({ ...job, provOutcome });
          if (prov.outcome === 'ok' || prov.outcome === 'linked_existing') {
            markCloudAccount(newUser.biNumber, cloudEmail, 'cidadao');
          }
        } catch (cloudErr) {
          console.error('[AUTH-CLOUD] Falha inesperada no provisionamento do cidadão:', cloudErr);
        }
      }
      cloudPreExisting = provOutcome === 'linked_existing' || provOutcome === 'conflict';
      effectiveAutoApproved = pviAutoApproved && !cloudPreExisting && uploadCompleto;
      if (cloudPreExisting) {
        hooks.addAuditLog(`[F47] Re-registo do B.I. ${newUser.biNumber}: credencial de nuvem PRÉ-EXISTENTE (conta anterior eliminada pela Administração) — aprovação automática por PVI SUPRIMIDA; a conta fica PENDENTE de nova homologação.`, 'warning');
      }

      hooks.setSubmitMessage?.('Registando dados no Supabase Database...');

      const payloadRegisto = {
        nome: newUser.name,
        email: newUser.contact,
        bi_numero: newUser.biNumber,
        url_frente: urlFrente || null,
        url_verso: urlVerso || null,
        url_selfie: urlSelfie || null,
        status: effectiveAutoApproved ? 'Aprovado' : 'Pendente',
        observacoes: newUser.reason + (job.payload.verificationReport
          ? ` [KYC:${JSON.stringify({ v: 1, fm: job.payload.verificationReport.face.similarity, iq: job.payload.verificationReport.quality.score, ocr: job.payload.verificationReport.ocr.score, coh: job.payload.verificationReport.coherenceScore, ia: job.payload.verificationReport.iaResult })}]`
          : '')
          + (pviVerdict ? ` ${buildPvicMarker(pviVerdict)}` : '')
          + (effectiveAutoApproved ? ' | Aprovado automaticamente por Pré-Verificação Inteligente (IA).' : '')
          + (cloudPreExisting ? ' | Re-registo após eliminação da conta anterior — aprovação automática suprimida (F47): aguarda nova decisão da Administração.' : '')
      };
      let insertErr: any = null;
      const viaProxy = await registoPublicoProxy('insert', undefined, payloadRegisto);
      if (viaProxy !== null) {
        if (!viaProxy.ok && viaProxy.erro !== 'demo') {
          insertErr = { code: 'PROXY', message: viaProxy.erro || 'Falha ao registar na base central.' };
        }
      }
      if (viaProxy === null || (viaProxy && viaProxy.erro === 'demo')) {
        const { error: directErr } = await supabase
          .from('solicitacoes_registo')
          .insert([payloadRegisto]);
        insertErr = directErr;
      }
      if (insertErr) {
        const duplicado = insertErr.code === '23505' || /23505|duplicat|duplicad|unique/i.test(String(insertErr.message || ''));
        if (duplicado) {
          // v37.78.17 — em segundo plano não há «voltar a tentar» útil: o B.I.
          // já está na fila (corrida com a 1.ª tentativa ou registo anterior).
          // Desfecho: pendente de homologação — sem erro ao utilizador.
          hooks.addAuditLog(`[PVIC] Registo de ${newUser.name} já constava na fila central (B.I. único) — mantido PENDENTE para homologação.`, 'warning');
        } else if (insertErr.code === 'PGRST205') {
          console.warn('Tabela solicitacoes_registo não encontrada. A usar fallback para profiles.');
          const { error: profileErr } = await supabase
            .from('profiles')
            .upsert([{
              bi: newUser.biNumber,
              name: newUser.name,
              phone: null,
              nif: null,
              passport: null,
              filiation: null,
              marital_status: null,
              role: 'user'
            }], { onConflict: 'bi' });
          if (profileErr) {
            console.error('Erro fallback ao guardar perfil no Supabase:', profileErr);
          } else {
            hooks.addAuditLog(`Adesão de ${newUser.name} guardada via fallback em profiles no Supabase.`, 'warning');
          }
        } else {
          console.error('Erro ao inserir solicitacao_registo no Supabase:', insertErr);
          insertFalhouRede = true;
        }
      } else {
        hooks.addAuditLog(`Adesão de ${newUser.name} registada com sucesso no Supabase!`, 'success');
      }
    }
  } catch (err) {
    console.error('Erro global no envio do Supabase:', err);
  }

  // ------------------------------ DESFECHO ------------------------------
  try {
    // v37.78.17-fix — chaves com undefined NÃO entram no patch (não podem
    // apagar valores já gravados pela confirmação imediata, p.ex. status).
    const patchDesfecho: Record<string, unknown> = {
      status: effectiveAutoApproved ? 'Aprovado Automaticamente' : undefined,
      pviVer: pviVerdict?.veredicto,
      pviAlertas: pviVerdict?.alertas,
      pviMotivo: pviVerdict?.motivo,
      pviDuracaoMs: pviVerdict?.duracaoMs,
      pviModelo: pviVerdict?.modelo,
      pviTs: pviVerdict ? new Date().toISOString() : undefined,
      facePhoto: urlSelfie || undefined,
      analiseEstado: effectiveAutoApproved ? 'aprovado' : 'em_analise',
    };
    Object.keys(patchDesfecho).forEach((k) => { if (patchDesfecho[k] === undefined) delete patchDesfecho[k]; });
    actualizarCidadaoLocal(newUser.biNumber, patchDesfecho);
  } catch { /* melhor esforço */ }

  if (appMode !== 'institution' && isSupabaseConfigured()) {
    if (provOutcome === 'ok' || provOutcome === 'linked_existing') {
      hooks.addAuditLog(`[AUTH-CLOUD] Conta do cidadão ${newUser.name} (${newUser.biNumber}) nascida na nuvem — a palavra-passe vive apenas no Supabase Auth.`, 'success');
    } else if (provOutcome === 'pending_confirm') {
      hooks.addAuditLog('[AUTH-CLOUD] ATENÇÃO: confirmação de e-mail activa no Supabase — desactivar (Authentication → Providers → Email) para o login na nuvem funcionar.', 'warning');
    } else if (provOutcome === 'unavailable') {
      hooks.addAuditLog(`[AUTH-CLOUD] Nuvem indisponível no registo de ${newUser.name} — conta mantida local; migração just-in-time no primeiro login (D3).`, 'warning');
    }
  }

  if (effectiveAutoApproved) {
    homologationStore.setStatus(newUser.biNumber, 'active', undefined, newUser.name);
    homologationStore.clearThread(newUser.biNumber);
    notifyAccountApproved(newUser.biNumber, newUser.name);
    hooks.addAuditLog(`[PVIC] Análise IA de ${newUser.name} concluída: APTO — conta ACTIVADA e correspondência de aprovação entregue.`, 'success');
    desfecho = 'aprovado';
  } else {
    hooks.addAuditLog(`[PVIC] Análise de ${newUser.name} concluída sem aprovação automática — conta mantida PENDENTE para homologação da Administração.`, 'warning');
    desfecho = 'pendente';
  }
  hooks.setPviAutoApproved?.(effectiveAutoApproved);
  if (effectiveAutoApproved) {
    hooks.setAnaliseEstado?.('aprovado');
    hooks.pedirPopupAprovado?.();
  }

  // EMAIL DE BOAS-VINDAS (best-effort — nunca bloqueia)
  try {
    if (newUser.contact && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(newUser.contact).trim())) {
      const baseLogin = (typeof window !== 'undefined' ? window.location.origin : 'https://correio-digital-angola-oficial.vercel.app');
      fetch('/api/enviar-email-boas-vindas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: newUser.name,
          email: String(newUser.contact).trim().toLowerCase(),
          chaveAcesso: newUser.biNumber,
          senha: password,
          area: 'cidadao',
          link: baseLogin,
        }),
      })
        .then(async (r) => {
          if (r.ok) {
            hooks.addAuditLog(`[EMAIL] Boas-vindas enviada para ${newUser.contact} com os dados de acesso.`, 'success');
          } else {
            const j = await r.json().catch(() => ({} as any));
            hooks.addAuditLog(`[EMAIL] Boas-vindas não enviada (${r.status}): ${j.erro || 'falha do provedor'}.`, 'warning');
          }
        })
        .catch(() => hooks.addAuditLog('[EMAIL] Boas-vindas não enviada (rede).', 'warning'));
    }
  } catch { /* ignora */ }

  if (insertFalhouRede) {
    // v37.78.17 · checklist «falhas notificadas com motivo e opção de repetir»:
    // o job MANTÉM-SE (TTL renovado) e o processamento é RETOMADO
    // automaticamente no próximo arranque da aplicação — o cidadão não refaz
    // nada; a confirmação imediata já lhe foi dada.
    gravarJob({ ...job, startedAt: Date.now() });
    hooks.addAuditLog(`[PVIC] O registo de ${newUser.name} não chegou à fila central (falha de rede) — o sistema vai RETOMAR o processamento automaticamente no próximo arranque; o cidadão não precisa de repetir nada.`, 'warning');
  } else {
    apagarJob(biClean);
  }
  emitirDesfecho(biClean, desfecho);
  return desfecho;
};

// ============================================================================
// RETOMA — jobs sem desfecho (reload/fecho da página a meio do processamento)
// ============================================================================
export const retomarRegistosBg = async (hooks: BgHooks): Promise<number> => {
  const jobs = listarJobsAtivos();
  for (const job of jobs) {
    hooks.addAuditLog(`[PVIC] Retoma do processamento em segundo plano do registo de ${job.payload?.newUser?.name || job.bi} (tentativa ${job.tentativa + 1}).`, 'info');
    await correrRegistoBg({ ...job, retomado: true }, hooks).catch((e) =>
      console.error('[registoBg] Falha na retoma do job', job.bi, e));
  }
  return jobs.length;
};
