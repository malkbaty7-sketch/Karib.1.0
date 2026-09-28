import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Edit3, 
  Check, 
  Plus, 
  Type, 
  Sliders, 
  FileText,
  ArrowUp,
  ArrowDown,
  Trash2,
  Database,
  Quote,
  Copy,
  Layers,
  Code,
  Save,
  Clock,
  Sparkles,
  Headphones
} from 'lucide-react';
import { Book, Chapter, Citation } from '../types';
import { AudiobookStudioModal } from './AudiobookStudioModal';

interface BookReaderModalProps {
  book: Book | null;
  onClose: () => void;
  onUpdateBook: (updatedBook: Book) => void;
}

export const BookReaderModal: React.FC<BookReaderModalProps> = ({
  book,
  onClose,
  onUpdateBook,
}) => {
  if (!book) return null;

  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(true);
  const [currentFont, setCurrentFont] = useState<'cairo' | 'tajawal'>('tajawal');
  const [fontSize, setFontSize] = useState<number>(18);
  const [readingTheme, setReadingTheme] = useState<'sepia' | 'light' | 'night'>('sepia');
  const [viewMode, setViewMode] = useState<'editor' | 'json' | 'citations'>('editor');
  const [isAudiobookModalOpen, setIsAudiobookModalOpen] = useState(false);

  // Active Chapter
  const activeChapter: Chapter = book.chapters[activeChapterIndex] || {
    id: 'c-default',
    title: 'الفصل الأول',
    orderIndex: 0,
    contentJson: '{"ops":[{"insert":"اكتب محتوى الفصل هنا...\\n"}]}',
    plainText: 'اكتب محتوى الفصل هنا...',
    wordCount: 4,
    content: 'اكتب محتوى الفصل هنا...',
    citations: []
  };

  // Local state representing Chapter Model fields
  const [editablePlainText, setEditablePlainText] = useState(
    activeChapter.plainText || activeChapter.content || ''
  );
  const [editableTitle, setEditableTitle] = useState(activeChapter.title);

  // Auto-save state simulating ProjectEditorProvider in Flutter
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('الآن');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Citations state
  const [isAddCitationOpen, setIsAddCitationOpen] = useState(false);
  const [newCitSource, setNewCitSource] = useState('');
  const [newCitPage, setNewCitPage] = useState<number>(1);
  const [newCitAuthor, setNewCitAuthor] = useState('');
  const [newCitExcerpt, setNewCitExcerpt] = useState('');

  // New chapter state
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // Update local buffer when active chapter changes
  useEffect(() => {
    setEditablePlainText(activeChapter.plainText || activeChapter.content || '');
    setEditableTitle(activeChapter.title);
    setSaveStatus('saved');
  }, [activeChapterIndex, book.id]);

  // Debounced auto-save effect matching ProjectEditorProvider
  const triggerAutoSave = (newPlainText: string, newTitle?: string) => {
    setSaveStatus('unsaved');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');

      setTimeout(() => {
        const words = newPlainText.trim().split(/\s+/).filter(Boolean).length;
        const generatedJson = JSON.stringify({
          ops: [
            { insert: newPlainText + '\n' }
          ]
        });

        const updatedChapters = [...book.chapters];
        updatedChapters[activeChapterIndex] = {
          ...activeChapter,
          title: newTitle !== undefined ? newTitle : activeChapter.title,
          plainText: newPlainText,
          content: newPlainText,
          contentJson: generatedJson,
          wordCount: words,
        };

        const totalWords = updatedChapters.reduce((sum, c) => sum + c.wordCount, 0);
        const updatedBook: Book = {
          ...book,
          chapters: updatedChapters,
          wordCount: totalWords,
          lastModified: 'الآن (حفظ تلقائي)',
        };

        onUpdateBook(updatedBook);
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }, 500);
    }, 1200); // 1.2s Debounce matching Flutter Provider
  };

  const handleTextChange = (text: string) => {
    setEditablePlainText(text);
    triggerAutoSave(text);
  };

  const handleTitleChange = (title: string) => {
    setEditableTitle(title);
    triggerAutoSave(editablePlainText, title);
  };

  // Chapter CRUD & Reorder (Matching SQLite Chapter CRUD)
  const handleAddChapter = () => {
    if (!newChapterTitle.trim()) return;
    const newIndex = book.chapters.length;
    const newChap: Chapter = {
      id: `chap-${Date.now()}`,
      title: newChapterTitle.trim(),
      orderIndex: newIndex,
      contentJson: '{"ops":[{"insert":"\\n"}]}',
      plainText: '',
      content: '',
      wordCount: 0,
      citations: []
    };

    const updatedChapters = [...book.chapters, newChap];
    const updatedBook: Book = {
      ...book,
      chapters: updatedChapters,
      lastModified: 'الآن',
    };

    onUpdateBook(updatedBook);
    setNewChapterTitle('');
    setShowAddChapter(false);
    setActiveChapterIndex(updatedChapters.length - 1);
  };

  const handleDeleteChapter = (idx: number) => {
    if (book.chapters.length <= 1) return;
    const filtered = book.chapters.filter((_, i) => i !== idx);
    // Re-index orderIndex atomically
    const reIndexed = filtered.map((c, i) => ({ ...c, orderIndex: i }));
    const totalWords = reIndexed.reduce((sum, c) => sum + c.wordCount, 0);

    const updatedBook: Book = {
      ...book,
      chapters: reIndexed,
      wordCount: totalWords,
      lastModified: 'الآن',
    };

    onUpdateBook(updatedBook);
    if (activeChapterIndex >= reIndexed.length) {
      setActiveChapterIndex(reIndexed.length - 1);
    }
  };

  const handleMoveChapter = (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= book.chapters.length) return;

    const list = [...book.chapters];
    const temp = list[currentIndex];
    list[currentIndex] = list[targetIndex];
    list[targetIndex] = temp;

    // Update orderIndex
    const reordered = list.map((ch, idx) => ({ ...ch, orderIndex: idx }));

    const updatedBook: Book = {
      ...book,
      chapters: reordered,
      lastModified: 'الآن (إعادة ترتيب SQL)',
    };

    onUpdateBook(updatedBook);
    setActiveChapterIndex(targetIndex);
  };

  // Citation CRUD (Matching SQLite Citation CRUD)
  const handleAddCitation = () => {
    if (!newCitSource.trim() || !newCitExcerpt.trim()) return;

    const newCitation: Citation = {
      id: `cit-${Date.now()}`,
      chapterId: activeChapter.id,
      sourceFileName: newCitSource.trim(),
      pageNumber: Number(newCitPage) || 1,
      author: newCitAuthor.trim() || 'مؤلف المصدر',
      excerpt: newCitExcerpt.trim(),
      createdAt: new Date().toISOString(),
    };

    const currentCitations = activeChapter.citations || [];
    const updatedCitations = [newCitation, ...currentCitations];

    const updatedChapters = [...book.chapters];
    updatedChapters[activeChapterIndex] = {
      ...activeChapter,
      citations: updatedCitations,
    };

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
    });

    setNewCitSource('');
    setNewCitPage(1);
    setNewCitAuthor('');
    setNewCitExcerpt('');
    setIsAddCitationOpen(false);
  };

  const handleDeleteCitation = (citationId: string) => {
    const currentCitations = activeChapter.citations || [];
    const updatedCitations = currentCitations.filter((c) => c.id !== citationId);

    const updatedChapters = [...book.chapters];
    updatedChapters[activeChapterIndex] = {
      ...activeChapter,
      citations: updatedCitations,
    };

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
    });
  };

  const handleInsertCitationToEditor = (cit: Citation) => {
    const refSnippet = `\n\n[توثيق مرجعي: «${cit.excerpt}» — ${cit.author}، كتاب/ملف: ${cit.sourceFileName}، ص ${cit.pageNumber}]\n`;
    const newText = editablePlainText + refSnippet;
    setEditablePlainText(newText);
    triggerAutoSave(newText);
  };

  const getThemeBg = () => {
    switch (readingTheme) {
      case 'sepia':
        return 'bg-[#fbf7ee] text-[#2c261e] border-[#e8dfcf]';
      case 'night':
        return 'bg-[#151311] text-[#ded8cf] border-[#292524]';
      case 'light':
        return 'bg-white text-stone-900 border-stone-200';
    }
  };

  const currentCitations = activeChapter.citations || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md">
      <div 
        id="book-reader-modal"
        className="w-full max-w-7xl h-[95vh] flex flex-col bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden"
      >
        {/* Top Control Bar & Provider Auto-Save Status */}
        <div className="h-16 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-6 flex items-center justify-between bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm gap-2">
          
          {/* Book Info */}
          <div className="flex items-center gap-3 shrink-0">
            <div className={`w-8 h-10 rounded-md bg-gradient-to-br ${book.coverGradient} shadow-xs flex items-center justify-center text-white text-xs`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-cairo font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 line-clamp-1">
                {book.title}
              </h2>
              <div className="text-xs text-stone-500 font-tajawal flex items-center gap-2">
                <span>{book.author}</span>
                <span>•</span>
                <span className="font-cairo text-amber-600 font-bold">{book.wordCount} كلمة في المشروع</span>
              </div>
            </div>
          </div>

          {/* ProjectEditorProvider Status (Auto-Save Indicator) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white dark:bg-stone-800 text-xs font-cairo shadow-xs">
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold text-stone-600 dark:text-stone-300">SQLite:</span>
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                جاري الحفظ التلقائي...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <Check className="w-3.5 h-3.5" />
                تم الحفظ تلقائياً ({lastSavedTime})
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1 text-stone-400">
                <Clock className="w-3 h-3" />
                تعديل معلّق...
              </span>
            )}
          </div>

          {/* Reading & Editing Controls */}
          <div className="flex items-center gap-2">
            
            {/* View Mode Switcher */}
            <div className="flex items-center bg-stone-200 dark:bg-stone-800 rounded-xl p-1 text-xs font-bold font-cairo">
              <button
                onClick={() => setViewMode('editor')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'editor'
                    ? 'bg-white dark:bg-stone-900 text-amber-600 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
                title="المحرر النصي"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">المحرر</span>
              </button>

              <button
                onClick={() => setViewMode('citations')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'citations'
                    ? 'bg-white dark:bg-stone-900 text-amber-600 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
                title="المراجع والاقتباسات (Citations)"
              >
                <Quote className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">المراجع</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                  {currentCitations.length}
                </span>
              </button>

              <button
                onClick={() => setViewMode('json')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'json'
                    ? 'bg-white dark:bg-stone-900 text-amber-600 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
                title="contentJson للتنسيقات المتقدمة"
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">JSON</span>
              </button>
            </div>

            {/* Font & Theme Switchers */}
            <div className="hidden sm:flex items-center bg-stone-200 dark:bg-stone-800 rounded-xl p-1 text-xs font-bold">
              <button
                onClick={() => setCurrentFont('tajawal')}
                className={`px-2 py-1 rounded-lg transition-all font-tajawal ${
                  currentFont === 'tajawal'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                تجوال
              </button>
              <button
                onClick={() => setCurrentFont('cairo')}
                className={`px-2 py-1 rounded-lg transition-all font-cairo ${
                  currentFont === 'cairo'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                كايرو
              </button>
            </div>

            {/* Audiobook Button */}
            <button
              onClick={() => setIsAudiobookModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 text-xs font-bold font-cairo transition-all cursor-pointer"
              title="الاستماع للكتاب الصوتي AudiobookService"
            >
              <Headphones className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">كتاب صوتي</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

          </div>
        </div>

        {/* Content Area: Chapters List with Reordering + Main Editor / Citations Panel */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Table of Contents & Chapter Reordering (فهرس الفصول وإعادة الترتيب) */}
          <div className="w-72 border-l border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <span className="font-cairo font-bold text-xs text-stone-700 dark:text-stone-300">
                  هيكل الفصول (SQL CRUD)
                </span>
                <span className="block text-[10px] text-stone-400 font-tajawal">
                  orderIndex متسلسل ذرياً
                </span>
              </div>
              <button
                onClick={() => setShowAddChapter(true)}
                className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 text-xs flex items-center gap-1 font-cairo font-bold"
                title="إضافة فصل جديد"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
              </button>
            </div>

            {/* Add Chapter Form */}
            {showAddChapter && (
              <div className="p-3 border-b border-stone-200 dark:border-stone-800 space-y-2 bg-amber-50/40 dark:bg-amber-950/20">
                <input
                  type="text"
                  placeholder="عنوان الفصل الجديد..."
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-cairo bg-white dark:bg-stone-800"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setShowAddChapter(false)}
                    className="px-2 py-1 text-xs text-stone-500 font-cairo"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleAddChapter}
                    className="px-2.5 py-1 text-xs bg-amber-600 text-white font-cairo font-bold rounded-md"
                  >
                    حفظ الفصل
                  </button>
                </div>
              </div>
            )}

            {/* Chapters List with orderIndex & Reorder Up/Down */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {book.chapters.map((chap, idx) => {
                const isActive = idx === activeChapterIndex;
                const citationsCount = chap.citations?.length || 0;

                return (
                  <div
                    key={chap.id}
                    className={`group w-full text-right p-2.5 rounded-xl text-xs font-cairo transition-all border ${
                      isActive
                        ? 'bg-amber-600 text-white font-bold shadow-xs border-amber-600'
                        : 'bg-white dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 hover:border-amber-400 dark:hover:border-amber-700 border-stone-200/80 dark:border-stone-700/80'
                    }`}
                  >
                    <div 
                      onClick={() => setActiveChapterIndex(idx)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isActive ? 'bg-amber-700 text-amber-100' : 'bg-stone-100 dark:bg-stone-700 text-stone-500'
                        }`}>
                          orderIndex: {chap.orderIndex ?? idx}
                        </span>
                        {citationsCount > 0 && (
                          <span className={`text-[10px] flex items-center gap-0.5 ${isActive ? 'text-amber-100' : 'text-amber-600'}`}>
                            <Quote className="w-2.5 h-2.5" />
                            {citationsCount}
                          </span>
                        )}
                      </div>
                      <span className="line-clamp-1 block">{chap.title}</span>
                      <span className={`text-[10px] font-tajawal ${isActive ? 'text-amber-100' : 'text-stone-400'}`}>
                        {chap.wordCount} كلمة
                      </span>
                    </div>

                    {/* Reorder Buttons (Up / Down) and Delete */}
                    <div className={`mt-2 pt-1.5 border-t flex items-center justify-between ${
                      isActive ? 'border-amber-500/50' : 'border-stone-100 dark:border-stone-700'
                    }`}>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveChapter(idx, 'up');
                          }}
                          className={`p-1 rounded transition-colors ${
                            idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                          title="رفع الترتيب لأعلى (orderIndex - 1)"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === book.chapters.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveChapter(idx, 'down');
                          }}
                          className={`p-1 rounded transition-colors ${
                            idx === book.chapters.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                          title="خفض الترتيب لأسفل (orderIndex + 1)"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {book.chapters.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChapter(idx);
                          }}
                          className={`p-1 rounded transition-colors hover:text-red-400 ${
                            isActive ? 'text-amber-200' : 'text-stone-400'
                          }`}
                          title="حذف الفصل من قاعدة البيانات"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className={`flex-1 flex flex-col overflow-y-auto p-6 sm:p-10 transition-colors ${getThemeBg()}`}>
            
            {/* VIEW 1: Main Text Editor (plainText + Live Word & Char Count) */}
            {viewMode === 'editor' && (
              <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-4">
                
                {/* Editable Chapter Title & Stats Header */}
                <div className="pb-4 border-b border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={editableTitle}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="w-full font-cairo font-black text-xl sm:text-2xl bg-transparent border-b border-transparent hover:border-amber-400 focus:border-amber-600 outline-none pb-1 transition-colors"
                      placeholder="عنوان الفصل..."
                    />
                    <p className="text-xs opacity-60 font-tajawal mt-1">
                      معرّف الفصل: {activeChapter.id} • الترتيب: {activeChapter.orderIndex}
                    </p>
                  </div>

                  {/* Calculations from plainText */}
                  <div className="flex items-center gap-3 text-xs font-cairo font-bold shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      {editablePlainText.trim().split(/\s+/).filter(Boolean).length} كلمة
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      {editablePlainText.length} حرف
                    </div>
                  </div>
                </div>

                {/* Text Area editing plainText */}
                <div className="flex-1 flex flex-col">
                  <textarea
                    value={editablePlainText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    rows={18}
                    style={{ fontSize: `${fontSize}px` }}
                    className={`w-full flex-1 p-5 rounded-2xl border border-stone-300/80 dark:border-stone-700/80 bg-white/60 dark:bg-stone-900/60 text-inherit outline-none focus:ring-2 focus:ring-amber-500/40 leading-relaxed resize-none ${
                      currentFont === 'cairo' ? 'font-cairo' : 'font-tajawal'
                    }`}
                    placeholder="اكتب هنا متن الفصل باللغة العربية... الحفظ التلقائي يعمل في الخلفية بمجرد التوقف عن الكتابة."
                  />
                </div>

                {/* Quick bottom bar */}
                <div className="flex items-center justify-between text-xs font-tajawal text-stone-500 pt-2 border-t border-black/5 dark:border-white/5">
                  <span>تم تفعيل الحفظ التلقائي (Auto-save) عند كل تعديل.</span>
                  <button
                    onClick={() => setViewMode('citations')}
                    className="text-amber-600 hover:underline flex items-center gap-1 font-cairo font-bold"
                  >
                    <Quote className="w-3.5 h-3.5" />
                    <span>إدارة مراجع الفصل ({currentCitations.length})</span>
                  </button>
                </div>

              </div>
            )}

            {/* VIEW 2: Citations & References Panel */}
            {viewMode === 'citations' && (
              <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
                  <div>
                    <h3 className="font-cairo font-black text-xl text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <Quote className="w-5 h-5 text-amber-600" />
                      <span>مراجع واقتباسات الفصل: {activeChapter.title}</span>
                    </h3>
                    <p className="text-xs text-stone-500 font-tajawal mt-1">
                      جدول المراجع (Citations Table) في قاعدة بيانات SQLite المحلية
                    </p>
                  </div>

                  <button
                    onClick={() => setIsAddCitationOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-cairo font-bold shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة مرجع جديد</span>
                  </button>
                </div>

                {/* Add Citation Inline Modal / Form */}
                {isAddCitationOpen && (
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-stone-800/90 border border-amber-300 dark:border-amber-700 space-y-3 font-cairo">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      بيانات المرجع والاقتباس الجديد:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-stone-600 dark:text-stone-400 block mb-1">اسم ملف المصدر (sourceFileName)</label>
                        <input
                          type="text"
                          placeholder="مثال: الكامل_في_التاريخ.pdf"
                          value={newCitSource}
                          onChange={(e) => setNewCitSource(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-stone-600 dark:text-stone-400 block mb-1">المؤلف (author)</label>
                        <input
                          type="text"
                          placeholder="مثال: ابن الأثير"
                          value={newCitAuthor}
                          onChange={(e) => setNewCitAuthor(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-stone-600 dark:text-stone-400 block mb-1">رقم الصفحة (pageNumber)</label>
                        <input
                          type="number"
                          value={newCitPage}
                          onChange={(e) => setNewCitPage(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-stone-600 dark:text-stone-400 block mb-1">نص الاقتباس (excerpt)</label>
                      <textarea
                        rows={3}
                        placeholder="اكتب أو الصق نص الاقتباس هنا..."
                        value={newCitExcerpt}
                        onChange={(e) => setNewCitExcerpt(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setIsAddCitationOpen(false)}
                        className="px-3 py-1 rounded-lg text-xs font-cairo text-stone-500"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleAddCitation}
                        className="px-4 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs font-cairo shadow-xs"
                      >
                        حفظ المرجع في SQL
                      </button>
                    </div>
                  </div>
                )}

                {/* Citations List */}
                {currentCitations.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700">
                    <Quote className="w-8 h-8 mx-auto text-stone-400 mb-2" />
                    <p className="font-cairo text-sm font-semibold text-stone-600 dark:text-stone-300">
                      لا توجد مراجع مسجلة لهذا الفصل حتى الآن
                    </p>
                    <p className="font-tajawal text-xs text-stone-400 mt-1">
                      يمكنك توثيق أي اقتباس أو كتابة مصدر بالنقر على "إضافة مرجع جديد"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentCitations.map((cit) => (
                      <div
                        key={cit.id}
                        className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-800/70 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 text-xs font-bold font-cairo">
                              ص {cit.pageNumber}
                            </span>
                            <span className="font-cairo font-bold text-xs text-stone-800 dark:text-stone-200">
                              {cit.sourceFileName}
                            </span>
                            <span className="text-xs text-stone-400 font-tajawal">
                              • {cit.author}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleInsertCitationToEditor(cit)}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-stone-700 dark:text-stone-200 text-xs font-cairo flex items-center gap-1 transition-colors"
                              title="إدراج التوثيق في متن الفصل"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إدراج بالنص</span>
                            </button>

                            <button
                              onClick={() => handleDeleteCitation(cit.id)}
                              className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg transition-colors"
                              title="حذف المرجع"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-sm font-tajawal leading-relaxed text-stone-700 dark:text-stone-300 pr-2 border-r-2 border-amber-500">
                          «{cit.excerpt}»
                        </p>

                        <div className="text-[11px] font-mono text-stone-400 pt-1">
                          التوثيق الموحد: «{cit.excerpt}» — {cit.author}، [{cit.sourceFileName}]، ص {cit.pageNumber}.
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* VIEW 3: contentJson Inspector (Quill Delta / AST) */}
            {viewMode === 'json' && (
              <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-4">
                <div className="pb-3 border-b border-stone-200 dark:border-stone-800">
                  <h3 className="font-cairo font-black text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Code className="w-5 h-5 text-amber-600" />
                    <span>هيكل حقل `contentJson` للتنسيقات المتقدمة</span>
                  </h3>
                  <p className="text-xs text-stone-500 font-tajawal mt-1">
                    يحفظ بنية التنسيقات المتقدمة (Quill Delta / Markdown AST) مع مزامنة النص الخام في `plainText`
                  </p>
                </div>

                <div className="flex-1 p-4 rounded-2xl bg-stone-950 text-emerald-400 font-mono text-xs overflow-auto border border-stone-800 leading-relaxed dir-ltr">
                  <pre>{JSON.stringify(JSON.parse(activeChapter.contentJson || '{}'), null, 2)}</pre>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Audiobook Studio Modal */}
        <AudiobookStudioModal
          isOpen={isAudiobookModalOpen}
          onClose={() => setIsAudiobookModalOpen(false)}
          book={book}
          initialChapterIndex={activeChapterIndex}
        />

      </div>
    </div>
  );
};
