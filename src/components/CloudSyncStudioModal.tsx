import React, { useState, useMemo } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Clock, 
  Database, 
  User, 
  LogIn, 
  LogOut, 
  Copy, 
  Check, 
  X, 
  History, 
  Layers, 
  Sparkles, 
  Code2, 
  ArrowRightLeft,
  HardDrive,
  FileText,
  Bookmark,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Book, Chapter, Citation, ChapterBackup, AuthUser, SyncConflictRecord } from '../types';
import { AuthService, CloudSyncService, DEFAULT_AUTH_USER } from '../services/cloudSyncService';

interface CloudSyncStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onUpdateBooks: (books: Book[]) => void;
  currentBookId?: string;
}

type StudioTab = 'engine' | 'conflicts' | 'auth' | 'dart';

export const CloudSyncStudioModal: React.FC<CloudSyncStudioModalProps> = ({
  isOpen,
  onClose,
  books,
  onUpdateBooks,
  currentBookId,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('engine');
  const [authUser, setAuthUser] = useState<AuthUser | null>(DEFAULT_AUTH_USER);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>('');
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dart code viewer tab
  const [selectedDartFile, setSelectedDartFile] = useState<'service' | 'auth' | 'metadata' | 'backup'>('service');
  const [copiedDartCode, setCopiedDartCode] = useState<boolean>(false);

  // Conflict simulator state
  const [simChapterId, setSimChapterId] = useState<string>(() => {
    return books[0]?.chapters[0]?.id || 'c1';
  });
  const [deviceAContent, setDeviceAContent] = useState<string>(
    'صياغة معدلة من حاسوب الكاتب (MacBook): أضاف الكاتب هنا فقرة تحليلية حول دلالات التشبيه في النثر العربي القديم، مع تعميق الشرح اللغوي.'
  );
  const [deviceBContent, setDeviceBContent] = useState<string>(
    'صياغة معدلة من الجهاز اللوحي (Galaxy Tab): أضاف الكاتب هنا بعد 4 دقائق أمثلة تطبيقية من مقامات الحريري وشواهد بلاغية معاصرة.'
  );
  const [deviceATimeOffsetMinutes, setDeviceATimeOffsetMinutes] = useState<number>(10);
  const [deviceBTimeOffsetMinutes, setDeviceBTimeOffsetMinutes] = useState<number>(2); // More recent
  const [conflictLogs, setConflictLogs] = useState<SyncConflictRecord[]>(() => CloudSyncService.getConflictHistory());
  const [selectedBackupForCompare, setSelectedBackupForCompare] = useState<ChapterBackup | null>(null);

  // Authentication inputs
  const [emailInput, setEmailInput] = useState<string>('author.arab@katib.app');
  const [passInput, setPassInput] = useState<string>('••••••••');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Calculate sync stats
  const syncStats = useMemo(() => {
    return CloudSyncService.calculateSyncStats(books);
  }, [books, isOnline]);

  const targetBook = useMemo(() => {
    return books.find((b) => b.id === currentBookId) || books[0];
  }, [books, currentBookId]);

  if (!isOpen) return null;

  // Toggle online/offline simulation
  const handleToggleOnline = (online: boolean) => {
    setIsOnline(online);
    CloudSyncService.setNetworkOnline(online);
    setSyncFeedback({
      type: online ? 'success' : 'error',
      text: online 
        ? 'تم تفعيل الاتصال بالإنترنت (Online) — محرك المزامنة جاهز لنقل البيانات.' 
        : 'تم التحويل إلى وضع عدم الاتصال (Offline) — التعديلات ستُحفظ محلياً في sqflite/hive أولاً.'
    });
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  // Perform syncPendingChanges
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncProgress(5);
    setSyncStatusMessage('بدء دورة المزامنة السحابية...');
    setSyncFeedback(null);

    try {
      const result = await CloudSyncService.syncPendingChanges(books, (progress, message) => {
        setSyncProgress(progress);
        setSyncStatusMessage(message);
      });

      onUpdateBooks(result.updatedBooks);
      setSyncFeedback({ type: 'success', text: result.message });
    } catch (err: any) {
      setSyncFeedback({ 
        type: 'error', 
        text: err?.message || 'فشلت المزامنة. تأكد من اتصالك بالإنترنت.' 
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
      setSyncStatusMessage('');
    }
  };

  // Add a test local pending change to demonstrate offline-first behavior
  const handleCreateTestLocalChange = () => {
    if (!targetBook || !targetBook.chapters[0]) return;
    const firstChapter = targetBook.chapters[0];
    const timestampStr = new Date().toLocaleTimeString('ar-SA');
    const updatedContent = `${firstChapter.content || firstChapter.plainText}\n\n[إضافة محلية بانتظار المزامنة السحابية - ${timestampStr}]`;

    const updated = CloudSyncService.modifyChapterLocally(
      books,
      targetBook.id,
      firstChapter.id,
      updatedContent
    );

    onUpdateBooks(updated);
    setSyncFeedback({
      type: 'success',
      text: 'تم حفظ التعديل في قاعدة البيانات المحلية أولاً (sqflite / hive) ووُسم بـ isSynced: false في انتظار المزامنة.'
    });
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Execute Conflict Resolution Simulation
  const handleSimulateConflict = () => {
    if (!targetBook) return;

    const baseTime = Date.now();
    const timeA = baseTime - deviceATimeOffsetMinutes * 60 * 1000;
    const timeB = baseTime - deviceBTimeOffsetMinutes * 60 * 1000;

    const { updatedBooks, conflictRecord } = CloudSyncService.resolveChapterConflict(
      books,
      targetBook.id,
      simChapterId,
      {
        name: 'جهاز أ (حاسوب الكاتب المحمول)',
        deviceId: 'macbook_pro_author',
        content: deviceAContent,
        timestamp: timeA,
      },
      {
        name: 'جهاز ب (الجهاز اللوحي المتنقل)',
        deviceId: 'galaxy_tab_author',
        content: deviceBContent,
        timestamp: timeB,
      }
    );

    onUpdateBooks(updatedBooks);
    setConflictLogs((prev) => [conflictRecord, ...prev]);

    setSyncFeedback({
      type: 'success',
      text: `تم حل التعارض بنجاح! تم اعتماد نسخة "${conflictRecord.winningVersion === 'deviceA' ? 'جهاز أ' : 'جهاز ب'}" لكونها الأحدث، مع إنشاء نسخة احتياطية آمنة (ChapterBackup) للتعديل الآخر.`
    });
  };

  // Restore previous backup version
  const handleRestoreBackup = (backupId: string) => {
    if (!targetBook) return;
    const restored = CloudSyncService.restoreBackupVersion(
      books,
      targetBook.id,
      simChapterId,
      backupId
    );
    onUpdateBooks(restored);
    setSelectedBackupForCompare(null);
    setSyncFeedback({
      type: 'success',
      text: 'تمت استعادة النسخة الاحتياطية بنجاح إلى المحرر ووسمها كتعديل محلي غير متزامن.'
    });
  };

  // Auth actions
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const user = await AuthService.signInWithGoogle();
      setAuthUser(user);
      setSyncFeedback({ type: 'success', text: `تم تسجيل الدخول بنجاح بحساب Google: ${user.email}` });
    } catch {
      setSyncFeedback({ type: 'error', text: 'فشل تسجيل الدخول بـ Google.' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const user = await AuthService.signInWithEmailAndPassword(emailInput, passInput);
      setAuthUser(user);
      setSyncFeedback({ type: 'success', text: `تم تسجيل الدخول بنجاح بالبريد: ${user.email}` });
    } catch {
      setSyncFeedback({ type: 'error', text: 'فشل تسجيل الدخول.' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await AuthService.signOut();
    setAuthUser(null);
    setSyncFeedback({ type: 'success', text: 'تم تسجيل الخروج بنجاح.' });
  };

  // Code snippets for Dart tab
  const dartCodeMap = {
    service: `// lib/features/sync/data/services/cloud_sync_service.dart
// محرك المزامنة المزدوجة (Offline-First Sync Engine)
class CloudSyncService {
  final FirebaseFirestore _firestore;
  final Database _localDb;
  final Connectivity _connectivity;

  Future<SyncResult> syncPendingChanges({required String userId}) async {
    final isOnline = await checkInternetConnection();
    if (!isOnline) {
      return SyncResult(success: false, message: 'الجهاز في وضع عدم الاتصال');
    }

    // استعلام العناصر غير المزامنة من sqflite / hive
    final pendingChapters = await _localDb.query(
      'chapters', 
      where: 'isSynced = ?', 
      whereArgs: [0]
    );

    for (final ch in pendingChapters) {
      await _syncChapterWithConflictCheck(ch);
    }
    return SyncResult(success: true, syncedCount: pendingChapters.length);
  }
}`,
    auth: `// lib/features/sync/data/services/auth_service.dart
// إدارة تسجيل الدخول عبر Google والبريد (firebase_auth)
class AuthService {
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;

  Future<UserCredential?> signInWithGoogle() async {
    final GoogleAuthProvider provider = GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    return await _firebaseAuth.signInWithProvider(provider);
  }

  Future<UserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    return await _firebaseAuth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
  }
}`,
    metadata: `// lib/features/sync/domain/entities/sync_metadata.dart
// واجهة الكيان القابل للمزامنة مع حقول lastModified و isSynced
abstract class SyncableEntity extends Equatable {
  final DateTime lastModified;
  final bool isSynced;

  const SyncableEntity({
    required this.lastModified,
    required this.isSynced,
  });
}`,
    backup: `// lib/features/sync/domain/entities/chapter_backup.dart
// حفظ نسخة احتياطية من التعديل السابق عند حل التعارضات
class ChapterBackup extends Equatable {
  final String id;
  final String chapterId;
  final String content;
  final DateTime timestamp;
  final String deviceId;
  final String deviceName;
  final String reason;
}`
  };

  const handleCopyDart = () => {
    navigator.clipboard.writeText(dartCodeMap[selectedDartFile]);
    setCopiedDartCode(true);
    setTimeout(() => setCopiedDartCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden text-stone-900 dark:text-stone-100 font-cairo"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4 bg-stone-50/70 dark:bg-stone-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-stone-900 dark:text-stone-100">
                  خدمة إدارة الحسابات والمزامنة السحابية
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                  Offline-First Sync Engine
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                حفظ محلي في SQLite/Hive • رفع تلقائي للتعديلات المعلقة • حل التعارضات مع حفظ نسخ احتياطية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Online / Offline Switch */}
            <button
              onClick={() => handleToggleOnline(!isOnline)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors shadow-xs ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
              }`}
              title="محاكاة تشغيل وإيقاف شبكة الإنترنت لتجربة معمارية Offline-First"
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'متصل (Online)' : 'غير متصل (Offline)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('engine')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'engine'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>محرك المزامنة (Offline-First)</span>
            {syncStats.pendingChaptersCount + syncStats.pendingBooksCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-mono">
                {syncStats.pendingChaptersCount + syncStats.pendingBooksCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('conflicts')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'conflicts'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>معمل حل التعارضات (Conflict Resolution)</span>
          </button>

          <button
            onClick={() => setActiveTab('auth')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'auth'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>الحسابات والمصادقة (Firebase Auth)</span>
          </button>

          <button
            onClick={() => setActiveTab('dart')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'dart'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-600" />
            <span>أكواد Flutter & Clean Architecture</span>
          </button>
        </div>

        {/* Sync Progress Bar */}
        {isSyncing && (
          <div className="w-full bg-amber-100 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 p-2.5 px-6 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{syncStatusMessage || 'جارِ المزامنة...'}</span>
              </span>
              <span className="font-mono">{syncProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-amber-200 dark:bg-amber-900 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-l from-amber-500 to-amber-600 transition-all duration-300 rounded-full"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Global Feedback Banner */}
        {syncFeedback && (
          <div className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 border-b animate-in fade-in ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}>
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{syncFeedback.text}</span>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: Offline-First Sync Engine */}
          {activeTab === 'engine' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
                    <span>حالة الاتصال</span>
                    {isOnline ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-rose-500" />}
                  </div>
                  <div className={`text-base font-bold ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isOnline ? 'متصل بالسحابة' : 'وضع عدم الاتصال'}
                  </div>
                  <p className="text-[11px] text-stone-400 font-tajawal mt-1">
                    {isOnline ? 'تزامن نشط مع Firestore' : 'حفظ فوري في SQLite/Hive'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
                    <span>التعديلات المعلقة</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {syncStats.pendingChaptersCount + syncStats.pendingBooksCount + syncStats.pendingCitationsCount}
                  </div>
                  <p className="text-[11px] text-stone-400 font-tajawal mt-1">
                    عناصر تنتظر syncPendingChanges
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
                    <span>العناصر المزامنة</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {syncStats.totalSyncedCount}
                  </div>
                  <p className="text-[11px] text-stone-400 font-tajawal mt-1">
                    كتب وفصول ومصادر مطابقة
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
                    <span>قاعدة البيانات</span>
                    <Database className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="text-base font-bold text-sky-600 dark:text-sky-400">
                    sqflite & hive
                  </div>
                  <p className="text-[11px] text-stone-400 font-tajawal mt-1">
                    معمارية Offline-First المزدوجة
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-amber-600/25 transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>رفع ومزامنة التعديلات (syncPendingChanges)</span>
                  </button>

                  <button
                    onClick={handleCreateTestLocalChange}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 text-xs font-semibold shadow-xs"
                    title="إجراء تعديل محلي لاختبار وسم isSynced: false"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>إجراء تعديل محلي تجريبي</span>
                  </button>
                </div>

                <div className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                  آخر فحص سحابي: <span className="font-mono text-stone-700 dark:text-stone-200">منذ دقيقتين</span>
                </div>
              </div>

              {/* Queue of Books & Chapters with isSynced & lastModified badges */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>سجلات التخزين المحلي والمزامنة (Books, Chapters & Citations)</span>
                  </h3>
                  <span className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                    تتبع حقول <code className="text-amber-600 font-mono">lastModified</code> و <code className="text-amber-600 font-mono">isSynced</code>
                  </span>
                </div>

                <div className="space-y-3">
                  {books.map((book) => {
                    const isBookSynced = book.isSynced !== false;
                    return (
                      <div 
                        key={book.id}
                        className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 p-4 transition-all hover:border-amber-400"
                      >
                        {/* Book Header */}
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <Bookmark className="w-4 h-4 text-amber-600" />
                            <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                              {book.title}
                            </span>
                            <span className="text-xs text-stone-400 font-tajawal">
                              ({book.author})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-stone-400 font-mono">
                              lastModified: {book.lastModified}
                            </span>
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              isBookSynced
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                            }`}>
                              {isBookSynced ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              <span>{isBookSynced ? 'isSynced: true' : 'isSynced: false (معلق)'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Chapters List */}
                        <div className="space-y-2 pr-4 border-r-2 border-stone-200 dark:border-stone-700">
                          {book.chapters.map((ch) => {
                            const isChSynced = ch.isSynced !== false;
                            const hasBackups = ch.backupVersions && ch.backupVersions.length > 0;

                            return (
                              <div 
                                key={ch.id}
                                className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 flex items-center justify-between gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-stone-800 dark:text-stone-200">
                                      {ch.title}
                                    </span>
                                    {hasBackups && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                                        {ch.backupVersions?.length} نسخ احتياطية للتعارض
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-tajawal truncate max-w-xl">
                                    {ch.plainText || ch.content || 'لا يوجد نص'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-stone-400 font-mono">
                                    {ch.lastModified || 'تعديل محفوظ'}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    isChSynced
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-mono'
                                  }`}>
                                    {isChSynced ? 'متزامن ✓' : 'معلق محلياً ⏱'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Conflict Resolution Lab */}
          {activeTab === 'conflicts' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="font-bold text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>استراتيجية معالجة التعارضات (Conflict Resolution Strategy)</span>
                </div>
                <p className="font-tajawal leading-relaxed">
                  عند قيام الكاتب بتعديل نفس الفصل من جهازين مختلفين (مثلاً من الحاسوب الشخصي والهاتف المتنقل أثناء انقطاع الشبكة)، يعتمد محرك المزامنة استراتيجية <strong>الأحدثية الزمنية (Last-Write-Wins)</strong> تلقائياً، مع تطبيق الميزة الأهم: <strong>الاحتفاظ بنسخة احتياطية آمنة (ChapterBackup)</strong> من التعديل السابق في سجل النسخ لضمان عدم ضياع أي كلمة.
                </p>
              </div>

              {/* Simulation Sandbox Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Device A */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-2 text-sky-600 dark:text-sky-400">
                      <Laptop className="w-4 h-4" />
                      <span>الجهاز (أ) - حاسوب الكاتب المحمول</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      توقيت التعديل: منذ {deviceATimeOffsetMinutes} دقائق
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1 block">
                      النص المعدل على جهاز (أ):
                    </label>
                    <textarea
                      value={deviceAContent}
                      onChange={(e) => setDeviceAContent(e.target.value)}
                      rows={4}
                      className="w-full text-xs font-tajawal p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-tajawal">طابع التعديل الزمني:</span>
                    <select
                      value={deviceATimeOffsetMinutes}
                      onChange={(e) => setDeviceATimeOffsetMinutes(Number(e.target.value))}
                      className="text-xs font-mono p-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    >
                      <option value={15}>منذ 15 دقيقة</option>
                      <option value={10}>منذ 10 دقائق (أقدم)</option>
                      <option value={1}>منذ 1 دقيقة (أحدث)</option>
                    </select>
                  </div>
                </div>

                {/* Device B */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <Smartphone className="w-4 h-4" />
                      <span>الجهاز (ب) - الجهاز اللوحي المتنقل</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      توقيت التعديل: منذ {deviceBTimeOffsetMinutes} دقائق
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1 block">
                      النص المعدل على جهاز (ب):
                    </label>
                    <textarea
                      value={deviceBContent}
                      onChange={(e) => setDeviceBContent(e.target.value)}
                      rows={4}
                      className="w-full text-xs font-tajawal p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-tajawal">طابع التعديل الزمني:</span>
                    <select
                      value={deviceBTimeOffsetMinutes}
                      onChange={(e) => setDeviceBTimeOffsetMinutes(Number(e.target.value))}
                      className="text-xs font-mono p-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    >
                      <option value={15}>منذ 15 دقيقة</option>
                      <option value={2}>منذ دقيقتين (أحدث)</option>
                      <option value={0.5}>منذ 30 ثانية (أحدث جداً)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Trigger Conflict Simulation Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleSimulateConflict}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-sm shadow-lg shadow-amber-600/25 flex items-center gap-2 transition-all transform hover:scale-[1.01]"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>محاكاة مزامنة الجهازين وحل التعارض تلقائياً</span>
                </button>
              </div>

              {/* Conflict History & Backups Viewer */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-stone-700 dark:text-stone-300 flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-600" />
                  <span>سجل التعارضات المحلولة والنسخ الاحتياطية المحفوظة ({conflictLogs.length})</span>
                </h4>

                {conflictLogs.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-400 font-tajawal">
                    لم يُسجل أي تعارض بعد. اضغط على زر المحاكاة أعلاه لتجربة المعالجة التلقائية.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conflictLogs.map((log) => (
                      <div 
                        key={log.id}
                        className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>فصل: {log.chapterTitle}</span>
                          </span>
                          <span className="text-[11px] font-mono text-stone-400">
                            حُل في: {log.resolvedAt}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className={`p-3 rounded-xl border ${
                            log.winningVersion === 'deviceA' 
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                              : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 opacity-70'
                          }`}>
                            <div className="font-bold mb-1 flex items-center justify-between">
                              <span>{log.deviceALabel}</span>
                              {log.winningVersion === 'deviceA' && (
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">النسخة المعتمدة (الأحدث) ✓</span>
                              )}
                            </div>
                            <p className="text-[11px] font-tajawal line-clamp-2">{log.deviceAContent}</p>
                          </div>

                          <div className={`p-3 rounded-xl border ${
                            log.winningVersion === 'deviceB' 
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                              : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 opacity-70'
                          }`}>
                            <div className="font-bold mb-1 flex items-center justify-between">
                              <span>{log.deviceBLabel}</span>
                              {log.winningVersion === 'deviceB' && (
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">النسخة المعتمدة (الأحدث) ✓</span>
                              )}
                            </div>
                            <p className="text-[11px] font-tajawal line-clamp-2">{log.deviceBContent}</p>
                          </div>
                        </div>

                        {/* Backup copy created */}
                        <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                              <span>نسخة احتياطية محفوظة: {log.backupCreated.deviceName}</span>
                            </div>
                            <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 font-tajawal truncate max-w-md">
                              «{log.backupCreated.content.slice(0, 70)}...»
                            </p>
                          </div>

                          <button
                            onClick={() => handleRestoreBackup(log.backupCreated.id)}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                          >
                            استرجاع هذه النسخة
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: User Accounts & Auth (Firebase Auth) */}
          {activeTab === 'auth' && (
            <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-150">
              
              {authUser ? (
                /* Authenticated User Profile */
                <div className="p-6 rounded-3xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-850 space-y-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={authUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                      alt={authUser.displayName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shadow-md"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                          {authUser.displayName}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
                          جلسة نشطة ✓
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 font-mono">{authUser.email}</p>
                      <div className="text-[11px] text-stone-400 font-tajawal">
                        معرف الحساب (UID): <span className="font-mono text-stone-600 dark:text-stone-300">{authUser.uid}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-stone-500">مزود تسجيل الدخول:</span>
                      <span className="font-bold text-amber-600 uppercase">{authUser.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">حالة التخزين السحابي:</span>
                      <span className="font-bold text-emerald-600">Firestore Cloud Sync مفعل</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">المزامنة التلقائية:</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">عند استعادة الاتصال (Online)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>تسجيل الخروج</span>
                    </button>

                    <button
                      onClick={handleGoogleSignIn}
                      disabled={authLoading}
                      className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition-colors"
                    >
                      التبديل إلى حساب Google آخر
                    </button>
                  </div>
                </div>
              ) : (
                /* Sign In Form */
                <div className="p-6 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 space-y-5">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 mx-auto flex items-center justify-center mb-2">
                      <LogIn className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
                      تسجيل الدخول للمزامنة السحابية
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                      اربط حسابك للوصول إلى كتبك ومسوداتك من أي جهاز
                    </p>
                  </div>

                  {/* Google Sign-In Button */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    className="w-full py-3 px-4 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>متابعة باستخدام حساب Google (Google Sign-In)</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
                    <span className="text-[11px] text-stone-400 font-tajawal">أو عبر البريد</span>
                    <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleEmailSignIn} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                        البريد الإلكتروني:
                      </label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 focus:outline-none focus:border-amber-500 font-mono"
                        dir="ltr"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                        كلمة المرور:
                      </label>
                      <input
                        type="password"
                        value={passInput}
                        onChange={(e) => setPassInput(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 focus:outline-none focus:border-amber-500 font-mono"
                        dir="ltr"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors"
                    >
                      تسجيل الدخول / إنشاء حساب
                    </button>
                  </form>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: Dart Code & Clean Architecture */}
          {activeTab === 'dart' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDartFile('service')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      selectedDartFile === 'service'
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    cloud_sync_service.dart
                  </button>

                  <button
                    onClick={() => setSelectedDartFile('auth')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      selectedDartFile === 'auth'
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    auth_service.dart
                  </button>

                  <button
                    onClick={() => setSelectedDartFile('metadata')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      selectedDartFile === 'metadata'
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    sync_metadata.dart
                  </button>

                  <button
                    onClick={() => setSelectedDartFile('backup')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      selectedDartFile === 'backup'
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    chapter_backup.dart
                  </button>
                </div>

                <button
                  onClick={handleCopyDart}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors"
                >
                  {copiedDartCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDartCode ? 'تم النسخ!' : 'نسخ كود Dart'}</span>
                </button>
              </div>

              <div className="rounded-2xl bg-stone-900 text-stone-100 p-4 border border-stone-800 font-mono text-xs overflow-x-auto leading-relaxed" dir="ltr">
                <pre>{dartCodeMap[selectedDartFile]}</pre>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 flex items-center justify-between text-xs text-stone-500 font-tajawal">
          <div className="flex items-center gap-4">
            <span>محرك Offline-First: متوافق مع Android و Web و Desktop</span>
            <span>•</span>
            <span>قاعدة البيانات: sqflite + hive + cloud_firestore</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
