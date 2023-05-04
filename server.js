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

    const basePrompt =
      "Actua como si fueras un abogado con mucha experiencia en derecho Mexicano. Enlista los puntos más relevantes del documento, recuerda devolverlos en formato de lista para tener mayor legibilidad. Explica cada punto como si tuviera 10 años,también explícame cuáles serían mis obligaciones si firmara ese contrato y cuáles serían las obligaciones de la otra parte. Dime si encuentras algo que pudiera resultarme muy perjudicial si firmara. Si encuentras conceptos dificiles de comprender para mi que no soy abogado, explicame qué significan";

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
