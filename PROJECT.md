# Donation Leaderboard - Project Reference

## What it is

A real-time party donation leaderboard built for live events at **Nørrebros** (Copenhagen). Guests donate via Ko-fi, optionally include a song request in their message, and the app:
- Displays a ranked leaderboard (by accumulated DKK)
- Shows a full-screen announcement for every new donation
- Auto-queues songs on Spotify using AI to extract requests from messages
- Shows a QR code so guests can donate on the spot

Runs locally on the host/DJ's laptop, displayed on a venue screen. Ko-fi page: `https://ko-fi.com/norrebros`.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, all inline styles |
| Backend | Node.js (ESM), Express 4 |
| Fonts | Bebas Neue, Space Grotesk, DM Mono (Google Fonts) |
| QR codes | `qrcode.react` |
| Song extraction AI | Gemini 2.0 Flash (primary), GPT-4o-mini (fallback) |
| Donations | Ko-fi webhook |
| Music | Spotify Web API |

---

## File structure

```
donation-leaderboard-main/
├── server.js          # Express backend - all API, webhooks, Spotify, AI
├── src/
│   ├── App.jsx        # Entire React frontend (single file)
│   └── main.jsx       # React entry point
├── public/
│   └── bg.png         # Background image (dark photo of a building)
├── index.html         # HTML shell - loads Google Fonts
├── vite.config.js     # Vite config - proxies /api and /webhook to :3000
├── package.json       # Scripts and dependencies
├── README.md          # Setup and usage docs
├── PROJECT.md         # This file - technical reference for AI/dev context
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

After starting, connect Spotify: `http://localhost:3000/auth/spotify`

---

## Environment variables (`.env`)

```
KOFI_TOKEN=              # Ko-fi webhook verification token (optional)
GEMINI_API_KEY=          # Google Gemini API key (primary AI)
OPENAI_API_KEY=          # OpenAI API key (fallback AI)
SPOTIFY_CLIENT_ID=       # Spotify app client ID
SPOTIFY_CLIENT_SECRET=   # Spotify app client secret
```

---

## Backend (`server.js`)

All state is **in-memory** - no database. Donations array resets on server restart. This is intentional for single-night events.

### Donation object shape

