export interface PostalCodeData {
  postalCode: string;   // Column A: รหัสไปรษณีย์
  subdistrict: string;  // Column B: ตำบล
  province: string;     // Column C: จังหวัด
  area: string;         // Column D: พื้นที่
}

export interface CustomQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: string; // Comma separated options if type is select
  required: boolean;
}

export interface SheetConfig {
  spreadsheetUrl: string;
  spreadsheetId: string;
  sheetName: string;
  isConfigured: boolean;
  useFallbackSample: boolean;
  // Added Preorder configuration properties
  appsScriptUrl: string; // Google Apps Script web app POST web hook
  lineToken: string;     // LINE Notify API Token
  lineChannelAccessToken?: string; // LINE Messaging API Channel Access Token
  lineGroupId?: string;            // LINE Messaging API Group ID / User ID / Chat ID
  shopName: string;      // Custom Shop name
  bankName: string;      // Bank Name for transfers
  bankAccount: string;   // Bank Account number
  bankOwner: string;     // Bank Account owner name
  promptPay: string;     // PromptPay phone/ID
  customQuestions?: CustomQuestion[]; // Custom questions configuration
  senderEmail?: string;     // Sender Gmail address
  senderAppPass?: string;   // Gmail App Password
  backendUrl?: string;      // Custom API Backend URL for deployments like GitHub Pages
}

export interface PreorderItem {
  id: string;
  itemName: string;
  quantity: number;
  notes?: string;
}

export interface PreorderData {
  id: string;
  timestamp: string;
  name: string;
  phone: string;
  contact: string; // LINE ID / IG Account
  customerAccount: string; // ชื่อ account (e.g. IG, LINE, FB)
  customerGmail: string;   // Gmail ของลูกค้า
  postalCode: string;
  subdistrict: string;
  district: string;
  province: string;
  detailAddress: string;
  items: PreorderItem[];
  totalAmount: number;
  transferAmount: number;
  transferTime: string;
  paymentMethod: string;
  paymentMethodOther?: string;
  shippingPaymentStatus?: string;
  slipBase64?: string; // Compessed image data representation
  isRemoteArea: boolean;
  shippingInfo?: string;
  customAnswers?: { label: string; value: string }[];
  customFieldsSummary?: string;
  submitLogs?: string[];
}

export interface AuditIssue {
  rowNum: number;
  postalCode: string;
  subdistrict: string;
  province: string;
  areaVal: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
}
