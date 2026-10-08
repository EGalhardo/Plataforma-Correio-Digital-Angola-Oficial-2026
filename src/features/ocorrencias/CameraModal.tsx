/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  X,
  RotateCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
  SwitchCamera,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { CdaModal } from "../../components/ui/CdaModal";

export interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => Promise<void>;
  maxPhotos?: number;
  currentPhotosCount: number;
}

export function CameraModal({
  isOpen,
  onClose,
  onCapture,
  maxPhotos = 5,
  currentPhotosCount,
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeInputRef = useRef<HTMLInputElement | null>(null);

  const [streamReady, setStreamReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flash, setFlash] = useState(false);

  // Parar todas as tracks do stream activo
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamReady(false);
  };

  // Iniciar stream de vídeo com resolução otimizada e gestão de facingMode
  const startStream = async (
    targetFacing: "environment" | "user",
    deviceId?: string | null
  ) => {
    stopStream();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("API de câmara não suportada neste navegador.");
      }

      let stream: MediaStream | null = null;
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: targetFacing },
          });
        } catch (e2) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }
      }

      if (!stream) {
        throw new Error("Não foi possível inicializar o fluxo de vídeo.");
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {}
      }
      setStreamReady(true);

      // Enumerar câmaras disponíveis
      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === "videoinput");
          setAvailableCameras(videoDevices);
        } catch {}
      }
    } catch (err: any) {
      console.warn("[CameraModal] Erro ao obter acesso à câmara:", err);
      const isDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        String(err).includes("Permission denied");
      setCameraError(
        isDenied
          ? "Permissão de acesso à câmara negada pelo navegador. Permita o acesso à câmara nas definições ou use o carregamento direto de ficheiro/galeria."
          : "Não foi possível aceder à câmara do dispositivo. Certifique-se de que nenhuma outra aplicação a está a utilizar."
      );
    }
  };

  // Iniciar câmara quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCapturedBlob(null);
      void startStream(facingMode, selectedCameraId);
    } else {
      stopStream();
      setCapturedImage(null);
      setCapturedBlob(null);
      setCameraError(null);
    }
    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Alternar câmara (Frontal / Traseira ou ciclo de dispositivos)
  const toggleCameraFacing = async () => {
    if (availableCameras.length > 1) {
      const currentIdx = availableCameras.findIndex(
        (c) => c.deviceId === selectedCameraId
      );
      const nextIdx = (currentIdx + 1) % availableCameras.length;
      const nextCam = availableCameras[nextIdx];
      setSelectedCameraId(nextCam.deviceId);
      await startStream(facingMode, nextCam.deviceId);
    } else {
      const nextFacing = facingMode === "environment" ? "user" : "environment";
      setFacingMode(nextFacing);
      await startStream(nextFacing, null);
    }
  };

  // Capturar snapshot do vídeo no canvas
  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 220);

    const canvas = canvasRef.current || document.createElement("canvas");
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    // Se estiver a usar câmara frontal (user), espelhar para corresponder à visualização natural
    if (facingMode === "user" && !selectedCameraId) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Gerar JPEG com boa qualidade
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          setCapturedImage(dataUrl);
          try {
            video.pause();
          } catch {}
        }
        setIsCapturing(false);
      },
      "image/jpeg",
      0.9
    );
  };

  // Repetir / Tirar outra fotografia
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    if (videoRef.current) {
      try {
        videoRef.current.play();
      } catch {}
    }
  };

  // Confirmar e usar a foto capturada
  const handleConfirmPhoto = async () => {
    if (!capturedBlob && !capturedImage) return;
    setIsSaving(true);
    try {
      let file: File;
      if (capturedBlob) {
        file = new File(
          [capturedBlob],
          `foto_ocorrencia_${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );
      } else {
        const res = await fetch(capturedImage!);
        const blob = await res.blob();
        file = new File(
          [blob],
          `foto_ocorrencia_${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );
      }

      await onCapture(file);
      setCapturedImage(null);
      setCapturedBlob(null);
      onClose();
    } catch (err) {
      console.error("[CameraModal] Erro ao gravar foto capturada:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <CdaModal
      aberto={isOpen}
      onFechar={onClose}
      icone={Camera}
      titulo="Tirar Fotografia da Ocorrência"
      subtitulo="Câmara do Dispositivo · CDA Ocorrências"
      maxW="max-w-2xl"
      padding="p-4 sm:p-6"
    >
      <div className="space-y-4">
        {/* Barra superior de estado / contagem */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
          <span className="text-slate-600 flex items-center gap-1.5">
            <Camera size={15} className="text-primary shrink-0" />
            Fotografias anexadas
          </span>
          <span
            className={`font-black px-2 py-0.5 rounded-full ${
              currentPhotosCount >= maxPhotos
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-primary/10 text-primary"
            }`}
          >
            {currentPhotosCount} / {maxPhotos}
          </span>
        </div>

        {/* Viewfinder / Visor da Câmara */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
          {/* Flash Effect */}
          {flash && (
            <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
          )}

          {/* Stream de Vídeo ao Vivo (sempre montado para reatividade imediata) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              facingMode === "user" && !selectedCameraId ? "-scale-x-100" : ""
            } ${capturedImage || cameraError ? "hidden" : "block"}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!streamReady && !capturedImage && !cameraError && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white z-10">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-xs font-bold text-slate-300">
                A inicializar câmara…
              </p>
            </div>
          )}

          {/* Grelha / Marcadores de enquadramento */}
          {streamReady && !capturedImage && !cameraError && (
            <div className="absolute inset-0 pointer-events-none p-4">
              <div className="w-full h-full border border-white/20 rounded-xl relative">
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/70" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/70" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/70" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/70" />
              </div>
            </div>
          )}

          {/* Botão de Alternar Câmara (se houver mais de 1 câmara ou em mobile) */}
          {streamReady && !capturedImage && !cameraError && (
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={() => void toggleCameraFacing()}
                className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 shadow-lg transition active:scale-95"
                title="Alternar câmara (frontal / traseira)"
              >
                <SwitchCamera size={18} />
              </button>
            </div>
          )}

          {/* Foto Capturada (Pré-visualização) */}
          {capturedImage && (
            <div className="relative w-full h-full flex items-center justify-center bg-black z-20">
              <img
                src={capturedImage}
                alt="Fotografia capturada"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <CheckCircle size={14} />
                Foto capturada
              </div>
            </div>
          )}

          {/* Estado de Erro na Câmara */}
          {cameraError && (
            <div className="p-6 text-center space-y-3 z-30 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-medium">
                {cameraError}
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => void startStream(facingMode, selectedCameraId)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <RotateCw size={14} />
                  Tentar novamente
                </button>
                <button
                  type="button"
                  onClick={() => nativeInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Smartphone size={14} />
                  Câmara Nativa / Galeria
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input escondido para acionar a câmara nativa do sistema em caso de fallback */}
        <input
          ref={nativeInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              setIsSaving(true);
              try {
                await onCapture(file);
                if (currentPhotosCount + 1 >= maxPhotos) {
                  onClose();
                }
              } finally {
                setIsSaving(false);
              }
            }
            e.target.value = "";
          }}
        />

        {/* Barra de Ações Inferior */}
        <div className="pt-2">
          {capturedImage ? (
            /* Ações para a foto capturada: Repetir ou Usar */
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isSaving}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
              >
                <RotateCw size={16} />
                Tirar outra fotografia
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmPhoto()}
                disabled={isSaving}
                className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    A processar fotografia…
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Usar esta fotografia
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Botão de Disparo / Shutter */
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                data-testid="btn-fechar-camera-modal"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="camera-shutter-btn"
                  onClick={captureSnapshot}
                  disabled={!streamReady || isCapturing || currentPhotosCount >= maxPhotos}
                  className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-white border-4 border-primary shadow-xl hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Capturar fotografia"
                >
                  <div className="w-10 h-10 rounded-full bg-primary group-hover:bg-primary/90 flex items-center justify-center transition">
                    <Camera size={20} className="text-white" />
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => nativeInputRef.current?.click()}
                className="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-bold text-[11px] sm:text-xs transition flex items-center gap-1.5"
                title="Abrir câmara nativa do telemóvel"
              >
                <Smartphone size={14} />
                <span className="hidden sm:inline">Câmara nativa</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </CdaModal>
  );
}
