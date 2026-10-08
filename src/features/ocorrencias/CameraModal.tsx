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
  Trash2,
  Smartphone,
  Plus,
  Eye,
} from "lucide-react";
import { CdaModal } from "../../components/ui/CdaModal";

export interface CapturedPhotoItem {
  id: string;
  dataUrl: string;
  blob: Blob;
  nome: string;
}

export interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => Promise<void>;
  onCaptureMultiple?: (files: File[]) => Promise<void>;
  maxPhotos?: number;
  currentPhotosCount: number;
}

export function CameraModal({
  isOpen,
  onClose,
  onCapture,
  onCaptureMultiple,
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

  // Lista de fotografias capturadas nesta sessão da câmara
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotoItem[]>([]);
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flash, setFlash] = useState(false);

  const totalPossible = maxPhotos - currentPhotosCount;
  const canCaptureMore = capturedPhotos.length < totalPossible;

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

  // Iniciar stream de vídeo
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

  // Iniciar câmara quando o modal abre e resetar estado
  useEffect(() => {
    if (isOpen) {
      setCapturedPhotos([]);
      setPreviewPhotoId(null);
      void startStream(facingMode, selectedCameraId);
    } else {
      stopStream();
      setCapturedPhotos([]);
      setPreviewPhotoId(null);
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

  // Capturar snapshot do vídeo e adicionar à lista de fotos capturadas
  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video || !canCaptureMore) return;
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

    // Se estiver a usar câmara frontal (user), espelhar
    if (facingMode === "user" && !selectedCameraId) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Gerar JPEG com boa qualidade
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          setCapturedPhotos((prev) => {
            const newPhoto: CapturedPhotoItem = {
              id: `foto-${Date.now()}-${prev.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
              dataUrl,
              blob,
              nome: `foto_camera_${prev.length + 1}.jpg`,
            };
            return [...prev, newPhoto];
          });
        }
        setIsCapturing(false);
      },
      "image/jpeg",
      0.9
    );
  };

  // Remover foto da lista capturada no modal
  const handleRemoveCapturedPhoto = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== id));
    if (previewPhotoId === id) {
      setPreviewPhotoId(null);
    }
  };

  // Confirmar e carregar todas as fotos capturadas para a página de ocorrência
  const handleConfirmAllPhotos = async () => {
    if (capturedPhotos.length === 0) return;
    setIsSaving(true);
    try {
      const files: File[] = capturedPhotos.map((item, index) => {
        return new File(
          [item.blob],
          `foto_ocorrencia_${Date.now()}_${index + 1}.jpg`,
          { type: "image/jpeg" }
        );
      });

      if (onCaptureMultiple) {
        await onCaptureMultiple(files);
      } else {
        for (const file of files) {
          await onCapture(file);
        }
      }

      setCapturedPhotos([]);
      setPreviewPhotoId(null);
      onClose();
    } catch (err) {
      console.error("[CameraModal] Erro ao gravar fotos capturadas:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const previewItem = capturedPhotos.find((p) => p.id === previewPhotoId);

  return (
    <CdaModal
      aberto={isOpen}
      onFechar={onClose}
      icone={Camera}
      titulo="Tirar Fotografias da Ocorrência"
      subtitulo="Câmara do Dispositivo · CDA Ocorrências"
      maxW="max-w-2xl"
      padding="p-4 sm:p-6"
    >
      <div className="space-y-4">
        {/* Barra superior de contagem e estado */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
          <span className="text-slate-600 flex items-center gap-1.5">
            <Camera size={15} className="text-primary shrink-0" />
            Fotografias ({currentPhotosCount + capturedPhotos.length} / {maxPhotos})
          </span>
          <div className="flex items-center gap-2">
            {capturedPhotos.length > 0 && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle size={12} />
                {capturedPhotos.length} {capturedPhotos.length === 1 ? "foto pronta" : "fotos prontas"}
              </span>
            )}
            {!canCaptureMore && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                Limite atingido
              </span>
            )}
          </div>
        </div>

        {/* Viewfinder / Visor da Câmara ou Zoom de Pré-visualização */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
          {/* Flash Effect */}
          {flash && (
            <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
          )}

          {/* Visualizador de Foto em Destaque (quando o utilizador clica numa thumbnail) */}
          {previewItem ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black z-20">
              <img
                src={previewItem.dataUrl}
                alt={previewItem.nome}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Eye size={14} className="text-primary" />
                Pré-visualização
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoId(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 text-xs font-bold flex items-center gap-1"
                title="Voltar à câmara"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            /* Stream de Vídeo ao Vivo */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" && !selectedCameraId ? "-scale-x-100" : ""
                } ${cameraError ? "hidden" : "block"}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!streamReady && !cameraError && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white z-10">
                  <Loader2 size={28} className="animate-spin text-primary" />
                  <p className="text-xs font-bold text-slate-300">
                    A inicializar câmara…
                  </p>
                </div>
              )}

              {/* Grelha / Marcadores de enquadramento */}
              {streamReady && !cameraError && (
                <div className="absolute inset-0 pointer-events-none p-4">
                  <div className="w-full h-full border border-white/20 rounded-xl relative">
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/70" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/70" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/70" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/70" />
                  </div>
                </div>
              )}

              {/* Botão de Alternar Câmara */}
              {streamReady && !cameraError && (
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
            </>
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

        {/* Barra de Fotos Capturadas (Thumbnails Strip) */}
        {capturedPhotos.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
              <span>Fotos capturadas nesta sessão ({capturedPhotos.length}):</span>
              <span className="text-[10px] text-slate-400">Clique na miniatura para pré-visualizar</span>
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {capturedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  onClick={() => setPreviewPhotoId(photo.id)}
                  className={`group relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition ${
                    previewPhotoId === photo.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <img
                    src={photo.dataUrl}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1 rounded">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveCapturedPhoto(photo.id, e)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-600/90 text-white hover:bg-red-700 transition shadow-sm"
                    title="Remover esta foto"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input escondido para acionar câmara nativa */}
        <input
          ref={nativeInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              setIsSaving(true);
              try {
                if (onCaptureMultiple) {
                  await onCaptureMultiple(files.slice(0, totalPossible));
                } else {
                  for (const file of files.slice(0, totalPossible)) {
                    await onCapture(file);
                  }
                }
                onClose();
              } finally {
                setIsSaving(false);
              }
            }
            e.target.value = "";
          }}
        />

        {/* Barra de Ações Inferior */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              data-testid="btn-fechar-camera-modal"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition disabled:opacity-50"
            >
              Cancelar
            </button>

            {/* Disparador de Captura */}
            <button
              type="button"
              data-testid="camera-shutter-btn"
              onClick={captureSnapshot}
              disabled={!streamReady || isCapturing || !canCaptureMore || isSaving}
              className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white border-4 border-primary shadow-xl hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed mx-auto sm:mx-0"
              title={canCaptureMore ? "Tirar foto" : "Limite de fotos atingido"}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary group-hover:bg-primary/90 flex items-center justify-center transition">
                <Camera size={18} className="text-white sm:w-5 sm:h-5" />
              </div>
            </button>
          </div>

          {/* Botão Principal: "Usar estas fotos" */}
          {capturedPhotos.length > 0 && (
            <button
              type="button"
              data-testid="btn-usar-estas-fotos"
              onClick={() => void handleConfirmAllPhotos()}
              disabled={isSaving}
              className="w-full sm:w-auto flex-1 max-w-sm py-3 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  A carregar fotos para a ocorrência…
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  {capturedPhotos.length === 1
                    ? "Usar esta foto"
                    : `Usar estas fotos (${capturedPhotos.length})`}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </CdaModal>
  );
}
