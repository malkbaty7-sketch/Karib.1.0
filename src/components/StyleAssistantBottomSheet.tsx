import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  X, 
  Sliders, 
  CheckCircle2, 
  Copy, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Flame, 
  TrendingUp, 
  Lightbulb, 
  Wand2,
  Code2,
  Columns,
  Split,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRight,
  Maximize2,
  Minimize2,
  Eye,
  FileText
} from 'lucide-react';
import { EmotionProfile, StyleAnalysisResult } from '../types';
import { analyzeAndImproveStyle } from '../services/styleAnalysisService';

interface StyleAssistantBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle: string;
  currentText: string;
  onApplyRevision?: (revisedText: string) => void;
}

const AVAILABLE_EMOTIONS = [
  { name: 'دفء', desc: 'ألفة وطمأنينة وحميمية' },
  { name: 'غموض', desc: 'تشويق وحذف وإيحاء موارب' },
  { name: 'حماس', desc: 'اندفاع وحيوية وأفعال مضارعة' },
  { name: 'أكاديمي', desc: 'رصانة واستدلال وبرهان منطقي' },
  { name: 'إلهام', desc: 'أمل وتفاؤل وبلاغة وجدانية' },
  { name: 'تشويق', desc: 'تسارع وتيرة وتأجيل الإفصاح' },
  { name: 'هدوء', desc: 'سكينة وجمل اسمية متزنة' },
  { name: 'بلاغة رصينة', desc: 'فصاحة لغوية وتناغم بديعي' },
];

interface DiffToken {
  type: 'unchanged' | 'added' | 'removed';
  value: string;
}

// دالة احتساب الفروقات النصية البسيطة والذكية بالكلمات (Diff Algorithm)
function computeSimpleWordDiff(original: string, modified: string): { originalTokens: DiffToken[]; modifiedTokens: DiffToken[] } {
  const origWords = (original || '').split(/\s+/).filter(Boolean);
  const modWords = (modified || '').split(/\s+/).filter(Boolean);

  const origSet = new Set(origWords);
  const modSet = new Set(modWords);

  const originalTokens: DiffToken[] = origWords.map(w => ({
    value: w,
    type: modSet.has(w) ? 'unchanged' : 'removed'
  }));

  const modifiedTokens: DiffToken[] = modWords.map(w => ({
    value: w,
    type: origSet.has(w) ? 'unchanged' : 'added'
  }));

  return { originalTokens, modifiedTokens };
}

