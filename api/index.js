import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI,SchemaType } from '@google/generative-ai';
import cors from 'cors'; 

dotenv.config();

const app = express();
const port = 3001;
// Enable CORS for requests from localhost:3001
app.use(cors({
    origin: '*',  // Allow requests from this origin
    methods: ['GET', 'POST'],  // Allow specific HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'],  // Allow specific headers
    credentials: true,  // Allow cookies to be sent with the request (if needed)
}));

// Parse JSON bodies
app.use(express.json());

// Initialize GoogleGenerativeAI
const genAI = new GoogleGenerativeAI("AIzaSyDPsegQ5rz_pUnX_OD9-Jf2Ge6OgbFoJsM");
let model;


const schema = {
  description: "Query response containing better versions of the question which was input",
  type: "object",
  properties: {
      originalQuery: { type: "string" },
      suggestions: {
          type: "array",
          description: "you are an expert e consult physician and specialist. given this PCP query, please suggest atleast 3 alternate better versions of the question that is more well defined, and will lead to a better specialist response.",
          items: { type: "string" },
          nullable: false
      },
  },
  required: ["originalQuery", "suggestions"]
};

// Function to initialize the model
async function initializeModel() {
    try {
        model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
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
  const { input } = req.body;
  if (!input) {
      return res.status(400).send({ error: 'input is required.' });
  }
  if (!model) {
      return res.status(500).send({ error: 'Model is not initialized.' });
  }

  try {
      // Generate suggestions using the model
      const result = await model.generateContent(input);
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
