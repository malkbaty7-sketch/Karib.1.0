import React from 'react';
import { 
  Book as BookIcon, 
  FileText, 
  Heart, 
  MoreVertical, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Eye,
  Trash2
} from 'lucide-react';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onOpenBook: (book: Book) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteBook: (id: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onOpenBook,
  onToggleFavorite,
  onDeleteBook,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const formatProgress = Math.round(
    book.format === 'project' 
      ? (book.targetWordCount > 0 ? (book.wordCount / book.targetWordCount) * 100 : 0)
      : (book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0)
  );

  const getStatusBadge = () => {
    switch (book.status) {
      case 'published':
        return { label: 'منشور', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'reviewing':
        return { label: 'قيد المراجعة', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
      case 'drafting':
        return { label: 'قيد التأليف', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'reading':
        return { label: 'قراءة نشطة', bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div 
      id={`book-card-${book.id}`}
      className="group relative flex flex-col bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-amber-400/60 dark:hover:border-amber-500/50 transition-all duration-300 shadow-xs hover:shadow-lg hover:-translate-y-1 overflow-hidden"
    >
      {/* Book Cover Visual */}
      <div 
        onClick={() => onOpenBook(book)}
        className={`relative h-56 w-full bg-gradient-to-br ${book.coverGradient} p-5 flex flex-col justify-between cursor-pointer select-none overflow-hidden`}
      >
        {/* Decorative background overlay / Arabesque simulation */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        {/* Spine shadow simulation */}
        <div className="absolute top-0 right-0 w-3 h-full bg-black/25 blur-xs" />
        <div className="absolute top-0 right-2 w-0.5 h-full bg-white/20" />

        {/* Top Badges */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[11px] font-bold font-cairo px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-md text-amber-200 border border-white/10">
            {book.category}
          </span>

          <button
            id={`fav-btn-${book.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(book.id);
            }}
            className="p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-colors"
          >
            <Heart 
              className={`w-4 h-4 ${book.isFavorite ? 'fill-red-500 text-red-500' : 'text-stone-300'}`} 
            />
          </button>
        </div>

        {/* Book Title & Author on Cover */}
        <div className="relative z-10 my-auto text-center px-3">
          <div className="w-8 h-0.5 bg-amber-400/70 mx-auto mb-2.5 rounded-full" />
          <h3 className="font-cairo font-bold text-white text-base leading-snug drop-shadow-md line-clamp-3">
            {book.title}
          </h3>
          <p className="font-tajawal text-xs text-stone-200/90 mt-1 font-medium">
            {book.author}
          </p>
        </div>

        {/* Cover Bottom Format & Pages */}
        <div className="relative z-10 flex items-center justify-between text-[11px] font-tajawal text-stone-300 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-md">
          <span className="flex items-center gap-1">
            {book.format === 'pdf' ? (
              <FileText className="w-3.5 h-3.5 text-rose-300" />
            ) : (
              <BookIcon className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>{book.format.toUpperCase()}</span>
          </span>

          <span>{book.totalPages} صفحة</span>
        </div>
      </div>

      {/* Book Metadata & Progress Body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        
        {/* Status & Last Updated */}
        <div className="flex items-center justify-between text-xs">
          <span className={`px-2 py-0.5 rounded-md font-semibold font-cairo border text-[11px] ${badge.bg}`}>
            {badge.label}
          </span>

          <span className="flex items-center gap-1 text-stone-400 dark:text-stone-500 text-[11px] font-tajawal">
            <Clock className="w-3 h-3" />
            {book.lastModified}
          </span>
        </div>

        {/* Word Count / Reading Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs font-tajawal py-1 border-y border-stone-100 dark:border-stone-800">
          <div>
            <span className="text-stone-400 block text-[11px]">الكلمات</span>
            <span className="font-bold text-stone-800 dark:text-stone-200 font-cairo">
              {book.wordCount.toLocaleString('ar-SA')} كلمة
            </span>
          </div>

          <div>
            <span className="text-stone-400 block text-[11px]">
              {book.format === 'project' ? 'الهدف المخطط' : 'الصفحة الحالية'}
            </span>
            <span className="font-bold text-stone-800 dark:text-stone-200 font-cairo">
              {book.format === 'project' 
                ? `${book.targetWordCount.toLocaleString('ar-SA')} ك` 
                : `${book.currentPage} من ${book.totalPages}`}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs font-tajawal mb-1">
            <span className="text-stone-500 dark:text-stone-400">
              {book.format === 'project' ? 'إنجاز التأليف' : 'نسبة القراءة'}
            </span>
            <span className="font-bold font-cairo text-amber-600 dark:text-amber-400">
              %{formatProgress}
            </span>
          </div>
          <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, formatProgress))}%` }}
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 flex items-center justify-between gap-2">
          <button
            id={`open-book-btn-${book.id}`}
            onClick={() => onOpenBook(book)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 text-stone-700 dark:text-stone-200 text-xs font-bold font-cairo transition-all"
          >
            {book.format === 'project' ? (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>فتح المحرر</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>قراءة الكتاب</span>
              </>
            )}
          </button>

          {/* Quick options menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div 
                className="absolute left-0 bottom-full mb-1 w-36 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg p-1 z-30 text-xs font-cairo"
                onMouseLeave={() => setShowMenu(false)}
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onToggleFavorite(book.id);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-right"
                >
                  <Heart className="w-3.5 h-3.5 text-red-500" />
                  <span>{book.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteBook(book.id);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-right"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الكتاب</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
