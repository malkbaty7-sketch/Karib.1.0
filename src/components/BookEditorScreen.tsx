import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Edit3, 
  Check, 
  Plus, 
  Type, 
  Quote, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Database, 
  Sparkles, 
  AlignRight, 
  AlignCenter, 
  AlignLeft, 
  AlignJustify, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3, 
  Search, 
  X, 
  FileText, 
  Clock, 
  Sliders, 
  Eye, 
  Code,
  GripVertical,
  FileDown,
  Printer,
  Wand2,
  Headphones,
  Cloud
} from 'lucide-react';
import { Book, Chapter, Citation, ExtractedResult } from '../types';
import { ExportBookModal } from './ExportBookModal';
import { StyleAssistantBottomSheet } from './StyleAssistantBottomSheet';
import { AudiobookStudioModal } from './AudiobookStudioModal';
import { CloudSyncStudioModal } from './CloudSyncStudioModal';
import { InAppAssistantModal } from './InAppAssistantModal';
import { FloatingAssistantWidget } from './FloatingAssistantWidget';
import { InAppAssistantService } from '../services/inAppAssistantService';

interface BookEditorScreenProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  extractedResults?: ExtractedResult[];
  onBackToLibrary?: () => void;
  onNavigateToPublishing?: () => void;
}

