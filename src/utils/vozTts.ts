// v37.52 — Voz TTS mais natural (Web Speech API).
//
// Problema: os componentes usavam `lang = 'pt-AO'`, que NÃO é uma voz existente
// nos motores de síntese; isso faz o motor cair na voz por omissão do sistema
// (frequentemente inglesa ou uma voz pt básica/robótica). Além disso nenhuma
// voz era seleccionada explicitamente.
//
// Solução (sem dependências externas): escolher a melhor voz portuguesa
// disponível no navegador, com preferência por variantes naturais/neurais/
// online, e afinar velocidade/entoação para um ritmo mais humano.

export function escolherVozPt(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  let vozes: SpeechSynthesisVoice[] = [];
  try {
    vozes = window.speechSynthesis.getVoices() || [];
  } catch {
    return null;
  }
  const pt = vozes.filter(v => /^pt([-_]|$)/i.test((v.lang || '').trim()));
  if (!pt.length) return null;
  const peso = (v: SpeechSynthesisVoice): number => {
    const n = `${v.name || ''} ${v.voiceURI || ''}`.toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    let s = 0;
    // v37.56 — voz MASCULINA: reforça nomes tipicamente masculinos e penaliza
    // os femininos, para que o assistente fale com uma voz de homem.
    if (/jorge|daniel|ricardo|paulo|antonio|antónio|bruno|carlos|miguel|tiago|helder|joao|joão|pedro|lucas|gabriel|male|man|homem/.test(n)) s += 8;
    if (/francisca|helia|hélia|maria|ana|joana|sofia|sophia|camila|beatriz|luciana|fernanda|raquel|female|woman|mulher/.test(n)) s -= 8;
    // variantes tipicamente mais naturais
    if (/natural|neural|online|google|premium|enhanced|siri|eloquence/.test(n)) s += 6;
    // pt-PT primeiro, pt-BR a seguir (pt-AO não existe)
    if (/pt[-_]pt/.test(lang)) s += 3;
    else if (/pt[-_]br/.test(lang)) s += 2;
    else s += 1;
    // vozes não-locais (online) costumam ter melhor prosódia
    if (v.localService === false) s += 1;
    return s;
  };
  return pt.slice().sort((a, b) => peso(b) - peso(a))[0] || null;
}

// Aplica a melhor voz pt + parâmetros naturais a uma utterance.
export function aplicarVozPt(
  u: SpeechSynthesisUtterance,
  opts?: { rate?: number; pitch?: number },
): void {
  const v = escolherVozPt();
  if (v) {
    u.voice = v;
    u.lang = v.lang || 'pt-PT';
  } else {
    // sem vozes pt carregadas: ao menos usar um locale pt válido (nunca pt-AO)
    u.lang = 'pt-PT';
  }
  // ritmo ligeiramente abaixo de 1.0 soa mais natural que 1.1 (robótico/apressado)
  u.rate = opts?.rate ?? 0.98;
  u.pitch = opts?.pitch ?? 1.0;
}