```js
{
  id: number,
  kofiId: string,          // Ko-fi transaction ID
  name: string,            // Donor name
  message: string,         // Raw donation message
  song: string | null,     // Extracted song label e.g. "Bohemian Rhapsody - Queen"
  songHidden: boolean,     // True if donor asked to hide the song (mystery)
  songPlayed: boolean,     // True once Spotify has played it (auto-detected)
  amount: number,          // Original amount in original currency
  currency: string,        // e.g. "DKK", "EUR"
  amountDKK: number,       // Converted to DKK for leaderboard sorting
  timestamp: string,       // ISO string
  isPublic: boolean,       // From Ko-fi - if false, message is hidden
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
2. If Gemini fails or quota exceeded, falls back to **GPT-4o-mini**
3. Returns `{ song, artist, hidden }` or `null` if no song found
4. `hidden: true` is set if the donor uses words like "surprise", "don't show", "skjult", "hemmeligt"

### Spotify integration

OAuth flow: `GET /auth/spotify` -> Spotify login -> callback stores access + refresh tokens in memory. Tokens are NOT persisted to disk - re-auth required after server restart.

Scopes: `user-modify-playback-state user-read-playback-state user-read-currently-playing`

A `setInterval` runs every 5 seconds to poll Spotify's currently-playing endpoint and auto-mark donation songs as `songPlayed = true` when they come on. Match is fuzzy (first word of track name vs. first word of stored song label).

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

Single-file React app - no router, no state management library. All styling is inline using a design token object `T`. No Tailwind (CDN tag in index.html is unused legacy).

### Design tokens (`T` object)

```js
const T = {
  pageBg:      '#0a0805',               // very dark warm brown
  glass:       'rgba(6,4,2,0.28)',      // glass panel background
  border:      'rgba(255,255,255,0.14)',
  text:        '#f2ede4',               // warm off-white
  textSub:     'rgba(242,237,228,0.5)',
  textMuted:   'rgba(242,237,228,0.22)',
  accent:      '#f0d44a',               // warm yellow - main accent
  accentBg:    'rgba(240,212,74,0.1)',
  silver:      '#b0b8c8',               // used for #2 leaderboard border
  bronze:      '#b87333',               // used for #3 leaderboard border
  avatars:     [...],                   // 8 muted colours for avatar circles
}
```

### Screens

1. **SetupScreen** - configures event name, Ko-fi URL, min donation, mode (demo/live). Clicking "Launch ->" enters the leaderboard.
2. **Leaderboard** - the main display screen.

### Leaderboard logic

Donations are grouped by donor name. `totalDKK` = sum of all their donations converted to DKK. Sorted descending, top 10 shown. Each row has a relative progress bar vs. the #1 donor total.

**Podium styling:**
- #1 - "THE LEGEND," label (small caps), 2.4rem name, 4px gold left border, gold glow `box-shadow`, crown avatar (👑)
- #2 - silver left border, slightly larger name
- #3 - bronze left border
- Others - normal styling

### Modes

- **Demo mode** - seeds 14 donations on load from `DEMO_DONATIONS` presets (realistic Danish/English messages with embedded song requests). Adds 1-2 new donations every 16 seconds (~25% chance of double). No server calls needed.
- **Live mode** - polls `GET /api/donations` every 3s. Polls `GET /api/spotify/queue` every 5s.

### Mystery song behaviour

When `songHidden: true`:
- **Up Next panel** - shown as "mystery song"
- **Leaderboard last song** - shown as "Mystery song"
- **Recent Donations** - song line hidden entirely (not shown)
- **Announcement overlay** - song line hidden entirely
- **Now Playing** - song name is REVEALED (this is the intended reveal moment)

The AI sets `hidden: true` when donor message contains words like: "don't show", "surprise", "secret", "skjult", "hemmeligt".

### Announcement overlay

Every new donation triggers a full-screen overlay. Announcements queue up if multiple arrive simultaneously - they play one by one with a gap in between.

Sequence: **fade in (0.35s)** -> **hold** -> **fade out (0.6s)** -> leaderboard visible -> next announcement

- Regular donation: 3.6s hold
- New #1 donor: 5.2s hold, gold name with glow, "The Legend," + "NEW #1 DONOR" labels

### Right column panels (top to bottom)

1. **Donate** - QR code (220px), Ko-fi URL, instructions, mystery song hint, min DKK badge
2. **Now Playing** - Spotify current track with album art (live) or first unplayed requested song (demo). Always reveals song name, even for previously hidden songs
3. **Up Next** - next 3 unplayed donor-requested songs with requester name. Hidden songs shown as "mystery song"
4. **Recent Donations** - last 6 donations, newest highlighted in accent colour

### Key React components

| Component | Purpose |
|---|---|
| `App` | Root - manages setup vs. leaderboard screen |
| `SetupScreen` | Launch config form |
| `Leaderboard` | Main dashboard, all data fetching and state |
| `Announcement` | Full-screen donation overlay (queued, fade in/out) |
| `DonationToast` | Small bottom-left slide-in notification per donation |
| `FullscreenButton` | Fixed top-right fullscreen toggle |
| `RecentItem` | Single row in recent donations list |
| `Avatar` | Coloured circle with random hat emoji; crown for #1 |
| `EqBars` | Animated 3-bar equalizer (CSS keyframes) |
| `Panel` | Glass-morphism wrapper div |
| `SectionLabel` | Small caps section heading |
| `useTimeAgo` | Hook - returns "just now / 30s ago / 5m ago", updates every 5s |

### Demo donation presets (`DEMO_DONATIONS`)

Array of `{ message, song, songHidden }` objects with realistic party messages. Includes:
- Combined message + song request (e.g. "Fedt party!! Kan I spille Dancing Queen? 🕺")
- Message-only donations
- Hidden/mystery song requests
- Mix of Danish and English

---

## Known design decisions / gotchas

- **No persistence** - all data lives in memory. Restarting the server wipes donations. Intentional for single-night events.
- **Spotify token in-memory** - re-authorize via `/auth/spotify` after each server restart.
- **Song matching is fuzzy** - compares only the first word of track name vs. stored song label. Can produce false positives but avoids missing matches due to subtitles/punctuation.
- **Currency rates hardcoded** - any unlisted currency falls back to 1:1 rate with DKK.
- **Vite proxy** - in dev, `/api` and `/webhook` paths proxy to `localhost:3000`. In production, frontend is served by Express directly.
- **Announcement queue** - uses a `useRef` array. New donations push to queue; if nothing is showing, display immediately; on `onDone`, shift next from queue. The `onDone` callback uses a ref internally to avoid stale closure issues with `useEffect`.
- **No em dashes** - all visible text uses regular hyphens (`-`), not em dashes (`-`).
