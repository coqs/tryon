import * as fs from "fs"
import path from "path"
import { GoogleGenAI, Modality } from "@google/genai"
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3125;
app.use(express.json({ limit: "25mb" }))
app.use(cors({
    "origin": "http://localhost:3000"
}))

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storageFolder = path.join(__dirname, "storage");
const tryonImagesFolder = path.join(storageFolder, "tryonimgs")
const bodyImagesFolder = path.join(storageFolder, "bodyimgs")
const clothingImagesFolder = path.join(storageFolder, "clothingimgs")
const bodyImagesJSON = path.join(storageFolder, "bodyimgs.json")
const clothingImagesJSON = path.join(storageFolder, "clothingimgs.json")
const API_Keys_TXT = path.join(storageFolder, "api_keys.txt");


const getCurrentIndex = async (type) => {
    if (type === "bodyimgs") {
        const unparsed = await fs.promises.readFile(bodyImagesJSON);
        const parsed = JSON.parse(unparsed);
        return parsed.length;
    } else if (type === "clothingimgs") {
        const unparsed = await fs.promises.readFile(clothingImagesJSON);
        const parsed = JSON.parse(unparsed);
        return parsed.length;
    } else if (type === "apikeys") {
        const unparsed = await fs.promises.readFile(API_Keys_TXT);
        const parsed = JSON.parse(unparsed);
        return parsed.length;
    }
}

const addToList = async (type, data) => {
    if (type === "bodyimgs") {
        const unparsed = await fs.promises.readFile(bodyImagesJSON);
        const parsed = JSON.parse(unparsed);
        parsed.push(data);
        await fs.promises.writeFile(bodyImagesJSON, JSON.stringify(parsed, null, 2));
        
    } else if (type === "clothingimgs") {
        const unparsed = await fs.promises.readFile(clothingImagesJSON);
        const parsed = JSON.parse(unparsed);
        parsed.push(data);
        await fs.promises.writeFile(clothingImagesJSON, JSON.stringify(parsed, null, 2));
    } else if (type === "apikeys") {
        const unparsed = await fs.promises.readFile(API_Keys_TXT);
        const parsed = JSON.parse(unparsed);
        parsed.push(data);
        await fs.promises.writeFile(API_Keys_TXT, JSON.stringify(parsed, null, 2));
    }
}

const convertBase64ToImage = async (type, Base64String) => {

    let Base64Data = Base64String.split(',')[1];
    let imageBuffer = Buffer.from(Base64Data, 'base64');
    
    if (type === "bodyimgs") {
        await addToList("bodyimgs", imageBuffer);
        let fileIndex = await getCurrentIndex("bodyimgs");
        await fs.promises.writeFile(path.join(bodyImagesFolder, `${fileIndex}.jpeg`), imageBuffer);
        return `${fileIndex}.jpeg`;
    } else if (type === "clothingimgs") {
        await addToList("clothingimgs", imageBuffer);
        let fileIndex = await getCurrentIndex("clothingimgs");
        await fs.promises.writeFile(path.join(clothingImagesFolder, `${fileIndex}.jpeg`), imageBuffer);
        return `${fileIndex}.jpeg`;
    }

}


const convertToTryon =  async (bodyBase64String, clothingBase64String, GeminiAPIKey) => {

    let currentIndex = await getCurrentIndex("bodyimgs");
    
    let BI_NAME = await convertBase64ToImage("bodyimgs", bodyBase64String);
    let CI_NAME = await convertBase64ToImage("clothingimgs", clothingBase64String);

    let BI_FILE_LOCATION = path.join(bodyImagesFolder, BI_NAME);
    let CI_FILE_LOCATION = path.join(clothingImagesFolder, CI_NAME);
    let standingPose_FILE_LOCATION = path.join(storageFolder, "standingPose.png");

    //GEMINI

    const ai = new GoogleGenAI({ apiKey: GeminiAPIKey });

    const BI_imageData = fs.readFileSync(BI_FILE_LOCATION);
    const BI_imageDataString = BI_imageData.toString("base64");

    const CI_imageData = fs.readFileSync(CI_FILE_LOCATION);
    const CI_imageDataString = CI_imageData.toString("base64");

    const SI_imageData = fs.readFileSync(standingPose_FILE_LOCATION);
    const SI_imageDataString = SI_imageData.toString("base64");

  const prompt = [
    { text: "Place the clothing item from the second image onto the person in the first image, making it appear as if they are wearing it naturally. The background should be completely white with a gradual grey point or a fade so the user could see in detail, and the output body should be a natural standing pose; the natural pose should look like the third image, if there are no pockets to put hands in, then just don't put the hands in, try to make the body fit the image resolution as much as possible and upscale it until it fits just right, make sure the body is in the center of the image. If there are any watermarks in the final result, Remove Them/It" },
    {
      inlineData: {
        mimeType: "image/png",
        data: BI_imageDataString,
      },
    },
    {
      inlineData: {
        mimeType: "image/png",
        data: CI_imageDataString,
      },
    },
    {
      inlineData: {
        mimeType: "image/png",
        data: SI_imageDataString,
      },
    }
  ];
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: prompt,
    });
    for (const part of response.candidates[0].content.parts) {
        if (part.text) {
            console.log(part.text);
        } else if (part.inlineData) {
            const imageData = part.inlineData.data;
            const buffer = Buffer.from(imageData, "base64");
            fs.writeFileSync(path.join(tryonImagesFolder, `${currentIndex}.jpeg`), buffer);
            console.log("saved Image");
        }
    }

}

const clearUserUsage = async (index) => {

    //image files
    const bodyIMGpath = path.join(bodyImagesFolder, `${index}.jpeg`)
    const clothingIMGpath = path.join(clothingImagesFolder, `${index}.jpeg`)

    //JSON data
    let unparsed_bi = await fs.promises.readFile(bodyImagesJSON);
    let unparsed_ci = await fs.promises.readFile(clothingImagesJSON);

    let parsed_bi = JSON.parse(unparsed_bi);
    let parsed_ci = JSON.parse(unparsed_ci);

    //delete image files
    await fs.promises.unlink(bodyIMGpath);
    await fs.promises.unlink(clothingIMGpath);

    //delete JSON parts
    parsed_bi.splice(index - 1, 1);
    parsed_ci.splice(index - 1, 1);

    //save JSON (push back the updated data)
    await fs.promises.writeFile(bodyImagesJSON, JSON.stringify(parsed_bi, null, 2));
    await fs.promises.writeFile(clothingImagesJSON, JSON.stringify(parsed_ci, null, 2));

}

app.post("/tryon", async (req, res) => {
    let BI_B64 = req.body.body // body image base64
    let CI_B64 = req.body.cloth // clothing item/image base64
    let GAK = req.body.apiKey //gemini api key

    await convertToTryon(BI_B64, CI_B64, GAK);

    res.status(200);
    res.send({
        "message": "success"
    })

    //after finishing the tryon, clean!
    let currentIndex = await getCurrentIndex("bodyimgs"); // for clearUserUsage, dosent matter if its bodyimgs or clothingimgs because after all theyre gonna be the same
    await clearUserUsage(currentIndex);

})

app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

