import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import {
  MOCK_SESSION_USER,
  MOCK_CONTACTS,
  MOCK_DOCUMENTS,
  MOCK_NOTIFICATIONS,
  MOCK_USER_REQUESTS,
  MOCK_DOC_REQUESTS,
  MOCK_AUDIT_LOGS,
  MOCK_GOV_CORRESPONDENCES,
  MOCK_INSTITUTIONAL_INBOX,
  MOCK_SENT_MESSAGES,
} from '../src/constants/mocks';
import { INBOX } from '../src/constants/data';

// Integração Supabase 2026 - Correio Digital Angola
// Project ID: klrclczcahfycfdxzdqs
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://klrclczcahfycfdxzdqs.supabase.co';
const supabaseKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials are missing. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON) no ficheiro .env');
  console.error('Veja .env.example para referência. NUNCA faça hardcode de chaves no código-fonte.');
  console.error('Project: Correio Digital Angola (klrclczcahfycfdxzdqs)');
  process.exit(1);
}

console.log(`[CDA] Conectando Supabase: ${supabaseUrl}`);
console.log(`[CDA] Project ID: klrclczcahfycfdxzdqs`);
console.log(`[CDA] Key type: ${supabaseKey.startsWith('sb_secret') ? 'SECRET_KEY' : supabaseKey.startsWith('sb_publishable') ? 'PUBLISHABLE_KEY' : supabaseKey.includes('service_role') ? 'SERVICE_ROLE_JWT' : 'ANON_JWT'}`);

