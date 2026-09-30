/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AudioEffects - Motor de Áudio Web e Síntese de Voz para Videoatendimento CDA 2026
 * Fornece efeitos sonoros sintetizados via Web Audio API (sem dependências de rede)
 * e integração com SpeechSynthesis para voz de atendimento oficial.
 */

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/** Toca o acorde de início/conexão da chamada de vídeo (C5 -> E5 -> G5 -> C6) */
export function playCallConnectSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Acorde Dó Maior Brilhante

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.5);
    });
  } catch (e) {
    console.warn('[CDA-Audio] Falha ao tocar som de chamada:', e);
  }
}

/** Toca o som de encerramento de chamada (acorde descendente suave) */
export function playCallDisconnectSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [783.99, 659.25, 523.25];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  } catch (e) {
    console.warn('[CDA-Audio] Falha ao tocar som de encerramento:', e);
  }
}

/** Toca um som de teste de altifalante (dois tons claros e límpidos: 880Hz e 1320Hz) */
export function playSpeakerTestTone(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [880, 1320].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.15 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.45);
    });
  } catch (e) {
    console.warn('[CDA-Audio] Falha no teste de altifalante:', e);
  }
}

/** Toca um clique suave ao alternar microfone ou câmara */
export function playToggleMuteSound(isMuted: boolean): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isMuted ? 350 : 700, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {}
}

/** Voz do assistente oficial de vídeo-atendimento (PT-AO) */
export function playAttendantWelcomeVoice(texto: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-PT';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt')) || voices[0];
    if (ptVoice) utterance.voice = ptVoice;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('[CDA-Audio] Síntese de voz de atendimento:', e);
  }
}

/** Para qualquer voz em reprodução */
export function stopAttendantVoice(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
}
