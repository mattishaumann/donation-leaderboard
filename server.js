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

// ── Song extraction (Gemini → GPT-4o-mini fallback) ──────────────────────────

const SONG_PROMPT = (message) =>
  `You extract song requests from party donation messages.
Return ONLY valid JSON — no markdown, no explanation.
If there is a song request: {"song":"<title>","artist":"<artist or empty string>"}
If there is NO song request: {"song":null}
Message: "${message.replace(/"/g, "'")}"`;

async function extractSongWithGemini(message) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SONG_PROMPT(message) }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 100 },
      }),
    }
  );
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  const parsed = JSON.parse(text);
  return parsed.song ? { song: parsed.song, artist: parsed.artist || '' } : null;
}

async function extractSongWithGPT(message) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 60,
      messages: [{ role: 'user', content: SONG_PROMPT(message) }],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const text = json.choices?.[0]?.message?.content?.trim();
  const parsed = JSON.parse(text);
  return parsed.song ? { song: parsed.song, artist: parsed.artist || '' } : null;
}

async function extractSong(message) {
  if (!message || !message.trim()) return null;
  try {
    const result = await extractSongWithGemini(message);
    console.log('Song extracted via Gemini');
    return result;
  } catch (err) {
    console.log(`Gemini failed (${err.message}), falling back to GPT-4o-mini`);
  }
  try {
    const result = await extractSongWithGPT(message);
    console.log('Song extracted via GPT-4o-mini');
    return result;
  } catch (err) {
    console.error('GPT error:', err.message);
    return null;
  }
}

// ── Spotify ───────────────────────────────────────────────────────────────────

let spotifyTokens = { access: null, refresh: null, expiresAt: 0 };

function spotifyAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: 'http://127.0.0.1:3000/auth/spotify/callback',
    scope: 'user-modify-playback-state user-read-playback-state user-read-currently-playing',
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

async function refreshSpotifyToken() {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: spotifyTokens.refresh }),
  });
  const data = await res.json();
  if (data.access_token) {
    spotifyTokens.access = data.access_token;
    spotifyTokens.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    if (data.refresh_token) spotifyTokens.refresh = data.refresh_token;
  }
}

async function getSpotifyToken() {
  if (!spotifyTokens.access) return null;
  if (Date.now() > spotifyTokens.expiresAt) await refreshSpotifyToken();
  return spotifyTokens.access;
}

async function queueSongOnSpotify(song, artist) {
  const token = await getSpotifyToken();
  if (!token) {
    console.log('Spotify not connected — skipping queue');
    return;
  }

  const query = artist ? `${song} ${artist}` : song;
  const searchRes = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();
  const track = searchData.tracks?.items?.[0];
  if (!track) {
    console.log(`Spotify: no track found for "${query}"`);
    return;
  }

  const queueRes = await fetch(
    `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(track.uri)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  );

  if (queueRes.status === 204) {
    console.log(`Queued on Spotify: ${track.name} — ${track.artists[0].name}`);
  } else {
    const err = await queueRes.json().catch(() => ({}));
    console.error('Spotify queue error:', err?.error?.message || queueRes.status);
  }
}

// ── Spotify OAuth routes ──────────────────────────────────────────────────────

app.get('/auth/spotify', (_req, res) => {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    return res.send('Set SPOTIFY_CLIENT_ID in .env first');
  }
  res.redirect(spotifyAuthUrl());
});

app.get('/auth/spotify/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.send(`Spotify auth failed: ${error}`);

  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://127.0.0.1:3000/auth/spotify/callback',
    }),
  });

  const data = await tokenRes.json();
  if (!data.access_token) return res.send('Token exchange failed: ' + JSON.stringify(data));

  spotifyTokens = {
    access: data.access_token,
    refresh: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  console.log('Spotify connected!');
  res.send('<h2>Spotify connected! You can close this tab.</h2>');
});

app.get('/api/spotify/status', (_req, res) => {
  res.json({ connected: !!spotifyTokens.access });
});

// ── Ko-fi webhook ─────────────────────────────────────────────────────────────

app.post('/webhook/kofi', async (req, res) => {
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
  const amountDKK = toDKK(data.amount, data.currency);

  // Ask Gemini to extract the song
  const songInfo = await extractSong(message);
  const songLabel = songInfo ? `${songInfo.song}${songInfo.artist ? ` — ${songInfo.artist}` : ''}` : null;

  donations.push({
    id: nextId++,
    kofiId: data.kofi_transaction_id,
    name: data.from_name || 'Anonymous',
    message,
    song: songLabel,
    songPlayed: false,
    amount: parseFloat(data.amount),
    currency: data.currency,
    amountDKK,
    timestamp: data.timestamp || new Date().toISOString(),
    isPublic: data.is_public,
  });

  console.log(`Donation: ${data.from_name} — ${data.amount} ${data.currency} (${amountDKK} DKK)${songLabel ? ` | Song: ${songLabel}` : ''}`);

  // Queue on Spotify if song found
  if (songInfo) {
    queueSongOnSpotify(songInfo.song, songInfo.artist).catch(console.error);
  }

  res.status(200).json({ ok: true });
});

// ── API ───────────────────────────────────────────────────────────────────────

app.get('/api/donations', (_req, res) => res.json(donations));

app.post('/api/donations/:id/played', (req, res) => {
  const d = donations.find((d) => d.id === parseInt(req.params.id));
  if (!d) return res.status(404).json({ error: 'Not found' });
  d.songPlayed = true;
  res.json({ ok: true });
});

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Spotify login: http://localhost:${PORT}/auth/spotify`);
});
