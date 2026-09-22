'use strict';
/* Visitor log + guestbook backend helpers (unchanged from the previous site). */
/* ─── GPS & fingerprinting ─── */
const GPS_API = 'https://script.google.com/macros/s/AKfycbwqVIw38PX7giZzevABm6llVsAXtFdzZ3DiUX_-aaqa42D6FXc6fmxH3pkU8GGwmI9U/exec';
const GUESTBOOK_API = 'https://script.google.com/macros/s/AKfycbx0cx9MLj0ngnBkJV7LqFiS58JiZpzvMmC4Npoh6ZTvlwtcOSKy_nYpQHdP8wKa_0g/exec';
const ENTRIES_PER_PAGE = 7;

function getCanvasFingerprint() {
  try {
    const c = document.createElement('canvas'), ctx = c.getContext('2d');
    c.width = 200; c.height = 50;
    ctx.textBaseline = 'top'; ctx.font = '14px Arial';
    ctx.fillStyle = '#f60'; ctx.fillRect(0,0,100,50);
    ctx.fillStyle = '#069'; ctx.fillText('fp',2,15);
    const d = c.toDataURL(); let h = 0;
    for (let i = 0; i < d.length; i++) { h = ((h<<5)-h)+d.charCodeAt(i); h = h & h; }
    return Math.abs(h).toString(16).toUpperCase().slice(0,8);
  } catch(e){ return 'N/A'; }
}

function getGPU() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl')||c.getContext('experimental-webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)||'') : (gl.getParameter(gl.RENDERER)||'');
  } catch(e){ return ''; }
}

function getDeviceString() {
  try {
    const ua = navigator.userAgent, w = screen.width, h = screen.height, r = window.devicePixelRatio||1;
    const gpu = getGPU(), cores = navigator.hardwareConcurrency||0, mem = navigator.deviceMemory||0, fp = getCanvasFingerprint();
    let model = 'Unknown';
    if (/iPhone/.test(ua)) {
      const k = `${Math.min(w,h)}x${Math.max(w,h)}@${r}`;
      const m = {'402x874@3':'iPhone 16 Pro','393x852@3':'iPhone 16/15/14 Pro','390x844@3':'iPhone 14/13/12','375x812@3':'iPhone X/XS/11Pro','414x896@2':'iPhone XR/11','375x667@2':'iPhone SE/6/7/8'};
      model = m[k] || `iPhone (${w}x${h})`;
    } else if (/iPad/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)) {
      model = `iPad (${w}x${h})`;
    } else if (/Macintosh/.test(ua)) {
      const g = gpu.toLowerCase();
      model = g.includes('m3 max')?'Mac M3 Max':g.includes('m3 pro')?'Mac M3 Pro':g.includes('m3')?'Mac M3':g.includes('m2 max')?'Mac M2 Max':g.includes('m2 pro')?'Mac M2 Pro':g.includes('m2')?'Mac M2':g.includes('m1 max')?'Mac M1 Max':g.includes('m1 pro')?'Mac M1 Pro':g.includes('m1')?'Mac M1':'Mac (Intel)';
    } else if (/Android/.test(ua)) {
      const match = ua.match(/Android[^;]*;\s*([A-Za-z0-9\-_\s]+)\s*Build/);
      model = match ? match[1].trim() : 'Android';
    } else if (/Windows/.test(ua)) { model = 'Windows PC'; }
    return [model,`${w}x${h}`,cores?`${cores}코어`:'',mem?`${mem}GB`:'',`FP:${fp}`].filter(Boolean).join(' | ');
  } catch(e){ return 'Unknown Device'; }
}

function getOS() {
  const ua = navigator.userAgent;
  if (/iPhone OS (\d+[_\d]*)/.test(ua)) return 'iOS '+ua.match(/iPhone OS (\d+[_\d]*)/)[1].replace(/_/g,'.');
  if (/Android (\d+[.\d]*)/.test(ua)) return 'Android '+ua.match(/Android (\d+[.\d]*)/)[1];
  if (/Mac OS X (\d+[_\d]*)/.test(ua)) return 'macOS '+ua.match(/Mac OS X (\d+[_\d]*)/)[1].replace(/_/g,'.');
  if (/Windows NT ([\d.]+)/.test(ua)) return 'Windows '+({'10.0':'10/11','6.3':'8.1','6.1':'7'}[ua.match(/Windows NT ([\d.]+)/)[1]]||'');
  return 'Unknown';
}

