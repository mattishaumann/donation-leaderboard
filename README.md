# Donation Leaderboard

Real-time party fundraising leaderboard for Ko-fi donations. Runs on a laptop connected to a venue screen - shows a live donor ranking, full-screen donation announcements, a Spotify song queue, and a QR code for new donors.

Built for **Nørrebros** parties in Copenhagen.

---

## Features

- **Live leaderboard** - donors ranked by total DKK donated, updates every 3s
- **Full-screen donation announcements** - every new donation gets a full-screen overlay (fade in, hold, fade out). New #1 donor gets a special "The Legend" treatment. Multiple donations queue up and play one by one
- **Podium styling** - #1 gets a golden crown + "The Legend" label + glow; #2 silver border; #3 bronze border
- **Ko-fi webhook** - receives donations instantly via POST webhook
- **AI song extraction** - Gemini 2.0 Flash (with GPT-4o-mini fallback) reads donation messages and extracts song + artist in any phrasing
- **Spotify auto-queue** - extracted songs are searched and added to the Spotify playback queue automatically
- **Mystery songs** - if a donor writes "don't show the song", "surprise", "skjult" etc., the song is queued on Spotify but hidden as "mystery song" everywhere until it starts playing - then it's revealed in Now Playing
- **Up Next panel** - shows the next 3 donor-requested songs waiting in the queue
- **Now Playing** - shows the current track with album art; auto-detects when a donated song starts and marks it as played
- **Toast notifications** - small slide-in toast bottom-left for each new donation
- **QR code** - scannable Ko-fi link with minimum donation amount
- **Multi-currency** - DKK, EUR, USD, GBP, SEK, NOK all converted to DKK for ranking
- **Demo mode** - realistic Danish/English donation presets with song requests, occasional double donations, 16s interval
- **Fullscreen button** - fixed top-right toggle for presentation mode

---

## Layout

```
[ Banner — party context text ]
[ Header — event name | donors | queued pills | LIVE indicator ]

[ Leaderboard (left, ~55%) ]  [ Right column (~45%) ]
                               ├─ Donate (QR code)
                               ├─ Now Playing
                               ├─ Up Next (3 songs)
                               └─ Recent Donations
```

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, inline styles |
| Backend | Node.js (ESM), Express 4 |
| Fonts | Bebas Neue, Space Grotesk, DM Mono (Google Fonts) |
| QR | `qrcode.react` |
| AI | Gemini 2.0 Flash + GPT-4o-mini fallback |
| Donations | Ko-fi webhook |
| Music | Spotify Web API (OAuth, queue, now-playing) |

---

## Environment Variables

```env
KOFI_TOKEN=            # Ko-fi webhook verification token (optional but recommended)
GEMINI_API_KEY=        # Google AI Studio key - tried first
OPENAI_API_KEY=        # OpenAI key - fallback for song extraction (GPT-4o-mini)
SPOTIFY_CLIENT_ID=     # From developer.spotify.com
SPOTIFY_CLIENT_SECRET=
```

---

## Setup

```bash
npm install
# copy .env.example to .env and fill in keys
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Spotify auth: http://localhost:3000/auth/spotify

---

## Ko-fi Webhook

1. `brew install ngrok/ngrok/ngrok` then `ngrok http 3000`
2. Go to [ko-fi.com/manage/webhooks](https://ko-fi.com/manage/webhooks)
3. Set webhook URL to: `https://your-ngrok-url/webhook/kofi`
4. Copy the verification token into `KOFI_TOKEN` in `.env`

---

## Spotify Setup

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create an app - set redirect URI to `http://127.0.0.1:3000/auth/spotify/callback`
3. Copy Client ID and Secret into `.env`
4. Start the server, open `http://localhost:3000/auth/spotify` and log in

Spotify must have an active playback device (phone, desktop app, etc.) for queuing to work. Tokens are in-memory - re-auth required after server restart.

---

## Song Request Formats

The AI handles any natural phrasing:

| Donor writes | Extracted |
|---|---|
| `play Dancing Queen by ABBA` | Dancing Queen - ABBA |
| `can you put on Mr. Brightside?` | Mr. Brightside |
| `🎵 Africa - Toto` | Africa - Toto |
| `surprise me, don't show the song` | *(queued as mystery)* |
| `fedt arrangement tak!` | *(no song)* |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhook/kofi` | Ko-fi donation webhook |
| `GET` | `/api/donations` | All donations |
| `POST` | `/api/donations/:id/played` | Mark a song as played |
| `DELETE` | `/api/donations` | Clear all donations |
| `GET` | `/api/spotify/status` | `{ connected: bool }` |
| `GET` | `/api/spotify/queue` | Currently playing + next 15 tracks |
| `GET` | `/auth/spotify` | Start Spotify OAuth |
| `GET` | `/auth/spotify/callback` | OAuth callback |

---

## Production

```bash
npm run build
npm start   # serves built frontend from Express on port 3000
```

---

## Cost

Gemini 2.0 Flash is free within quota. GPT-4o-mini fallback costs ~$0.003 per 100 donations.
