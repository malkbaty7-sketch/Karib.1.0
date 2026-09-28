import React, { useState } from 'react';
import { Smartphone, Download, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidInstallModal } from './AndroidInstallModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'hero' | 'floating';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already installed, hide floating/hero or show subtle status
  if (isInstalled && variant !== 'header') {
    return null;
  }

  const handleClick = async () => {
    // If browser triggered install prompt, try direct install
    if (isInstallable) {
      const res = await install();
      if (!res) {
        // If dismissed or failed, show guidance modal
        setIsModalOpen(true);
      }
    } else {
      // Show full Android install modal with QR Code and instructions
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          id="pwa-android-install-header-btn"
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs sm:text-sm font-bold font-cairo transition-all shadow-xs active:scale-95 group ${className}`}
          title="تثبيت التطبيق على هاتف أندرويد (PWA / APK)"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping group-hover:animate-none" />
          <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">تثبيت على أندرويد</span>
          <span className="sm:hidden">تثبيت</span>
        </button>
      )}

      {variant === 'hero' && (
        <button
          onClick={handleClick}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold font-cairo text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all active:scale-95 ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>تثبيت التطبيق على هاتفك الأندرويد</span>
        </button>
      )}

      <AndroidInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
