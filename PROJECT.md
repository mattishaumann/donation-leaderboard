# Donation Leaderboard — Project Reference

## What it is

A real-time party donation leaderboard built for live events. Guests donate via Ko-fi, optionally include a song request in their message, and the app displays a ranked leaderboard, auto-queues songs on Spotify, and shows a QR code so more guests can donate. It runs locally on the DJ/host's laptop and is displayed on a screen at the venue.

The event this was built for is **Nørrebros** (Copenhagen). The Ko-fi page is `https://ko-fi.com/norrebros`.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5 |
| Backend | Node.js (ESM), Express 4 |
| Fonts | Bebas Neue, Space Grotesk, DM Mono (Google Fonts) |
| QR codes | `qrcode.react` |
| Song extraction AI | Gemini 2.0 Flash (primary), GPT-4o-mini (fallback) |
| Donation platform | Ko-fi webhook |
| Music | Spotify Web API |

---

## File structure

```
donation-leaderboard-main/
├── server.js          # Express backend — all API, webhooks, Spotify, AI
├── src/
│   ├── App.jsx        # Entire React frontend (single file)
│   └── main.jsx       # React entry point
├── public/
│   └── bg.png         # Background image (dark photo of a building)
├── index.html         # HTML shell — loads Google Fonts + Tailwind CDN
├── vite.config.js     # Vite config — proxies /api and /webhook to :3000
├── package.json       # Scripts and dependencies
└── .env               # Secrets (not committed)
```

---

## How to run

```bash
# Dev (runs backend + frontend concurrently)
npm run dev
# Backend:  http://localhost:3000
# Frontend: http://localhost:5173

# Production
npm run build
npm start   # serves built dist/ from :3000
```

After starting, connect Spotify by visiting: `http://localhost:3000/auth/spotify`

---

## Environment variables (`.env`)

```
KOFI_TOKEN=              # Ko-fi webhook verification token (optional but recommended)
GEMINI_API_KEY=          # Google Gemini API key (primary AI for song extraction)
OPENAI_API_KEY=          # OpenAI API key (fallback AI for song extraction)
SPOTIFY_CLIENT_ID=       # Spotify app client ID
SPOTIFY_CLIENT_SECRET=   # Spotify app client secret
```

---

## Backend (`server.js`)

All state is **in-memory** — donations are stored in a `donations[]` array and reset when the server restarts. There is no database.

### Donation object shape

```js
{
  id: number,
  kofiId: string,          // Ko-fi transaction ID
  name: string,            // Donor name
  message: string,         // Raw donation message
  song: string | null,     // Extracted song label, e.g. "Bohemian Rhapsody — Queen"
  songHidden: boolean,     // True if donor asked to keep it a surprise
  songPlayed: boolean,     // True once Spotify has played it (auto-detected)
  amount: number,          // Original amount in original currency
  currency: string,        // e.g. "DKK", "EUR"
  amountDKK: number,       // Converted to DKK for leaderboard sorting
  timestamp: string,       // ISO string
  isPublic: boolean,       // From Ko-fi — if false, message is hidden
}
```

### Currency conversion

Hardcoded rates in both `server.js` and `App.jsx`:
```js
{ DKK: 1, EUR: 7.46, USD: 6.88, GBP: 8.68, SEK: 0.64, NOK: 0.64 }
```

### Song extraction

When a Ko-fi donation arrives with a message, `extractSong()` is called:
1. Sends message to **Gemini 2.0 Flash** with a strict JSON-only prompt
2. If Gemini fails, falls back to **GPT-4o-mini**
3. Returns `{ song, artist, hidden }` or `null` if no song found
4. The `hidden` flag is set if the donor uses words like "surprise", "skjult", "hemmeligt" (Danish for secret/hidden)

### Spotify integration

OAuth flow: `GET /auth/spotify` → Spotify login → callback stores access + refresh tokens in memory.

Tokens auto-refresh before expiry. Scopes: `user-modify-playback-state user-read-playback-state user-read-currently-playing`.

A `setInterval` runs every 5 seconds to poll Spotify's currently-playing endpoint and auto-mark donation songs as `songPlayed = true` when they come on. The match is fuzzy — first word of track name vs. first word of the stored song label.

