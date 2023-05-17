const express = require("express");
const dotenv = require("dotenv");
const Tesseract = require("tesseract.js");
const { Configuration, OpenAIApi } = require("openai");
const multer = require("multer");
const cors = require("cors");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/process-image", upload.array("image", 10), async (req, res) => {
  try {
    const files = req.files;
    let results = [];

    for (const file of files) {
      const { buffer, mimetype } = file;
      const result = await Tesseract.recognize(buffer, "spa", { mime: mimetype });
      results.push(result.data.text);
    }

    const combinedText = results.join("\n");
    const apiKey =  process.env.CHATGPT_API_KEY;
    const configuration = new Configuration({ apiKey });
    const openai = new OpenAIApi(configuration);

    const basePrompt = `Realiza las siguientes acciones:
1 - Eres un abogado con mucha experiencia en derecho mexicano.
2. Explica cada punto como si yo tuviera 10 años.
3. Explica mis obligaciones si firmara este contrato
4. Explica las obligaciones de la contraparte
5. Explica los conceptos que puedan ser díficiles de entender para una persona que no es abogada. 

Devuelve tus respuestas en formato de lista.`;

    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: basePrompt + combinedText,
      max_tokens: 1200,
      temperature: 0.3,
    });

    const responseText = completion.data.choices[0].text;
    const regex = /\d+\.\s/g;
    const splitString = responseText.split(regex);
    const parsedResponse = splitString.filter((item) => item !== "");

    res.status(200).json({ response: parsedResponse });
  } catch (error) {
    console.error("Error al procesar la imagen:", error);
    res.status(500).json({ error: "Error al procesar la imagen." });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
