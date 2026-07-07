import { useState, useEffect, useRef, useCallback } from 'react';

export function useGeminiLive() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelTranscript, setModelTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stop = useCallback(() => {
    setIsActive(false);
    setStatus('idle');
    setErrorMessage(null);
    setIsSpeaking(false);
    setVolume(0);
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      // Only close if it's not already closed or closing
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        try {
          wsRef.current.close();
        } catch (e) {
          console.warn("Error closing WebSocket:", e);
        }
      }
      wsRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    
    nextStartTimeRef.current = 0;
  }, []);

  const playAudioChunk = useCallback((base64Data: string) => {
    if (!audioCtxRef.current) return;
    
    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      
      // Ensure we have an even number of bytes for Int16Array
      const pcmData = new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2));
      
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) float32Data[i] = pcmData[i] / 32768.0;
      
      const buffer = audioCtxRef.current.createBuffer(1, float32Data.length, 16000);
      buffer.getChannelData(0).set(float32Data);
      
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtxRef.current.destination);
      
      const startTime = Math.max(audioCtxRef.current.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;
      
      setIsSpeaking(true);
      source.onended = () => {
        if (audioCtxRef.current && audioCtxRef.current.currentTime >= nextStartTimeRef.current - 0.1) {
          setIsSpeaking(false);
        }
      };
    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  }, []);

  const start = useCallback(async (isGov?: boolean) => {
    try {
      setStatus('connecting');
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;
      nextStartTimeRef.current = audioCtx.currentTime;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live${isGov ? '?gov=true' : ''}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("Client received message:", msg.type);
          if (msg.type === 'audio') {
            playAudioChunk(msg.data);
          } else if (msg.type === 'interrupted') {
             if (audioCtxRef.current) nextStartTimeRef.current = audioCtxRef.current.currentTime;
          } else if (msg.type === 'model_transcript') {
            setModelTranscript(prev => prev + msg.data);
          } else if (msg.type === 'error') {
            console.error("Gemini Error:", msg.message);
            setErrorMessage(msg.message);
            setStatus('error');
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      ws.onopen = () => {
        console.log("WebSocket connected successfully");
        setIsActive(true);
        setStatus('active');
        setModelTranscript(''); 
        
        // Client-side heart beat 
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;
        
        source.connect(processor);
        processor.connect(audioCtx.destination);
        
        processor.onaudioprocess = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate volume for UI
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setVolume(rms);

          // Convert float32 to int16 PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32767));
          }
          
          if (pcmData.length === 0) return;

          // Fast and robust Base64 conversion
          const uint8 = new Uint8Array(pcmData.buffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < uint8.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(uint8.slice(i, i + chunkSize)));
          }
          const base64 = btoa(binary);
          
          if (Math.random() < 0.01) {
            console.log(`Sending audio chunk to server: ${base64.length} bytes`);
          }
          wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
        };
      };

      ws.onclose = (e) => {
        console.log("WebSocket closed:", e.code, e.reason);
        stop();
      };
      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setStatus('error');
        stop();
      };

    } catch (err) {
      console.error("Failed to start Gemini Live", err);
      setStatus('error');
      stop();
    }
  }, [playAudioChunk, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    isActive,
    status,
    isSpeaking,
    volume,
    modelTranscript,
    start,
    stop,
    errorMessage
  };
}
