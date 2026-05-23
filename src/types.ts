export interface FoodComponent {
  name: string;
  weightEstimateGrams: number;
  calories: number;
  carbohydrates: number;
}

export interface NutritionData {
  foodName: string;
  calories: number;
  carbohydrates: number;
  proteins: number;
  fats: number;
  estimatedWeightGrams: number;
  confidenceScore: number;
  feedback: string;
  components: FoodComponent[];
}

export interface AnalysisHistoryItem {
  id: string;
  timestamp: string; // ISO String
  image: string; // base64 representation of analyzed image
  notes?: string;
  nutritionData: NutritionData;
}
