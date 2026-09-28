export type ThemeMode = 'light' | 'dark';
export type DeviceFrame = 'desktop' | 'tablet' | 'mobile';
export type ActiveTab = 'app' | 'editor' | 'mindmap' | 'extraction' | 'publishing' | 'architecture' | 'account';

export type CanvasNodeType = 'idea' | 'character' | 'location' | 'extracted_quote' | 'event';

export interface CanvasNode {
  id: string;
  bookId: string;
  title: string;
  content: string;
  dx: number;
  dy: number;
  colorHex: string;
  nodeType: CanvasNodeType;
  width?: number;
  height?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CanvasEdge {
  id: string;
  bookId: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  colorHex?: string;
  strokeWidth?: number;
  lineStyle?: 'solid' | 'dashed';
  createdAt?: string;
}

export type ExtractionType = 
  | 'passages'     // نصوص أصلية
  | 'summary'      // ملخص
  | 'comparison'   // مقارنة بين المصادر
  | 'qa'           // إجابة عن سؤال
  | 'definitions'; // استخراج تعريفات وإحصاءات

export interface ExtractedResult {
  id: string;
  type: ExtractionType;
  topicQuery: string;
  text: string;
  bookId: string;
  bookTitle: string;
  author: string;
  pageNumber: number;
  originalExcerpt: string;
  relevanceScore: number;
  status: 'pending' | 'accepted' | 'edited';
  createdAt: string;
  tags: string[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  coverGradient: string;
  coverPattern: string;
  totalPages: number;
  currentPage: number;
  wordCount: number;
  targetWordCount: number;
  status: 'drafting' | 'reviewing' | 'published' | 'reading';
  lastModified: string;
  lastModifiedTimestamp?: number; // توقيت التعديل بالملي ثانية للمزامنة وحل التعارضات
  isSynced?: boolean;             // حالة المزامنة مع السحابة (Offline-First)
  format: 'project' | 'pdf' | 'epub';
  description: string;
  chapters: Chapter[];
  isFavorite: boolean;
}

export interface Citation {
  id: string;
  chapterId?: string;
  sourceFileName: string;
  pageNumber: number;
  author: string;
  excerpt: string;
  createdAt?: string;
  lastModified?: string;
  lastModifiedTimestamp?: number; // توقيت التعديل بالملي ثانية
  isSynced?: boolean;             // حالة المزامنة للمصدر
}

export interface ChapterBackup {
  id: string;
  chapterId: string;
  chapterTitle: string;
  content: string;
  timestamp: number;
  formattedDate: string;
  deviceId: string;
  deviceName: string;
  reason: 'conflict_resolution' | 'manual_snapshot' | 'pre_sync_backup';
}

export interface Chapter {
  id: string;
  title: string;
  orderIndex: number;
  contentJson: string; // لحفظ التنسيقات المتقدمة
  plainText: string;   // للنص الخام والحسابات
  wordCount: number;
  content?: string;    // متوافق مع العرض المباشر
  citations?: Citation[];
  lastModified?: string;
  lastModifiedTimestamp?: number; // توقيت التعديل بالملي ثانية لحل التعارضات
  isSynced?: boolean;             // حالة المزامنة (true = متطابق مع السحابة، false = تعديل محلي معلق)
  backupVersions?: ChapterBackup[]; // النسخ الاحتياطية المحفوظة عند حل التعارض
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: 'google' | 'password' | 'guest';
  isAnonymous: boolean;
  createdAt: string;
}

export interface SyncConflictRecord {
  id: string;
  chapterId: string;
  chapterTitle: string;
  bookId: string;
  bookTitle: string;
  deviceALabel: string;
  deviceAContent: string;
  deviceATimestamp: number;
  deviceBLabel: string;
  deviceBContent: string;
  deviceBTimestamp: number;
  winningVersion: 'deviceA' | 'deviceB';
  resolvedAt: string;
  backupCreated: ChapterBackup;
}

export interface SyncStats {
  lastSyncTimestamp: number | null;
  pendingBooksCount: number;
  pendingChaptersCount: number;
  pendingCitationsCount: number;
  totalSyncedCount: number;
  isOnline: boolean;
  isSyncing: boolean;
}

export interface FlutterFile {
  path: string;
  name: string;
  layer: 'root' | 'core' | 'domain' | 'data' | 'presentation';
  description: string;
  code: string;
  language: 'yaml' | 'dart';
}

export interface EmotionProfile {
  selectedEmotions: string[]; // مثل: غموض، حماس، دفء، أكاديمي، إلهام
  intensityLevel: number;     // من 1.0 إلى 5.0
}

export interface StyleAnalysisResult {
  complianceScore: number;    // نسبة التوافق من 0 إلى 100%
  suggestions: string[];      // اقتراحات التحسين
  rewrittenText: string;      // النص المقترح المعدل دون استبدال النص الأصلي
  analysisNotes?: string;     // ملاحظات بلاغية إضافية
}

export interface AudioTrack {
  chapterId: string;
  chapterTitle: string;
  audioFilePath: string;
  durationMs: number;         // مدة المسار بالملي ثانية
  durationFormatted: string;  // مدة المسار بصيغة دقيقة:ثانية (مثل: 04:30)
  totalChunks?: number;       // عدد المقاطع الصوتية الموزعة
  fileSizeBytes?: number;     // حجم الملف الصوتي المحلي بالبايت
}

export interface TtsConfiguration {
  language: string;           // ar-SA أو ar الفصحى
  pitch: number;              // درجة الصوت (Pitch من 0.5 إلى 2.0)
  speechRate: number;         // سرعة القراءة (Speech Rate من 0.25 إلى 2.0)
  volume: number;             // مستوى الصوت (0.0 إلى 1.0)
  voiceName?: string;         // الصوت العربي المعتمد
}

export interface ProofreadingError {
  original: string;
  suggestion: string;
  errorType: 'spelling' | 'grammar' | 'punctuation' | 'style';
  explanation: string;
  position?: string;
}

export interface InlineSuggestionResult {
  type: 'autocomplete' | 'summary' | 'proofreading' | 'chat';
  completion?: string;
  summary?: string;
  keyPoints?: string[];
  tone?: string;
  errors?: ProofreadingError[];
  correctedText?: string;
  reply?: string;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // تمثيل DateTime
  relatedChapterId?: string;
  suggestionType?: 'autocomplete' | 'summary' | 'proofreading' | 'chat';
  resultData?: InlineSuggestionResult;
}

