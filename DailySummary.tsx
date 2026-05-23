import React, { useState } from "react";
import { Flame, Carrot, Pencil, Check, X, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DailySummaryProps {
  currentCalories: number;
  currentCarbs: number;
  targetCalories: number;
  targetCarbs: number;
  onUpdateTargets: (calories: number, carbs: number) => void;
}

export default function DailySummary({
  currentCalories,
  currentCarbs,
  targetCalories,
  targetCarbs,
  onUpdateTargets,
}: DailySummaryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempCalories, setTempCalories] = useState(targetCalories.toString());
  const [tempCarbs, setTempCarbs] = useState(targetCarbs.toString());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseInt(tempCalories, 10) || 2000;
    const carb = parseInt(tempCarbs, 10) || 250;
    onUpdateTargets(c, carb);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempCalories(targetCalories.toString());
    setTempCarbs(targetCarbs.toString());
    setIsEditing(false);
  };

  const calPercent = Math.min(100, Math.round((currentCalories / targetCalories) * 100));
  const carbsPercent = Math.min(100, Math.round((currentCarbs / targetCarbs) * 100));

  // Circular gauge helpers
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const calStrokeOffset = circumference - (calPercent / 100) * circumference;
  const carbsStrokeOffset = circumference - (carbsPercent / 100) * circumference;

  return (
    <div id="daily-summary-root" className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
        <div>
          <h3 className="font-display font-bold text-stone-800 text-lg">Consumo Diário</h3>
          <p className="text-xs text-stone-500">Acompanhamento de metas recomendadas para hoje</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => {
              setTempCalories(targetCalories.toString());
              setTempCarbs(targetCarbs.toString());
              setIsEditing(true);
            }}
            className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            id="btn-edit-nutrition-goals"
          >
            <Pencil size={12} />
            Ajustar Metas
          </button>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.form
            key="editing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSave}
            className="space-y-4 rounded-2xl bg-stone-50 p-4 border border-stone-100 mb-5"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Meta de Calorias (kcal)
                </label>
                <input
                  type="number"
                  value={tempCalories}
                  onChange={(e) => setTempCalories(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                  min="500"
                  max="10000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Meta de Carboidratos (g)
                </label>
                <input
                  type="number"
                  value={tempCarbs}
                  onChange={(e) => setTempCarbs(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                  min="10"
                  max="1500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1 rounded-xl bg-stone-200 hover:bg-stone-300 transition-colors px-3 py-1.5 text-xs font-medium text-stone-700"
              >
                <X size={14} />
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 rounded-xl bg-stone-800 hover:bg-stone-950 transition-colors px-3 py-1.5 text-xs font-medium text-white shadow-sm"
              >
                <Check size={14} />
                Salvar
              </button>
            </div>
          </motion.form>
        ) : null}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Calorias Gauge */}
        <div id="calorie-gauge" className="flex items-center gap-4 bg-stone-50/50 rounded-2xl p-4 border border-stone-100">
          <div className="relative flex items-center justify-center h-20 w-20 shrink-0">
            <svg className="h-full w-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-stone-200 fill-none"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-amber-500 fill-none transition-all duration-500"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={calStrokeOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <Flame size={18} className="text-amber-500" />
              <span className="font-display font-medium text-stone-800 text-sm mt-0.5">{calPercent}%</span>
            </div>
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Calorias</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display font-extrabold text-stone-800 text-2xl">{currentCalories}</span>
              <span className="text-xs text-stone-500 font-medium">/ {targetCalories} kcal</span>
            </div>
            {currentCalories >= targetCalories ? (
              <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Meta Atingida!
              </span>
            ) : (
              <span className="text-[11px] text-stone-500 block mt-1">Faltam {Math.max(0, targetCalories - currentCalories)} kcal</span>
            )}
          </div>
        </div>

        {/* Carboidratos Gauge */}
        <div id="carb-gauge" className="flex items-center gap-4 bg-stone-50/50 rounded-2xl p-4 border border-stone-100">
          <div className="relative flex items-center justify-center h-20 w-20 shrink-0">
            <svg className="h-full w-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-stone-200 fill-none"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-emerald-500 fill-none transition-all duration-500"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={carbsStrokeOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <Carrot size={18} className="text-emerald-500" />
              <span className="font-display font-medium text-stone-800 text-sm mt-0.5">{carbsPercent}%</span>
            </div>
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Carboidratos</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display font-extrabold text-stone-800 text-2xl">{currentCarbs}g</span>
              <span className="text-xs text-stone-500 font-medium">/ {targetCarbs}g</span>
            </div>
            {currentCarbs >= targetCarbs ? (
              <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Meta Atingida!
              </span>
            ) : (
              <span className="text-[11px] text-stone-500 block mt-1">Faltam {Math.max(0, targetCarbs - currentCarbs)}g</span>
            )}
          </div>
        </div>
      </div>

      {/* Motivational message */}
      {currentCalories > 0 && (
        <div className="mt-5 p-3 rounded-xl bg-brand-50 border border-brand-100/50 flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/10 text-brand-700">
            <Award size={14} />
          </div>
          <p className="text-xs font-medium text-brand-800 leading-relaxed">
            Parabéns! Você já registrou {currentCalories} kcal hoje. Mantenha o equilíbrio nutricional e coma de forma consciente.
          </p>
        </div>
      )}
    </div>
  );
}
