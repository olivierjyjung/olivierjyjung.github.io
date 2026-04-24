// Google Apps Script - GPS 데이터 저장용
// 사용법:
// 1. Google Sheets에서 새 스프레드시트 생성
// 2. 확장 프로그램 > Apps Script 클릭
// 3. 아래 코드를 붙여넣기
// 4. 배포 > 새 배포 > 웹 앱 선택
// 5. 액세스: "모든 사용자" 선택
// 6. 배포 후 URL 복사해서 gps-collector.js의 GPS_API_ENDPOINT에 붙여넣기
// 7. 기존 배포가 있다면 "배포 관리"에서 새 버전으로 배포해야 함

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // 첫 번째 행이 비어있으면 헤더 추가
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'IP', 'Country', 'City', 'ISP', 'Device', 'OS', 'Browser', 'Language']);
    }

    // 데이터 추가
    sheet.appendRow([
      new Date().toISOString(),
      data.ip || '',
      data.country || '',
      data.city || '',
      data.isp || '',
      data.device || '',
      data.os || '',
      data.browser || '',
      data.language || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ message: 'GPS Collector API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
