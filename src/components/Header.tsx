import React from 'react';
import { 
  BookOpen, 
  Moon, 
  Sun, 
  Code2, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Plus, 
  UploadCloud,
  Layers,
  Sparkles,
  Edit3,
  Network,
  Printer,
  Cloud,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { DeviceFrame, ThemeMode, ActiveTab } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  deviceFrame: DeviceFrame;
  onSelectDevice: (device: DeviceFrame) => void;
  onOpenCreateModal: () => void;
  onOpenImportModal: () => void;
  onOpenSyncModal?: () => void;
  onOpenTestingModal?: () => void;
  pendingSyncCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  activeTab,
  onSelectTab,
  deviceFrame,
  onSelectDevice,
  onOpenCreateModal,
  onOpenImportModal,
  onOpenSyncModal,
  onOpenTestingModal,
  pendingSyncCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand & App Title */}
        <div className="flex items-center gap-3 shrink-0">
          <img 
            src="/app-icon.png" 
            alt="شعار تطبيق كاتب الملكي" 
            className="w-10 h-10 rounded-xl object-cover shadow-md shadow-amber-600/25 ring-1 ring-amber-500/30 transition-transform hover:scale-105" 
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl font-cairo tracking-tight text-stone-900 dark:text-stone-100">
                كاتب <span className="text-amber-600 text-sm font-bold">Katib</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 font-medium font-cairo border border-amber-200 dark:border-amber-800 hidden md:inline">
                Flutter Cross-Platform
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal hidden lg:block">
              تطبيق صناعة وقراءة ومكتبة الكتب العربية
            </p>
          </div>
        </div>

        {/* View Switcher: Interactive Library vs Semantic Extraction Engine vs Flutter Architecture & Code */}
        <div className="flex items-center bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl border border-stone-200/80 dark:border-stone-700/60">
          <button
            id="tab-app-btn"
            onClick={() => onSelectTab('app')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold font-cairo transition-all ${
              activeTab === 'app'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>المكتبة</span>
          </button>

          <button
            id="tab-editor-btn"
            onClick={() => onSelectTab('editor')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold font-cairo transition-all ${
              activeTab === 'editor'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Edit3 className="w-4 h-4 text-amber-600" />
            <span>محرر الكتب</span>
          </button>

          <button
            id="tab-mindmap-btn"
            onClick={() => onSelectTab('mindmap')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold font-cairo transition-all ${
              activeTab === 'mindmap'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Network className="w-4 h-4 text-amber-600" />
            <span>السبورة الذهنية</span>
          </button>

          <button
            id="tab-publishing-btn"
            onClick={() => onSelectTab('publishing')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold font-cairo transition-all ${
              activeTab === 'publishing'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Printer className="w-4 h-4 text-amber-600" />
            <span>استوديو النشر</span>
          </button>

          <button
            id="tab-extraction-btn"
            onClick={() => onSelectTab('extraction')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold font-cairo transition-all ${
              activeTab === 'extraction'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>محرك الاستخراج</span>
          </button>

          <button
            id="tab-architecture-btn"
            onClick={() => onSelectTab('architecture')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold font-cairo transition-all ${
              activeTab === 'architecture'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">معمارية فلاتر</span>
            <span className="sm:hidden">الأكواد</span>
          </button>

          <button
            id="tab-account-btn"
            onClick={() => onSelectTab('account')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold font-cairo transition-all ${
              activeTab === 'account'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span className="hidden md:inline">الحساب والنسخ</span>
            <span className="md:hidden">الحساب</span>
          </button>
        </div>

        {/* Actions & Device Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Responsive Device Frame Switcher (When in app mode) */}
          {activeTab === 'app' && (
            <div className="hidden md:flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-xs">
              <button
                title="عرض سطح المكتب والويب"
                onClick={() => onSelectDevice('desktop')}
                className={`p-1.5 rounded-md transition-colors ${
                  deviceFrame === 'desktop' ? 'bg-white dark:bg-stone-900 text-amber-600 shadow-xs' : 'hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                title="عرض الجهاز اللوحي Tablet"
                onClick={() => onSelectDevice('tablet')}
                className={`p-1.5 rounded-md transition-colors ${
                  deviceFrame === 'tablet' ? 'bg-white dark:bg-stone-900 text-amber-600 shadow-xs' : 'hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                title="عرض الهاتف المحمول Android"
                onClick={() => onSelectDevice('mobile')}
                className={`p-1.5 rounded-md transition-colors ${
                  deviceFrame === 'mobile' ? 'bg-white dark:bg-stone-900 text-amber-600 shadow-xs' : 'hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Cloud Sync & Account Button (CloudSyncService) */}
          {onOpenSyncModal && (
            <button
              id="cloud-sync-btn"
              onClick={onOpenSyncModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs sm:text-sm font-bold font-cairo transition-colors shadow-xs"
              title="محرك المزامنة السحابية وإدارة الحسابات (Offline-First)"
            >
              <Cloud className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">المزامنة السحابية</span>
              {pendingSyncCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-mono">
                  {pendingSyncCount}
                </span>
              )}
            </button>
          )}

          {/* QA, Testing & Performance Monitor Button */}
          {onOpenTestingModal && (
            <button
              id="testing-monitor-btn"
              onClick={onOpenTestingModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs sm:text-sm font-bold font-cairo transition-colors shadow-xs"
              title="لوحة الاختبارات وإدارة الأخطاء ومراقبة الأداء"
            >
              <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden xl:inline">الاختبارات ومراقبة الأداء</span>
              <span className="xl:hidden">الاختبارات</span>
            </button>
          )}

          {/* Android PWA / APK Install Button */}
          <PWAInstallButton variant="header" />

          {/* Import File Button (file_picker demonstration) */}
          <button
            id="import-pdf-btn"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750 text-xs sm:text-sm font-semibold font-cairo transition-colors shadow-xs"
            title="استيراد ملف PDF باستخدام file_picker"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">استيراد PDF</span>
          </button>

          {/* New Book Project Button */}
          <button
            id="new-book-btn"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold font-cairo transition-colors shadow-xs shadow-amber-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>مشروع جديد</span>
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            title={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-stone-600" />
            )}
          </button>

        </div>
      </div>
    </header>
  );
};
