import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Trash2,
  RefreshCw,
  Plus,
  ArrowRight,
  Code2,
  FileText,
  AlignRight,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  X,
  Layers,
  ChevronDown
} from 'lucide-react';
import { 
  InAppAssistantService, 
  AssistantMessage, 
  InlineSuggestionResult, 
  ProofreadingError, 
  SuggestionMode 
} from '../services/inAppAssistantService';

interface InAppAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  currentText: string;
  selectedText?: string;
  onApplyText: (newText: string) => void;
  onInsertSnippet: (snippet: string) => void;
}

export const InAppAssistantModal: React.FC<InAppAssistantModalProps> = ({
  isOpen,
  onClose,
  projectId,
  chapterId,
  chapterTitle,
  currentText,
  selectedText,
  onApplyText,
  onInsertSnippet,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'chat' | 'code'>('quick');
  const [selectedQuickMode, setSelectedQuickMode] = useState<SuggestionMode>('autocomplete');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<InlineSuggestionResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Chat session state
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Load local session messages on open
  useEffect(() => {
    if (isOpen) {
      const msgs = InAppAssistantService.getSessionMessages(projectId, chapterId);
      setChatMessages(msgs);
    }
  }, [isOpen, projectId, chapterId]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isSendingChat]);

  if (!isOpen) return null;

  // Trigger quick suggestion via InAppAssistantService
  const handleTriggerQuickAction = async (mode: SuggestionMode) => {
    setSelectedQuickMode(mode);
    setIsLoading(true);
    setLastResult(null);

    try {
      const result = await InAppAssistantService.getInlineSuggestions({
        currentText,
        selectedText,
        chapterId,
        mode,
      });
      setLastResult(result);

      // Auto-save to session messages
      let summaryText = '';
      if (mode === 'autocomplete' && result.suggestions) {
        summaryText = `مقترحات إكمال الفقرة:\n• ${result.suggestions.join('\n• ')}`;
      } else if (mode === 'summary' && result.summary) {
        summaryText = `ملخص الفصل: ${result.summary}`;
      } else if (mode === 'proofread') {
        summaryText = result.overallFeedback || 'تم التدقيق الإملائي والنحوي بنجاح.';
      }

      if (summaryText) {
        const aiMessage: AssistantMessage = {
          id: `msg_ai_${Date.now()}`,
          sender: 'ai',
          text: summaryText,
          timestamp: new Date().toISOString(),
          relatedChapterId: chapterId,
          suggestionType: mode,
          metadata: {
            suggestions: result.suggestions,
            summary: result.summary,
            keyPoints: result.keyPoints,
            errors: result.errors,
            correctedText: result.correctedText,
            score: result.score,
          }
        };
        InAppAssistantService.saveMessage(projectId, aiMessage);
        setChatMessages(prev => [...prev, aiMessage]);
      }
    } catch (e) {
      console.error('Quick action failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Send chat message
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = chatInput.trim();
    if (!query || isSendingChat) return;

    setChatInput('');
    const userMessage: AssistantMessage = {
      id: `msg_usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString(),
      relatedChapterId: chapterId,
      suggestionType: 'chat'
    };

    InAppAssistantService.saveMessage(projectId, userMessage);
    setChatMessages(prev => [...prev, userMessage]);
    setIsSendingChat(true);

    try {
      const result = await InAppAssistantService.getInlineSuggestions({
        currentText,
        selectedText,
        chapterId,
        mode: 'chat',
        userPrompt: query,
      });

      const replyText = result.reply || result.overallFeedback || 'أنا هنا لمساعدتك في كتابة ومراجعة كتابك خطوة بخطوة.';
      const aiReply: AssistantMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toISOString(),
        relatedChapterId: chapterId,
        suggestionType: 'chat'
      };

      InAppAssistantService.saveMessage(projectId, aiReply);
      setChatMessages(prev => [...prev, aiReply]);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Clear chat session
  const handleClearChatSession = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح سجل محادثات المساعد لجلسة هذا المشروع؟')) {
      InAppAssistantService.clearSession(projectId);
      setChatMessages(InAppAssistantService.getSessionMessages(projectId, chapterId));
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Replace single error
  const handleReplaceError = (err: ProofreadingError) => {
    if (!err.errorText || !err.suggestion) return;
    const regex = new RegExp(err.errorText, 'g');
    const newText = currentText.replace(regex, err.suggestion);
    onApplyText(newText);
  };

  // Replace all errors
  const handleApplyAllCorrections = () => {
    if (lastResult?.correctedText) {
      onApplyText(lastResult.correctedText);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs font-cairo">
      <div 
        dir="rtl"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  المساعد التفاعلي والتدقيق اللغوي
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                  InAppAssistantService
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                الفصل الحالي: <span className="font-semibold text-stone-700 dark:text-stone-300">«{chapterTitle}»</span>
                {selectedText && (
                  <span className="mr-2 text-amber-600 dark:text-amber-400 font-medium">
                    (تم تحديد {selectedText.split(/\s+/).filter(Boolean).length} كلمة)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/40 px-6 gap-2">
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'quick'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-stone-800/60 rounded-t-xl'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>الخيارات السريعة والتدقيق</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'chat'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-stone-800/60 rounded-t-xl'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>محادثة الجلسة ({chatMessages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'code'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-stone-800/60 rounded-t-xl'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-600" />
            <span>كود فلاتر (InAppAssistantService)</span>
          </button>
        </div>

        {/* Tab 1: Quick Actions & Proofreading */}
        {activeTab === 'quick' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Quick Action Selection Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Option 1: Auto-complete Idea */}
              <button
                onClick={() => handleTriggerQuickAction('autocomplete')}
                disabled={isLoading}
                className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  selectedQuickMode === 'autocomplete' && lastResult?.mode === 'autocomplete'
                    ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                    : 'border-stone-200 dark:border-stone-800 hover:border-amber-400 bg-stone-50 dark:bg-stone-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">Auto-complete</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    إكمال الفقرة تلقائياً
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    اقتراح مسارات وتكملات أدبية سلسة تواصل الفكرة الأخيرة ببراعة.
                  </p>
                </div>
              </button>

              {/* Option 2: Quick Chapter Summary */}
              <button
                onClick={() => handleTriggerQuickAction('summary')}
                disabled={isLoading}
                className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  selectedQuickMode === 'summary' && lastResult?.mode === 'summary'
                    ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                    : 'border-stone-200 dark:border-stone-800 hover:border-amber-400 bg-stone-50 dark:bg-stone-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">Summary</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    ملخص سريع للفصل
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    استخلاص النقاط المحورية وتكثيف أفكار الفصل في فقرة جامعة.
                  </p>
                </div>
              </button>

              {/* Option 3: Spell & Grammar Proofreading */}
              <button
                onClick={() => handleTriggerQuickAction('proofread')}
                disabled={isLoading}
                className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  selectedQuickMode === 'proofread' && lastResult?.mode === 'proofread'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                    : 'border-stone-200 dark:border-stone-800 hover:border-emerald-400 bg-stone-50 dark:bg-stone-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">Proofreading</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    التدقيق الإملائي والنحوي
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    فحص الهمزات، التاء المربوطة، الإعراب، وعلامات الترقيم وتصحيحها.
                  </p>
                </div>
              </button>

            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="p-8 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                  جارٍ الاتصال بـ Gemini API وتوليد المقترحات الذكية...
                </p>
                <p className="text-xs text-stone-400">
                  يتم فحص السياق العربي وضبط البلاغة والقواعد اللغوية
                </p>
              </div>
            )}

            {/* Results Display Area */}
            {!isLoading && lastResult && (
              <div className="space-y-4">

                {/* 1. Results for Auto-Complete Idea */}
                {lastResult.mode === 'autocomplete' && lastResult.suggestions && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold flex items-center gap-2 text-stone-800 dark:text-stone-200">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>خيارات إكمال الفقرة تلقائياً (Auto-complete idea):</span>
                      </h4>
                      {lastResult.explanation && (
                        <span className="text-xs text-stone-400">
                          {lastResult.explanation}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {lastResult.suggestions.map((snippet, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-800/40 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all space-y-3"
                        >
                          <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-200 font-tajawal pr-2 border-r-2 border-amber-500">
                            {snippet}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
                            <span className="text-xs text-stone-400">
                              خيار إكمال {idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopy(snippet, `ac_${idx}`)}
                                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-1.5"
                              >
                                {copiedId === `ac_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedId === `ac_${idx}` ? 'تم النسخ' : 'نسخ'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  onInsertSnippet(snippet);
                                  onClose();
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>إدراج في المحرر</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Results for Quick Chapter Summary */}
                {lastResult.mode === 'summary' && lastResult.summary && (
                  <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-800/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          ملخص سريع للفصل (Quick Summary)
                        </h4>
                      </div>
                      <button
                        onClick={() => handleCopy(lastResult.summary!, 'sum_copy')}
                        className="px-3 py-1 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-1.5"
                      >
                        {copiedId === 'sum_copy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === 'sum_copy' ? 'تم النسخ' : 'نسخ الملخص'}</span>
                      </button>
                    </div>

                    <p className="text-sm sm:text-base leading-relaxed text-stone-800 dark:text-stone-200 font-tajawal bg-white dark:bg-stone-900/60 p-4 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                      {lastResult.summary}
                    </p>

                    {lastResult.keyPoints && lastResult.keyPoints.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h5 className="text-xs font-bold text-stone-600 dark:text-stone-400">
                          النقاط المحورية المستخلصة:
                        </h5>
                        <ul className="space-y-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-tajawal">
                          {lastResult.keyPoints.map((pt, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Results for Spell & Grammar Proofreading */}
                {lastResult.mode === 'proofread' && (
                  <div className="space-y-4">
                    {/* Overall Summary Bar */}
                    <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <h4 className="font-bold text-sm">
                            نتيجة التدقيق اللغوي والنحوي
                          </h4>
                          {lastResult.score && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                              نسبة السلامة: {lastResult.score}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          {lastResult.overallFeedback || 'تم الفحص ومطابقة القواعد.'}
                        </p>
                      </div>

                      {lastResult.correctedText && (
                        <button
                          onClick={handleApplyAllCorrections}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors self-start sm:self-auto"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تطبيق كافة التصحيحات في النص</span>
                        </button>
                      )}
                    </div>

                    {/* Errors List */}
                    {lastResult.errors && lastResult.errors.length > 0 ? (
                      <div className="space-y-2.5">
                        <h5 className="text-xs font-bold text-stone-600 dark:text-stone-400">
                          قائمة الملاحظات والأخطاء المرصودة ({lastResult.errors.length}):
                        </h5>

                        {lastResult.errors.map((err, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 flex items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="line-through text-red-600 dark:text-red-400 font-bold text-sm">
                                  {err.errorText}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-stone-400 rtl:rotate-180" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                  {err.suggestion}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                                  {err.type === 'spelling' ? 'إملاء' : err.type === 'grammar' ? 'نحو' : err.type === 'punctuation' ? 'ترقيم' : 'أسلوب'}
                                </span>
                              </div>
                              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                                {err.explanation}
                              </p>
                            </div>

                            <button
                              onClick={() => handleReplaceError(err)}
                              className="shrink-0 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors"
                            >
                              استبدال
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-stone-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="text-sm font-semibold">لم يتم رصد أي أخطاء لغوية أو ترقيمية بارزة!</p>
                        <p className="text-xs text-stone-400 mt-1">النص يتميز بسلامة التركيب والرسم الإملائي السليم.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Initial Guidance Card when no quick result yet */}
            {!isLoading && !lastResult && (
              <div className="p-8 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-center text-stone-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-60" />
                <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300">
                  اختر أحد الخيارات السريعة أعلاه للبدء
                </h4>
                <p className="text-xs mt-1 max-w-md mx-auto leading-relaxed">
                  يقوم المساعد التفاعلي بقراءة سياق الفصل الحالي واستدعاء Gemini API لتقديم إكمال فوري للأفكار، تلخيص شامل، أو تدقيق نحوي وإملائي دقيق.
                </p>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Chat & Local Session Persistence */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Session Management Bar */}
            <div className="px-6 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>المحادثات محفوظة محلياً ضمن جلسة المشروع (Session Storage)</span>
              </span>
              <button
                onClick={handleClearChatSession}
                className="hover:text-red-500 flex items-center gap-1 transition-colors text-stone-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح سجل الجلسة</span>
              </button>
            </div>

            {/* Chat Messages List */}
            <div 
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-amber-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-bl-xs border border-stone-200/80 dark:border-stone-700/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1 text-[11px] opacity-75">
                        <span className="font-bold">
                          {isUser ? 'أنت' : 'مساعد كاتب الذكي'}
                        </span>
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="font-tajawal whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}

              {isSendingChat && (
                <div className="flex items-center gap-2 text-xs text-stone-400 p-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>المساعد الذكي يفكر ويكتب الرد...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <form 
              onSubmit={handleSendChat}
              className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="اسأل المساعد عن الحبكة، صياغة جملة، أو استشارة لغوية..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm focus:outline-hidden focus:border-amber-500 font-cairo"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingChat}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>إرسال</span>
                <Send className="w-4 h-4 rtl:rotate-180" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Flutter Code Viewer */}
        {activeTab === 'code' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold">معمارية فلاتر للمساعد التفاعلي (Clean Architecture):</p>
              <p>
                - الكيان: <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">lib/features/assistant/domain/entities/assistant_message.dart</code>
              </p>
              <p>
                - الخدمة: <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">lib/features/assistant/data/services/in_app_assistant_service.dart</code>
              </p>
              <p>
                - الواجهة: <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">lib/features/assistant/presentation/widgets/in_app_assistant_sheet.dart</code>
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-mono">in_app_assistant_service.dart</span>
                <button
                  onClick={() => handleCopy(`// كود خدمة InAppAssistantService في فلاتر\n...`, 'dart_code')}
                  className="flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الكود</span>
                </button>
              </div>

              <pre 
                dir="ltr"
                className="p-4 rounded-2xl bg-stone-950 text-stone-200 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800"
              >
{`/// خدمة المساعد التفاعلي والتدقيق اللغوي InAppAssistantService
/// متصلة بـ Gemini API وتدعم:
/// 1. إكمال الفقرة تلقائياً (Auto-complete idea)
/// 2. إعطاء ملخص سريع للفصل (Chapter Summary)
/// 3. التدقيق الإملائي والنحوي مع إرجاع قائمة بالأخطاء والبدائل
/// 4. حفظ محادثات المساعد محلياً ضمن جلسة العمل الخاصة بالمشروع

class InAppAssistantService {
  final GenerativeModel? _model;
  
  Future<InlineSuggestionsResult> getInlineSuggestions({
    required String currentText,
    String? selectedText,
    String? chapterId,
    required SuggestionMode mode,
  }) async {
    // الاتصال بـ Gemini API وإرجاع النتائج بصيغة JSON مهيكلة
    ...
  }

  Future<void> saveSessionMessage({
    required String projectId,
    required AssistantMessage message,
  }) async {
    // حفظ المحادثة محلياً في SharedPreferences / Hive
    ...
  }
}`}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
