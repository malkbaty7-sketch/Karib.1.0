import React, { useState } from 'react';
import { X, BookPlus, Sparkles, Feather } from 'lucide-react';
import { Book } from '../types';

interface CreateBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBook: (book: Book) => void;
}

const GRADIENTS = [
  { name: 'عنبري دافئ', value: 'from-amber-700 via-amber-800 to-stone-900' },
  { name: 'زمرد أندلسي', value: 'from-emerald-800 via-teal-900 to-slate-950' },
  { name: 'ياقوت ملكي', value: 'from-rose-900 via-red-950 to-neutral-950' },
  { name: 'نيلي معرفي', value: 'from-blue-800 via-indigo-950 to-slate-950' },
  { name: 'أرجواني شاعري', value: 'from-violet-900 via-purple-950 to-stone-950' },
  { name: 'فحم حبري', value: 'from-stone-800 via-stone-900 to-black' },
];

export const CreateBookModal: React.FC<CreateBookModalProps> = ({
  isOpen,
  onClose,
  onCreateBook,
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('رواية عربية');
  const [targetWordCount, setTargetWordCount] = useState(50000);
  const [description, setDescription] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].value);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newBook: Book = {
      id: `book-${Date.now()}`,
      title: title.trim(),
      author: author.trim() || 'الكاتب المستقل',
      category,
      coverGradient: selectedGradient,
      coverPattern: 'arabesque',
      totalPages: Math.ceil(targetWordCount / 250),
      currentPage: 0,
      wordCount: 0,
      targetWordCount: Number(targetWordCount) || 50000,
      status: 'drafting',
      lastModified: 'الآن',
      format: 'project',
      description: description.trim() || 'مشروع كتاب عربي جديد تم إنشاؤه عبر كاتب.',
      isFavorite: false,
      chapters: [
        {
          id: `c-${Date.now()}-1`,
          title: 'المقدمة والتمهيد',
          orderIndex: 0,
          contentJson: '{"ops":[{"insert":"اكتب بداية كتابك هنا مستخدماً اللغة العربية الفصحى...\\n"}]}',
          plainText: 'اكتب بداية كتابك هنا مستخدماً اللغة العربية الفصحى...',
          wordCount: 0,
          content: 'اكتب بداية كتابك هنا مستخدماً اللغة العربية الفصحى...',
          citations: []
        }
      ]
    };

    onCreateBook(newBook);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        id="create-book-modal"
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cairo font-bold text-lg text-stone-900 dark:text-stone-100">
                مشروع كتاب جديد
              </h2>
              <p className="text-xs text-stone-500 font-tajawal">
                حدد بيانات الكتاب وغلافه للانطلاق في الكتابة والتأليف
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-bold font-cairo text-stone-700 dark:text-stone-300 mb-1.5">
              عنوان الكتاب <span className="text-red-500">*</span>
            </label>
            <input
              id="book-title-input"
              type="text"
              required
              placeholder="مثال: رحيق الحكمة، ملامح من الأدب العربي..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-tajawal focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold font-cairo text-stone-700 dark:text-stone-300 mb-1.5">
                اسم المؤلف
              </label>
              <input
                id="book-author-input"
                type="text"
                placeholder="اسمك أو اللقب الأدبي"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-tajawal focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-cairo text-stone-700 dark:text-stone-300 mb-1.5">
                التصنيف
              </label>
              <select
                id="book-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-cairo focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none"
              >
                <option value="رواية أدبية">رواية أدبية</option>
                <option value="نقد وأدب">نقد وأدب</option>
                <option value="فكر ودراسات">فكر ودراسات</option>
                <option value="شعر وبلاغة">شعر وبلاغة</option>
                <option value="تقنية وبرمجة">تقنية وبرمجة</option>
                <option value="سيرة وتاريخ">سيرة وتاريخ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold font-cairo text-stone-700 dark:text-stone-300 mb-1.5">
              هدف الكلمات المخطط له
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5000"
                max="150000"
                step="5000"
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(Number(e.target.value))}
                className="flex-1 accent-amber-600"
              />
              <span className="font-cairo font-bold text-sm text-amber-600 dark:text-amber-400 min-w-20 text-left">
                {targetWordCount.toLocaleString('ar-SA')} كلمة
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold font-cairo text-stone-700 dark:text-stone-300 mb-1.5">
              لون ونمط الغلاف
            </label>
            <div className="grid grid-cols-6 gap-2">
              {GRADIENTS.map((g) => (
                <button
                  type="button"
                  key={g.name}
                  onClick={() => setSelectedGradient(g.value)}
                  className={`h-10 rounded-xl bg-gradient-to-br ${g.value} transition-all ${
                    selectedGradient === g.value
                      ? 'ring-2 ring-offset-2 ring-amber-500 scale-105'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={g.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold font-cairo text-stone-700 dark:text-stone-300 mb-1.5">
              نبذة وموجز عن العمل
            </label>
            <textarea
              rows={2}
              placeholder="اكتب فكرة الكتاب أو رسالته الأساسية..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-tajawal focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-cairo font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-cairo font-bold transition-colors shadow-xs shadow-amber-600/25 flex items-center gap-2"
            >
              <BookPlus className="w-4 h-4" />
              <span>إنشاء الكتاب وبدء التأليف</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
