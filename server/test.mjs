import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================================================================
// !!! DANGER !!!
// Hardcoding your API key like this is NOT secure.
// Replace with your NEW, non-leaked API key.
const API_KEY = "AIzaSyDhSB0XDkJC9pviOfdo7Ta-_dHYrt5PhZo";
// ===================================================================

async function main() {
  try {
    // Initialize AI
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const imagePath = path.join(__dirname, "image.jpg");
    if (!fs.existsSync(imagePath)) {
      console.error(`Error: Image not found at path: ${imagePath}`);
      return;
    }

    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString("base64");

    const prompt = [
      { text: "change the background to be night time and make it snow" },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
    ];

    console.log("Sending request to Gemini API...");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: prompt,
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        const outputPath = path.join(__dirname, "output-image.jpeg");
        fs.writeFileSync(outputPath, buffer);
        console.log(`Success! Image saved as ${outputPath}`);
      } else if (part.text) {
        console.log("Model output text:", part.text);
      }
    }

  } catch (error) {
    console.error("An error occurred while calling the Gemini API:", error);
  }
}

main();
