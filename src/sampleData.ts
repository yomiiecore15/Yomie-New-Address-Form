import { PostalCodeData, SheetConfig } from './types';

export const DEFAULT_MESSAGES = {
  welcomeTh: "เช็คเขตพื้นที่ห่างไกล",
  subtitleTh: "กรอกรหัสไปรษณีย์ 5 หลัก เพื่อตรวจสอบค่าบริการจัดส่งเพิ่มเติม",
  searchPlaceholderTh: "เช่น 50240, 81150, 10110",
  searchingTh: "กำลังตรวจสอบพื้นที่...",
  notFoundTh: "ไม่พบรหัสไปรษณีย์นี้ในเขตพื้นที่ห่างไกล",
  notFoundSubTh: "รหัสไปรษณีย์นี้ จัดส่งราคาปกติ ไม่มีเก็บส่วนต่าง 20 บาทเพิ่มเติมค่ะ",
  foundTh: "รหัสไปรษณีย์นี้อยู่ใน 'เขตพื้นที่ห่างไกล'",
};

export const INITIAL_CONFIG: SheetConfig = {
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1Iwdv0S8JPMcb1ZL6xIwr7B-cKuN75QvpqPgbS1r1wco/edit?usp=sharing",
  spreadsheetId: "1Iwdv0S8JPMcb1ZL6xIwr7B-cKuN75QvpqPgbS1r1wco",
  sheetName: "พื้นที่จัดส่งห่างไกล",
  isConfigured: true,
  useFallbackSample: false,
  appsScriptUrl: "https://hook.us2.make.com/302fbs3gh24rtoa3ryb2t7a6hzfp5j9t",
  lineToken: "",
  lineChannelAccessToken: "CgMDBf8lmjLgU3AER4RlNV1bShUmK06pL/432y6yAgvgiuId7YCOG45Ig+AfVxgh4qy9/jl+5BEQ8xW3cw3F3+O3BNMJ77lVGmuwYuAj9KQPVLhkhy96UBghfh+rDxo4aOLpgL9uM93JvRrI5F0yhQdB04t89/1O/w1cDnyilFU=",
  lineGroupId: "Ccb8f5db20f90979531527e7f94ea9873",
  shopName: "@yomiie.core",
  bankName: "กรุงศรี (Krungsri)",
  bankAccount: "7751078129",
  bankOwner: "พัชราภา อรุณปรีย์",
  promptPay: "0991234567",
  customQuestions: [],
  senderEmail: "yomiie.core15@gmail.com",
  senderAppPass: "cfij sfay bdij uckq",
  backendUrl: "",
};

/**
 * Resolves the correct backend URL dynamically.
 * If running on Cloud Run, use relative paths.
 * If running on a custom domain/GitHub Pages, use the saved backendUrl or fall back to the live Cloud Run production URL.
 */
export function getBackendUrl(configBackendUrl?: string): string {
  const hostname = window.location.hostname;
  const isLocalOrWorkspace = 
    hostname.includes("run.app") ||
    hostname.includes("localhost") ||
    hostname === "127.0.0.1" ||
    hostname.includes("googleusercontent.com") ||
    hostname.includes("webcontainer.io");

  // ALWAYS force local relative routing when running inside the workspace, preview, or development server
  if (isLocalOrWorkspace) {
    return "";
  }

  if (configBackendUrl && configBackendUrl.trim() !== "") {
    const trimmed = configBackendUrl.trim();
    // Skip if they erroneously set backend URL to their static frontend hosting domain (e.g., github.io)
    if (!trimmed.includes(hostname)) {
      return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
    }
  }
  return "https://ais-pre-bo3kcxeltcuj3jlqvmjp7i-980569590057.asia-southeast1.run.app";
}

/**
 * Returns a guaranteed absolute backend base URL (critical for LINE webhooks, slip images, etc.)
 */
export function getAbsoluteBackendUrl(configBackendUrl?: string): string {
  const hostname = window.location.hostname;
  const isLocalOrWorkspace = 
    hostname.includes("run.app") ||
    hostname.includes("localhost") ||
    hostname === "127.0.0.1" ||
    hostname.includes("googleusercontent.com") ||
    hostname.includes("webcontainer.io");

  // ALWAYS use current origin when running inside the workspace, preview, or development server
  if (isLocalOrWorkspace) {
    return window.location.origin;
  }

  if (configBackendUrl && configBackendUrl.trim() !== "") {
    const trimmed = configBackendUrl.trim();
    // Skip if they erroneously set backend URL to their static frontend hosting domain (e.g., github.io)
    if (!trimmed.includes(hostname)) {
      return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
    }
  }
  return "https://ais-pre-bo3kcxeltcuj3jlqvmjp7i-980569590057.asia-southeast1.run.app";
}

// Rich Thai Postal Codes Mocking Database for flawless demo/fallback
export const SAMPLE_POSTAL_CODES: PostalCodeData[] = [
  { postalCode: "50240", subdistrict: "อมก๋อย", province: "เชียงใหม่", area: "พื้นที่ห่างไกล" },
  { postalCode: "50240", subdistrict: "แม่ตื่น", province: "เชียงใหม่", area: "พื้นที่ห่างไกล" },
  { postalCode: "50310", subdistrict: "บ่อหลวง", province: "เชียงใหม่", area: "พื้นที่ห่างไกล" },
  { postalCode: "50350", subdistrict: "กัลยาณิวัฒนา", province: "เชียงใหม่", area: "พื้นที่ห่างไกล" },
  { postalCode: "58130", subdistrict: "ปางมะผ้า", province: "แม่ฮ่องสอน", area: "พื้นที่ห่างไกล" },
  { postalCode: "81150", subdistrict: "เกาะลันตาใหญ่", province: "กระบี่", area: "พื้นที่ห่างไกล" },
  { postalCode: "82160", subdistrict: "เกาะยาวน้อย", province: "พังงา", area: "พื้นที่ห่างไกล" },
  { postalCode: "23170", subdistrict: "เกาะกูด", province: "ตราด", area: "พื้นที่ห่างไกล" },
  { postalCode: "95110", subdistrict: "เบตง", province: "ยะลา", area: "พื้นที่ห่างไกล" },
  { postalCode: "96110", subdistrict: "แว้ง", province: "นราธิวาส", area: "พื้นที่ห่างไกล" }
];

