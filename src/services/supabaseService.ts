import { supabase } from '../lib/supabaseClient';
import { Message, Document, Contact, UserRequest, DocRequest, Correspondence, AppNotification } from '../types';
import { MOCK_CITIZENS, MOCK_USERS, MOCK_SESSION_USER } from '../constants/mocks';

/**
 * Service to connect and synchronize state with the Supabase database.
 * Formatted and typed to align 100% with /supabase/schema.sql and the application types.
 */

// Simple helper to detect if we have valid non-placeholder keys set
export const hasValidSupabaseKeys = (): boolean => {
  const url = (import.meta as any).env.VITE_SUPABASE_URL || '';
  const key = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
  return url && url !== '' && !url.includes('placeholder-url') && key && !key.includes('placeholder-anon-key');
};

export function resolveCitizenBi(nameOrBi: string): string {
  if (!nameOrBi) return MOCK_SESSION_USER.bi;
  const normalized = nameOrBi.trim().toLowerCase();
  
  // Check if it's already a BI of one of our citizens
  const matchedByBi = MOCK_CITIZENS.find(c => c.bi.toLowerCase() === normalized);
  if (matchedByBi) return matchedByBi.bi;

  // Try matching by name substring
  const matchedByName = MOCK_CITIZENS.find(c => c.fullName.toLowerCase().includes(normalized));
  if (matchedByName) return matchedByName.bi;

  // Fallback to active logged-in citizen BI if Edlasio Galhardo
  if (normalized.includes('edlasio') || normalized.includes('galhardo')) {
    return MOCK_SESSION_USER.bi;
  }
  
  // Or check if the name is a legacy mock user
  const matchedUser = MOCK_USERS.find(u => u.name.toLowerCase().includes(normalized) || u.bi.toLowerCase() === normalized);
  if (matchedUser) return matchedUser.bi;

  // If match still not found, check if input looks like BI
  if (normalized.length >= 9) {
    return nameOrBi;
  }

  return MOCK_SESSION_USER.bi; // default fallback
}

export function resolveCitizenName(bi: string): string {
  if (!bi) return MOCK_SESSION_USER.name;
  const matched = MOCK_CITIZENS.find(c => c.bi === bi);
  if (matched) return matched.fullName;
  const matchedUser = MOCK_USERS.find(u => u.bi === bi);
  if (matchedUser) return matchedUser.name;
  return bi;
}

export const resolveInstitutionCode = (label?: string): string => {
  if (!label) return 'AGT';
  const explicit = label.match(/\(([^)]+)\)/)?.[1];
  if (explicit) return explicit.toUpperCase();
  const normalized = label.toUpperCase();
  if (normalized.includes('ADMINISTRAÇÃO GERAL TRIBUTÁRIA') || normalized.includes('AGT')) return 'AGT';
  if (normalized.includes('SERVIÇO DE MIGRAÇÃO') || normalized.includes('SME')) return 'SME';
  if (normalized.includes('ENDE')) return 'ENDE';
  if (normalized.includes('EPAL')) return 'EPAL';
  if (normalized.includes('TRIBUNAL')) return 'TRIBUNAL';
  if (normalized.includes('HOSPITAL') || normalized.includes('MINSA')) return 'MINSA';
  if (normalized.includes('REGISTO CIVIL')) return 'REGISTO_CIVIL';
  if (normalized.includes('MINJUS')) return 'MINJUS';
  if (normalized.includes('CDA') || normalized.includes('ADMINISTRAÇÃO CENTRAL')) return 'CDA';
  return normalized.split(' ')[0].replace(/[^A-Z]/g, '').slice(0, 12) || 'INSTITUICAO';
};

const inferProfileRole = (identifier: string): 'user' | 'institution' | 'admin' => {
  const upper = identifier.toUpperCase();
  if (upper === 'CDA' || upper.startsWith('ADM-')) return 'admin';
  if (/^[0-9]{6,}[A-Z]{2,}/.test(upper)) return 'user';
  return 'institution';
};

const deriveProfileName = (identifier: string, fallbackName?: string) => {
  if (fallbackName) return fallbackName;
  const role = inferProfileRole(identifier);
  if (role === 'admin') return 'Administração Central do Correio Digital Angola';
  if (role === 'institution') return identifier;
  return identifier;
};

