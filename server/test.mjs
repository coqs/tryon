// Import the necessary libraries
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

// The main function to run the image generation
async function generateImage() {

  try {
    // Initialize the Google GenAI client
    const ai = new GoogleGenAI({ apiKey: "AIzaSyBgutnQ5EDgXdIOJEkJkaePgY1BVuSibf0" });

    // Define your prompt for the image
    const prompt = "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme.";

    console.log(`Generating image for prompt: "${prompt}"...`);
    console.log("This may take a moment.");

    // Call the model to generate content
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: prompt,
    });
    
    // Check if the model returned a valid response with candidates
    const candidate = response?.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      console.error("Error: Invalid response structure from the API.");
      // Log the full response to help with debugging
      console.error("Full API Response:", JSON.stringify(response, null, 2));
      return;
    }

    // Find the part of the response that contains image data
    const imagePart = candidate.content.parts.find(part => part.inlineData);

    if (imagePart && imagePart.inlineData) {
      // Get the base64 encoded image data
      const imageData = imagePart.inlineData.data;
      // Convert the base64 data into a buffer that can be written to a file
      const buffer = Buffer.from(imageData, "base64");
      const fileName = "generated-image.png";
      
      // Write the buffer to a file
      fs.writeFileSync(fileName, buffer);
      console.log(`✅ Image successfully saved as ${fileName}`);
    } else {
      console.error("❌ No image data was found in the API response.");
      // If there's any text (like an error or explanation from the model), print it
      const textPart = candidate.content.parts.find(part => part.text);
      if (textPart) {
          console.log("Text from model:", textPart.text);
      }
    }

  } catch (error) {
    console.error("An error occurred during the image generation process:", error);
  }
}

// Run the main function
generateImage();