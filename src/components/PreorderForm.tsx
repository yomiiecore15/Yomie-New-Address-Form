import React, { useState, useEffect } from 'react';
import { SheetConfig, PreorderItem, PreorderData, PostalCodeData } from '../types';
import { 
  ShoppingBag, User, Phone, MessageSquare, MapPin, 
  Plus, Trash2, CreditCard, Calendar, Upload, 
  CheckCircle, AlertCircle, RefreshCw, Send, HelpCircle, FileText, Wallet,
  Copy, Check, Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractSpreadsheetId, buildQueryUrl, parsePostalCodeGvizData, SAMPLE_POSTAL_CODES, getBackendUrl, getAbsoluteBackendUrl } from '../sampleData';

const parseShippingText = (text: string) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // 1. Extract Name (Take first line and discard trailing punctuation or phones)
  let parsedName = '';
  if (lines.length > 0) {
    let firstLine = lines[0];
    firstLine = firstLine
      .replace(/0[2345689]\d{8}/g, '')
      .replace(/02\d{7}/g, '')
      .replace(/\+?66\d{8,9}/g, '')
      .replace(/โทร\.?[:\s]*/gi, '')
      .replace(/tel\.?[:\s]*/gi, '')
      .replace(/[\(\):,-]/g, '')
      .trim();
    parsedName = firstLine;
  }

  // 2. Extract Phone
  let parsedPhone = '';
  const cleanDigits = text.replace(/[-\s\(\)]/g, '');
  const directMatches = cleanDigits.match(/(0[345689]\d{8}|02\d{7})/);
  if (directMatches) {
    parsedPhone = directMatches[0];
  } else {
    const altMatch = text.replace(/[^0-9]/g, '').match(/(0\d{8,9})/);
    if (altMatch) {
      parsedPhone = altMatch[0];
    }
  }

  // 3. Extract 5-digit postal code
  const zipMatch = text.match(/\b\d{5}\b/);
  const parsedZip = zipMatch ? zipMatch[0] : '';

  return { parsedName, parsedPhone, parsedZip };
};

interface PreorderFormProps {
  config: SheetConfig;
  onSuccess: (order: PreorderData) => void;
}

interface PreorderFormDraft {
  name?: string;
  phone?: string;
  contact?: string;
  customerAccount?: string;
  customerGmail?: string;
  shippingInfo?: string;
  postalCode?: string;
  detailAddress?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  isRemoteArea?: boolean;
  remoteAreaSelection?: string;
  items?: PreorderItem[];
  totalAmount?: string;
  paymentMethod?: string;
  paymentMethodOther?: string;
  shippingPaymentStatus?: string;
  transferAmount?: string;
  transferDate?: string;
  transferTime?: string;
  agreeTerms?: boolean;
  customAnswers?: Record<string, string>;
  additionalNotes?: string;
}

