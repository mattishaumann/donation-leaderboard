import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// ─── Constants ────────────────────────────────────────────────────────────────
const RATES = { DKK: 1, EUR: 7.46, USD: 6.88, GBP: 8.68, SEK: 0.64, NOK: 0.64 };
const DANISH_NAMES = [
  'Lars','Mette','Søren','Camilla','Kasper','Ida','Nikolaj','Sofie',
  'Rasmus','Freja','Mikkel','Astrid','Emil','Liv','Magnus','Clara',
  'Jonas','Nanna','Viktor','Karla',
];
const DEMO_SONGS = [
  'Bohemian Rhapsody','Dancing Queen — ABBA','Take On Me','Mr. Brightside',
  'Smells Like Teen Spirit','Jolene','Billie Jean','Wonderwall',
  'Sweet Caroline',"Don't Stop Believin'",'Barbie Girl — Aqua',"Livin' on a Prayer",
  'Africa — Toto','Never Gonna Give You Up','September — Earth Wind & Fire',
];
const DEMO_MESSAGES = [
  'Great party!','Love this event!','Keep it going!','Cheers 🍻',
  'Amazing night!','','Best party ever!','Wooo!',"Let's gooo!",'',
  'This is awesome!','For the good vibes','',
];
const CURRENCIES = ['DKK','EUR','USD','GBP','SEK'];
const KOFI_URL   = 'https://ko-fi.com/norrebros';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  // Backgrounds
  pageBg:     '#0a0805',
  glass:      'rgba(6, 4, 2, 0.28)',
  glassLight: 'rgba(6, 4, 2, 0.20)',
  // Borders
  border:     'rgba(255,255,255,0.14)',
  borderHi:   'rgba(255,255,255,0.24)',
  // Text
  text:       '#f2ede4',
  textSub:    'rgba(242,237,228,0.5)',
  textMuted:  'rgba(242,237,228,0.22)',
  // Accent — warm yellow, echoes the building
  accent:     '#f0d44a',
  accentBg:   'rgba(240,212,74,0.1)',
  accentBorder:'rgba(240,212,74,0.28)',
  // Avatar palette
  avatars: ['#5b8fa8','#8a6ba8','#a86b6b','#6ba88a','#a89e6b','#6b7ea8','#a8816b','#7aa86b'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function toDKK(amount, currency) {
  return Math.round(parseFloat(amount) * (RATES[currency] || 1) * 100) / 100;
}
function fmtDKK(n) { return Math.round(n).toLocaleString('da-DK') + ' DKK'; }

// ─── useTimeAgo ───────────────────────────────────────────────────────────────
function useTimeAgo(ts) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const upd = () => {
      if (!ts) { setLabel(''); return; }
      const s = Math.floor((Date.now() - new Date(ts)) / 1000);
      if (s < 6)        setLabel('just now');
      else if (s < 60)  setLabel(`${s}s ago`);
      else              setLabel(`${Math.floor(s / 60)}m ago`);
    };
    upd();
    const id = setInterval(upd, 5000);
    return () => clearInterval(id);
  }, [ts]);
  return label;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 40 }) {
  const color = T.avatars[hashName(name) % T.avatars.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color + '28', border: `1.5px solid ${color}50`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
      fontSize: size * 0.4, color: color + 'cc',
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Eq bars ─────────────────────────────────────────────────────────────────
function EqBars({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 14 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{
          width: 3, borderRadius: 2, background: T.accent,
          animation: active ? `eq${i} ${0.65 + i * 0.18}s ease-in-out infinite alternate` : 'none',
          height: active ? undefined : 4,
        }}/>
      ))}
    </div>
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────
function Panel({ children, style = {} }) {
  return (
    <div style={{
      background: T.glass,
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', color: T.textSub, marginBottom: '0.875rem', fontFamily: "'Space Grotesk', sans-serif" }}>
      {children}
    </div>
  );
}

// ─── Celebration overlay ─────────────────────────────────────────────────────
function Celebration({ name, total, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:99, background:'rgba(10,8,5,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', animation:'fadeIn 0.35s' }}>
      <div style={{ textAlign:'center', animation:'popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)' }}>
        <div style={{ fontSize:'0.7rem', letterSpacing:'0.24em', color:T.textSub, marginBottom:14 }}>NEW #1 DONOR</div>
        <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'clamp(3.5rem,8vw,6rem)', color:T.accent, lineHeight:1, marginBottom:12 }}>{name}</div>
        <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'1.6rem', color:T.text, opacity:0.85 }}>{fmtDKK(total)}</div>
      </div>
    </div>
  );
}

