import React, { useState, useEffect } from 'react';
import { SheetConfig, PreorderData, CustomQuestion } from '../types';
import { 
  X, FileSpreadsheet, Sparkles, RefreshCw, 
  Settings2, Copy, AlertTriangle, CheckCircle2,
  ShieldAlert, Info, ClipboardList, Database, MessageSquare, 
  CreditCard, Search, Link, Bell, FileText, Trash2, ShoppingBag,
  Plus, Download
} from 'lucide-react';
import { extractSpreadsheetId, APPS_SCRIPT_TEMPLATE, getBackendUrl, getAbsoluteBackendUrl } from '../sampleData';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetConfig;
  onSaveConfig: (newConfig: SheetConfig) => void;
  onResetToDemo: () => void;
  onLogout?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetToDemo,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'history' | 'guide'>('settings');
  
  // Settings details local form states
  const [shopName, setShopName] = useState(config.shopName);
  const [appsScriptUrl, setAppsScriptUrl] = useState(config.appsScriptUrl || '');
  const [lineToken, setLineToken] = useState(config.lineToken || '');
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState(config.lineChannelAccessToken || '');
  const [lineGroupId, setLineGroupId] = useState(config.lineGroupId || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(config.spreadsheetUrl || '');
  const [bankName, setBankName] = useState(config.bankName);
  const [bankAccount, setBankAccount] = useState(config.bankAccount);
  const [bankOwner, setBankOwner] = useState(config.bankOwner);
  const [promptPay, setPromptPay] = useState(config.promptPay);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>(config.customQuestions || []);
  const [senderEmail, setSenderEmail] = useState(config.senderEmail || '');
  const [senderAppPass, setSenderAppPass] = useState(config.senderAppPass || '');
  const [backendUrl, setBackendUrl] = useState(config.backendUrl || '');

  // Connection testing states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Historical Orders display states
  const [localOrders, setLocalOrders] = useState<PreorderData[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);
  const [guideSubTab, setGuideSubTab] = useState<'nocode' | 'script'>('nocode');
  const [confirmClear, setConfirmClear] = useState(false);

  // Live incoming LINE Webhook log tracking states
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [showLineTokenGuide, setShowLineTokenGuide] = useState(false);

  // Sync token cache with server dynamically
  const syncTokenWithServer = async (token: string) => {
    if (!token || !token.trim()) return;
    try {
      await fetch(`${getBackendUrl(config.backendUrl)}/api/update-line-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() })
      });
    } catch (err) {
      console.error("Failed to sync token with server in AdminPanel", err);
    }
  };

  const fetchWebhookEvents = async () => {
    setIsFetchingEvents(true);
    try {
      const res = await fetch(`${getBackendUrl(config.backendUrl)}/api/latest-line-events`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWebhookEvents(data.events || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch latest events", err);
    } finally {
      setIsFetchingEvents(false);
    }
  };

  useEffect(() => {
    setConfirmClear(false);
    setShopName(config.shopName);
    setAppsScriptUrl(config.appsScriptUrl || '');
    setLineToken(config.lineToken || '');
    setLineChannelAccessToken(config.lineChannelAccessToken || '');
    setLineGroupId(config.lineGroupId || '');
    setSpreadsheetUrl(config.spreadsheetUrl || '');
    setBankName(config.bankName);
    setBankAccount(config.bankAccount);
    setBankOwner(config.bankOwner);
    setPromptPay(config.promptPay);
    setCustomQuestions(config.customQuestions || []);
    setSenderEmail(config.senderEmail || '');
    setSenderAppPass(config.senderAppPass || '');
    setBackendUrl(config.backendUrl || '');
    
    const fetchServerOrders = async () => {
      try {
        const res = await fetch(`${getBackendUrl(config.backendUrl)}/api/orders`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.orders) {
            setLocalOrders(data.orders);
            localStorage.setItem('yomie_orders_history_v2', JSON.stringify(data.orders));
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch server orders, falling back to local storage", err);
      }

      const savedOrders = localStorage.getItem('yomie_orders_history_v2');
      if (savedOrders) {
        try {
          setLocalOrders(JSON.parse(savedOrders));
        } catch (err) {
           console.error(err);
        }
      }
    };

    if (isOpen) {
      fetchWebhookEvents();
      fetchServerOrders();
      if (config.lineChannelAccessToken) {
        syncTokenWithServer(config.lineChannelAccessToken);
      }
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  // Clear/Reset submissions history
  const handleClearHistory = () => {
    setLocalOrders([]);
    localStorage.removeItem('yomie_orders_history_v2');
    setConfirmClear(false);

    fetch(`${getBackendUrl(config.backendUrl)}/api/clear-orders`, {
      method: "POST"
    }).catch(err => console.error("Failed to clear server orders:", err));
  };

  const handleExportCSV = () => {
    if (localOrders.length === 0) return;

    const headers = [
      "วัน-เวลา",
      "ชื่อลูกค้า",
      "เบอร์โทร",
      "Account",
      "รหัสไปรษณีย์",
      "ตำบล",
      "อำเภอ",
      "จังหวัด",
      "ที่อยู่โดยละเอียด",
      "ที่อยู่จัดส่งเต็ม",
      "รายการสินค้า",
      "ยอดรวมสินค้า(บาท)",
      "ยอดโอนจริง(บาท)",
      "วิธีการชำระ",
      "การชำระค่าส่ง",
      "หมายเหตุเพิ่มเติม"
    ];

    const escapeCSV = (str: any) => {
      if (str === undefined || str === null) return "";
      const s = String(str).replace(/"/g, '""');
      if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return `"${s}"`;
      }
      return s;
    };

    const rows = localOrders.map(order => {
      const itemNames = order.items && order.items.map(it => `${it.itemName} (x${it.quantity})`).join("; ");
      const shippingFull = order.shippingInfo || `${order.detailAddress || ''} ต.${order.subdistrict || ''} อ.${order.district || ''} จ.${order.province || ''} ${order.postalCode || ''}`;
      
      return [
        order.timestamp || "",
        order.name || "",
        order.phone || "",
        order.customerAccount || "",
        order.postalCode || "",
        order.subdistrict || "",
        order.district || "",
        order.province || "",
        order.detailAddress || "",
        shippingFull,
        itemNames || "",
        order.totalAmount || "0",
        order.transferAmount || "0",
        order.paymentMethod || "",
        order.shippingPaymentStatus || "",
        order.additionalNotes || ""
      ].map(escapeCSV).join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Yomie_Preorders_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Test connection or trigger a test LINE Notification/Email via backend
  const handleTestNotification = async () => {
    const hasLineNotify = !!lineToken.trim();
    const hasLineMsgDev = !!lineChannelAccessToken.trim() && !!lineGroupId.trim();
    const hasEmailSmtp = !!senderEmail.trim() && !!senderAppPass.trim();
    const hasSheets = !!appsScriptUrl.trim();

    if (!hasLineNotify && !hasLineMsgDev && !hasEmailSmtp && !hasSheets) {
      setTestResult({ success: false, message: "❌ กรุณากรอกหัวข้อเชื่อมต่ออย่างน้อยหนึ่งอย่าง (เช่น LINE Token, Gmail SMTP, หรือ Google Sheets Webhook) เพื่อทำการทดสอบนะคะ" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const testPayload = {
      name: "ทดสอบ แอดมิน",
      phone: "0891234567",
      contact: "@test_ig",
      customerAccount: "ทดสอบ แอดมินแอคเคาน์",
      customerGmail: hasEmailSmtp ? senderEmail.trim() : "",
      postalCode: "10110",
      subdistrict: "คลองเตย",
      district: "คลองเตย",
      province: "กรุงเทพมหานคร",
      detailAddress: "ทดสอบการเชื่อมต่อระบบส่วนแอดมินหลัก",
      shippingInfo: "ทดสอบการเชื่อมต่อระบบส่วนแอดมินหลัก ต.คลองเตย อ.คลองเตย จ.กรุงเทพมหานคร 10110",
      items: [{ itemName: "ตุ๊กตาทดสอบโมเดลไลน์ Yomiie", quantity: 1, notes: "ทดสอบระบบ" }],
      transferAmount: 9.99,
      transferTime: new Date().toLocaleString('th-TH'),
      isRemoteArea: false,
      appsScriptUrl: appsScriptUrl.trim(),
      lineToken: lineToken.trim(),
      lineChannelAccessToken: lineChannelAccessToken.trim(),
      lineGroupId: lineGroupId.trim(),
      senderEmail: senderEmail.trim(),
      senderAppPass: senderAppPass.trim(),
      shopName: shopName.trim()
    };

    try {
      const res = await fetch(`${getBackendUrl(config.backendUrl)}/api/submit-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload)
      });

      if (!res.ok) throw new Error("Connection timed out or failed.");
      const json = await res.json();

      let allConfiguredSucceeded = true;
      let errorDetails: string[] = [];

      if (json.spreadsheetConnected && !json.spreadsheetSuccess) {
        allConfiguredSucceeded = false;
        errorDetails.push("บันทึก Google Sheet ล้มเหลว");
      }
      if (json.lineConnected && !json.lineSuccess) {
        allConfiguredSucceeded = false;
        errorDetails.push("ส่งแจ้งเตือน LINE ล้มเหลว");
      }
      if (json.emailConnected && !json.emailSuccess) {
        allConfiguredSucceeded = false;
        errorDetails.push("ส่งอีเมลสรุป ล้มเหลว");
      }

      if (allConfiguredSucceeded && json.success) {
        setTestResult({
          success: true,
          message: `✅ ทดสอบการเชื่อมต่อช่องทางต่าง ๆ สำเร็จเรียบร้อยค่ะ!\n• ${json.logs.join('\n• ')}`
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ ทดสอบมีบางส่วนล้มเหลว (${errorDetails.join(', ') || 'ข้อมูลเข้าไม่ตรงแบบแผน'}):\n• ${json.logs.join('\n• ')}`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `❌ เชื่อมต่อล้มเหลว: ${err.message || err}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Copy apps script template code easily
  const handleCopyScript = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (err) {
      // Fallback for iframe / non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = APPS_SCRIPT_TEMPLATE;
      textArea.style.position = "fixed";
      textArea.style.left = "-99999px";
      textArea.style.top = "-99999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (e) {
        console.error("Fallback script copy failed", e);
      }
      document.body.removeChild(textArea);
    }
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Save Config to App component
  const handleSave = () => {
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl) || "";

    onSaveConfig({
      spreadsheetUrl: spreadsheetUrl.trim(),
      spreadsheetId,
      sheetName: config.sheetName,
      isConfigured: !!spreadsheetId || !!appsScriptUrl,
      useFallbackSample: !spreadsheetId && !appsScriptUrl,
      appsScriptUrl: appsScriptUrl.trim(),
      lineToken: lineToken.trim(),
      lineChannelAccessToken: lineChannelAccessToken.trim(),
      lineGroupId: lineGroupId.trim(),
      shopName: shopName.trim(),
      bankName: bankName.trim(),
      bankAccount: bankAccount.trim(),
      bankOwner: bankOwner.trim(),
      promptPay: promptPay.trim(),
      customQuestions: customQuestions,
      senderEmail: senderEmail.trim(),
      senderAppPass: senderAppPass.trim(),
      backendUrl: backendUrl.trim()
    });
    
    onClose();
  };

  // Filter historical orders
  const filteredOrders = localOrders.filter(order => {
    const term = historySearch.toLowerCase();
    return (
      order.name.toLowerCase().includes(term) ||
      order.phone.includes(term) ||
      order.contact.toLowerCase().includes(term) ||
      order.postalCode.includes(term) ||
      (order.items && order.items.some(i => i.itemName.toLowerCase().includes(term)))
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in" id="admin-panel-overlay">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity" 
      />

      {/* Sliding Drawer Content */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in" id="admin-panel-drawer">
        
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#f0f2f5] flex items-center justify-between bg-gray-50 text-left">
          <div className="flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-[#eb5e45]" />
            <h3 className="text-sm font-black text-gray-900 tracking-tight font-sans">
              ระบบหลังบ้านร้านค้า {config.shopName}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-150 bg-gray-50/50 p-1 justify-start">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer rounded-lg ${
              activeTab === 'settings' ? 'bg-white text-[#eb5e45] shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>ตั้งค่า</span>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer rounded-lg ${
              activeTab === 'history' ? 'bg-white text-[#eb5e45] shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>ออเดอร์({localOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer rounded-lg ${
              activeTab === 'guide' ? 'bg-white text-[#eb5e45] shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>ติดตั้งชีท</span>
          </button>
        </div>

        {/* Scrollable Container contents */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 text-left">
          
          {/* TAB 1: SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-5 animate-fade-in text-left">
              
              {/* Integration credentials */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-[#db5984] tracking-wider uppercase font-mono">
                  🔑 ตั้งค่าการเชื่อมต่อแอปและลิงก์เชื่อมโยง
                </h4>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 block">ชื่อร้านค้าพรีออเดอร์ (Shop Branding)</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-900 font-sans font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-gray-700 block">Webhook URL / ลิงก์เชื่อมโยงชีต (Google Sheets / Zapier / Make.com)</label>
                    <span className="text-[10px] text-indigo-600 font-bold font-sans">เชื่อมต่อนำเข้า Google Sheet อัตโนมัติ</span>
                  </div>
                  <input
                    type="text"
                    placeholder="วางลิงก์ Webhook จาก Zapier, Make.com หรือ Google Script ที่นี่..."
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 focus:border-indigo-500 rounded-xl text-gray-900 font-mono"
                  />
                  <p className="text-[10px] text-gray-400">
                    รองรับ Webhook โดยตรงจาก Zapier, Make.com หรือ Google Apps Script เพื่อดึงข้อมูลออเดอร์และการโอนไปกรอกลง Google Sheets ของท่านทันทีอย่างปลอดภัย
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-gray-700 block">API Server Backend URL (สำหรับ GitHub Pages)</label>
                    <span className="text-[10px] text-emerald-600 font-bold font-sans">เชื่อมต่อข้ามเซิร์ฟเวอร์</span>
                  </div>
                  <input
                    type="text"
                    placeholder="https://ais-pre-....run.app"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-900 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 leading-normal">
                    ใส่ลิงก์ URL เซิร์ฟเวอร์หลังบ้านใน AI Studio (ที่มีคำว่า <code>-pre-</code> หรือเซิร์ฟเวอร์ที่ติดตั้งแยก) เพื่อรองรับการกดส่งข้อมูล และสลิปจาก <strong>GitHub Pages</strong> หรือโดเมนหน้าบ้านภายนอกอื่นสิทธิ์ CORS จะเปิดให้อัตโนมัติค่ะ
                  </p>
                </div>

                <div className="space-y-4 pt-3 border-t border-gray-100 text-left">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-black text-[#db5984] tracking-wider uppercase font-mono flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-[#eb5e45]" />
                      การตั้งค่าระบบแจ้งเตือน LINE Bot
                    </label>
                    <span className="text-[9px] bg-[#eb5e45]/10 text-[#eb5e45] px-2 py-0.5 rounded-lg font-bold font-sans">
                      ส่งผลรวมเข้าไลน์กลุ่ม
                    </span>
                  </div>

                  <div className="hidden">
                    <span className="text-[11px] font-black text-gray-850 block">🛡️ ขั้นตอนการติดตั้งบอทในกลุ่มไลน์สำหรับแจ้งเตือนพรียอด:</span>
                    <ol className="list-decimal pl-4.5 space-y-3 text-[11px] leading-relaxed text-gray-750">
                      <li>
                        เปิดแท็บ <strong>Messaging API</strong> ในหน้า LINE Developers Console เลื่อนลงไปด้านล่างสุดและกดปุ่ม <strong>"Issue"</strong> เพื่อสร้างคีย์ Token ยาว ๆ จากนั้นคัดลอกมาวางในหน้าจอด้านล่างนี้เพื่อบันทึกก่อนนะคะ (ดูขั้นตอนวิธีทำด้านล่างสุดละเอียดได้ค่ะ)
                      </li>
                      <li>
                        <span className="text-emerald-800 font-bold">หารหัสกลุ่ม (Group ID) แสนง่าย:</span> คัดลอกลิงก์ Webhook จากตัวเลือกด้านล่างนี้ ไปใส่เป็น <strong>Webhook URL</strong> ในแถบ Messaging API ของคุณ:

                        <div className="space-y-2 mt-2">
                          {/* Option 1: Development Link - Highly recommended for testing */}
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] leading-relaxed text-emerald-900 font-sans">
                            💡 <strong>ตัวเลือกที่ 1 (แนะนำและต้องใช้คลิก Verify): ลิงก์ระบบจริงสาธารณะ (ais-pre) — ผ่านเกณฑ์แน่นอนค่ะ!</strong>
                            <p className="mt-1 text-gray-700 font-sans">
                              ลิงก์นี้เชื่อมต่อเป็นสาธารณะ ทำให้ระบบเซิร์ฟเวอร์ของ LINE เชื่อมโยงได้สมบูรณ์แบบ <strong>เมื่อนำไปใส่ในช่อง Webhook URL และคลิกกดปุ่ม "Verify" จะขึ้นสถานะสมบูรณ์ (Success / 200 OK) ผ่านทันทีค่ะ! 🚀</strong> (หากใช้ลิงก์อื่นที่มีคำว่า dev จะกด Verify ไม่ผ่านเพราะระบบติดสิทธิ์แอดมินนะคะ)
                            </p>
                            <div className="my-2 p-2 bg-white rounded-lg border border-emerald-300 font-mono text-[10px] break-all relative group text-emerald-850">
                              {lineChannelAccessToken.trim() ? (
                                <span>{`${getAbsoluteBackendUrl(config.backendUrl)}/api/line-webhook?token=${encodeURIComponent(lineChannelAccessToken.trim())}`}</span>
                              ) : (
                                <span className="text-gray-400">{`${getAbsoluteBackendUrl(config.backendUrl)}/api/line-webhook`}</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const activeUrl = lineChannelAccessToken.trim()
                                    ? `${getAbsoluteBackendUrl(config.backendUrl)}/api/line-webhook?token=${encodeURIComponent(lineChannelAccessToken.trim())}`
                                    : `${getAbsoluteBackendUrl(config.backendUrl)}/api/line-webhook`;
                                  try {
                                    const textEl = document.createElement("input");
                                    textEl.value = activeUrl;
                                    document.body.appendChild(textEl);
                                    textEl.select();
                                    document.execCommand("copy");
                                    document.body.removeChild(textEl);
                                    alert("คัดลอกลิงก์ Webhook ระบบจริงสาธารณะ (ais-pre) เรียบร้อยแล้วค่ะ! นำไปวางในช่อง Webhook URL ใน LINE Console เพื่อกดปุ่ม Verify ได้เลยน๊า 💖");
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="absolute top-1 right-1 text-[9px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded cursor-pointer font-sans"
                              >
                                คัดลอก
                              </button>
                            </div>
                          </div>

                          {/* Option 2: Pure Tokenless Webhook Link - Super Simple! */}
                          <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-3 text-[11px] leading-relaxed text-indigo-900 font-sans">
                            ✨ <strong>ตัวเลือกที่ 2: ลิงก์ย่อสั้นของระบบจริง (ปลอดภัยสูงสุดสำหรับการใช้งานถาวร)</strong>
                            <p className="mt-1 text-gray-700">
                              หากคุณกรอกและกดบันทึกรหัส <strong>LINE Channel Access Token</strong> ในหน้านี้สำเร็จแล้ว คุณสามารถเอารหัส Token ออกจากท้าย URL แล้วใช้ทางลัดลิงก์สั้น ๆ นี้ได้เลยค่ะ ปลอดภัยและเหมาะกับบอทระยะยาวด้วย:
                            </p>
                            <div className="my-2 p-2 bg-white rounded-lg border border-indigo-200 font-mono text-[10px] break-all relative group text-indigo-800">
                              <span>{`${getAbsoluteBackendUrl(config.backendUrl)}/api/line-webhook`}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const urlToCopy = `${getAbsoluteBackendUrl(config.backendUrl)}/api/line-webhook`;
                                  try {
                                    const textEl = document.createElement("input");
                                    textEl.value = urlToCopy;
                                    document.body.appendChild(textEl);
                                    textEl.select();
                                    document.execCommand("copy");
                                    document.body.removeChild(textEl);
                                    alert("คัดลอกลิงก์ Webhook แบบสั้นเรียบร้อยแล้วค่ะ! อย่าลืมกดบันทึกโทเค็นในระบบก่อนนะคะ 💖");
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="absolute top-1 right-1 text-[9px] bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded cursor-pointer font-sans"
                              >
                                คัดลอก
                              </button>
                            </div>
                          </div>

                          {/* Option 3: Shared Link (ais-pre) */}
                          <div className="bg-amber-50 border border-amber-150 rounded-xl p-3 text-[11px] leading-relaxed text-amber-900 font-sans">
                            🛑 <strong>ตัวเลือกที่ 3 (สำรองเท่านั้น): ลิงก์สำหรับทดลองส่วนตัว (ais-dev) — ⚠️ กด Verify ไม่ผ่านน๊า</strong>
                            <p className="mt-1 text-gray-700">
                              ใช้สำหรับเชื่อมโยงการทดสอบภายในรหัสส่วนบุคคลเท่านั้น เนื่องจากมีโครงคุ้มกันความปลอดภัยครอบอยู่หลังบ้าน หากนำไปใส่ในหน้า LINE Developers Console แล้วคลิกปุ่ม Verify ระบบภายนอกของ LINE จะถูกปฏิเสธและขึ้น Error ทันทีค่ะ แนะนำให้เลือกแชร์ลิงก์ตัวเลือกหลัก (ตัวเลือกที่ 1 หรือ 2) ด้านบนแทนนะคะ:
                            </p>
                            <div className="my-2 p-2 bg-white rounded-lg border border-amber-250 font-mono text-[10px] break-all relative group text-amber-850">
                              {lineChannelAccessToken.trim() ? (
                                <span>{`${window.location.origin}/${lineChannelAccessToken.trim() ? `api/line-webhook?token=${encodeURIComponent(lineChannelAccessToken.trim())}` : 'api/line-webhook'}`}</span>
                              ) : (
                                <span className="text-gray-400">{`${window.location.origin}/api/line-webhook`}</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const urlToCopy = lineChannelAccessToken.trim()
                                    ? `${window.location.origin}/api/line-webhook?token=${encodeURIComponent(lineChannelAccessToken.trim())}`
                                    : `${window.location.origin}/api/line-webhook`;
                                  try {
                                    const textEl = document.createElement("input");
                                    textEl.value = urlToCopy;
                                    document.body.appendChild(textEl);
                                    textEl.select();
                                    document.execCommand("copy");
                                    document.body.removeChild(textEl);
                                    alert("⚠️ คัดลอกลิงก์พัฒนา (ais-dev) สำเร็จ (กรุณาใช้อีก 2 ตัวเลือกด้านบนในการตั้งค่าจริงใน LINE Console เสมอลักษณะนี้จะไม่ผ่านจ้า!)");
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="absolute top-1 right-1 text-[9px] bg-amber-100 hover:bg-amber-150 text-amber-800 px-1.5 py-0.5 rounded cursor-pointer font-sans"
                              >
                                คัดลอก
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        เปิดสวิตช์เปิด <strong>Use webhook</strong> ใน LINE Console เสมอค่ะ จากนั้นลองเชิญบอทคุณเข้ากลุ่มไลน์ แล้วพิมพ์คำว่า <code>id</code> ในกลุ่มไลน์ ระบบจะจับรหัสได้และแจ้งให้คุณก๊อปปี้มาใส่ได้ทันทีค่ะ
                      </li>
                    </ol>

                    {/* Alert Box for Bot Leaving Group / Allow bot to join group chats */}
                    <div className="bg-amber-50 hover:bg-amber-50/80 border border-amber-200 text-amber-800 p-3.5 rounded-xl my-2.5 text-[10.5px] leading-relaxed transition-all">
                      <strong className="text-amber-900 block mb-1 flex items-center gap-1.5 font-bold">
                        ⚠️ ทำไมเชิญบอทเข้ากลุ่มแล้วบอทกดออกจากกลุ่มทันที?
                      </strong>
                      โดยปกติบอท Messaging API จะยังไม่สามารถเข้ากลุ่มได้ ถ้าคุณสร้างใหม่และยังไม่ได้เปิดสิทธิ์ ให้ตั้งค่าดังนี้นะคะ:
                      <ul className="list-decimal pl-4.5 mt-1.5 space-y-1 font-sans">
                        <li>เปิดเข้าไปที่เมนู <strong>Messaging API</strong> ของคุณใน LINE Developers</li>
                        <li>เลื่อนลงด้านล่างจนเจอหัวข้อ <strong>LINE Official Account features</strong></li>
                        <li>มองหา <strong>Allow bot to join group chats</strong> แล้วกดปุ่ม <strong>Edit</strong> สีฟ้า</li>
                        <li>ในหน้าแก้ไข ให้เปลี่ยนหัวข้อ <span className="text-amber-900 font-extrabold">"การเข้าร่วมกลุ่ม/ห้องสนทนาเดี่ยว" (Join groups/multi-person chats)</span> เป็น <span className="text-emerald-700 font-extrabold">"อนุญาต" (Allow)</span> แล้วกดบันทึกค่ะ</li>
                      </ul>
                      <p className="mt-1.5 text-gray-650">
                        จากนั้นดึงบอทเข้ากลุ่มพิมพ์ว่า <code>id</code> จะได้เลข Group ID กลับมาทันทีค่ะ! 💖
                      </p>
                    </div>
                  </div>
                </div>


                    {/* Live Webhook Detections */}
                    <div className="hidden">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-emerald-800 tracking-wider font-mono flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> 📡 ตรวจพบข้อมูลล่าสุดจาก LINE Webhook
                        </span>
                        <button
                          type="button"
                          onClick={fetchWebhookEvents}
                          disabled={isFetchingEvents}
                          className="text-[9.5px] bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          <RefreshCw className={`w-3 h-3 ${isFetchingEvents ? 'animate-spin' : ''}`} />
                          <span>อัพเดทรายการล่าสุด</span>
                        </button>
                      </div>
                      
                      <p className="text-[10.5px] leading-relaxed text-gray-650 font-sans">
                        เมื่อเชิญบอทเข้ากลุ่มไลน์สำเร็จแล้ว ให้พิมพ์คำว่า <code className="bg-white/80 border border-emerald-200 px-1 py-0.5 rounded text-emerald-800 font-bold">id</code> ในกลุ่มแชทไลน์ จากนั้นกดปุ่ม <strong>"อัพเดทรายการล่าสุด"</strong> และคลิก <strong>"ใช้คีย์นี้"</strong> เพื่อรับรหัสไปใส่ในช่องตั้งค่าอัตโนมัติได้เลยค่ะ!
                      </p>

                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                        {webhookEvents.length === 0 ? (
                          <div className="space-y-3 font-sans">
                            <div className="text-center py-4 border border-dashed border-emerald-150 rounded-xl bg-white/60">
                              <p className="text-[10px] text-gray-500 italic">ยังไม่มีสัญญาณข้อมูลจาก LINE Webhook เข้ามาในระบบ</p>
                              <p className="text-[9.5px] text-emerald-800 font-bold mt-0.5">กรุณาตรวจสอบเช็คลิสต์สำคัญ 4 ข้อด้านล่างเพื่อเชื่อมระบบให้สำเร็จนะคะ 👇</p>
                            </div>

                            {/* Checklist Container */}
                            <div className="bg-white border border-emerald-150 p-3 rounded-xl space-y-2.5 text-[10.5px] leading-relaxed text-gray-700 font-sans shadow-2xs">
                              <span className="font-extrabold text-emerald-900 block text-[11px] pb-1 border-b border-emerald-100">
                                🛠️ เช็คลิสต์ 4 ข้อแก้ปัญหา (ทำครบแล้ว รหัสกลุ่มจะขึ้นทันที!)
                              </span>
                              
                              <div className="space-y-2 text-left">
                                <div className="p-2 border-l-3 border-emerald-500 bg-emerald-50/10 rounded-r-lg">
                                  <label className="flex items-start gap-1.5 cursor-pointer">
                                    <input type="checkbox" className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500" />
                                    <span>
                                      <strong>1. นำ Webhook URL ไปวางแล้วหรือยัง?</strong><br/>
                                      คัดลอกลิงก์ Webhook สีเขียวในกล่องวิธีก่อนหน้า นำไปวางในช่อง <strong>"Webhook URL"</strong> ในหน้า LINE Developers (เมนู Messaging API) แล้วกดบันทึก (Update)
                                    </span>
                                  </label>
                                </div>
                                
                                <div className="p-2 border-l-3 border-amber-500 bg-amber-50/10 rounded-r-lg">
                                  <label className="flex items-start gap-1.5 cursor-pointer">
                                    <input type="checkbox" className="mt-0.5 rounded text-amber-600 focus:ring-amber-500" />
                                    <span>
                                      <strong>2. สับสวิตช์เปิด "Use webhook" หรือยัง? (สำคัญมาก!)</strong><br/>
                                      เลื่อนลงมาข้างใต้ช่อง Webhook URL ในหน้า LINE Developers มองหาแถบสวิตช์ <strong>"Use webhook"</strong> และสับเปลี่ยนเป็น <span className="font-bold text-emerald-700 underline">"เปิดใช้งาน" (Active)</span> เป็นสีฟ้าค่ะ
                                    </span>
                                  </label>
                                </div>

                                <div className="p-2 border-l-3 border-sky-500 bg-sky-50/10 rounded-r-lg">
                                  <label className="flex items-start gap-1.5 cursor-pointer">
                                    <input type="checkbox" className="mt-0.5 rounded text-sky-600 focus:ring-sky-500" />
                                    <span>
                                      <strong>3. เปิด Webhook ในระบบหลังบ้าน @LINE OA หรือยัง?</strong><br/>
                                      เปิดลิงก์ <a href="https://manager.line.biz" target="_blank" rel="noopener noreferrer" className="text-sky-700 font-bold underline">manager.line.biz</a> &gt; เข้าเมนู <strong>"ตั้งค่า" (Settings)</strong> มุมขวากล่องด้านบน &gt; เลือก <strong>"การตั้งค่าตอบกลับ" (Response settings)</strong> &gt; ตรวจสอบแถบ <strong>"Webhooks"</strong> ต้องทำสวิตช์ให้เป็นปุ่ม <span className="font-extrabold text-[#eb5e45] underline">"เปิดใช้งาน" (Enabled)</span> เสมอค่ะ!
                                    </span>
                                  </label>
                                </div>

                                <div className="p-2 border-l-3 border-purple-500 bg-purple-50/10 rounded-r-lg">
                                  <label className="flex items-start gap-1.5 cursor-pointer">
                                    <input type="checkbox" className="mt-0.5 rounded text-purple-600 focus:ring-purple-500" />
                                    <span>
                                      <strong>4. พิมพ์ id หรือกดปุ่ม Verify แล้วหรือยัง?</strong><br/>
                                      หลังจากทำ 3 ข้อด้านบนสำเร็จแล้ว ให้ลองพิมพ์คำว่า <code className="bg-emerald-50 px-1 py-0.5 border border-emerald-200 text-emerald-800 rounded font-mono font-bold">id</code> ลงในกลุ่มที่มีบอทอยู่ หรือลองกดปุ่ม <strong>Verify</strong> ในหน้า LINE Developers Console เคล็ดลับตัวช่วยจะเปลี่ยนเป็นข้อมูลกลุ่มทันทีค่ะ!
                                    </span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          webhookEvents.map((ev, i) => (
                            <div key={i} className="bg-white border border-emerald-100 hover:border-emerald-300 rounded-xl p-2.5 flex items-center justify-between text-[11px] shadow-2xs transition-all animate-fade-in">
                              <div className="space-y-0.5 text-left font-sans flex-1 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-black tracking-wide uppercase ${
                                    ev.sourceType === "group" ? "bg-emerald-100 text-emerald-800" :
                                    ev.sourceType === "room" ? "bg-amber-100 text-amber-800" :
                                    ev.sourceType === "system" ? "bg-emerald-600 text-white" : "bg-sky-100 text-sky-800"
                                  }`}>
                                    {ev.sourceType === "group" ? "Group" : ev.sourceType === "room" ? "Room" : ev.sourceType === "system" ? "Verify System" : "User"}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-mono font-bold">{ev.timestamp}</span>
                                </div>
                                <div className="font-mono font-black text-gray-800 select-all font-bold break-all max-w-[280px]">
                                  {ev.sourceId}
                                </div>
                                {ev.text && (
                                  <div className="text-[10px] text-gray-500 font-sans mt-0.5">
                                    ข้อความที่ส่ง: <code className="bg-gray-100 px-1 py-0.5 rounded italic">"{ev.text}"</code>
                                  </div>
                                )}
                              </div>
                              {ev.sourceType !== "system" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      // Also auto-paste the value into the input field!
                                      setLineGroupId(ev.sourceId);
                                      alert(`นำรหัส ${ev.sourceId} ไปป้อนในช่อง LINE Group ID เรียบร้อยแล้วค่ะ อย่าลืมกดบันทึกด้านล่างด้วยนะคะ! 💖`);
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                  className="text-[9.5px] bg-[#eb5e45] hover:bg-[#db5984] text-white px-2.5 py-1.5 rounded-lg font-bold shadow-xs transition shrink-0 cursor-pointer"
                                >
                                  ใช้คีย์นี้
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-650 block">1. LINE Bot Channel Access Token (จากเมนู Messaging API)</span>
                          <button
                            type="button"
                            onClick={() => setShowLineTokenGuide(!showLineTokenGuide)}
                            className="text-[9.5px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer flex items-center gap-1"
                          >
                            ❓ หาจากไหน? (ดูวิธีทำละเอียด)
                          </button>
                        </div>
                        <input
                          type="password"
                          placeholder="วางคีย์ Token ยาว ๆ ขึ้นต้นด้วย eyJ..."
                          value={lineChannelAccessToken}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineChannelAccessToken(val);
                            syncTokenWithServer(val);
                          }}
                          className="w-full text-xs p-2.5 border border-gray-200 focus:border-emerald-500 rounded-xl text-gray-900 font-mono bg-white animate-fade-in"
                        />

                        {/* Collapsible Visual Help Guide */}
                        {showLineTokenGuide && (
                          <div className="bg-emerald-50/70 border border-emerald-150 p-3.5 rounded-xl my-2.5 space-y-2.5 text-[11px] leading-relaxed text-gray-700 animate-fade-in">
                            <h4 className="font-extrabold text-emerald-900 text-[11.5px] border-b border-emerald-150 pb-1.5 flex items-center gap-1">
                              🛡️ ขั้นตอนการหา "Channel Access Token" อย่างละเอียด
                            </h4>
                            <ol className="list-decimal pl-4.5 space-y-2 text-gray-650 font-sans">
                              <li>
                                เปิดเบราว์เซอร์ไปที่หน้า LINE Developers: <a href="https://developers.line.biz" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline">developers.line.biz</a>
                              </li>
                              <li>
                                กดปุ่ม <strong>Log in to Console</strong> และลงชื่อเข้าใช้ด้วยบัญชีไลน์ของคุณ
                              </li>
                              <li>
                                คลิกเลือก <strong>Provider</strong> ของคุณ (หากยังไม่มี ให้กดสร้างใหม่เป็นชื่อร้านคุณ เช่น <code>Yomiie Store</code>)
                              </li>
                              <li>
                                คลิกที่ <strong>Channel</strong> (บอทไลน์) ของคุณ หากยังไม่มี สามารถสร้างใหม่โดยกด <strong>Create a new channel</strong> &gt; เลือกประเภท <strong>Messaging API</strong> และกรอกรูปโปรไฟล์ ชื่อบอท อีเมลสั้นๆ ให้เรียบร้อยค่ะ
                              </li>
                              <li>
                                เมื่อคลิกเข้ามาในหน้าการจัดการบอท (Channel) แล้ว ให้กดแถบเมนู <strong>"Messaging API"</strong> ด้านบนของจอ
                              </li>
                              <li>
                                เลื่อนหน้าเว็บบอร์ดลงมาที่ <span className="font-bold text-emerald-800">ด้านล่างสุด</span> มองหาหัวข้อ <span className="underline font-bold text-emerald-900">"Channel access token (long-lived)"</span>
                              </li>
                              <li>
                                กดปุ่มสีเทา/ฟ้าเขียนว่า <strong>"Issue"</strong> จากนั้น LINE จะสุ่มรหัสตัวอักษรยาวๆ สีคล้ำขึ้นต้นด้วยตัวอักษร <code>e...</code> ให้ทันทีค่ะ!
                              </li>
                              <li>
                                คัดลอก (Copy) รหัสนั้นทั้งหมดมาวางลงในช่อง <strong>"1. LINE Bot Channel Access Token"</strong> ด้านบนนี้ และอย่าลืมกดปุ่ม <strong>"บันทึกข้อมูลร้านค้า"</strong> สีส้มด้านล่างสุดด้วยนะคะ! 💖
                              </li>
                            </ol>
                            <div className="p-2 bg-white/80 border border-emerald-100 rounded-lg text-[10px] text-gray-500 mt-2">
                              💡 <strong>ทำไม Webhook ถึงไม่แสดง "ใช้คีย์นี้"?</strong><br />
                              เนื่องจาก LINE จะไม่ส่งข้อความเข้ามาถ้าหากแอดมินยังไม่ได้นำ <strong>Webhook URL (ในกล่องสีเขียวด้านบน)</strong> ไปตั้งในหน้า LINE Console ตรงคำว่า <strong>Webhook URL</strong> และกดเปิดสวิตช์ <strong>Use Webhook</strong> จนมีเครื่องหมาย Verify สีเขียวด้วยนะคะ!
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-650 block">2. LINE Group ID หรือ User ID (ID ปลายทาง ที่ได้จากบอท)</span>
                        <input
                          type="text"
                          placeholder="เช่น U123ab456... หรือ Gbc789..."
                          value={lineGroupId}
                          onChange={(e) => setLineGroupId(e.target.value)}
                          className="w-full text-xs p-2.5 border border-gray-200 focus:border-emerald-500 rounded-xl text-gray-900 font-mono bg-white"
                        />
                      </div>
                    </div>

                  {/* Method B: Legacy LINE Notify */}
                  <div className="border-t border-[#fee2de] pt-3.5 space-y-2">
                    <span className="text-[10.5px] font-bold text-gray-400 block">
                      🔒 วิธีสำรอง: คีย์ LINE Notify เดิม (เผื่อใช้งานกรณีพิเศษ)
                    </span>
                    <input
                      type="password"
                      placeholder="ป้อนคีย์ Token Notify เดิม..."
                      value={lineToken}
                      onChange={(e) => setLineToken(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-250 focus:border-[#eb5e45] rounded-xl text-gray-400 font-mono bg-gray-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 block">ลิงก์ Google Sheets หลัก (เพื่อสแกนพื้นที่ห่างไกล)</label>
                  <input
                    type="text"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    value={spreadsheetUrl}
                    onChange={(e) => setSpreadsheetUrl(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-900 font-mono"
                  />
                </div>
              </div>

              {/* Action Connection test */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isTesting || (!lineToken.trim() && !appsScriptUrl.trim() && !(lineChannelAccessToken.trim() && lineGroupId.trim()))}
                  className="w-full bg-[#eb5e45]/5 hover:bg-[#eb5e45]/10 border border-[#fddbd4] text-[#eb5e45] disabled:opacity-40 text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#eb5e45] ${isTesting ? 'animate-spin' : ''}`} />
                  <span>ทดสอบยิงรายการพรีออเดอร์จำลอง & ตรวจการแจ้งเตือน LINE</span>
                </button>
              </div>

              {/* Test Connection messages */}
              {testResult && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed font-sans ${
                  testResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-start gap-1.5">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                    <span className="font-semibold">{testResult.message}</span>
                  </div>
                </div>
              )}

              {/* Email Notification credentials */}
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-black text-[#db5984] tracking-wider uppercase font-mono flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> ตั้งค่าระบบส่งเมลสรุปให้ลูกค้า
                  </h4>
                  <span className="text-[9px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-lg font-bold font-sans">
                    Gmail SMTP
                  </span>
                </div>

                <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3.5 space-y-2 text-[10.5px] leading-relaxed">
                  <p className="text-gray-600">
                    หากคุณกรอกตั้งค่าในหน้านี้ ระบบจะส่งอีเมลสรุปข้อมูลรายการสินค้าและรายละเอียดการจองให้ลูกค้าตามอีเมลที่กรอกในหน้าฟอร์มทันทีที่สั่งซื้อสำเร็จค่ะ
                  </p>
                  <p className="text-red-500 font-bold">
                    *สำคัญ: ต้องเป็น แอพพาสเวิร์ด (App Password) 16 หลักของ Gmail เท่านั้นนะคะ ไม่ใช่รหัสผ่านอีเมลปกติของคุณค่ะ
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-750 block">อีเมลผู้ส่ง (Gmail สำหรับใช้ส่งแฝง)</label>
                    <input
                      type="email"
                      placeholder="เช่น shop@gmail.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-950 font-mono bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-750 block">Gmail App Password (16 หลัก)</label>
                    <input
                      type="password"
                      placeholder="เช่น abcd efgh ijkl mnop"
                      value={senderAppPass}
                      onChange={(e) => setSenderAppPass(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-950 font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Bank accounts setup details */}
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <h4 className="text-[11px] font-black text-[#db5984] tracking-wider uppercase font-mono">
                  💳 ตั้งค่าบัญชีธนาคารและพร้อมเพย์
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600 block">ชื่อธนาคาร</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-900 font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600 block">เลขบัญชี</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-950 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600 block">ชื่อเจ้าของบัญชี</label>
                    <input
                      type="text"
                      value={bankOwner}
                      onChange={(e) => setBankOwner(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-900 font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600 block">เบอร์พร้อมเพย์ PromptPay</label>
                    <input
                      type="text"
                      value={promptPay}
                      onChange={(e) => setPromptPay(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-950 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Custom questions setup details */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-black text-[#db5984] tracking-wider uppercase font-mono">
                    💬 คำถามเพิ่มเติมในหน้าฟอร์มสั่งซื้อ
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = String(Date.now());
                      setCustomQuestions([
                        ...customQuestions,
                        { id: newId, label: '', type: 'text', required: false, options: '' }
                      ]);
                    }}
                    className="text-[10px] bg-pink-50 hover:bg-pink-100 border border-pink-200 text-[#db5984] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เพิ่มคำถาม</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {customQuestions.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">
                      ยังไม่มีคำถามเพิ่มเติม (ในฟอร์มจะแสดงเฉพาะข้อมูลลูกค้า รายการสินค้า และที่อยู่จัดส่งปกติ)
                    </p>
                  ) : (
                    customQuestions.map((q, index) => (
                      <div key={q.id} className="p-3 bg-[#fcfbfa] border border-[#f5efec] rounded-xl space-y-2.5 relative">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomQuestions(customQuestions.filter(item => item.id !== q.id));
                          }}
                          className="absolute top-2.5 right-2 text-gray-400 hover:text-red-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-6">
                          <div className="space-y-1 text-xs">
                            <label className="text-[10px] font-bold text-gray-500">หัวข้อคำถาม (Label)</label>
                            <input
                              type="text"
                              placeholder="เช่น มีของแถมที่ต้องการเพิ่มเติม?, สีพรีที่ต้องการ"
                              value={q.label}
                              onChange={(e) => {
                                const updated = [...customQuestions];
                                updated[index].label = e.target.value;
                                setCustomQuestions(updated);
                              }}
                              className="w-full text-xs p-2 border border-gray-200 focus:border-[#eb5e45] rounded-lg text-gray-950 font-sans font-bold bg-white"
                            />
                          </div>

                          <div className="space-y-1 text-xs">
                            <label className="text-[10px] font-bold text-gray-500">ประเภทคำตอบ (Type)</label>
                            <select
                              value={q.type}
                              onChange={(e) => {
                                const updated = [...customQuestions];
                                updated[index].type = e.target.value as any;
                                setCustomQuestions(updated);
                              }}
                              className="w-full text-xs p-2 border border-gray-200 focus:border-[#eb5e45] rounded-lg text-gray-900 font-sans bg-white"
                            >
                              <option value="text">กรอกข้อความ สั้น</option>
                              <option value="textarea">กรอกข้อความ ยาว</option>
                              <option value="select">ตัวเลือก Dropdown</option>
                            </select>
                          </div>
                        </div>

                        {q.type === 'select' && (
                          <div className="space-y-1 text-xs text-left">
                            <label className="text-[10px] font-bold text-gray-500">พิมพ์ตัวเลือกทั้งหมด (คั่นด้วยสัญลักษณ์ลูกน้ำ , เช่น แดง, น้ำเงิน, ดำ)</label>
                            <input
                              type="text"
                              placeholder="เช่น ไซส์ S, ไซส์ M, ไซส์ L"
                              value={q.options || ''}
                              onChange={(e) => {
                                const updated = [...customQuestions];
                                updated[index].options = e.target.value;
                                setCustomQuestions(updated);
                              }}
                              className="w-full text-xs p-2 border border-gray-200 focus:border-[#eb5e45] rounded-lg text-gray-950 font-sans bg-white"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 pt-0.5 text-xs text-left justify-start">
                          <input
                            type="checkbox"
                            id={`req-${q.id}`}
                            checked={q.required}
                            onChange={(e) => {
                              const updated = [...customQuestions];
                              updated[index].required = e.target.checked;
                              setCustomQuestions(updated);
                            }}
                            className="rounded text-[#eb5e45] focus:ring-[#eb5e45] w-3.5 h-3.5 cursor-pointer"
                          />
                          <label htmlFor={`req-${q.id}`} className="text-[11px] text-gray-650 font-bold cursor-pointer select-none">
                            จำเป็นต้องกรอกคำตอบข้อนี้ (Required)
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: LOCAL SUBMISSION ORDER HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fade-in text-left">
              <div className="flex justify-between items-center min-h-[32px]">
                <span className="text-[11px] font-black text-[#db5984] tracking-wider uppercase font-mono">
                  📜 รายการออเดอร์ล่าสุด
                </span>
                {localOrders.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportCSV}
                      className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>ดาวน์โหลด CSV / Excel</span>
                    </button>
                    {confirmClear ? (
                      <div className="flex items-center gap-2 animate-fade-in text-[10px]">
                        <span className="text-red-500 font-bold shrink-0">ยืนยันลบประวัติ?</span>
                        <button
                          onClick={handleClearHistory}
                          className="px-1.5 py-0.5 bg-red-100 text-red-700 hover:bg-red-200 rounded font-bold cursor-pointer shrink-0 transition text-[9px]"
                        >
                          ใช่, ลบเลย
                        </button>
                        <button
                          onClick={() => setConfirmClear(false)}
                          className="px-1.5 py-0.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-bold cursor-pointer shrink-0 transition text-[9px]"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmClear(true)}
                        className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                         ล้างประวัติ
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Search history bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาตามเบอร์โทรศัพท์, ชื่อลูกค้า, รหัสไปรษณีย์ หรือสินค้า..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full text-xs p-2.5 pl-9 border border-gray-200 focus:border-[#eb5e45] rounded-xl text-gray-900 font-sans"
                />
              </div>

              {/* Logs lists wrapper */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {filteredOrders.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-gray-100 rounded-2xl text-center text-gray-400 font-sans font-bold text-xs space-y-1">
                    <p>📸 ยังไม่พบรายการประวัติการป้อนจองพรีออเดอร์</p>
                    <p className="font-normal text-[11px] text-gray-400">ออเดอร์ใหม่พรีออเดอร์ของลูกค้าที่กรอกเสร็จจะจารึกโชว์ประวัติไว้ที่นี่ด้วยค่ะ</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="p-3.5 bg-[#fcfbfa] border border-[#f5efec] rounded-2xl space-y-2 text-xs leading-relaxed"
                    >
                      <div className="flex justify-between items-center text-[9px] font-bold border-b border-dashed border-pink-100 pb-1.5">
                        <span className="text-[#db5984]">⏰ วัน: {order.timestamp}</span>
                        {(() => {
                          const sel = (order as any).remoteAreaSelection;
                          if (sel === '-') {
                            return (
                              <span className="px-1.5 py-0.5 rounded font-black bg-gray-100 text-gray-700">
                                -
                              </span>
                            );
                          }
                          let isRemote = false;
                          if (sel === 'อยู่ค่า') {
                            isRemote = true;
                          } else if (sel === 'ไม่อยู่ค่ะ') {
                            isRemote = false;
                          } else {
                            isRemote = !!order.isRemoteArea;
                          }
                          return (
                            <span className={`px-1.5 py-0.5 rounded font-black ${
                              isRemote ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {isRemote ? 'พื้นที่ห่างไกล' : 'พื้นที่ปกติ'}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="text-[11px]">
                        <p className="text-gray-500 font-medium">Account:</p>
                        <p className="font-bold text-gray-900">{order.customerAccount || order.name}</p>
                      </div>

                      {order.customAnswers && order.customAnswers.length > 0 && (
                        <div className="bg-amber-50/40 p-2.5 border border-amber-100 rounded-xl space-y-1 text-[11px]">
                          <p className="font-bold text-[#eb5e45] flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            คำตอบเพิ่มเติม:
                          </p>
                          <div className="pl-4.5 text-gray-700 font-medium whitespace-pre-wrap">
                            {order.customAnswers.map((ans, idx) => (
                              <p key={idx}>• <span className="font-bold text-gray-800">{ans.label}:</span> {ans.value}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[11px] text-gray-650 font-sans">
                        <p className="font-bold text-gray-600">ที่อยู่จัดส่ง:</p>
                        <p className="bg-gray-50 p-2 rounded-xl text-[10.5px] whitespace-pre-wrap text-left">
                          {order.shippingInfo || `${order.detailAddress} ต.${order.subdistrict} อ.${order.district} จ.${order.province} ${order.postalCode}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP SHEETS INTEGRATION GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 animate-fade-in text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#db5984] tracking-wider uppercase font-mono">
                  🛠️ วิธีเชื่อมต่อเข้าสเปรดชีต Google Sheets
                </span>
              </div>

              {/* Guide Selector Sub-tabs */}
              <div className="flex border border-gray-150 p-1 bg-gray-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setGuideSubTab('nocode')}
                  className={`flex-1 py-1.5 text-[10.5px] font-extrabold rounded-lg tracking-tight transition cursor-pointer ${
                    guideSubTab === 'nocode'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  ทางเลือกที่ 1: เล่นง่ายปลอดภัยผ่าน Zapier / Make (แนะนํา)
                </button>
                <button
                  type="button"
                  onClick={() => setGuideSubTab('script')}
                  className={`flex-1 py-1.5 text-[10.5px] font-extrabold rounded-lg tracking-tight transition cursor-pointer ${
                    guideSubTab === 'script'
                      ? 'bg-[#eb5e45] text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  ทางเลือกที่ 2: ใช้ Google Apps Script (ฟรี 100%)
                </button>
              </div>

              {guideSubTab === 'nocode' ? (
                <div className="bg-indigo-50/75 border border-indigo-100 rounded-xl p-4.5 space-y-3 text-xs text-gray-755 leading-relaxed font-sans animate-fade-in">
                  <h4 className="font-black text-indigo-950 flex items-center gap-1.5 text-[12px] border-b border-indigo-150 pb-2">
                    🔌 ขั้นตอนเชื่อมผ่าน Zapier / Make.com เข้า Google Sheets (รองรับภาษาไทย ปลอดภัยสูง)
                  </h4>
                  <p>
                    วิธีนี้แนะนําที่สุดและปลอดภัยสูงสุด <strong>ไม่ต้องกลัวตัวอักษรภาษาไทยเพี้ยน</strong> และไม่ต้องให้คนภายนอกเข้าถึงชีตส่วนตัวของท่านเลยค่ะ:
                  </p>
                  
                  <ol className="list-decimal pl-4.5 space-y-2.5 font-medium text-gray-700 font-sans">
                    <li>
                      <strong>สร้าง Webhook URL ปลายทาง:</strong> ลงชื่อเข้าใช้แอปเชื่อมความปลอดภัยยอดนิยมอย่าง <a href="https://zapier.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-extrabold">Zapier.com</a> หรือ <a href="https://make.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-extrabold">Make.com</a>
                    </li>
                    <li>
                      สร้าง Scenario / Zap ใหม่ และระบุ <strong>Trigger</strong> แรกเป็นแอป <strong>"Webhooks"</strong> จากนั้นคลิกเลือก Custom Event/Trigger เป็น <strong>"Catch Hook"</strong>
                    </li>
                    <li>
                      คัดลอกลิงก์ Webhook พิเศษที่ระบบสร้างขึ้นมา (เช่น <code>https://hooks.zapier.com/hooks/catch/...</code>)
                    </li>
                    <li>
                      นำลิงก์ที่ถูกคัดลอกตัวนั้นไปป้อนลงในช่อง <strong>"Webhook URL / ลิงก์เชื่อมโยงชีต (ตั้งค่าเด่นในแท็บที่ 1)"</strong> ด้านบน จากนั้นกดปุ่ม <strong>"บันทึกข้อมูลร้านค้า"</strong>
                    </li>
                    <li>
                      <strong>เชื่อมโยงเข้าชีต:</strong> ใน Zapier/Make ให้เพิ่ม Action ลำดับที่สอง เลือกแอปเป็น <strong>"Google Sheets"</strong> &gt; เลือกคำสั่งเป็น <strong>"Create Spreadsheet Row"</strong>
                    </li>
                    <li>
                      ผูกมัดหรือเชื่อมโยงเข้ากับพอยเตอร์บัญชี Google ของคุณ แล้วลากไอเทมต่าง ๆ ที่ระบบได้รับจาก Webhook เช่น <code>name</code> (ชื่อ), <code>phone</code> (เบอร์โทร), <code>totalAmount</code> (ยอดรวม), <code>slipUrl</code> (ลิงก์รูปสลิป) และท่านสามารถลากฟิลด์แยกยอดเยี่ยมอย่าง <code>transferDateOnly</code> (วันที่ทำรายการอย่างเดียว) และ <code>transferTimeOnly</code> (เวลาทำรายการอย่างเดียว) ไปกรอกลงชีตอย่างเป็นระเบียบแยกคอลัมน์ได้ตามใจชอบค่ะ! 🚀
                    </li>
                  </ol>
                  <div className="p-3 bg-white/70 border border-indigo-100 rounded-xl text-[10.5px] text-gray-500">
                    💡 <strong>คำแนะนำแสนง่าย:</strong> เมื่อใส่คีย์ URL และบันทึกเรียบร้อย ลองใช้ปุ่ม <strong>"ทดสอบยิงรายการพรีออเดอร์จำลอง & ตรวจการแจ้งเตือน LINE"</strong> ในแถบตั้งค่าเพื่อส่งรายละเอียดออเดอร์จำลองสำเร็จให้ Zapier/Make ดึงแผนผังคอลัมน์ให้สมบูรณ์ขึ้นได้ค่ะ
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="bg-[#fef9f7] border border-[#fbebeb] rounded-xl p-4.5 space-y-3.5 text-xs text-gray-650 leading-relaxed font-sans">
                    <p>
                      เพื่อให้ระบบฟอร์มและบันทึกทำงานอย่างมีประสิทธิภาพใน Google Sheet และบันทึกยอดพรีออเดอร์พร้อมสลิปได้ฟรีตลอด 100% โปรดทำตามขั้นตอนดังนี้ค่ะ:
                    </p>

                    <ol className="list-decimal pl-4.5 space-y-2 font-medium">
                      <li>
                        เปิดสเปรดชีต Google Sheet ใหม่หรือตัวเดิมของร้านค้า
                      </li>
                      <li>
                        ไปที่แท็บเมนูด้านบน คลิก <strong>"ส่วนขยาย" (Extensions)</strong> &gt; <strong>"Apps Script"</strong>
                      </li>
                      <li>
                        ลบโค้ดเริ่มต้นที่แสดงทิ้งทั้งหมด
                      </li>
                      <li>
                        คลิกปุ่ม <strong>"คัดลอกโค้ดสคริปต์"</strong> เพื่อคัดลอกสคริปต์สำรองที่เขียนไว้สมบูรณ์ด้านล่างนี้ นำไปวางในหน้าวางโค้ด Apps Script
                      </li>
                      <li>
                        กดปุ่ม <strong>"การทำให้ใช้งานได้" (Deploy)</strong> &gt; <strong>"การทำให้ใช้งานได้ใหม่" (New Deployment)</strong>
                      </li>
                      <li>
                        เลือกประเภทเป็น <strong>"เว็บแอป" (Web app)</strong>
                      </li>
                      <li>
                        ตั้งค่าให้สิทธิ์เข้าถึง: ผู้ดำเนินการเป็น <strong>"ตัวฉัน" (Me)</strong> และ ผู้มีสิทธิ์เข้าถึงเป็น <strong>"ทุกคน" (Anyone)</strong> *สำคัญมาก*
                      </li>
                      <li>
                        กดบันทึก Deploy และยืนยันความปลอดภัย คัดลอกเบราว์เซอร์ **Web App URL** มาวางในช่องด้านบนเลยค่ะ!
                      </li>
                    </ol>

                    <div className="pt-2">
                      <button
                        onClick={handleCopyScript}
                        className="w-full bg-[#db5984] hover:bg-[#c4406a] text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:translate-y-0.5"
                      >
                        <Copy className="w-4 h-4" />
                        <span>{copiedScript ? 'คัดลอกสำเร็จแล้วค่ะ! 💖' : 'คัดลอกโค้ดสคริปต์ Google Apps Script'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Code Script View pre block */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 block">พรีวิวสคริปต์ติดตั้ง (Preview Shell Code):</label>
                    <pre className="text-[10px] p-4 bg-gray-900 text-gray-100 rounded-2xl overflow-x-auto font-mono max-h-56 leading-relaxed select-all">
                      {APPS_SCRIPT_TEMPLATE}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Drawer Footer controls */}
        <div className="px-5 py-4 border-t border-[#f0f2f5] flex items-center justify-between bg-gray-50">
          <div className="flex flex-col items-start gap-1 text-left">
            <button
              onClick={onResetToDemo}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer"
              type="button"
            >
              รีเซ็ตกลับเป็น Demo รหัสว่าง
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-[11px] font-bold text-gray-400 hover:text-red-500 hover:underline cursor-pointer"
                type="button"
              >
                ออกจากระบบแอดมิน (Lock)
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs border border-gray-200 bg-white text-gray-650 hover:bg-gray-100 rounded-xl transition font-bold"
              type="button"
            >
              กลับ
            </button>
            <button
              onClick={handleSave}
              className="px-4.5 py-2 text-xs bg-[#eb5e45] hover:bg-[#db523c] text-white font-bold rounded-xl shadow-sm hover:shadow transition cursor-pointer"
              type="button"
            >
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
