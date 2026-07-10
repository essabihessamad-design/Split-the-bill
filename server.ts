import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize the Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON bodies up to 10MB to accommodate high-res image uploads
  app.use(express.json({ limit: "10mb" }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // OCR and receipt extraction endpoint
  app.post("/api/scan-receipt", async (req, res) => {
    try {
      let base64Data = req.body.image;
      let mimeType = req.body.mimeType || "image/jpeg";

      if (!base64Data) {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Handle Data URLs if sent
      if (base64Data.includes(";base64,")) {
        const parts = base64Data.split(";base64,");
        const match = parts[0].match(/data:(image\/[a-zA-Z+.-]+)/);
        if (match) {
          mimeType = match[1];
        }
        base64Data = parts[1];
      }

      // Prepare payload parts for the Gemini API
      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const textPart = {
        text: `Analyze the attached receipt image and extract:
1. Store Name (as 'store', string) - use standard language of the receipt.
2. Date of transaction (as 'date', string) - use readable date format, e.g., 'YYYY-MM-DD' or as written.
3. List of items (as 'items', array of objects). For each item:
   - 'name' (string) - the item description. Keep it concise.
   - 'price' (number) - the individual unit or line-item price. Ensure it is a number.
4. Total amount paid (as 'total', number) - the overall total from the receipt.
5. Currency code used (as 'currency', string, e.g., 'MAD', 'USD', 'EUR'). If the receipt mentions MAD, Dirham, MD, Dhs, or is in Morocco, currency MUST be 'MAD'. Otherwise extract the correct code. Default to 'MAD' if not found.

Return strictly the parsed result as valid JSON matching the schema. If some fields are unclear or missing, make a best estimate but keep the structure intact. Ensure all prices and totals are parsed as numbers.`,
      };

      // Call Gemini 3.5-flash for fast and precise OCR + Structured data extraction
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              store: { 
                type: Type.STRING,
                description: "Name of the store, supermarket or restaurant."
              },
              date: { 
                type: Type.STRING,
                description: "Transaction date."
              },
              currency: { 
                type: Type.STRING,
                description: "ISO currency code, e.g., MAD, USD, EUR."
              },
              total: { 
                type: Type.NUMBER,
                description: "Total amount on the receipt."
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                  },
                  required: ["name", "price"],
                },
                description: "Extracted line items from the receipt."
              },
            },
            required: ["store", "items", "total"],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response received from the AI model.");
      }

      const parsedData = JSON.parse(text.trim());
      return res.json(parsedData);
    } catch (error: any) {
      console.error("OCR Scanning Error:", error);
      return res.status(500).json({
        error: "الصورة غير واضحة، حاول مرة ثانية",
        details: error.message || "Unknown scanner error"
      });
    }
  });

  // Mount Vite middleware for development or serve built assets in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
