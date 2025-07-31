const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
const pdfParse = require('pdf-parse');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

let parsedPdfText = ''; // Store uploaded PDF content

app.post('/upload', upload.single('pdf'), async (req, res) => {
  const file = req.file;
  const dataBuffer = fs.readFileSync(file.path);
  const pdfData = await pdfParse(dataBuffer);

  parsedPdfText = pdfData.text; // Save PDF content globally
  res.json({ numPages: pdfData.numpages || 1 });
});

app.post('/chat', async (req, res) => {
  const question = req.body.question;

  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tinyllama',
        prompt: question,
        stream: false
      })
    });

    const result = await ollamaRes.json();

    res.json({
      answer: result.response || 'Sorry, I could not generate a response.',
      pages: [1] // Static mock reference (you can improve this later)
    });
  } catch (err) {
    console.error('Ollama error:', err);
    res.status(500).json({ answer: 'Failed to connect to AI.' });
  }
});

app.listen(8080, () => console.log('✅ Server running at http://localhost:8080'));
