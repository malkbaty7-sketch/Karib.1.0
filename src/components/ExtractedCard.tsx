import React, { useState } from 'react';
import { 
  BookOpen, 
  Check, 
  Copy, 
  Edit3, 
  ExternalLink, 
  BookPlus, 
  CheckCircle2, 
  Save, 
  X, 
  Sparkles,
  Quote,
  Layers,
  HelpCircle,
  Hash
} from 'lucide-react';
import { ExtractedResult, ExtractionType } from '../types';

interface ExtractedCardProps {
  result: ExtractedResult;
  onAccept: (id: string) => void;
  onSaveEdit: (id: string, newText: string) => void;
  onViewOriginal: (result: ExtractedResult) => void;
  onAddToProject: (result: ExtractedResult) => void;
}

export const ExtractedCard: React.FC<ExtractedCardProps> = ({
  result,
  onAccept,
  onSaveEdit,
  onViewOriginal,
  onAddToProject,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(result.text);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (editedText.trim()) {
      onSaveEdit(result.id, editedText.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedText(result.text);
    setIsEditing(false);
  };

  // Helper for extraction type badge details
  const getTypeInfo = (type: ExtractionType) => {
    switch (type) {
      case 'passages':
        return {
          label: 'نص أصلي موثق',
          icon: Quote,
          bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
        };
      case 'summary':
        return {
          label: 'ملخص تحليلي',
          icon: Sparkles,
          bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900',
        };
      case 'comparison':
        return {
          label: 'مقارنة بين المصادر',
          icon: Layers,
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
        };
      case 'qa':
        return {
          label: 'إجابة عن سؤال',
          icon: HelpCircle,
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
        };
      case 'definitions':
        return {
          label: 'تعريفات وبيانات',
          icon: Hash,
          bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
        };
      default:
        return {
          label: 'استخراج موضوعي',
          icon: Quote,
          bg: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700',
        };
    }
  };

  const typeInfo = getTypeInfo(result.type);
  const TypeIcon = typeInfo.icon;
  const isAccepted = result.status === 'accepted';

  return (
    <div 
      id={`extracted-card-${result.id}`}
      className={`rounded-2xl border transition-all duration-200 ${
        isAccepted
          ? 'bg-white dark:bg-stone-900/90 border-emerald-500/40 shadow-xs'
          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-500/40 shadow-xs'
      }`}
    >
      {/* Card Header */}
      <div className="p-4 sm:p-5 pb-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-100 dark:border-stone-800/80">
        
        {/* Source Reference Chip (شريط المرجع) */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Extraction Type Badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-cairo font-bold border ${typeInfo.bg}`}>
            <TypeIcon className="w-3.5 h-3.5" />
            <span>{typeInfo.label}</span>
          </span>

          {/* Reference Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-stone-100/80 dark:bg-stone-800 border border-stone-200 dark:border-stone-700/60 text-xs font-cairo text-stone-700 dark:text-stone-300">
            <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="font-bold truncate max-w-[200px] sm:max-w-xs">{result.bookTitle}</span>
            <span className="text-stone-400">•</span>
            <span className="text-amber-700 dark:text-amber-400 font-bold">ص {result.pageNumber}</span>
          </div>
        </div>

        {/* View Original Page button (زر عرض الصفحة الأصلية للتحقق من المصدر) */}
        <button
          onClick={() => onViewOriginal(result)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-cairo font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-600/30 transition-colors"
          title="التحقق من السياق ورقم الصفحة في الكتاب الأصلي"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>عرض الصفحة الأصلية</span>
        </button>

      </div>

      {/* Main Extracted Text Content */}
      <div className="p-4 sm:p-5">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={4}
              className="w-full p-3 rounded-xl border border-amber-400 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-950/20 text-stone-900 dark:text-stone-100 font-tajawal text-sm sm:text-base leading-relaxed outline-none focus:ring-2 focus:ring-amber-500/40 resize-y"
              dir="rtl"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-xs font-cairo hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                إلغاء التعديل
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-cairo font-bold transition-colors flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <p className="font-tajawal text-sm sm:text-base leading-loose text-stone-800 dark:text-stone-200 select-text">
              {result.text}
            </p>

            {/* Author & Match Meta */}
            <div className="mt-3 pt-2.5 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-tajawal border-t border-stone-100 dark:border-stone-800/60">
              <span>المؤلف: {result.author}</span>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-cairo px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  دقة المطابقة: %{result.relevanceScore}
                </span>
                <span>{result.createdAt}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Control Buttons (أزرار التحكم: قبول وحفظ، تعديل النص، نسخ، إضافة مباشر لمشروع كتاب) */}
      <div className="px-4 sm:px-5 py-3 bg-stone-50/70 dark:bg-stone-900/60 rounded-b-2xl border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs font-cairo">
        
        {/* Left Actions: Accept / Bookmark */}
        <button
          onClick={() => onAccept(result.id)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
            isAccepted
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 border border-stone-200 dark:border-stone-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isAccepted ? 'مقبول ومحفوظ' : 'قبول وحفظ'}</span>
        </button>

        {/* Right Actions: Edit, Copy, Add to Project */}
        <div className="flex items-center gap-1.5 flex-wrap">
          
          {/* تعديل النص */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-medium"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>تعديل النص</span>
          </button>

          {/* نسخ */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-medium"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-bold">تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ</span>
              </>
            )}
          </button>

          {/* إضافة مباشر إلى مشروع كتاب */}
          <button
            onClick={() => onAddToProject(result)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors shadow-xs"
          >
            <BookPlus className="w-3.5 h-3.5" />
            <span>إضافة إلى مشروع كتاب</span>
          </button>

        </div>

      </div>

    </div>
  );
};
