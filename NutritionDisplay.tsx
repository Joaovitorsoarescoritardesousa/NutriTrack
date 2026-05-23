import React, { useState } from "react";
import { Flame, Carrot, Beef, Droplets, Scale, HelpCircle, ChevronRight, MessageSquareHeart } from "lucide-react";
import { NutritionData } from "../types";
import { motion } from "motion/react";

interface NutritionDisplayProps {
  data: NutritionData;
}

export default function NutritionDisplay({ data }: NutritionDisplayProps) {
  const [showComponentBreakdown, setShowComponentBreakdown] = useState(true);

  // Simple assessment relative to generic prato
  const getConfidenceLevel = (score: number) => {
    if (score >= 0.85) return { text: "Excelente", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (score >= 0.65) return { text: "Estimado", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { text: "Aproximado", color: "text-stone-700 bg-stone-50 border-stone-200" };
  };

  const confidence = getConfidenceLevel(data.confidenceScore);

  return (
    <div id="nutrition-display-container" className="space-y-6">
      {/* Prime Card: Food Name and confidence */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4 mb-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-brand-600 uppercase">Alimento Identificado</span>
            <h2 className="font-display font-extrabold text-stone-900 text-2xl sm:text-3xl mt-1 capitalize leading-tight">
              {data.foodName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${confidence.color}`}>
              Confiança: {confidence.text} ({Math.round(data.confidenceScore * 100)}%)
            </span>
          </div>
        </div>

        {/* Nutritional Feedback Text */}
        <div id="expert-commentary" className="flex gap-3 bg-stone-50 rounded-2xl p-4 border border-stone-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <MessageSquareHeart size={20} />
          </div>
          <div>
            <h4 className="font-display font-bold text-stone-800 text-sm mb-1">Avaliação do Nutricionista</h4>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">{data.feedback}</p>
          </div>
        </div>
      </div>

      {/* Primary Indicators (Oversized Calories & Carbs per user's "simple calories & carbohydrates" priority) */}
      <div id="simple-macros-priority" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calories Card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-3xl border border-amber-200 bg-linear-to-b from-amber-50/40 to-amber-50/10 p-6 shadow-xs flex items-center justify-between"
        >
          {/* Subtle BG circle accent */}
          <div className="absolute -right-8 -bottom-8 h-28 w-28 bg-amber-500/5 rounded-full pointer-events-none" />

          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-700/80 uppercase tracking-wider block">Calorias Estimadas</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-amber-950 text-5xl tracking-tight leading-none">
                {data.calories}
              </span>
              <span className="text-sm font-semibold text-amber-800/80">kcal</span>
            </div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Flame size={32} strokeWidth={2.5} />
          </div>
        </motion.div>

        {/* Carbohydrates Card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-linear-to-b from-emerald-50/40 to-emerald-50/10 p-6 shadow-xs flex items-center justify-between"
        >
          {/* Subtle BG circle accent */}
          <div className="absolute -right-8 -bottom-8 h-28 w-28 bg-emerald-500/5 rounded-full pointer-events-none" />

          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-700/80 uppercase tracking-wider block">Carboidratos Totais</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-emerald-950 text-5xl tracking-tight leading-none">
                {data.carbohydrates}
              </span>
              <span className="text-sm font-semibold text-emerald-800/80">g</span>
            </div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Carrot size={32} strokeWidth={2.5} />
          </div>
        </motion.div>
      </div>

      {/* Secondary Metrics / Macronutrients */}
      <div id="secondary-macros" className="grid grid-cols-3 gap-4">
        {/* Proteins Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <Beef size={16} />
            </div>
            <span className="text-xs font-semibold text-stone-500 block">Proteínas</span>
          </div>
          <div>
            <span className="font-display font-extrabold text-stone-900 text-xl sm:text-2xl">{data.proteins}</span>
            <span className="text-[10px] font-semibold text-stone-400 ml-1">g</span>
          </div>
        </div>

        {/* Fats Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Droplets size={16} />
            </div>
            <span className="text-xs font-semibold text-stone-500 block">Gorduras</span>
          </div>
          <div>
            <span className="font-display font-extrabold text-stone-900 text-xl sm:text-2xl">{data.fats}</span>
            <span className="text-[10px] font-semibold text-stone-400 ml-1">g</span>
          </div>
        </div>

        {/* Estimated Weight Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Scale size={16} />
            </div>
            <span className="text-xs font-semibold text-stone-500 block">Peso Total</span>
          </div>
          <div>
            <span className="font-display font-extrabold text-stone-900 text-xl sm:text-2xl">{data.estimatedWeightGrams}</span>
            <span className="text-[10px] font-semibold text-stone-400 ml-1">g</span>
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div id="components-breakdown-panel" className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        <button
          onClick={() => setShowComponentBreakdown(!showComponentBreakdown)}
          className="flex w-full items-center justify-between bg-stone-50/55 px-6 py-4 border-b border-stone-100 hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-stone-800 text-sm">Detalhamento por Ingrediente</span>
            <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
              {data.components.length}
            </span>
          </div>
          <ChevronRight
            size={16}
            className={`text-stone-400 transition-transform duration-200 ${showComponentBreakdown ? "rotate-90" : ""}`}
          />
        </button>

        {showComponentBreakdown && (
          <div className="p-4 sm:p-6 divide-y divide-stone-100">
            {data.components.map((item, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="font-semibold text-stone-800 text-sm capitalize">{item.name}</h5>
                    <span className="text-xs text-stone-400 font-medium">Peso estimado: {item.weightEstimateGrams}g</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 pl-7 sm:pl-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Calorias</span>
                    <span className="font-semibold text-amber-700 text-xs sm:text-sm">{item.calories} kcal</span>
                  </div>
                  <div className="w-px h-6 bg-stone-200 shrink-0" />
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block text-left">Carbos</span>
                    <span className="font-semibold text-emerald-700 text-xs sm:text-sm">{item.carbohydrates}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
