# Donation Leaderboard 🎩

Real-time party fundraising leaderboard for Ko-fi donations. Designed to run on a TV at events — shows a live donor ranking, latest donations, and an AI-powered Spotify song queue.

---

## Features

- **Live leaderboard** — donors ranked by total DKK donated, updates in real-time
- **Ko-fi webhook integration** — receives donations instantly via POST webhook
- **AI song extraction** — GPT-4o-mini (with Gemini 2.0 Flash fallback) reads any donation message and extracts song + artist, regardless of phrasing
- **Spotify auto-queue** — extracted songs are automatically searched and added to the Spotify playback queue
- **Hidden/mystery songs** — if a donor writes "secret", "surprise", "skjult" etc., the song is queued on Spotify but shown as 🔒 Mystery on screen
- **Live Spotify queue sidebar** — shows the next 2 upcoming tracks, with album art, and marks whether each was requested via donation or is from the playlist
- **Now Playing** — shows the currently playing track with album art, auto-detects when a donated song starts playing and marks it as played
- **QR code** — shows a scannable QR code with your Ko-fi link and minimum donation amount
- **Celebration overlay** — 3-second full-screen animation when a new #1 donor takes the lead
- **Multi-currency** — DKK, EUR, USD, GBP, SEK, NOK all converted to DKK for the leaderboard
- **Demo mode** — simulates donations with Danish names and song requests for testing/display

---

## Architecture

```
Ko-fi webhook → POST /webhook/kofi
                  ↓
           GPT-4o-mini (Gemini fallback)
           extracts { song, artist, hidden }
                  ↓
           Spotify search → add to queue
                  ↓
           stored in-memory donations[]

Frontend (React + Vite) polls /api/donations every 3s
Sidebar polls /api/spotify/queue every 5s
Server polls Spotify currently-playing every 5s → auto-marks played songs
```

---

## Environment Variables

```env
KOFI_TOKEN=           # Ko-fi webhook verification token (optional but recommended)
GEMINI_API_KEY=       # Google AI Studio key — used first, falls back to GPT if quota exceeded
OPENAI_API_KEY=       # OpenAI key — used as fallback for song extraction (GPT-4o-mini)
SPOTIFY_CLIENT_ID=    # From developer.spotify.com
SPOTIFY_CLIENT_SECRET=
```

---

## Setup

```bash
npm install
cp .env.example .env
# Fill in your keys in .env
```

---

## Development

```bash
# Terminal 1 — backend
node server.js

# Terminal 2 — frontend
npx vite

# Or both at once
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

---

## Ko-fi Webhook Setup

1. Install ngrok: `brew install ngrok/ngrok/ngrok`
2. Authenticate: `ngrok config add-authtoken <your-token>` (free at ngrok.com)
3. Start tunnel: `ngrok http 3000`
4. Copy the public HTTPS URL
5. Go to [ko-fi.com/manage/webhooks](https://ko-fi.com/manage/webhooks)
6. Set webhook URL to: `https://your-ngrok-url/webhook/kofi`

---

## Spotify Setup

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create an app — set redirect URI to `http://127.0.0.1:3000/auth/spotify/callback`
3. Copy Client ID and Secret into `.env`
4. Start the server, then open `http://localhost:3000/auth/spotify` to authorize
5. Spotify will now receive songs automatically on each qualifying donation

**Note:** Spotify must have an active playback device (phone, desktop app, etc.) for queuing to work.

---

## Song Request Formats

Donors write their song request in the Ko-fi message. The AI handles any natural phrasing:

| Message | Extracted |
|---------|-----------|
| `Song: Bohemian Rhapsody` | Bohemian Rhapsody |
| `play Dancing Queen by ABBA` | Dancing Queen — ABBA |
| `🎵 Africa — Toto` | Africa — Toto |
| `can you put on some Blinding Lights?` | Blinding Lights — The Weeknd |
| `Song: Mr. Brightside - keep it secret!` | Mr. Brightside (hidden 🔒) |
| `fedt arrangement tak!` | *(no song detected)* |

To request a **hidden/mystery song** (queued on Spotify but shown as 🔒 on screen), include words like: `secret`, `surprise`, `hidden`, `skjult`, `hemmeligt`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhook/kofi` | Receives Ko-fi donation webhook |
| `GET` | `/api/donations` | Returns all donations |
| `POST` | `/api/donations/:id/played` | Manually mark a song as played |
| `DELETE` | `/api/donations` | Clear all donations |
| `GET` | `/api/spotify/status` | `{ connected: bool }` |
| `GET` | `/api/spotify/queue` | Live Spotify queue + currently playing |
| `GET` | `/auth/spotify` | Start Spotify OAuth flow |
| `GET` | `/auth/spotify/callback` | OAuth callback (set as redirect URI) |

---

## Production

```bash
npm run build
npm start
```

Serves the built frontend statically from the Express server on port 3000.

---

## Cost

AI song extraction uses GPT-4o-mini as fallback (~$0.003 per 100 donations). Gemini 2.0 Flash is tried first and is free when quota is available.