### API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/donations` | Returns all donations array |
| `POST` | `/api/donations/:id/played` | Manually mark a song as played |
| `DELETE` | `/api/donations` | Clear all donations (reset) |
| `GET` | `/api/spotify/status` | `{ connected: bool }` |
| `GET` | `/api/spotify/queue` | Currently playing + next 15 tracks |
| `GET` | `/auth/spotify` | Redirect to Spotify OAuth |
| `GET` | `/auth/spotify/callback` | OAuth callback, stores tokens |
| `POST` | `/webhook/kofi` | Ko-fi donation webhook |

---

## Frontend (`src/App.jsx`)

Single-file React app — no router, no state management library, inline styles throughout using a design token object `T`.

### Screens

1. **SetupScreen** — shown on launch. Configures event name, Ko-fi URL, minimum donation amount, and mode (demo or live). Clicking "Launch →" moves to the leaderboard.

2. **Leaderboard** — the main display screen.

### Design tokens (`T` object)

All colors are defined in one object at the top of `App.jsx`:
- Dark warm background (`#0a0805`)
- Warm yellow accent (`#f0d44a`)
- Glass panels with `backdrop-filter: blur(40px)`
- Text colors are warm off-white (`#f2ede4`) at various opacities

### Leaderboard logic

Donations are grouped by donor name. Each donor's `totalDKK` is the sum of all their donations converted to DKK. The leaderboard sorts by `totalDKK` descending and shows top 10. A bar under each name shows their relative share vs. the #1 donor.

When the #1 donor changes, a **Celebration overlay** fires for 3.2 seconds showing the new leader's name and total in large type.

### Modes

- **Demo mode**: Seeds 14 random donations on load, adds a new random one every 4 seconds. No server calls needed. Good for testing/showing the UI without real data.
- **Live mode**: Polls `GET /api/donations` every 3 seconds. Polls `GET /api/spotify/queue` every 5 seconds.

### Right column panels (top to bottom)

1. **Now Playing** — shows Spotify's currently playing track (with album art thumbnail) in live mode, or the first unplayed requested song in demo mode. Has animated equalizer bars when active.
2. **Recent Donations** — last 6 donations, newest highlighted in accent color.
3. **Donate** — QR code generated from the Ko-fi URL, URL text, and minimum donation badge.

### Key React components

| Component | Purpose |
|---|---|
| `App` | Root — manages setup vs. leaderboard screen |
| `SetupScreen` | Launch config form |
| `Leaderboard` | Main dashboard, all data fetching |
| `Celebration` | Full-screen #1 donor takeover overlay |
| `RecentItem` | Single row in recent donations list |
| `Avatar` | Colored circle with first letter, color derived from name hash |
| `EqBars` | Animated equalizer bars (3 bars, CSS keyframe animation) |
| `Panel` | Glass-morphism wrapper div |
| `SectionLabel` | Small caps section heading |
| `useTimeAgo` | Hook — returns "just now / 30s ago / 5m ago" string, updates every 5s |

---

## Ko-fi webhook setup

In Ko-fi settings → API, set the webhook URL to your public URL + `/webhook/kofi`. For local dev, use ngrok or similar to expose port 3000. The `KOFI_TOKEN` in `.env` should match the verification token shown in Ko-fi settings.

Ko-fi sends a `POST` with `application/x-www-form-urlencoded` body where the payload is a JSON string in a field called `data`. Only events with `type === "Donation"` are processed; others are acknowledged and skipped.

---

## Known design decisions / gotchas

- **No persistence** — all data lives in memory. Restarting the server wipes donations. This is intentional for live events where you want a clean start each night.
- **Spotify token is also in-memory** — if the server restarts, you need to re-authorize via `/auth/spotify`. Tokens are not saved to disk.
- **Song matching for auto-played is fuzzy** — it compares only the first word of the track name to avoid missing matches due to punctuation/subtitle differences. Can produce false positives.
- **Currency rates are hardcoded** — DKK, EUR, USD, GBP, SEK, NOK. Any other currency falls back to a 1:1 rate.
- **Vite proxy** — in dev, Vite proxies `/api` and `/webhook` paths to `localhost:3000`, so the frontend doesn't need to know the backend port.
- **Tailwind is loaded via CDN** in `index.html` but is not actually used in `App.jsx` — all styling is inline. It's a leftover and can be removed.
