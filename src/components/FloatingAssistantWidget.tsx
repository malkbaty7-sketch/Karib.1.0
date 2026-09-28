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
  ChevronDown,
  Settings,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Sliders,
  Type,
  Eye,
  CheckCheck,
  Move,
  CornerDownRight,
  Sun,
  Palette,
  Volume2,
  CheckSquare
} from 'lucide-react';
import { 
  InAppAssistantService, 
  AssistantMessage, 
  InlineSuggestionResult, 
  ProofreadingError, 
  SuggestionMode,
  AssistantTheme,
  PanelPositionMode,
  FontSizeOption,
  AssistantSettings
} from '../services/inAppAssistantService';

interface FloatingAssistantWidgetProps {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  currentText: string;
  selectedText?: string;
  selectionStart?: number;
  selectionEnd?: number;
  onApplyText: (newText: string) => void;
  onInsertSnippet: (snippet: string, mode?: 'cursor' | 'replace' | 'append') => void;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
}

export const FloatingAssistantWidget: React.FC<FloatingAssistantWidgetProps> = ({
  projectId,
  chapterId,
  chapterTitle,
  currentText,
  selectedText,
  selectionStart,
  selectionEnd,
  onApplyText,
  onInsertSnippet,
  isOpen: controlledIsOpen,
  onToggleOpen,
}) => {
  // Panel open / close state (controlled or uncontrolled)
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    setInternalIsOpen(val);
    if (onToggleOpen) onToggleOpen(val);
  };

  // Draggable FAB position state
  // Default position: bottom-right (or bottom-left in RTL, nicely floating above stats)
  const [fabPosition, setFabPosition] = useState<{ x: number; y: number }>({ x: 24, y: 80 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false,
  });

  // Settings & Theme state
  const [settings, setSettings] = useState<AssistantSettings>(() => InAppAssistantService.getSettings());

  // Save settings when changed
  const updateSettings = (newPartial: Partial<AssistantSettings>) => {
    const updated = { ...settings, ...newPartial };
    setSettings(updated);
    InAppAssistantService.saveSettings(updated);
  };

  // Active view tab inside panel: 'chat' | 'quick' | 'settings' | 'code'
  const [activeTab, setActiveTab] = useState<'chat' | 'quick' | 'settings' | 'code'>('chat');

  // Chat state
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Quick actions state
  const [selectedQuickMode, setSelectedQuickMode] = useState<SuggestionMode>('autocomplete');
  const [isLoadingQuick, setIsLoadingQuick] = useState<boolean>(false);
  const [lastQuickResult, setLastQuickResult] = useState<InlineSuggestionResult | null>(null);

  // Notification / Toast state
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load chat session from local persistence
  useEffect(() => {
    const msgs = InAppAssistantService.getSessionMessages(projectId, chapterId);
    setChatMessages(msgs);
  }, [projectId, chapterId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isSendingChat, activeTab]);

  // Drag handlers for Floating Action Button
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: fabPosition.x,
      initialY: fabPosition.y,
      moved: false,
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = dragStartRef.current.startX - e.clientX; // in RTL or from right edge
    const deltaY = dragStartRef.current.startY - e.clientY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragStartRef.current.moved = true;
    }

    // Calculate bounded position from edges
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // We store offset from right & bottom
    const newX = Math.max(12, Math.min(viewportWidth - 76, dragStartRef.current.initialX + deltaX));
    const newY = Math.max(20, Math.min(viewportHeight - 76, dragStartRef.current.initialY + deltaY));

    setFabPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // If it was just a click and didn't move significantly, toggle panel
    if (!dragStartRef.current.moved) {
      setIsOpen(!isOpen);
    }
  };

  // Show temporary apply notice
  const notifyApplied = (msg: string) => {
    setAppliedNotice(msg);
    setTimeout(() => setAppliedNotice(null), 3500);
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Apply suggestion directly to editor
  const handleApplySuggestion = (textToApply: string, mode: 'cursor' | 'replace' | 'append' = 'cursor') => {
    if (!textToApply) return;
    onInsertSnippet(textToApply, mode);
    notifyApplied('تم تطبيق المقترح بنجاح في موضع المؤشر داخل محرر النصوص!');
  };

  // Send a chat message or execute preset command
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim() || isSendingChat) return;

    const userMsg: AssistantMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
      relatedChapterId: chapterId,
      suggestionType: 'chat',
    };

    const newChatList = [...chatMessages, userMsg];
    setChatMessages(newChatList);
    InAppAssistantService.saveMessage(projectId, userMsg);
    setChatInput('');
    setIsSendingChat(true);

    try {
      // Call InAppAssistantService
      const result = await InAppAssistantService.getInlineSuggestions({
        currentText,
        selectedText,
        chapterId,
        mode: 'chat',
        userPrompt: textToSend,
      });

      const replyText = result.reply || result.overallFeedback || 'تمت معالجة طلبك بنجاح.';
      const aiMsg: AssistantMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toISOString(),
        relatedChapterId: chapterId,
        suggestionType: 'chat',
        actionableSuggestion: result.actionableSuggestion || (replyText.length > 50 ? replyText : undefined),
        metadata: {
          suggestions: result.suggestions,
          summary: result.summary,
          keyPoints: result.keyPoints,
          errors: result.errors,
          correctedText: result.correctedText,
        },
      };

      setChatMessages((prev) => [...prev, aiMsg]);
      InAppAssistantService.saveMessage(projectId, aiMsg);
    } catch (e: any) {
      const errorMsg: AssistantMessage = {
        id: `ai_err_${Date.now()}`,
        sender: 'ai',
        text: 'عذراً، حدث خطأ أثناء الاتصال بالمساعد الذكي. يمكنك المحاولة مرة أخرى.',
        timestamp: new Date().toISOString(),
        relatedChapterId: chapterId,
        suggestionType: 'chat',
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Trigger quick action tab
  const handleTriggerQuickAction = async (mode: SuggestionMode) => {
    setSelectedQuickMode(mode);
    setIsLoadingQuick(true);
    setLastQuickResult(null);

    try {
      const result = await InAppAssistantService.getInlineSuggestions({
        currentText,
        selectedText,
        chapterId,
        mode,
      });
      setLastQuickResult(result);

      // Auto-save to session
      const aiMsg: AssistantMessage = {
        id: `ai_quick_${Date.now()}`,
        sender: 'ai',
        text: mode === 'autocomplete' 
          ? `مقترح إكمال الفقرة:\n${result.suggestions?.[0] || ''}` 
          : mode === 'summary' 
          ? `ملخص الفصل:\n${result.summary || ''}` 
          : `تقرير التدقيق اللغوي: تم رصد ${result.errors?.length || 0} ملاحظات.`,
        timestamp: new Date().toISOString(),
        relatedChapterId: chapterId,
        suggestionType: mode,
        actionableSuggestion: result.correctedText || result.suggestions?.[0] || result.summary,
        metadata: {
          suggestions: result.suggestions,
          summary: result.summary,
          keyPoints: result.keyPoints,
          errors: result.errors,
          correctedText: result.correctedText,
          score: result.score
        }
      };
      setChatMessages(prev => [...prev, aiMsg]);
      InAppAssistantService.saveMessage(projectId, aiMsg);
    } catch {
      // handled
    } finally {
      setIsLoadingQuick(false);
    }
  };

  // Clear chat session
  const handleClearChat = () => {
    if (window.confirm('هل تريد مسح سجل محادثات المساعد لهذا الفصل؟')) {
      InAppAssistantService.clearSession(projectId);
      setChatMessages([]);
    }
  };

  // Determine theme style classes
  // Theme 1: sunset (الغروب الدافئ)
  // Theme 2: nature (الهدوء الطبيعي)
  // Theme 3: sky (السماء الهادئة)
  const getThemeClasses = () => {
    switch (settings.theme) {
      case 'nature':
        return {
          fabGradient: 'from-emerald-600 via-teal-600 to-green-700',
          fabRing: 'ring-emerald-400/40 hover:ring-emerald-500/70',
          fabShadow: 'shadow-emerald-900/30',
          primaryBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          secondaryBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          activeTab: 'bg-emerald-600 text-white shadow-sm',
          inactiveTab: 'text-stone-600 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
          accentText: 'text-emerald-600 dark:text-emerald-400',
          badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
          headerGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
          bubbleAi: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50',
          applyBtn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-700/20',
        };
      case 'sky':
        return {
          fabGradient: 'from-sky-600 via-indigo-600 to-blue-700',
          fabRing: 'ring-sky-400/40 hover:ring-sky-500/70',
          fabShadow: 'shadow-sky-900/30',
          primaryBg: 'bg-sky-600 hover:bg-sky-700 text-white',
          secondaryBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          activeTab: 'bg-sky-600 text-white shadow-sm',
          inactiveTab: 'text-stone-600 dark:text-stone-300 hover:bg-sky-50 dark:hover:bg-sky-950/30',
          accentText: 'text-sky-600 dark:text-sky-400',
          badge: 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-700',
          headerGradient: 'from-sky-500/10 via-indigo-500/5 to-transparent',
          bubbleAi: 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50',
          applyBtn: 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-sky-700/20',
        };
      case 'sunset':
      default:
        return {
          fabGradient: 'from-amber-600 via-orange-600 to-amber-700',
          fabRing: 'ring-amber-400/40 hover:ring-amber-500/70',
          fabShadow: 'shadow-amber-900/30',
          primaryBg: 'bg-amber-600 hover:bg-amber-700 text-white',
          secondaryBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          activeTab: 'bg-amber-600 text-white shadow-sm',
          inactiveTab: 'text-stone-600 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-amber-950/30',
          accentText: 'text-amber-600 dark:text-amber-400',
          badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
          headerGradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
          bubbleAi: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50',
          applyBtn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-700/20',
        };
    }
  };

  const themeClasses = getThemeClasses();

  // Accessibility font size class
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-base';
      case 'xlarge':
        return 'text-lg leading-relaxed';
      case 'normal':
      default:
        return 'text-sm';
    }
  };

  return (
    <>
      {/* 1. FLOATING ACTION BUTTON (Draggable FAB) */}
      <div
        style={{
          position: 'fixed',
          right: `${fabPosition.x}px`,
          bottom: `${fabPosition.y}px`,
          zIndex: 45,
          touchAction: 'none',
        }}
        className="select-none group"
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="المساعد التفاعلي والتدقيق الذكي (اسحب للتحريك أو انقر للفتح)"
          className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${themeClasses.fabGradient} text-white shadow-xl ${themeClasses.fabShadow} flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 transition-all duration-200 ring-4 ${themeClasses.fabRing} ${
            isDragging ? 'scale-110 shadow-2xl opacity-90' : ''
          }`}
        >
          {/* Animated Glow / Pulse Ring */}
          <span className="absolute -inset-1 rounded-2xl bg-current opacity-20 animate-pulse pointer-events-none" />

          {/* Icon */}
          <Sparkles className="w-6 h-6 animate-pulse" />

          {/* Quick status badge */}
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-stone-900 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          </span>

          {/* Drag Handle Indicator */}
          <div className="absolute bottom-1 w-4 h-1 bg-white/40 rounded-full" />
        </div>

        {/* Small tooltip on hover */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-stone-900/90 text-stone-100 text-xs font-tajawal whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center gap-1.5">
          <Move className="w-3 h-3 text-stone-400" />
          <span>المساعد الذكي (اسحب أو انقر)</span>
        </div>
      </div>

      {/* 2. SLIDING PANEL (Side Panel or Bottom Sheet) */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out font-tajawal ${
            settings.highContrast ? 'contrast-125' : ''
          } ${
            settings.panelMode === 'bottom'
              ? 'inset-x-0 bottom-0 max-h-[82vh] h-[580px] shadow-2xl rounded-t-3xl border-t border-stone-200 dark:border-stone-800'
              : 'top-0 right-0 bottom-0 w-full sm:w-[460px] md:w-[500px] shadow-2xl border-l border-stone-200 dark:border-stone-800'
          } bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl flex flex-col overflow-hidden text-stone-800 dark:text-stone-100`}
        >
          {/* Subtle Theme Header Accent Gradient */}
          <div className={`absolute top-0 inset-x-0 h-28 bg-gradient-to-b ${themeClasses.headerGradient} pointer-events-none`} />

          {/* Panel Top Header Bar */}
          <div className="relative px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${themeClasses.fabGradient} text-white flex items-center justify-center shadow-sm`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-cairo font-black text-sm sm:text-base">
                    المساعد التفاعلي والتدقيق الذكي
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${themeClasses.badge}`}>
                    Gemini API
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-[240px]">
                  سياق الفصل: «{chapterTitle}»
                </p>
              </div>
            </div>

            {/* Header Action Buttons (Pin, Mode Toggle, Settings, Close) */}
            <div className="flex items-center gap-1">
              {/* Pin / Dock Toggle */}
              <button
                onClick={() => updateSettings({ isPinned: !settings.isPinned })}
                title={settings.isPinned ? 'الواجهة مثبتة' : 'تثبيت الواجهة بجانب المحرر'}
                className={`p-1.5 rounded-lg transition-colors ${
                  settings.isPinned
                    ? `${themeClasses.primaryBg}`
                    : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {settings.isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
              </button>

              {/* Panel Layout Mode Toggle (Side vs Bottom) */}
              <button
                onClick={() => updateSettings({ panelMode: settings.panelMode === 'side' ? 'bottom' : 'side' })}
                title={settings.panelMode === 'side' ? 'تحويل لنافذة سفلية' : 'تحويل لنافذة جانبية'}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                {settings.panelMode === 'side' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>

              {/* Settings Tab Button */}
              <button
                onClick={() => setActiveTab(activeTab === 'settings' ? 'chat' : 'settings')}
                title="إعدادات الثيم وإمكانية الوصول"
                className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === 'settings'
                    ? `${themeClasses.primaryBg}`
                    : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                title="إغلاق الواجهة"
                className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="px-5 pt-2 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-t-lg font-cairo text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'chat' ? themeClasses.activeTab : themeClasses.inactiveTab
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>الدردشة التفاعلية</span>
                {chatMessages.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-stone-900/20 text-inherit text-[10px] flex items-center justify-center font-mono">
                    {chatMessages.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('quick')}
                className={`px-3 py-1.5 rounded-t-lg font-cairo text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'quick' ? themeClasses.activeTab : themeClasses.inactiveTab
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>خيارات سريعة وتدقيق</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-t-lg font-cairo text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'settings' ? themeClasses.activeTab : themeClasses.inactiveTab
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>الثيمات والتنسيق</span>
              </button>

              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 rounded-t-lg font-cairo text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'code' ? themeClasses.activeTab : themeClasses.inactiveTab
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>كود Flutter</span>
              </button>
            </div>

            {/* Clear chat button if in chat tab */}
            {activeTab === 'chat' && chatMessages.length > 1 && (
              <button
                onClick={handleClearChat}
                title="مسح المحادثة"
                className="text-stone-400 hover:text-red-500 p-1 rounded-md text-xs flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">مسح</span>
              </button>
            )}
          </div>

          {/* Temporary Notification Banner */}
          {appliedNotice && (
            <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold flex items-center justify-between gap-2 shadow-md animate-in slide-in-from-top-2 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-4 h-4 animate-bounce" />
                <span>{appliedNotice}</span>
              </div>
              <button onClick={() => setAppliedNotice(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* MAIN TAB CONTENT AREA */}
          <div className={`flex-1 overflow-y-auto p-4 ${getFontSizeClass()} space-y-4`}>
            
            {/* TAB 1: INTERACTIVE CHAT & QUICK PRESET CHIPS */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full space-y-4">
                
                {/* PRESET COMMAND CHIPS (الأوامر السريعة المحددة في الطلب) */}
                <div className="bg-stone-100/70 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200 dark:border-stone-700/60 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <Zap className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                      أوامر سريعة بنقرة واحدة:
                    </span>
                    {selectedText && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono">
                        محدد: {selectedText.slice(0, 18)}...
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {/* Command 1: اقترح عناوين فرعية لهذا الفصل */}
                    <button
                      onClick={() => handleSendMessage('اقترح عناوين فرعية لهذا الفصل')}
                      disabled={isSendingChat}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all text-right flex items-center gap-1.5 ${themeClasses.secondaryBg} hover:scale-[1.02] active:scale-95`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>اقترح عناوين فرعية لهذا الفصل</span>
                    </button>

                    {/* Command 2: افحص الجودة الإملائية للنص */}
                    <button
                      onClick={() => handleSendMessage('افحص الجودة الإملائية للنص')}
                      disabled={isSendingChat}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all text-right flex items-center gap-1.5 ${themeClasses.secondaryBg} hover:scale-[1.02] active:scale-95`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>افحص الجودة الإملائية للنص</span>
                    </button>

                    {/* Command 3: لخص أهم النقاط في المصدر المفتوح */}
                    <button
                      onClick={() => handleSendMessage('لخص أهم النقاط في المصدر المفتوح')}
                      disabled={isSendingChat}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all text-right flex items-center gap-1.5 ${themeClasses.secondaryBg} hover:scale-[1.02] active:scale-95`}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>لخص أهم النقاط في المصدر المفتوح</span>
                    </button>

                    {/* Additional helpful creative prompts */}
                    <button
                      onClick={() => handleSendMessage('أكمل الفكرة الحالية بأسلوب أدبي بليغ')}
                      disabled={isSendingChat}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                    >
                      إكمال الفكرة الحالية
                    </button>
                    <button
                      onClick={() => handleSendMessage('اقترح تشبيهاً واستعارة بلاغية لهذا المشهد')}
                      disabled={isSendingChat}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                    >
                      تحسين البلاغة والأسلوب
                    </button>
                  </div>
                </div>

                {/* CHAT MESSAGES STREAM */}
                <div 
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto space-y-4 pr-1 pl-1 min-h-[220px]"
                >
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                      <Sparkles className="w-10 h-10 mb-2 opacity-40 animate-pulse text-amber-500" />
                      <p className="font-cairo font-bold text-sm">مرحباً بك في المساعد التفاعلي لـ كاتب</p>
                      <p className="text-xs mt-1 max-w-xs">
                        اختر أحد الأوامر السريعة أعلاه أو اطرح سؤالك وملاحظاتك حول كتابك في أي وقت.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isAi = msg.sender === 'ai';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAi ? 'items-start' : 'items-end'} space-y-1.5`}
                        >
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-400 px-1">
                            <span className="font-bold">
                              {isAi ? 'مساعد كاتب الذكي' : 'أنت'}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-[10px]">
                              {new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Message Body */}
                          <div
                            className={`p-3.5 rounded-2xl max-w-[92%] sm:max-w-[85%] border shadow-xs leading-relaxed whitespace-pre-wrap ${
                              isAi
                                ? `${themeClasses.bubbleAi} text-stone-800 dark:text-stone-100`
                                : `${themeClasses.primaryBg} rounded-br-xs`
                            }`}
                          >
                            {msg.text}

                            {/* If there are structured subheadings or key points */}
                            {msg.metadata?.keyPoints && msg.metadata.keyPoints.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-stone-200/60 dark:border-stone-700/60 space-y-1.5">
                                <span className="text-xs font-bold flex items-center gap-1 text-stone-600 dark:text-stone-300">
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                  النقاط المستخلصة:
                                </span>
                                <ul className="list-disc list-inside text-xs space-y-1 text-stone-700 dark:text-stone-300">
                                  {msg.metadata.keyPoints.map((point, idx) => (
                                    <li key={idx}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* PROMINENT BUTTON: «تطبيق المقترح» (Apply Suggestion) */}
                            {isAi && (
                              <div className="mt-3 pt-2.5 border-t border-stone-200/60 dark:border-stone-700/60 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopy(msg.actionableSuggestion || msg.text, msg.id)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center gap-1 transition-colors"
                                  >
                                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedId === msg.id ? 'تم النسخ' : 'نسخ'}</span>
                                  </button>
                                </div>

                                {/* Apply Suggestion Button */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleApplySuggestion(msg.actionableSuggestion || msg.text, 'cursor')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo shadow-sm flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 ${themeClasses.applyBtn}`}
                                  >
                                    <CornerDownRight className="w-3.5 h-3.5" />
                                    <span>تطبيق المقترح في المحرر</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Typing Indicator */}
                  {isSendingChat && (
                    <div className="flex items-center gap-2 text-stone-400 text-xs p-2">
                      <div className="w-6 h-6 rounded-lg bg-stone-200 dark:bg-stone-800 flex items-center justify-center animate-spin">
                        <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                      </div>
                      <span className="font-tajawal">جاري التفكير وصياغة الرد بالذكاء الاصطناعي...</span>
                    </div>
                  )}
                </div>

                {/* CHAT INPUT FORM */}
                <div className="shrink-0 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="اسأل المساعد أو اكتب طلباً مخصصاً..."
                        disabled={isSendingChat}
                        className="w-full px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-inherit text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500/40 transition-all pl-10"
                      />
                      {chatInput && (
                        <button
                          type="button"
                          onClick={() => setChatInput('')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isSendingChat}
                      className={`px-4 py-2.5 rounded-xl font-cairo font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all ${
                        !chatInput.trim() || isSendingChat
                          ? 'opacity-40 cursor-not-allowed bg-stone-300 dark:bg-stone-700 text-stone-500'
                          : `${themeClasses.primaryBg} shadow-sm hover:scale-105 active:scale-95`
                      }`}
                    >
                      <Send className="w-4 h-4 rotate-180" />
                      <span className="hidden sm:inline">إرسال</span>
                    </button>
                  </form>
                </div>

              </div>
            )}

            {/* TAB 2: QUICK INLINE ACTIONS & PROOFREADING (إكمال الفقرة، الملخص، التدقيق الإملائي) */}
            {activeTab === 'quick' && (
              <div className="space-y-4">
                
                {/* 3 Quick Action Modes */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleTriggerQuickAction('autocomplete')}
                    disabled={isLoadingQuick}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      selectedQuickMode === 'autocomplete'
                        ? `${themeClasses.secondaryBg} font-bold ring-2 ring-current`
                        : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Zap className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-cairo">إكمال الفقرة</span>
                  </button>

                  <button
                    onClick={() => handleTriggerQuickAction('summary')}
                    disabled={isLoadingQuick}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      selectedQuickMode === 'summary'
                        ? `${themeClasses.secondaryBg} font-bold ring-2 ring-current`
                        : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <BookOpen className="w-5 h-5 text-sky-500" />
                    <span className="text-xs font-cairo">ملخص سريع</span>
                  </button>

                  <button
                    onClick={() => handleTriggerQuickAction('proofread')}
                    disabled={isLoadingQuick}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      selectedQuickMode === 'proofread'
                        ? `${themeClasses.secondaryBg} font-bold ring-2 ring-current`
                        : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-cairo">التدقيق اللغوي</span>
                  </button>
                </div>

                {/* Loading Spinner */}
                {isLoadingQuick && (
                  <div className="p-8 text-center bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-700/50">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 text-amber-600 animate-spin" />
                    <p className="font-cairo font-bold text-sm">جاري التحليل واستدعاء المحرك الذكي...</p>
                    <p className="text-xs text-stone-400 mt-1">يتم تطبيق القواعد النحوية والإملائية بدقة فائقة</p>
                  </div>
                )}

                {/* Display Quick Action Results */}
                {!isLoadingQuick && lastQuickResult && (
                  <div className="space-y-4">
                    
                    {/* AUTOCOMPLETE RESULTS */}
                    {lastQuickResult.mode === 'autocomplete' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-cairo font-bold text-xs text-stone-500">
                            اقتراحات إكمال الفقرة:
                          </h4>
                          <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full font-bold">
                            {lastQuickResult.suggestions?.length || 0} خيارات
                          </span>
                        </div>

                        {lastQuickResult.suggestions?.map((sug, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 hover:border-amber-400 transition-all space-y-2.5"
                          >
                            <p className="text-xs sm:text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                              «{sug}»
                            </p>
                            <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700/60">
                              <button
                                onClick={() => handleCopy(sug, `sug_${idx}`)}
                                className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1"
                              >
                                {copiedId === `sug_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedId === `sug_${idx}` ? 'تم النسخ' : 'نسخ'}</span>
                              </button>

                              <button
                                onClick={() => handleApplySuggestion(sug, 'cursor')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo flex items-center gap-1.5 shadow-sm ${themeClasses.applyBtn}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>تطبيق المقترح في المحرر</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SUMMARY RESULTS */}
                    {lastQuickResult.mode === 'summary' && (
                      <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-cairo font-bold text-sm text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-sky-500" />
                            ملخص الفصل الحالي
                          </h4>
                          {lastQuickResult.readingTimeMinutes && (
                            <span className="text-[10px] text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-full font-bold">
                              القراءة: {lastQuickResult.readingTimeMinutes} دقيقة
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                          {lastQuickResult.summary}
                        </p>

                        {lastQuickResult.keyPoints && lastQuickResult.keyPoints.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-700">
                            <span className="text-xs font-bold text-stone-500">النقاط الرئيسية:</span>
                            <ul className="space-y-1 text-xs">
                              {lastQuickResult.keyPoints.map((pt, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleApplySuggestion(lastQuickResult.summary || '', 'append')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo flex items-center gap-1.5 shadow-sm ${themeClasses.applyBtn}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إدراج كخلاصة في نهاية الفصل</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PROOFREADING RESULTS */}
                    {lastQuickResult.mode === 'proofread' && (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                          <div>
                            <span className="font-cairo font-bold text-sm text-emerald-900 dark:text-emerald-300">
                              تقييم السلامة اللغوية
                            </span>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                              {lastQuickResult.overallFeedback}
                            </p>
                          </div>
                          <div className="text-center bg-white dark:bg-stone-900 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700">
                            <span className="font-black font-cairo text-lg text-emerald-600 dark:text-emerald-400">
                              {lastQuickResult.score || 95}%
                            </span>
                            <span className="block text-[9px] text-stone-400">الدرجة</span>
                          </div>
                        </div>

                        {/* Errors list */}
                        {lastQuickResult.errors && lastQuickResult.errors.length > 0 ? (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-stone-500">
                              الملاحظات المرصودة ({lastQuickResult.errors.length}):
                            </span>
                            {lastQuickResult.errors.map((err, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="line-through text-red-500 font-bold bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded">
                                      {err.errorText}
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 text-stone-400 rotate-180" />
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                                      {err.suggestion}
                                    </span>
                                  </div>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 font-mono">
                                    {err.type}
                                  </span>
                                </div>
                                <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                                  {err.explanation}
                                </p>
                              </div>
                            ))}

                            {/* Apply all corrections button */}
                            {lastQuickResult.correctedText && (
                              <button
                                onClick={() => {
                                  onApplyText(lastQuickResult.correctedText!);
                                  notifyApplied('تم تطبيق النص المدقق بالكامل على الفصل بنجاح!');
                                }}
                                className="w-full py-2.5 rounded-xl font-cairo font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
                              >
                                <CheckCheck className="w-4 h-4" />
                                <span>تطبيق كافة التصحيحات اللغوية دفعة واحدة</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 text-center text-xs text-emerald-700 dark:text-emerald-300">
                            لا توجد أخطاء إملائية أو نحوية مكتشفة في هذا المقطع.
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}

              </div>
            )}

            {/* TAB 3: SETTINGS & ADVANCED FORMATTING (شاشة الإعدادات والتنسيق المتقدم) */}
            {activeTab === 'settings' && (
              <div className="space-y-5">
                
                {/* 1. THREE CUSTOM THEMES (الثيمات الثلاثة المخصصة) */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Palette className={`w-4 h-4 ${themeClasses.accentText}`} />
                    <h4 className="font-cairo font-bold text-xs sm:text-sm text-stone-800 dark:text-stone-100">
                      الثيمات الثلاثة المخصصة
                    </h4>
                  </div>
                  <p className="text-xs text-stone-500">
                    اختر المظهر البصري المتناسق لواجهة المساعد التفاعلي:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    
                    {/* Theme 1: الغروب الدافئ (Warm Sunset) */}
                    <button
                      onClick={() => updateSettings({ theme: 'sunset' })}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between h-24 ${
                        settings.theme === 'sunset'
                          ? 'border-amber-500 ring-2 ring-amber-400 bg-amber-50/60 dark:bg-amber-950/40'
                          : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 flex items-center justify-center text-white">
                          <Sun className="w-3.5 h-3.5" />
                        </div>
                        {settings.theme === 'sunset' && <Check className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div>
                        <span className="font-cairo font-bold text-xs text-amber-900 dark:text-amber-200 block">
                          الغروب الدافئ
                        </span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">
                          عنبري ذهبي مريح
                        </span>
                      </div>
                    </button>

                    {/* Theme 2: الهدوء الطبيعي (Natural Serenity) */}
                    <button
                      onClick={() => updateSettings({ theme: 'nature' })}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between h-24 ${
                        settings.theme === 'nature'
                          ? 'border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40'
                          : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-600 to-green-700 flex items-center justify-center text-white">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        {settings.theme === 'nature' && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div>
                        <span className="font-cairo font-bold text-xs text-emerald-900 dark:text-emerald-200 block">
                          الهدوء الطبيعي
                        </span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          زمردي هادئ ووقور
                        </span>
                      </div>
                    </button>

                    {/* Theme 3: السماء الهادئة (Calm Sky) */}
                    <button
                      onClick={() => updateSettings({ theme: 'sky' })}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between h-24 ${
                        settings.theme === 'sky'
                          ? 'border-sky-500 ring-2 ring-sky-400 bg-sky-50/60 dark:bg-sky-950/40'
                          : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 hover:border-sky-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 via-indigo-600 to-blue-700 flex items-center justify-center text-white">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        {settings.theme === 'sky' && <Check className="w-4 h-4 text-sky-600" />}
                      </div>
                      <div>
                        <span className="font-cairo font-bold text-xs text-sky-900 dark:text-sky-200 block">
                          السماء الهادئة
                        </span>
                        <span className="text-[10px] text-sky-700 dark:text-sky-400">
                          نيلي سماوي عميق
                        </span>
                      </div>
                    </button>

                  </div>
                </div>

                {/* 2. ACCESSIBILITY & FONT SIZING (خيارات تكبير الخط وإمكانية الوصول) */}
                <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <Type className={`w-4 h-4 ${themeClasses.accentText}`} />
                    <h4 className="font-cairo font-bold text-xs sm:text-sm text-stone-800 dark:text-stone-100">
                      تكبير الخط وإمكانية الوصول (Accessibility)
                    </h4>
                  </div>

                  {/* Font Size Selector */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-stone-500">حجم الخط في واجهة المساعد:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['small', 'normal', 'large', 'xlarge'] as FontSizeOption[]).map((size) => {
                        const labels: Record<FontSizeOption, string> = {
                          small: 'صغير',
                          normal: 'افتراضي',
                          large: 'كبير',
                          xlarge: 'كبير جداً',
                        };
                        return (
                          <button
                            key={size}
                            onClick={() => updateSettings({ fontSize: size })}
                            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                              settings.fontSize === size
                                ? `${themeClasses.primaryBg} border-transparent`
                                : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                            }`}
                          >
                            {labels[size]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* High Contrast Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-stone-500" />
                      <div>
                        <span className="text-xs font-bold block">وضع التباين العالي (High Contrast)</span>
                        <span className="text-[10px] text-stone-400">
                          حدود بارزة وخطوط مشبعة لسهولة القراءة
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.highContrast}
                      onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Line Spacing */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
                    <div>
                      <span className="text-xs font-bold block">تباعد الأسطر (Line Spacing)</span>
                      <span className="text-[10px] text-stone-400">
                        راحة العين أثناء مراجعة النصوص الطويلة
                      </span>
                    </div>
                    <select
                      value={settings.lineSpacing}
                      onChange={(e) => updateSettings({ lineSpacing: e.target.value as any })}
                      className="px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 outline-none"
                    >
                      <option value="normal">عادي</option>
                      <option value="relaxed">مريح</option>
                      <option value="loose">واسع</option>
                    </select>
                  </div>
                </div>

                {/* 3. DOCKING & PINNING OPTIONS (خيارات التثبيت والموقع) */}
                <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <Pin className={`w-4 h-4 ${themeClasses.accentText}`} />
                    <h4 className="font-cairo font-bold text-xs sm:text-sm text-stone-800 dark:text-stone-100">
                      التثبيت والموضع المتقدم
                    </h4>
                  </div>

                  {/* Pin Mode Switch */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
                    <div>
                      <span className="text-xs font-bold block">تثبيت الواجهة (Pinned Mode)</span>
                      <span className="text-[10px] text-stone-400">
                        إبقاء الواجهة مفتوحة بجانب محرر النصوص دون إغلاق تلقائي
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.isPinned}
                      onChange={(e) => updateSettings({ isPinned: e.target.checked })}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Panel Mode Switch */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateSettings({ panelMode: 'side' })}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        settings.panelMode === 'side'
                          ? `${themeClasses.secondaryBg} font-bold ring-2 ring-current`
                          : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <span className="text-xs font-cairo block">نافذة جانبية (Side Panel)</span>
                      <span className="text-[10px] text-stone-400">منزلقة من جانب الشاشة</span>
                    </button>

                    <button
                      onClick={() => updateSettings({ panelMode: 'bottom' })}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        settings.panelMode === 'bottom'
                          ? `${themeClasses.secondaryBg} font-bold ring-2 ring-current`
                          : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <span className="text-xs font-cairo block">نافذة سفلية (Sliding Sheet)</span>
                      <span className="text-[10px] text-stone-400">منزلقة من أسفل الشاشة</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: FLUTTER CODEBASE REFERENCE */}
            {activeTab === 'code' && (
              <div className="space-y-3">
                <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-cairo block">
                    كود Flutter المقابل في مشروع katib_app:
                  </span>
                  <span className="font-mono text-[11px] text-stone-500">
                    lib/features/assistant/presentation/widgets/floating_assistant_widget.dart
                  </span>
                </div>
                <div className="p-3.5 bg-stone-900 text-stone-100 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed max-h-[380px]">
                  <pre>{`/// واجهة الزر العائم والنافذة المنزلقة في Flutter
class FloatingAssistantWidget extends StatefulWidget {
  final String projectId;
  final String chapterId;
  final String currentText;
  final Function(String snippet)? onApplySuggestion;

  const FloatingAssistantWidget({
    Key? key,
    required this.projectId,
    required this.chapterId,
    required this.currentText,
    this.onApplySuggestion,
  }) : super(key: key);

  @override
  State<FloatingAssistantWidget> createState() => _FloatingAssistantWidgetState();
}

class _FloatingAssistantWidgetState extends State<FloatingAssistantWidget> {
  Offset _fabPosition = const Offset(20, 80);
  bool _isPanelOpen = false;
  AssistantTheme _currentTheme = AssistantTheme.sunset;

  // الثيمات الثلاثة المخصصة:
  // 1. الغروب الدافئ (Warm Sunset)
  // 2. الهدوء الطبيعي (Natural Serenity)
  // 3. السماء الهادئة (Calm Sky)
}`}</pre>
                </div>
              </div>
            )}

          </div>

          {/* Panel Bottom Status Bar */}
          <div className="px-5 py-2.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex items-center justify-between text-xs text-stone-500 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>محرك كاتب متصل بـ Gemini 3.8 Flash</span>
            </div>
            <span className="font-mono text-[10px]">
              {settings.theme === 'sunset' ? 'الغروب الدافئ' : settings.theme === 'nature' ? 'الهدوء الطبيعي' : 'السماء الهادئة'}
            </span>
          </div>

        </div>
      )}
    </>
  );
};
