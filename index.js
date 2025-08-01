const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
const pdfParse = require('pdf-parse');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });
const API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

// ⬇️ UPLOAD ROUTE: Extract text from PDF and return it
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    const file = req.file;
    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(dataBuffer);

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.json({
      numPages: pdfData.numpages || 1,
      parsedText: pdfData.text
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'PDF upload failed.' });
  }
});

// ⬇️ CHAT ROUTE: Use question + context from frontend
app.post('/chat', async (req, res) => {
  const { question, context } = req.body;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `Question: ${question}\n\nContext:\n${context.slice(0, 2000)}` }
              ]
            }
          ]
        })
      }
    );

    const result = await geminiRes.json();
    const answer = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, no answer generated.';

    res.json({ answer, pages: [1] });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ answer: 'Failed to connect to Gemini AI.' });
  }
});

app.listen(8080, () => console.log('✅ Server running at http://localhost:8080'));