export const PreorderForm: React.FC<PreorderFormProps> = ({ config, onSuccess }) => {
  // Load draft from localStorage safely
  const [draft] = useState<PreorderFormDraft>(() => {
    try {
      const saved = localStorage.getItem('yomie_preorder_form_draft');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Customer Details states
  const [name, setName] = useState(draft.name || '');
  const [phone, setPhone] = useState(draft.phone || '');
  const [contact, setContact] = useState(draft.contact || '');
  const [customerAccount, setCustomerAccount] = useState(draft.customerAccount || '');
  const [customerGmail, setCustomerGmail] = useState(draft.customerGmail || 'change_address@yomiie.com');
  
  // Shipping Address states
  const [shippingInfo, setShippingInfo] = useState(draft.shippingInfo || '');
  const [postalCode, setPostalCode] = useState(draft.postalCode || '');
  const [detailAddress, setDetailAddress] = useState(draft.detailAddress || '');
  const [subdistrict, setSubdistrict] = useState(draft.subdistrict || '');
  const [district, setDistrict] = useState(draft.district || '');
  const [province, setProvince] = useState(draft.province || '');
  const [isRemoteArea, setIsRemoteArea] = useState(draft.isRemoteArea || false);
  const [isSearchingZip, setIsSearchingZip] = useState(false);
  const [zipMessage, setZipMessage] = useState<{ type: 'success' | 'warn' | 'error', text: string } | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const handleShippingInfoChange = (val: string) => {
    setShippingInfo(val);
    const { parsedName, parsedPhone, parsedZip } = parseShippingText(val);
    if (parsedName) setName(parsedName);
    if (parsedPhone) setPhone(parsedPhone);
    if (parsedZip) setPostalCode(parsedZip);
    setDetailAddress(val.trim());
  };

  // Preorder Items
  const [items, setItems] = useState<PreorderItem[]>(
    draft.items || [{ id: '1', itemName: '', quantity: 1, notes: '' }]
  );

  // Payment states
  const [totalAmount, setTotalAmount] = useState<string>(draft.totalAmount || '');
  const [remoteAreaSelection, setRemoteAreaSelection] = useState<string>(draft.remoteAreaSelection || '');
  const [paymentMethod, setPaymentMethod] = useState<string>(draft.paymentMethod || '');
  const [paymentMethodOther, setPaymentMethodOther] = useState<string>(draft.paymentMethodOther || '');
  const [shippingPaymentStatus, setShippingPaymentStatus] = useState<string>(draft.shippingPaymentStatus || '');
  const [transferAmount, setTransferAmount] = useState<string>(() => {
    if (draft.transferAmount !== undefined && draft.transferAmount !== null) {
      const clean = String(draft.transferAmount).replace(/\D/g, '');
      return clean ? Number(clean).toLocaleString('en-US') : '';
    }
    return '';
  });
  const [transferDate, setTransferDate] = useState(draft.transferDate || '');
  const [transferTime, setTransferTime] = useState(draft.transferTime || '');
  const [slipImage, setSlipImage] = useState<string | null>(null); // Keep slipImage local storage-free to avoid overflow / quota errors
  const [slipName, setSlipName] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState(draft.agreeTerms || false);
  const [additionalNotes, setAdditionalNotes] = useState(draft.additionalNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Custom answers state
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>(draft.customAnswers || {});

  const handleAnswerChange = (qId: string, val: string) => {
    setCustomAnswers(prev => ({ ...prev, [qId]: val }));
  };

  // Safe effect to save state developments as design draft in LocalStorage
  useEffect(() => {
    try {
      const currentDraft: PreorderFormDraft = {
        name,
        phone,
        contact,
        customerAccount,
        customerGmail,
        shippingInfo,
        postalCode,
        detailAddress,
        subdistrict,
        district,
        province,
        isRemoteArea,
        remoteAreaSelection,
        items,
        totalAmount,
        paymentMethod,
        paymentMethodOther,
        shippingPaymentStatus,
        transferAmount,
        transferDate,
        transferTime,
        agreeTerms,
        customAnswers,
        additionalNotes
      };
      localStorage.setItem('yomie_preorder_form_draft', JSON.stringify(currentDraft));
    } catch (e) {
      console.error("Failed to write preorder form draft", e);
    }
  }, [
    name, phone, contact, customerAccount, customerGmail,
    shippingInfo, postalCode, detailAddress, subdistrict, district, province,
    isRemoteArea, remoteAreaSelection, items, totalAmount,
    paymentMethod, paymentMethodOther, shippingPaymentStatus,
    transferAmount, transferDate, transferTime, agreeTerms, customAnswers, additionalNotes
  ]);

  // Fetch full postal codes database to support auto-completions & surcharges
  const [postalDatabase, setPostalDatabase] = useState<PostalCodeData[]>(SAMPLE_POSTAL_CODES);

  useEffect(() => {
    const fetchRemoteDatabase = async () => {
      if (!config.useFallbackSample && config.spreadsheetId) {
        try {
          const queryUrl = buildQueryUrl(config.spreadsheetId, config.sheetName, config.spreadsheetUrl);
          const response = await fetch(queryUrl);
          if (response.ok) {
            const text = await response.text();
            const parsed = parsePostalCodeGvizData(text);
            if (parsed.length > 0) {
              setPostalDatabase(parsed);
            }
          }
        } catch (e) {
          console.error("Postal DB fetch failed. Falling back to default codes.", e);
        }
      }
    };
    fetchRemoteDatabase();
  }, [config]);

  // Handle 5-digit postal code lookup
  useEffect(() => {
    const cleanZip = postalCode.trim().replace(/[^0-9]/g, '');
    if (cleanZip.length !== 5) {
      setZipMessage(null);
      setIsRemoteArea(false);
      setRemoteAreaSelection('');
      return;
    }

    setIsSearchingZip(true);
    setZipMessage(null);

    // Simulate small delay for premium UX feel
    setTimeout(() => {
      const matches = postalDatabase.filter(p => p.postalCode === cleanZip);
      
      if (matches.length > 0) {
        // Look for any match representing remote area
        const remoteMatch = matches.find(p => {
          const areaL = (p.area || "").toLowerCase();
          if (config.useFallbackSample) {
            return areaL.includes("ห่างไกล") || areaL.includes("พิเศษ") || areaL.includes("เกาะ") || areaL.includes("ดอย") || areaL.includes("ชายแดน") || areaL.includes("remote") || areaL.includes("20") || !areaL.includes("ปกติ");
          }
          return true; // All rows in the configured Google Sheets are remote areas
        });

        const activeMatch = remoteMatch || matches[0];
        
        // Auto-populate
        setSubdistrict(activeMatch.subdistrict || "");
        setProvince(activeMatch.province || "");
        
        // Fallback district lookup by subdistrict or defaults
        if (activeMatch.province === "เชียงใหม่" && activeMatch.subdistrict === "อมก๋อย") {
          setDistrict("อมก๋อย");
        } else if (activeMatch.province === "แม่ฮ่องสอน") {
          setDistrict("ปางมะผ้า");
        } else if (activeMatch.province === "กระบี่") {
          setDistrict("เกาะลันตา");
        } else {
          setDistrict(""); // Let user fill
        }

        if (remoteMatch) {
          setIsRemoteArea(true);
          setRemoteAreaSelection('อยู่ค่า');
          setZipMessage({
            type: 'warn',
            text: `บวกค่าส่งเพิ่ม +20.- สำหรับพื้นที่ห่างไกล: ${activeMatch.area || 'พื้นที่ห่างไกล/พิเศษของระบบ'}`
          });
        } else {
          setIsRemoteArea(false);
          setRemoteAreaSelection('ไม่อยู่ค่ะ');
          setZipMessage(null);
        }
      } else {
        setIsRemoteArea(false);
        setRemoteAreaSelection('ไม่อยู่ค่ะ');
        setZipMessage(null);
      }
      setIsSearchingZip(false);
    }, 500);

  }, [postalCode, postalDatabase, config.useFallbackSample]);

  // Handle Items changes
  const handleAddItem = () => {
    const newId = String(Date.now());
    setItems([...items, { id: newId, itemName: '', quantity: 1, notes: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemDetails = (id: string, field: keyof PreorderItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Drag and Drop & Slip Upload handles with Canvas Image Compression
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("กรุณาเลือกไฟล์รูปภาพที่ถูกต้องนะคะ 📸");
      return;
    }

    setSlipName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress using Canvas for robust Google Sheets handling (Limit max width/height to 600px)
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 500;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // High compression output quality (0.6) to keep sheets cells from breaking
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
          setSlipImage(compressedBase64);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Submit Order Details to server
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form Validations
    if (!customerAccount.trim()) return setFormError("กรุณากรอกชื่อ Account ของคุณลูกค้าในส่วนข้อมูลลูกค้าด้วยนะคะ");
    if (!customerAccount.trim().startsWith('@')) {
      return setFormError("ชื่อ Account ต้องเริ่มต้นด้วย @ เสมอค่ะ (เช่น @yomiie_core)");
    }

    if (!shippingInfo.trim()) return setFormError("กรุณากรอกหรือวางข้อมูล ชื่อ / ที่อยู่ / เบอร์โทรศัพท์ ในการจัดส่งด้วยนะคะ");

    const isSkippedShipping = shippingInfo.trim() === '-';
    let finalName = '';
    let finalPhone = '';
    let finalPostalCode = '';

    if (isSkippedShipping) {
      finalName = '(ถามภายหลัง)';
      finalPhone = '0000000000';
      finalPostalCode = '00000';
    } else {
      // Robust extraction fallback if name, phone, postalCode are empty
      const { parsedName, parsedPhone, parsedZip } = parseShippingText(shippingInfo);
      finalName = name.trim() || parsedName.trim() || (shippingInfo.split('\n')[0] || "คุณลูกค้า").substring(0, 40).trim();
      finalPhone = (phone.trim() || parsedPhone.trim() || "0000000000").replace(/[^0-9]/g, '');
      finalPostalCode = postalCode.trim() || parsedZip.trim();

      if (!finalName) {
        return setFormError("กรุณาระบุชื่อผู้รับด้วยนะคะ");
      }
      if (finalPhone.length < 9) {
        return setFormError("กรุณาระบุเบอร์โทรศัพท์ที่ติดต่อได้ในข้อมูลที่อยู่ด้วยนะคะ");
      }
      if (!finalPostalCode) {
        finalPostalCode = '-';
      }
    }

    if (!agreeTerms) return setFormError("กรุณาทำเครื่องหมายยินยอมกรณี 'รับทราบค่า ♡' ด้วยนะคะ");

    setIsSubmitting(true);

    const submissionPayload = {
      name: finalName,
      phone: finalPhone,
      contact: contact.trim() || "(ไม่ได้ระบุ)",
      customerAccount: customerAccount.trim(),
      customerGmail: customerGmail.trim(),
      postalCode: finalPostalCode,
      subdistrict: isSkippedShipping ? '-' : (subdistrict.trim() || "ไม่พบตำบล"),
      district: isSkippedShipping ? '-' : (district.trim() || "ไม่พบอำเภอ"),
      province: isSkippedShipping ? '-' : (province.trim() || "ไม่พบจังหวัด"),
      detailAddress: detailAddress.trim(),
      items: [{ itemName: "เปลี่ยนที่อยู่จัดส่ง", quantity: 1, notes: "" }],
      totalAmount: 0,
      paymentMethod: "เปลี่ยนที่อยู่",
      paymentMethodOther: undefined,
      shippingPaymentStatus: "-",
      transferAmount: 0,
      transferTime: new Date().toLocaleString("th-TH"),
      transferDateInSlip: "-",
      transferTimeInSlip: "-",
      additionalNotes: "",
      remoteAreaSelection: "-",
      slipBase64: undefined,
      isRemoteArea: false,
      shippingInfo: shippingInfo.trim(),
      customAnswers: [],
      customFieldsSummary: undefined,
      originUrl: getAbsoluteBackendUrl(config.backendUrl),
      // Pass config webhooks to let full-stack proxy forward real-time + smtp details
      appsScriptUrl: config.appsScriptUrl,
      lineToken: config.lineToken,
      lineChannelAccessToken: config.lineChannelAccessToken,
      lineGroupId: config.lineGroupId,
      senderEmail: config.senderEmail,
      senderAppPass: config.senderAppPass,
      shopName: config.shopName
    };

    try {
      const response = await fetch(`${getBackendUrl(config.backendUrl)}/api/submit-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(submissionPayload)
      });

      if (!response.ok) {
        let errMsg = "";
        try {
          const errBody = await response.json();
          errMsg = errBody?.message || errBody?.error || `Server error status: ${response.status}`;
        } catch (_) {
          errMsg = `รหัสข้อผิดพลาดเซิร์ฟเวอร์: ${response.status}`;
        }
        throw new Error(errMsg);
      }

      const resJson = await response.json();
      
      if (resJson.success) {
        // Clear saved draft from localStorage
        try {
          localStorage.removeItem('yomie_preorder_form_draft');
        } catch (e) {
          console.error(e);
        }

        // Complete state trigger onSuccess
        const d = new Date();
        const timestamp = `${d.getDate()}:${d.getMonth() + 1}:${d.getFullYear()} (${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')})`;
        onSuccess({
          id: String(Date.now()),
          timestamp,
          sku: items.map(i => `${i.itemName} (x${i.quantity})`).join(', '),
          ...submissionPayload,
          district: submissionPayload.district,
          submitLogs: resJson.logs
        } as any);

        // Reset fields
        setName('');
        setPhone('');
        setContact('');
        setCustomerAccount('');
        setCustomerGmail('');
        setShippingInfo('');
        setPostalCode('');
        setDetailAddress('');
        setSubdistrict('');
        setDistrict('');
        setProvince('');
        setItems([{ id: '1', itemName: '', quantity: 1, notes: '' }]);
        setTotalAmount('');
        setRemoteAreaSelection('');
        setPaymentMethod('');
        setPaymentMethodOther('');
        setShippingPaymentStatus('');
        setTransferAmount('');
        setTransferDate('');
        setTransferTime('');
        setSlipImage(null);
        setSlipName('');
        setCustomAnswers({});
      } else {
        setFormError(resJson.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้งค่ะ");
      }
    } catch (err: any) {
      console.error(err);
      // Even if network or API details fail, let's gracefully save locally if they are in full demo fallback mode
      if (!config.appsScriptUrl) {
        // Clear saved draft from localStorage
        try {
          localStorage.removeItem('yomie_preorder_form_draft');
        } catch (e) {
          console.error(e);
        }

        // Simulation mode for gorgeous preview
        const dSim = new Date();
        const timestamp = `${dSim.getDate()}:${dSim.getMonth() + 1}:${dSim.getFullYear()} (${String(dSim.getHours()).padStart(2, '0')}:${String(dSim.getMinutes()).padStart(2, '0')}:${String(dSim.getSeconds()).padStart(2, '0')})`;
        onSuccess({
          id: String(Date.now()),
          timestamp,
          ...submissionPayload,
          district: submissionPayload.district || "อำเภอเมือง"
        } as any);
      } else {
        setFormError(err.message || "ขออภัยค่ะ! ไม่สามารถเชื่อมต่อระบบหลังบ้านเพื่อบันทึกชีตออเดอร์ได้ กรุณาตรวจสอบการแชร์ชีตหรือตั้งค่า Google Webhook ในหลังบ้านร้านค้าให้ถูกต้องนะคะ");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSkippedShipping = shippingInfo.trim() === '-';

  return (
    <div className="w-full max-w-2xl mx-auto" id="preorder-form-container">
      <div className="cute-card-frame bg-white p-5 sm:p-7 relative overflow-hidden text-left shadow-xl">
        
        {/* Banner Headers */}
        <div className="absolute top-5 left-6 text-[#eb5e45] font-mono text-[10px] font-black uppercase tracking-widest pointer-events-none">
          📝 NEW ADDRESS FORM
        </div>
        
        {/* Sparkly star */}
        <div className="absolute top-4 right-6 animate-sparkle pointer-events-none">
          <svg className="w-9 h-9 text-[#faca44] fill-[#faca44]" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.2L22 11.6l-5.6 5.4 1.8 7.5L12 20.2l-6.2 4.3 1.8-7.5-5.6-5.4 7.6-2.4z" />
          </svg>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-5">
          
          {/* Header Title Greeting */}
          <div className="text-center space-y-1 mt-1 pb-3 border-b-2 border-dashed border-pink-100">
            <Home className="w-7 h-7 text-[#eb5e45] mx-auto text-heartbeat" />
            <h2 className="text-[#152033] text-xl sm:text-2xl font-extrabold tracking-wide font-sans">
              ฟอร์มเปลี่ยนที่อยู่
            </h2>
          </div>

          {/* Section 1: Customer Contact Info */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
              <User className="w-4 h-4 shrink-0" />
              ข้อมูลลูกค้า
            </h3>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block text-left">
                ชื่อ Account (มี@) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น @yomiie_core"
                value={customerAccount}
                onChange={(e) => setCustomerAccount(e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-xl text-gray-950 font-sans"
              />
            </div>
          </div>

          {/* Section 3: Shipping Info */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-[#db5984] border-l-4 border-[#db5984] pl-2 font-sans flex items-center gap-1.5">
              <MapPin className="w-4 h-4 shrink-0" />
              ชื่อ / ที่อยู่ / เบอร์โทร ในการจัดส่ง <span className="text-red-500">*</span>
            </h3>

            <div className="space-y-2">
              <label className="text-[11.5px] font-bold text-gray-900 block text-left">
                <div className="text-[11px] font-medium text-gray-700 space-y-1 pl-1">
                  <p>• หากที่อยู่ใหม่อยู่เป็นพื้นที่ห่างไกล จะมีการเก็บค่าส่งเพิ่ม +20.- ในภายหลังนะคะ (สามารถเช็คได้ใน tab 'เช็คพื้นที่ส่ง' เลยค่า)</p>
                </div>
              </label>
              <textarea
                required
                rows={5}
                placeholder=""
                value={shippingInfo}
                onChange={(e) => handleShippingInfoChange(e.target.value)}
                className="w-full text-xs p-3.5 border-2 border-dashed border-pink-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb] rounded-2xl text-gray-950 font-sans leading-relaxed bg-[#fdfdfd]"
              />
            </div>

            {/* Postal remote area indicator banner */}
            <AnimatePresence>
              {zipMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`p-3.5 rounded-xl border text-[11px] leading-relaxed font-sans text-left transition-all ${
                    zipMessage.type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'
                  }`}
                >
                  <p className="flex items-center gap-1.5 font-semibold">
                    {zipMessage.type === 'warn' ? (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <span>
                      {zipMessage.text}
                    </span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notes & Checkbox */}
          <div className="bg-pink-50/20 border border-[#db5984]/15 rounded-2xl p-4 space-y-3 font-sans">
            <div className="text-xs text-gray-655 space-y-1.5 leading-relaxed">
              <span className="font-bold text-[#db5984] block mb-1">📢 ข้อแนะนำและเงื่อนไขเพิ่มเติม:</span>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] sm:text-xs font-medium">
                <li>อัพเดทสถานะในเว็บหน้า bio ภายใน 1-3 วัน หลังกรอกฟอร์มนะคะ</li>
                <li>ตรวจพบข้อผิดพลาด หรือมีข้อสงสัยสามารถทักมาได้ตลอดเลยค่า</li>
              </ul>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-2.5 border-t border-[#db5984]/10">
              <input
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded text-[#db5984] border-gray-300 focus:ring-[#db5984] focus:ring-opacity-25 cursor-pointer accent-[#db5984]"
              />
              <span className="text-[11px] sm:text-xs font-bold text-gray-700 flex items-center gap-1">
                รับทราบค่า ♡ <span className="text-red-500 font-bold">*</span>
              </span>
            </label>
          </div>

          {/* Form Action Buttons & Submissions */}
          <div className="pt-4 border-t-2 border-dashed border-[#f0f2f5] space-y-4">
            {formError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 text-left font-sans animate-shake">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-semibold leading-tight">{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-2xl font-bold transition-all select-none text-base border-2 tracking-wide flex items-center justify-center gap-2 ${
                isSubmitting 
                  ? 'bg-gray-100 border-gray-250 text-gray-400 cursor-not-allowed' 
                  : 'bg-[#db5984] hover:bg-[#c4406a] text-white border-[#db5984] shadow-[0_6px_0_#b23c60] hover:shadow-[0_4px_0_#b23c60] hover:translate-y-[2px] active:translate-y-[6px] active:shadow-none cursor-pointer'
              }`}
              id="submit-preorder-action"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                  <span>ระบบกำลังบันทึกข้อมูลค่ะ</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 text-white" />
                  <span>ส่งรายการสั่งซื้อ</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
