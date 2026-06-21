import React, { useState } from 'react';
import { Settings, RefreshCw, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  isConfigured: boolean;
  onOpenSettings: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isConfigured, onOpenSettings, onRefresh }) => {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefreshClick = () => {
    setIsSpinning(true);
    onRefresh();
    setTimeout(() => {
      setIsSpinning(false);
    }, 800);
  };

  return (
    <header className="w-full bg-[#fdfbf7] border-b-4 border-[#eb5e45] sticky top-0 z-40 py-2.5 px-4 sm:px-6 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left Side: YOMIÉ Brand Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3" id="header-brand-container">
          {/* ShoppingCart icon inside squircle capsule */}
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-2xl border-2 border-[#fcdce3] shadow-[0_4px_12px_rgba(244,114,182,0.15)] flex items-center justify-center group cursor-pointer active:scale-95 transition-all">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-[#ea5f8e] fill-[#ea5f8e]/20 group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute -inset-0.5 bg-pink-100 rounded-2xl opacity-10 blur-md pointer-events-none" />
          </div>

          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-xl sm:text-2xl font-black tracking-widest font-sans flex items-baseline" id="brand-yomie-text">
                <span className="text-[#e55b9e]">Y</span>
                <span className="text-[#f3ad4e]">O</span>
                <span className="text-[#3caaf5]">M</span>
                <span className="text-[#70c04a]">i</span>
                <span className="text-[#a27eeb]">É</span>
              </span>
              
              {/* Cute preorder tag */}
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#eb5e45] border border-[#fbd4cd] bg-[#fdf5f3] px-2 py-0.5 rounded-full uppercase tracking-wider scale-90 sm:scale-100 origin-left">
                preorder
              </span>
            </div>

            {/* Custom Connection Status underneath branding */}
            <div className="flex items-center space-x-1 mt-0.5">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#4fd1a5] animate-pulse block" />
              <span className="text-[10px] sm:text-xs text-[#eb5e45] font-semibold tracking-wide">
                เชื่อมต่อระบบ
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefreshClick}
            className="flex items-center space-x-1 sm:space-x-1.5 text-gray-500 hover:text-gray-800 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded-xl hover:bg-gray-100 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            id="header-refresh-action"
            title="รีเฟรชอัปเดตข้อมูลชีตล่าลุด"
          >
            <motion.div
              animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="flex items-center justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            </motion.div>
            <span className="hidden xs:inline sm:inline">รีเฟรชข้อมูล</span>
          </button>

          {/* Setup Button: "ร้านค้า" */}
          <button
            onClick={onOpenSettings}
            className="relative flex items-center space-x-1 sm:space-x-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-800 py-2 px-2.5 sm:px-4 rounded-2xl shadow-sm text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            id="header-admin-action"
          >
            <Settings className="w-3.5 h-3.5 text-gray-600 animate-spin-hover" />
            <span>ร้านค้า</span>
          </button>
        </div>

      </div>
    </header>
  );
};
