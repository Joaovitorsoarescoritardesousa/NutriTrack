import React, { useState, useEffect } from "react";
import { 
  Camera, 
  Upload, 
  Apple, 
  X, 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  PlusCircle, 
  CheckCircle2,
  Trash2,
  Loader2,
  HelpCircle,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NutritionData, AnalysisHistoryItem } from "./types";
import { compressImage } from "./utils";
import CameraCapture from "./components/CameraCapture";
import DailySummary from "./components/DailySummary";
import NutritionDisplay from "./components/NutritionDisplay";
import HistoryList from "./components/HistoryList";

const LOADING_STEPS = [
  "Iniciando conexão segura com a IA...",
  "Escaneando a imagem em busca de alimentos...",
  "Identificando ingredientes e porções...",
  "Estimando peso de cada ingrediente...",
  "Calculando calorias e carboidratos...",
  "Redigindo recomendações de saúde do nutricionista...",
  "Finalizando análise nutricional..."
];

export default function App() {
  // Application States
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // base64 representation
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [notes, setNotes] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState<number>(0);
  const [activeAnalysis, setActiveAnalysis] = useState<NutritionData | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [apiError, setApiError] = useState<{ message: string; needsKey?: boolean; details?: string } | null>(null);

  // Persistence limits
  const [targetCalories, setTargetCalories] = useState<number>(2000);
  const [targetCarbs, setTargetCarbs] = useState<number>(250);

  // Hydrate targets and history on Mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("nutrition_history");
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }

      const storedCalTarget = localStorage.getItem("target_calories");
      const storedCarbonTarget = localStorage.getItem("target_carbs");

      if (storedCalTarget) setTargetCalories(parseInt(storedCalTarget, 10));
      if (storedCarbonTarget) setTargetCarbs(parseInt(storedCarbonTarget, 10));
    } catch (err) {
      console.warn("Could not load from localStorage:", err);
    }
  }, []);

  // Set up loading step rotators when analyzing
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setLoadingStepIndex(0);
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Compute accumulated metrics from today's historical items
  const getTodayStatistics = () => {
    const today = new Date().toDateString();
    const todayItems = history.filter((item) => {
      try {
        return new Date(item.timestamp).toDateString() === today;
      } catch {
        return false;
      }
    });

    const calories = todayItems.reduce((acc, item) => acc + item.nutritionData.calories, 0);
    // Round to 1 decimal place
    const carbs = Math.round(todayItems.reduce((acc, item) => acc + item.nutritionData.carbohydrates, 0) * 10) / 10;

    return { calories, carbs };
  };

  const { calories: currentCalories, carbs: currentCarbs } = getTodayStatistics();

  // Handle uploading/reading image files
  const processImageFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas arquivos de imagem.");
      return;
    }

    setApiError(null);

    try {
      // Scale down and compress any high-resolution device photos to ~150kb 
      const { base64, mimeType } = await compressImage(file, 1200, 0.75);
      setSelectedImage(base64);
      setImageMimeType(mimeType);
    } catch (err: any) {
      console.warn("Optimized canvas compression failed, falling back to original file upload:", err);
      
      // Fallback: Read raw file without canvas resizing
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const mime = file.type;
        const base64Data = result.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        
        setSelectedImage(base64Data);
        setImageMimeType(mime);
      };
      reader.onerror = () => {
        setApiError({
          message: "Falha ao carregar o arquivo de imagem.",
          details: "Ocorreu um erro ao tentar ler os bytes da imagem do dispositivo.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleCameraCapture = (base64Image: string, mimeType: string) => {
    setSelectedImage(base64Image);
    setImageMimeType(mimeType);
    setCameraActive(false);
    setApiError(null);
  };

  // Submit base64 food image to local Express backend for analysis
  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setApiError(null);

    try {
      const response = await fetch("/api/nutrition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: selectedImage,
          mimeType: imageMimeType,
          notes: notes,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        setApiError({
          message: resData.error || "Ocorreu um erro ao processar seu prato.",
          needsKey: resData.needsKey,
          details: resData.details,
        });
        setIsAnalyzing(false);
        return;
      }

      if (resData.success && resData.data) {
        const nutritionResult: NutritionData = resData.data;
        setActiveAnalysis(nutritionResult);

        // Prepend result to history
        const newHistoryItem: AnalysisHistoryItem = {
          id: Math.random().toString(36).substring(2, 11),
          timestamp: new Date().toISOString(),
          image: selectedImage,
          notes: notes.trim() || undefined,
          nutritionData: nutritionResult,
        };

        const updatedHistory = [newHistoryItem, ...history];
        setHistory(updatedHistory);
        localStorage.setItem("nutrition_history", JSON.stringify(updatedHistory));

        // Highlight completion visual success, clear workspace text input for next item
        setNotes("");
      } else {
        throw new Error("Formato de resposta inesperado do servidor.");
      }
    } catch (err: any) {
      console.error("Analysis trigger failed:", err);
      setApiError({
        message: "Não foi possível conectar ao servidor de processamento de imagem.",
        details: err.message || err,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // History action callbacks
  const handleSelectHistoryItem = (item: AnalysisHistoryItem) => {
    setActiveAnalysis(item.nutritionData);
    setSelectedImage(item.image);
    setImageMimeType("image/jpeg");
    setNotes(item.notes || "");
    setApiError(null);

    // Scroll to display smoothly on mobile
    const displayElement = document.getElementById("nutrition-display-container");
    if (displayElement) {
      displayElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering selection
    const filtered = history.filter((item) => item.id !== id);
    setHistory(filtered);
    localStorage.setItem("nutrition_history", JSON.stringify(filtered));

    // Clear active selection if it matches deleted ID
    const deletedItem = history.find((i) => i.id === id);
    if (deletedItem && activeAnalysis?.foodName === deletedItem.nutritionData.foodName) {
      setActiveAnalysis(null);
      setSelectedImage(null);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("nutrition_history");
    setActiveAnalysis(null);
    setSelectedImage(null);
  };

  const handleUpdateTargets = (calories: number, carbs: number) => {
    setTargetCalories(calories);
    setTargetCarbs(carbs);
    localStorage.setItem("target_calories", calories.toString());
    localStorage.setItem("target_carbs", carbs.toString());
  };

  const handleClearWorkspace = () => {
    setSelectedImage(null);
    setNotes("");
    setActiveAnalysis(null);
    setApiError(null);
  };

  return (
    <div className="min-h-screen pb-16 font-sans">
      {/* Top Banner / Navbar */}
      <header id="app-navbar" className="sticky top-0 z-40 w-full border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-brand-600 to-emerald-400 text-white shadow-md">
              <Apple size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-black text-stone-900 tracking-tight text-xl">
                Nutri<span className="text-brand-600">Snap</span>
              </h1>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block -mt-1">
                IA de Nutrição Integrada
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
              <div className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
              Servidor Conectado
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        
        {/* Intro Hero Section */}
        <div id="hero-heading" className="mb-8 text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
            <Sparkles size={12} className="text-brand-600" />
            Alimentado por Gemini 3.5 Flash
          </div>
          <h2 className="font-display font-black text-stone-900 tracking-tight text-3xl sm:text-4xl mt-3">
            Processador de Alimentos & Carboidratos
          </h2>
          <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
            Veja calorias e carboidratos de forma instantânea e descomplicada. 
            Tire uma foto ou faça upload do seu prato e receba um relatório nutricional completo.
          </p>
        </div>

        {/* Bento Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: INPUT & TRIGGER (4 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            <div id="uploader-card" className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
              <h3 className="font-display font-bold text-stone-800 text-lg mb-4">Enviar Refeição</h3>
              
              {/* Uploader Interface */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all p-6 ${
                  selectedImage 
                    ? "border-stone-300 bg-stone-50/50" 
                    : "border-stone-300 hover:border-brand-500 bg-stone-50 hover:bg-linear-to-b hover:from-white hover:to-brand-50/10 cursor-pointer"
                }`}
                onClick={() => !selectedImage && document.getElementById("file-picker")?.click()}
              >
                <input
                  type="file"
                  id="file-picker"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <AnimatePresence mode="wait">
                  {!selectedImage ? (
                    <motion.div
                      key="empty-upload"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center space-y-3 py-6"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-stone-400 shadow-xs border border-stone-100 group-hover:scale-105 transition-transform">
                        <Upload size={24} className="text-stone-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-700">Arraste ou clique para enviar</p>
                        <p className="text-xs text-stone-400 mt-1">Suporta PNG, JPEG, WEBP de alta qualidade</p>
                      </div>
                      
                      <div className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 py-1">
                        <span className="h-px w-8 bg-stone-200" />
                        <span>ou</span>
                        <span className="h-px w-8 bg-stone-200" />
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCameraActive(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-stone-900 border border-stone-900 px-4 py-2.5 text-xs font-semibold text-white tracking-wide hover:bg-stone-800 hover:border-stone-800 transition-all shadow-sm active:scale-95"
                          id="btn-trigger-camera"
                        >
                          <Camera size={14} />
                          Tirar Foto na Hora
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="image-preview"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative w-full overflow-hidden rounded-xl border border-stone-200 bg-black aspect-video flex items-center justify-center group"
                    >
                      <img
                        src={`data:image/jpeg;base64,${selectedImage}`}
                        alt="Preview Alimento"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearWorkspace();
                        }}
                        className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/90 transition-colors backdrop-blur-md"
                        title="Remover Imagem"
                        id="btn-remove-preview-image"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Extra context / Notes from user */}
              <div className="mt-5 space-y-1.5">
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Dicas adicionais para a IA (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Duas colheres de arroz integral, filé de frango frito no azeite ou ingredientes difíceis de ver..."
                  className="w-full h-20 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-700 placeholder-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-stone-50/20"
                  disabled={isAnalyzing}
                />
              </div>

              {/* Error messages if any */}
              {apiError && (
                <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-100 flex gap-3 text-red-900">
                  <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold">{apiError.message}</p>
                    {apiError.needsKey && (
                      <p className="text-red-700 mt-1 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-red-200/50">
                        Siga estes passos: no canto superior direito do Google AI Studio, abra o painel de <strong>Settings &gt; Secrets</strong>, adicione a variável <strong>GEMINI_API_KEY</strong> com a sua chave do console de desenvolvimento da Google, e reinicie ou atualize a página.
                      </p>
                    )}
                    {apiError.details && <p className="text-[10px] text-red-500/80 font-mono italic">{apiError.details}</p>}
                  </div>
                </div>
              )}

              {/* Reset & Analyze actions panel */}
              {selectedImage && (
                <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClearWorkspace}
                    className="rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-4 py-2.5 text-xs font-semibold text-stone-600 transition-colors"
                    disabled={isAnalyzing}
                  >
                    Descartar
                  </button>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-stone-300 disabled:cursor-not-allowed px-4 py-2.5 text-xs font-bold text-white tracking-wide transition-colors shadow-sm cursor-pointer"
                    id="btn-request-nutrition-analysis"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Fazendo Análise...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Analisar Alimento</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Local History Display */}
            <HistoryList
              items={history}
              onSelect={handleSelectHistoryItem}
              onDelete={handleDeleteHistoryItem}
              onClearAll={handleClearHistory}
              selectedId={history.find(h => h.nutritionData.foodName === activeAnalysis?.foodName)?.id}
            />
          </div>

          {/* RIGHT PANEL: OUTCOMES, TARGETS & DAILY CHARTS (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Today summary dials always mounted for tracking progress */}
            <DailySummary
              currentCalories={currentCalories}
              currentCarbs={currentCarbs}
              targetCalories={targetCalories}
              targetCarbs={targetCarbs}
              onUpdateTargets={handleUpdateTargets}
            />

            {/* Output Panel Section */}
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div
                  key="loading-screen"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-3xl border border-brand-200 bg-white p-8 shadow-md text-center flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-brand-500 via-emerald-400 to-brand-500 animate-shimmer" />
                  
                  <div className="relative mb-6">
                    {/* Glowing outer circle animation */}
                    <div className="absolute inset-0 rounded-full bg-brand-500/10 blur-xl animate-pulse scale-125" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/50">
                      <Loader2 size={32} className="animate-spin text-brand-500" />
                    </div>
                  </div>

                  <h3 className="font-display font-black text-xl text-stone-900 mb-2">Processando Prato com IA</h3>
                  
                  {/* Staggered Portuguese message lines */}
                  <div id="loader-steps-container" className="h-6 overflow-hidden max-w-sm mx-auto">
                    <p className="text-brand-700 text-sm font-semibold transition-all">
                      {LOADING_STEPS[loadingStepIndex]}
                    </p>
                  </div>

                  <p className="text-xs text-stone-400 mt-6 leading-relaxed max-w-xs">
                    Estamos analisando a textura, cor e distribuição espacial do prato para estimar os macros de forma simplificada.
                  </p>
                </motion.div>
              ) : activeAnalysis ? (
                <motion.div
                  key="results-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  <NutritionDisplay data={activeAnalysis} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-3xl border border-stone-200 bg-dashed bg-white p-10 text-center flex flex-col items-center justify-center min-h-[350px]"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50 text-stone-400 border border-stone-200/30">
                    <Apple size={28} className="text-stone-300" />
                  </div>
                  <h4 className="font-display font-bold text-stone-800 text-base mb-1">Aguardando seu Alimento</h4>
                  <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
                    Envie uma foto de comida no painel ao lado para ver o detalhamento de calorias, carboidratos, proteínas e gorduras do prato.
                  </p>
                  
                  {/* Step Guides */}
                  <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-md">
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 flex flex-col items-center">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700 border border-brand-200 mb-2">1</span>
                      <span className="text-[10px] font-semibold text-stone-500">Fotografe ou suba a refeição</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 flex flex-col items-center">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700 border border-brand-200 mb-2">2</span>
                      <span className="text-[10px] font-semibold text-stone-500">Digite opcionalmente detalhes adicionais</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 flex flex-col items-center">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700 border border-brand-200 mb-2">3</span>
                      <span className="text-[10px] font-semibold text-stone-500">Obtenha contagem de calorias e carboidratos</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

      </main>

      {/* Camera Capture Modal */}
      <AnimatePresence>
        {cameraActive && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setCameraActive(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