// ─── Setup screen ─────────────────────────────────────────────────────────────
function SetupScreen({ onStart }) {
  const [eventName,   setEventName]   = useState('Hat Party 2026');
  const [mode,        setMode]        = useState('demo');
  const [kofiUrl,     setKofiUrl]     = useState(KOFI_URL);
  const [minDonation, setMinDonation] = useState('10');

  return (
    <div style={{ minHeight:'100vh', background:T.pageBg, backgroundImage:'url(/bg.png)', backgroundSize:'cover', backgroundPosition:'center bottom', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'fixed', inset:0, background:'rgba(10,8,5,0.82)' }}/>
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:420, padding:'0 20px' }}>
        <div style={{ marginBottom:'2rem' }}>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'2.8rem', color:T.accent, letterSpacing:'0.06em', lineHeight:1 }}>NØRREBROS</div>
          <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontWeight:600, fontSize:'1rem', color:T.textSub, letterSpacing:'0.05em', marginTop:4 }}>DONATION LEADERBOARD</div>
        </div>

        <Panel style={{ padding:'2rem' }}>
          {[
            { label:'Event name',         val:eventName,   set:setEventName,   type:'text',   ph:'' },
            { label:'Ko-fi URL',          val:kofiUrl,     set:setKofiUrl,     type:'text',   ph:'https://ko-fi.com/yourname' },
            { label:'Min. donation (DKK)',val:minDonation, set:setMinDonation, type:'number', ph:'' },
          ].map(({ label, val, set, type, ph }) => (
            <div key={label} style={{ marginBottom:'1rem' }}>
              <div style={{ fontSize:'0.65rem', letterSpacing:'0.16em', color:T.textSub, marginBottom:5 }}>{label.toUpperCase()}</div>
              <input type={type} value={val} placeholder={ph} onChange={e => set(e.target.value)} style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:`1px solid ${T.border}`, borderRadius:8, padding:'10px 13px', color:T.text, fontFamily:"'Space Grotesk', sans-serif", fontSize:'0.9rem', outline:'none' }}/>
            </div>
          ))}

          <div style={{ marginBottom:'1.5rem' }}>
            <div style={{ fontSize:'0.65rem', letterSpacing:'0.16em', color:T.textSub, marginBottom:7 }}>MODE</div>
            <div style={{ display:'flex', gap:8 }}>
              {['demo','live'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:'9px 0', borderRadius:8, border:`1px solid ${mode===m ? T.accent : T.border}`, background: mode===m ? T.accentBg : 'transparent', color: mode===m ? T.accent : T.textSub, fontFamily:"'Space Grotesk', sans-serif", fontWeight:600, fontSize:'0.82rem', cursor:'pointer', letterSpacing:'0.04em' }}>
                  {m === 'demo' ? 'Demo' : 'Live (Ko-fi)'}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => onStart(eventName, mode, kofiUrl, minDonation)} style={{ width:'100%', padding:'12px', borderRadius:10, background:T.accent, border:'none', cursor:'pointer', fontFamily:"'Space Grotesk', sans-serif", fontWeight:700, fontSize:'0.95rem', color:'#0a0805', letterSpacing:'0.04em' }}>
            Launch →
          </button>
        </Panel>
      </div>
    </div>
  );
}