const ensureProfileExists = async (bi: string, name?: string, role?: 'user' | 'institution' | 'admin') => {
  if (!hasValidSupabaseKeys()) return;
  try {
    const { data, error } = await supabase.from('profiles').select('bi').eq('bi', bi).maybeSingle();
    if (error) throw error;
    if (!data) {
      await supabase.from('profiles').insert([{
        bi,
        name: deriveProfileName(bi, name),
        role: role || inferProfileRole(bi),
      }]);
    }
  } catch (e) {
    console.warn('ensureProfileExists warning:', bi, e);
  }
};

const createMessagePayload = ({
  msg,
  senderBi,
  recipientBi,
  org,
  unread = true,
}: {
  msg: Message;
  senderBi: string;
  recipientBi: string;
  org: string;
  unread?: boolean;
}) => ({
  id: msg.id,
  sender_bi: senderBi,
  recipient_bi: recipientBi,
  org,
  preview: msg.preview,
  unread,
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
  protocol_id: null,
  protocol_number: msg.protocol?.protocolNumber || null,
});

const createStateHistoryPayload = ({
  messageId,
  state,
  responsible,
  description,
}: {
  messageId: number;
  state: string;
  responsible: string;
  description: string;
}) => {
  const now = new Date();
  return {
    message_id: messageId,
    state,
    event_date: now.toISOString().split('T')[0],
    event_time: now.toTimeString().slice(0, 8),
    responsible,
    description,
  };
};