function getBrowser() {
  const ua = navigator.userAgent;
  if (/Instagram/.test(ua)) return 'Instagram';
  if (/KAKAOTALK/.test(ua)) return 'KakaoTalk';
  if (/Edg\/(\d+)/.test(ua)) return 'Edge '+(ua.match(/Edg\/(\d+)/)?.[1]||'');
  if (/Firefox\/(\d+)/.test(ua)) return 'Firefox '+(ua.match(/Firefox\/(\d+)/)?.[1]||'');
  if (/Chrome\/(\d+)/.test(ua)&&!/Chromium/.test(ua)) return 'Chrome '+(ua.match(/Chrome\/(\d+)/)?.[1]||'');
  if (/Safari\//.test(ua)&&!/Chrome/.test(ua)) return 'Safari '+(ua.match(/Version\/(\d+)/)?.[1]||'');
  return 'Unknown';
}

function getGPSLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p => resolve({lat:p.coords.latitude, lon:p.coords.longitude}),
      () => resolve(null),
      {timeout:10000, enableHighAccuracy:true}
    );
  });
}

async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`);
    const d = await r.json();
    return {
      city: d.address?.city||d.address?.town||d.address?.village||d.address?.county||'',
      region: d.address?.state||d.address?.province||'',
      country: d.address?.country||'',
      countryCode: (d.address?.country_code||'').toUpperCase(),
      postal: d.address?.postcode||''
    };
  } catch(e){ return null; }
}

async function getLocationInfo() {
  let ip = {};
  try {
    const r = await fetch('https://ipwho.is/'); const d = await r.json();
    if (d.success) ip = {ip:d.ip||'',country:d.country||'',countryCode:d.country_code||'',region:d.region||'',city:d.city||'',postal:d.postal||'',lat:d.latitude||'',lon:d.longitude||'',tz:d.timezone?.id||'',isp:d.connection?.isp||'',asn:d.connection?.asn?`AS${d.connection.asn}`:''};
  } catch(e){}
  if (!ip.ip) {
    try {
      const r = await fetch('https://ipapi.co/json/'); const d = await r.json();
      if (!d.error) ip = {ip:d.ip||'',country:d.country_name||'',countryCode:d.country_code||'',region:d.region||'',city:d.city||'',postal:d.postal||'',lat:d.latitude||'',lon:d.longitude||'',tz:d.timezone||'',isp:d.org||'',asn:d.asn||''};
    } catch(e){}
  }
  const gps = await getGPSLocation();
  if (gps?.lat && gps?.lon) {
    const geo = await reverseGeocode(gps.lat, gps.lon);
    return {...ip, country:geo?.country||ip.country||'', countryCode:geo?.countryCode||ip.countryCode||'', region:geo?.region||ip.region||'', city:geo?.city||ip.city||'', postal:geo?.postal||ip.postal||'', lat:gps.lat, lon:gps.lon, source:'GPS'};
  }
  return {...ip, source:'IP'};
}

function formatLocationData(loc) {
  const country = loc.country ? (loc.country+(loc.countryCode?` (${loc.countryCode})`:'')):  '';
  let city = loc.source==='GPS'?'[GPS] ':'';
  if (loc.city) city += loc.city;
  if (loc.region && loc.region!==loc.city) city += (loc.city?', ':'')+loc.region;
  if (loc.postal) city += ` (${loc.postal})`;
  if (loc.lat && loc.lon) city += ` | ${Number(loc.lat).toFixed(4)},${Number(loc.lon).toFixed(4)}`;
  const isp = loc.isp?(loc.isp+(loc.asn?` (${loc.asn})`:'')):'';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone||'';
  const langs = navigator.languages?navigator.languages.join(', '):navigator.language;
  const language = langs+(tz?` | ${tz}`:'');
  return {country, city, isp, language};
}

async function collectGPS() {
  try {
    const loc = await getLocationInfo();
    const {country, city, isp, language} = formatLocationData(loc);
    await fetch(GPS_API, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ip:loc.ip||'', country, city, isp, device:getDeviceString(), os:getOS(), browser:getBrowser(), language})
    });
  } catch(e){}
}

/* ═══ v2 interface ═══ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const isMobile = () => matchMedia('(max-width: 720px)').matches;

/* first interaction of the session → visitor log (same trigger as the old gate) */
let logged = !!sessionStorage.getItem('gateEntered');
function logOnce() { if (logged) return; logged = true; sessionStorage.setItem('gateEntered', '1'); collectGPS(); }
document.addEventListener('click', logOnce, { once: true });
document.addEventListener('keydown', logOnce, { once: true });

/* ─── views ─── */
let current = 'home';
function show(id, { buzz = false } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  if (isMobile()) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    $$('#site .view').forEach(v => v.classList.toggle('on', v === el));
    window.scrollTo(0, 0);
  }
  current = id;
  if (id === 'say' && buzz) {
    el.classList.remove('buzz'); void el.offsetWidth; el.classList.add('buzz', 'dim');
    setTimeout(() => el.classList.remove('dim'), 60);
  }
  if (id === 'wall') loadGuestbook();
}
const goHome = () => (isMobile() ? window.scrollTo({ top: 0, behavior: 'smooth' }) : show('home'));

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { e.preventDefault(); show(go.dataset.go, { buzz: go.dataset.go === 'say' }); return; }
  if (e.target.closest('[data-home]')) { e.preventDefault(); goHome(); return; }
  if (e.target.closest('[data-close-alert]')) { $('#alert').classList.add('gone'); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.body.classList.contains('booting') && current !== 'home') goHome();
});

/* ─── boot: stepped loading bar → zoom into the LCD → home ─── */
const STEPS = [8, 22, 35, 41, 58, 72, 86, 100];
const WAITS = [1000, 700, 600, 1100, 500, 600, 700, 800];
let booted = false;
function finishBoot() {
  if (booted) return; booted = true;
  const flash = $('#flash');
  $('#boot').classList.add('zoom');
  flash.classList.add('on');
  setTimeout(() => {
    document.body.classList.remove('booting');
    show('home');
    window.scrollTo(0, 0);
    requestAnimationFrame(() => flash.classList.remove('on'));
  }, 600);
}
(function boot() {
  const fill = $('#boot-fill');
  if (sessionStorage.getItem('booted') || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    fill.style.width = '100%'; setTimeout(finishBoot, 400); return;
  }
  let i = 0;
  const tick = () => {
    fill.style.width = STEPS[i] + '%';
    if (i === STEPS.length - 1) { sessionStorage.setItem('booted', '1'); setTimeout(finishBoot, WAITS[i]); return; }
    setTimeout(tick, WAITS[i++]);
  };
  tick();
})();
$$('[data-skip]').forEach(b => b.addEventListener('click', () => { $('#boot-fill').style.width = '100%'; setTimeout(finishBoot, 250); }));

/* ─── guestbook ─── */
let entries = [], pending = null, rating = 0;
const fmtDate = d => { if (!d) return ''; const t = new Date(d); return isNaN(t) ? String(d) : `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, '0')}.${String(t.getDate()).padStart(2, '0')}`; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderGuestbook() {
  const list = $('#gb-list'), info = $('#gb-info');
  list.querySelectorAll('.lr').forEach(r => r.remove());
  const rows = [...entries].reverse();
  if (pending) rows.unshift({ ...pending, isNew: true });
  if (!rows.length) {
    list.insertAdjacentHTML('beforeend', '<div class="lr gb-row"><div><b>system</b></div><div>No visitors yet. Be the first to leave a message ✦</div><div class="na">—</div></div>');
    info.textContent = '0 entries';
    return;
  }
  for (const e of rows) {
    const stars = e.isNew && e.rating ? `<span class="stars-mini">${'★'.repeat(e.rating)}${'☆'.repeat(5 - e.rating)}</span>` : '';
    list.insertAdjacentHTML('beforeend',
      `<div class="lr gb-row${e.isNew ? ' new' : ''}"><div><b>${esc(e.name || 'Anonymous')}${stars}</b></div><div>${esc(e.message)}</div><div${e.date || e.isNew ? '' : ' class="na"'}>${esc(e.isNew ? 'today' : (fmtDate(e.date) || '—'))}</div></div>`);
  }
  info.textContent = `${rows.length} entries${pending ? ', 1 new' : ''}`;
}
let loading = null;
function loadGuestbook() {
  if (loading) return loading;
  loading = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(GUESTBOOK_API);
        const data = await res.json();
        if (Array.isArray(data)) {
          entries = data;
          if (pending && entries.some(e => e.name === pending.name && e.message === pending.message)) pending = null;
          break;
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 1200));
    }
    loading = null;
    renderGuestbook();
    if (!entries.length && !pending) $('#gb-info').textContent = 'could not load entries';
  })();
  return loading;
}
async function saveToGuestbook(name, message) {
  try {
    const loc = await getLocationInfo();
    const { country, city, isp, language } = formatLocationData(loc);
    await fetch(GUESTBOOK_API, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.slice(0, 30), message: message.slice(0, 100), ip: loc.ip || '', country, city, isp, device: getDeviceString(), os: getOS(), browser: getBrowser(), language })
    });
    setTimeout(loadGuestbook, 1500);
  } catch (e) {}
}

/* rating stars — shown next to your own note; not sent anywhere */
const starBtns = $$('#rate-stars button');
const paint = n => starBtns.forEach((b, i) => { b.classList.toggle('on', i < n); b.setAttribute('aria-checked', i < n); });
starBtns.forEach(b => {
  b.setAttribute('role', 'radio');
  b.addEventListener('mouseenter', () => paint(+b.dataset.v));
  b.addEventListener('click', () => { rating = +b.dataset.v; paint(rating); });
});
$('#rate-stars').addEventListener('mouseleave', () => paint(rating));

$('#gb-name').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('#gb-message').focus(); } });
$('#gb-form').addEventListener('submit', e => {
  e.preventDefault();
  const message = $('#gb-message').value.trim();
  const name = $('#gb-name').value.trim() || 'Anonymous';
  if (message) {
    pending = { name, message, rating };
    saveToGuestbook(name, message);
    $('#gb-message').value = ''; $('#gb-name').value = '';
    rating = 0; paint(0);
  }
  renderGuestbook();
  show('wall');
});

loadGuestbook();
