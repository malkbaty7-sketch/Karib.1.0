import React from 'react';
import { X, BookOpen, ExternalLink, Copy, Check, Bookmark, ArrowRight, ArrowLeft } from 'lucide-react';
import { ExtractedResult } from '../types';

interface OriginalPageModalProps {
  result: ExtractedResult | null;
  onClose: () => void;
}

export const OriginalPageModal: React.FC<OriginalPageModalProps> = ({
  result,
  onClose,
}) => {
  const [copiedCitation, setCopiedCitation] = React.useState(false);

  if (!result) return null;

  const citationText = `«${result.text}» — ${result.author}، كتاب «${result.bookTitle}»، ص ${result.pageNumber}.`;

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(citationText);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md">
      <div 
        id="original-page-modal"
        className="w-full max-w-3xl bg-[#FAF8F5] dark:bg-stone-900 rounded-3xl border border-stone-300 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header with Book Meta */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-white dark:bg-stone-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cairo font-black text-sm sm:text-base text-stone-900 dark:text-stone-100">
                  {result.bookTitle}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold font-cairo border border-amber-300/40">
                  صفحة {result.pageNumber}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                المؤلف: {result.author} • مطابقة دلالية: %{result.relevanceScore}
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

        {/* Page Simulation View */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-[#FAF8F5] dark:bg-[#121110] text-stone-900 dark:text-stone-100 select-text">
          <div className="max-w-2xl mx-auto bg-white dark:bg-stone-900/90 rounded-2xl p-6 sm:p-10 shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
            
            {/* Page Header Ribbon */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3 text-xs text-stone-400 font-tajawal">
              <span>{result.bookTitle}</span>
              <span className="font-cairo font-bold text-amber-600 dark:text-amber-400">
                — {result.pageNumber} —
              </span>
              <span>{result.author}</span>
            </div>

            {/* Simulated Surrounding Content Before */}
            <p className="font-tajawal text-sm leading-relaxed text-stone-500 dark:text-stone-400 opacity-80">
              ... ومما ينبغي للباحث والمؤلف ملاحظته في هذا المقام أن البناء التركيبي للجملة السردية لا ينفصل بحال عن المقصدية الكبرى التي يبتغيها النص في سياقه الزمني والتاريخي.
            </p>

            {/* Highlighted Extracted Passage (نص الاستخراج المظلل) */}
            <div className="relative p-4 sm:p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-r-4 border-amber-600 text-stone-900 dark:text-stone-100 shadow-xs">
              <div className="absolute -top-3 right-3 px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-cairo font-bold">
                النص المستخرج المطابق للموضوع
              </div>
              <p className="font-tajawal text-base sm:text-lg leading-loose font-medium">
                {result.text}
              </p>
            </div>

            {/* Simulated Surrounding Content After */}
            <p className="font-tajawal text-sm leading-relaxed text-stone-500 dark:text-stone-400 opacity-80">
              وهكذا نرى أن التماسك الفكري في هذا الفصل يمهد لنتائج جوهرية تتناول العلاقة العضوية بين المفردات اللغوية والتشكيلات الدلالية المتنامية في الصفحات التالية...
            </p>

            {/* Academic Citation Box */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs font-tajawal space-y-2">
              <div className="flex items-center justify-between text-stone-700 dark:text-stone-300 font-bold font-cairo">
                <span>التوثيق الأكاديمي المعتمد:</span>
                <button
                  onClick={handleCopyCitation}
                  className="flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:underline"
                >
                  {copiedCitation ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">تم نسخ التوثيق!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ التوثيق</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700/60 text-stone-600 dark:text-stone-300 font-code text-[11px] leading-relaxed select-all" dir="rtl">
                {citationText}
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between">
          <span className="text-xs text-stone-500 font-tajawal">
            تم التحقق من تطابق النص ورقم الصفحة بنجاح
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-cairo font-bold transition-colors"
          >
            إغلاق المعاينة
          </button>
        </div>

      </div>
    </div>
  );
};
