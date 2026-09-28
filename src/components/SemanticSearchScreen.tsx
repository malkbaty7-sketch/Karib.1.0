import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  Library, 
  SlidersHorizontal, 
  X, 
  Filter, 
  CheckCircle, 
  Clock, 
  Layers, 
  BookOpen,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Zap,
  HelpCircle
} from 'lucide-react';
import { Book, ExtractedResult, ExtractionType } from '../types';
import { EXTRACTION_TYPES, INITIAL_EXTRACTED_RESULTS } from '../data/extractionData';
import { ExtractedCard } from './ExtractedCard';
import { SourceSelectionModal } from './SourceSelectionModal';
import { OriginalPageModal } from './OriginalPageModal';
import { AddToProjectModal } from './AddToProjectModal';

interface SemanticSearchScreenProps {
  books: Book[];
  onAppendToBook: (bookId: string, chapterId: string, content: string) => void;
}

export const SemanticSearchScreen: React.FC<SemanticSearchScreenProps> = ({
  books,
  onAppendToBook,
}) => {
  const [query, setQuery] = useState('');
  const [extractionType, setExtractionType] = useState<ExtractionType>('passages');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(
    books.slice(0, 3).map((b) => b.id)
  );
  
  // Results and UI state
  const [results, setResults] = useState<ExtractedResult[]>(INITIAL_EXTRACTED_RESULTS);
  const [activeFilter, setActiveFilter] = useState<'all' | 'accepted' | 'pending'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Processing / Progress state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const processingTimerRef = useRef<any>(null);

  // Modals
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [originalPageResult, setOriginalPageResult] = useState<ExtractedResult | null>(null);
  const [projectAddResult, setProjectAddResult] = useState<ExtractedResult | null>(null);

  // Suggested research questions / topics
  const SUGGESTED_TOPICS = [
    'هندسة المكان وتطوره في الرواية العربية',
    'أثر التحول الرقمي والذكاء الاصطناعي على الهوية',
    'مبادئ Clean Architecture في تطبيقات فلاتر',
    'منهجية التوثيق والترجمة في التراث الأندلسي',
    'تعريف مفهوم السرد وصوت الراوي البصري',
  ];

  // Start Extraction process with progress simulation
  const handleStartExtraction = () => {
    if (!query.trim()) return;

    setIsProcessing(true);
    setProgressValue(10);
    setProcessingStage('تهيئة وفهرسة الكتب المختارة...');

    let progress = 10;
    if (processingTimerRef.current) clearInterval(processingTimerRef.current);

    processingTimerRef.current = setInterval(() => {
      progress += 18;
      setProgressValue(Math.min(progress, 95));

      if (progress === 28) {
        setProcessingStage('مطابقة المفاهيم والدلالات اللغوية في المتون...');
      } else if (progress === 46) {
        setProcessingStage(`استخراج ${extractionType === 'summary' ? 'ملخص تحليلي' : 'نصوص أصلية'} وتوثيق أرقام الصفحات...`);
      } else if (progress === 82) {
        setProcessingStage('مراجعة نسب المطابقة والتأكد من أمانة الاقتباس...');
      }

      if (progress >= 100) {
        clearInterval(processingTimerRef.current);
        finishExtraction();
      }
    }, 450);
  };

  const handleCancelExtraction = () => {
    if (processingTimerRef.current) clearInterval(processingTimerRef.current);
    setIsProcessing(false);
    setProgressValue(0);
    setProcessingStage('');
  };

  const finishExtraction = () => {
    setIsProcessing(false);
    setProgressValue(100);

    // Build realistic results from selected books
    const targetBooks = books.filter((b) => selectedBookIds.includes(b.id));
    const primaryBook = targetBooks[0] || books[0];

    const newResult: ExtractedResult = {
      id: 'res-' + Date.now(),
      type: extractionType,
      topicQuery: query,
      text: generateDynamicExtractionText(query, extractionType, primaryBook),
      bookId: primaryBook.id,
      bookTitle: primaryBook.title,
      author: primaryBook.author,
      pageNumber: Math.floor(Math.random() * (primaryBook.totalPages - 10)) + 12,
      originalExcerpt: `«النص المحقق المتصل بـ ${query}...» (من كتاب ${primaryBook.title})`,
      relevanceScore: Math.floor(Math.random() * 8) + 92,
      status: 'pending',
      createdAt: 'الآن',
      tags: [primaryBook.category, extractionType, 'استخراج فوري'],
    };

    setResults((prev) => [newResult, ...prev]);
  };

  const generateDynamicExtractionText = (q: string, type: ExtractionType, book: Book) => {
    switch (type) {
      case 'summary':
        return `ملخص تركيبي لموضوع (${q}): يكشف التحليل المستفيض في نصوص «${book.title}» أن المعالجة الفكرية ترتكز على ربط النظرية بالتطبيق العملي. ويخلص المؤلف إلى ضرورة تبني نهج تكاملي يعيد الاعتبار للتوازن بين الأصالة والتحديث، مع تأكيد دور الكاتب كفاعل في توجيه الوعي الجمعي.`;
      case 'comparison':
        return `مقارنة تحليلية حول (${q}): بينما يذهب الاتجاه الكلاسيكي إلى تثبيت القواعد الصارمة، تؤكد دراسة «${book.title}» للمؤلف ${book.author} على المرونة والتعاطي الديناميكي مع السياق، مما يخلق تمايزاً نقدياً في زوايا الرؤية والنتائج المستخلصة.`;
      case 'qa':
        return `إجابة مستخلصة عن التساؤل (${q}): تفيد الفصول الاستقرائية في ص 45 بأن الحل يكمن في تفكيك المفهوم إلى عناصره الأولية ثم إعادة بنائه معيارياً، وهو ما يضمن معالجة جذرية للتحديات المطروحة دون الوقوع في التسطيح أو التكرار.`;
      case 'definitions':
        return `المفهوم المعجمي والإحصائي المتصل بـ (${q}): يُعرّف في مصادر «${book.title}» بأنه النسق الدلالي الذي ينظم العلاقات بين المتغيرات. وتشير الإحصاءات المستخلصة في الفصل الثالث إلى أن أكثر من 78% من النماذج التطبيقية تعتمد هذا النمط القياسي.`;
      case 'passages':
      default:
        return `«إن التقصي العميق في مسألة (${q}) يقودنا حتماً إلى الإقرار بأن كل صياغة إبداعية إنما تستمد قوتها من وعي الكاتب بجذور المصطلح، وتطويعه لخدمة المعنى الكلي دون تكلف أو استطراد مخل.»`;
    }
  };

  // Card Action handlers
  const handleAcceptResult = (id: string) => {
    setResults((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === 'accepted' ? 'pending' : 'accepted' } : r
      )
    );
  };

  const handleSaveEditResult = (id: string, newText: string) => {
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, text: newText, status: 'edited' } : r))
    );
  };

  // Filtered results
  const filteredResults = results.filter((r) => {
    const matchesStatus =
      activeFilter === 'all' ||
      (activeFilter === 'accepted' && r.status === 'accepted') ||
      (activeFilter === 'pending' && r.status === 'pending');

    const matchesType = selectedTypeFilter === 'all' || r.type === selectedTypeFilter;

    return matchesStatus && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 font-cairo">
      
      {/* Engine Header & Introduction */}
      <div className="text-center max-w-2xl mx-auto space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>محرك الاستخراج الدلالي الذكي لـ katib_app</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
          استخراج الموضوعات والأفكار من الكتب
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-tajawal leading-relaxed">
          ابحث في أعماق مكتبتك بالمعنى والسياق؛ واستخرج الاقتباسات الموثقة والملخصات التحليلية مع أرقام الصفحات الأصلية لإثراء مشاريع كتبك.
        </p>
      </div>

      {/* Main Search & Extraction Controller Card */}
      <div 
        id="semantic-search-controller"
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-4 sm:p-7 space-y-5"
      >
        
        {/* Topic Input Field (TextField) */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mb-2">
            الموضوع أو السؤال المراد استخراجه
          </label>
          <div className="relative flex items-center">
            <input
              id="semantic-query-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartExtraction()}
              placeholder="اكتب فكرة، أو تساؤلاً، أو مفهوماً (مثال: هندسة المكان، التحول الرقمي، Clean Architecture)..."
              className="w-full pl-28 pr-11 py-3.5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-850 text-stone-900 dark:text-stone-100 placeholder-stone-400 text-sm font-tajawal outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
              dir="rtl"
            />
            <Search className="w-5 h-5 text-stone-400 absolute right-3.5 pointer-events-none" />

            {/* Quick Action inside Input */}
            <div className="absolute left-2.5">
              <button
                id="start-extraction-btn"
                onClick={handleStartExtraction}
                disabled={!query.trim() || isProcessing}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>بدء الاستخراج</span>
              </button>
            </div>
          </div>
        </div>

        {/* Suggested Quick Topics */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-tajawal">
          <span className="text-stone-400 font-cairo text-[11px] font-bold">مواضيع مقترحة:</span>
          {SUGGESTED_TOPICS.map((topic, i) => (
            <button
              key={i}
              onClick={() => setQuery(topic)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-300 border border-stone-200 dark:border-stone-700 transition-colors text-[11px]"
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Extraction Settings Grid: Type & Source Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone-100 dark:border-stone-800/80">
          
          {/* Extraction Type Selector (قائمة نوع الاستخراج) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              نوع الاستخراج المستهدف
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXTRACTION_TYPES.map((type) => {
                const isSelected = extractionType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setExtractionType(type.id)}
                    className={`p-2.5 rounded-xl border text-right transition-all select-none ${
                      isSelected
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-600 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                        : 'bg-white dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300'
                    }`}
                  >
                    <div className="text-xs font-cairo truncate">{type.label}</div>
                    <div className="text-[10px] font-tajawal text-stone-400 dark:text-stone-500 mt-0.5 truncate">
                      {type.badge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source Selector (زر اختيار المصادر: كتاب واحد أو كتب متعددة) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              مصادر الاستخراج من المكتبة
            </label>
            <div className="p-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Library className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-cairo font-bold text-stone-800 dark:text-stone-200">
                    تم تحديد {selectedBookIds.length} من {books.length} كتب
                  </div>
                  <div className="text-[11px] font-tajawal text-stone-500 dark:text-stone-400">
                    {selectedBookIds.length === books.length
                      ? 'البحث في جميع كتب المكتبة'
                      : 'البحث في كتب محددة فقط'}
                  </div>
                </div>
              </div>

              <button
                id="select-sources-btn"
                onClick={() => setIsSourceModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-cairo font-bold text-stone-700 dark:text-stone-200 transition-colors"
              >
                تغيير المصادر...
              </button>
            </div>
          </div>

        </div>

        {/* Progress Indicator with Cancel Button (LinearProgressIndicator أثناء المعالجة) */}
        {isProcessing && (
          <div 
            id="extraction-progress-indicator"
            className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/40 dark:border-amber-700/40 space-y-2.5 animate-fadeIn"
          >
            <div className="flex items-center justify-between text-xs font-cairo">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{processingStage}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  %{progressValue}
                </span>
                <button
                  onClick={handleCancelExtraction}
                  className="px-2.5 py-1 rounded-lg bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 text-stone-700 dark:text-stone-300 text-[11px] font-bold transition-colors"
                >
                  إلغاء المعالجة
                </button>
              </div>
            </div>

            {/* Simulated LinearProgressIndicator */}
            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>
        )}

      </div>

      {/* Results Header, Filters & Result List View (قائمة النتائج) */}
      <div className="space-y-4">
        
        {/* Results Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200 dark:border-stone-800">
          
          <div className="flex items-center gap-2">
            <h2 className="font-cairo font-black text-lg text-stone-900 dark:text-stone-100">
              نتائج الاستخراج والتحليل
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold font-cairo">
              {filteredResults.length}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center flex-wrap gap-2 text-xs font-cairo">
            
            {/* Status Filters */}
            <div className="inline-flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1 border border-stone-200 dark:border-stone-700">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                  activeFilter === 'all'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setActiveFilter('accepted')}
                className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                  activeFilter === 'accepted'
                    ? 'bg-white dark:bg-stone-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                المقبولة والمحفوظة
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                  activeFilter === 'pending'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                قيد المراجعة
              </button>
            </div>

            {/* Type Filter dropdown */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-cairo outline-none"
            >
              <option value="all">جميع الأنواع</option>
              <option value="passages">نصوص أصلية</option>
              <option value="summary">ملخصات تركيبية</option>
              <option value="comparison">مقارنات</option>
              <option value="qa">إجابات أسئلة</option>
              <option value="definitions">تعريفات وإحصاءات</option>
            </select>

          </div>

        </div>

        {/* Results List View (قائمة النتائج) */}
        {filteredResults.length > 0 ? (
          <div id="results-list-view" className="space-y-4">
            {filteredResults.map((result) => (
              <ExtractedCard
                key={result.id}
                result={result}
                onAccept={handleAcceptResult}
                onSaveEdit={handleSaveEditResult}
                onViewOriginal={(res) => setOriginalPageResult(res)}
                onAddToProject={(res) => setProjectAddResult(res)}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 bg-white/40 dark:bg-stone-900/40 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <div className="font-cairo font-bold text-stone-800 dark:text-stone-200">
              لا توجد نتائج تطابق المعايير الحالية
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal max-w-sm mx-auto">
              جرب البحث عن موضوع مختلف، أو توسيع قائمة المصادر المحددة من المكتبة، أو تبديل مرشحات الحالة.
            </p>
          </div>
        )}

      </div>

      {/* Modal: Source Selection */}
      <SourceSelectionModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        books={books}
        selectedBookIds={selectedBookIds}
        onToggleBook={(id) => {
          setSelectedBookIds((prev) =>
            prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
          );
        }}
        onSelectAll={() => setSelectedBookIds(books.map((b) => b.id))}
        onDeselectAll={() => setSelectedBookIds([])}
      />

      {/* Modal: Original Page Verification */}
      <OriginalPageModal
        result={originalPageResult}
        onClose={() => setOriginalPageResult(null)}
      />

      {/* Modal: Add directly to Book Project */}
      <AddToProjectModal
        isOpen={!!projectAddResult}
        result={projectAddResult}
        books={books}
        onClose={() => setProjectAddResult(null)}
        onAppendToBook={onAppendToBook}
      />

    </div>
  );
};
