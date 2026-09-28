import React, { useState } from 'react';
import { 
  Search, 
  BookOpen, 
  Sparkles, 
  CheckCircle, 
  TrendingUp, 
  SlidersHorizontal,
  LayoutGrid,
  ListFilter,
  Layers,
  FilePlus,
  Plus
} from 'lucide-react';
import { Book, DeviceFrame } from '../types';
import { CATEGORIES } from '../data/sampleBooks';
import { BookCard } from './BookCard';
import { AndroidInstallBanner } from './AndroidInstallBanner';

interface LibraryHomeScreenProps {
  books: Book[];
  deviceFrame: DeviceFrame;
  onOpenBook: (book: Book) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteBook: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenImportModal: () => void;
}

export const LibraryHomeScreen: React.FC<LibraryHomeScreenProps> = ({
  books,
  deviceFrame,
  onOpenBook,
  onToggleFavorite,
  onDeleteBook,
  onOpenCreateModal,
  onOpenImportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'title' | 'words'>('recent');

  // Filter books
  const filteredBooks = books.filter((book) => {
    const matchesSearch = 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === 'الكل') return matchesSearch;
    if (selectedCategory === 'المفضلة') return matchesSearch && book.isFavorite;
    if (selectedCategory === 'قيد التأليف') return matchesSearch && book.status === 'drafting';
    return matchesSearch && book.category === selectedCategory;
  });

  // Sort books
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === 'progress') {
      const progA = a.format === 'project' ? a.wordCount / (a.targetWordCount || 1) : a.currentPage / (a.totalPages || 1);
      const progB = b.format === 'project' ? b.wordCount / (b.targetWordCount || 1) : b.currentPage / (b.totalPages || 1);
      return progB - progA;
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title, 'ar');
    }
    if (sortBy === 'words') {
      return b.wordCount - a.wordCount;
    }
    return 0; // default recent
  });

  // Aggregate stats
  const totalBooks = books.length;
  const totalWords = books.reduce((acc, b) => acc + b.wordCount, 0);
  const completedBooks = books.filter((b) => b.status === 'published' || (b.currentPage >= b.totalPages && b.totalPages > 0)).length;
  const activeProjects = books.filter((b) => b.status === 'drafting').length;

  // Frame width constraints for testing responsive layout
  const frameClass = 
    deviceFrame === 'mobile'
      ? 'max-w-md mx-auto shadow-2xl rounded-3xl border-8 border-stone-800 dark:border-stone-700 overflow-hidden min-h-[800px] bg-stone-50 dark:bg-stone-950 my-6'
      : deviceFrame === 'tablet'
      ? 'max-w-3xl mx-auto shadow-2xl rounded-3xl border-8 border-stone-800 dark:border-stone-700 overflow-hidden min-h-[850px] bg-stone-50 dark:bg-stone-950 my-6'
      : 'w-full max-w-7xl mx-auto';

  return (
    <div className={frameClass}>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Prominent Android Mobile Installation Banner */}
        <AndroidInstallBanner />

        {/* Top Header & Statistics Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-cairo text-stone-900 dark:text-stone-100">
                {totalBooks} كتب
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                المكتبة والمشاريع
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-cairo text-stone-900 dark:text-stone-100">
                {Math.round(totalWords / 1000)} ألف
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                إجمالي الكلمات المكتوبة
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-cairo text-stone-900 dark:text-stone-100">
                {completedBooks} كتاب
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                مكتمل ومنشور
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-cairo text-stone-900 dark:text-stone-100">
                {activeProjects} مسودات
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                قيد الصياغة والتأليف
              </div>
            </div>
          </div>
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="library-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن كتاب، عنوان، مؤلف، أو موضوع..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm font-tajawal placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 px-1.5 py-0.5"
              >
                مسح
              </button>
            )}
          </div>

          {/* Sort & Quick Filter Controls */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-1.5 text-xs font-cairo shadow-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
              <span className="text-stone-500 dark:text-stone-400">الترتيب:</span>
              <select
                id="library-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-stone-800 dark:text-stone-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="recent">الأحدث نشاطاً</option>
                <option value="progress">نسبة الإنجاز</option>
                <option value="words">عدد الكلمات</option>
                <option value="title">أبجدياً (العنوان)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Chips Scrollbar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/25'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Books Grid */}
        {sortedBooks.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-stone-900/60 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 p-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="font-cairo font-bold text-lg text-stone-800 dark:text-stone-200 mb-1">
              لم يتم العثور على كتب مطابقة
            </h3>
            <p className="font-tajawal text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto mb-6">
              جرّب تغيير كلمات البحث أو اختيار تصنيف آخر، أو ابدأ بصناعة كتابك الجديد الآن.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-cairo font-bold text-xs hover:bg-amber-700 transition-colors shadow-xs"
              >
                إنشاء مشروع كتاب جديد
              </button>
              <button
                onClick={onOpenImportModal}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-cairo font-semibold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                استيراد ملف PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {sortedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpenBook={onOpenBook}
                onToggleFavorite={onToggleFavorite}
                onDeleteBook={onDeleteBook}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
