import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  Share2,
  Copy,
  Check,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Terminal,
  FileCode2,
  Zap,
  Globe,
  WifiOff,
  Info
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [installingStatus, setInstallingStatus] = useState<string | null>(null);

  // Determine current live URL for phone scanning
  const currentAppUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://ais-pre-j5q43da5wl47thibsdpcy3-420434335464.europe-west2.run.app';

  // Generate QR code when modal opens
  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(currentAppUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1c1917',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [isOpen, currentAppUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyApkCommand = () => {
    const cmd = 'cd katib_app && flutter pub get && flutter build apk --release --split-per-abi';
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2500);
  };

  const handleTriggerInstall = async () => {
    setInstallingStatus('جاري فتح نافذة التثبيت...');
    const success = await install();
    if (success) {
      setInstallingStatus('تم قبول التثبيت بنجاح! سيظهر التطبيق في جهازك الآن.');
    } else {
      setInstallingStatus('تم الإلغاء أو لم تكتمل العملية.');
    }
    setTimeout(() => setInstallingStatus(null), 4000);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`افتح وثبّت تطبيق كاتب لصناعة وقراءة الكتب على جوالك الأندرويد:\n${currentAppUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareViaTelegram = () => {
    const text = encodeURIComponent(`افتح وثبّت تطبيق كاتب على أندرويد:\n${currentAppUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(currentAppUrl)}&text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/50">
          <div className="flex items-center gap-3.5">
            <img
              src="/app-icon.png"
              alt="أيقونة تطبيق كاتب"
              className="w-12 h-12 rounded-2xl object-cover shadow-lg shadow-amber-600/30 ring-2 ring-amber-500/40 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-cairo text-stone-900 dark:text-stone-100">
                  تثبيت تطبيق «كاتب» على هاتفك الأندرويد
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-cairo">
                  Android OS
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                تطبيق كامل مستقل بأيقونة الدرع والريشة الملكية على شاشة هاتفك
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-950/40 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold font-cairo flex items-center justify-center gap-2 transition-all ${
              activeTab === 'pwa'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm border border-stone-200 dark:border-stone-700'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>التثبيت الفوري (WebAPK / PWA)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold hidden sm:inline">
              موصى به ⚡
            </span>
          </button>

          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold font-cairo flex items-center justify-center gap-2 transition-all ${
              activeTab === 'apk'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm border border-stone-200 dark:border-stone-700'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <FileCode2 className="w-4 h-4 text-emerald-500" />
            <span>حزمة فلاتر الأصلية (APK / AAB)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {activeTab === 'pwa' && (
            <div className="space-y-5">
              
              {/* Direct Install CTA when on Android or supported browser */}
              {isInstalled ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 font-cairo">
                      التطبيق مثبت بالفعل على جهازك!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-tajawal">
                      أنت تستخدم التطبيق الآن في وضع الشاشة الكاملة كبرنامج رسمي ومستقل.
                    </p>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base font-cairo">
                        جهازك يدعم التثبيت الفوري بنقرة واحدة!
                      </h4>
                      <p className="text-xs text-amber-100 font-tajawal">
                        اضغط الزر لإضافة «كاتب» إلى شاشة هاتفك الرئيسية كبرنامج مستقل
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleTriggerInstall}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-amber-300 font-bold font-cairo text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>تثبيت التطبيق الآن</span>
                  </button>
                </div>
              ) : null}

              {installingStatus && (
                <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-tajawal text-center font-bold text-amber-600 dark:text-amber-400">
                  {installingStatus}
                </div>
              )}

              {/* QR Code and Mobile Link Transfer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center bg-stone-50 dark:bg-stone-800/40 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
                
                {/* QR Code Box */}
                <div className="flex flex-col items-center text-center p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xs">
                  <div className="p-2 bg-white rounded-lg border border-stone-200 shadow-inner">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="QR Code لفتح التطبيق وتثبيته على أندرويد"
                        className="w-44 h-44 object-contain"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center bg-stone-100 text-stone-400 text-xs font-cairo">
                        جاري توليد الرمز...
                      </div>
                    )}
                  </div>
                  <span className="mt-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 font-cairo flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                    امسح الرمز بكاميرا هاتف الأندرويد
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 font-tajawal">
                    سيفتح التطبيق فوراً في المتصفح لتثبيته بضغطة زر
                  </span>
                </div>

                {/* Share Link & Actions */}
                <div className="space-y-3.5">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 font-cairo flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-amber-600" />
                    أو أرسل الرابط لهاتفك المحمول:
                  </h4>

                  {/* Copy Link Input */}
                  <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
                    <input
                      type="text"
                      readOnly
                      value={currentAppUrl}
                      className="flex-1 bg-transparent px-2 text-xs font-mono text-stone-600 dark:text-stone-300 outline-none truncate"
                      dir="ltr"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold font-cairo flex items-center gap-1.5 transition-colors"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-stone-500" />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Instant Send Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={shareViaWhatsApp}
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-cairo flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span>عبر واتساب</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={shareViaTelegram}
                      className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold font-cairo flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span>عبر تيليجرام</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Highlights */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-stone-600 dark:text-stone-400 font-tajawal">
                    <div className="flex items-center gap-1.5">
                      <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>يعمل بدون إنترنت (Offline)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>آمن وسريع بدون متجر</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-step visual instructions for Android */}
              <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 bg-stone-50/50 dark:bg-stone-900/40 space-y-3">
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 font-cairo flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-600" />
                  خطوات التثبيت من هاتف الأندرويد (متصفح Chrome / Samsung):
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 text-xs font-bold flex items-center justify-center">
                      1
                    </div>
                    <h5 className="font-bold text-xs text-stone-800 dark:text-stone-200 font-cairo">
                      فتح الرابط في كروم
                    </h5>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-tajawal leading-relaxed">
                      امسح الباركود أو افتح الرابط في متصفح Google Chrome على هاتفك.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 text-xs font-bold flex items-center justify-center">
                      2
                    </div>
                    <h5 className="font-bold text-xs text-stone-800 dark:text-stone-200 font-cairo">
                      قائمة الخيارات (⋮)
                    </h5>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-tajawal leading-relaxed">
                      اضغط على أيقونة النقاط الثلاث (⋮) بأعلى الزاوية واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 text-xs font-bold flex items-center justify-center">
                      3
                    </div>
                    <h5 className="font-bold text-xs text-stone-800 dark:text-stone-200 font-cairo">
                      التأكيد والتثبيت
                    </h5>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-tajawal leading-relaxed">
                      اضغط على «تثبيت»، وسيظهر التطبيق في شاشة تطبيقات هاتفك كبرنامج رسمي بشعار كاتب!
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 font-cairo">
                    بناء وتجميع ملف APK لنظام أندرويد عبر Flutter
                  </h4>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 font-tajawal leading-relaxed">
                  يحتوي هذا المشروع على بنية تطبيق فلاتر أصلية بالكامل في مجلد <code className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 font-mono text-[11px]">katib_app/</code> مع إعدادات <code className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 font-mono text-[11px]">build.gradle</code> و <code className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 font-mono text-[11px]">proguard-rules.pro</code> المتوافقة مع أحدث معايير Android 14 (API 34).
                </p>

                {/* Build Command Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-cairo text-stone-600 dark:text-stone-400">
                    <span>أمر بناء حزمة الـ APK للإنتاج:</span>
                    <button
                      onClick={handleCopyApkCommand}
                      className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold"
                    >
                      {copiedCommand ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>تم نسخ الأمر</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الأمر</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-stone-900 text-stone-100 rounded-xl font-mono text-xs overflow-x-auto" dir="ltr">
                    <code>flutter build apk --release --split-per-abi</code>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-tajawal">
                  📍 <strong>مسار الملف الناتج بعد البناء:</strong>
                  <br />
                  <code className="font-mono text-[11px] block mt-1 select-all" dir="ltr">
                    katib_app/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
                  </code>
                </div>
              </div>

              {/* How to install APK on Android */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2.5">
                <h5 className="font-bold text-xs text-stone-900 dark:text-stone-100 font-cairo">
                  كيفية تثبيت ملف الـ APK على هاتفك:
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-stone-600 dark:text-stone-400 font-tajawal">
                  <li>انقل ملف الـ <code className="font-mono text-[11px]">.apk</code> إلى هاتفك عبر كابل USB أو تطبيق WhatsApp/Telegram.</li>
                  <li>افتح الملف واضغط على «تثبيت».</li>
                  <li>إذا طلب الهاتف إذن «تثبيت تطبيقات غير معروفة» (Install Unknown Apps)، فعّل الخيار للمتصفح أو مدير الملفات، ثم تابع التثبيت.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-tajawal">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>يدعم أندرويد بالكامل مع الوضع الداكن واللغة العربية</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold font-cairo transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