// ─── Recent donation row ──────────────────────────────────────────────────────
function RecentItem({ donation: d, fresh }) {
  const ago = useTimeAgo(d.timestamp);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.4rem 0.6rem', borderRadius:8, background: fresh ? T.accentBg : 'transparent', border:`1px solid ${fresh ? T.accentBorder : 'transparent'}`, animation:'fadeSlideIn 0.35s ease-out' }}>
      <Avatar name={d.name} size={26}/>
      <div style={{ flex:1, minWidth:0 }}>
        <span style={{ fontWeight:600, fontSize:'0.82rem', color: fresh ? T.accent : T.text }}>{d.name}</span>
        {d.song && <span style={{ fontSize:'0.7rem', color:T.textSub, marginLeft:6 }}>♫ {d.songHidden ? 'mystery song' : d.song}</span>}
        {!d.song && d.message && <span style={{ fontSize:'0.7rem', color:T.textSub, marginLeft:6, fontStyle:'italic' }}>"{d.message}"</span>}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.8rem', color: fresh ? T.accent : T.text, whiteSpace:'nowrap' }}>{fmtDKK(d.amountDKK)}</div>
        {ago && <div style={{ fontSize:'0.6rem', color:T.textMuted, marginTop:1 }}>{ago}</div>}
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
function Leaderboard({ eventName, mode, kofiUrl, minDonation }) {
  const [donations,    setDonations]    = useState([]);
  const [celebration,  setCelebration]  = useState(null);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [spotifyQueue, setSpotifyQueue] = useState({ connected:false, currently_playing:null, is_playing:false, queue:[] });

  const prevTopRef  = useRef(null);
  const demoIdRef   = useRef(100);
  const seededRef   = useRef(false);

  const makeDemoDonation = useCallback(() => {
    const name     = DANISH_NAMES[Math.floor(Math.random() * DANISH_NAMES.length)];
    const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const base     = 20 + Math.floor(Math.random() * 380);
    const amount   = currency === 'DKK' ? base : Math.round(base / (RATES[currency] || 1) * 100) / 100;
    const hasSong  = Math.random() < 0.4;
    const song     = hasSong ? DEMO_SONGS[Math.floor(Math.random() * DEMO_SONGS.length)] : null;
    const message  = song
      ? (Math.random() < 0.5 ? `Song: ${song}` : `🎵 ${song}`)
      : DEMO_MESSAGES[Math.floor(Math.random() * DEMO_MESSAGES.length)];
    return { id:demoIdRef.current++, name, message, song, songPlayed:false, songHidden:false, amount, currency, amountDKK:toDKK(amount,currency), timestamp:new Date().toISOString(), isPublic:true };
  }, []);

  useEffect(() => {
    if (mode !== 'demo' || seededRef.current) return;
    seededRef.current = true;
    setDonations(Array.from({ length:14 }, () => makeDemoDonation()));
    setLastUpdated(new Date().toISOString());
  }, [mode, makeDemoDonation]);

  useEffect(() => {
    if (mode !== 'demo') return;
    const id = setInterval(() => { setDonations(p => [...p, makeDemoDonation()]); setLastUpdated(new Date().toISOString()); }, 4000);
    return () => clearInterval(id);
  }, [mode, makeDemoDonation]);

  useEffect(() => {
    if (mode !== 'live') return;
    const poll = () => fetch('/api/donations').then(r=>r.json()).then(d=>{ setDonations(d); setLastUpdated(new Date().toISOString()); }).catch(()=>{});
    poll(); const id = setInterval(poll, 3000); return () => clearInterval(id);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'live') return;
    const poll = () => fetch('/api/spotify/queue').then(r=>r.json()).then(setSpotifyQueue).catch(()=>{});
    poll(); const id = setInterval(poll, 5000); return () => clearInterval(id);
  }, [mode]);

  // Derived data
  const grouped = {};
  donations.forEach(d => {
    if (!grouped[d.name]) grouped[d.name] = { name:d.name, totalDKK:0, count:0, donations:[], lastSong:null };
    grouped[d.name].totalDKK   += d.amountDKK;
    grouped[d.name].count++;
    grouped[d.name].donations.push(d);
    if (d.song) grouped[d.name].lastSong = d;
  });
  const leaderboard   = Object.values(grouped).sort((a,b) => b.totalDKK - a.totalDKK);
  const maxDKK        = leaderboard[0]?.totalDKK || 1;
  const totalRaised   = donations.reduce((s,d) => s + d.amountDKK, 0);
  const uniqueDonors  = new Set(donations.map(d => d.name)).size;
  const unplayedSongs = donations.filter(d => d.song && !d.songPlayed);
  const recent        = [...donations].reverse().slice(0,6);

  useEffect(() => {
    if (!leaderboard.length) return;
    const top = leaderboard[0];
    if (prevTopRef.current && prevTopRef.current !== top.name) setCelebration({ name:top.name, total:top.totalDKK });
    prevTopRef.current = top.name;
  }, [leaderboard.map(e=>e.name).join(',')]);

  const timeAgo    = useTimeAgo(lastUpdated);
  const nowPlaying = mode === 'live' && spotifyQueue.connected && spotifyQueue.currently_playing ? spotifyQueue.currently_playing : null;
  const demoTrack  = mode === 'demo' && unplayedSongs.length > 0 ? unplayedSongs[0] : null;
  const donateUrl  = kofiUrl || KOFI_URL;
  const donateDisp = donateUrl.replace(/^https?:\/\//, '');

  return (
    <div style={{ minHeight:'100vh', fontFamily:"'Space Grotesk', sans-serif", color:T.text, position:'relative', overflow:'hidden' }}>

      {/* Background image */}
      <div style={{ position:'fixed', inset:0, backgroundImage:'url(/bg.png)', backgroundSize:'cover', backgroundPosition:'center bottom', zIndex:0 }}/>
      {/* Dark overlay */}
      <div style={{ position:'fixed', inset:0, background:'linear-gradient(180deg, rgba(8,6,3,0.35) 0%, rgba(8,6,3,0.1) 30%, rgba(8,6,3,0.1) 70%, rgba(8,6,3,0.4) 100%)', zIndex:1 }}/>

      {celebration && <Celebration name={celebration.name} total={celebration.total} onDone={() => setCelebration(null)}/>}

      {/* Layout */}
      <div style={{ position:'relative', zIndex:2, display:'grid', gridTemplateRows:'auto 1fr', minHeight:'100vh', padding:'1.5rem', gap:'1.25rem' }}>

        {/* ── Header ── */}
        <Panel style={{ padding:'0.875rem 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:'1rem' }}>
            <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'clamp(1.6rem, 3vw, 2.4rem)', color:T.accent, letterSpacing:'0.06em', lineHeight:1 }}>NØRREBROS</span>
            <span style={{ fontWeight:600, fontSize:'clamp(0.85rem, 1.4vw, 1.05rem)', color:T.text, letterSpacing:'-0.01em' }}>{eventName}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.625rem' }}>
            {[
              { v: Math.round(totalRaised).toLocaleString('da-DK') + ' DKK', l:'' },
              { v: String(uniqueDonors), l: uniqueDonors === 1 ? 'donor' : 'donors' },
              { v: String(unplayedSongs.length), l:'queued' },
            ].map(({ v, l }) => (
              <div key={l||v} style={{ background:T.glassLight, border:`1px solid ${T.border}`, borderRadius:20, padding:'4px 13px', display:'flex', alignItems:'center', gap:'0.35rem' }}>
                <span style={{ fontFamily:"'DM Mono', monospace", fontWeight:500, fontSize:'0.82rem', color:T.text }}>{v}</span>
                {l && <span style={{ fontSize:'0.68rem', color:T.textSub }}>{l}</span>}
              </div>
            ))}
            {mode === 'live' && (
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#4caf50', animation:'pulse 2s infinite' }}/>
                <span style={{ fontSize:'0.68rem', letterSpacing:'0.14em', color:T.textSub }}>LIVE</span>
              </div>
            )}
          </div>
        </Panel>

        {/* ── Body grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr clamp(280px,29vw,360px)', gap:'1.25rem', minHeight:0 }}>

          {/* Leaderboard */}
          <Panel style={{ padding:'1.5rem', overflowY:'auto', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.625rem' }}>
                <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'1.1rem', color:T.text, letterSpacing:'0.12em' }}>LEADERBOARD</span>
              </div>
              {timeAgo && <span style={{ fontSize:'0.65rem', color:T.textMuted }}>{timeAgo}</span>}
            </div>

            <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
              {leaderboard.slice(0,10).map((entry, i) => {
                const isFirst = i === 0;
                const pct     = (entry.totalDKK / maxDKK) * 100;
                const song    = entry.lastSong;
                const songLbl = song?.songHidden ? 'Mystery song' : song?.song;

                return (
                  <div key={entry.name} style={{
                    display:'flex', alignItems:'center', gap:'0.875rem',
                    padding: isFirst ? '1rem 0.875rem' : '0.65rem 0.875rem',
                    marginBottom: isFirst ? '0.625rem' : '0.125rem',
                    borderRadius:10,
                    background: isFirst ? T.accentBg : i < 3 ? 'rgba(255,255,255,0.03)' : 'transparent',
                    border:`1px solid ${isFirst ? T.accentBorder : i < 3 ? T.border : 'transparent'}`,
                    animation:'fadeSlideIn 0.4s ease-out',
                  }}>
                    {/* Rank */}
                    <div style={{ width:30, textAlign:'right', flexShrink:0, fontFamily:"'DM Mono', monospace", fontWeight:500, fontSize: isFirst ? '1rem' : '0.8rem', color: isFirst ? T.accent : i < 3 ? T.textSub : T.textMuted }}>
                      {i + 1}
                    </div>

                    <Avatar name={entry.name} size={isFirst ? 44 : 34}/>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{ fontWeight: isFirst ? 700 : i < 3 ? 600 : 500, fontSize: isFirst ? 'clamp(1.05rem,1.7vw,1.3rem)' : 'clamp(0.88rem,1.2vw,1rem)', color: isFirst ? T.accent : i < 3 ? T.text : 'rgba(242,237,228,0.6)', letterSpacing:'-0.01em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {entry.name}
                        </span>
                        {entry.count > 1 && <span style={{ fontSize:'0.62rem', color:T.textSub, background:'rgba(255,255,255,0.07)', padding:'1px 6px', borderRadius:20 }}>{entry.count}×</span>}
                      </div>
                      {songLbl && (
                        <div style={{ fontSize:'0.68rem', color:T.textSub, marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                          <span>{song?.songHidden ? '🔒' : '♫'}</span>
                          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{songLbl}</span>
                        </div>
                      )}
                      <div style={{ marginTop: isFirst ? 8 : 5, height: isFirst ? 2 : 1, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', borderRadius:2, background: isFirst ? T.accent : i < 3 ? 'rgba(242,237,228,0.28)' : 'rgba(242,237,228,0.1)', transition:'width 0.9s ease' }}/>
                      </div>
                    </div>

                    <div style={{ fontFamily:"'DM Mono', monospace", fontWeight:500, flexShrink:0, fontSize: isFirst ? 'clamp(1rem,1.5vw,1.15rem)' : 'clamp(0.82rem,1.1vw,0.92rem)', color: isFirst ? T.accent : i < 3 ? T.text : 'rgba(242,237,228,0.5)', whiteSpace:'nowrap' }}>
                      {fmtDKK(entry.totalDKK)}
                    </div>
                  </div>
                );
              })}

              {leaderboard.length === 0 && (
                <div style={{ textAlign:'center', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:T.textMuted }}>
                  <div style={{ fontSize:'2rem', marginBottom:10 }}>—</div>
                  <div style={{ fontSize:'0.82rem', letterSpacing:'0.08em' }}>Waiting for donations</div>
                </div>
              )}
            </div>
          </Panel>

          {/* Right column */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem', minHeight:0, overflowY:'auto' }}>

            {/* Now Playing */}
            <Panel style={{ padding:'1.25rem 1.25rem 1.35rem' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
                <SectionLabel>NOW PLAYING</SectionLabel>
                <EqBars active={!!(nowPlaying || demoTrack)}/>
              </div>
              {(nowPlaying || demoTrack) ? (
                <div style={{ display:'flex', gap:'0.875rem', alignItems:'center' }}>
                  {nowPlaying?.art
                    ? <img src={nowPlaying.art} alt="" style={{ width:54, height:54, borderRadius:7, flexShrink:0, objectFit:'cover' }}/>
                    : <div style={{ width:54, height:54, borderRadius:7, flexShrink:0, background:'rgba(255,255,255,0.06)', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem' }}>
                        {demoTrack?.songHidden ? '🔒' : '♫'}
                      </div>
                  }
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'clamp(0.92rem,1.4vw,1.05rem)', color:T.text, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.2 }}>
                      {nowPlaying?.name || (demoTrack?.songHidden ? 'Mystery Song' : demoTrack?.song)}
                    </div>
                    <div style={{ fontSize:'0.78rem', color:T.textSub }}>
                      {nowPlaying?.artist || (demoTrack ? `Requested by ${demoTrack.name}` : '')}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color:T.textMuted, fontSize:'0.82rem' }}>Nothing queued yet</div>
              )}
            </Panel>

            {/* Recent donations */}
            <Panel style={{ padding:'1.25rem', flex:'1 1 auto', overflowY:'auto', minHeight:0 }}>
              <SectionLabel>RECENT DONATIONS</SectionLabel>
              {recent.length === 0
                ? <div style={{ color:T.textMuted, fontSize:'0.82rem' }}>—</div>
                : <div style={{ display:'flex', flexDirection:'column', gap:'0.375rem' }}>
                    {recent.map((d,i) => <RecentItem key={d.id} donation={d} fresh={i===0}/>)}
                  </div>
              }
            </Panel>

            {/* Donate */}
            <Panel style={{ padding:'1.25rem' }}>
              <SectionLabel>DONATE &amp; GET YOUR SONG PLAYED</SectionLabel>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.875rem' }}>
                <div style={{ background:'white', padding:10, borderRadius:12 }}>
                  <QRCodeSVG value={donateUrl} size={170} level="M"/>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:700, fontSize:'clamp(0.95rem,1.4vw,1.1rem)', color:T.text, marginBottom:4, wordBreak:'break-all' }}>
                    {donateDisp}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:T.textSub, marginBottom:8 }}>
                    Scan to donate &amp; get your song played
                  </div>
                  {minDonation && (
                    <div style={{ display:'inline-block', background:T.accentBg, border:`1px solid ${T.accentBorder}`, borderRadius:20, padding:'3px 12px', fontSize:'0.72rem', color:T.accent, letterSpacing:'0.06em' }}>
                      min. {minDonation} DKK
                    </div>
                  )}
                </div>
              </div>
            </Panel>

          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes fadeIn      { from { opacity:0; }                         to { opacity:1; } }
        @keyframes popIn       { from { opacity:0; transform:scale(0.8); }  to { opacity:1; transform:scale(1); } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse       { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes eq1         { from { height:4px; }  to { height:13px; } }
        @keyframes eq2         { from { height:9px; }  to { height:4px;  } }
        @keyframes eq3         { from { height:3px; }  to { height:12px; } }
        ::-webkit-scrollbar            { width: 4px; }
        ::-webkit-scrollbar-track      { background: transparent; }
        ::-webkit-scrollbar-thumb      { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('setup');
  const [cfg,    setCfg]    = useState({ eventName:'', mode:'demo', kofiUrl:KOFI_URL, minDonation:'10' });

  return screen === 'setup'
    ? <SetupScreen onStart={(eventName, mode, kofiUrl, minDonation) => { setCfg({ eventName, mode, kofiUrl, minDonation }); setScreen('leaderboard'); }}/>
    : <Leaderboard {...cfg}/>;
}
