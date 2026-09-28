import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Headphones, 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Sliders, 
  Download, 
  Check, 
  X, 
  Clock, 
  Layers, 
  Sparkles, 
  FileText, 
  Code2, 
  Copy, 
  Disc,
  Activity,
  Maximize2,
  Minimize2,
  RefreshCw,
  FolderDown
} from 'lucide-react';
import { Book, Chapter, AudioTrack, TtsConfiguration } from '../types';
import { 
  configureTts, 
  getCurrentTtsConfiguration, 
  splitTextIntoAudioChunks, 
  estimateAudioDurationMs, 
  formatDuration, 
  synthesizeAudioTrack,
  speechPlaybackController 
} from '../services/audiobookService';

interface AudiobookStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  initialChapterIndex?: number;
}

export const AudiobookStudioModal: React.FC<AudiobookStudioModalProps> = ({
  isOpen,
  onClose,
  book,
  initialChapterIndex = 0,
}) => {
  // 1. الفصل المحدد
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(initialChapterIndex);
  const activeChapter: Chapter = book.chapters[selectedChapterIndex] || book.chapters[0];
  const chapterText = activeChapter?.plainText || activeChapter?.content || '';

  // 2. إعدادات الصوت (configureTts)
  const [language, setLanguage] = useState<string>('ar-SA');
  const [pitch, setPitch] = useState<number>(1.0);
  const [speechRate, setSpeechRate] = useState<number>(0.9);
  const [volume, setVolume] = useState<number>(1.0);

  // 3. المقاطع الصوتية والحالة
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'player' | 'flutterCode'>('player');

  // 4. حرق واستخراج الملف الصوتي
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [generatedTrack, setGeneratedTrack] = useState<AudioTrack | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // تحديث إعدادات TTS عند التغيير
  useEffect(() => {
    configureTts({ language, pitch, speechRate, volume });
  }, [language, pitch, speechRate, volume]);

  // تقسيم النص إلى مقاطع صوتية متناسقة
  const audioChunks = useMemo(() => {
    return splitTextIntoAudioChunks(chapterText, 220);
  }, [chapterText]);

  // تقدير المدة الإجمالية للفصل
  const estimatedDurationMs = useMemo(() => {
    return estimateAudioDurationMs(chapterText, speechRate);
  }, [chapterText, speechRate]);

  // إيقاف الصوت عند إغلاق النافذة
  useEffect(() => {
    if (!isOpen) {
      speechPlaybackController.stop();
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [isOpen]);

  // التحكم بالتشغيل المستمر
  const handlePlayToggle = () => {
    if (isPlaying && !isPaused) {
      speechPlaybackController.pause();
      setIsPaused(true);
    } else if (isPlaying && isPaused) {
      speechPlaybackController.resume();
      setIsPaused(false);
    } else {
      speechPlaybackController.playChunks(
        audioChunks,
        activeChunkIndex,
        {
          onChunkChange: (index) => {
            setActiveChunkIndex(index);
          },
          onComplete: () => {
            setIsPlaying(false);
            setIsPaused(false);
            setActiveChunkIndex(0);
          },
          onStateChange: (speaking, paused) => {
            setIsPlaying(speaking);
            setIsPaused(paused);
          }
        }
      );
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    speechPlaybackController.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setActiveChunkIndex(0);
  };

  const handleNextChunk = () => {
    const nextIdx = Math.min(audioChunks.length - 1, activeChunkIndex + 1);
    setActiveChunkIndex(nextIdx);
    speechPlaybackController.seekToChunk(nextIdx);
  };

  const handlePrevChunk = () => {
    const prevIdx = Math.max(0, activeChunkIndex - 1);
    setActiveChunkIndex(prevIdx);
    speechPlaybackController.seekToChunk(prevIdx);
  };

  // حرق واستخراج الملف الصوتي المحلي (AudioTrack)
  const handleSynthesizeAudioFile = async () => {
    setIsSynthesizing(true);
    try {
      const result = await synthesizeAudioTrack(
        activeChapter.id,
        activeChapter.title,
        chapterText,
        { language, pitch, speechRate, volume }
      );
      setGeneratedTrack(result.track);
    } catch (e) {
      console.error('Audio synthesis failed:', e);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // كود فلاتر
  const flutterAudiobookCode = `// ============================================================================
// خدمة الكتاب الصوتي AudiobookService وموديل AudioTrack في فلاتر
// pubspec.yaml:
//   flutter_tts: ^4.2.0
//   path_provider: ^2.1.4
// ============================================================================

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:path_provider/path_provider.dart';

/// 1. موديل المسار الصوتي AudioTrack
class AudioTrack {
  final String chapterId;
  final String chapterTitle;
  final String audioFilePath;
  final Duration duration;

  const AudioTrack({
    required this.chapterId,
    required this.chapterTitle,
    required this.audioFilePath,
    required this.duration,
  });

  Map<String, dynamic> toJson() => {
    'chapterId': chapterId,
    'chapterTitle': chapterTitle,
    'audioFilePath': audioFilePath,
    'durationMs': duration.inMilliseconds,
  };

  factory AudioTrack.fromJson(Map<String, dynamic> json) => AudioTrack(
    chapterId: json['chapterId'] as String,
    chapterTitle: json['chapterTitle'] as String,
    audioFilePath: json['audioFilePath'] as String,
    duration: Duration(milliseconds: json['durationMs'] as int? ?? 0),
  );
}

/// 2. خدمة الكتاب الصوتي AudiobookService
class AudiobookService {
  final FlutterTts _flutterTts = FlutterTts();
  bool _isSpeaking = false;
  int _currentChunkIndex = 0;
  List<String> _chunks = [];

  AudiobookService() {
    _initTts();
  }

  void _initTts() {
    _flutterTts.setCompletionHandler(() {
      _currentChunkIndex++;
      if (_currentChunkIndex < _chunks.length) {
        _speakCurrentChunk();
      } else {
        _isSpeaking = false;
      }
    });
  }

  /// دالة configureTts: لضبط اللغة العربية ودرجة الصوت وسرعة القراءة
  Future<void> configureTts({
    String language = 'ar-SA',
    double pitch = 1.0,
    double speechRate = 0.5,
    double volume = 1.0,
  }) async {
    await _flutterTts.setLanguage(language);
    await _flutterTts.setPitch(pitch);
    await _flutterTts.setSpeechRate(speechRate);
    await _flutterTts.setVolume(volume);
  }

  /// تقسيم النصوص الطويلة إلى مقاطع صوتية قابلة للتشغيل المستمر
  List<String> splitTextIntoAudioChunks(String text, {int maxChunkLength = 220}) {
    final rawSentences = text.split(RegExp(r'([.؛!؟،\n]+)'));
    List<String> chunks = [];
    String buffer = '';

    for (var sentence in rawSentences) {
      if ((buffer + sentence).length <= maxChunkLength) {
        buffer += sentence;
      } else {
        if (buffer.trim().isNotEmpty) chunks.add(buffer.trim());
        buffer = sentence;
      }
    }
    if (buffer.trim().isNotEmpty) chunks.add(buffer.trim());
    return chunks;
  }

  /// تشغيل الفصل صوتياً بتدفق مستمر دون انقطاع
  Future<void> playChapterText(String text) async {
    _chunks = splitTextIntoAudioChunks(text);
    _currentChunkIndex = 0;
    _isSpeaking = true;
    await _speakCurrentChunk();
  }

  Future<void> _speakCurrentChunk() async {
    if (_currentChunkIndex < _chunks.length) {
      await _flutterTts.speak(_chunks[_currentChunkIndex]);
    }
  }

  Future<void> pause() async => await _flutterTts.pause();
  Future<void> stop() async {
    _isSpeaking = false;
    await _flutterTts.stop();
  }

  /// معالجة وحرق واستخراج الملف الصوتي المحلي (AudioTrack)
  Future<AudioTrack> synthesizeAudioTrackToFile({
    required String chapterId,
    required String chapterTitle,
    required String text,
  }) async {
    final appDir = await getApplicationDocumentsDirectory();
    final fileName = 'audiobook_\${chapterId}_\${DateTime.now().millisecondsSinceEpoch}.wav';
    final filePath = '\${appDir.path}/\$fileName';

    // حرق النص كاملاً إلى ملف صوتي محلي عبر محرك TTS
    await _flutterTts.synthesizeToFile(text, fileName);

    return AudioTrack(
      chapterId: chapterId,
      chapterTitle: chapterTitle,
      audioFilePath: filePath,
      duration: Duration(seconds: (text.split(' ').length / 2.2).round()),
    );
  }
}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/70 backdrop-blur-xs font-cairo">
      
      <div 
        dir="rtl"
        className="w-full max-w-5xl h-[92vh] max-h-[850px] bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden animate-in zoom-in-95"
      >
        
        {/* 1. Header Toolbar */}
        <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex items-center justify-between shrink-0">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  خدمة تحويل الكتاب إلى كتاب صوتي
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800/60 font-mono">
                  AudiobookService • flutter_tts
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                تشغيل صوتي عربي متصل دون انقطاع، تقسيم ذكي للمقاطع، واستخراج الملفات الصوتية المحلية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Tab Switcher */}
            <div className="flex items-center bg-stone-200/80 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('player')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'player'
                    ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>المشغل الصوتي</span>
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
                <span>كود Flutter (Dart)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

          </div>

        </header>

        {/* 2. Main Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {activeTab === 'flutterCode' ? (
            /* ===============================================================
               عرض كود Flutter المصاحب لخدمة AudiobookService وموديل AudioTrack
               =============================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs">
                <div>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    كود Flutter: AudiobookService و AudioTrack (Clean Architecture)
                  </span>
                  <p className="text-[11px] text-stone-500 font-tajawal mt-0.5">
                    تطبيق configureTts، تقسيم النصوص الطويلة، وتشغيل متواصل وحرق الملف الصوتي محلياً
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(flutterAudiobookCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'تم النسخ!' : 'نسخ كود فلاتر'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-stone-900 text-amber-200/90 font-mono text-xs leading-relaxed overflow-auto max-h-[540px] border border-stone-800" dir="ltr">
                {flutterAudiobookCode}
              </pre>
            </div>
          ) : (
            /* ===============================================================
               واجهة المشغل الصوتي الحية وإعدادات TTS والتقسيم
               =============================================================== */
            <>
              {/* شريط اختيار الفصل المستهدف */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-700 dark:text-stone-300">
                    اختر الفصل المراد تحويله وتشغيله:
                  </span>
                  <select
                    value={selectedChapterIndex}
                    onChange={(e) => {
                      setSelectedChapterIndex(parseInt(e.target.value, 10));
                      handleStop();
                    }}
                    className="p-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold"
                  >
                    {book.chapters.map((ch, idx) => (
                      <option key={ch.id || idx} value={idx}>
                        الفصل {idx + 1}: {ch.title} ({ch.wordCount} كلمة)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 text-stone-500 font-tajawal text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>المدة التقديرية: {formatDuration(estimatedDurationMs)}</span>
                  </span>
                  <span>•</span>
                  <span>المقاطع المجزأة: {audioChunks.length} مقطع</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* -------------------------------------------------------------
                    اللوحة الجانبية: دالة configureTts وضبط الصوت العربي
                   ------------------------------------------------------------- */}
                <div className="lg:col-span-4 bg-stone-50 dark:bg-stone-800/40 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-amber-600" />
                      <span>إعدادات النطق (configureTts):</span>
                    </h3>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-bold bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded">
                      {language}
                    </span>
                  </div>

                  {/* اللغة المعتمدة */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-stone-700 dark:text-stone-300">
                      اللغة المعتمدة على العربية:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLanguage('ar-SA')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          language === 'ar-SA' 
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600'
                        }`}
                      >
                        عربية سعودية (ar-SA)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLanguage('ar')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          language === 'ar' 
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600'
                        }`}
                      >
                        العربية الفصحى (ar)
                      </button>
                    </div>
                  </div>

                  {/* سرعة القراءة (Speech Rate) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-700 dark:text-stone-300">سرعة القراءة (Speech Rate):</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{speechRate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                      <span>0.5x بطيء</span>
                      <span>1.0x طبيعي</span>
                      <span>1.5x سريع</span>
                    </div>
                  </div>

                  {/* درجة الصوت (Pitch) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-700 dark:text-stone-300">درجة الصوت (Pitch):</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{pitch.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.3"
                      step="0.05"
                      value={pitch}
                      onChange={(e) => setPitch(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                      <span>رخيم وعميق</span>
                      <span>1.0 متزن</span>
                      <span>حاد ورفيع</span>
                    </div>
                  </div>

                  {/* زر حرق واستخراج الملف الصوتي المحلي */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSynthesizing}
                      onClick={handleSynthesizeAudioFile}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSynthesizing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جارٍ حرق واستخراج الملف الصوتي...</span>
                        </>
                      ) : (
                        <>
                          <Disc className="w-4 h-4" />
                          <span>حرق واستخراج المسار الصوتي (AudioTrack)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* بطاقة المسار الصوتي المستخرج إن وُجد */}
                  {generatedTrack && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>تم حرق الملف الصوتي بنجاح!</span>
                        </span>
                        <span className="font-mono text-[11px]">{generatedTrack.durationFormatted}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 font-tajawal truncate">
                        المسار: {activeChapter.title}.wav
                      </p>
                      <a
                        href={generatedTrack.audioFilePath}
                        download={`${activeChapter.title}_كتاب_صوتي.wav`}
                        className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تنزيل ملف الـ AudioTrack</span>
                      </a>
                    </div>
                  )}

                </div>

                {/* -------------------------------------------------------------
                    المساحة الرئيسية: عرض وتتبع المقاطع المجزأة المتصلة
                   ------------------------------------------------------------- */}
                <div className="lg:col-span-8 flex flex-col space-y-4">
                  
                  {/* شريط حالة التشغيل والـ Equalizer */}
                  <div className="p-4 rounded-2xl bg-stone-900 text-white flex items-center justify-between shadow-lg">
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isPlaying ? 'bg-amber-600 text-white animate-pulse' : 'bg-stone-800 text-stone-400'
                      }`}>
                        {isPlaying ? <Activity className="w-6 h-6 animate-bounce" /> : <Headphones className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stone-100 flex items-center gap-2">
                          <span>الفصل {selectedChapterIndex + 1}: {activeChapter.title}</span>
                          {isPlaying && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              {isPaused ? 'متوقف مؤقتاً' : 'جارٍ القراءة المتواصلة'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 font-tajawal mt-0.5 flex items-center gap-2">
                          <span>المقطع {activeChunkIndex + 1} من {audioChunks.length}</span>
                          <span>•</span>
                          <span className="font-mono text-amber-300">{formatDuration(estimatedDurationMs)}</span>
                        </div>
                      </div>
                    </div>

                    {/* أزرار التحكم بالمشغل */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrevChunk}
                        disabled={activeChunkIndex === 0}
                        className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-30 transition-colors cursor-pointer"
                        title="المقطع السابق"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handlePlayToggle}
                        className="p-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                        title={isPlaying && !isPaused ? 'إيقاف مؤقت' : 'تشغيل مستمر'}
                      >
                        {isPlaying && !isPaused ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={handleStop}
                        disabled={!isPlaying && !isPaused}
                        className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-30 transition-colors cursor-pointer"
                        title="إيقاف تام"
                      >
                        <Square className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleNextChunk}
                        disabled={activeChunkIndex === audioChunks.length - 1}
                        className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-30 transition-colors cursor-pointer"
                        title="المقطع التالي"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {/* قائمة المقاطع الصوتية المجزأة مع تمييز المقطع المقروء حالياً */}
                  <div className="flex-1 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 p-4 space-y-2 overflow-y-auto max-h-[380px]">
                    <div className="flex items-center justify-between text-xs text-stone-500 font-bold border-b border-stone-200 dark:border-stone-800 pb-2 mb-3">
                      <span>المقاطع الصوتية المجزأة لضمان القراءة دون انقطاع:</span>
                      <span className="font-mono text-amber-600">{audioChunks.length} مقاطع</span>
                    </div>

                    {audioChunks.map((chunk, idx) => {
                      const isCurrent = idx === activeChunkIndex;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setActiveChunkIndex(idx);
                            speechPlaybackController.seekToChunk(idx);
                          }}
                          className={`p-3 rounded-xl border text-xs sm:text-sm leading-relaxed transition-all cursor-pointer flex items-start gap-3 ${
                            isCurrent
                              ? 'bg-amber-100/90 dark:bg-amber-950/70 border-amber-500 text-amber-950 dark:text-amber-200 shadow-sm ring-1 ring-amber-500/40'
                              : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700/70 text-stone-700 dark:text-stone-300 hover:border-amber-400'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                            isCurrent ? 'bg-amber-600 text-white' : 'bg-stone-100 dark:bg-stone-700 text-stone-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-justify font-cairo">
                            {chunk}
                          </span>
                          {isCurrent && isPlaying && (
                            <Activity className="w-4 h-4 text-amber-600 animate-pulse shrink-0 mt-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>
            </>
          )}

        </div>

        {/* 3. Footer */}
        <footer className="px-6 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between shrink-0 text-xs text-stone-500 font-tajawal">
          <span>
            تطبيق كاتب • معمارية تحويل النص المكتوب إلى كتاب صوتي مدمجة بالكامل
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </footer>

      </div>

    </div>
  );
};
