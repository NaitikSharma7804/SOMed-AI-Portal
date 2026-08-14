const OpenAI = require('openai');

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const analyzeADRWithAI = async (medicineName, symptoms) => {
  try {
    const prompt = `
      You are an expert clinical pharmacovigilance AI. 
      Analyze the following adverse drug reaction report:
      - Medicine Name: "${medicineName}"
      - Symptoms: "${symptoms}"

      Provide a response strictly in valid JSON format with no markdown formatting or backticks, containing two keys:
      1. "category": Must be strictly one of ["AYURVEDA", "SIDDHA", "UNANI", "HOMEOPATHY", "ALLOPATHY"] based on the medicine name.
      2. "severity": Must be strictly one of ["LOW", "MEDIUM", "HIGH", "CRITICAL"] based on the severity of the symptoms.
    `;

    const completion = await openai.chat.completions.create({
      model: 'google/gemma-4-26b-a4b-it:free',
      messages: [{ role: 'user', content: prompt }],
    });

    let textResponse = completion.choices[0].message.content.trim();
    // Clean up markdown code blocks if the model includes them
    textResponse = textResponse.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

    const analysis = JSON.parse(textResponse);
    return analysis;
  } catch (error) {
    console.error('OpenRouter AI Analysis Error:', error);
    return { category: 'ALLOPATHY', severity: 'MEDIUM' };
  }
};

module.exports = { analyzeADRWithAI };