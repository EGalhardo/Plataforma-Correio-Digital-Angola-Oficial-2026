/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Video Session Service - Enhanced Video Attendance Backend
 * Supports all app modes with real-time features, quality metrics, and notifications
 */

import { supabase } from '../lib/supabaseClient';
import { hasValidSupabaseKeys } from './supabaseService';
import { VideoSession, VideoSessionParticipant, VideoSessionEvent } from '../types';

// UUID validation and generator helpers to prevent syntax errors with Supabase database
const isUUID = (str: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Extended session interface for enhanced features
export interface VideoSessionExtended extends VideoSession {
  agenda?: string;
  notes?: string;
  duration?: number;
  quality?: 'excellent' | 'good' | 'poor';
  participantCount?: number;
}

// Pre-seeded Mock Video Sessions with comprehensive data
const INITIAL_MOCK_SESSIONS: VideoSessionExtended[] = [
  {
    id: 'vs-1',
    roomName: 'cda-video-agt-nif-40502',
    subject: 'Esclarecimento de Dúvidas sobre NIF Suspenso',
    associatedProtocol: 'CDA-2026-61849',
    associatedMessageId: 1,
    status: 'disponivel',
    hostBi: 'INST-AGT-0220',
    hostName: 'Dr. Valeriano Mendes (AGT)',
    guestBi: '005204192LA048',
    guestName: 'Edlasio Galhardo',
    scheduledFor: 'Hoje às 14:30',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    agenda: 'Verificar status do NIF, apresentar documentos pendentes e finalizar regularização.',
    notes: 'Cliente já possui马尾收据 de solicitação anterior.',
    quality: 'excellent',
    participantCount: 2
  },
  {
    id: 'vs-2',
    roomName: 'cda-video-sme-bi-20512',
    subject: 'Validação Presencial por Vídeo de Passaporte Especial',
    associatedProtocol: 'CDA-2026-92850',
    associatedMessageId: 2,
    status: 'concluida',
    hostBi: 'INST-SME-0034',
    hostName: 'Superintendente Carla Neto (SME)',
    guestBi: '005204192LA048',
    guestName: 'Edlasio Galhardo',
    scheduledFor: 'Ontem às 10:00',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    closedAt: new Date(Date.now() - 86400000 + 1800000).toISOString(),
    duration: 1800,
    agenda: 'Validação de identidade para emissão de passaporte especial diplomático.',
    notes: 'Sessão concluída com sucesso. Documentos validados.',
    quality: 'good',
    participantCount: 2
  },
  {
    id: 'vs-3',
    roomName: 'cda-video-mre-atend-883',
    subject: 'Agendamento Prévio de Consulta de Atendimento consular',
    associatedProtocol: 'CDA-2026-10294',
    status: 'agendada',
    hostBi: 'INST-MINREX-04',
    hostName: 'Geraldo Lemos (Apoio Consular)',
    guestBi: '005204192LA048',
    guestName: 'Edlasio Galhardo',
    scheduledFor: 'Amanhã às 09:15',
    createdAt: new Date().toISOString(),
    agenda: 'Consultar requisitos para visto de trabalho e documentação necessária.',
    quality: 'excellent',
    participantCount: 1
  },
  {
    id: 'vs-4',
    roomName: 'cda-video-minist-financas-112',
    subject: 'Orientação sobre Declaração de IRS 2026',
    associatedProtocol: 'CDA-2026-77341',
    status: 'em_curso',
    hostBi: 'INST-MF-0089',
    hostName: 'Dra. Maria do Carmo (Ministério das Finanças)',
    guestBi: '005204192LA048',
    guestName: 'Edlasio Galhardo',
    scheduledFor: 'Agora',
    createdAt: new Date(Date.now() - 900000).toISOString(),
    agenda: 'Esclarecimento sobre deduções fiscais e prazos de entrega.',
    duration: 900,
    quality: 'excellent',
    participantCount: 2
  }
];

const INITIAL_MOCK_EVENTS: VideoSessionEvent[] = [
  {
    id: 'vse-1',
    sessionId: 'vs-2',
    eventType: 'criada',
    bi: 'INST-SME-0034',
    userName: 'Superintendente Carla Neto (SME)',
    description: 'Sessão de videoatendimento agendada e estruturada no barramento oficial.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'vse-2',
    sessionId: 'vs-2',
    eventType: 'entrada',
    bi: 'INST-SME-0034',
    userName: 'Superintendente Carla Neto (SME)',
    description: 'O representante da instituição iniciou a conferência e aguarda o cidadão.',
    timestamp: new Date(Date.now() - 86400000 + 105000).toISOString(),
  },
  {
    id: 'vse-3',
    sessionId: 'vs-2',
    eventType: 'entrada',
    bi: '005204192LA048',
    userName: 'Edlasio Galhardo',
    description: 'O cidadão estabeleceu ligação segura e entrou na sala Jitsi.',
    timestamp: new Date(Date.now() - 86400000 + 180000).toISOString(),
  },
  {
    id: 'vse-4',
    sessionId: 'vs-2',
    eventType: 'encerrada',
    bi: 'INST-SME-0034',
    userName: 'Superintendente Carla Neto (SME)',
    description: 'A sessão de vídeo foi concluída e documentada com sucesso. Duração total: 30 minutos.',
    timestamp: new Date(Date.now() - 86400000 + 1800000).toISOString(),
  }
];

// Notification system
export interface VideoSessionNotification {
  id: string;
  sessionId: string;
  type: 'reminder' | 'status_change' | 'participant_update' | 'quality_alert';
  message: string;
  timestamp: string;
  read: boolean;
}

const getLocalSessions = (): VideoSessionExtended[] => {
  const data = localStorage.getItem('cda_video_sessions');
  if (data) {
    try { return JSON.parse(data); } catch (e) { /* ignore */ }
  }
  localStorage.setItem('cda_video_sessions', JSON.stringify(INITIAL_MOCK_SESSIONS));
  return INITIAL_MOCK_SESSIONS;
};

const saveLocalSessions = (sessions: VideoSessionExtended[]) => {
  localStorage.setItem('cda_video_sessions', JSON.stringify(sessions));
};

const getLocalEvents = (): VideoSessionEvent[] => {
  const data = localStorage.getItem('cda_video_session_events');
  if (data) {
    try { return JSON.parse(data); } catch (e) { /* ignore */ }
  }
  localStorage.setItem('cda_video_session_events', JSON.stringify(INITIAL_MOCK_EVENTS));
  return INITIAL_MOCK_EVENTS;
};

const saveLocalEvents = (events: VideoSessionEvent[]) => {
  localStorage.setItem('cda_video_session_events', JSON.stringify(events));
};

const getLocalNotifications = (): VideoSessionNotification[] => {
  const data = localStorage.getItem('cda_video_notifications');
  if (data) {
    try { return JSON.parse(data); } catch (e) { /* ignore */ }
  }
  return [];
};

const saveLocalNotifications = (notifications: VideoSessionNotification[]) => {
  localStorage.setItem('cda_video_notifications', JSON.stringify(notifications));
};

export const VideoSessionService = {
  /**
   * Lists all video sessions with enhanced metadata
   */
  async listSessions(): Promise<VideoSessionExtended[]> {
    const local = getLocalSessions();
    if (!hasValidSupabaseKeys()) {
      return local;
    }
    try {
      const { data, error } = await supabase
        .from('video_sessions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data && data.length > 0) {
        const mapped: VideoSessionExtended[] = data.map((d: any) => ({
          id: d.id,
          roomName: d.room_name || d.roomName,
          subject: d.subject,
          associatedProtocol: d.associated_protocol || d.associatedProtocol,
          associatedMessageId: d.associated_message_id || d.associatedMessageId,
          status: d.status,
          hostBi: d.host_bi || d.hostBi,
          hostName: d.host_name || d.hostName,
          guestBi: d.guest_bi || d.guestBi,
          guestName: d.guest_name || d.guestName,
          scheduledFor: d.scheduled_for || d.scheduledFor,
          createdAt: d.created_at || d.createdAt,
          closedAt: d.closed_at || d.closedAt,
          agenda: d.agenda,
          notes: d.notes,
          duration: d.duration,
          quality: d.quality,
          participantCount: d.participant_count || 2
        }));
        return mapped;
      }
    } catch (e) {
      console.warn('Supabase key error or query failed, serving fallback:', e);
    }
    return local;
  },

  /**
   * Retrieves a single video session with full details
   */
  async getSession(id: string): Promise<VideoSessionExtended | null> {
    const local = getLocalSessions();
    const foundLocal = local.find(s => s.id === id) || null;
    if (!hasValidSupabaseKeys() || !isUUID(id)) {
      return foundLocal;
    }
    try {
      const { data, error } = await supabase
        .from('video_sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return {
          id: data.id,
          roomName: data.room_name || data.roomName,
          subject: data.subject,
          associatedProtocol: data.associated_protocol || data.associatedProtocol,
          associatedMessageId: data.associated_message_id || data.associatedMessageId,
          status: data.status,
          hostBi: data.host_bi || data.hostBi,
          hostName: data.host_name || data.hostName,
          guestBi: data.guest_bi || data.guestBi,
          guestName: data.guest_name || data.guestName,
          scheduledFor: data.scheduled_for || data.scheduledFor,
          createdAt: data.created_at || data.createdAt,
          closedAt: data.closed_at || data.closedAt,
          agenda: data.agenda,
          notes: data.notes,
          duration: data.duration,
          quality: data.quality,
          participantCount: data.participant_count || 2
        };
      }
    } catch (e) {
      console.warn('Supabase key error or query failed, serving fallback:', e);
    }
    return foundLocal;
  },

  /**
   * Creates a new video session with enhanced metadata
   */
  async createSession(session: Omit<VideoSessionExtended, 'id' | 'createdAt' | 'quality' | 'participantCount'>): Promise<VideoSessionExtended> {
    const id = generateUUID();
    const createdAt = new Date().toISOString();
    const newSession: VideoSessionExtended = {
      ...session,
      id,
      createdAt,
      quality: 'excellent',
      participantCount: 2
    };

    const local = getLocalSessions();
    local.unshift(newSession);
    saveLocalSessions(local);

    if (hasValidSupabaseKeys()) {
      try {
        await supabase.from('video_sessions').insert([{
          id,
          room_name: session.roomName,
          subject: session.subject,
          associated_protocol: session.associatedProtocol || null,
          associated_message_id: session.associatedMessageId || null,
          status: session.status,
          host_bi: session.hostBi,
          host_name: session.hostName,
          guest_bi: session.guestBi,
          guest_name: session.guestName,
          scheduled_for: session.scheduledFor,
          created_at: createdAt,
          agenda: (session as any).agenda || null,
          notes: (session as any).notes || null,
          quality: 'excellent',
          participant_count: 2
        }]);
      } catch (err) {
        console.warn('Error saving session to Supabase, fallback to client state:', err);
      }
    }

    await this.addSessionEvent(
      id, 
      'criada', 
      session.hostBi, 
      session.hostName, 
      `Sessão criada e agendada: "${session.subject}" com ${session.guestName}.`
    );

    this.createNotification(id, 'reminder', `Nova sessão de videoatendimento agendada: ${session.subject}`);

    return newSession;
  },

  /**
   * Updates the status of a video session with automatic event logging
   */
  async updateSessionStatus(id: string, status: VideoSession['status']): Promise<VideoSessionExtended | null> {
    const local = getLocalSessions();
    const index = local.findIndex(s => s.id === id);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const prevSession = local[index];
    
    let duration = prevSession.duration;
    if (status === 'concluida' || status === 'cancelada') {
      const startTime = new Date(prevSession.createdAt).getTime();
      const endTime = Date.now();
      duration = Math.floor((endTime - startTime) / 1000);
    }

    const updated: VideoSessionExtended = {
      ...prevSession,
      status,
      closedAt: (status === 'concluida' || status === 'cancelada') ? now : undefined,
      duration: duration || prevSession.duration,
      quality: status === 'em_curso' ? 'excellent' : prevSession.quality
    };
    
    local[index] = updated;
    saveLocalSessions(local);

    if (hasValidSupabaseKeys() && isUUID(id)) {
      try {
        await supabase
          .from('video_sessions')
          .update({ 
            status,
            closed_at: (status === 'concluida' || status === 'cancelada') ? now : null,
            duration: duration || null
          })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase Status Update failed:', err);
      }
    }

    const eventDescriptions: Record<string, string> = {
      em_curso: 'A sessão foi iniciada e está em curso.',
      concluida: `Sessão concluída com sucesso. Duração total: ${this.formatDuration(duration || 0)}.`,
      cancelada: 'A sessão foi cancelada.',
      agendada: 'Sessão agendada para o horário especificado.',
      disponivel: 'Sessão disponível e aguardando participantes.'
    };

    await this.addSessionEvent(
      id,
      status === 'em_curso' ? 'iniciada' : status === 'concluida' ? 'encerrada' : status === 'cancelada' ? 'cancelada' : 'agendada',
      updated.hostBi,
      updated.hostName,
      eventDescriptions[status] || `Estado da sessão atualizado para "${status}".`
    );

    this.createNotification(id, 'status_change', `Sessão atualizada: ${eventDescriptions[status]}`);

    return updated;
  },

  /**
   * Adds an audit event to a specific session
   */
  async addSessionEvent(
    sessionId: string,
    eventType: VideoSessionEvent['eventType'],
    bi: string,
    userName: string,
    description: string
  ): Promise<VideoSessionEvent> {
    const id = generateUUID();
    const timestamp = new Date().toISOString();
    const newEvent: VideoSessionEvent = {
      id,
      sessionId,
      eventType,
      bi,
      userName,
      description,
      timestamp,
    };

    const localEvents = getLocalEvents();
    localEvents.push(newEvent);
    saveLocalEvents(localEvents);

    if (hasValidSupabaseKeys() && isUUID(id) && isUUID(sessionId)) {
      try {
        await supabase.from('video_session_events').insert([{
          id,
          session_id: sessionId,
          event_type: eventType,
          bi,
          user_name: userName,
          description,
          timestamp,
        }]);
      } catch (err) {
        console.warn('Supabase Session Event logging failed:', err);
      }
    }

    if (eventType === 'entrada' || eventType === 'saida') {
      this.createNotification(
        sessionId, 
        'participant_update', 
        `${userName} ${eventType === 'entrada' ? 'entrou na' : 'saiu da'} sessão`
      );
    }

    return newEvent;
  },

  /**
   * Retrieves events for a specific session
   */
  async getSessionEvents(sessionId: string): Promise<VideoSessionEvent[]> {
    const localEvents = getLocalEvents().filter(e => e.sessionId === sessionId);
    if (!hasValidSupabaseKeys() || !isUUID(sessionId)) {
      return localEvents;
    }
    try {
      const { data, error } = await supabase
        .from('video_session_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          sessionId: d.session_id || d.sessionId,
          eventType: d.event_type || d.eventType,
          bi: d.bi,
          userName: d.user_name || d.userName,
          description: d.description,
          timestamp: d.timestamp,
        }));
      }
    } catch (e) {
      console.warn('Supabase event query failed, serving fallback:', e);
    }
    return localEvents;
  },

  /**
   * Creates a notification for session updates
   */
  async createNotification(
    sessionId: string,
    type: VideoSessionNotification['type'],
    message: string
  ): Promise<VideoSessionNotification> {
    const notification: VideoSessionNotification = {
      id: 'vsn-' + Math.random().toString(36).substr(2, 9),
      sessionId,
      type,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };

    const notifications = getLocalNotifications();
    notifications.unshift(notification);
    
    if (notifications.length > 50) {
      notifications.splice(50);
    }
    
    saveLocalNotifications(notifications);
    return notification;
  },

  /**
   * Gets all notifications for a session
   */
  async getSessionNotifications(sessionId: string): Promise<VideoSessionNotification[]> {
    return getLocalNotifications().filter(n => n.sessionId === sessionId);
  },

  /**
   * Gets all session notifications
   */
  async getAllSessionNotifications(): Promise<VideoSessionNotification[]> {
    return getLocalNotifications();
  },

  /**
   * Marks a notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    const notifications = getLocalNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      notifications[index].read = true;
      saveLocalNotifications(notifications);
    }
  },

  /**
   * Gets unread notification count
   */
  async getUnreadNotificationCount(): Promise<number> {
    return getLocalNotifications().filter(n => !n.read).length;
  },

  /**
   * Updates session quality metrics
   */
  async updateSessionQuality(sessionId: string, quality: 'excellent' | 'good' | 'poor', latency: number): Promise<void> {
    const local = getLocalSessions();
    const index = local.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      local[index].quality = quality;
      saveLocalSessions(local);

      if (quality === 'poor') {
        this.createNotification(sessionId, 'quality_alert', `Qualidade da ligação reduzida: ${latency}ms de latência`);
      }
    }
  },

  /**
   * Gets session statistics
   */
  async getSessionStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    scheduled: number;
    averageDuration: number;
  }> {
    const sessions = await this.listSessions();
    
    return {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'em_curso' || s.status === 'disponivel').length,
      completed: sessions.filter(s => s.status === 'concluida').length,
      cancelled: sessions.filter(s => s.status === 'cancelada').length,
      scheduled: sessions.filter(s => s.status === 'agendada').length,
      averageDuration: Math.round(
        sessions.filter(s => s.duration).reduce((acc, s) => acc + (s.duration || 0), 0) / 
        sessions.filter(s => s.duration).length || 0
      )
    };
  },

  /**
   * Formats duration in seconds to human readable string
   */
  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  },

  /**
   * Gets next scheduled session
   */
  async getNextScheduledSession(userBi: string): Promise<VideoSessionExtended | null> {
    const sessions = await this.listSessions();
    const now = new Date();
    
    return sessions.find(s => {
      const isRelevant = s.guestBi === userBi || s.hostBi === userBi;
      const isScheduled = s.status === 'agendada' || s.status === 'disponivel';
      
      if (!isRelevant || !isScheduled) return false;
      
      const scheduledDate = this.parseScheduledDate(s.scheduledFor);
      return scheduledDate && scheduledDate.getTime() > now.getTime();
    }) || null;
  },

  /**
   * Parses various date/time formats
   */
  parseScheduledDate(scheduledFor: string): Date | null {
    const date = new Date();
    
    if (scheduledFor.includes('Hoje')) {
      const timeMatch = scheduledFor.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        date.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
        return date;
      }
    }
    
    if (scheduledFor.includes('Amanhã')) {
      date.setDate(date.getDate() + 1);
      const timeMatch = scheduledFor.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        date.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
        return date;
      }
    }
    
    const direct = new Date(scheduledFor);
    if (!isNaN(direct.getTime())) {
      return direct;
    }
    
    return null;
  },

  /**
   * Cleans up old completed sessions (older than 30 days)
   */
  async cleanupOldSessions(): Promise<number> {
    const sessions = getLocalSessions();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const filtered = sessions.filter(s => {
      if (s.status !== 'concluida' && s.status !== 'cancelada') return true;
      const createdAt = new Date(s.createdAt).getTime();
      return createdAt > thirtyDaysAgo;
    });
    
    const removedCount = sessions.length - filtered.length;
    saveLocalSessions(filtered);
    
    return removedCount;
  }
};

export default VideoSessionService;
