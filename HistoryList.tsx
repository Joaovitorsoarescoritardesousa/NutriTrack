import React from "react";
import { Clock, Trash2, ArrowUpRight, Flame, Carrot, CalendarDays } from "lucide-react";
import { AnalysisHistoryItem } from "../types";
import { motion } from "motion/react";

interface HistoryListProps {
  items: AnalysisHistoryItem[];
  onSelect: (item: AnalysisHistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  selectedId?: string;
}

export default function HistoryList({
  items,
  onSelect,
  onDelete,
  onClearAll,
  selectedId,
}: HistoryListProps) {
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " - " + date.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "Data desconhecida";
    }
  };

  return (
    <div id="history-container" className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4 shrink-0">
        <div>
          <h3 className="font-display font-bold text-stone-800 text-base">Últimas Análises</h3>
          <p className="text-xs text-stone-500">Histórico de pratos processados</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Deseja realmente limpar todo o histórico de pratos?")) {
                onClearAll();
              }
            }}
            className="text-[11px] font-semibold text-stone-400 hover:text-red-500 transition-colors"
          >
            Limpar Tudo
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
          <CalendarDays size={32} className="text-stone-300 mb-3" />
          <h4 className="font-display font-semibold text-stone-700 text-sm">Nenhum prato analisado</h4>
          <p className="text-xs text-stone-400 mt-1 max-w-[200px] leading-relaxed">
            As fotos que você tirar ou subir ficarão salvas no histórico local para consulta rápida.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[480px] lg:max-h-[580px] scrollbar-thin">
          {items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => onSelect(item)}
                className={`group relative flex gap-3 rounded-2xl border p-3 cursor-pointer transition-all ${
                  isSelected
                    ? "border-brand-500 bg-brand-50/40 shadow-2xs"
                    : "border-stone-100 bg-stone-50/40 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                {/* Image Thumb */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200">
                  <img
                    src={`data:image/jpeg;base64,${item.image}`}
                    alt={item.nutritionData.foodName}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Info summary */}
                <div className="flex-1 min-w-0 pr-6">
                  <h4 className="font-semibold text-stone-800 text-xs sm:text-sm truncate capitalize mb-0.5">
                    {item.nutritionData.foodName}
                  </h4>
                  <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1 mb-1.5">
                    <Clock size={10} />
                    {formatDate(item.timestamp)}
                  </p>

                  {/* Tiny capsules */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 border border-amber-100">
                      <Flame size={8} /> {item.nutritionData.calories} kcal
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-100">
                      <Carrot size={8} /> {item.nutritionData.carbohydrates}g carb
                    </span>
                  </div>
                </div>

                {/* Trash & navigation button HUD */}
                <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => onDelete(item.id, e)}
                    className="rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-500 transition-all"
                    title="Excluir do histórico"
                  >
                    <Trash2 size={13} />
                  </button>
                  <span className="rounded-lg p-1 text-stone-400">
                    <ArrowUpRight size={13} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
