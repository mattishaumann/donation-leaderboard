import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const donations = [];
let nextId = 1;

const RATES = { DKK: 1, EUR: 7.46, USD: 6.88, GBP: 8.68, SEK: 0.64, NOK: 0.64 };

function toDKK(amount, currency) {
  const rate = RATES[currency.toUpperCase()] || 1;
  return Math.round(parseFloat(amount) * rate * 100) / 100;
}

function extractSong(message) {
  if (!message) return null;
  const m = message.trim();

  // "Song: ..."
  const songMatch = m.match(/^song:\s*(.+)/i);
  if (songMatch) return songMatch[1].trim();

  // "Play ..."
  const playMatch = m.match(/^play\s+(.+)/i);
  if (playMatch) return playMatch[1].trim();

  // Starts with music emoji
  const emojiMatch = m.match(/^[🎵🎶🎤🎸🎹🎺🎻🥁🎷]\s*(.+)/u);
  if (emojiMatch) return emojiMatch[1].trim();

  // Short message with dash separator — treat as song
  if (m.length < 80 && (m.includes(' — ') || m.includes(' - '))) return m;

  return null;
}

// Ko-fi webhook
app.post('/webhook/kofi', (req, res) => {
  let data;
  try {
    data = JSON.parse(req.body.data);
  } catch {
    return res.status(400).json({ error: 'Invalid data' });
  }

  const token = process.env.KOFI_TOKEN;
  if (token && data.verification_token !== token) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  if (data.type !== 'Donation') {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const message = data.is_public ? (data.message || '') : '';
  const song = extractSong(message);
  const amountDKK = toDKK(data.amount, data.currency);

  donations.push({
    id: nextId++,
    kofiId: data.kofi_transaction_id,
    name: data.from_name || 'Anonymous',
    message,
    song,
    songPlayed: false,
    amount: parseFloat(data.amount),
    currency: data.currency,
    amountDKK,
    timestamp: data.timestamp || new Date().toISOString(),
    isPublic: data.is_public,
  });

  console.log(`Donation: ${data.from_name} — ${data.amount} ${data.currency} (${amountDKK} DKK)`);
  res.status(200).json({ ok: true });
});

// Get all donations
app.get('/api/donations', (_req, res) => {
  res.json(donations);
});

// Mark song as played
app.post('/api/donations/:id/played', (req, res) => {
  const d = donations.find((d) => d.id === parseInt(req.params.id));
  if (!d) return res.status(404).json({ error: 'Not found' });
  d.songPlayed = true;
  res.json({ ok: true });
});

// Clear all
app.delete('/api/donations', (_req, res) => {
  donations.length = 0;
  nextId = 1;
  res.json({ ok: true });
});

// Serve Vite build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
  app.get('*', (_req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