export const supabaseService = {
  /**
   * Check connection and verify if tables are created.
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!hasValidSupabaseKeys()) {
      return {
        success: false,
        message: 'Chaves do Supabase não configuradas ou são marcadores de posição (placeholders).'
      };
    }

    try {
      // Attempt a simple head query on 'profiles' or dynamic PostgreSQL healthcheck to verify tables exist
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          return {
            success: false,
            message: 'Conectado ao Supabase, mas a tabela "profiles" não foi encontrada. ' +
                     'Por favor, execute o script SQL em "/supabase/schema.sql" no editor SQL do Supabase.',
            details: error
          };
        }
        return {
          success: false,
          message: `Erro na resposta do Supabase: ${error.message} (Código ${error.code})`,
          details: error
        };
      }

      return {
        success: true,
        message: 'Conexão estabelecida com sucesso! As tabelas do banco de dados estão prontas.',
        details: { status }
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Falha ao conectar com o servidor Supabase. Por favor, verifique sua conexão ou URL.',
        details: err?.message || err
      };
    }
  },

  /**
   * Uploads a file to a Supabase bucket and returns its public URL
   */
  async uploadFile(bucketName: string, filePath: string, file: File | Blob): Promise<string | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
        
      if (error) {
        console.error('Error uploading file to storage:', error);
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (e) {
      console.error('Failed to upload file to Supabase Storage:', e);
      return null;
    }
  },

  /**
   * Upsert citizen profile
   */
  async upsertProfile(profile: {
    bi: string;
    name: string;
    phone?: string;
    nif?: string;
    passport?: string;
    birth_date?: string;
    filiation?: string;
    marital_status?: string;
    role?: string;
  }) {
    if (!hasValidSupabaseKeys()) return null;
    
    // Format birth date securely
    let formattedBirthDate: string | null = null;
    if (profile.birth_date) {
      if (profile.birth_date.includes('/')) {
        formattedBirthDate = profile.birth_date.split('/').reverse().join('-');
      } else {
        formattedBirthDate = profile.birth_date;
      }
    }

    const payload: any = {
      bi: profile.bi,
      name: profile.name,
      phone: profile.phone || null,
      nif: profile.nif || null,
      passport: profile.passport || null,
      birth_date: formattedBirthDate,
      filiation: profile.filiation || null,
      marital_status: profile.marital_status || null,
      role: profile.role || 'user'
    };

    const performSave = async (currentPayload: any) => {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('bi', profile.bi)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('profiles')
          .update(currentPayload)
          .eq('bi', profile.bi)
          .select();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert([currentPayload])
          .select();
        if (error) throw error;
        return data;
      }
    };

    try {
      return await performSave(payload);
    } catch (e: any) {
      let activeError = e;
      const errorMsg = String(activeError?.message || activeError?.details || '').toLowerCase();
      const errorCode = String(activeError?.code || '');
      
      const isUniqueViolation = errorCode === '23505' || errorMsg.includes('unique constraint') || errorMsg.includes('duplicate key');
      
      if (isUniqueViolation) {
        console.warn('Aviso: Detetado conflito de chave única no perfil Supabase. Tentando ajustar dados...', activeError);
        
        // Se o conflito for do NIF, tentamos anular o NIF
        if (errorMsg.includes('nif') || errorMsg.includes('profiles_nif_key')) {
          console.warn('Conflito no campo NIF. Anulando NIF para salvar o restante dos dados do perfil.');
          payload.nif = null;
          try {
            return await performSave(payload);
          } catch (retryErr: any) {
            activeError = retryErr; // prossegue para o check de passaporte se falhar por passaporte
          }
        }
        
        // Se o conflito for do Passaporte, tentamos anular o Passaporte
        const retryErrorMsg = String(activeError?.message || activeError?.details || '').toLowerCase();
        const retryErrorCode = String(activeError?.code || '');
        const stillUniqueViolation = retryErrorCode === '23505' || retryErrorMsg.includes('unique constraint') || retryErrorMsg.includes('duplicate key');
        
        if (stillUniqueViolation && (retryErrorMsg.includes('passport') || retryErrorMsg.includes('profiles_passport_key'))) {
          console.warn('Conflito no campo Passaporte. Anulando Passaporte para salvar o restante dos dados do perfil.');
          payload.passport = null;
          try {
            return await performSave(payload);
          } catch (retryErr: any) {
            activeError = retryErr;
          }
        }
      }
      
      console.warn('CADA: Perfil salvo com atenuações ou ignorando conflito de NIF/Passaporte:', activeError.message || activeError);
      return null; // RETORNA NULL SEM PROPAGAR THROW EVITANDO CRASH NO FRONTEND!
    }
  },

  /**
   * Push a local message/correspondence to the database using the legacy default behaviour.
   * Prefer sendCitizenMessage / sendOfficialMessage for explicit flows.
   */
  async insertMessage(msg: Message, userBi: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const payload = createMessagePayload({
        msg,
        senderBi: resolveInstitutionCode(msg.org),
        recipientBi: userBi,
        org: msg.org,
        unread: !!msg.unread,
      });

      const { data, error } = await supabase
        .from('messages')
        .upsert([payload])
        .select();

      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Supabase insertMessage error:', e);
      throw e;
    }
  },

  async sendCitizenMessage(msg: Message, citizenBi: string, institutionLabel: string, citizenName?: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const institutionCode = resolveInstitutionCode(institutionLabel);
      await ensureProfileExists(citizenBi, citizenName || msg.details?.body?.match(/Atentamente,\s*([\wÀ-ÿ\s]+)/i)?.[1]?.trim() || 'Cidadão', 'user');
      await ensureProfileExists(institutionCode, institutionLabel, 'institution');
      const payload = createMessagePayload({
        msg,
        senderBi: citizenBi,
        recipientBi: institutionCode,
        org: institutionCode,
        unread: msg.unread !== undefined ? (typeof msg.unread === 'number' ? msg.unread !== 0 : !!msg.unread) : true,
      });
      const { data, error } = await supabase.from('messages').upsert([payload]).select();
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Supabase sendCitizenMessage error:', e);
      throw e;
    }
  },

  async sendOfficialMessage(msg: Message, citizenBi: string, institutionLabel: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const resolvedBi = resolveCitizenBi(citizenBi);
      const institutionCode = resolveInstitutionCode(institutionLabel);
      await ensureProfileExists(resolvedBi, msg.details?.body?.match(/Prezado\(a\)\s*([^,\n]+)/i)?.[1]?.trim() || 'Cidadão', 'user');
      await ensureProfileExists(institutionCode, institutionLabel, institutionCode === 'CDA' ? 'admin' : 'institution');
      const payload = createMessagePayload({
        msg,
        senderBi: institutionCode,
        recipientBi: resolvedBi,
        org: institutionCode,
        unread: msg.unread !== undefined ? (typeof msg.unread === 'number' ? msg.unread !== 0 : !!msg.unread) : true,
      });
      const { data, error } = await supabase.from('messages').upsert([payload]).select();
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Supabase sendOfficialMessage error:', e);
      throw e;
    }
  },

  async updateMessageState(messageId: number, changes: Partial<{ unread: boolean; status: string; preview: string; subject: string; body: string; deadline_text: string; state_indicator: string; actions: string[] }>) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase.from('messages').update(changes).eq('id', messageId).select();
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Supabase updateMessageState error:', e);
      return null;
    }
  },

  async insertMessageStateEvent({
    messageId,
    state,
    responsible,
    description,
  }: {
    messageId: number;
    state: string;
    responsible: string;
    description: string;
  }) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      // Avoid foreign key violations on non-existent messages (e.g. mock/local messages)
      const { data: exists } = await supabase
        .from('messages')
        .select('id')
        .eq('id', messageId)
        .maybeSingle();
      if (!exists) {
        console.warn(`insertMessageStateEvent: Message with ID ${messageId} does not exist in the database. Skipping state history event.`);
        return null;
      }

      const payload = createStateHistoryPayload({ messageId, state, responsible, description });
      const { data, error } = await supabase.from('message_state_history').insert([payload]).select();
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Supabase insertMessageStateEvent error:', e);
      return null;
    }
  },

  async getMessageStateHistory(messageId: number): Promise<any[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('message_state_history')
        .select('*')
        .eq('message_id', messageId)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e: any) {
      console.error('Supabase getMessageStateHistory error:', e);
      return null;
    }
  },

  /**
   * Push a document
   */
  async insertDocument(doc: Document, userBi: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      await ensureProfileExists(userBi, doc.holder, 'user');
      const payload = {
        name: doc.name,
        validity: doc.validity,
        code: doc.code,
        holder_bi: userBi,
        document_number: doc.number,
        issuer: doc.issuer,
        issued_at: doc.issuedAt
      };
      const { data, error } = await supabase
        .from('documents')
        .upsert([payload], { onConflict: 'code' })
        .select();
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Supabase insertDocument error:', e);
      throw e;
    }
  },

  /**
   * Sync a contact
   */
  async insertContact(contact: Contact, ownerBi: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const payload = {
        id: contact.id,
        owner_bi: ownerBi,
        name: contact.name,
        bi: contact.bi,
        relation: contact.relation,
        status: contact.status,
        type: contact.type || 'Normal'
      };
      const { data, error } = await supabase
        .from('contacts')
        .upsert([payload])
        .select();
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Supabase insertContact error:', e);
      throw e;
    }
  },

  /**
   * Delete contact
   */
  async deleteContact(contactId: number) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Supabase deleteContact error:', e);
      return null;
    }
  },

  /**
   * Sync audit log
   */
  async insertAuditLog(log: { action: string; user: string; timestamp?: string; type?: string }) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const actionStr = (log.action || 'Ação de Auditoria Registada').substring(0, 1000);
      const userStr = (log.user || 'Cidadão').substring(0, 95);
      const typeStr = (log.type || 'info').substring(0, 25);
      const payload = {
        action: actionStr,
        username: userStr,
        action_type: typeStr
      };
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([payload])
        .select();
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.warn('Supabase auditLog sync warning (non-blocking):', e?.message || e);
      return null;
    }
  },

  /**
   * Sync user requested services
   */
  async insertUserRequest(req: UserRequest) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const payload = {
        id: req.id,
        user_bi: req.bi,
        user_name: req.user,
        service_type: req.type,
        priority: req.priority,
        time_text: req.time,
        status: req.status,
        institution: req.institution || 'AGT'
      };
      const { data, error } = await supabase
        .from('user_requests')
        .upsert([payload])
        .select();
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Supabase userRequest error:', e);
      throw e;
    }
  },

  /**
   * Sync document issuance request
   */
  async insertDocRequest(req: DocRequest) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const payload = {
        id: req.id,
        user_name: req.userName,
        user_bi: req.userBi,
        doc_type: req.docType,
        institution: req.institution,
        status: req.status,
        ai_status: req.aiStatus || 'pre-approved'
      };
      const { data, error } = await supabase
        .from('document_requests')
        .upsert([payload])
        .select();
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Supabase docRequest error:', e);
      throw e;
    }
  },

  /**
   * Fetch a citizen's profile by BI
   */
  async getProfile(bi: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('bi', bi)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Supabase getProfile error:', e);
      return null;
    }
  },

  /**
   * Fetch inbox messages delivered to a citizen.
   */
  async getMessages(bi: string): Promise<Message[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('recipient_bi', bi)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => {
        return {
          id: Number(item.id),
          org: item.org,
          preview: item.preview,
          date: new Date(item.created_at).toLocaleDateString('pt-AO'),
          unread: item.unread ? 1 : 0,
          status: item.status,
          details: {
            subject: item.subject,
            body: item.body,
            deadline: item.deadline_text,
            state: item.state_indicator,
            actions: item.actions || [],
            attachments: item.attachments || []
          },
          sensitivity: item.sensitivity,
          priorityScale: item.priority_scale,
          deadlineHoursRemaining: item.deadline_hours_remaining
        };
      });
    } catch (e) {
      console.error('Supabase getMessages error:', e);
      return null;
    }
  },

  async getInstitutionMessages(institutionLabel: string): Promise<Message[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const institutionCode = resolveInstitutionCode(institutionLabel);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('recipient_bi', institutionCode)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      const senderBis = Array.from(new Set(data.map((item: any) => item.sender_bi).filter((value: string) => !!value && !['AGT','SME','ENDE','EPAL','MINSA','TRIBUNAL','SYSTEM'].includes(value))));
      let profilesByBi = new Map<string, string>();
      if (senderBis.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('bi,name').in('bi', senderBis);
        profilesByBi = new Map((profiles || []).map((item: any) => [item.bi, item.name]));
      }

      return data.map((item: any) => ({
        id: Number(item.id),
        org: profilesByBi.has(item.sender_bi) ? `Cidadão: ${profilesByBi.get(item.sender_bi)}` : `Cidadão: ${item.sender_bi}`,
        preview: item.preview,
        date: new Date(item.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        unread: item.unread ? 1 : 0,
        status: item.status,
        details: {
          subject: item.subject,
          body: item.body,
          deadline: item.deadline_text,
          state: item.state_indicator,
          actions: item.actions || [],
          attachments: item.attachments || []
        },
        sensitivity: item.sensitivity,
        priorityScale: item.priority_scale,
        deadlineHoursRemaining: item.deadline_hours_remaining
      }));
    } catch (e) {
      console.error('Supabase getInstitutionMessages error:', e);
      return null;
    }
  },

  async getSentMessagesBySender(senderBi: string): Promise<Message[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_bi', senderBi)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data) return [];
      return data.map((item: any) => ({
        id: Number(item.id),
        org: item.org,
        preview: item.preview,
        date: new Date(item.created_at).toLocaleDateString('pt-AO'),
        unread: item.unread ? 1 : 0,
        status: item.status,
        details: {
          subject: item.subject,
          body: item.body,
          deadline: item.deadline_text,
          state: item.state_indicator,
          actions: item.actions || [],
          attachments: item.attachments || []
        },
        sensitivity: item.sensitivity,
        priorityScale: item.priority_scale,
        deadlineHoursRemaining: item.deadline_hours_remaining
      }));
    } catch (e) {
      console.error('Supabase getSentMessagesBySender error:', e);
      return null;
    }
  },

  /**
   * Fetch documents for a citizen
   */
  async getDocuments(bi: string): Promise<Document[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('holder_bi', bi);

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => ({
        name: item.name,
        validity: item.validity,
        code: item.code,
        holder: item.holder_bi,
        number: item.document_number,
        issuer: item.issuer,
        issuedAt: item.issued_at
      }));
    } catch (e) {
      console.error('Supabase getDocuments error:', e);
      return null;
    }
  },

  /**
   * Fetch contacts for a citizen
   */
  async getContacts(bi: string): Promise<Contact[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('owner_bi', bi);

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => ({
        id: Number(item.id),
        name: item.name,
        bi: item.bi,
        relation: item.relation,
        status: item.status,
        type: item.type
      }));
    } catch (e) {
      console.error('Supabase getContacts error:', e);
      return null;
    }
  },

  /**
   * Fetch citizen/system notifications
   */
  async getNotifications(bi: string): Promise<any[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('target_bi', bi)
        .order('id', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => ({
        id: Number(item.id),
        title: item.title,
        message: item.message,
        time: item.time_text,
        type: item.type,
        targetTab: item.target_tab
      }));
    } catch (e) {
      console.error('Supabase getNotifications error:', e);
      return null;
    }
  },

  /**
   * Save a system notification to Supabase
   */
  async insertNotification(notif: any, targetBi: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      await ensureProfileExists(targetBi, undefined, inferProfileRole(targetBi));
      const payload = {
        target_bi: targetBi,
        title: notif.title,
        message: notif.message,
        time_text: notif.time || 'Agora',
        type: notif.type || 'info',
        target_tab: notif.targetTab || 'home'
      };
      const { data, error } = await supabase
        .from('notifications')
        .insert([payload])
        .select();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Supabase insertNotification error:', e);
      return null;
    }
  },

  /**
   * Fetch services user_requests
   */
  async getUserRequests(bi?: string): Promise<UserRequest[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      let query = supabase.from('user_requests').select('*');
      if (bi) {
        query = query.eq('user_bi', bi);
      }
      const { data, error } = await query.order('id', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => ({
        id: Number(item.id),
        user: item.user_name,
        type: item.service_type,
        priority: item.priority as any,
        time: item.time_text,
        status: item.status as any,
        bi: item.user_bi,
        institution: item.institution || 'AGT',
        date: item.request_date ? new Date(item.request_date).toLocaleDateString('pt-AO') : 'Recente'
      }));
    } catch (e) {
      console.error('Supabase getUserRequests error:', e);
      return null;
    }
  },

  /**
   * Fetch doc requests
   */
  async getDocRequests(bi?: string): Promise<DocRequest[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      let query = supabase.from('document_requests').select('*');
      if (bi) {
        query = query.eq('user_bi', bi);
      }
      const { data, error } = await query.order('id', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => ({
        id: Number(item.id),
        userName: item.user_name,
        userBi: item.user_bi,
        docType: item.doc_type,
        institution: item.institution,
        date: item.request_date ? new Date(item.request_date).toLocaleDateString('pt-AO') : 'Recente',
        status: item.status as any,
        aiStatus: item.ai_status as any
      }));
    } catch (e) {
      console.error('Supabase getDocRequests error:', e);
      return null;
    }
  },

  /**
   * Fetch audit logs
   */
  async getAuditLogs(): Promise<any[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('id', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => ({
        id: String(item.id),
        action: item.action,
        user: item.username,
        timestamp: new Date(item.timestamp).toLocaleString('pt-AO'),
        type: item.action_type || 'info'
      }));
    } catch (e) {
      console.error('Supabase getAuditLogs error:', e);
      return null;
    }
  },

  /**
   * Insert or update official government correspondence
   */
  async insertCorrespondence(cor: Correspondence) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const resolvedRecipientBi = resolveCitizenBi(cor.recipient).slice(0, 20);
      const resolvedSenderBi = resolveInstitutionCode(cor.sender || cor.institution).slice(0, 20);
      const payload = {
        id: parseInt(cor.id.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000),
        sender_bi: resolvedSenderBi,
        recipient_bi: resolvedRecipientBi,
        org: cor.institution || cor.sender || 'CDA',
        preview: cor.subject,
        unread: false,
        status: cor.priority || 'Normal',
        subject: cor.subject,
        body: cor.body,
        deadline_text: cor.originProvince || 'Luanda', 
        state_indicator: cor.destinationProvince || 'Luanda',
        actions: [cor.status], // Store current status value in text array
        sensitivity: 'Correspondencia'
      };
      const { data, error } = await supabase
        .from('messages')
        .upsert([payload])
        .select();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Supabase insertCorrespondence error:', e);
      return null;
    }
  },

  /**
   * Fetch all official government correspondences
   */
  async getCorrespondences(): Promise<Correspondence[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('id', { ascending: false });
      if (error) throw error;
      if (!data) return [];
      
      const provinces = ['luanda', 'benguela', 'cabinda', 'cuanza norte', 'cuanza sul', 'cunene', 'huambo', 'huíla', 'cuando cubango', 'lunda norte', 'lunda sul', 'moxico', 'namibe', 'uíge', 'zaire', 'bengo', 'bié', 'malanje'];
      
      // Filter out messages that represent general personal messages of citizen
      // Keep only those with sensitivity 'Correspondencia' or that fallback to provinces in deadline_text
      const filtered = data.filter((item: any) => {
        if (item.sensitivity === 'Correspondencia') return true;
        if (item.deadline_text && provinces.includes(item.deadline_text.toLowerCase())) return true;
        return false;
      });

      return filtered.map((item: any) => ({
        id: `COR-${item.id}`,
        sender: item.sender_bi,
        recipient: resolveCitizenName(item.recipient_bi),
        subject: item.subject || item.preview,
        originProvince: item.deadline_text || 'Luanda',
        destinationProvince: item.state_indicator || 'Luanda',
        institution: item.org,
        status: item.actions?.[0] || item.state_indicator || 'Recebida',
        date: new Date(item.created_at).toLocaleDateString('pt-AO'),
        body: item.body,
        priority: item.priority_scale || item.status || 'Média'
      }));
    } catch (e) {
      console.error('Supabase getCorrespondences error:', e);
      return null;
    }
  },

  /**
   * Fetch digital protocols
   */
  async getDigitalProtocols(): Promise<any[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('digital_protocols')
        .select('*')
        .order('official_issue_date', { ascending: false });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Supabase getDigitalProtocols error:', e);
      return null;
    }
  },

  /**
   * Insert digital protocol
   */
  async insertDigitalProtocol(p: any) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const payload = {
        protocol_number: p.protocolNumber,
        issuer_institution: p.issuerInstitution,
        official_issue_date: p.officialIssueDate || new Date().toISOString().split('T')[0],
        official_time: p.officialTime ? p.officialTime.split(" ")[0].padStart(8, "0") : "12:00:00",
        issuer_responsible: p.issuerResponsible || 'Sistema CADA',
        category: p.category || 'Geral',
        document_type: p.documentType || 'Correspondência',
        current_state: p.currentState || 'Ativo',
        priority: p.priority || 'Normal',
        qr_code_url: p.qrCodeUrl || '',
        digital_signature: p.digitalSignature || 'SEC_COMP_CAD_KEY_SIGNED',
        legal_validity: p.legalValidity || 'Ponto de barramento seguro CADA'
      };
      const { data, error } = await supabase
        .from('digital_protocols')
        .insert([payload])
        .select();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Supabase insertDigitalProtocol error:', e);
      return null;
    }
  },

  /**
   * Seed the database with all local states.
   * Ensures 100% data fidelity between citizen profile, messages, contacts, and requests.
   */
  async seedAll(params: {
    profile: {
      bi: string;
      name: string;
      phone: string;
      nif: string;
      passport: string;
      birthDate: string;
      filiation: string;
      maritalStatus: string;
    };
    inbox: Message[];
    docInbox: Message[];
    sentMessages: Message[];
    contacts: Contact[];
    documents: Document[];
    userRequests: UserRequest[];
    docRequests: DocRequest[];
    auditLogs: any[];
    notifications?: AppNotification[];
    correspondences?: Correspondence[];
    institutionInbox?: Message[];
    institutionCode?: string;
  }): Promise<{ success: boolean; message: string; counts?: any }> {
    if (!hasValidSupabaseKeys()) {
      return { success: false, message: 'Não é possível semear: Chaves do Supabase ausentes ou inválidas.' };
    }

    try {
      const errors: string[] = [];
      let profileCount = 0;
      let messageCount = 0;
      let contactCount = 0;
      let docCount = 0;
      let requestCount = 0;
      let logCount = 0;
      let notifCount = 0;
      let correspondenceCount = 0;

      // 1. Profiling
      try {
        const pResult = await this.upsertProfile({
          bi: params.profile.bi,
          name: params.profile.name,
          phone: params.profile.phone,
          nif: params.profile.nif,
          passport: params.profile.passport,
          birth_date: params.profile.birthDate,
          filiation: params.profile.filiation,
          marital_status: params.profile.maritalStatus,
          role: 'user'
        });
        if (pResult) profileCount++;
      } catch (err: any) {
        errors.push(`Perfil (${err?.message || err})`);
      }

      // Also upsert some default mocked profiles to prevent FK constraint failures
      try {
        await this.upsertProfile({ bi: '008812342LA011', name: 'Maria Antónia', role: 'user' });
        await this.upsertProfile({ bi: '007712342LA021', name: 'José Kalunga', role: 'user' });
        await this.upsertProfile({ bi: '009991332LA018', name: 'Ana Baptista', role: 'user' });
      } catch (err) {}

      // 2. Insert Contacts
      for (const contact of params.contacts) {
        try {
          const res = await this.insertContact(contact, params.profile.bi);
          if (res) contactCount++;
          else errors.push(`Contato ${contact.name}`);
        } catch (err: any) {
          errors.push(`Contato (${contact.name}: ${err?.message || err})`);
        }
      }

      // 3. Insert citizen inbox / tramitações as official messages delivered to the citizen
      const uniqueInboxMessages = Array.from(new Map([...params.inbox, ...params.docInbox].map(m => [m.id, m])).values());
      for (const msg of uniqueInboxMessages) {
        try {
          const res = await this.sendOfficialMessage(msg, params.profile.bi, msg.org);
          if (res) messageCount++;
          else errors.push(`Msg Inbox #${msg.id}`);
        } catch (err: any) {
          errors.push(`Msg Inbox #${msg.id} (${err?.message || err})`);
        }
      }

      // 4. Insert citizen sent messages as messages addressed to institutions
      for (const msg of params.sentMessages) {
        try {
          const res = await this.sendCitizenMessage(msg, params.profile.bi, msg.org);
          if (res) messageCount++;
          else errors.push(`Msg Sent #${msg.id}`);
        } catch (err: any) {
          errors.push(`Msg Sent #${msg.id} (${err?.message || err})`);
        }
      }

      // 4. Insert Documents
      for (const doc of params.documents) {
        try {
          const res = await this.insertDocument(doc, params.profile.bi);
          if (res) docCount++;
          else errors.push(`Doc ${doc.name}`);
        } catch (err: any) {
          errors.push(`Doc ${doc.name} (${err?.message || err})`);
        }
      }

      // 5. Insert User Requests
      for (const req of params.userRequests) {
        try {
          const res = await this.insertUserRequest(req);
          if (res) requestCount++;
          else errors.push(`Ped IPU #${req.id}`);
        } catch (err: any) {
          errors.push(`Ped IPU #${req.id} (${err?.message || err})`);
        }
      }

      // 6. Insert Doc Requests (Emit)
      for (const req of params.docRequests) {
        try {
          const res = await this.insertDocRequest(req);
          if (res) requestCount++;
          else errors.push(`Req Doc #${req.id}`);
        } catch (err: any) {
          errors.push(`Req Doc #${req.id} (${err?.message || err})`);
        }
      }

      // 7. Insert Notifications
      for (const notification of params.notifications || []) {
        try {
          const res = await this.insertNotification(notification, params.profile.bi);
          if (res) notifCount++;
        } catch (err: any) {
          errors.push(`Notificação (${notification.title}: ${err?.message || err})`);
        }
      }

      // 8. Insert official correspondences for admin/government view
      for (const cor of params.correspondences || []) {
        try {
          const res = await this.insertCorrespondence(cor);
          if (res) correspondenceCount++;
        } catch (err: any) {
          errors.push(`Correspondência (${cor.id}: ${err?.message || err})`);
        }
      }

      // 9. Insert institution inbox messages when provided
      for (const msg of params.institutionInbox || []) {
        try {
          const targetInstitution = msg.institution || params.institutionCode || 'AGT';
          const inferredCitizenBi = msg.details?.body?.match(/BI:\s*([A-Z0-9]+)/i)?.[1] || params.profile.bi;
          const res = await this.sendCitizenMessage(msg, inferredCitizenBi, targetInstitution);
          if (res) messageCount++;
        } catch (err: any) {
          errors.push(`Inbox Institucional #${msg.id} (${err?.message || err})`);
        }
      }

      // 10. Insert Audit Logs
      for (const log of params.auditLogs.slice(-10)) { // sync last 10 logs
        try {
          const res = await this.insertAuditLog({
            action: log.action || log.message || '',
            user: log.user || 'SYSTEM',
            type: log.type || 'info'
          });
          if (res) logCount++;
        } catch (err) {}
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? 'Banco de dados semeado com sucesso!' 
          : `Semeado com alguns erros: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
        counts: {
          profiles: profileCount,
          messages: messageCount,
          contacts: contactCount,
          documents: docCount,
          requests: requestCount,
          notifications: notifCount,
          correspondences: correspondenceCount,
          auditLogs: logCount
        }
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Falha na semeadura geral: ${e?.message || e}`
      };
    }
  }
};
