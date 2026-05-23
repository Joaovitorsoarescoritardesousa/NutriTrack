import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nutritionHandler from "./api/nutrition";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase body size limit to handle base64 image uploads
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API Endpoints
  app.post("/api/nutrition", nutritionHandler);

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
