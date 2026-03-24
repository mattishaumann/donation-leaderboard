# Donation Leaderboard 🎩

Party donation leaderboard powered by Ko-fi webhooks. Show it on a TV at your party!

## Setup

```bash
npm install
cp .env.example .env
# Edit .env — paste your Ko-fi verification token
```

## Development

```bash
npm run dev
```

Opens Vite on http://localhost:5173 and Express API on http://localhost:3000.

## Connect Ko-fi

1. Install ngrok: `npx ngrok http 3000`
2. Copy the ngrok URL
3. Go to [ko-fi.com/manage/webhooks](https://ko-fi.com/manage/webhooks)
4. Paste: `https://your-ngrok-url.ngrok.io/webhook/kofi`
5. Click **Send Single Donation Test**
6. Open http://localhost:5173 on the TV — the test donation should appear

## Song Requests

Donors can request songs by writing in the Ko-fi message:
- `Song: Bohemian Rhapsody`
- `🎵 Dancing Queen — ABBA`
- `Play Take On Me`

## Production

```bash
npm run build
npm start
```
