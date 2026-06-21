import React from 'react';
import { PostalCodeData } from '../types';
import { ArrowLeft, Clock, MapPin, Sparkles, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface StatusCardProps {
  postalCode: string;
  matches: PostalCodeData[];
  onBack: () => void;
  lastUpdatedTime?: string;
  isRealTimeActive?: boolean;
  isSyncing?: boolean;
}

export const StatusCard: React.FC<StatusCardProps> = ({ 
  postalCode, 
  matches, 
  onBack,
  lastUpdatedTime = "00:00:00",
  isRealTimeActive = false,
  isSyncing = false
}) => {
  
  // Clean checks for remote status: If there's any matching row, it's a remote area
  const isRemoteArea = matches.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-fade-in" id="status-results-scene">
      
      {/* Top Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="status-scene-header">
        <button
          onClick={onBack}
          className="flex items-center justify-start space-x-2 bg-[#db5984] hover:bg-[#c2466f] text-white font-bold py-2 px-4 rounded-xl shadow-sm hover:shadow transition-all text-xs cursor-pointer active:scale-95 text-left self-start"
          id="btn-back-search"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK / ค้นหาใหม่</span>
        </button>
      </div>

      {/* Result Card frame container */}
      <div className="cute-card-frame bg-white overflow-hidden p-6 sm:p-8 relative">
        
        {/* Decorative elements */}
        <div className="absolute top-5 right-6 text-[#eb5e45]/25 font-black text-2xl tracking-widest uppercase font-mono select-none hidden sm:block">
          yomiie system
        </div>

        {/* Checked Postal Code Title */}
        <div className="border-b border-gray-100 pb-5 mb-6 text-left">
          <span className="text-[#eb5e45] font-mono text-[11px] font-bold uppercase tracking-widest leading-none mb-1 block">
            RESULTS CHECKER
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1c2a38] flex flex-wrap items-baseline gap-2">
            <span>รหัสไปรษณีย์:</span>
            <span className="text-[#db5984] wavy-underline font-mono text-3xl">{postalCode}</span>
          </h1>
        </div>

        {/* Large Result Banner Area */}
        {isRemoteArea ? (
          /* Case A: Is Remote Area (+20 Baht Surcharge) */
          <div className="bg-[#fff5f5] border-2 border-[#feb2b2] rounded-[20px] p-4 sm:p-5 text-left animate-fade-in relative overflow-hidden">
            {/* Soft pink highlight glow */}
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-40 h-40 rounded-full bg-[#fca5a5]/10 blur-xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-[#fee2e2] border-2 border-[#fca5a5] flex items-center justify-center text-red-500 shrink-0">
                  <AlertTriangle className="w-5.5 h-5.5 text-[#eb5e45]" />
                </div>
                <div className="space-y-0.5">
                  <strong className="text-[#ea3838] text-base sm:text-lg font-black font-sans leading-tight block">
                    อยู่ในพื้นที่ห่างไกล 🏔️
                  </strong>
                  <span className="text-xs sm:text-sm text-gray-600 font-semibold leading-relaxed block font-sans">
                    รหัสไปรษณีย์ {postalCode} เป็นจุดพื้นที่เกาะ ดอย หรือชายแดนตามระเบียบขนส่งสินค้า
                  </span>
                </div>
              </div>

              {/* +20 Baht badge capsule */}
              <div className="bg-[#eb5e45] text-white border-2 border-white rounded-[16px] px-5 py-2.5 shadow-md shadow-red-200/50 flex flex-col items-center justify-center shrink-0 w-full md:w-auto text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#fecaca] leading-none mb-1">บวกค่าส่งเพิ่ม</span>
                <span className="text-xl font-black font-mono tracking-tight leading-none">+20 Baht</span>
              </div>
            </div>
          </div>
        ) : (
          /* Case B: Is Normal Delivery Area (0 Baht Surcharge) */
          <div className="bg-[#f0fdf4] border-2 border-[#bbf7d0] rounded-[20px] p-4 sm:p-5 text-left animate-fade-in relative overflow-hidden">
            {/* Soft green highlight glow */}
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-40 h-40 rounded-full bg-[#86efac]/10 blur-xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-[#dcfce7] border-2 border-[#86efac] flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 className="w-5.5 h-5.5 text-[#10b981]" />
                </div>
                <div className="space-y-0.5">
                  <strong className="text-[#15803d] text-base sm:text-lg font-black font-sans leading-tight block">
                    ไม่อยู่ในพื้นที่จัดส่งห่างไกล 🎉
                  </strong>
                  <span className="text-xs sm:text-sm text-gray-600 font-semibold leading-relaxed block font-sans">
                    รหัสไปรษณีย์ {postalCode} เป็นพื้นที่จัดส่งทั่วไปตามเรทมาตรฐาน
                  </span>
                </div>
              </div>

              {/* No charge badge capsule */}
              <div className="bg-[#47a86c] text-white border-2 border-white rounded-[16px] px-5 py-2.5 shadow-md shadow-green-200/50 flex flex-col items-center justify-center shrink-0 w-full md:w-auto text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-green-100 leading-none mb-1">ค่าส่งสภาวะปกติ</span>
                <span className="text-lg font-black font-sans tracking-tight leading-none">ไม่มีเก็บเพิ่ม</span>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Subdistrict Table Listing matches for transparency */}
        {matches.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6" id="postal-details-module">
            {/* Left Column: Clean Table for Location (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-xs font-black text-[#8898a9] uppercase tracking-wider font-sans flex items-center gap-1.5 px-1 text-left">
                <MapPin className="w-4 h-4 text-[#eb5e45]" />
                <span>รายชื่อตำบลที่พบในระบบ ({matches.length} รายการ)</span>
              </h3>
              <div className="overflow-x-auto border border-gray-150 rounded-xl bg-white shadow-sm" id="results-table-scroller">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="py-2.5 px-4 text-[10px] font-black text-[#8898a9] uppercase tracking-wider font-sans text-left">รหัสไปรษณีย์</th>
                      <th className="py-2.5 px-4 text-[10px] font-black text-[#8898a9] uppercase tracking-wider font-sans text-left">ตำบล</th>
                      <th className="py-2.5 px-4 text-[10px] font-black text-[#8898a9] uppercase tracking-wider font-sans text-left">จังหวัด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((item, idx) => (
                      <tr 
                        key={idx} 
                        className="border-b border-[#f4f6f8] last:border-none hover:bg-gray-50/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-xs font-bold text-gray-800 font-mono text-left">
                          {item.postalCode}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-gray-700 font-sans text-left">
                          {item.subdistrict || "-"}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-gray-500 font-sans text-left">
                          {item.province || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Prominent Segmented Area Info Display (5 cols on lg) */}
            <div className="lg:col-span-5">
              <div className="border-[3px] border-[#eb5e45] bg-gradient-to-br from-[#fff6f6] via-[#fffbfb] to-[#fff6f6] rounded-2xl p-5 shadow-xl shadow-red-200/40 relative overflow-hidden space-y-4 animate-scale-up" id="area-separated-card">
                <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-28 h-28 rounded-full bg-[#fca5a5]/25 blur-xl pointer-events-none" />
                
                <div className="flex items-center justify-between pb-3 border-b-2 border-[#fee2e2] relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#eb5e45]"></span>
                    </span>
                    <span className="text-xs sm:text-sm font-black text-[#ea3838] font-sans tracking-wider uppercase text-left">
                      พื้นที่
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center max-h-[240px] overflow-y-auto p-1 relative z-10">
                  {matches.map((item, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black border-2 border-red-300 bg-white text-[#ea3838] shadow-sm font-sans tracking-wide shrink-0 animate-fade-in hover:scale-105 hover:shadow-md transition-all duration-200"
                    >
                      <span className="text-sm">🏔️</span> {item.area || "พื้นที่ห่างไกล"}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}



      </div>

    </div>
  );
};
