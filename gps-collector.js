// GPS Collector Script
// 방문자 위치 정보 수집 및 Google Sheets 저장

(function() {
  'use strict';

  // Google Apps Script 배포 URL을 여기에 붙여넣기
  const GPS_API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwqVIw38PX7giZzevABm6llVsAXtFdzZ3DiUX_-aaqa42D6FXc6fmxH3pkU8GGwmI9U/exec';

  function collectGPS() {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      saveToSheet({ error: 'Geolocation not supported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function(position) {
        const data = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer || 'direct'
        };

        console.log('GPS collected:', data);
        sessionStorage.setItem('visitorGPS', JSON.stringify(data));

        // Google Sheets로 전송
        saveToSheet(data);
      },
      function(error) {
        console.log('GPS collection failed:', error.message);
        const errorData = {
          latitude: 'denied',
          longitude: 'denied',
          accuracy: '',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer || 'direct',
          error: error.message
        };
        sessionStorage.setItem('visitorGPS', JSON.stringify(errorData));

        // 거부해도 기록
        saveToSheet(errorData);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  function saveToSheet(data) {
    if (!GPS_API_ENDPOINT || GPS_API_ENDPOINT === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
      console.log('GPS API endpoint not configured');
      return;
    }

    fetch(GPS_API_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    .then(() => {
      console.log('GPS data sent to Google Sheets');
    })
    .catch(error => {
      console.log('Failed to send GPS data:', error);
    });
  }

  // 페이지 로드 시 GPS 수집
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', collectGPS);
  } else {
    collectGPS();
  }
})();
