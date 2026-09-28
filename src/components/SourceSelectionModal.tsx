import React from 'react';
import { X, Check, BookOpen, Library, CheckSquare, Square } from 'lucide-react';
import { Book } from '../types';

interface SourceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  selectedBookIds: string[];
  onToggleBook: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const SourceSelectionModal: React.FC<SourceSelectionModalProps> = ({
  isOpen,
  onClose,
  books,
  selectedBookIds,
  onToggleBook,
  onSelectAll,
  onDeselectAll,
}) => {
  if (!isOpen) return null;

  const isAllSelected = books.length > 0 && selectedBookIds.length === books.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        id="source-selection-modal"
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cairo font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                اختيار مصادر الاستخراج
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                حدد كتاباً واحداً أو عدة كتب من مكتبتك للبحث والاستخراج منها
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

        {/* Quick Selection Toolbar */}
        <div className="px-6 py-2.5 bg-stone-100/60 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs font-cairo">
          <span className="text-stone-600 dark:text-stone-300 font-bold">
            تم تحديد {selectedBookIds.length} من {books.length} كتب
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="text-amber-700 dark:text-amber-400 hover:underline font-bold flex items-center gap-1"
            >
              {isAllSelected ? 'إلغاء التحديد' : 'تحديد الكل'}
            </button>
          </div>
        </div>

        {/* Book List with Checkboxes */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {books.map((book) => {
            const isSelected = selectedBookIds.includes(book.id);

            return (
              <div
                key={book.id}
                onClick={() => onToggleBook(book.id)}
                className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                {/* Custom Checkbox */}
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'border-2 border-stone-300 dark:border-stone-600 text-transparent'
                }`}>
                  <Check className="w-3.5 h-3.5" />
                </div>

                {/* Small Book Spine Visual */}
                <div className={`w-8 h-10 rounded-md bg-gradient-to-br ${book.coverGradient} shrink-0 flex items-center justify-center text-white text-[10px]`}>
                  <BookOpen className="w-4 h-4" />
                </div>

                {/* Book Info */}
                <div className="flex-1 min-w-0 text-right">
                  <div className="font-cairo font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                    {book.title}
                  </div>
                  <div className="font-tajawal text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2 mt-0.5">
                    <span>{book.author}</span>
                    <span>•</span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-cairo">
                      {book.category}
                    </span>
                    <span>•</span>
                    <span>{book.totalPages} صفحة</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2.5 bg-stone-50/50 dark:bg-stone-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-cairo font-bold transition-colors shadow-xs"
          >
            تأكيد الاختيار ({selectedBookIds.length})
          </button>
        </div>

      </div>
    </div>
  );
};
