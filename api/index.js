import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import cors from "cors";

dotenv.config();

const app = express();
const port = 3002;
const API_KEY = process.env.API_KEY;
// Enable CORS for requests from any origin
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// Initialize GoogleGenerativeAI
const genAI = new GoogleGenerativeAI("AIzaSyDCBLGlL3N5mZpArEuMdUkbR74m7is_uh8");
let model;

const schema = {
  description:
    "Query response containing better versions of the clinical question based on provided notes.",
  type: "object",
  properties: {
    originalQuestion: { type: "string" },
    clinicalNotes: { type: "string" },
    assessment: {
      type: "object",
      properties: {
        appropriate: {
          type: "boolean",
          description: "please return false is the question is not appropriate, An appropriate eCONSULT QUESTION:Is a focused clinical question that a specialist can answer without knowing the patient's entire history, Can be answered using information available in Epic, Is answerable within 3 business days without an in-person visit, Can be resolved in one Q&A exchange (one and done), Includes physical exam findings when relevant to the question  If the clinical notes reveal that an eConsult is inappropriate (urgent issue, complex case requiring in-person evaluation, etc.), set is_appropriate_for_econsult to false, provide the reason, and suggest alternatives6. DO NOT invent or assume any clinical details not present in either the original question or notes.  POOR: Patient with recurrent UTIs. Please advise on management. CLINICAL NOTES: 42F returns with dysuria and frequency x 3 days. This is her 4th UTI in 6 months, all previous cultures showed E. coli sensitive to nitrofurantoin. Previous UTIs resolved with treatment but recur, often after sexual activity. Renal ultrasound 4 months ago showed no structural abnormalities. Current urinalysis shows 3+ leukocyte esterase, nitrite positive. BETTER: 42-year-old female with 4 culture-confirmed E. coli UTIs in 6 months, each responsive to nitrofurantoin. Normal renal ultrasound 4 months ago. UTIs frequently occur after sexual activity. What prophylactic strategies would you recommend? Would post-coital antibiotics be appropriate given this pattern? WHY BETTER: Extracted pattern of infections, previous workup, identified triggers, and treatment history from notes to formulate a specific question about prophylaxis. EXAMPLE 3 - HEMATOLOGY: POOR: Patient with new anemia found on routine labs. Ordered iron studies and B12/folate. Results attached. Also did a hemoglobin electrophoresis. Patient denies bleeding but does have hemorrhoids. Also complains of joint pain and has a family history of lupus. Should we start iron? Should we check ANA or refer to rheumatology? Also wondering about colonoscopy given his age, though he had a normal one 7 years ago. CLINICAL NOTES: 58M presents with fatigue for 3 months, gradually worsening. Labs show Hgb 9.8 (down from 14.2 last year), MCV 82, WBC and platelets normal. GFR 85. No overt bleeding. No weight loss or night sweats. Iron studies: ferritin 18, TIBC 410, transferrin saturation 8%. B12 and folate normal. Occasional bright red blood per rectum with hemorrhoids visible on exam. BETTER: 58-year-old male with new microcytic anemia (Hgb 9.8, down from 14.2 last year, MCV 82) and iron deficiency (ferritin 18, transferrin saturation 8%). Patient reports 3 months of progressive fatigue and has hemorrhoids with occasional bright red blood per rectum. No other bleeding sources identified. Normal renal function. Is oral iron supplementation appropriate, and if so, what regimen would you recommend? At what hemoglobin threshold would you consider IV iron? Is colonoscopy indicated despite having a normal study 7 years ago? WHY BETTER: Focuses specifically on the anemia/iron deficiency and removes unrelated issues (joint pain, rheumatology questions). Organizes lab values clearly and asks specific treatment questions about iron replacement and GI workup that are directly related. EXAMPLE 4 - CARDIOLOGY: POOR: 65-year-old male with new murmur noted on exam. Also has fatigue, occasional palpitations after meals, and shortness of breath when walking upstairs. Echo shows moderate mitral regurgitation and mild LVH. His BP has been trending up despite being on lisinopril 10mg. Also has chronic stable angina. Would you recommend increasing lisinopril or adding another agent? Should we start him on a beta blocker for his palpitations? Is the mitral regurgitation related to his BP? What about his fatigue - should we check for anemia? When should he be referred for valve evaluation? Does he need a stress test for his angina? CLINICAL NOTES: 65M presents for follow-up. Physical exam reveals grade 3/6 holosystolic murmur best heard at apex. BP 148/92 despite lisinopril 10mg daily. Reports exertional dyspnea when climbing >1 flight of stairs, occasional palpitations after large meals. Echo from last week shows moderate mitral regurgitation, EF 55%, mild LVH. Stable angina well-controlled with PRN nitroglycerin (uses ~1-2x/month). Last stress test 3 years ago showed mild inferolateral ischemia. BETTER: 65-year-old male with newly documented moderate mitral regurgitation (EF 55%) and grade 3/6 holosystolic murmur at apex. Patient reports exertional dyspnea with stairs and has hypertension (148/92) despite lisinopril 10mg daily. Given his moderate mitral regurgitation and symptoms, what would be your recommended timing for cardiology referral? Should his hypertension management be adjusted in the interim given the valve findings? WHY BETTER: Focuses on the most clinically significant issue (new mitral regurgitation) and limits questions to two clearly related concerns (referral timing and BP management in context of valve disease). Removed multiple unrelated questions about palpitations, fatigue workup, and angina management that would make the eConsult too complex. Provided key clinical findings and current management but eliminated extraneous details. EXAMPLE 5 - CARDIOLOGY: POOR: 72-year-old with HTN, hyperlipidemia, and stage 2 CKD presenting with fatigue and dyspnea on exertion. Echo shows EF 45% and mild diastolic dysfunction. Also found to have atrial fibrillation on today's ECG. Need advice on starting beta blocker, when to refer for cardioversion, if we need cardiac catheterization, should we start anticoagulation and which one, appropriate BP targets given CKD, and whether current statin dose is adequate. Also wondering about sleep study since patient reports poor sleep. CLINICAL NOTES: 72M with PMH of HTN (on lisinopril 20mg daily), hyperlipidemia (on atorvastatin 20mg), CKD stage 2 (eGFR 68). Presents with 2 months of progressive fatigue and dyspnea with moderate exertion. BP today 148/92. HR irregular at 92 bpm. ECG shows atrial fibrillation with controlled ventricular response. Recent echo shows EF 45%, mild LVH, mild diastolic dysfunction. No prior history of stroke/TIA. CHA₂DS₂-VASc score of 3 (age, HTN, HF). LDL 105 on current statin. No peripheral edema. Previously active, now limited by symptoms. BETTER: 72-year-old male with newly diagnosed atrial fibrillation and reduced EF (45%) on echo. History of HTN, hyperlipidemia, and CKD stage 2 (eGFR 68). No prior stroke/TIA. CHA₂DS₂-VASc score of 3. What would be your recommendation regarding: 1) Anticoagulation selection given his risk factors and reduced renal function, and 2) Rate control strategy before considering referral for rhythm control evaluation? WHY BETTER: Focuses on the two most urgent/important clinical questions (anticoagulation and rate control for new atrial fibrillation) rather than including multiple unrelated issues (sleep study, statin adjustment, BP targets). Provides relevant clinical context (CHA₂DS₂-VASc score, renal function) needed to answer these specific questions. The sleep concerns, statin adjustment, and long-term heart failure management would be more appropriate for separate eConsults or referrals after the immediate AFib management is addressed. INSTRUCTIONS: 1. Carefully read both the PCP's original question and the provided clinical notes 2. Extract relevant clinical information from the notes that would help a specialist answer the question 3. Assess if the question is appropriate for eConsult based on guidelines 4. Generate three improved variations that: - Incorporate key clinical details from the notes (demographics, relevant labs, symptoms, etc.) - Frame a focused clinical question - Specify what guidance the PCP is seeking (diagnosis, treatment, workup, etc.) - Are concise yet complete 5. If the clinical notes reveal that an eConsult is inappropriate (urgent issue, complex case requiring in-person evaluation, etc.), set is_appropriate_for_econsult to false, provide the reason, and suggest alternatives 6. DO NOT invent or assume any clinical details not present in either the original question or notes 7. Always provide exactly three suggested question improvements in the specified format",
          nullable: false,
        },
        reason: {
          type: "string",
          description:
            "Reason why the original question is not appropriate for an eConsult if it's not appropriate",
          nullable: true,
        },
        missingKeyInfo: {
          type: "array",
          description:
            "Extract at least 2 relevant clinical details from clinical notes",
          items: { type: "string" },
          nullable: true,
        },
      },
      required: ["appropriate", "reason", "missingKeyInfo"],
    },
    suggestions: {
      type: "array",
      description:
        "If it is an appropriate clinical question the sugessions are not required, You are an expert clinical physician who helps primary care physicians formulate effective eConsult questions. When a PCP provides both their initial question and clinical notes, you'll analyze them together to suggest improved, focused questions that specialists can efficiently answer.When analyzing the question and notes, follow these Stanford eConsult guidelines. eCONSULT SHOULD NOT BE:- Too complex for a virtual consultation- Too many questions to reasonably address in one response- For established patients of the specialty service- Missing critical information (e.g., relevant labs)- For patients seen by the specialty in the past/next 14 days- Seeking a second opinion (use referral instead)- Urgent (eConsults take up to 3 business days)- Attempting to fast-track a referral- Asking logistical rather than clinical questionsINSTRUCTIONS:1. Carefully read both the PCP's original question and the provided clinical notes2. Extract relevant clinical information from the notes that would help a specialist answer the question3. Assess if the question is appropriate for eConsult based on guidelines4. Generate three improved variations that:   - Incorporate key clinical details from the notes (demographics, relevant labs, symptoms, etc.)   - Frame a focused clinical question   - Specify what guidance the PCP is seeking (diagnosis, treatment, workup, etc.)   - Are concise yet complete5. If the clinical notes reveal that an eConsult is inappropriate (urgent issue, complex case requiring in-person evaluation, etc.), set is_appropriate_for_econsult to false, provide the reason, and suggest alternatives6. DO NOT invent or assume any clinical details not present in either the original question or notes. Always provide exactly two or three suggested question improvements in the specified formatImportant: Return only valid JSON without any additional text, comments, or formatting please return false is the question is not appropriate, An appropriate eCONSULT QUESTION:Is a focused clinical question that a specialist can answer without knowing the patient's entire history, Can be answered using information available in Epic, Is answerable within 3 business days without an in-person visit, Can be resolved in one Q&A exchange (one and done), Includes physical exam findings when relevant to the question  If the clinical notes reveal that an eConsult is inappropriate (urgent issue, complex case requiring in-person evaluation, etc.), set is_appropriate_for_econsult to false, provide the reason, and suggest alternatives6. DO NOT invent or assume any clinical details not present in either the original question or notes.  POOR: Patient with recurrent UTIs. Please advise on management. CLINICAL NOTES: 42F returns with dysuria and frequency x 3 days. This is her 4th UTI in 6 months, all previous cultures showed E. coli sensitive to nitrofurantoin. Previous UTIs resolved with treatment but recur, often after sexual activity. Renal ultrasound 4 months ago showed no structural abnormalities. Current urinalysis shows 3+ leukocyte esterase, nitrite positive. BETTER: 42-year-old female with 4 culture-confirmed E. coli UTIs in 6 months, each responsive to nitrofurantoin. Normal renal ultrasound 4 months ago. UTIs frequently occur after sexual activity. What prophylactic strategies would you recommend? Would post-coital antibiotics be appropriate given this pattern? WHY BETTER: Extracted pattern of infections, previous workup, identified triggers, and treatment history from notes to formulate a specific question about prophylaxis. EXAMPLE 3 - HEMATOLOGY: POOR: Patient with new anemia found on routine labs. Ordered iron studies and B12/folate. Results attached. Also did a hemoglobin electrophoresis. Patient denies bleeding but does have hemorrhoids. Also complains of joint pain and has a family history of lupus. Should we start iron? Should we check ANA or refer to rheumatology? Also wondering about colonoscopy given his age, though he had a normal one 7 years ago. CLINICAL NOTES: 58M presents with fatigue for 3 months, gradually worsening. Labs show Hgb 9.8 (down from 14.2 last year), MCV 82, WBC and platelets normal. GFR 85. No overt bleeding. No weight loss or night sweats. Iron studies: ferritin 18, TIBC 410, transferrin saturation 8%. B12 and folate normal. Occasional bright red blood per rectum with hemorrhoids visible on exam. BETTER: 58-year-old male with new microcytic anemia (Hgb 9.8, down from 14.2 last year, MCV 82) and iron deficiency (ferritin 18, transferrin saturation 8%). Patient reports 3 months of progressive fatigue and has hemorrhoids with occasional bright red blood per rectum. No other bleeding sources identified. Normal renal function. Is oral iron supplementation appropriate, and if so, what regimen would you recommend? At what hemoglobin threshold would you consider IV iron? Is colonoscopy indicated despite having a normal study 7 years ago? WHY BETTER: Focuses specifically on the anemia/iron deficiency and removes unrelated issues (joint pain, rheumatology questions). Organizes lab values clearly and asks specific treatment questions about iron replacement and GI workup that are directly related. EXAMPLE 4 - CARDIOLOGY: POOR: 65-year-old male with new murmur noted on exam. Also has fatigue, occasional palpitations after meals, and shortness of breath when walking upstairs. Echo shows moderate mitral regurgitation and mild LVH. His BP has been trending up despite being on lisinopril 10mg. Also has chronic stable angina. Would you recommend increasing lisinopril or adding another agent? Should we start him on a beta blocker for his palpitations? Is the mitral regurgitation related to his BP? What about his fatigue - should we check for anemia? When should he be referred for valve evaluation? Does he need a stress test for his angina? CLINICAL NOTES: 65M presents for follow-up. Physical exam reveals grade 3/6 holosystolic murmur best heard at apex. BP 148/92 despite lisinopril 10mg daily. Reports exertional dyspnea when climbing >1 flight of stairs, occasional palpitations after large meals. Echo from last week shows moderate mitral regurgitation, EF 55%, mild LVH. Stable angina well-controlled with PRN nitroglycerin (uses ~1-2x/month). Last stress test 3 years ago showed mild inferolateral ischemia. BETTER: 65-year-old male with newly documented moderate mitral regurgitation (EF 55%) and grade 3/6 holosystolic murmur at apex. Patient reports exertional dyspnea with stairs and has hypertension (148/92) despite lisinopril 10mg daily. Given his moderate mitral regurgitation and symptoms, what would be your recommended timing for cardiology referral? Should his hypertension management be adjusted in the interim given the valve findings? WHY BETTER: Focuses on the most clinically significant issue (new mitral regurgitation) and limits questions to two clearly related concerns (referral timing and BP management in context of valve disease). Removed multiple unrelated questions about palpitations, fatigue workup, and angina management that would make the eConsult too complex. Provided key clinical findings and current management but eliminated extraneous details. EXAMPLE 5 - CARDIOLOGY: POOR: 72-year-old with HTN, hyperlipidemia, and stage 2 CKD presenting with fatigue and dyspnea on exertion. Echo shows EF 45% and mild diastolic dysfunction. Also found to have atrial fibrillation on today's ECG. Need advice on starting beta blocker, when to refer for cardioversion, if we need cardiac catheterization, should we start anticoagulation and which one, appropriate BP targets given CKD, and whether current statin dose is adequate. Also wondering about sleep study since patient reports poor sleep. CLINICAL NOTES: 72M with PMH of HTN (on lisinopril 20mg daily), hyperlipidemia (on atorvastatin 20mg), CKD stage 2 (eGFR 68). Presents with 2 months of progressive fatigue and dyspnea with moderate exertion. BP today 148/92. HR irregular at 92 bpm. ECG shows atrial fibrillation with controlled ventricular response. Recent echo shows EF 45%, mild LVH, mild diastolic dysfunction. No prior history of stroke/TIA. CHA₂DS₂-VASc score of 3 (age, HTN, HF). LDL 105 on current statin. No peripheral edema. Previously active, now limited by symptoms. BETTER: 72-year-old male with newly diagnosed atrial fibrillation and reduced EF (45%) on echo. History of HTN, hyperlipidemia, and CKD stage 2 (eGFR 68). No prior stroke/TIA. CHA₂DS₂-VASc score of 3. What would be your recommendation regarding: 1) Anticoagulation selection given his risk factors and reduced renal function, and 2) Rate control strategy before considering referral for rhythm control evaluation? WHY BETTER: Focuses on the two most urgent/important clinical questions (anticoagulation and rate control for new atrial fibrillation) rather than including multiple unrelated issues (sleep study, statin adjustment, BP targets). Provides relevant clinical context (CHA₂DS₂-VASc score, renal function) needed to answer these specific questions. The sleep concerns, statin adjustment, and long-term heart failure management would be more appropriate for separate eConsults or referrals after the immediate AFib management is addressed. INSTRUCTIONS: 1. Carefully read both the PCP's original question and the provided clinical notes 2. Extract relevant clinical information from the notes that would help a specialist answer the question 3. Assess if the question is appropriate for eConsult based on guidelines 4. Generate three improved variations that: - Incorporate key clinical details from the notes (demographics, relevant labs, symptoms, etc.) - Frame a focused clinical question - Specify what guidance the PCP is seeking (diagnosis, treatment, workup, etc.) - Are concise yet complete 5. If the clinical notes reveal that an eConsult is inappropriate (urgent issue, complex case requiring in-person evaluation, etc.), set is_appropriate_for_econsult to false, provide the reason, and suggest alternatives 6. DO NOT invent or assume any clinical details not present in either the original question or notes 7. Always provide exactly three suggested question improvements in the specified format",
      items: { type: "string" },
      nullable: true,
    },
  },
  required: ["originalQuestion", "clinicalNotes", "assessment"],
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

app.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

app.post("/suggestions", async (req, res) => {
  const { clinicalQuestion, clinicalNotes } = req.body;

  if (!clinicalQuestion || !clinicalNotes) {
    return res
      .status(400)
      .send({ error: "Both clinicalQuestion and clinicalNotes are required." });
  }
  if (!model) {
    return res.status(500).send({ error: "Model is not initialized." });
  }

  try {
    // Generate suggestions using the model
    const result = await model.generateContent([
      `Clinical Question: ${clinicalQuestion}\nClinical Notes: ${clinicalNotes}`,
    ]);
    // Parse and format the response
    const response = await result.response;
    const text = await response.text();
    const suggestions = JSON.parse(text);
    res.send(suggestions);
  } catch (error) {
    console.error("Error querying model:", error);
    res.status(500).send({ error: "Failed to process the query." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API server is running at http://localhost:${port}`);
});