export const StyleAssistantBottomSheet: React.FC<StyleAssistantBottomSheetProps> = ({
  isOpen,
  onClose,
  chapterTitle,
  currentText,
  onApplyRevision,
}) => {
  // المشاعر المختارة
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(['غموض', 'حماس']);
  const [intensityLevel, setIntensityLevel] = useState<number>(3.5);
  
  // حالة المعالجة ومؤشر التقدم
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<StyleAnalysisResult | null>(null);
  
  // وضع العرض (مقارنة جنباً إلى جنب Side-by-Side، أو الفروقات المدمجة Diff View)
  const [comparisonMode, setComparisonMode] = useState<'sideBySide' | 'diffView'>('sideBySide');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'assistant' | 'flutterCode'>('assistant');

  // نسخ وإشعارات
  const [copiedRewritten, setCopiedRewritten] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  // تبديل اختيار شريحة المشاعر (Chip)
  const toggleEmotion = (emotionName: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotionName)
        ? prev.filter((e) => e !== emotionName)
        : [...prev, emotionName]
    );
  };

  // تنفيذ فحص وتحسين الأسلوب
  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setAppliedSuccess(false);
    try {
      const profile: EmotionProfile = {
        selectedEmotions: selectedEmotions.length > 0 ? selectedEmotions : ['رصانة أدبية'],
        intensityLevel,
      };
      const result = await analyzeAndImproveStyle(currentText, profile);
      setAnalysisResult(result);
    } catch (err) {
      console.error('Style analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. قبول وتطبيق التعديل (يستبدل النص في المحرر)
  const handleAcceptAndApply = () => {
    if (analysisResult?.rewrittenText && onApplyRevision) {
      onApplyRevision(analysisResult.rewrittenText);
      setAppliedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  // 2. رفض الاقتراح (يتجاهل الاقتراح ويحفظ النص الأصلي)
  const handleReject = () => {
    setAnalysisResult(null);
    onClose();
  };

  // 3. نسخ النص المقترح
  const handleCopyRewritten = () => {
    if (analysisResult?.rewrittenText) {
      navigator.clipboard.writeText(analysisResult.rewrittenText);
      setCopiedRewritten(true);
      setTimeout(() => setCopiedRewritten(false), 2000);
    }
  };

  // احتساب الفروقات لعرض Diff View الهادئ
  const diffData = useMemo(() => {
    if (!analysisResult?.rewrittenText) return null;
    return computeSimpleWordDiff(currentText, analysisResult.rewrittenText);
  }, [currentText, analysisResult?.rewrittenText]);

  // كود Flutter المصاحب للخدمة والشاشة
  const flutterCodeSnippet = `// ============================================================================
// StyleAssistantBottomSheet في فلاتر (Katib App)
// يستخدم google_generative_ai مع رقائق المشاعر ومقارنة Side-by-Side
// ============================================================================

import 'package:flutter/material.dart';
import '../../domain/entities/emotion_profile.dart';
import '../../domain/entities/style_analysis_result.dart';
import '../../data/services/style_analysis_service.dart';

class StyleAssistantBottomSheet extends StatefulWidget {
  final String currentText;
  final ValueChanged<String> onApplyRevision;

  const StyleAssistantBottomSheet({
    Key? key,
    required this.currentText,
    required this.onApplyRevision,
  }) : super(key: key);

  static Future<void> show(
    BuildContext context, {
    required String currentText,
    required ValueChanged<String> onApplyRevision,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StyleAssistantBottomSheet(
        currentText: currentText,
        onApplyRevision: onApplyRevision,
      ),
    );
  }

  @override
  State<StyleAssistantBottomSheet> createState() => _StyleAssistantBottomSheetState();
}

class _StyleAssistantBottomSheetState extends State<StyleAssistantBottomSheet> {
  final List<String> _availableEmotions = ['دفء', 'غموض', 'حماس', 'أكاديمي', 'إلهام'];
  final List<String> _selectedEmotions = ['غموض', 'حماس'];
  double _intensityLevel = 3.5;
  bool _isLoading = false;
  StyleAnalysisResult? _analysisResult;

  void _analyzeStyle() async {
    setState(() => _isLoading = true);
    final service = StyleAnalysisService(apiKey: 'YOUR_GEMINI_KEY');
    final result = await service.analyzeAndImproveStyle(
      text: widget.currentText,
      emotionProfile: EmotionProfile(
        selectedEmotions: _selectedEmotions,
        intensityLevel: _intensityLevel,
      ),
    );
    setState(() {
      _isLoading = false;
      _analysisResult = result;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // مقبض السحب (Drag Handle)
          Container(margin: const EdgeInsets.all(10), width: 40, height: 4, color: Colors.grey[300]),
          
          // رقائق اختيار المشاعر (Chips)
          Wrap(
            spacing: 8,
            children: _availableEmotions.map((e) => FilterChip(
              label: Text(e),
              selected: _selectedEmotions.contains(e),
              onSelected: (val) => setState(() => val ? _selectedEmotions.add(e) : _selectedEmotions.remove(e)),
            )).toList(),
          ),

          // شريط التقدم أثناء الفحص
          if (_isLoading) const LinearProgressIndicator(color: Color(0xFFD97706)),

          // مقارنة النص Side-by-Side وأزرار اتخاذ القرار (قبول / رفض / نسخ)
          // ...
        ],
      ),
    );
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/70 backdrop-blur-xs font-cairo">
      
      {/* Bottom Sheet Container with Responsive Slide-up and Fullscreen Expand */}
      <div 
        dir="rtl"
        className={`w-full max-w-5xl bg-white dark:bg-stone-900 shadow-2xl border-t sm:border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-6 ${
          isExpanded ? 'h-[96vh]' : 'h-[88vh] sm:h-[84vh] max-h-[900px]'
        }`}
      >
        
        {/* Top Drag Handle (Sheet Affordance) */}
        <div className="w-full flex items-center justify-center pt-2.5 pb-1 sm:hidden cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>

        {/* 1. Header Toolbar */}
        <header className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-900/90 flex items-center justify-between shrink-0">
          
          {/* Right (RTL right): Title & Badges */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                  مساعد الكتابة والأسلوب
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/60 font-mono">
                  StyleAssistantBottomSheet
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-tajawal hidden sm:block">
                ضبط المشاعر، الفحص الدلالي، ومقارنة النص جنباً إلى جنب مع إمكانية التطبيق المباشر
              </p>
            </div>
          </div>

          {/* Left (RTL left): Controls and Tab Switcher */}
          <div className="flex items-center gap-2">
            
            {/* View Tab Switcher */}
            <div className="flex items-center bg-stone-200/80 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('assistant')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'assistant'
                    ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>المساعد</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('flutterCode')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'flutterCode'
                    ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">كود Flutter</span>
              </button>
            </div>

            {/* Expand / Minimize Window */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors hidden sm:block"
              title={isExpanded ? 'تصغير النافذة' : 'تكبير النافذة'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

          </div>

        </header>

        {/* 2. Loading LinearProgressIndicator */}
        {isLoading && (
          <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 overflow-hidden relative shrink-0">
            <div className="h-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-400 animate-pulse w-full" />
            <div 
              className="absolute inset-0 bg-white/40 dark:bg-black/20"
              style={{
                backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.8) 50%, transparent 100%)',
                animation: 'shimmer 1.4s infinite linear'
              }}
            />
          </div>
        )}

        {/* 3. Main Body Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {activeTab === 'flutterCode' ? (
            /* ===============================================================
               عرض كود Flutter المصاحب
               =============================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs">
                <div>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    StyleAssistantBottomSheet Component • Flutter (Dart)
                  </span>
                  <p className="text-[11px] text-stone-500 font-tajawal mt-0.5">
                    تطبيق واجهة المقارنة Side-by-Side ورقائق المشاعر FilterChip في فلاتر
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(flutterCodeSnippet);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'تم النسخ!' : 'نسخ الكود'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-stone-900 text-amber-200/90 font-mono text-xs leading-relaxed overflow-auto max-h-[520px] border border-stone-800" dir="ltr">
                {flutterCodeSnippet}
              </pre>
            </div>
          ) : (
            /* ===============================================================
               واجهة المساعد التفاعلية: رقائق المشاعر + الفحص + المقارنة
               =============================================================== */
            <>
              {/* شريط معلومات الفصل المستهدف */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-amber-950 dark:text-amber-300">
                    الفصل: {chapterTitle || 'الفصل المفتوح'}
                  </span>
                </div>
                <span className="text-stone-500 dark:text-stone-400 font-tajawal text-[11px]">
                  طول النص: {currentText.split(/\s+/).filter(Boolean).length} كلمة ({currentText.length} حرف)
                </span>
              </div>

              {/* ---------------------------------------------------------------
                  أ. لوحة اختيار المشاعر (Emotion Selector)
                 --------------------------------------------------------------- */}
              <section className="bg-stone-50 dark:bg-stone-800/40 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-600" />
                    <span>لوحة اختيار المشاعر (Emotion Selector Chips):</span>
                  </label>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 font-tajawal">
                    انقر لتحديد نبرة أو أكثر تُبنى عليها المقارنة البلاغية
                  </span>
                </div>

                {/* رقائق المشاعر (Chips) التفاعلية المطلوبة */}
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_EMOTIONS.map((emotion) => {
                    const isSelected = selectedEmotions.includes(emotion.name);
                    return (
                      <button
                        key={emotion.name}
                        type="button"
                        onClick={() => toggleEmotion(emotion.name)}
                        className={`group px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30 border border-amber-600'
                            : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-400'
                        }`}
                        title={emotion.desc}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-stone-400'}`} />
                        <span>{emotion.name}</span>
                        {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>

                {/* شريط الكثافة الانفعالية وزر الفحص والتحسين */}
                <div className="pt-3 border-t border-stone-200 dark:border-stone-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Slider */}
                  <div className="flex-1 max-w-sm space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-600 dark:text-stone-400 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-amber-600" />
                        <span>الكثافة الانفعالية (intensityLevel):</span>
                      </span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                        {intensityLevel.toFixed(1)} / 5.0
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.5"
                      value={intensityLevel}
                      onChange={(e) => setIntensityLevel(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />
                  </div>

                  {/* ب. زر 'فحص وتحسين الأسلوب' مع مؤشر التقدم */}
                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    disabled={isLoading || !currentText.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جارٍ الفحص والتحسين البلاغي...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>فحص وتحسين الأسلوب</span>
                      </>
                    )}
                  </button>

                </div>

              </section>

              {/* ---------------------------------------------------------------
                  ج. واجهة مقارنة النص (Side-by-Side أو Diff View)
                 --------------------------------------------------------------- */}
              {analysisResult && (
                <section className="space-y-4 animate-in fade-in duration-300">
                  
                  {/* شريط الإحصائيات واختيار طريقة المقارنة */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800">
                    
                    {/* Compliance Score */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm font-mono border border-emerald-300 dark:border-emerald-800">
                        {Math.round(analysisResult.complianceScore)}%
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          <span>نسبة التوافق الأسلوبي (complianceScore)</span>
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <p className="text-[11px] text-stone-500 font-tajawal">
                          {analysisResult.analysisNotes || 'تحليل دلالي وبلاغي متناسق مع النبرة المطلوبة'}
                        </p>
                      </div>
                    </div>

                    {/* تبديل طريقة المقارنة (Side-by-Side vs Diff View) */}
                    <div className="flex items-center bg-stone-200/70 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold shrink-0">
                      <button
                        type="button"
                        onClick={() => setComparisonMode('sideBySide')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                          comparisonMode === 'sideBySide'
                            ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                            : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                        }`}
                      >
                        <Columns className="w-3.5 h-3.5" />
                        <span>مقارنة جنباً إلى جنب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setComparisonMode('diffView')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                          comparisonMode === 'diffView'
                            ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                            : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                        }`}
                      >
                        <Split className="w-3.5 h-3.5" />
                        <span>إبراز الفروقات (Diff)</span>
                      </button>
                    </div>

                  </div>

                  {/* 1. المقارنة جنباً إلى جنب (Side-by-Side) */}
                  {comparisonMode === 'sideBySide' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* العمود الأيمن: النص الأصلي */}
                      <div className="flex flex-col rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
                        <div className="px-4 py-2.5 bg-stone-100/80 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                          <span className="font-bold text-stone-700 dark:text-stone-300">
                            النص الأصلي للكاتب
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {currentText.split(/\s+/).filter(Boolean).length} كلمة
                          </span>
                        </div>
                        <div className="p-4 flex-1 text-xs sm:text-sm leading-relaxed text-stone-700 dark:text-stone-300 font-cairo whitespace-pre-wrap max-h-80 overflow-y-auto">
                          {currentText || '(لا يوجد نص أصلي)'}
                        </div>
                      </div>

                      {/* العمود الأيسر: النص المعدل بالذكاء الاصطناعي مع إبراز هادئ */}
                      <div className="flex flex-col rounded-2xl border-2 border-amber-500/40 bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
                        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>النص المعدل بالذكاء الاصطناعي</span>
                          </span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                            {analysisResult.rewrittenText.split(/\s+/).filter(Boolean).length} كلمة
                          </span>
                        </div>
                        <div className="p-4 flex-1 text-xs sm:text-sm leading-relaxed text-stone-800 dark:text-stone-200 font-cairo whitespace-pre-wrap max-h-80 overflow-y-auto bg-amber-50/20 dark:bg-amber-950/10">
                          {analysisResult.rewrittenText}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* 2. عرض الفروقات (Diff View): تمييز الكلمات بألوان هادئة */}
                  {comparisonMode === 'diffView' && diffData && (
                    <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
                      
                      <div className="flex items-center justify-between text-xs border-b border-stone-100 dark:border-stone-800 pb-2">
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                          معاينة الفروقات المدمجة مع إبراز التغييرات بألوان هادئة:
                        </span>
                        <div className="flex items-center gap-3 text-[11px] font-tajawal">
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-200 dark:bg-emerald-900/60 inline-block" />
                            <span>إضافات وتحسينات بلاغية</span>
                          </span>
                          <span className="flex items-center gap-1 text-stone-400">
                            <span className="w-2.5 h-2.5 rounded bg-stone-200 dark:bg-stone-700 inline-block" />
                            <span>عبارات مستبدلة</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-xs sm:text-sm leading-loose font-cairo p-3 rounded-xl bg-stone-50/50 dark:bg-stone-950/50 max-h-80 overflow-y-auto">
                        {diffData.modifiedTokens.map((token, i) => (
                          <span
                            key={i}
                            className={
                              token.type === 'added'
                                ? 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 px-1 py-0.5 rounded-sm font-semibold mx-0.5 inline-block border-b-2 border-emerald-400'
                                : 'text-stone-800 dark:text-stone-200 mx-0.5 inline-block'
                            }
                          >
                            {token.value}{' '}
                          </span>
                        ))}
                      </div>

                    </div>
                  )}

                  {/* اقتراحات التحسين البلاغي (Suggestions) */}
                  {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2">
                      <div className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span>اقتراحات التحسين الموصى بها:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {analysisResult.suggestions.map((s, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 text-xs font-tajawal text-stone-700 dark:text-stone-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </section>
              )}
            </>
          )}

        </div>

        {/* -------------------------------------------------------------------
            4. أزرار اتخاذ القرار في أسفل الواجهة (Decision Action Buttons)
           ------------------------------------------------------------------- */}
        <footer className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-tajawal">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>حرية الكاتب محفوظة بالكامل: لن يتم تعديل النص إلا بضغط زر القبول أدناه.</span>
          </div>

          <div className="flex items-center gap-2">
            
            {/* 1. زر 'رفض' (يتجاهل الاقتراح ويحفظ النص الأصلي) */}
            <button
              type="button"
              onClick={handleReject}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
            >
              رفض وإغلاق
            </button>

            {/* 2. زر 'نسخ النص المقترح' */}
            {analysisResult?.rewrittenText && (
              <button
                type="button"
                onClick={handleCopyRewritten}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copiedRewritten ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>نسخ النص المقترح</span>
                  </>
                )}
              </button>
            )}

            {/* 3. زر 'قبول وتطبيق التعديل' (يستبدل النص في المحرر) */}
            {analysisResult?.rewrittenText && (
              <button
                type="button"
                onClick={handleAcceptAndApply}
                disabled={appliedSuccess}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
              >
                {appliedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>تم تطبيق التعديل في المحرر!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>قبول وتطبيق التعديل</span>
                  </>
                )}
              </button>
            )}

          </div>

        </footer>

      </div>

    </div>
  );
};
