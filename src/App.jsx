import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Constants ---
const RATES = { DKK: 1, EUR: 7.46, USD: 6.88, GBP: 8.68, SEK: 0.64, NOK: 0.64 };
const HATS = ['party', 'tophat', 'cowboy', 'crown', 'beret', 'wizard'];
const HAT_EMOJIS = ['🎩', '🤠', '👒', '🎓', '⛑️', '👑'];
const FLOAT_HATS = ['🎩', '🤠', '👒', '🎓', '⛑️', '👑'];

const DANISH_NAMES = [
  'Lars', 'Mette', 'Søren', 'Camilla', 'Kasper', 'Ida', 'Nikolaj', 'Sofie',
  'Rasmus', 'Freja', 'Mikkel', 'Astrid', 'Emil', 'Liv', 'Magnus', 'Clara',
  'Jonas', 'Nanna', 'Viktor', 'Karla',
];
const DEMO_SONGS = [
  'Bohemian Rhapsody', 'Dancing Queen — ABBA', 'Take On Me', 'Mr. Brightside',
  'Smells Like Teen Spirit', 'Jolene', 'Billie Jean', 'Wonderwall',
  'Sweet Caroline', 'Don\'t Stop Believin\'', 'Barbie Girl — Aqua', 'Livin\' on a Prayer',
  'Africa — Toto', 'Never Gonna Give You Up', 'September — Earth Wind & Fire',
];
const DEMO_MESSAGES = [
  'Great party!', 'Love this event!', 'Keep it going!', 'Cheers! 🍻',
  'Amazing night!', '', 'Best party ever!', 'Wooo!', 'Let\'s gooo!', '',
  'This is awesome!', 'For the good vibes ✨', '',
];
const CURRENCIES = ['DKK', 'EUR', 'USD', 'GBP', 'SEK'];

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getHatIndex(name) {
  return hashName(name) % HATS.length;
}

function toDKK(amount, currency) {
  return Math.round(parseFloat(amount) * (RATES[currency] || 1) * 100) / 100;
}

function extractSong(msg) {
  if (!msg) return null;
  const m = msg.trim();
  const s1 = m.match(/^song:\s*(.+)/i);
  if (s1) return s1[1].trim();
  const s2 = m.match(/^play\s+(.+)/i);
  if (s2) return s2[1].trim();
  const s3 = m.match(/^[🎵🎶🎤🎸🎹🎺🎻🥁🎷]\s*(.+)/u);
  if (s3) return s3[1].trim();
  if (m.length < 80 && (m.includes(' — ') || m.includes(' - '))) return m;
  return null;
}

// --- Hat SVGs ---
function HatIcon({ name, size = 32 }) {
  const idx = getHatIndex(name);
  const colors = [
    ['#FF6B6B', '#FF8E8E'], // party cone
    ['#2D2D2D', '#4A4A4A'], // top hat
    ['#C68B59', '#E8A86B'], // cowboy
    ['#FFD700', '#FFC107'], // crown
    ['#E74C3C', '#C0392B'], // beret
    ['#7B68EE', '#9B8BFF'], // wizard
  ];
  const [c1, c2] = colors[idx];

  const hats = [
    // Party cone
    <svg key="party" width={size} height={size} viewBox="0 0 40 40">
      <polygon points="20,2 32,36 8,36" fill={c1} stroke={c2} strokeWidth="2"/>
      <circle cx="20" cy="2" r="3" fill="#FFE66D"/>
      <line x1="12" y1="22" x2="28" y2="22" stroke="#FFE66D" strokeWidth="2"/>
      <line x1="10" y1="30" x2="30" y2="30" stroke="#FFB347" strokeWidth="2"/>
    </svg>,
    // Top hat
    <svg key="tophat" width={size} height={size} viewBox="0 0 40 40">
      <rect x="10" y="6" width="20" height="24" rx="2" fill={c1}/>
      <rect x="4" y="28" width="32" height="6" rx="3" fill={c2}/>
      <rect x="10" y="24" width="20" height="4" fill={c2}/>
      <rect x="12" y="24" width="16" height="2" fill="#FFE66D"/>
    </svg>,
    // Cowboy
    <svg key="cowboy" width={size} height={size} viewBox="0 0 40 40">
      <ellipse cx="20" cy="32" rx="18" ry="5" fill={c1}/>
      <path d="M12,32 Q12,12 20,10 Q28,12 28,32" fill={c2}/>
      <ellipse cx="20" cy="32" rx="14" ry="3" fill={c1} stroke={c2} strokeWidth="1"/>
      <rect x="12" y="26" width="16" height="3" fill="#FFE66D" rx="1"/>
    </svg>,
    // Crown
    <svg key="crown" width={size} height={size} viewBox="0 0 40 40">
      <path d="M6,32 L6,16 L14,24 L20,10 L26,24 L34,16 L34,32 Z" fill={c1} stroke={c2} strokeWidth="1.5"/>
      <rect x="6" y="30" width="28" height="5" rx="2" fill={c2}/>
      <circle cx="14" cy="33" r="2" fill="#E74C3C"/>
      <circle cx="20" cy="33" r="2" fill="#3498DB"/>
      <circle cx="26" cy="33" r="2" fill="#2ECC71"/>
    </svg>,
    // Beret
    <svg key="beret" width={size} height={size} viewBox="0 0 40 40">
      <ellipse cx="20" cy="28" rx="16" ry="6" fill={c1}/>
      <path d="M8,28 Q6,18 20,14 Q34,18 32,28" fill={c2}/>
      <circle cx="20" cy="14" r="3" fill={c1}/>
    </svg>,
    // Wizard
    <svg key="wizard" width={size} height={size} viewBox="0 0 40 40">
      <polygon points="20,2 34,36 6,36" fill={c1}/>
      <polygon points="20,2 34,36 6,36" fill="none" stroke={c2} strokeWidth="1.5"/>
      <circle cx="16" cy="20" r="2" fill="#FFE66D"/>
      <circle cx="24" cy="26" r="1.5" fill="#FFE66D"/>
      <circle cx="18" cy="30" r="1" fill="#FFB347"/>
      <circle cx="22" cy="15" r="1.5" fill="#FFB347"/>
      <rect x="4" y="34" width="32" height="4" rx="2" fill={c2}/>
    </svg>,
  ];
  return hats[idx];
}

