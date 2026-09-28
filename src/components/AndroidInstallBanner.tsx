import React, { useState } from 'react';
import { Smartphone, Download, QrCode, X, Sparkles, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidInstallModal } from './AndroidInstallModal';

export const AndroidInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleActionClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (!res) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <section 
        aria-label="تثبيت التطبيق على أندرويد"
        className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 text-white p-4 sm:p-5 shadow-lg shadow-emerald-950/10 relative overflow-hidden"
        dir="rtl"
      >
        {/* Subtle decorative circles */}
        <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 w-28 h-28 rounded-full bg-amber-400/20 blur-lg pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <img 
              src="/app-icon.png" 
              alt="أيقونة تطبيق كاتب" 
              className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-md ring-2 ring-white/40" 
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg font-cairo">
                  تثبيت «كاتب» على هاتفك الأندرويد الآن
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[11px] font-bold font-cairo flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  بدون متجر
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-50 font-tajawal max-w-2xl leading-relaxed">
                استمتع بتجربة تطبيق أندرويد أصلي بشاشة كاملة وسرعة فائقة مع حفظ مسودات الكتب وإمكانية العمل بدون اتصال بالإنترنت (Offline).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
            <button
              onClick={handleActionClick}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold font-cairo text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isInstallable ? (
                <>
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>تثبيت التطبيق الآن</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>عرض الباركود وطريقة التثبيت</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-2.5 rounded-xl bg-black/15 hover:bg-black/25 text-white/80 hover:text-white transition-colors"
              title="إخفاء هذا الإشعار"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <AndroidInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