export const APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script Webhook for @yomiie_core NEW ADDRESS FORM
 * 
 * 1. Open your Google Spreadsheet: https://docs.google.com/spreadsheets/d/1Iwdv0S8JPMcb1ZL6xIwr7B-cKuN75QvpqPgbS1r1wco
 * 2. Click "Extensions" (ส่วนขยาย) > "Apps Script".
 * 3. Delete any default code. Paste this code.
 * 4. Click "Deploy" (การทำให้ใช้งานได้) > "New deployment" (การทำให้ใช้งานได้ใหม่).
 * 5. Choose "Web app" (เว็บแอป).
 * 6. Set Description: "Yomie New Address Sync"
 * 7. Set Execute as: "Me" (ตัวฉัน)
 * 8. Set Who has access: "Anyone" (ทุกคน) *CRITICAL*
 * 9. Click "Deploy". Authorize any permissions requested.
 * 10. Copy the Web App URL and paste it in Yomie Admin Settings!
 */

function doPost(e) {
  try {
    var rawData = e.postData.getDataAsString();
    var data = JSON.parse(rawData);
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto initialize headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "วัน",
        "เวลา",
        "Account",
        "ที่อยู่ใหม่"
      ]);
      
      // Style header
      sheet.getRange(1, 1, 1, 4).setBackground("#db5984").setFontColor("#ffffff").setFontWeight("bold");
    }
    
    var now = new Date();
    // Format date as DD/MM/YYYY and Time as HH:mm:ss for GMT+7 (Thailand)
    var submissionDate = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy");
    var submissionTime = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");
    
    var shippingInfoStr = data.shippingInfo || "";
    var customerAccountStr = data.customerAccount || "";
    
    sheet.appendRow([
      submissionDate,                            // A: วัน
      submissionTime,                            // B: เวลา
      customerAccountStr,                        // C: Account
      shippingInfoStr                            // D: ที่อยู่ใหม่
    ]);
    
    try {
      var lastRow = sheet.getLastRow();
      var targetRange = sheet.getRange(lastRow, 1, 1, 4);
      targetRange.setWrap(true).setVerticalAlignment("middle");
      targetRange.setFontFamily("Arial");
      targetRange.setFontSize(12);
      targetRange.setFontWeight("normal");
      targetRange.setFontStyle("normal");
      sheet.setRowHeight(lastRow, 90);
    } catch (styleErr) {
      // Ignore styling errors safely
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "message": "บันทึกข้อมูลสำเร็จ!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

/**
 * Extract Spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url;
}

/**
 * Generate Google Sheets Visualization API Query URL
 */
export function buildQueryUrl(spreadsheetId: string, sheetName: string, spreadsheetUrl?: string): string {
  let gid: string | null = null;
  if (spreadsheetUrl) {
    const match = spreadsheetUrl.match(/[?&#]gid=([0-9]+)/);
    if (match) {
      gid = match[1];
    }
  }

  if (sheetName) {
    const encSheet = encodeURIComponent(sheetName);
    let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?sheet=${encSheet}&tqx=out:json`;
    if (gid) {
      url += `&gid=${gid}`;
    }
    return url;
  }

  let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  if (gid) {
    url += `&gid=${gid}`;
  }
  return url;
}

/**
 * Parses Google Sheets visualization API JSON text cleanly for Postal Code columns A to D
 */
export function parsePostalCodeGvizData(text: string): PostalCodeData[] {
  const startMarker = "google.visualization.Query.setResponse(";
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error("รูปแบบไฟล์ดึงค่าจาก Google Sheets ขัดข้อง ตรวจเช็คว่าเปิดแชร์สิทธิ์ 'ทุกคนที่มีลิงก์ดูได้' เสมอค่ะ");
  }
  
  const endMarker = ");";
  const endIndex = text.lastIndexOf(endMarker);
  if (endIndex === -1) {
    throw new Error("โครงสร้างตอบรับของ Google Sheets ผิดพลาด");
  }

  const jsonStr = text.substring(startIndex + startMarker.length, endIndex);
  const data = JSON.parse(jsonStr);
  
  if (!data?.table?.rows) {
    throw new Error("ไม่พบข้อมูลแผ่นงานใน Google Sheet นี้");
  }

  const rows = data.table.rows || [];

  return rows.map((row: any) => {
    const cells = row.c || [];
    
    const getCellValue = (idx: number): string => {
      if (idx === undefined || idx < 0 || idx >= cells.length) return "";
      const cell = cells[idx];
      if (!cell) return "";
      
      if (cell.f !== undefined) return String(cell.f).trim();
      if (cell.v !== undefined) {
        if (cell.v === null) return "";
        return String(cell.v).trim();
      }
      return "";
    };

    return {
      postalCode: getCellValue(0),   // Column A: รหัสไปรษณีย์
      subdistrict: getCellValue(1),  // Column B: ตำบล
      province: getCellValue(2),     // Column C: จังหวัด
      area: getCellValue(3),         // Column D: พื้นที่ (เช่น "พื้นที่ห่างไกล")
    };
  }).filter(item => item.postalCode && item.postalCode.length > 0);
}
