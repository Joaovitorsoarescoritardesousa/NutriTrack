import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

let aiClient: GoogleGenAI | null = null;

// Lazy initialization of the Gemini API client
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase body size limit to handle base64 image uploads
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API Endpoints
  app.post("/api/nutrition", async (req, res): Promise<any> => {
    try {
      const { image, mimeType, notes } = req.body;

      if (!image) {
        return res.json({ 
          success: false, 
          error: "Por favor, envie uma foto do alimento." 
        });
      }

      // Check for Gemini API key first
      let ai;
      try {
        ai = getGeminiClient();
      } catch (err: any) {
        if (err.message === "GEMINI_API_KEY_MISSING") {
          return res.json({
            success: false,
            error: "A chave API do Gemini não foi encontrada no servidor.",
            needsKey: true,
            details: "Por favor, configure sua chave GEMINI_API_KEY no menu Settings > Secrets no Google AI Studio.",
            message: "Por favor, configure sua chave GEMINI_API_KEY no menu Settings > Secrets no Google AI Studio."
          });
        }
        throw err;
      }

      // Create parts for multimodal request
      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: image,
        },
      };

      const promptText = `Você é um nutricionista especialista altamente qualificado. Analise a imagem do alimento ou refeição fornecida. 
Calcule as calorias e os carboidratos na refeição como sua prioridade simples. Ofereça também uma estimativa de proteínas, gorduras e peso total aproximado de forma simplificada e direta.
${notes ? `Leve em consideração esta informação adicional fornecida pelo usuário: "${notes}"` : ""}
Sempre responda em Português no formato JSON estruturado conforme o esquema definido.`;

      const textPart = {
        text: promptText,
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction: "Você é um assistente profissional de nutrição. Sua principal tarefa é identificar pratos de comida a partir de fotos e estimar seu valor nutricional bruto (calorias, carboidratos, proteínas, gorduras, peso estimado e componentes) com a maior precisão possível com base na observação visual. Forneça o feedback em Português fluente, amigável e informativo.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              foodName: {
                type: Type.STRING,
                description: "O nome geral do prato de comida ou refeição identificada.",
              },
              calories: {
                type: Type.INTEGER,
                description: "Quantidade total estimada de calorias em quilocalorias (kcal).",
              },
              carbohydrates: {
                type: Type.NUMBER,
                description: "Quantidade estimada total de carboidratos em gramas (g).",
              },
              proteins: {
                type: Type.NUMBER,
                description: "Quantidade estimada total de proteínas em gramas (g).",
              },
              fats: {
                type: Type.NUMBER,
                description: "Quantidade estimada total de gorduras em gramas (g).",
              },
              estimatedWeightGrams: {
                type: Type.INTEGER,
                description: "Peso estimado estimado da refeição inteira em gramas (g).",
              },
              confidenceScore: {
                type: Type.NUMBER,
                description: "Nível de confiança da análise de 0.0 a 1.0 com base na visibilidade do prato.",
              },
              feedback: {
                type: Type.STRING,
                description: "Uma explicação curta (2 ou 3 frases) em português de forma construtiva e amigável sobre o perfil nutricional desta refeição e dicas de saúde.",
              },
              components: {
                type: Type.ARRAY,
                description: "Lista de ingredientes ou componentes identificados na imagem com quantidade aproximada.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Nome do ingrediente ou componente (Ex: Arroz, Feijão, Frango Grelhado).",
                    },
                    weightEstimateGrams: {
                      type: Type.INTEGER,
                      description: "Peso aproximado estimado deste componente em gramas.",
                    },
                    calories: {
                      type: Type.INTEGER,
                      description: "Calorias estimadas deste componente.",
                    },
                    carbohydrates: {
                      type: Type.NUMBER,
                      description: "Carboidratos estimados deste componente em gramas (g).",
                    },
                  },
                  required: ["name", "weightEstimateGrams", "calories", "carbohydrates"],
                },
              },
            },
            required: [
              "foodName",
              "calories",
              "carbohydrates",
              "proteins",
              "fats",
              "estimatedWeightGrams",
              "confidenceScore",
              "feedback",
              "components",
            ],
          },
        },
      });

      let responseText = response.text;
      if (!responseText) {
        throw new Error("Não foi possível gerar dados de análise nutricional para a imagem fornecida.");
      }

      // Strip markdown code block wrappers if modern SDK response has unexpected styling
      responseText = responseText.trim();
      if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      }

      const parsedNutrition = JSON.parse(responseText);
      return res.json({ success: true, data: parsedNutrition });

    } catch (error: any) {
      console.error("Erro no processamento da imagem de nutrição:", error);
      res.json({
        success: false,
        error: "Ocorreu um erro ao processar a imagem do alimento.",
        details: error.message || error,
      });
    }
  });

  // Serve static UI assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Nutrition Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
