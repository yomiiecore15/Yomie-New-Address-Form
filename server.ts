import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import fs from "fs";

interface OrderItem {
  itemName: string;
  quantity: number;
  notes?: string;
}

interface OrderSubmission {
  name: string;
  phone: string;
  contact: string;
  customerAccount: string;
  customerGmail: string;
  postalCode: string;
  subdistrict: string;
  district: string;
  province: string;
  detailAddress: string;
  items: OrderItem[];
  totalAmount?: number;
  paymentMethod?: string;
  paymentMethodOther?: string;
  shippingPaymentStatus?: string;
  transferAmount: number;
  transferTime: string;
  slipBase64?: string;
  isRemoteArea: boolean;
  additionalNotes?: string;
  transferDateInSlip?: string;
  transferTimeInSlip?: string;
  appsScriptUrl?: string;
  lineToken?: string;
  lineChannelAccessToken?: string;
  lineGroupId?: string;
  customAnswers?: { label: string; value: string }[];
  customFieldsSummary?: string;
  senderEmail?: string;
  senderAppPass?: string;
  shopName?: string;
  shippingInfo?: string;
  remoteAreaSelection?: string;
  originUrl?: string;
}

interface LineWebhookEventLog {
  timestamp: string;
  type: string;
  sourceType: string;
  sourceId: string;
  groupId?: string;
  roomId?: string;
  userId?: string;
  text?: string;
}

let latestLineEvents: LineWebhookEventLog[] = [];
let cachedChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const slipCache: Record<string, { buffer: Buffer; contentType: string }> = {};

const EVENTS_CACHE_FILE = path.join(process.cwd(), "line_events_cache.json");
const TOKEN_CACHE_FILE = path.join(process.cwd(), "line_token_cache.txt");
const ORDERS_CACHE_FILE = path.join(process.cwd(), "orders_history_cache.json");

let serverOrdersHistory: any[] = [];

try {
  if (fs.existsSync(ORDERS_CACHE_FILE)) {
    const raw = fs.readFileSync(ORDERS_CACHE_FILE, "utf8");
    serverOrdersHistory = JSON.parse(raw);
  }
} catch (e) {
  console.error("Failed to load orders history cache from file", e);
}

function saveOrdersHistoryState() {
  try {
    fs.writeFileSync(ORDERS_CACHE_FILE, JSON.stringify(serverOrdersHistory, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to write orders history cache to file", e);
  }
}

function parseDateTimeStr(timeStr: string) {
  let datePart = "-";
  let timePart = "-";

  if (!timeStr || timeStr.trim() === "" || timeStr === "-") {
    const d = new Date();
    const thaiYear = d.getFullYear() + 543;
    datePart = `${d.getDate()}/${d.getMonth() + 1}/${thaiYear}`;
    timePart = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    return { date: datePart, time: timePart };
  }

  if (timeStr.includes("T") && (timeStr.includes("Z") || timeStr.match(/[-+]\d{2}:\d{2}/))) {
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        const thaiYear = d.getFullYear() + 543;
        datePart = `${d.getDate()}/${d.getMonth() + 1}/${thaiYear}`;
        timePart = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        return { date: datePart, time: timePart };
      }
    } catch (e) {}
  }

  const cleaned = timeStr.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ');

  if (parts.length === 1) {
    if (parts[0].includes(":") && !parts[0].includes("/")) {
      timePart = parts[0];
    } else if (parts[0].includes("/") || parts[0].includes("-")) {
      datePart = parts[0];
    } else {
      datePart = parts[0];
    }
  } else if (parts.length >= 2) {
    let foundDate = "";
    let foundTime = "";

    for (const part of parts) {
      const cleanPart = part.replace(/[()]/g, '').trim();
      if (cleanPart.includes("/") || (cleanPart.includes("-") && !cleanPart.includes(":"))) {
        foundDate = cleanPart;
      } else if (cleanPart.includes(":")) {
        foundTime = cleanPart;
      }
    }

    if (foundDate) {
      datePart = foundDate;
    } else {
      datePart = parts[0];
    }

    if (foundTime) {
      const hasAmPm = parts.some(p => p.toLowerCase() === 'pm' || p.toLowerCase() === 'am');
      const pmLabel = parts.find(p => p.toLowerCase() === 'pm' || p.toLowerCase() === 'am');
      timePart = foundTime + (hasAmPm ? ` ${pmLabel}` : '');
    } else {
      timePart = parts[1];
    }
  }

  return { date: datePart, time: timePart };
}

