import React, { useState } from 'react';
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
  Code2
} from 'lucide-react';
import { EmotionProfile, StyleAnalysisResult } from '../types';
import { analyzeAndImproveStyle } from '../services/styleAnalysisService';

interface StyleAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle: string;
  currentText: string;
}

const AVAILABLE_EMOTIONS = [
  'غموض',
  'حماس',
  'دفء',
  'أكاديمي',
  'إلهام',
  'تشويق',
  'هدوء',
  'بلاغة رصينة',
  'حزن شجي',
  'سخرية مبطنة',
];

export const StyleAnalysisModal: React.FC<StyleAnalysisModalProps> = ({
  isOpen,
  onClose,
  chapterTitle,
  currentText,
}) => {
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(['غموض', 'تشويق']);
  const [intensityLevel, setIntensityLevel] = useState<number>(3.5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<StyleAnalysisResult | null>(null);
  const [copiedRewritten, setCopiedRewritten] = useState<boolean>(false);
  const [activeViewTab, setActiveViewTab] = useState<'analyzer' | 'flutterCode'>('analyzer');
  const [copiedFlutterCode, setCopiedFlutterCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion]
    );
  };

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    try {
      const profile: EmotionProfile = {
        selectedEmotions: selectedEmotions.length > 0 ? selectedEmotions : ['رصانة أدبية'],
        intensityLevel,
      };
      const result = await analyzeAndImproveStyle(currentText, profile);
      setAnalysisResult(result);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyRewritten = () => {
    if (analysisResult?.rewrittenText) {
      navigator.clipboard.writeText(analysisResult.rewrittenText);
      setCopiedRewritten(true);
      setTimeout(() => setCopiedRewritten(false), 2000);
    }
  };

  const flutterDartCode = `// ============================================================================
// خدمة هندسة المشاعر والأسلوب وموديلات البيانات (Clean Architecture)
// package: google_generative_ai: ^0.4.6
// ============================================================================

// 1. موديل EmotionProfile
class EmotionProfile extends Equatable {
  final List<String> selectedEmotions; // مثل: غموض، حماس، دفء، أكاديمي، إلهام
  final double intensityLevel;         // من 1 إلى 5

  const EmotionProfile({
    required this.selectedEmotions,
    this.intensityLevel = 3.0,
  });

  Map<String, dynamic> toJson() => {
    'selectedEmotions': selectedEmotions,
    'intensityLevel': intensityLevel,
  };

  factory EmotionProfile.fromJson(Map<String, dynamic> json) => EmotionProfile(
    selectedEmotions: List<String>.from(json['selectedEmotions'] ?? ['رصانة']),
    intensityLevel: (json['intensityLevel'] as num?)?.toDouble() ?? 3.0,
  );

  @override
  List<Object?> get props => [selectedEmotions, intensityLevel];
}

// 2. موديل StyleAnalysisResult
class StyleAnalysisResult extends Equatable {
  final double complianceScore; // نسبة التوافق من 0 إلى 100%
  final List<String> suggestions; // اقتراحات التحسين
  final String rewrittenText;    // النص المقترح المعدل دون استبدال النص الأصلي
  final String? analysisNotes;

  const StyleAnalysisResult({
    required this.complianceScore,
    required this.suggestions,
    required this.rewrittenText,
    this.analysisNotes,
  });

  factory StyleAnalysisResult.fromJson(Map<String, dynamic> json) => StyleAnalysisResult(
    complianceScore: (json['complianceScore'] as num?)?.toDouble() ?? 0.0,
    suggestions: List<String>.from(json['suggestions'] ?? []),
    rewrittenText: json['rewrittenText'] as String? ?? '',
    analysisNotes: json['analysisNotes'] as String?,
  );

  @override
  List<Object?> get props => [complianceScore, suggestions, rewrittenText, analysisNotes];
}

// 3. خدمة StyleAnalysisService المتصلة بـ Gemini API
class StyleAnalysisService {
  final GenerativeModel _model;

  StyleAnalysisService({required String apiKey})
      : _model = GenerativeModel(
          model: 'gemini-3.8-flash',
          apiKey: apiKey,
          generationConfig: GenerationConfig(
            responseMimeType: 'application/json',
            temperature: 0.7,
          ),
        );

  Future<StyleAnalysisResult> analyzeAndImproveStyle({
    required String text,
    required EmotionProfile emotionProfile,
  }) async {
    final prompt = '''
أنت ناقد أدبي وخبير بلاغة ولغويات عربي متخصص في علم المعاني والبيان والبديع وتحليل الأسلوبية (Stylistics).
المهمة: تحليل النص العربي التالي دلالياً وبلاغياً، ومقارنته بالملف الانفعالي المستهدف، وإرجاع نتيجة التحليل والاقتراحات دون تطبيق أي تعديل تلقائي مستبدل للنص الأصلي.

[النص الأصلي]: """\$text"""
[المشاعر المستهدفة]: \${emotionProfile.selectedEmotions.join('، ')} (الكثافة: \${emotionProfile.intensityLevel} من 5)

[التعليمات]:
1. تحليل النص العربي دلالياً وبلاغياً (المعجم، التركيب، الصور البيانية، الإيقاع).
2. حساب نسبة التوافق complianceScore (0-100%).
3. تقديم قائمة suggestions باقتراحات التحسين.
4. صياغة نص مقترح معدل rewrittenText يحاكي المشاعر المطلوبة دون المساس بفكرة النص.
5. ضابط حاسم: لا تقم بأي تعديل تلقائي مستبدل للنص الأصلي.
''';

    final response = await _model.generateContent([Content.text(prompt)]);
    final jsonMap = jsonDecode(response.text ?? '{}') as Map<String, dynamic>;
    return StyleAnalysisResult.fromJson(jsonMap);
  }
}`;

  const handleCopyFlutterCode = () => {
    navigator.clipboard.writeText(flutterDartCode);
    setCopiedFlutterCode(true);
    setTimeout(() => setCopiedFlutterCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs font-cairo">
      <div 
        dir="rtl"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  هندسة المشاعر والأسلوب البلاغي
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800/60">
                  StyleAnalysisService • Gemini
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                تحليل النص العربي دلالياً وبلاغياً واقتراح تحسينات دون استبدال النص الأصلي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Interactive Analyzer vs Flutter Code */}
            <div className="flex items-center bg-stone-200/70 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveViewTab('analyzer')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeViewTab === 'analyzer'
                    ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>التحليل الحي</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveViewTab('flutterCode')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeViewTab === 'flutterCode'
                    ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>كود Flutter (Dart)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeViewTab === 'flutterCode' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700 text-xs">
                <div>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    كود Flutter الكامل: EmotionProfile و StyleAnalysisResult و StyleAnalysisService
                  </span>
                  <p className="text-[11px] text-stone-500 font-tajawal mt-0.5">
                    متوافق مع حزمة google_generative_ai ونموذج gemini-3.8-flash
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyFlutterCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer"
                >
                  {copiedFlutterCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFlutterCode ? 'تم النسخ!' : 'نسخ كود Dart'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-stone-900 text-amber-200 font-mono text-xs overflow-auto max-h-[520px] leading-relaxed border border-stone-800" dir="ltr">
                {flutterDartCode}
              </pre>
            </div>
          ) : (
            <>
          {/* Chapter Context Banner */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs">
            <span className="text-amber-900 dark:text-amber-300 font-bold">
              الفصل المستهدف: <span className="underline">{chapterTitle || 'الفصل الحالي'}</span>
            </span>
            <span className="text-stone-500 dark:text-stone-400 font-tajawal">
              عدد الكلمات: {currentText.split(/\s+/).filter(Boolean).length} كلمة
            </span>
          </div>

          {/* 1. EmotionProfile Configuration */}
          <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                <span>المشاعر والنبرة المستهدفة (selectedEmotions):</span>
              </label>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                اختر نبرة واحدة أو أكثر لضبط التوجه البلاغي
              </span>
            </div>

            {/* Tags Grid */}
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EMOTIONS.map((emotion) => {
                const isSelected = selectedEmotions.includes(emotion);
                return (
                  <button
                    key={emotion}
                    type="button"
                    onClick={() => toggleEmotion(emotion)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30 border border-amber-600'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{emotion}</span>
                  </button>
                );
              })}
            </div>

            {/* Intensity Level Slider */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-600" />
                  <span>درجة الكثافة الانفعالية (intensityLevel):</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-mono font-bold text-sm">
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
                className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />

              <div className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400 font-tajawal">
                <span>1.0 إيحاء خافت وهادئ</span>
                <span>3.0 متوازن ومعتدل</span>
                <span>5.0 انفعال درامي ذروي</span>
              </div>
            </div>

            {/* Run Analysis Action Button */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-sm shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري التحليل الدلالي والبلاغي...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>تحليل الأسلوب والمشاعر عبر Gemini</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Analysis Results Section (StyleAnalysisResult) */}
          {analysisResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Compliance Score Gauge */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-lg font-mono border border-emerald-300 dark:border-emerald-800">
                    {Math.round(analysisResult.complianceScore)}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        نسبة التوافق الأسلوبي (complianceScore)
                      </span>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                      {analysisResult.analysisNotes || 'مطابقة جيدة جداً للمشاعر المستهدفة مع إمكانية إثراء الصور البيانية.'}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-48 bg-stone-200 dark:bg-stone-700 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, analysisResult.complianceScore))}%` }}
                  />
                </div>
              </div>

              {/* Suggestions List (suggestions) */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 space-y-2.5">
                <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>اقتراحات التحسين البلاغي والدلالي (suggestions):</span>
                </h3>
                <ul className="space-y-2 text-xs text-stone-700 dark:text-stone-300 font-tajawal">
                  {analysisResult.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-white dark:bg-stone-900/60 p-2.5 rounded-lg border border-stone-200/70 dark:border-stone-800">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Rewritten Text Proposal (rewrittenText) */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-amber-600" />
                    <span>النص المقترح المعدل (rewrittenText - للاطلاع والمقارنة):</span>
                  </h3>
                  <button
                    onClick={handleCopyRewritten}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-xs font-bold transition-all"
                  >
                    {copiedRewritten ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم النسخ للحافظة</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-500" />
                        <span>نسخ المقترح</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-amber-200/80 dark:border-amber-900/40 text-sm leading-relaxed text-stone-800 dark:text-stone-200 font-cairo">
                  {analysisResult.rewrittenText}
                </div>

                {/* Safety Guarantee Notice */}
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-tajawal bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    ضمان حرية الكاتب: لا يتم تطبيق هذا النص المقترح تلقائياً بدلاً من نصك الأصلي، بل يظل متاحاً كمرجع للمقارنة والاستلهام.
                  </span>
                </div>
              </div>
            </div>
          )}
          </>
        )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between">
          <div className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
            تكامل Gemini 3.8 Flash • تحليل دلالي وبلاغي أصيل
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