export const BookEditorScreen: React.FC<BookEditorScreenProps> = ({
  book,
  onUpdateBook,
  extractedResults = [],
  onBackToLibrary,
  onNavigateToPublishing,
}) => {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [currentFont, setCurrentFont] = useState<'cairo' | 'tajawal'>('tajawal');
  const [fontSize, setFontSize] = useState<number>(18);
  const [textAlign, setTextAlign] = useState<'right' | 'center' | 'left' | 'justify'>('right');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  // Buffer state
  const [chapterTitle, setChapterTitle] = useState(activeChapter.title);
  const [editorText, setEditorText] = useState(activeChapter.plainText || activeChapter.content || '');
  const [isRenamingChapter, setIsRenamingChapter] = useState(false);
  const [renamingTitle, setRenamingTitle] = useState('');

  // Auto-save state (simulating ProjectEditorProvider debounce)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string>('الآن');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Citation Picker Modal state
  const [isCitationPickerOpen, setIsCitationPickerOpen] = useState(false);
  const [citationSearchQuery, setCitationSearchQuery] = useState('');

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Style & Emotion Analysis Modal state (StyleAnalysisService)
  const [isStyleAnalysisOpen, setIsStyleAnalysisOpen] = useState(false);

  // Audiobook Studio state (AudiobookService)
  const [isAudiobookModalOpen, setIsAudiobookModalOpen] = useState(false);

  // Cloud Sync Studio state (CloudSyncService)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // In-App Assistant & Proofreading Modal state (InAppAssistantService)
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);
  const [isFloatingAssistantOpen, setIsFloatingAssistantOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [cursorRange, setCursorRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  // Handle applying suggestion from floating assistant directly into the text editor at cursor/selection
  const handleApplyAssistantSnippet = (snippet: string, mode: 'cursor' | 'replace' | 'append' = 'cursor') => {
    const updated = InAppAssistantService.applySuggestionToText({
      currentText: editorText,
      suggestion: snippet,
      selectionStart: cursorRange.start,
      selectionEnd: cursorRange.end,
      mode,
    });
    handleTextChange(updated);
  };

  // New chapter state
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // Sync when active chapter changes
  useEffect(() => {
    setChapterTitle(activeChapter.title);
    setEditorText(activeChapter.plainText || activeChapter.content || '');
    setSaveStatus('saved');
  }, [activeChapterIndex, book.id]);

  // Debounced auto-save handler (ProjectEditorProvider mimic)
  const triggerAutoSave = (newText: string, newTitle?: string) => {
    setSaveStatus('unsaved');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');

      setTimeout(() => {
        const words = newText.trim().split(/\s+/).filter(Boolean).length;
        const generatedJson = JSON.stringify({
          ops: [{ insert: newText + '\n' }]
        });

        const nowMs = Date.now();
        const updatedChapters = [...book.chapters];
        updatedChapters[activeChapterIndex] = {
          ...activeChapter,
          title: newTitle !== undefined ? newTitle : activeChapter.title,
          plainText: newText,
          content: newText,
          contentJson: generatedJson,
          wordCount: words,
          lastModified: 'الآن (تعديل محلي)',
          lastModifiedTimestamp: nowMs,
          isSynced: false,
        };

        const totalWords = updatedChapters.reduce((sum, c) => sum + c.wordCount, 0);
        const updatedBook: Book = {
          ...book,
          chapters: updatedChapters,
          wordCount: totalWords,
          lastModified: 'الآن (حفظ محلي غير متزامن)',
          lastModifiedTimestamp: nowMs,
          isSynced: false,
        };

        onUpdateBook(updatedBook);
        setSaveStatus('saved');
        setLastSavedAt(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }));
      }, 400);
    }, 1200); // 1.2s Debounce
  };

  const handleTextChange = (text: string) => {
    setEditorText(text);
    triggerAutoSave(text);
  };

  const handleTitleChange = (newTitle: string) => {
    setChapterTitle(newTitle);
    triggerAutoSave(editorText, newTitle);
  };

  // Chapter CRUD
  const handleAddNewChapter = () => {
    if (!newChapterTitle.trim()) return;
    const newIdx = book.chapters.length;
    const newChap: Chapter = {
      id: `chap-${Date.now()}`,
      title: newChapterTitle.trim(),
      orderIndex: newIdx,
      contentJson: '{"ops":[{"insert":"\\n"}]}',
      plainText: '',
      content: '',
      wordCount: 0,
      citations: []
    };

    const updatedChapters = [...book.chapters, newChap];
    onUpdateBook({
      ...book,
      chapters: updatedChapters,
    });
    setNewChapterTitle('');
    setIsAddingChapter(false);
    setActiveChapterIndex(updatedChapters.length - 1);
  };

  const handleDeleteChapter = (idx: number) => {
    if (book.chapters.length <= 1) return;
    const filtered = book.chapters.filter((_, i) => i !== idx);
    const reindexed = filtered.map((c, i) => ({ ...c, orderIndex: i }));
    const totalWords = reindexed.reduce((sum, c) => sum + c.wordCount, 0);

    onUpdateBook({
      ...book,
      chapters: reindexed,
      wordCount: totalWords,
    });

    if (activeChapterIndex >= reindexed.length) {
      setActiveChapterIndex(reindexed.length - 1);
    }
  };

  const handleMoveChapter = (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= book.chapters.length) return;

    const list = [...book.chapters];
    const temp = list[currentIndex];
    list[currentIndex] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((ch, idx) => ({ ...ch, orderIndex: idx }));
    onUpdateBook({
      ...book,
      chapters: reordered,
    });
    setActiveChapterIndex(targetIndex);
  };

  // Rich text formatting simulation
  const applyFormatSnippet = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('rich-text-editor-area') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editorText.substring(start, end);
    const replacement = `${prefix}${selectedText || 'نص التنسيق'}${suffix}`;

    const newContent = editorText.substring(0, start) + replacement + editorText.substring(end);
    setEditorText(newContent);
    triggerAutoSave(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 50);
  };

  // Insert Citation Footnote
  const handleInsertFootnote = (cit: { excerpt: string; author: string; source: string; page: number }) => {
    const footnoteMarker = ` [${(activeChapter.citations?.length || 0) + 1}]`;
    const footnoteText = `\n\n--------------------\nحاشية توثيقية: «${cit.excerpt}» — ${cit.author}، كتاب/ملف: [${cit.source}]، ص ${cit.page}.\n`;

    const newContent = editorText + footnoteMarker + footnoteText;
    setEditorText(newContent);

    // Save citation record
    const newCit: Citation = {
      id: `cit-${Date.now()}`,
      chapterId: activeChapter.id,
      sourceFileName: cit.source,
      pageNumber: cit.page,
      author: cit.author,
      excerpt: cit.excerpt,
      createdAt: new Date().toISOString(),
    };

    const currentCitations = activeChapter.citations || [];
    const updatedCitations = [newCit, ...currentCitations];
    const updatedChapters = [...book.chapters];
    updatedChapters[activeChapterIndex] = {
      ...activeChapter,
      citations: updatedCitations,
    };

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
    });

    triggerAutoSave(newContent);
    setIsCitationPickerOpen(false);
  };

  // Available citations pool (combining chapter citations + extracted semantic results)
  const allAvailableCitations = [
    ...(activeChapter.citations || []).map(c => ({
      id: c.id,
      excerpt: c.excerpt,
      author: c.author,
      source: c.sourceFileName,
      page: c.pageNumber,
    })),
    ...extractedResults.map(r => ({
      id: r.id,
      excerpt: r.originalExcerpt || r.text,
      author: r.author,
      source: r.bookTitle,
      page: r.pageNumber,
    })),
    // Standard foundational reference examples
    {
      id: 'default_1',
      excerpt: 'النظم هو توخي معاني النحو وأحكامه فيما بين الكلم على حسب الأغراض المصوغة لها.',
      author: 'عبد القاهر الجرجاني',
      source: 'دلائل الإعجاز في علم المعاني',
      page: 42,
    },
    {
      id: 'default_2',
      excerpt: 'المكان في العمل السردي ليس مجرد وعاء فيزيائي، بل هو بنية دلالية تنطق بوجدان الشخصيات.',
      author: 'غاستون باشلار',
      source: 'جماليات المكان والذاكرة',
      page: 114,
    },
    {
      id: 'default_3',
      excerpt: 'البلاغة العربية في جوهرها مطابقة الكلام لمقتضى الحال مع فصاحة ألفاظه وسلاسة تركيبه.',
      author: 'السكاكي',
      source: 'مفتاح العلوم',
      page: 86,
    }
  ];

  const filteredCitations = allAvailableCitations.filter(c => 
    c.excerpt.includes(citationSearchQuery) || 
    c.author.includes(citationSearchQuery) || 
    c.source.includes(citationSearchQuery)
  );

  // Live Statistics Calculations
  const wordCount = !editorText.trim() ? 0 : editorText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = editorText.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const readingTimeFormatted = wordCount === 0 
    ? 'أقل من دقيقة' 
    : readingTimeMinutes === 1 
      ? 'دقيقة واحدة قراءة' 
      : readingTimeMinutes === 2 
        ? 'دقيقتان قراءة' 
        : `${readingTimeMinutes} دقائق قراءة`;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-stone-100/70 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden font-cairo">
      
      {/* 1. TOP FORMATTING TOOLBAR */}
      <div className="h-14 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 flex items-center justify-between gap-2 shrink-0 shadow-xs z-20">
        
        {/* Book Title & Sidebar Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {onBackToLibrary && (
            <button
              onClick={onBackToLibrary}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300 transition-colors"
            >
              المكتبة
            </button>
          )}

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isSidebarOpen 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' 
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="إظهار/إخفاء قائمة الفصول"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden md:inline">الفصول ({book.chapters.length})</span>
          </button>

          <span className="text-xs text-stone-300 dark:text-stone-700">|</span>
          <span className="text-xs font-bold text-stone-700 dark:text-stone-300 line-clamp-1 max-w-[150px] sm:max-w-xs">
            {book.title}
          </span>
        </div>

        {/* Rich Text Formatting Actions */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          
          {/* Headings (H1, H2, H3) */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800/80 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
            <button
              onClick={() => applyFormatSnippet('\n# ', '\n')}
              className="p-1.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300 text-xs font-bold"
              title="عنوان رئيسي (H1)"
            >
              H1
            </button>
            <button
              onClick={() => applyFormatSnippet('\n## ', '\n')}
              className="p-1.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300 text-xs font-bold"
              title="عنوان فرعي (H2)"
            >
              H2
            </button>
            <button
              onClick={() => applyFormatSnippet('\n### ', '\n')}
              className="p-1.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300 text-xs font-bold"
              title="عنوان قسم (H3)"
            >
              H3
            </button>
          </div>

          {/* Bold, Italic, Underline */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800/80 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
            <button
              onClick={() => applyFormatSnippet('**', '**')}
              className="p-1.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300"
              title="غامق (Bold)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyFormatSnippet('*', '*')}
              className="p-1.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300"
              title="مائل (Italic)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyFormatSnippet('<u>', '</u>')}
              className="p-1.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300"
              title="تحته خط (Underline)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Alignment (Right, Center, Left, Justify) */}
          <div className="hidden sm:flex items-center bg-stone-100 dark:bg-stone-800/80 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
            <button
              onClick={() => setTextAlign('right')}
              className={`p-1.5 rounded transition-colors ${textAlign === 'right' ? 'bg-white dark:bg-stone-700 text-amber-600 shadow-xs' : 'text-stone-600 dark:text-stone-400'}`}
              title="محاذاة لليمين"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTextAlign('center')}
              className={`p-1.5 rounded transition-colors ${textAlign === 'center' ? 'bg-white dark:bg-stone-700 text-amber-600 shadow-xs' : 'text-stone-600 dark:text-stone-400'}`}
              title="توسيط"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTextAlign('left')}
              className={`p-1.5 rounded transition-colors ${textAlign === 'left' ? 'bg-white dark:bg-stone-700 text-amber-600 shadow-xs' : 'text-stone-600 dark:text-stone-400'}`}
              title="محاذاة لليسار"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTextAlign('justify')}
              className={`p-1.5 rounded transition-colors ${textAlign === 'justify' ? 'bg-white dark:bg-stone-700 text-amber-600 shadow-xs' : 'text-stone-600 dark:text-stone-400'}`}
              title="ضبط كامل (Justify)"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lists & Blockquote */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800/80 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
            <button
              onClick={() => applyFormatSnippet('\n- ')}
              className="p-1.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300"
              title="قائمة نقطية"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyFormatSnippet('\n1. ')}
              className="p-1.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300"
              title="قائمة رقمية"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyFormatSnippet('\n> «', '»\n')}
              className="p-1.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300"
              title="اقتباس مخصص (Blockquote)"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Insert Citation Button (Requested Feature!) */}
          <button
            onClick={() => setIsCitationPickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold shadow-xs transition-all shrink-0"
            title="إدراج مرجع واقتباس كحاشية سفلية"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>إدراج مرجع</span>
          </button>

          {/* Style & Emotion Engineering Button (StyleAnalysisService) */}
          <button
            onClick={() => setIsStyleAnalysisOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-amber-600 hover:from-violet-700 hover:to-amber-700 text-white text-xs font-bold shadow-xs transition-all shrink-0"
            title="تحليل وهندسة المشاعر والأسلوب البلاغي عبر Gemini (StyleAnalysisService)"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>هندسة المشاعر والأسلوب</span>
          </button>

          {/* Font Toggle (Cairo vs Tajawal) */}
          <button
            onClick={() => setCurrentFont(currentFont === 'cairo' ? 'tajawal' : 'cairo')}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-200"
          >
            <Type className="w-3.5 h-3.5 text-amber-600" />
            <span>{currentFont === 'cairo' ? 'خط كـايرو' : 'خط تجـوال'}</span>
          </button>

          {/* In-App Assistant Button (InAppAssistantService powered by Gemini API) */}
          <button
            id="inapp-assistant-btn"
            onClick={() => {
              const textarea = document.getElementById('rich-text-editor-area') as HTMLTextAreaElement | null;
              if (textarea) {
                setCursorRange({ start: textarea.selectionStart, end: textarea.selectionEnd });
                if (textarea.selectionStart !== textarea.selectionEnd) {
                  setSelectedText(textarea.value.substring(textarea.selectionStart, textarea.selectionEnd));
                } else {
                  setSelectedText('');
                }
              }
              setIsFloatingAssistantOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-xs text-xs font-bold transition-all shrink-0 cursor-pointer"
            title="المساعد التفاعلي والتدقيق اللغوي مدعوم بـ Gemini API"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>المساعد والتدقيق الذكي</span>
          </button>

          {/* Publishing Studio Button */}
          {onNavigateToPublishing && (
            <button
              onClick={onNavigateToPublishing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 text-xs font-bold transition-all shrink-0"
              title="فتح استوديو النشر والتصدير الحي"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>استوديو النشر</span>
            </button>
          )}

          {/* Audiobook Studio Button (AudiobookService) */}
          <button
            onClick={() => setIsAudiobookModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 text-xs font-bold transition-all shrink-0 cursor-pointer"
            title="تحويل الفصل أو الكتاب إلى كتاب صوتي (AudiobookService)"
          >
            <Headphones className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>كتاب صوتي</span>
          </button>

          {/* Cloud Sync Button (CloudSyncService) */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeChapter?.isSynced === false
                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-400'
                : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-700/60'
            }`}
            title="إدارة المزامنة السحابية وحل التعارضات (CloudSyncService)"
          >
            <Cloud className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{activeChapter?.isSynced === false ? 'تعديل محلي (معلق)' : 'متزامن'}</span>
          </button>

          {/* Export Book Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-300/60 dark:border-stone-700/60 text-xs font-bold transition-all shrink-0"
            title="تصدير سريع للكتاب (PDF / Word / ePub3)"
          >
            <FileDown className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
            <span>تصدير سريع</span>
          </button>

        </div>

      </div>

      {/* 2. MAIN WORKSPACE: SIDEBAR + RICH TEXT EDITOR */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR: CHAPTERS MANAGEMENT */}
        {isSidebarOpen && (
          <aside className="w-72 border-l border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 flex flex-col shrink-0 transition-all">
            
            {/* Header & Add Chapter Button */}
            <div className="p-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-stone-800 dark:text-stone-200">
                  فصول الكتاب ({book.chapters.length})
                </h3>
                <span className="text-[10px] text-stone-400 font-tajawal">
                  اسحب أو رتب بالأسهم
                </span>
              </div>
              <button
                onClick={() => setIsAddingChapter(true)}
                className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs flex items-center gap-1 font-bold"
                title="إضافة فصل جديد"
              >
                <Plus className="w-4 h-4" />
                <span>فصل</span>
              </button>
            </div>

            {/* Inline Add Chapter Form */}
            {isAddingChapter && (
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 space-y-2">
                <input
                  type="text"
                  placeholder="عنوان الفصل الجديد..."
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setIsAddingChapter(false)}
                    className="px-2 py-1 text-xs text-stone-500"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleAddNewChapter}
                    className="px-3 py-1 bg-amber-600 text-white rounded-md text-xs font-bold"
                  >
                    إضافة
                  </button>
                </div>
              </div>
            )}

            {/* Chapters List with Reorder Up/Down & Rename */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {book.chapters.map((chap, idx) => {
                const isActive = idx === activeChapterIndex;
                const citationsCount = chap.citations?.length || 0;

                return (
                  <div
                    key={chap.id}
                    className={`group p-2.5 rounded-xl border text-xs transition-all ${
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-xs'
                        : 'bg-stone-50/60 dark:bg-stone-800/60 border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300'
                    }`}
                  >
                    <div 
                      onClick={() => setActiveChapterIndex(idx)}
                      className="cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                          isActive ? 'bg-amber-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold truncate">{chap.title}</span>
                      </div>
                      
                      {citationsCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-mono shrink-0">
                          {citationsCount} مرجع
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-200/50 dark:border-stone-700/50 text-[10px] text-stone-400 font-tajawal">
                      <span>{chap.wordCount} كلمة</span>

                      {/* Reorder Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveChapter(idx, 'up');
                          }}
                          className={`p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                          title="رفع الترتيب (السحب للأعلى)"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === book.chapters.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveChapter(idx, 'down');
                          }}
                          className={`p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 ${idx === book.chapters.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                          title="خفض الترتيب (السحب للأسفل)"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        {book.chapters.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChapter(idx);
                            }}
                            className="p-1 rounded hover:text-red-500"
                            title="حذف الفصل"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </aside>
        )}

        {/* RICH TEXT EDITOR CANVAS */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-8 lg:p-12 transition-colors">
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-10 border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
            
            {/* Chapter Header with Inline Rename */}
            <div className="pb-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className={`w-full font-black text-2xl sm:text-3xl bg-transparent border-b border-transparent hover:border-amber-400 focus:border-amber-600 outline-none pb-1 transition-colors ${
                    currentFont === 'cairo' ? 'font-cairo' : 'font-tajawal'
                  }`}
                  placeholder="عنوان الفصل..."
                />
                <p className="text-xs text-stone-400 font-tajawal mt-1">
                  الفصل {activeChapter.orderIndex + 1} من {book.chapters.length} • {book.author}
                </p>
              </div>

              {/* Quick Citations count badge */}
              <div 
                onClick={() => setIsCitationPickerOpen(true)}
                className="cursor-pointer px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 transition-colors shrink-0"
              >
                <Quote className="w-3.5 h-3.5" />
                <span>{activeChapter.citations?.length || 0} حاشية ومراجع</span>
              </div>
            </div>

            {/* Rich Editor Text Area */}
            <div className="flex-1 flex flex-col">
              <textarea
                id="rich-text-editor-area"
                value={editorText}
                onChange={(e) => handleTextChange(e.target.value)}
                onClick={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  setCursorRange({ start: target.selectionStart, end: target.selectionEnd });
                }}
                onKeyUp={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  setCursorRange({ start: target.selectionStart, end: target.selectionEnd });
                }}
                onSelect={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  setCursorRange({ start: target.selectionStart, end: target.selectionEnd });
                  if (target.selectionStart !== target.selectionEnd) {
                    setSelectedText(target.value.substring(target.selectionStart, target.selectionEnd));
                  } else {
                    setSelectedText('');
                  }
                }}
                rows={22}
                style={{ 
                  fontSize: `${fontSize}px`,
                  textAlign: textAlign,
                }}
                className={`w-full flex-1 p-4 rounded-2xl border border-transparent hover:border-stone-200 dark:hover:border-stone-800 focus:border-amber-500/40 bg-transparent text-inherit outline-none leading-relaxed resize-none ${
                  currentFont === 'cairo' ? 'font-cairo' : 'font-tajawal'
                }`}
                placeholder="اكتب هنا محتوى ومخطوطة الفصل باللغة العربية... يمكنك استخدام أشرطة الأدوات العلوية لتنسيق العناوين والاقتباسات وإدراج المراجع."
              />
            </div>

          </div>
        </main>

      </div>

      {/* 3. BOTTOM LIVE STATS BAR */}
      <footer className="h-10 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 shrink-0 z-20">
        
        {/* Live Stats: Words, Chars, Reading Time */}
        <div className="flex items-center gap-4 sm:gap-6 font-tajawal">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-bold font-cairo text-stone-800 dark:text-stone-200">{wordCount}</span>
            <span>كلمة</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <span className="font-bold font-cairo text-stone-800 dark:text-stone-200">{charCount}</span>
            <span>حرف</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>زمن القراءة المتوقع:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{readingTimeFormatted}</span>
          </div>
        </div>

        {/* SQLite Auto-save status */}
        <div className="flex items-center gap-2 font-cairo text-[11px]">
          <Database className="w-3.5 h-3.5 text-stone-400" />
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-amber-600 font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              جاري الحفظ التلقائي في SQLite...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <Check className="w-3.5 h-3.5" />
              محفوظ تلقائياً في SQLite ({lastSavedAt})
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-stone-400">تعديلات قيد المعالجة...</span>
          )}
        </div>

      </footer>

      {/* 4. CITATION PICKER MODAL (DIALOG) */}
      {isCitationPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Quote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900 dark:text-stone-100">
                    إدراج مرجع واقتباس أكاديمي
                  </h3>
                  <p className="text-xs text-stone-500 font-tajawal">
                    اختر اقتباساً من المستخرجات الدلالية السابقة لإدراجه كحاشية سفلية (Footnote)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCitationPickerOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="ابحث في نص الاقتباس أو اسم الكتاب أو المؤلف..."
                  value={citationSearchQuery}
                  onChange={(e) => setCitationSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-cairo"
                />
              </div>
            </div>

            {/* Citations List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredCitations.length === 0 ? (
                <div className="text-center py-10 text-stone-400">
                  <Quote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">لا توجد اقتباسات مطابقة لبحثك</p>
                  <p className="text-xs font-tajawal mt-1">يمكنك استخدام محرك الاستخراج الدلالي لاستخراج المزيد من المصادر</p>
                </div>
              ) : (
                filteredCitations.map((cit) => (
                  <div
                    key={cit.id}
                    className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 hover:border-amber-400 dark:hover:border-amber-600 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold">
                          ص {cit.page}
                        </span>
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                          {cit.source}
                        </span>
                        <span className="text-stone-400 font-tajawal">
                          • {cit.author}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-tajawal leading-relaxed text-stone-700 dark:text-stone-300 pr-2 border-r-2 border-amber-500">
                      «{cit.excerpt}»
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/50 dark:border-stone-700/50">
                      <span className="text-[10px] text-stone-400 font-mono">
                        صيغة الحاشية: «{cit.excerpt.slice(0, 30)}...» — {cit.author}، ص {cit.page}
                      </span>
                      <button
                        onClick={() => handleInsertFootnote(cit)}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold font-cairo shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إدراج كحاشية سفلية</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* Export Book Modal */}
      <ExportBookModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        book={book}
      />

      {/* Style & Emotion Assistant BottomSheet (StyleAssistantBottomSheet) */}
      <StyleAssistantBottomSheet
        isOpen={isStyleAnalysisOpen}
        onClose={() => setIsStyleAnalysisOpen(false)}
        chapterTitle={chapterTitle}
        currentText={editorText}
        onApplyRevision={(revised) => handleTextChange(revised)}
      />

      {/* Audiobook Studio Modal (AudiobookService) */}
      <AudiobookStudioModal
        isOpen={isAudiobookModalOpen}
        onClose={() => setIsAudiobookModalOpen(false)}
        book={book}
        initialChapterIndex={activeChapterIndex}
      />

      {/* Cloud Sync & Conflict Resolution Studio (CloudSyncService) */}
      <CloudSyncStudioModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        books={[book]}
        onUpdateBooks={(updated) => {
          if (updated[0]) onUpdateBook(updated[0]);
        }}
        currentBookId={book.id}
      />

      {/* In-App Assistant & Proofreading Modal (InAppAssistantService powered by Gemini API) */}
      <InAppAssistantModal
        isOpen={isAssistantModalOpen}
        onClose={() => setIsAssistantModalOpen(false)}
        projectId={book.id}
        chapterId={activeChapter.id}
        chapterTitle={chapterTitle}
        currentText={editorText}
        selectedText={selectedText}
        onApplyText={(newText) => handleTextChange(newText)}
        onInsertSnippet={(snippet) => {
          const updated = editorText ? `${editorText}\n\n${snippet}` : snippet;
          handleTextChange(updated);
        }}
      />

      {/* Floating Assistant Widget (Draggable Floating Action Button + Sliding Panel + Themes + Accessibility) */}
      <FloatingAssistantWidget
        isOpen={isFloatingAssistantOpen}
        onToggleOpen={(open) => setIsFloatingAssistantOpen(open)}
        projectId={book.id}
        chapterId={activeChapter.id}
        chapterTitle={chapterTitle}
        currentText={editorText}
        selectedText={selectedText}
        selectionStart={cursorRange.start}
        selectionEnd={cursorRange.end}
        onApplyText={(newText) => handleTextChange(newText)}
        onInsertSnippet={handleApplyAssistantSnippet}
      />

    </div>
  );
};