try {
  if (fs.existsSync(EVENTS_CACHE_FILE)) {
    const raw = fs.readFileSync(EVENTS_CACHE_FILE, "utf8");
    latestLineEvents = JSON.parse(raw);
  }
} catch (e) {
  console.error("Failed to load Line events cache from file", e);
}

try {
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    cachedChannelAccessToken = fs.readFileSync(TOKEN_CACHE_FILE, "utf8").trim();
  }
} catch (e) {
  console.error("Failed to load Line token cache from file", e);
}

function saveEventsState() {
  try {
    fs.writeFileSync(EVENTS_CACHE_FILE, JSON.stringify(latestLineEvents, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to write Line events cache to file", e);
  }
}

function saveTokenState(token: string) {
  try {
    fs.writeFileSync(TOKEN_CACHE_FILE, token.trim(), "utf8");
  } catch (e) {
    console.error("Failed to write Line token cache to file", e);
  }
}

async function uploadToPublicHost(buffer: Buffer, contentType: string): Promise<string | null> {
  let ext = "jpg";
  if (contentType.includes("png")) ext = "png";
  else if (contentType.includes("gif")) ext = "gif";
  else if (contentType.includes("webp")) ext = "webp";

  // 1. Try Telegra.ph (Incredibly fast, raw direct hotlinking on telegraph CDN, perfect for LINE bots)
  try {
    console.log("[Image Upload] Attempting upload to telegra.ph...");
    const formData = new FormData();
    const file = new File([buffer], `slip_${Date.now()}.${ext}`, { type: contentType });
    formData.append("file", file);

    const response = await fetch("https://telegra.ph/upload", {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const json: any = await response.json();
      if (Array.isArray(json) && json[0]?.path) {
        const directUrl = `https://telegra.ph${json[0].path}`;
        console.log(`[Image Upload] Successfully uploaded to Telegra.ph: ${directUrl}`);
        return directUrl;
      }
    }
    console.warn(`[Image Upload] Telegra.ph returned non-ok status: ${response.status}`);
  } catch (err: any) {
    console.error("[Image Upload] Telegra.ph upload error:", err.message || err);
  }

  // 2. Try Catbox.moe (Fast, stable, directly public raw url)
  try {
    console.log("[Image Upload] Attempting upload to catbox.moe...");
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    
    const file = new File([buffer], `slip_${Date.now()}.${ext}`, { type: contentType });
    formData.append("fileToUpload", file);
    
    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const resultText = (await response.text()).trim();
      if (resultText && resultText.startsWith("http")) {
        console.log(`[Image Upload] Successfully uploaded to Catbox.moe: ${resultText}`);
        return resultText;
      }
    }
    console.warn(`[Image Upload] Catbox upload returned non-ok status: ${response.status}`);
  } catch (err: any) {
    console.error("[Image Upload] Catbox upload error:", err.message || err);
  }

  // 3. Try TmpFiles.org (Alternative fallback)
  try {
    console.log("[Image Upload] Attempting upload to tmpfiles.org...");
    const formData = new FormData();
    const file = new File([buffer], `slip_${Date.now()}.${ext}`, { type: contentType });
    formData.append("file", file);
    
    const response = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const json: any = await response.json();
      if (json.status === "success" && json.data?.url) {
        const rawUrl = json.data.url;
        const directUrl = rawUrl.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
        console.log(`[Image Upload] Successfully uploaded to tmpfiles.org: ${directUrl}`);
        return directUrl;
      }
    }
  } catch (err: any) {
    console.error("[Image Upload] TmpFiles upload error:", err.message || err);
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Custom CORS middleware to support external client frontends like GitHub Pages
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

  // Set limits for base64 slip images
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Check Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  // Fetch latest Line Events
  app.get("/api/latest-line-events", (req, res) => {
    res.json({ success: true, events: latestLineEvents });
  });

  // Serve cached slips dynamically to LINE servers
  app.get("/api/slips/:id", (req, res) => {
    let { id } = req.params;
    if (id.endsWith(".jpg")) {
      id = id.slice(0, -4);
    } else if (id.endsWith(".png")) {
      id = id.slice(0, -4);
    }
    const slip = slipCache[id];
    if (!slip) {
      console.warn(`[Slip Server] Slip not found in cache for ID: ${id}`);
      return res.status(404).send("Slip not found or expired");
    }
    res.setHeader("Content-Type", slip.contentType);
    res.send(slip.buffer);
  });

  // Get all orders from server cache
  app.get("/api/orders", (req, res) => {
    res.json({ success: true, orders: serverOrdersHistory });
  });

  // Clear all orders from server cache
  app.post("/api/clear-orders", (req, res) => {
    serverOrdersHistory = [];
    saveOrdersHistoryState();
    res.json({ success: true, message: "Cleared all orders in server cache" });
  });

  // Update Line Token Cache
  app.post("/api/update-line-token", (req, res) => {
    const { token } = req.body;
    if (token && typeof token === "string") {
      cachedChannelAccessToken = token.trim();
      saveTokenState(cachedChannelAccessToken);
      console.log("[Server Cache] Updated and persisted cachedChannelAccessToken starting with:", cachedChannelAccessToken.substring(0, 10));
    }
    res.json({ success: true, cached: !!cachedChannelAccessToken });
  });

  // LINE Webhook Endpoint to dynamically get Group ID / User ID
  app.all("/api/line-webhook", async (req, res) => {
    const queryToken = req.query.token as string;
    const body = req.body;

    // Log raw request information to assist debugging
    try {
      const logEntry = `[${new Date().toISOString()}] IP: ${req.ip} | Method: ${req.method} | Headers: ${JSON.stringify(req.headers)} | Body: ${JSON.stringify(body || {})}\n`;
      fs.appendFileSync(path.join(process.cwd(), "line_webhook_raw_logs.txt"), logEntry, "utf8");
      console.log(`👉 [Webhook Raw Connected] Received a ${req.method} request from LINE:`, JSON.stringify(body || {}));
    } catch (e) {
      console.error("Failed to append raw webhook logs:", e);
    }

    // Handle standard browser checks gracefully
    if (req.method === "GET") {
      return res.status(200).send(`
        <html>
          <head>
            <title>LINE Webhook status</title>
            <style>
              body { font-family: -apple-system, system-ui, sans-serif; text-align: center; padding: 50px; background: #faf9f6; color: #333; }
              .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: inline-block; max-width: 500px; }
              h1 { color: #10b981; }
              code { background: #f3f4f6; padding: 4px 8px; border-radius: 6px; font-family: monospace; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>🟢 LINE Webhook Live!</h1>
              <p>ระบบ LINE Webhook ทำงานปกติเรียบร้อยดีค่ะ คุณสามารถนำลิงก์พรีวิวแชร์สาธารณะ (<b>ais-pre</b>) ไปกรอกในช่อง Webhook URL ใน LINE Developers Console ได้เลยนะคะ! 💖</p>
              <p><i>(อย่าลืมกรอก Access Token และสับเปิดสวิตช์ "Use Webhook" ใน LINE และแอดบอทเข้ากลุ่มด้วยนะคะ)</i></p>
            </div>
          </body>
        </html>
      `);
    }

    // Use query token, or fall back to cache or environment variable token
    const activeToken = (queryToken && queryToken.trim() !== "" && !queryToken.includes("TOKEN_ของคุณ") && !queryToken.includes("your_token")) 
      ? queryToken.trim() 
      : (cachedChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();

    if (!activeToken) {
      console.log("LINE Webhook received but no token could be determined (neither query parameter nor env/cache).");
    }

    if (body) {
      // If events is empty or undefined, it might be a verify ping from LINE Developers Console!
      if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
        latestLineEvents.unshift({
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: "verify",
          sourceType: "system",
          sourceId: "🟢 [LINE Webhook Connected] สัญญาณส่งจากปุ่ม Verify บน LINE Console สำเร็จเรียบร้อยค่ะ! 🎉",
          text: "ตรวจพบการตั้งค่าเรียบร้อย"
        });

        // Limit the array size to 15 entries
        if (latestLineEvents.length > 15) {
          latestLineEvents = latestLineEvents.slice(0, 15);
        }
        saveEventsState();
      } else {
        for (const event of body.events) {
          const source = event.source || {};
          const sourceId = source.groupId || source.roomId || source.userId || "unknown";
          
          // Log event in memory
          latestLineEvents.unshift({
            timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: event.type,
            sourceType: source.type || "unknown",
            sourceId,
            groupId: source.groupId,
            roomId: source.roomId,
            userId: source.userId,
            text: event.message && event.message.type === "text" ? event.message.text : undefined
          });

          // Limit the array size to 15 entries
          if (latestLineEvents.length > 15) {
            latestLineEvents = latestLineEvents.slice(0, 15);
          }
          saveEventsState();

          const replyToken = event.replyToken;
          if (!replyToken || !activeToken) continue;

          let replyText = "";
          
          if (event.type === "join") {
            const idType = source.type === "room" ? "Room ID" : "Group ID";
            replyText = `สวัสดีค่ะ ยินดีที่ได้เข้าร่วมกลุ่มค่ะ! 💖\n\nรหัส ${idType} ของห้องนี้คือ:\n${sourceId}\n\n(คัดลอกรหัสนี้ไปใส่ในช่อง LINE Group ID หน้าตั้งค่าระบบหลังบ้านได้เลยนะคะ)`;
          } else if (event.type === "message" && event.message && event.message.type === "text") {
            const text = String(event.message.text).trim().toLowerCase();
            if (text === "id" || text === "/id" || text === "กลุ่ม id" || text === "group id") {
              const idType = source.type === "group" ? "Group ID" : source.type === "room" ? "Room ID" : "User ID";
              replyText = `รหัสของคุณคือ:\n\n• ${idType} : ${sourceId}\n\n(นำรหัสนี้ไปใส่ในช่อง LINE Group ID หรือ ID ปลายทาง ในหน้าตั้งค่าหลังบ้านร้านค้าได้เลยค่ะ)`;
            }
          }

          if (replyText) {
            try {
              await fetch("https://api.line.me/v2/bot/message/reply", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${activeToken}`
                },
                body: JSON.stringify({
                  replyToken,
                  messages: [
                    {
                      type: "text",
                      text: replyText
                    }
                  ]
                })
              });
            } catch (err) {
              console.error("Failed to send LINE reply", err);
            }
          }
        }
      }
    }

    return res.status(200).send("OK");
  });

  // Submit Preorder Order Route
  app.post("/api/submit-order", async (req, res) => {
    const data: OrderSubmission = req.body;

    if (!data.name || !data.phone || !data.items || data.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนด้วยนะคะ (ชื่อ, เบอร์โทร, รายการสินค้า)" 
      });
    }

    const { appsScriptUrl, lineToken, lineChannelAccessToken, lineGroupId, senderEmail, senderAppPass, shopName, ...cleanPayload } = data;

    const activeAppsScriptUrl = (appsScriptUrl && appsScriptUrl.trim() !== "") ? appsScriptUrl.trim() : process.env.APPS_SCRIPT_URL;
    const activeLineToken = (lineToken && lineToken.trim() !== "") ? lineToken.trim() : process.env.LINE_TOKEN;
    const activeLineChannelAccessToken = (lineChannelAccessToken && lineChannelAccessToken.trim() !== "") ? lineChannelAccessToken.trim() : process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const activeLineGroupId = (lineGroupId && lineGroupId.trim() !== "") ? lineGroupId.trim() : process.env.LINE_GROUP_ID;

    // Register public slip link if available at the very beginning so both Sheets & LINE can use it
    let slipUrl: string | undefined = undefined;
    if (cleanPayload.slipBase64 && cleanPayload.slipBase64.includes("base64,")) {
      try {
        const parts = cleanPayload.slipBase64.split("base64,");
        const header = parts[0];
        const base64Data = parts[1];
        let contentType = "image/jpeg";
        const matches = header.match(/data:([^;]+);/);
        if (matches && matches[1]) {
          contentType = matches[1];
        }
        const buffer = Buffer.from(base64Data, "base64");
        const slipId = `slip_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        slipCache[slipId] = { buffer, contentType };

        // Limit memory usage
        const keys = Object.keys(slipCache);
        if (keys.length > 150) {
          delete slipCache[keys[0]];
        }

        // Try downloading to a truly public host first (so LINE & Google Sheets bypass Sandbox Auth)
        const publicHostedUrl = await uploadToPublicHost(buffer, contentType);
        if (publicHostedUrl) {
          slipUrl = publicHostedUrl;
          console.log(`[Slip Server] Using public image host URL for Sheets/LINE: ${slipUrl}`);
        } else {
          // Extremely robust base URL determination fallback
          let baseUrl = (data.originUrl || process.env.APP_URL || "").trim();
          if (!baseUrl || baseUrl === "MY_APP_URL") {
            const protocol = ((req.headers["x-forwarded-proto"] as string) || "https").split(",")[0].trim();
            const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
            if (host) {
              baseUrl = `${protocol}://${host}`;
            }
          }
          if (baseUrl) {
            const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
            // Append .jpg so web scraping agents (like LINE API) trust the content format and display it
            slipUrl = `${normalizedBaseUrl}/api/slips/${slipId}.jpg`;
            console.log(`[Slip Server] Fallback to sandbox local URL for Sheets/LINE: ${slipUrl}`);
          }
        }
      } catch (err) {
        console.error("Failed to parse/upload slip image:", err);
      }
    }

    // Assign slipUrl to cleanPayload so that Google Sheet Apps Script can register it
    (cleanPayload as any).slipUrl = slipUrl || "-";

    // Ensure shippingInfo is always populated in cleanPayload before sending to webhook
    if (!cleanPayload.shippingInfo) {
      if (cleanPayload.detailAddress) {
        cleanPayload.shippingInfo = `${cleanPayload.detailAddress} ต.${cleanPayload.subdistrict || ''} อ.${cleanPayload.district || ''} จ.${cleanPayload.province || ''} ${cleanPayload.postalCode || ''}`.trim();
      } else {
        cleanPayload.shippingInfo = "-";
      }
    }

    // Split date & time for better integration in Zapier/Make.com
    const rawTransferTime = cleanPayload.transferTime || new Date().toLocaleString("th-TH");
    const parsedDt = parseDateTimeStr(rawTransferTime);
    (cleanPayload as any).transferDateOnly = parsedDt.date;
    (cleanPayload as any).transferTimeOnly = parsedDt.time;

    const paymentMethodStr = cleanPayload.paymentMethod 
      ? (cleanPayload.paymentMethod === 'อื่นๆ' ? `อื่นๆ (${cleanPayload.paymentMethodOther || ''})` : cleanPayload.paymentMethod)
      : "-";
    const shippingPaymentStatusStr = cleanPayload.shippingPaymentStatus || "-";
    let spreadsheetSuccess = false;
    let lineSuccess = false;
    let logs: string[] = [];

    // 1. Post to Google Sheet Webhook / Zapier / Make if configured
    if (activeAppsScriptUrl && activeAppsScriptUrl.trim() !== "") {
      try {
        const isGoogleScript = activeAppsScriptUrl.includes("script.google.com");
        const sheetsResponse = await fetch(activeAppsScriptUrl.trim(), {
          method: "POST",
          headers: {
            "Content-Type": isGoogleScript ? "text/plain;charset=utf-8" : "application/json"
          },
          body: JSON.stringify(cleanPayload)
        });

        if (sheetsResponse.ok) {
          const resText = await sheetsResponse.text();
          const targetName = isGoogleScript ? "Google Sheet (Apps Script)" : "Webhook Receiver (Zapier/Make)";
          logs.push(`บันทึกลงวงจรระบบ ${targetName} เรียบร้อยแล้วค่ะ!`);
          spreadsheetSuccess = true;
        } else {
          logs.push(`ส่งสัญญาณ Webhook ผิดพลาด: Status ${sheetsResponse.status}`);
        }
      } catch (err: any) {
        console.error("Webhook/Sheets integration error:", err);
        logs.push(`เชื่อมโยงข้อมูลชีตล้มเหลว: ${err.message || err}`);
      }
    } else {
      logs.push("ไม่ได้ตั้งค่าลิงก์ Webhook เชื่อมต่อข้อมูลภายนอก (โหมดจำลองหรือเซฟข้อมูล)");
    }

    // 2. Send LINE Notification (Support Legacy LINE Notify or New LINE Messaging API)
    const hasLineMessagingApi = activeLineChannelAccessToken && activeLineChannelAccessToken.trim() !== "" && activeLineGroupId && activeLineGroupId.trim() !== "";
    const hasLineNotify = activeLineToken && activeLineToken.trim() !== "";

    if (hasLineMessagingApi || hasLineNotify) {
      try {

        const formattedItems = cleanPayload.items.map((it) => {
          return it.itemName.trim();
        }).join("\n");

        const addressToDisplay = (cleanPayload.shippingInfo || "").trim();
        const areaStatus = (addressToDisplay === "-" || cleanPayload.remoteAreaSelection === "-") 
          ? "-" 
          : (cleanPayload.remoteAreaSelection || (cleanPayload.isRemoteArea ? "อยู่ค่า" : "ไม่อยู่ค่ะ"));
        const additionalNotesStr = (cleanPayload.additionalNotes || "").trim() ? (cleanPayload.additionalNotes || "").trim() : "-";

        const formatNumber = (num: any) => {
          if (num === undefined || num === null || num === "") return "-";
          const str = String(num).replace(/,/g, '');
          const parsed = Number(str);
          if (isNaN(parsed)) return str;
          return parsed.toLocaleString('en-US');
        };

        const isChangeAddress = cleanPayload.paymentMethod === 'เปลี่ยนที่อยู่' || 
                                formattedItems.includes('เปลี่ยนที่อยู่จัดส่ง');

        let customerAccountDisplay = (cleanPayload.customerAccount || "").trim();
        if (customerAccountDisplay) {
          const cleanAcc = customerAccountDisplay.replace(/^@/, '');
          customerAccountDisplay = `@${cleanAcc}`;
        } else {
          customerAccountDisplay = "@";
        }

        let timeDisplay = "";
        if (cleanPayload.transferTime) {
          const rawTime = String(cleanPayload.transferTime).trim();
          const cleaned = rawTime.replace(/,/g, ' ').replace(/\s+/g, ' ');
          const parts = cleaned.split(' ');
          if (parts.length >= 2) {
            const timePart = parts[1].replace(/[()]/g, '');
            timeDisplay = `${parts[0]} (${timePart})`;
          } else {
            timeDisplay = rawTime;
          }
        } else {
          const d = new Date();
          const thaiYear = d.getFullYear() + 543;
          const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${thaiYear}`;
          const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
          timeDisplay = `${dateStr} (${timeStr})`;
        }

        let message = "";
        if (isChangeAddress) {
          message = `
📪 New address notification
…...……...……...……...……...……...…
👤 Account: ${customerAccountDisplay}

📮ชื่อที่อยู่จัดส่ง:
${addressToDisplay}

⏰ วัน-เวลา: ${timeDisplay}
…...……...……...……...……...……...…
มีลูกค้าต้องการเปลี่ยนที่อยู่จัดส่งใหม่ค่ะ! 💖🥰
          `.trim();
        } else {
          message = `
🔔 YOMIE order notification
…...……...……...……...……...……...…
👤 Account: ${cleanPayload.customerAccount}
📩 Gmail: ${cleanPayload.customerGmail}
📦 รายการสั่งซื้อ:
${formattedItems}

📮ชื่อที่อยู่จัดส่ง:
${addressToDisplay}

📍พื้นที่ห่างไกล: ${areaStatus}
💰 ยอดรวม: ${formatNumber(cleanPayload.totalAmount)} บาท
💳 วิธีการชำระ: ${paymentMethodStr}
🚚 การชำระค่าส่ง: ${shippingPaymentStatusStr}
💵 ยอดโอนเงิน: ${formatNumber(cleanPayload.transferAmount)} บาท
⏰ วัน-เวลาโอน: ${cleanPayload.transferTime}
📝 เพิ่มเติม: ${additionalNotesStr}
…...……...……...……...……...……...…
มียอดสั่งซื้อเข้าใหม่นะค้า ยินดีด้วยค่ะ! 💖🥰
          `.trim();
        }

        if (hasLineMessagingApi) {
          // Send via LINE Messaging API Push message
          const messagesPayload: any[] = [
            {
              type: "text",
              text: message
            }
          ];

          if (slipUrl) {
            messagesPayload.push({
              type: "image",
              originalContentUrl: slipUrl,
              previewImageUrl: slipUrl
            });
          }

          const lineMsgResponse = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${activeLineChannelAccessToken!.trim()}`
            },
            body: JSON.stringify({
              to: activeLineGroupId!.trim(),
              messages: messagesPayload
            })
          });

          if (lineMsgResponse.ok) {
            logs.push(`ส่งแจ้งเตือน LINE Messaging API สำเร็จ!`);
            lineSuccess = true;
          } else {
            const errText = await lineMsgResponse.text();
            logs.push(`ล้มเหลวในการส่ง LINE Messaging API: Status ${lineMsgResponse.status} - ${errText}`);
          }
        } else {
          // Send via Legacy LINE Notify
          const formData = new URLSearchParams({ message });
          if (slipUrl) {
            formData.append("imageFullsize", slipUrl);
            formData.append("imageThumbnail", slipUrl);
          }

          const lineResponse = await fetch("https://notify-api.line.me/api/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": `Bearer ${activeLineToken!.trim()}`
            },
            body: formData
          });

          if (lineResponse.ok) {
            const resJson = await lineResponse.json();
            logs.push(`ส่งแจ้งเตือน LINE Notify สำเร็จ! (บริการแบบเลิกใช้เก่า)`);
            lineSuccess = true;
          } else {
            const errText = await lineResponse.text();
            logs.push(`ล้มเหลวในการส่ง LINE Notify: Status ${lineResponse.status} - ${errText}`);
          }
        }
      } catch (err: any) {
        console.error("LINE Notification Error:", err);
        logs.push(`ล้มเหลวในการส่งระบบ LINE: ${err.message || err}`);
      }
    } else {
      logs.push("ไม่ได้เชื่อมต่อ LINE (ไม่ได้ตั้งค่า LINE Messaging API หรือ Token แจ้งเตือน)");
    }

    // 3. Send Summary email to customer if configured
    let emailSuccess = false;
    if (cleanPayload.customerGmail && cleanPayload.customerGmail.trim() !== "") {
      const activeSenderEmail = (senderEmail && senderEmail.trim() !== "") ? senderEmail.trim() : process.env.SMTP_USER;
      const activeSenderPass = (senderAppPass && senderAppPass.trim() !== "") ? senderAppPass.trim() : process.env.SMTP_PASS;

      if (activeSenderEmail && activeSenderPass) {
        try {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: activeSenderEmail,
              pass: activeSenderPass
            }
          });

          const shopDisplay = shopName || "Yomiie Pre-Order Shop";
          const formattedAccount = cleanPayload.customerAccount ? (cleanPayload.customerAccount.startsWith("@") ? cleanPayload.customerAccount : `@${cleanPayload.customerAccount}`) : "@";
          const isSkippedAddress = (cleanPayload.shippingInfo || "").trim() === "-" || cleanPayload.remoteAreaSelection === "-";
          const remoteAreaReply = isSkippedAddress ? "-" : ((cleanPayload.remoteAreaSelection === "อยู่ค่า" || cleanPayload.isRemoteArea) ? "อยู่" : "ไม่อยู่");

          const formatNumber = (num: any) => {
            if (num === undefined || num === null || num === "") return "-";
            const str = String(num).replace(/,/g, '');
            const parsed = Number(str);
            if (isNaN(parsed)) return str;
            return parsed.toLocaleString('en-US');
          };

          const customAnswersHtml = (cleanPayload.customAnswers && cleanPayload.customAnswers.length > 0)
            ? `<div style="background-color: #fafafa; border-left: 4px solid #db5984; padding: 12px; margin-top: 15px; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #db5984;">Memo / ข้อมูลเพิ่มเติม:</p>
                <ul style="margin: 0; padding-left: 20px;">
                  ${cleanPayload.customAnswers.map(ans => `<li><strong>${ans.label}:</strong> ${ans.value}</li>`).join("")}
                </ul>
              </div>`
            : "";

          const htmlContent = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
              <div style="background: linear-gradient(135deg, #eb5e45, #db5984); padding: 30px 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">✉️ใบสรุปการรายการสั่งซื้อ</h1>
                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">ขอบคุณสำหรับคำสั่งซื้อนะคะ หากพบข้อผิดพลาดสามารถติดต่อร้านได้เสมอค่า</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6;">
                <p>สวัสดีคุณ <strong>${formattedAccount}</strong>,</p>
                <p>ทางร้านได้รับข้อมูลเรียบร้อยค่า อัพเดทสถานะในเว็บภายใน 1-3 วันนะคะ♡</p>
                
                <h3 style="color: #eb5e45; border-bottom: 2px solid #fbebeb; padding-bottom: 6px; margin-top: 25px;">🛒 รายการสั่งซื้อ</h3>
                <div style="background-color: #faf9f8; padding: 15px; border-radius: 8px; border: 1px dashed #f5efec; font-size: 13px;">
                  ${cleanPayload.items.map((it, idx) => {
                    return `<div style="${idx > 0 ? 'margin-top: 12px; border-top: 1px dashed #eee; padding-top: 12px;' : ''} line-height: 1.6; white-space: pre-wrap;">${it.itemName}${it.notes ? `<br/>${it.notes}` : ""}</div>`;
                  }).join("")}
                </div>

                ${customAnswersHtml}

                <h3 style="color: #eb5e45; border-bottom: 2px solid #fbebeb; padding-bottom: 6px; margin-top: 25px;">📮ที่อยู่จัดส่ง</h3>
                <p style="background-color: #faf9f8; padding: 15px; border-radius: 8px; border: 1px dashed #f5efec; font-size: 13px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${cleanPayload.shippingInfo}</p>
                
                <p style="margin-top: 12px; font-size: 13px; color: #333; line-height: 1.6;">
                  <strong>พื้นที่ห่างไกล:</strong> ${remoteAreaReply}
                </p>

                <h3 style="color: #eb5e45; border-bottom: 2px solid #fbebeb; padding-bottom: 6px; margin-top: 25px;">💵 รายละเอียดการชำระเงิน</h3>
                <p style="font-size: 14px; margin: 0; line-height: 1.8;">
                  <strong>ยอดรวม (สินค้า+ค่าส่ง):</strong> <span style="font-weight: bold;">${formatNumber(cleanPayload.totalAmount)} บาท</span> <br/>
                  <strong>วิธีการชำระ:</strong> <span style="font-weight: bold;">${paymentMethodStr}</span> <br/>
                  <strong>การชำระค่าส่ง:</strong> <span style="font-weight: bold;">${shippingPaymentStatusStr}</span> <br/>
                  <strong>ยอดเงินโอนจริง:</strong> <span style="color: #eb5e45; font-weight: bold; font-size: 16px;">${formatNumber(cleanPayload.transferAmount)} บาท</span><br/>
                  <strong>วัน-เวลาโอน:</strong> ${cleanPayload.transferTime}
                </p>

                <h3 style="color: #eb5e45; border-bottom: 2px solid #fbebeb; padding-bottom: 6px; margin-top: 25px;">‼️เพิ่มเติม</h3>
                <p style="background-color: #faf9f8; padding: 15px; border-radius: 8px; border: 1px dashed #f5efec; font-size: 13px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${cleanPayload.additionalNotes ? cleanPayload.additionalNotes.trim() : "-"}</p>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 11px;">
                  <p style="margin: 0;">ออเดอร์นี้บันทึกเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
                </div>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"${shopDisplay}" <${activeSenderEmail}>`,
            to: cleanPayload.customerGmail.trim(),
            subject: `💐 [ใบสรุปรายการ] ทางร้านได้รับคำสั่งซื้อเรียบร้อยค่ะ 🛍`,
            html: htmlContent
          });

          logs.push(`ส่งอีเมลแจ้งลูกค้าที่ ${cleanPayload.customerGmail} สำเร็จ!`);
          emailSuccess = true;
        } catch (err: any) {
          console.error("Nodemailer Email Error:", err);
          logs.push(`⚠️ ส่งอีเมลล้มเหลว: ${err.message || err} (ตรวจสอบ Gmail / App Password ในหน้าแอดมิน)`);
        }
      } else {
        logs.push("⚠️ ไม่ได้ระบุบัญชีผู้ส่ง Gmail บันทึกเรียบร้อยแต่ข้ามขั้นตอนส่งเมล (ระบุได้ที่หน้า Admin นะคะ)");
      }
    }

    // Save to server orders history cache
    const dServer = new Date();
    const thaiYearServer = dServer.getFullYear() + 543;
    const dateStrServer = `${dServer.getDate()}/${dServer.getMonth() + 1}/${thaiYearServer}`;
    const timeStrServer = `${String(dServer.getHours()).padStart(2, '0')}:${String(dServer.getMinutes()).padStart(2, '0')}:${String(dServer.getSeconds()).padStart(2, '0')}`;
    const orderTimestampServer = `${dateStrServer} (${timeStrServer})`;

    const newOrderRecord = {
      id: String(Date.now()),
      timestamp: orderTimestampServer,
      name: cleanPayload.name,
      phone: cleanPayload.phone,
      contact: cleanPayload.contact || "",
      customerAccount: cleanPayload.customerAccount,
      customerGmail: cleanPayload.customerGmail || "",
      postalCode: cleanPayload.postalCode,
      subdistrict: cleanPayload.subdistrict,
      district: cleanPayload.district,
      province: cleanPayload.province,
      detailAddress: cleanPayload.detailAddress,
      items: cleanPayload.items,
      totalAmount: cleanPayload.totalAmount,
      transferAmount: cleanPayload.transferAmount,
      transferTime: cleanPayload.transferTime || orderTimestampServer,
      paymentMethod: cleanPayload.paymentMethod,
      paymentMethodOther: cleanPayload.paymentMethodOther,
      shippingPaymentStatus: cleanPayload.shippingPaymentStatus,
      slipBase64: cleanPayload.slipBase64,
      isRemoteArea: cleanPayload.isRemoteArea,
      shippingInfo: cleanPayload.shippingInfo || `${cleanPayload.detailAddress} ต.${cleanPayload.subdistrict} อ.${cleanPayload.district} จ.${cleanPayload.province} ${cleanPayload.postalCode}`,
      customAnswers: cleanPayload.customAnswers || []
    };

    serverOrdersHistory.unshift(newOrderRecord);
    if (serverOrdersHistory.length > 2000) {
      serverOrdersHistory = serverOrdersHistory.slice(0, 2000);
    }
    saveOrdersHistoryState();

    const activeSenderEmail = (senderEmail && senderEmail.trim() !== "") ? senderEmail.trim() : process.env.SMTP_USER;
    const activeSenderPass = (senderAppPass && senderAppPass.trim() !== "") ? senderAppPass.trim() : process.env.SMTP_PASS;

    return res.json({
      success: true,
      spreadsheetConnected: !!activeAppsScriptUrl,
      lineConnected: !!activeLineToken || (!!activeLineChannelAccessToken && !!activeLineGroupId),
      emailConnected: !!cleanPayload.customerGmail && !!activeSenderEmail && !!activeSenderPass,
      spreadsheetSuccess,
      lineSuccess,
      emailSuccess,
      logs
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Full-Stack Server] running on http://localhost:${PORT}`);
  });
}

startServer();
