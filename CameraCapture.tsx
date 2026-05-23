import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, X, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

interface CameraCaptureProps {
  onCapture: (base64Image: string, mimeType: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize camera stream with smart fallback constraints
  useEffect(() => {
    let active = true;

    async function initCamera() {
      setIsInitializing(true);
      setErrorMessage("");

      // Ensure previous stream is cleanly stopped
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      try {
        let stream: MediaStream;
        
        // Attempt 1: Environmental back lens (perfect for photographing objects like food plates)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: "environment", 
              width: { ideal: 1280 }, 
              height: { ideal: 720 } 
            },
            audio: false,
          });
        } catch (firstErr) {
          console.warn("Attempting environmental camera failed, falling back to basic camera...", firstErr);
          if (!active) return;
          
          // Attempt 2: Generic fallback stream without restrictive constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        
        // Bind to video element if it's already mounted
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => console.warn("Auto-play blocked:", err));
        }
        
        setPermissionState("granted");
        setIsInitializing(false);

        // Retrieve other available cameras dynamically now that permission is granted
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === "videoinput");
          setCameras(videoDevices);

          // Mark current active camera selected in the toggle switcher list
          const activeTrack = stream.getVideoTracks()[0];
          if (activeTrack) {
            const settings = activeTrack.getSettings();
            if (settings.deviceId) {
              setSelectedCameraId(settings.deviceId);
            }
          }
        } catch (deviceErr) {
          console.warn("Could not query device tracks:", deviceErr);
        }

      } catch (err: any) {
        console.error("Failed to acquire camera permission or stream:", err);
        if (active) {
          setPermissionState("denied");
          setIsInitializing(false);
          
          let friendlyMsg = "Ocorreu um erro ao conectar à câmera física.";
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            friendlyMsg = "A permissão de acesso à câmera de vídeo foi recusada pelo navegador ou desabilitada nas opções de privacidade do site.";
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            friendlyMsg = "Nenhum dispositivo de captação de imagem ou câmera integrada foi encontrado no seu computador ou celular.";
          }

          setErrorMessage(
            `${friendlyMsg} Se você estiver acessando o app dentro da visualização padrão (iframe) do AI Studio, restrições rígidas de sandbox dos navegadores podem impedir o acesso direto à câmera. Para usar a câmera do seu celular ou PC, use o botão azul de 'Abrir em Nova Aba' no menu do painel do AI Studio para dar permissão ou carregue arquivos de foto diretamente.`
          );
        }
      }
    }

    initCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Guarantee that whenever video element is mounted, it gets the stream bound and playing immediately
  useEffect(() => {
    if (videoRef.current && streamRef.current && permissionState === "granted") {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => console.warn("Immediate playback on mount failed:", err));
    }
  }, [permissionState, isInitializing]);

  // Handle switching to another camera track dynamically (e.g. from front to back lens)
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1 || !selectedCameraId) return;

    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];

    setIsInitializing(true);

    // Stop existing camera feed
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: nextCamera.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = newStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch((e) => console.warn(e));
      }
      setSelectedCameraId(nextCamera.deviceId);
      setIsInitializing(false);
    } catch (swapErr) {
      console.warn("Failed switching to exact camera device ID, using generic fallback...", swapErr);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch((e) => console.warn(e));
        }
        setIsInitializing(false);
      } catch (fbErr) {
        setPermissionState("denied");
        setErrorMessage("Não foi possível carregar o fluxo alternativo de vídeo.");
        setIsInitializing(false);
      }
    }
  };

  // Capture frame from active video element
  const handleCapture = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      
      // Mirror the dimension aspects from track stream info
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawUrl = canvas.toDataURL("image/jpeg", 0.9);
        const base64Data = rawUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
        onCapture(base64Data, "image/jpeg");
      }
    } catch (err) {
      console.error("Error capturing snapshot:", err);
      setErrorMessage("Não foi possível capturar a foto do feed ativo de vídeo.");
    }
  };

  return (
    <div id="camera-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-neutral-900 shadow-2xl text-white"
      >
        {/* Header */}
        <div id="camera-header" className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
              <Camera size={18} />
            </div>
            <h3 className="font-display font-semibold text-lg">Tirar Foto do Prato</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Area viewport */}
        <div id="camera-viewport" className="relative aspect-video w-full bg-black flex items-center justify-center">
          {permissionState === "granted" && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}

          {/* Loading state overlay */}
          {isInitializing && permissionState !== "denied" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm text-neutral-400">Iniciando câmera...</p>
            </div>
          )}

          {/* Error overlay */}
          {permissionState === "denied" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 p-6 text-center overflow-y-auto">
              <div className="mb-3 rounded-full bg-red-500/10 p-3 text-red-500 shrink-0">
                <ShieldAlert size={36} />
              </div>
              <h4 className="font-display font-semibold text-base mb-2">Acesso à Câmera Bloqueado ou Indisponível</h4>
              <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
                {errorMessage}
              </p>
              <button
                onClick={onClose}
                className="rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Voltar e Fazer Upload de Imagem
              </button>
            </div>
          )}

          {/* Camera switcher toggler */}
          {permissionState === "granted" && !isInitializing && cameras.length > 1 && (
            <button
              onClick={handleSwitchCamera}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2.5 backdrop-blur-md hover:bg-black/95 transition-all border border-white/10 cursor-pointer"
              title="Alternar Câmera"
            >
              <RefreshCw size={18} className="text-white" />
            </button>
          )}
        </div>

        {/* Action Controls Footer */}
        {permissionState === "granted" && !isInitializing && (
          <div id="camera-controls" className="flex items-center justify-between py-5 px-6 bg-neutral-950 border-t border-white/10 shrink-0">
            <span className="text-xs text-neutral-400 font-medium">
              Alinhe a comida centralizada no visor antes de fotografar.
            </span>
            <button
              onClick={handleCapture}
              className="group flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-xl transition-all active:scale-95 cursor-pointer"
              id="btn-capture-snapshot"
              title="Tirar Foto"
            >
              <span className="block h-5 w-5 rounded-full bg-white opacity-95 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