// SECURITY: validar URL
try {
  const parsed = new URL(supabaseUrl);
  if (!parsed.hostname.endsWith('.supabase.co') && !parsed.hostname.includes('localhost')) {
    console.error('Supabase URL inválida ou suspeita:', parsed.hostname);
    process.exit(1);
  }
} catch {
  console.error('SUPABASE_URL malformada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { realtime: { transport: ws as any } });

const resolveInstitutionCode = (label?: string): string => {
  if (!label) return 'AGT';
  const explicit = label.match(/\(([^)]+)\)/)?.[1];
  if (explicit) return explicit.toUpperCase();
  const normalized = label.toUpperCase();
  if (normalized.includes('AGT') || normalized.includes('TRIBUT')) return 'AGT';
  if (normalized.includes('SME') || normalized.includes('MIGRA')) return 'SME';
  if (normalized.includes('ENDE')) return 'ENDE';
  if (normalized.includes('EPAL')) return 'EPAL';
  if (normalized.includes('TRIBUNAL')) return 'TRIBUNAL';
  return normalized.split(' ')[0].replace(/[^A-Z]/g, '').slice(0, 12) || 'INST';
};

async function upsertProfile(profile: { bi: string; name: string; phone?: string; nif?: string; passport?: string; birthDate?: string; filiation?: string; maritalStatus?: string; role?: string }) {
  const payload = {
    bi: profile.bi,
    name: profile.name,
    phone: profile.phone || null,
    nif: profile.nif || null,
    passport: profile.passport || null,
    birth_date: profile.birthDate ? profile.birthDate.split('/').reverse().join('-') : null,
    filiation: profile.filiation || null,
    marital_status: profile.maritalStatus || null,
    role: profile.role || 'user'
  };
  const { error } = await supabase.from('profiles').upsert([payload], { onConflict: 'bi' });
  if (error) throw error;
}

async function insertOfficialMessage(msg: any, recipientBi: string, institutionLabel: string) {
  const institutionCode = resolveInstitutionCode(institutionLabel || msg.org);
  const payload = {
    id: msg.id,
    sender_bi: institutionCode,
    recipient_bi: recipientBi,
    org: institutionCode,
    preview: msg.preview,
    unread: !!msg.unread,
    status: msg.status || 'Normal',
    subject: msg.details?.subject || msg.preview,
    body: msg.details?.body || '',
    deadline_text: msg.details?.deadline || 'Sem prazo',
    state_indicator: msg.details?.state || 'Entregue',
    actions: msg.details?.actions || [],
    attachments: msg.details?.attachments || [],
    sensitivity: msg.sensitivity || 'Privado',
    priority_scale: msg.priorityScale || 'Normal',
    deadline_hours_remaining: msg.deadlineHoursRemaining || null,
  };
  const { error } = await supabase.from('messages').upsert([payload]);
  if (error) throw error;
}

async function insertCitizenMessage(msg: any, citizenBi: string, institutionLabel: string) {
  const institutionCode = resolveInstitutionCode(institutionLabel || msg.org);
  const payload = {
    id: msg.id,
    sender_bi: citizenBi,
    recipient_bi: institutionCode,
    org: institutionCode,
    preview: msg.preview,
    unread: true,
    status: msg.status || 'Informativo',
    subject: msg.details?.subject || msg.preview,
    body: msg.details?.body || '',
    deadline_text: msg.details?.deadline || 'Sem prazo',
    state_indicator: msg.details?.state || 'Recebida',
    actions: msg.details?.actions || [],
    attachments: msg.details?.attachments || [],
    sensitivity: msg.sensitivity || 'Privado',
    priority_scale: msg.priorityScale || 'Normal',
    deadline_hours_remaining: msg.deadlineHoursRemaining || null,
  };
  const { error } = await supabase.from('messages').upsert([payload]);
  if (error) throw error;
}

async function run() {
  console.log('Seeding Supabase for Correio Digital Angola...');

  await upsertProfile({
    bi: MOCK_SESSION_USER.bi,
    name: MOCK_SESSION_USER.name,
    phone: MOCK_SESSION_USER.phone,
    nif: MOCK_SESSION_USER.nif,
    passport: MOCK_SESSION_USER.passport,
    birthDate: MOCK_SESSION_USER.birthDate,
    filiation: MOCK_SESSION_USER.filiation,
    maritalStatus: MOCK_SESSION_USER.maritalStatus,
    role: 'user',
  });

  const supportProfiles = [
    { bi: '008812342LA011', name: 'Maria Antónia', role: 'user' },
    { bi: '007112009LA031', name: 'João Manuel', role: 'user' },
    { bi: '003456789CA077', name: 'José Kalunga', role: 'user' },
    { bi: '009991332LA018', name: 'Ana Baptista', role: 'user' },
    { bi: 'AGT', name: 'Administração Geral Tributária', role: 'institution' },
    { bi: 'SME', name: 'Serviço de Migração e Estrangeiros', role: 'institution' },
    { bi: 'CDA', name: 'Administração Central do Correio Digital Angola', role: 'admin' },
  ];
  for (const profile of supportProfiles) await upsertProfile(profile as any);

  for (const contact of MOCK_CONTACTS) {
    const { error } = await supabase.from('contacts').upsert([{
      id: contact.id,
      owner_bi: MOCK_SESSION_USER.bi,
      name: contact.name,
      bi: contact.bi,
      relation: contact.relation,
      status: contact.status,
      type: contact.type || 'Normal'
    }], { onConflict: 'id' });
    if (error) console.warn('contact seed warning:', contact.name, error.message);
  }

  for (const doc of MOCK_DOCUMENTS) {
    await supabase.from('documents').upsert([{
      name: doc.name,
      validity: doc.validity,
      code: doc.code,
      holder_bi: MOCK_SESSION_USER.bi,
      document_number: doc.number,
      issuer: doc.issuer,
      issued_at: doc.issuedAt,
    }], { onConflict: 'code' });
  }

  const { count: existingNotifications } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('target_bi', MOCK_SESSION_USER.bi);
  if (!existingNotifications) {
    for (const notification of MOCK_NOTIFICATIONS) {
      const { error } = await supabase.from('notifications').insert([{ target_bi: MOCK_SESSION_USER.bi, title: notification.title, message: notification.message, time_text: notification.time, type: notification.type, target_tab: notification.targetTab }]);
      if (error) console.warn('notification seed warning:', notification.title, error.message);
    }
  }

  for (const request of MOCK_USER_REQUESTS) {
    const { error } = await supabase.from('user_requests').upsert([{
      id: request.id,
      user_bi: request.bi,
      user_name: request.user,
      service_type: request.type,
      priority: request.priority,
      time_text: request.time,
      status: request.status,
      institution: request.institution || 'AGT',
    }], { onConflict: 'id' });
    if (error) console.warn('user_request seed warning:', request.id, error.message);
  }

  for (const request of MOCK_DOC_REQUESTS) {
    const { error } = await supabase.from('document_requests').upsert([{
      id: request.id,
      user_name: request.userName,
      user_bi: request.userBi,
      doc_type: request.docType,
      institution: request.institution,
      status: request.status,
      ai_status: request.aiStatus || 'manual-review',
    }], { onConflict: 'id' });
    if (error) console.warn('document_request seed warning:', request.id, error.message);
  }

  const { count: existingAuditLogs } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true });
  if (!existingAuditLogs) {
    for (const log of MOCK_AUDIT_LOGS.slice(0, 20)) {
      const { error } = await supabase.from('audit_logs').insert([{ action: log.action, username: log.user, action_type: log.type || 'info' }]);
      if (error) console.warn('audit_log seed warning:', log.action, error.message);
    }
  }

  for (const msg of INBOX) await insertOfficialMessage(msg, MOCK_SESSION_USER.bi, msg.org);
  for (const msg of MOCK_SENT_MESSAGES) await insertCitizenMessage(msg, MOCK_SESSION_USER.bi, msg.org);
  for (const msg of MOCK_INSTITUTIONAL_INBOX) {
    const inferredCitizenBi = msg.details?.body?.match(/BI:\s*([A-Z0-9]+)/i)?.[1] || MOCK_SESSION_USER.bi;
    await upsertProfile({ bi: inferredCitizenBi, name: msg.org.replace('Cidadão: ', ''), role: 'user' });
    const targetInstitution = msg.institution || 'AGT';
    await insertCitizenMessage(msg, inferredCitizenBi, targetInstitution);
  }

  for (const correspondence of MOCK_GOV_CORRESPONDENCES) {
    await supabase.from('messages').upsert([{
      id: parseInt(String(correspondence.id).replace(/\D/g, '')),
      sender_bi: resolveInstitutionCode(correspondence.institution),
      recipient_bi: correspondence.recipient,
      org: correspondence.institution,
      preview: correspondence.subject,
      unread: correspondence.status === 'Não Lida',
      status: correspondence.priority || 'Normal',
      subject: correspondence.subject,
      body: correspondence.body,
      deadline_text: correspondence.originProvince,
      state_indicator: correspondence.destinationProvince,
      actions: [correspondence.status],
      attachments: [],
      sensitivity: 'Privado',
      priority_scale: correspondence.priority || 'Média',
      deadline_hours_remaining: null,
    }], { onConflict: 'id' });
  }

  const tables = ['profiles','messages','documents','contacts','notifications','user_requests','document_requests','audit_logs'];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(table, { count, error: error?.message });
  }

  console.log('Supabase bootstrap concluído.');
}

run().catch((error) => {
  console.error('Falha ao popular o Supabase:', error);
  process.exit(1);
});
