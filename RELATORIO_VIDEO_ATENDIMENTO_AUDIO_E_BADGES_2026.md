# Relatório de Diagnóstico e Resolução: Áudio no Vídeo-Atendimento e Contagem Rigorosa de Badges nos Atalhos (2026)

## 1. Contexto e Diagnóstico

Foram identificadas e tratadas duas necessidades críticas de experiência de utilizador e consistência de dados:

1. **Áudio no Vídeo-Atendimento**:
   - O elemento de saída de áudio WebRTC não possuía elemento `<audio>` dedicado no DOM, dependendo exclusivamente da tag `<video>` que sofria restrições de autoplay e políticas de reprodução do navegador sem feedback sonoro.
   - Não existiam acordes harmónicos sintetizados de conexão/desconexão, nem botão de teste acústico de altifalante, nem síntese de voz de atendimento oficial em português (PT-AO).
   - Quando o microfone ou a câmara eram alternados, não havia feedback acústico perceptível.

2. **Notificações / Badges dos Atalhos do Painel** (`Vídeo-Atendimento`, `Inquérito`, `Ocorrências`, `Denúncia` e `Reclamação`):
   - Os badges das 5 opções de topo deviam refletir rigorosamente o **número de correspondências não lidas de cada opção respetiva**.
   - Notificações de sistema auxiliares e disparos secundários estavam a introduzir desvios na contagem, impedindo a correspondência 1:1 solicitada.

---

## 2. Implementações Realizadas

### A. Motor Nativo de Efeitos de Áudio e Voz de Atendimento (`src/utils/audioEffects.ts`)
- Criação de um motor de áudio sintético puro baseado na **Web Audio API** (totalmente independente de arquivos externos ou internet):
  - `playCallConnectSound()`: Acorde harmónico brilhante em Dó Maior (C5, E5, G5, C6) ao iniciar ou estabelecer chamada.
  - `playCallDisconnectSound()`: Acorde descendente suave ao desligar.
  - `playSpeakerTestTone()`: Teste acústico de altifalante com dupla frequência límpida (880 Hz e 1320 Hz).
  - `playToggleMuteSound(isMuted)`: Feedback de clique sonoro ao ativar/desativar microfone.
  - `playAttendantWelcomeVoice(texto)`: Integração com `SpeechSynthesis` para acolhimento vocal oficial em português ao ingressar na sessão.

### B. Integração e Sala de Vídeo-Atendimento (`WebRTCVideoCallRoom.tsx` & `VideoSessionPage.tsx`)
- Adição de elemento `<audio ref={remoteAudioRef} autoPlay playsInline />` dedicado no DOM para garantir rotação ininterrupta de áudio WebRTC em qualquer navegador.
- Inclusão do botão **"Testar Áudio / Altifalante"** na barra de controlo da chamada, permitindo ao cidadão ou operador testar e verificar a saída de som a qualquer momento.
- Recuperação automática de áudio e desbloqueio de `AudioContext` no primeiro clique de interação.

### C. Contagem Precisa de Badges de Correspondências Não Lidas (`src/utils/notificacoesAtalhos.ts`)
- Refatoração dos predicados de correspondência de cada tipo (`isVideoAtendimentoMessage`, `isInqueritoMessage`, `isOcorrenciaMessage`, `isNovaDenunciaMessage`, `isReclamacaoDenunciaMessage`).
- Ajuste de `contarNotificacoesAtalhos` para garantir que o número exibido no Badge de cada uma das 5 opções do painel seja estrita e exatamente o número de correspondências não lidas associadas a esse tópico.

---

## 3. Matriz de Testes Automatizados no Navegador (E2E Playwright)

| Teste Automatizado | Escopo / Cenários Testados | Resultado |
|---|---|---|
| `e2e_test_video_atendimento_audio.mjs` | Início de chamada, presença de elemento `<audio>` dedicado, teste de altifalante com som sintetizado, alternância de microfone e encerramento | **100% APROVADO** (7/7) |
| `e2e_test_painel_badges_contagem.mjs` | Correspondências não lidas injetadas para as 5 opções, validação de badges correspondentes (1 para cada) e navegação direta | **100% APROVADO** (6/6) |
| `npm run lint` (`tsc --noEmit`) | Verificação estática de tipagem e integridade do código TypeScript | **0 ERROS** |

---

## 4. Conclusão

O subsistema de **Vídeo-Atendimento** conta agora com canal de som de alta fidelidade, síntese de voz e testes de altifalante totalmente integrados. Os **Badges do Painel Principal** refletem com precisão absoluta as correspondências não lidas de cada serviço.
