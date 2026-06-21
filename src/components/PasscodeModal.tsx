import React, { useState } from 'react';
import { Lock, X, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface PasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'fujimarurukcola') {
      setError(false);
      onSuccess();
      setPasscode('');
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4" id="passcode-overlay">
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/45 backdrop-blur-xs transition-opacity animate-fade-in" 
      />

      {/* Passcode Container - Rounded rectangle, left-aligned text */}
      <div 
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-[#fcdce3] overflow-hidden z-10 animate-scale-in p-6"
        id="passcode-container"
      >
        {/* Header indicator */}
        <div className="absolute top-3 left-4 text-[9px] text-[#db5984] font-mono uppercase font-bold tracking-widest pointer-events-none">
          YOMIÉ SECURITY
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg border border-gray-150 bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4 text-left">
          {/* Circular Icon and Text */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-[#ea5f8e] shrink-0">
              <Lock className="w-5 h-5 text-[#ea5f8e]" />
            </div>
            <div className="space-y-1 text-left">
              <h3 className="text-sm font-black text-gray-905 tracking-tight font-sans">
                การเข้าถึงส่วนแอดมินหลัก
              </h3>
            </div>
          </div>

          {/* Locked status banner */}
          <div className="bg-amber-50/65 border border-amber-100 p-3 rounded-xl text-left">
            <p className="text-[11px] text-amber-800 leading-normal font-sans font-semibold">
              ข้อมูลร้านค้าสงวนสิทธิ์เฉพาะผู้ดูแลระบบและแอดมินเพจในการเข้าถึงสิทธิ์เท่านั้น โปรดใส่รหัสยืนยันตัวตน
            </p>
          </div>

          {/* Passcode Entry */}
          <div className="space-y-1.5 text-left">
            <label className="text-[11px] font-bold text-gray-650 block">รหัสผ่านยืนยันสิทธิ์ (Admin Passcode)</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="ป้อนรหัสแอดมินหลัก..."
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError(false);
                }}
                className={`w-full text-xs p-3 pr-10 border ${
                  error ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-100' : 'border-gray-200 focus:border-[#eb5e45] focus:ring-1 focus:ring-[#fbebeb]'
                } rounded-xl text-gray-900 font-mono tracking-widest`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-start gap-2 text-left animate-shake">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-red-800 block">รหัสไม่ถูกต้อง / Unauthorized</span>
                <span className="text-[10px] text-red-650 font-sans block leading-tight">โปรเช็คการพิมพ์ตัวพิมพ์เล็ก/ใหญ่ หรือความถูกต้องรหัสร้านค้าอีกครั้ง</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 text-xs bg-[#eb5e45] hover:bg-[#db523c] text-white font-bold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
            >
              ปลดล็อกสิทธิ์
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
