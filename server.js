const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');
const { mdToHtml, htmlToPdf, mdToPdf } = require('./converter');

const app = express();
const PORT = process.env.PORT || 3500;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.text({ limit: '2mb', type: 'text/markdown' }));

// Auth
const API_KEYS = (process.env.API_KEYS || '').split(',').filter(Boolean);
function requireAuth(req, res, next) {
  if (API_KEYS.length === 0) return next();
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key || !API_KEYS.includes(key)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

// Rate limiting (simple in-memory)
const hits = new Map();
const RATE = parseInt(process.env.RATE_LIMIT || '30');
function rateLimit(req, res, next) {
  const key = req.headers['x-api-key'] || req.ip;
  const now = Date.now();
  const window = hits.get(key) || [];
  const recent = window.filter(t => t > now - 60000);
  if (recent.length >= RATE) return res.status(429).json({ error: 'Rate limit exceeded' });
  recent.push(now);
  hits.set(key, recent);
  next();
}

// Health
app.get('/', (req, res) => {
  res.json({
    name: 'Markdown/PDF API',
    version: '1.0.0',
    endpoints: [
      'POST /md-to-html — Convert Markdown to HTML',
      'POST /md-to-pdf — Convert Markdown to PDF',
      'POST /html-to-pdf — Convert HTML to PDF',
    ],
  });
});

// Helper: get markdown from body (text, json, or file)
function getMarkdown(req) {
  if (req.file) return req.file.buffer.toString('utf-8');
  if (typeof req.body === 'string') return req.body;
  if (req.body && req.body.markdown) return req.body.markdown;
  if (req.body && req.body.text) return req.body.text;
  return null;
}

// MD → HTML
app.post('/md-to-html', requireAuth, rateLimit, upload.single('file'), (req, res) => {
  const md = getMarkdown(req);
  if (!md) return res.status(400).json({ error: 'Provide markdown as body text, JSON {markdown:"..."}, or file upload' });

  const css = req.query.css || req.body?.css || '';
  const html = mdToHtml(md, { css, standalone: req.query.standalone !== 'false' });
  res.type('html').send(html);
});

// MD → PDF
app.post('/md-to-pdf', requireAuth, rateLimit, upload.single('file'), async (req, res) => {
  const md = getMarkdown(req);
  if (!md) return res.status(400).json({ error: 'Provide markdown as body text, JSON {markdown:"..."}, or file upload' });

  const css = req.query.css || req.body?.css || '';
  const opts = {
    css,
    format: req.query.format || 'A4',
    margin: req.query.margin || '20mm',
  };

  try {
    const pdf = await mdToPdf(md, opts);
    res.type('application/pdf').send(pdf);
  } catch (err) {
    res.status(500).json({ error: 'PDF generation failed', message: err.message });
  }
});

// HTML → PDF
app.post('/html-to-pdf', requireAuth, rateLimit, upload.single('file'), async (req, res) => {
  let html;
  if (req.file) html = req.file.buffer.toString('utf-8');
  else if (typeof req.body === 'string') html = req.body;
  else if (req.body?.html) html = req.body.html;
  if (!html) return res.status(400).json({ error: 'Provide HTML as body text, JSON {html:"..."}, or file upload' });

  const opts = {
    format: req.query.format || 'A4',
    margin: req.query.margin || '20mm',
  };

  try {
    const pdf = await htmlToPdf(html, opts);
    res.type('application/pdf').send(pdf);
  } catch (err) {
    res.status(500).json({ error: 'PDF generation failed', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📄 Markdown/PDF API running on port ${PORT}`);
});
