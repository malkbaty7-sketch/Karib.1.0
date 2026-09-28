import React, { useState } from 'react';
import { 
  FolderTree, 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  BookOpen, 
  Boxes, 
  Palette, 
  FileCheck,
  ChevronRight,
  Folder,
  ChevronDown,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { FLUTTER_CODEBASE } from '../data/flutterCodebase';
import { FlutterFile } from '../types';

export const FlutterArchitectureExplorer: React.FC = () => {
  const [selectedFilePath, setSelectedFilePath] = useState<string>('pubspec.yaml');
  const [copied, setCopied] = useState(false);

  const selectedFile: FlutterFile = 
    FLUTTER_CODEBASE.find((f) => f.path === selectedFilePath) || FLUTTER_CODEBASE[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    const bundleContent = FLUTTER_CODEBASE.map((f) => (
      `================================================================================\n` +
      `FILE: ${f.path}\n` +
      `DESCRIPTION: ${f.description}\n` +
      `================================================================================\n\n` +
      f.code +
      `\n\n`
    )).join('\n');

    const blob = new Blob([bundleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `katib_app_flutter_clean_architecture.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLayerBadge = (layer: FlutterFile['layer']) => {
    switch (layer) {
      case 'root':
        return { label: 'Root Config', color: 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20' };
      case 'core':
        return { label: 'Core Layer', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'domain':
        return { label: 'Domain Layer (Clean)', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'data':
        return { label: 'Data Layer', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
      case 'presentation':
        return { label: 'Presentation (BLoC/UI)', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-200 text-xs font-cairo font-bold">
            <Boxes className="w-4 h-4" />
            <span>هيكلية فلاتر المتكاملة • Clean Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-cairo leading-snug">
            مشروع <span className="text-amber-300">katib_app</span> الهجين لصناعة الكتب العربية
          </h1>
          <p className="text-stone-200 text-xs sm:text-sm font-tajawal leading-relaxed">
            تم بناء المشروع وفق معايير Clean Architecture الصارمة متوافقاً مع Web وDesktop (Windows/macOS/Linux) وAndroid.
            يتضمن خطوط Cairo وTajawal، وإدارة الحالة عبر Flutter BLoC وProvider، واستيراد ملفات الكتب عبر file_picker، وعارض الـ PDF عبر pdfx.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-stone-900 hover:bg-amber-50 text-xs font-cairo font-bold transition-all shadow-md"
            >
              <Download className="w-4 h-4 text-amber-600" />
              <span>تحميل حزمة كود فلاتر المكتملة (.txt bundle)</span>
            </button>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/30 backdrop-blur-sm text-xs font-code text-amber-200 border border-white/10">
              <Terminal className="w-3.5 h-3.5" />
              <span>flutter run -d chrome / windows / android</span>
            </div>
          </div>
        </div>

        {/* Decorative Background Artwork */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-10 hidden md:block select-none pointer-events-none">
          <Layers className="w-72 h-72 text-white" />
        </div>
      </div>

      {/* Clean Architecture Diagram Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3.5 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="font-cairo font-bold text-xs text-stone-900 dark:text-stone-100">1. Presentation</span>
          </div>
          <p className="text-[11px] font-tajawal text-stone-500 dark:text-stone-400">
            شاشات UI (HomeScreen)، مكتبة الكتب، الـ BLoC Events & States، والوضعان الداكن والفاتح.
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3.5 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-cairo font-bold text-xs text-stone-900 dark:text-stone-100">2. Domain</span>
          </div>
          <p className="text-[11px] font-tajawal text-stone-500 dark:text-stone-400">
            جوهر منطق الأعمال: BookEntity المستقلة، واجهات Repositories، وحالات الاستخدام (Use Cases).
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3.5 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="font-cairo font-bold text-xs text-stone-900 dark:text-stone-100">3. Data</span>
          </div>
          <p className="text-[11px] font-tajawal text-stone-500 dark:text-stone-400">
            تطبيقات المستودعات، ومصادر البيانات المحلية SharedPreferences ودمج مكتبة file_picker.
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3.5 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-cairo font-bold text-xs text-stone-900 dark:text-stone-100">4. Core</span>
          </div>
          <p className="text-[11px] font-tajawal text-stone-500 dark:text-stone-400">
            نظام الثيم والخطوط العربية (Cairo & Tajawal)، إدارة الوضع الداكن، الثوابت والمساعدات.
          </p>
        </div>
      </div>

      {/* Main Code Explorer Container: File Tree + Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden min-h-[650px]">
        
        {/* Left Column: File Tree Explorer (4 cols) */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-l border-stone-200 dark:border-stone-800 p-4 bg-stone-50/50 dark:bg-stone-900/50 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-cairo font-bold text-sm">
                <FolderTree className="w-4 h-4 text-amber-600" />
                <span>شجرة ملفات كاتب (Clean Architecture)</span>
              </div>
              <span className="text-[11px] font-code text-stone-400">
                {FLUTTER_CODEBASE.length} ملفات
              </span>
            </div>

            {/* Folder / File List */}
            <div className="space-y-1.5 overflow-y-auto max-h-[520px]">
              {FLUTTER_CODEBASE.map((file) => {
                const isSelected = file.path === selectedFilePath;
                const badge = getLayerBadge(file.layer);

                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFilePath(file.path)}
                    className={`w-full text-right p-3 rounded-2xl transition-all flex flex-col gap-1.5 border ${
                      isSelected
                        ? 'bg-white dark:bg-stone-800 border-amber-500 shadow-xs ring-1 ring-amber-500/30'
                        : 'border-transparent hover:bg-stone-100 dark:hover:bg-stone-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-code text-xs font-bold text-stone-800 dark:text-stone-200">
                        <FileCode className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-stone-400'}`} />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-cairo font-semibold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="text-[11px] font-tajawal text-stone-500 dark:text-stone-400 line-clamp-1">
                      {file.description}
                    </div>

                    <div className="text-[10px] font-code text-stone-400" dir="ltr">
                      {file.path}
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Quick Help Box */}
          <div className="p-3 mt-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-tajawal text-stone-700 dark:text-stone-300">
            <span className="font-bold font-cairo text-amber-700 dark:text-amber-400 block mb-1">
              جاهز للتشغيل والنسخ:
            </span>
            يمكنك نسخ محتوى أي ملف أو نسخه مباشرة إلى مشروعك عبر زر "نسخ الكود" بالأعلى.
          </div>
        </div>

        {/* Right Column: Code Viewer (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-stone-950 text-stone-100 overflow-hidden">
          
          {/* File Tab Header */}
          <div className="px-5 py-3.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <div className="font-code font-bold text-sm text-stone-200 flex items-center gap-2" dir="ltr">
                  <span>katib_app/</span>
                  <span className="text-amber-400">{selectedFile.path}</span>
                </div>
                <div className="text-xs text-stone-400 font-tajawal">
                  {selectedFile.description}
                </div>
              </div>
            </div>

            {/* Copy Button */}
            <button
              id="copy-flutter-code-btn"
              onClick={handleCopy}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-cairo font-bold transition-all border border-stone-700 shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ بنجاح!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الكود</span>
                </>
              )}
            </button>
          </div>

          {/* Syntax Code Body */}
          <div className="flex-1 p-5 overflow-auto font-code text-xs leading-relaxed select-text" dir="ltr">
            <pre className="text-stone-300">
              <code>{selectedFile.code}</code>
            </pre>
          </div>

          {/* Bottom Status bar */}
          <div className="px-5 py-2 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between text-[11px] font-code text-stone-400" dir="ltr">
            <div className="flex items-center gap-4">
              <span>Lines: {selectedFile.code.split('\n').length}</span>
              <span>Encoding: UTF-8</span>
              <span>Format: Dart / YAML</span>
            </div>
            <span className="text-amber-500 font-cairo">تطبيق كاتب العربي</span>
          </div>

        </div>

      </div>

    </div>
  );
};
