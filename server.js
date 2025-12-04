const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-with-a-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { announcements: [] };
  }
}

function writeData(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

// Simple login endpoint. Set ADMIN_PASSWORD env var or defaults to 'admin123'
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'Invalid password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    res.json({ ok: true });
  });
});

app.get('/api/announcements', (req, res) => {
  const data = readData();
  res.json({ announcements: data.announcements || [] });
});

app.post('/api/announcements', (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Unauthorized' });
  }
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ ok: false, error: 'Empty announcement' });
  const data = readData();
  const item = { id: Date.now(), text: String(text), createdAt: new Date().toISOString() };
  data.announcements = data.announcements || [];
  data.announcements.unshift(item);
  writeData(data);
  res.json({ ok: true, announcement: item });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
