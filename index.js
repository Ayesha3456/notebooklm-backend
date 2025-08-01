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

app.use(cors({ origin: '*' }));
app.use(express.json());

// Upload Route: Extract text and return it to frontend
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded.' });

    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(dataBuffer);

    fs.unlinkSync(file.path); // Delete file after reading

    res.json({
      numPages: pdfData.numpages || 1,
      parsedText: pdfData.text
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ message: 'PDF upload failed.' });
  }
});

// Chat Route: Receives question and context, sends to Gemini
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
