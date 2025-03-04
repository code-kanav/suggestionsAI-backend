import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import cors from 'cors'; 


dotenv.config();

const app = express();
const port = 3001;
const API_KEY = process.env.API_KEY;
// Enable CORS for requests from any origin
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// Initialize GoogleGenerativeAI
const genAI = new GoogleGenerativeAI("AIzaSyDCBLGlL3N5mZpArEuMdUkbR74m7is_uh8");
let model;

const schema = {
  description: "Query response containing better versions of the clinical question based on provided notes.",
  type: "object",
  properties: {
      originalQuestion: { type: "string" },
      clinicalNotes: { type: "string" },
      assessment: {
        type: "object",
        properties: {
          appropriate: { 
            type: "boolean",
            description: "Whether the original question is related to medial care if not please return false",
            nullable: false
          },
          reason: {
            type: "string",
            description: "Reason why the original question is not appropriate for an eConsult if it's not appropriate",
            nullable: true
          },
          missingKeyInfo: {
            type: "array",
            description: "Extract at least 2 relevant clinical details from clinical notes",
            items: { type: "string" },
            nullable: true
          }
        },
        required: ["appropriate", "reason", "missingKeyInfo"]
      },
      suggestions: {
          type: "array",
          description: "You are an expert clinical physician who helps primary care physicians formulate effective eConsult questions. When a PCP provides both their initial question and clinical notes, you'll analyze them together to suggest improved, focused questions that specialists can efficiently answer. Suggest at least 3 improved versions of the question",
          items: { type: "string" },
          nullable: false
      },
  },
  required: ["originalQuestion", "clinicalNotes", "assessment", "suggestions"]
};

// Function to initialize the model
async function initializeModel() {
    try {
        model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        console.log("Model initialized successfully.");
    } catch (error) {
        console.error("Error initializing model:", error);
    }
}

initializeModel();

app.get('/', (req, res) => {
    res.send('Welcome to the API!');
});

app.post('/suggestions', async (req, res) => {
    const { clinicalQuestion, clinicalNotes } = req.body;
    
    if (!clinicalQuestion || !clinicalNotes) {
        return res.status(400).send({ error: 'Both clinicalQuestion and clinicalNotes are required.' });
    }
    if (!model) {
        return res.status(500).send({ error: 'Model is not initialized.' });
    }

    try {
        // Generate suggestions using the model
        const result = await model.generateContent([`Clinical Question: ${clinicalQuestion}\nClinical Notes: ${clinicalNotes}`]);
        // Parse and format the response
        const response = await result.response;
        const text = await response.text();
        const suggestions = JSON.parse(text);
        res.send(suggestions);
    } catch (error) {
        console.error('Error querying model:', error);
        res.status(500).send({ error: 'Failed to process the query.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`API server is running at http://localhost:${port}`);
});