// --- Floating hats background ---
function FloatingHats() {
  const hats = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      emoji: FLOAT_HATS[i % FLOAT_HATS.length],
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 20,
      size: 20 + Math.random() * 30,
    }))
  ).current;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hats.map((h, i) => (
        <span
          key={i}
          className="absolute opacity-[0.06]"
          style={{
            left: `${h.left}%`,
            fontSize: h.size,
            animation: `floatHat ${h.duration}s ease-in-out ${h.delay}s infinite`,
          }}
        >
          {h.emoji}
        </span>
      ))}
    </div>
  );
}

// --- Celebration overlay ---
function Celebration({ name, total, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" style={{ animation: 'fadeIn 0.3s' }}>
      <div className="text-center" style={{ animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        <div className="text-8xl mb-4">👑</div>
        <h2 className="font-heading text-6xl font-black text-gold mb-4">{name}</h2>
        <p className="text-3xl text-amber font-mono font-bold">{total.toLocaleString('da-DK')} DKK</p>
        <p className="text-xl text-white/60 mt-4">New #1 Donor!</p>
      </div>
    </div>
  );
}

// --- Setup screen ---
function SetupScreen({ onStart }) {
  const [eventName, setEventName] = useState('Hat Party 2026');
  const [mode, setMode] = useState('demo');

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white/5 backdrop-blur rounded-2xl p-10 w-full max-w-md border border-white/10">
        <h1 className="font-heading text-4xl font-black text-gold mb-2 text-center">
          🎩 Donation Leaderboard
        </h1>
        <p className="text-white/50 text-center mb-8">Party fundraising on the big screen</p>

        <label className="block text-sm text-white/60 mb-1">Event Name</label>
        <input
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white mb-6 focus:outline-none focus:border-gold"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />

        <label className="block text-sm text-white/60 mb-2">Mode</label>
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setMode('demo')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              mode === 'demo' ? 'bg-gold text-dark' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            Demo Mode
          </button>
          <button
            onClick={() => setMode('live')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              mode === 'live' ? 'bg-gold text-dark' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            Live (Ko-fi)
          </button>
        </div>

        {mode === 'live' && (
          <div className="bg-white/5 rounded-lg p-4 mb-6 text-sm text-white/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
              <span>Will poll /api/donations every 3s</span>
            </div>
            <p>Set up Ko-fi webhook → your ngrok URL + /webhook/kofi</p>
          </div>
        )}

        <button
          onClick={() => onStart(eventName, mode)}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-gold to-amber text-dark font-heading font-bold text-lg hover:scale-[1.02] transition-transform"
        >
          Launch Leaderboard
        </button>
      </div>
    </div>
  );
}

// --- Main Leaderboard ---
function Leaderboard({ eventName, mode }) {
  const [donations, setDonations] = useState([]);
  const [celebration, setCelebration] = useState(null);
  const prevTopRef = useRef(null);
  const demoIdRef = useRef(100);
  const demoIntervalRef = useRef(null);
  const seededRef = useRef(false);

  // Generate demo donation
  const makeDemoDonation = useCallback(() => {
    const name = DANISH_NAMES[Math.floor(Math.random() * DANISH_NAMES.length)];
    const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const baseAmount = 30 + Math.floor(Math.random() * 470);
    const amount = currency === 'DKK' ? baseAmount : Math.round(baseAmount / (RATES[currency] || 1) * 100) / 100;
    const hasSong = Math.random() < 0.4;
    const song = hasSong ? DEMO_SONGS[Math.floor(Math.random() * DEMO_SONGS.length)] : null;
    const message = song
      ? (Math.random() < 0.5 ? `Song: ${song}` : `🎵 ${song}`)
      : DEMO_MESSAGES[Math.floor(Math.random() * DEMO_MESSAGES.length)];

    return {
      id: demoIdRef.current++,
      name,
      message,
      song,
      songPlayed: false,
      amount,
      currency,
      amountDKK: toDKK(amount, currency),
      timestamp: new Date().toISOString(),
      isPublic: true,
    };
  }, []);

  // Seed demo
  useEffect(() => {
    if (mode !== 'demo' || seededRef.current) return;
    seededRef.current = true;
    const seed = Array.from({ length: 16 }, () => makeDemoDonation());
    setDonations(seed);
  }, [mode, makeDemoDonation]);

  // Demo stream
  useEffect(() => {
    if (mode !== 'demo') return;
    demoIntervalRef.current = setInterval(() => {
      setDonations((prev) => [...prev, makeDemoDonation()]);
    }, 3500);
    return () => clearInterval(demoIntervalRef.current);
  }, [mode, makeDemoDonation]);

  // Live polling
  useEffect(() => {
    if (mode !== 'live') return;
    const poll = () => fetch('/api/donations').then((r) => r.json()).then(setDonations).catch(() => {});
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [mode]);

  // Build leaderboard
  const grouped = {};
  donations.forEach((d) => {
    if (!grouped[d.name]) {
      grouped[d.name] = { name: d.name, totalDKK: 0, count: 0, lastMessage: '', lastCurrency: d.currency, lastAmount: d.amount, donations: [] };
    }
    grouped[d.name].totalDKK += d.amountDKK;
    grouped[d.name].count++;
    grouped[d.name].lastMessage = d.message || grouped[d.name].lastMessage;
    grouped[d.name].lastCurrency = d.currency;
    grouped[d.name].lastAmount = d.amount;
    grouped[d.name].donations.push(d);
  });
  const leaderboard = Object.values(grouped).sort((a, b) => b.totalDKK - a.totalDKK);
  const totalDKK = donations.reduce((s, d) => s + d.amountDKK, 0);
  const uniqueDonors = new Set(donations.map((d) => d.name)).size;
  const songs = donations.filter((d) => d.song);
  const unplayedSongs = songs.filter((d) => !d.songPlayed);
  const playedSongs = songs.filter((d) => d.songPlayed);
  const latest = donations.length > 0 ? donations[donations.length - 1] : null;

  // Celebration trigger
  useEffect(() => {
    if (leaderboard.length === 0) return;
    const currentTop = leaderboard[0];
    if (prevTopRef.current && prevTopRef.current !== currentTop.name && currentTop.count > 0) {
      setCelebration({ name: currentTop.name, total: Math.round(currentTop.totalDKK) });
    }
    prevTopRef.current = currentTop.name;
  }, [leaderboard]);

  const markPlayed = async (id) => {
    if (mode === 'live') {
      await fetch(`/api/donations/${id}/played`, { method: 'POST' });
      const res = await fetch('/api/donations');
      setDonations(await res.json());
    } else {
      setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, songPlayed: true } : d)));
    }
  };

  const medals = ['🥇', '🥈', '🥉'];
  const rowBgs = [
    'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30',
    'bg-gradient-to-r from-gray-400/15 to-transparent border-gray-400/25',
    'bg-gradient-to-r from-amber-700/15 to-transparent border-amber-700/25',
  ];

  return (
    <div className="min-h-screen relative">
      <FloatingHats />
      {celebration && (
        <Celebration name={celebration.name} total={celebration.total} onDone={() => setCelebration(null)} />
      )}

      <div className="relative z-10">
        {/* Header */}
        <header className="pt-6 pb-4 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl" style={{ animation: 'floatHat 3s ease-in-out infinite' }}>🎩</span>
            <h1 className="font-heading text-4xl font-black text-gold">{eventName}</h1>
          </div>
          {mode === 'live' && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
              Live
            </div>
          )}
        </header>

        {/* Stats bar */}
        <div className="px-8 mb-6">
          <div className="flex gap-6 bg-white/5 rounded-xl p-4 border border-white/10">
            <Stat label="Total Raised" value={`${Math.round(totalDKK).toLocaleString('da-DK')} DKK`} big />
            <Stat label="Donors" value={uniqueDonors} />
            <Stat label="Donations" value={donations.length} />
            <Stat label="Songs Queued" value={unplayedSongs.length} />
          </div>
        </div>

        {/* Latest donation banner */}
        {latest && (
          <div className="px-8 mb-6" key={latest.id} style={{ animation: 'slideUp 0.5s ease-out' }}>
            <div className="bg-gradient-to-r from-gold/20 to-amber/10 border border-gold/30 rounded-xl p-4 flex items-center gap-4">
              <span className="text-3xl">🎉</span>
              <div className="flex-1">
                <span className="text-gold font-semibold">{latest.name}</span>
                <span className="text-white/40 mx-2">just donated</span>
                <span className="font-mono font-bold text-amber">
                  {Math.round(latest.amountDKK).toLocaleString('da-DK')} DKK
                </span>
                {latest.currency !== 'DKK' && (
                  <span className="text-white/30 text-sm ml-2">({latest.amount} {latest.currency})</span>
                )}
                {latest.message && (
                  <span className="text-white/50 ml-3 italic">"{latest.message}"</span>
                )}
              </div>
              {latest.song && <span className="text-xl">🎵</span>}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="px-8 flex gap-6">
          {/* Leaderboard */}
          <div className="flex-1">
            <h2 className="font-heading text-xl font-bold text-white/80 mb-3">Leaderboard</h2>
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.name}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-all ${
                    i < 3 ? rowBgs[i] : 'bg-white/5 border-white/10'
                  }`}
                  style={{ animation: 'slideUp 0.4s ease-out' }}
                >
                  {/* Rank */}
                  <div className="w-10 text-center">
                    {i < 3 ? (
                      <span className="text-2xl">{medals[i]}</span>
                    ) : (
                      <span className="font-mono text-white/30 text-lg">{i + 1}</span>
                    )}
                  </div>

                  {/* Hat */}
                  <HatIcon name={entry.name} size={36} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg truncate">{entry.name}</span>
                      {entry.count > 1 && (
                        <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full">
                          {entry.count}× donated
                        </span>
                      )}
                    </div>
                    {entry.lastMessage && (
                      <p className="text-sm text-white/40 italic truncate">{entry.lastMessage}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <div className="font-mono font-bold text-lg text-gold">
                      {Math.round(entry.totalDKK).toLocaleString('da-DK')} DKK
                    </div>
                    {entry.lastCurrency !== 'DKK' && (
                      <div className="text-xs text-white/30">
                        last: {entry.lastAmount} {entry.lastCurrency}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {leaderboard.length === 0 && (
                <div className="text-center py-16 text-white/30">
                  <p className="text-4xl mb-4">🎩</p>
                  <p>Waiting for first donation...</p>
                </div>
              )}
            </div>
          </div>

          {/* Song Queue sidebar */}
          <div className="w-80 shrink-0">
            <div className="sticky top-6">
              <h2 className="font-heading text-xl font-bold text-white/80 mb-3">🎵 Song Queue</h2>
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-2 max-h-[70vh] overflow-y-auto">
                {unplayedSongs.length === 0 && playedSongs.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-4">
                    No songs requested yet.<br />
                    Donors can write "Song: ..." in their Ko-fi message!
                  </p>
                )}

                {unplayedSongs.map((d, i) => (
                  <button
                    key={d.id}
                    onClick={() => markPlayed(d.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 transition hover:bg-white/10 ${
                      i === 0 ? 'bg-gold/15 border border-gold/30' : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="text-gold">▶</span>}
                      <span className="font-semibold text-sm truncate">{d.song}</span>
                    </div>
                    <div className="text-xs text-white/30 mt-0.5">
                      {d.name} — {Math.round(d.amountDKK)} DKK
                    </div>
                  </button>
                ))}

                {playedSongs.length > 0 && (
                  <>
                    <div className="text-xs text-white/20 uppercase tracking-wider mt-4 mb-1">Played</div>
                    {playedSongs.map((d) => (
                      <div key={d.id} className="px-3 py-1.5 text-white/20 line-through text-sm truncate">
                        {d.song} — {d.name}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatHat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(5deg); }
          50% { transform: translateY(-10px) rotate(-3deg); }
          75% { transform: translateY(-25px) rotate(3deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, big }) {
  return (
    <div className="flex-1 text-center">
      <div className={`font-mono font-bold ${big ? 'text-2xl text-gold' : 'text-xl text-white'}`}>{value}</div>
      <div className="text-xs text-white/40 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// --- App root ---
export default function App() {
  const [screen, setScreen] = useState('setup');
  const [eventName, setEventName] = useState('');
  const [mode, setMode] = useState('demo');

  const handleStart = (name, m) => {
    setEventName(name);
    setMode(m);
    setScreen('leaderboard');
  };

  return screen === 'setup'
    ? <SetupScreen onStart={handleStart} />
    : <Leaderboard eventName={eventName} mode={mode} />;
}
