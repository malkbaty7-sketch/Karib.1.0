import React, { useState } from 'react';
import { X, BookPlus, Check, FolderPlus, ArrowLeft } from 'lucide-react';
import { Book, ExtractedResult } from '../types';

interface AddToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ExtractedResult | null;
  books: Book[];
  onAppendToBook: (bookId: string, chapterId: string, contentToAppend: string) => void;
}

export const AddToProjectModal: React.FC<AddToProjectModalProps> = ({
  isOpen,
  onClose,
  result,
  books,
  onAppendToBook,
}) => {
  if (!isOpen || !result) return null;

  // Filter project books that can be edited/drafted
  const projectBooks = books.filter((b) => b.format === 'project' || b.chapters.length > 0);
  const [selectedBookId, setSelectedBookId] = useState<string>(projectBooks[0]?.id || '');
  const currentSelectedBook = projectBooks.find((b) => b.id === selectedBookId) || projectBooks[0];
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    currentSelectedBook?.chapters[0]?.id || ''
  );
  const [includeCitation, setIncludeCitation] = useState(true);

  const handleConfirm = () => {
    if (!selectedBookId || !selectedChapterId) return;

    let textToAppend = `\n\n--- [اقتباس مستخرج من: ${result.bookTitle} (ص ${result.pageNumber})] ---\n${result.text}`;
    if (includeCitation) {
      textToAppend += `\nالمصدر: ${result.author}، ${result.bookTitle}، ص ${result.pageNumber}.`;
    }

    onAppendToBook(selectedBookId, selectedChapterId, textToAppend);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        id="add-to-project-modal"
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BookPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cairo font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                إضافة النص لمشروع كتاب
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                أدرج المقتطف أو الملخص مباشرة في فصول كتابك الجاري تأليفه
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

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          {/* Preview of text to add */}
          <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300/30 text-xs font-tajawal text-stone-700 dark:text-stone-300 line-clamp-3">
            <span className="font-cairo font-bold text-amber-800 dark:text-amber-300 block mb-1">
              المحتوى المراد إدراجه:
            </span>
            {result.text}
          </div>

          {/* Select Target Book */}
          <div>
            <label className="block text-xs font-bold font-cairo text-stone-700 dark:text-stone-300 mb-1.5">
              اختر مشروع الكتاب المستهدف
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(e.target.value);
                const book = projectBooks.find((b) => b.id === e.target.value);
                if (book?.chapters[0]) setSelectedChapterId(book.chapters[0].id);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-cairo outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              {projectBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.author})
                </option>
              ))}
            </select>
          </div>

          {/* Select Target Chapter */}
          {currentSelectedBook && (
            <div>
              <label className="block text-xs font-bold font-cairo text-stone-700 dark:text-stone-300 mb-1.5">
                اختر الفصل للإدراج
              </label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-cairo outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {currentSelectedBook.chapters.map((ch, idx) => (
                  <option key={ch.id} value={ch.id}>
                    الفصل {idx + 1}: {ch.title} ({ch.wordCount} كلمة)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Citation checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-cairo text-stone-700 dark:text-stone-300 pt-1">
            <input
              type="checkbox"
              checked={includeCitation}
              onChange={(e) => setIncludeCitation(e.target.checked)}
              className="rounded text-amber-600 accent-amber-600 w-4 h-4"
            />
            <span>تضمين التوثيق الأكاديمي التلقائي أسفل الفقرة (اسم الكتاب، المؤلف، ورقم الصفحة)</span>
          </label>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2.5 bg-stone-50/50 dark:bg-stone-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-cairo font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-cairo font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>تأكيد الإدراج في الكتاب</span>
          </button>
        </div>

      </div>
    </div>
  );
};
