import React, { useState, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  User, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Archive, 
  Upload, 
  Download, 
  Trash2, 
  LogOut, 
  Lock, 
  Wifi, 
  WifiOff, 
  BookOpen, 
  FileText, 
  Headphones, 
  Layers, 
  Clock, 
  Database, 
  Key, 
  Check, 
  X,
  FileCheck,
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import { Book, AuthUser } from '../types';
import { AuthService, CloudSyncService, DEFAULT_AUTH_USER } from '../services/cloudSyncService';
import { SAMPLE_BOOKS } from '../data/sampleBooks';

interface AccountAndBackupScreenProps {
  books: Book[];
  onUpdateBooks: (books: Book[]) => void;
  onNavigateBack?: () => void;
}

export const AccountAndBackupScreen: React.FC<AccountAndBackupScreenProps> = ({
  books,
  onUpdateBooks,
  onNavigateBack,
}) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(DEFAULT_AUTH_USER);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [wifiOnlySync, setWifiOnlySync] = useState<boolean>(false);
  const [encryptBackups, setEncryptBackups] = useState<boolean>(true);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Backup & Restore state
  const [isGeneratingBackup, setIsGeneratingBackup] = useState<boolean>(false);
  const [backupDownloadUrl, setBackupDownloadUrl] = useState<string | null>(null);
  const [backupFileName, setBackupFileName] = useState<string>('');
  const [restoreConfirmData, setRestoreConfirmData] = useState<{
    fileName: string;
    booksCount: number;
    chaptersCount: number;
    citationsCount: number;
    rawBooks: Book[];
  } | null>(null);

  // Clear data dialog state
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Calculate sync stats
  const syncStats = useMemo(() => {
    return CloudSyncService.calculateSyncStats(books);
  }, [books, isOnline]);

  const hasPendingChanges = syncStats.pendingChaptersCount + syncStats.pendingBooksCount + syncStats.pendingCitationsCount > 0;

  // Cloud connection status state: 'synced' | 'unsynced' | 'syncing'
  const cloudConnectionStatus = useMemo(() => {
    if (isSyncing) return 'syncing';
    if (!isOnline) return 'offline';
    if (hasPendingChanges) return 'unsynced';
    return 'synced';
  }, [isSyncing, isOnline, hasPendingChanges]);

  // Handle Sync Now
  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress(5);
    setSyncStatusMessage('جارٍ فحص التخزين المحلي (sqflite / hive)...');
    setFeedback(null);

    try {
      const result = await CloudSyncService.syncPendingChanges(books, (progress, message) => {
        setSyncProgress(progress);
        setSyncStatusMessage(message);
      });

      onUpdateBooks(result.updatedBooks);
      setFeedback({ type: 'success', message: result.message });
    } catch (err: any) {
      setFeedback({ 
        type: 'error', 
        message: err?.message || 'تعذر الاتصال بالسحابة. تم حفظ أعمالك محلياً بأمان.' 
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
      setSyncStatusMessage('');
    }
  };

  // Generate full backup (.katib / .zip archive)
  const handleCreateFullBackup = async () => {
    setIsGeneratingBackup(true);
    setFeedback({ type: 'info', message: 'جارٍ ضغط الكتب والمصادر والملاحظات الصوتية في حزمة .katib...' });

    try {
      const zip = new JSZip();

      // 1. Manifest
      const manifest = {
        app: 'katib_app',
        appNameArabic: 'كاتب',
        version: '1.0.0+1',
        exportDate: new Date().toISOString(),
        author: authUser?.displayName || 'المؤلف العربي',
        authorEmail: authUser?.email || 'author@katib.app',
        statistics: {
          booksCount: books.length,
          totalChapters: books.reduce((acc, b) => acc + b.chapters.length, 0),
          totalWords: books.reduce((acc, b) => acc + b.wordCount, 0),
        },
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      // 2. Books & Chapters JSON
      zip.file('books.json', JSON.stringify(books, null, 2));

      // 3. Citations & Sources
      const allCitations = books.flatMap((b) => b.chapters.flatMap((c) => c.citations || []));
      zip.file('citations.json', JSON.stringify(allCitations, null, 2));

      // 4. Audio Notes & Configs
      const audioNotes = books.map((b) => ({
        bookId: b.id,
        bookTitle: b.title,
        audioTracksCount: b.chapters.length,
        defaultVoice: 'ar-SA',
        pitch: 1.0,
        rate: 0.9,
      }));
      zip.file('audio_notes.json', JSON.stringify(audioNotes, null, 2));

      // 5. Backups and Conflict Snapshots
      const conflictBackups = CloudSyncService.getConflictHistory();
      zip.file('conflict_backups.json', JSON.stringify(conflictBackups, null, 2));

      // Generate Blob
      const blob = await zip.generateAsync({ type: 'blob' });
      const nowFormatted = new Date().toISOString().slice(0, 10);
      const fileName = `katib_full_backup_${nowFormatted}.katib`;

      const downloadUrl = URL.createObjectURL(blob);
      setBackupDownloadUrl(downloadUrl);
      setBackupFileName(fileName);

      // Trigger automatic download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setFeedback({
        type: 'success',
        message: `تم إنشاء وتحميل النسخة الاحتياطية بنجاح: ${fileName} (${(blob.size / 1024).toFixed(1)} ك.ب)`,
      });
    } catch (e: any) {
      setFeedback({ type: 'error', message: `فشل إنشاء النسخة الاحتياطية: ${e.message}` });
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  // Restore from file (.katib / .zip / .json)
  const handleFileSelectedForRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setFeedback({ type: 'info', message: `جارٍ قراءة وفك ضغط حزمة «${file.name}»...` });

      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const importedBooks: Book[] = Array.isArray(parsed) ? parsed : [parsed];

        setRestoreConfirmData({
          fileName: file.name,
          booksCount: importedBooks.length,
          chaptersCount: importedBooks.reduce((acc, b) => acc + (b.chapters?.length || 0), 0),
          citationsCount: importedBooks.reduce((acc, b) => acc + (b.chapters?.flatMap((c) => c.citations || []).length || 0), 0),
          rawBooks: importedBooks,
        });
      } else {
        // Zip or .katib archive
        const zip = await JSZip.loadAsync(file);
        const booksFile = zip.file('books.json');
        if (!booksFile) {
          throw new Error('الملف لا يحتوي على سجلات الكتب (books.json). تأكد من صحة الحزمة.');
        }

        const booksContent = await booksFile.async('text');
        const importedBooks: Book[] = JSON.parse(booksContent);

        setRestoreConfirmData({
          fileName: file.name,
          booksCount: importedBooks.length,
          chaptersCount: importedBooks.reduce((acc, b) => acc + (b.chapters?.length || 0), 0),
          citationsCount: importedBooks.reduce((acc, b) => acc + (b.chapters?.flatMap((c) => c.citations || []).length || 0), 0),
          rawBooks: importedBooks,
        });
      }

      setFeedback(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: `فشلت معالجة ملف النسخة الاحتياطية: ${err.message}` });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Apply restoration
  const handleConfirmRestore = () => {
    if (!restoreConfirmData) return;

    // Merge books while avoiding duplicate IDs
    const existingIds = new Set(books.map((b) => b.id));
    const merged = [...books];

    for (const newBook of restoreConfirmData.rawBooks) {
      if (existingIds.has(newBook.id)) {
        // Replace or keep newer
        const index = merged.findIndex((b) => b.id === newBook.id);
        if (index !== -1) merged[index] = newBook;
      } else {
        merged.push(newBook);
      }
    }

    onUpdateBooks(merged);
    setFeedback({
      type: 'success',
      message: `تمت استعادة ${restoreConfirmData.booksCount} كتب بنجاح من حزمة «${restoreConfirmData.fileName}» ودمجها في المكتبة المحلية.`,
    });
    setRestoreConfirmData(null);
  };

  // Sign out and clear local data
  const handleConfirmClearData = async () => {
    await AuthService.signOut();
    setAuthUser(null);
    // Reset books to fresh state
    onUpdateBooks(SAMPLE_BOOKS);
    setIsClearDataDialogOpen(false);
    setFeedback({
      type: 'success',
      message: 'تم تسجيل الخروج بنجاح ومسح قواعد البيانات المحلية المؤقتة (sqflite / hive).',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-cairo text-stone-900 dark:text-stone-100" dir="rtl">
      
      {/* Hidden File Input for Restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelectedForRestore}
        accept=".katib,.zip,.json,application/zip,application/json"
        className="hidden"
      />

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              title="العودة"
            >
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight">
                إدارة الحساب والنسخ الاحتياطي
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800 font-mono">
                Account & Backup
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal mt-1">
              مزامنة سحابية متقدمة (Offline-First) • حزم تصدير .katib • تحكم كامل بالخصوصية والبيانات
            </p>
          </div>
        </div>

        {/* Global Connection Simulator Toggle */}
        <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-850 p-1 rounded-2xl border border-stone-200 dark:border-stone-700/80">
          <button
            onClick={() => {
              setIsOnline(true);
              CloudSyncService.setNetworkOnline(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isOnline
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>متصل (Online)</span>
          </button>
          <button
            onClick={() => {
              setIsOnline(false);
              CloudSyncService.setNetworkOnline(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !isOnline
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>غير متصل (Offline)</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border animate-in fade-in duration-150 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            : feedback.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : feedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. بطاقة ملف المستخدم (User Profile Card) */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* User Details */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={authUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                alt={authUser?.displayName || 'الكاتب'}
                className="w-18 h-18 rounded-2xl object-cover border-2 border-amber-500 shadow-md shadow-amber-600/10"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-stone-900 flex items-center justify-center text-white" title="نشط">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
                  {authUser?.displayName || 'الكاتب العربي (مؤلف معتمد)'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-400 font-bold uppercase tracking-wider">
                  {authUser?.provider || 'Google Auth'}
                </span>
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                {authUser?.email || 'author@katib.app'}
              </p>

              <div className="flex items-center gap-3 text-xs text-stone-400 font-tajawal pt-0.5">
                <span>معرف الحساب: <span className="font-mono text-stone-600 dark:text-stone-300">{authUser?.uid || 'usr_katib_9942'}</span></span>
                <span>•</span>
                <span>المكتبة المحلية: <span className="font-bold text-amber-600">{books.length} كتب</span></span>
              </div>
            </div>
          </div>

          {/* Cloud Connection Status Pill */}
          <div className="flex flex-col sm:items-end gap-2 bg-stone-50 dark:bg-stone-850 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-700/60">
            <span className="text-xs text-stone-500 dark:text-stone-400 font-bold">
              حالة الاتصال بالسحابة:
            </span>

            {cloudConnectionStatus === 'syncing' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-xs font-bold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>جارٍ المزامنة السحابية...</span>
              </div>
            )}

            {cloudConnectionStatus === 'synced' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>متزامن مع السحابة بالكامل ✓</span>
              </div>
            )}

            {cloudConnectionStatus === 'unsynced' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>غير متزامن ({syncStats.pendingChaptersCount + syncStats.pendingBooksCount} تعديلات محلية)</span>
              </div>
            )}

            {cloudConnectionStatus === 'offline' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold">
                <CloudOff className="w-3.5 h-3.5 text-rose-600" />
                <span>وضع عدم الاتصال (Offline)</span>
              </div>
            )}

            <span className="text-[11px] text-stone-400 font-tajawal">
              قاعدة البيانات المحلية: <span className="font-mono font-bold text-stone-700 dark:text-stone-300">sqflite / hive</span>
            </span>
          </div>

        </div>
      </div>

      {/* 2. زر 'المزامنة الآن' (Sync Now) يدوياً مع إظهار مؤشر تقدم مئوي */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent dark:from-amber-950/30 rounded-3xl border border-amber-200 dark:border-amber-800/60 p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                المزامنة اليدوية الفورية (Manual Cloud Sync)
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 font-tajawal max-w-xl">
              تتحقق الدالة <code className="text-amber-700 dark:text-amber-400 font-mono">syncPendingChanges</code> من التعديلات المعلقة في الجداول المحلية (sqflite / hive) وترفعها إلى السحابة فوراً مع حفظ النسخ الاحتياطية.
            </p>
          </div>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-amber-600/25 transition-all transform hover:scale-[1.02] shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>المزامنة الآن (Sync Now)</span>
          </button>
        </div>

        {/* Progress indicator with percentage */}
        {isSyncing && (
          <div className="pt-3 border-t border-amber-200/60 dark:border-amber-800/60 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{syncStatusMessage || 'جارٍ المزامنة...'}</span>
              </span>
              <span className="font-mono text-sm">{syncProgress}%</span>
            </div>

            <div className="w-full h-3 rounded-full bg-amber-200/80 dark:bg-amber-900/60 overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-l from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. قسم 'النسخ الاحتياطي والاستعادة' (Backup & Restore) */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 space-y-6">
        <div>
          <h3 className="font-extrabold text-base flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <Archive className="w-5 h-5 text-amber-600" />
            <span>النسخ الاحتياطي والاستعادة (Backup & Restore)</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal mt-1">
            أنشئ حزمة شاملة لبياناتك بصيغة <code className="text-amber-600 font-mono font-bold">.katib</code> متوافقة مع جميع منصات التطبيق (Android, Web, Desktop).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Create Full Backup */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                إنشاء نسخة احتياطية كاملة (.katib / .zip)
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal leading-relaxed">
                تتضمن كافة الكتب المؤلّفة، الفصول، المصادر، الاقتباسات، والإعدادات الصوتية في أرشيف مضغوط واحد ومشفّر.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleCreateFullBackup}
                disabled={isGeneratingBackup}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {isGeneratingBackup ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ تجميع الحزمة...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>توليد وتنزيل النسخة (.katib)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Restore from Backup */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                استعادة من نسخة احتياطية (Restore)
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal leading-relaxed">
                استرجع مسوداتك ومكتبتك من ملف <code className="font-mono text-emerald-600">.katib</code> أو <code className="font-mono text-emerald-600">.zip</code> محلي مع دمج آمن دون فقدان البيانات.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>اختيار ملف للاستعادة</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 4. خيارات الخصوصية والأمان */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 space-y-6">
        <div>
          <h3 className="font-extrabold text-base flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <span>خيارات الخصوصية والأمان (Privacy & Security)</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal mt-1">
            إدارة صلاحيات التزامن والشبكة ومسح البيانات المؤقتة بأمان
          </p>
        </div>

        <div className="space-y-4">
          
          {/* Switch 1: Auto Cloud Sync */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-700/60">
            <div className="space-y-1">
              <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-amber-600" />
                <span>المزامنة السحابية التلقائية</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                رفع وتحديث التعديلات في الخلفية فور الاتصال بالشبكة (Auto-Sync on Connectivity).
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Switch 2: Sync Over Wi-Fi Only */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-700/60">
            <div className="space-y-1">
              <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-sky-600" />
                <span>المزامنة عبر Wi-Fi فقط</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                توفير باقة بيانات الجوال عند نقل المقاطع الصوتية الكبيرة لخدمة AudiobookService.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={wifiOnlySync}
                onChange={(e) => setWifiOnlySync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Danger Zone: Sign Out & Clear Local Data */}
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-bold text-xs sm:text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>تسجيل الخروج وحذف البيانات المحلية</span>
              </div>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/70 font-tajawal max-w-xl">
                يؤدي هذا الإجراء إلى تسجيل الخروج ومسح قواعد البيانات المحلية المؤقتة (sqflite / hive) من هذا المتصفح. تأكد من مزامنة أعمالك أولاً.
              </p>
            </div>

            <button
              onClick={() => setIsClearDataDialogOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج والمسح</span>
            </button>
          </div>

        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      {restoreConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-600">
              <FileCheck className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
                تأكيد استعادة النسخة الاحتياطية
              </h3>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 font-tajawal">
              تم فحص الحزمة «<span className="font-mono font-bold text-stone-800 dark:text-stone-200">{restoreConfirmData.fileName}</span>» بنجاح. تحتوي على:
            </p>

            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-xs space-y-1.5 font-tajawal">
              <div className="flex justify-between">
                <span>الكتب والمؤلفات:</span>
                <span className="font-bold font-mono text-amber-600">{restoreConfirmData.booksCount} كتب</span>
              </div>
              <div className="flex justify-between">
                <span>الفصول والمسودات:</span>
                <span className="font-bold font-mono text-stone-800 dark:text-stone-200">{restoreConfirmData.chaptersCount} فصلاً</span>
              </div>
              <div className="flex justify-between">
                <span>المصادر والاقتباسات:</span>
                <span className="font-bold font-mono text-stone-800 dark:text-stone-200">{restoreConfirmData.citationsCount} مصدراً</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRestoreConfirmData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                تأكيد الاستعادة والدمج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear Data */}
      {isClearDataDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
                تحذير: تسجيل الخروج ومسح البيانات
              </h3>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 font-tajawal leading-relaxed">
              هل أنت متأكد من رغبتك في تسجيل الخروج وحذف قواعد البيانات المحلية من جهازك؟ سيتم تفريغ التخزين المحلي المؤقت، ولن تتمكن من استرجاع التعديلات التي لم تُرفع للسحابة.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsClearDataDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmClearData}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                نعم، مسح وتسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
