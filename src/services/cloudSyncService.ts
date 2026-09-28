import { Book, Chapter, Citation, ChapterBackup, AuthUser, SyncConflictRecord, SyncStats } from '../types';

// Mock initial user
export const DEFAULT_AUTH_USER: AuthUser = {
  uid: 'usr_katib_9942',
  email: 'malkbaty10@gmail.com',
  displayName: 'الكاتب العربي (محمد الباطي)',
  photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
  provider: 'google',
  isAnonymous: false,
  createdAt: '2026-01-15T10:00:00Z',
};

// Current in-memory auth state
let currentAuthUser: AuthUser | null = { ...DEFAULT_AUTH_USER };
let isNetworkOnline = true;
let conflictHistory: SyncConflictRecord[] = [];

export const AuthService = {
  getCurrentUser: (): AuthUser | null => {
    return currentAuthUser;
  },

  signInWithGoogle: async (): Promise<AuthUser> => {
    // Simulating Firebase Google Sign-In flow (GoogleAuthProvider)
    await new Promise((r) => setTimeout(r, 650));
    currentAuthUser = {
      uid: 'usr_google_' + Math.random().toString(36).substring(2, 8),
      email: 'author.google@katib.app',
      displayName: 'مؤلف معتمد (Google)',
      photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80',
      provider: 'google',
      isAnonymous: false,
      createdAt: new Date().toISOString(),
    };
    return currentAuthUser;
  },

  signInWithEmailAndPassword: async (email: string, pass: string): Promise<AuthUser> => {
    await new Promise((r) => setTimeout(r, 600));
    currentAuthUser = {
      uid: 'usr_mail_' + Math.random().toString(36).substring(2, 8),
      email: email.trim() || 'author@katib.app',
      displayName: email.split('@')[0] || 'كاتب مسجل',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      provider: 'password',
      isAnonymous: false,
      createdAt: new Date().toISOString(),
    };
    return currentAuthUser;
  },

  signOut: async (): Promise<void> => {
    await new Promise((r) => setTimeout(r, 300));
    currentAuthUser = null;
  },
};

export const CloudSyncService = {
  // Toggle network online/offline mode for simulating offline-first behavior
  setNetworkOnline: (online: boolean) => {
    isNetworkOnline = online;
  },

  getNetworkOnline: (): boolean => {
    return isNetworkOnline;
  },

  // Calculate current sync statistics across all books, chapters, and citations
  calculateSyncStats: (books: Book[]): SyncStats => {
    let pendingBooks = 0;
    let pendingChapters = 0;
    let pendingCitations = 0;
    let totalSynced = 0;

    for (const book of books) {
      if (book.isSynced === false) {
        pendingBooks++;
      } else {
        totalSynced++;
      }

      for (const ch of book.chapters) {
        if (ch.isSynced === false) {
          pendingChapters++;
        } else {
          totalSynced++;
        }

        if (ch.citations) {
          for (const cit of ch.citations) {
            if (cit.isSynced === false) {
              pendingCitations++;
            } else {
              totalSynced++;
            }
          }
        }
      }
    }

    return {
      lastSyncTimestamp: Date.now() - 1000 * 60 * 12, // 12 minutes ago by default
      pendingBooksCount: pendingBooks,
      pendingChaptersCount: pendingChapters,
      pendingCitationsCount: pendingCitations,
      totalSyncedCount: totalSynced,
      isOnline: isNetworkOnline,
      isSyncing: false,
    };
  },

  // Mark chapter as modified locally (Offline-First: saved in sqflite/hive first)
  modifyChapterLocally: (
    books: Book[],
    bookId: string,
    chapterId: string,
    newContent: string
  ): Book[] => {
    const now = Date.now();
    const nowFormatted = 'منذ لحظات (محلي غير متزامن)';

    return books.map((book) => {
      if (book.id !== bookId) return book;

      const updatedChapters = book.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch;
        return {
          ...ch,
          content: newContent,
          plainText: newContent,
          wordCount: newContent.trim().split(/\s+/).filter(Boolean).length,
          lastModified: nowFormatted,
          lastModifiedTimestamp: now,
          isSynced: false, // تم الحفظ محلياً وبانتظار المزامنة
        };
      });

      return {
        ...book,
        chapters: updatedChapters,
        lastModified: nowFormatted,
        lastModifiedTimestamp: now,
        isSynced: false,
      };
    });
  },

  // Function to sync all pending changes to the cloud
  syncPendingChanges: async (
    books: Book[],
    onProgress?: (progress: number, currentItem: string) => void
  ): Promise<{ updatedBooks: Book[]; syncedCount: number; success: boolean; message: string }> => {
    if (!isNetworkOnline) {
      throw new Error('تعذر الاتصال بالشبكة: الجهاز في وضع عدم الاتصال (Offline). التعديلات محفوظة محلياً بأمان.');
    }

    onProgress?.(10, 'التحقق من صحة جلسة المستخدم وسجلات التخزين المحلي (sqflite/hive)...');
    await new Promise((r) => setTimeout(r, 400));

    onProgress?.(35, 'حصر التعديلات المعلقة في الكتب والفصول والمصادر...');
    await new Promise((r) => setTimeout(r, 450));

    let count = 0;
    const nowTimestamp = Date.now();
    const nowFormatted = 'الآن (متزامن مع السحابة)';

    onProgress?.(70, 'رفع التعديلات إلى السحابة وتحديث طوابع المزامنة (Cloud Firestore / Supabase)...');
    await new Promise((r) => setTimeout(r, 600));

    const updatedBooks: Book[] = books.map((book) => {
      let bookWasPending = book.isSynced === false;
      if (bookWasPending) count++;

      const updatedChapters: Chapter[] = book.chapters.map((ch) => {
        let chWasPending = ch.isSynced === false;
        if (chWasPending) count++;

        const updatedCitations: Citation[] | undefined = ch.citations?.map((cit) => {
          let citWasPending = cit.isSynced === false;
          if (citWasPending) count++;
          return {
            ...cit,
            isSynced: true,
            lastModified: citWasPending ? nowFormatted : cit.lastModified,
            lastModifiedTimestamp: citWasPending ? nowTimestamp : (cit.lastModifiedTimestamp || nowTimestamp),
          };
        });

        return {
          ...ch,
          isSynced: true,
          lastModified: chWasPending ? nowFormatted : ch.lastModified,
          lastModifiedTimestamp: chWasPending ? nowTimestamp : (ch.lastModifiedTimestamp || nowTimestamp),
          citations: updatedCitations,
        };
      });

      return {
        ...book,
        isSynced: true,
        lastModified: bookWasPending ? nowFormatted : book.lastModified,
        lastModifiedTimestamp: bookWasPending ? nowTimestamp : (book.lastModifiedTimestamp || nowTimestamp),
        chapters: updatedChapters,
      };
    });

    onProgress?.(100, 'اكتملت المزامنة بنجاح وحفظت النسخ السحابية بالكامل.');
    await new Promise((r) => setTimeout(r, 300));

    return {
      updatedBooks,
      syncedCount: count,
      success: true,
      message: `تمت مزامنة ${count} عنصر بنجاح مع السحابة، وتحديث السجلات المحلية.`,
    };
  },

  // Conflict Resolution: in case the same chapter is modified from two devices
  // Saves the most recent version while preserving a backup of the previous edit!
  resolveChapterConflict: (
    books: Book[],
    bookId: string,
    chapterId: string,
    deviceA: {
      name: string;
      deviceId: string;
      content: string;
      timestamp: number;
    },
    deviceB: {
      name: string;
      deviceId: string;
      content: string;
      timestamp: number;
    }
  ): { updatedBooks: Book[]; conflictRecord: SyncConflictRecord } => {
    // 1. Determine which device has the later timestamp (Last-Write-Wins)
    const isDeviceAWinner = deviceA.timestamp >= deviceB.timestamp;
    const winningDevice = isDeviceAWinner ? deviceA : deviceB;
    const supersededDevice = isDeviceAWinner ? deviceB : deviceA;

    const book = books.find((b) => b.id === bookId);
    const chapter = book?.chapters.find((c) => c.id === chapterId);
    const chapterTitle = chapter?.title || 'فصل غير محدد';
    const bookTitle = book?.title || 'كتاب غير محدد';

    // 2. Create a backup copy of the superseded edit (حفظ نسخة احتياطية من التعديل السابق)
    const backup: ChapterBackup = {
      id: 'bak_' + Math.random().toString(36).substring(2, 9),
      chapterId,
      chapterTitle,
      content: supersededDevice.content,
      timestamp: supersededDevice.timestamp,
      formattedDate: new Date(supersededDevice.timestamp).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      deviceId: supersededDevice.deviceId,
      deviceName: supersededDevice.name,
      reason: 'conflict_resolution',
    };

    const conflictRecord: SyncConflictRecord = {
      id: 'cnf_' + Math.random().toString(36).substring(2, 9),
      chapterId,
      chapterTitle,
      bookId,
      bookTitle,
      deviceALabel: deviceA.name,
      deviceAContent: deviceA.content,
      deviceATimestamp: deviceA.timestamp,
      deviceBLabel: deviceB.name,
      deviceBContent: deviceB.content,
      deviceBTimestamp: deviceB.timestamp,
      winningVersion: isDeviceAWinner ? 'deviceA' : 'deviceB',
      resolvedAt: new Date().toLocaleTimeString('ar-SA'),
      backupCreated: backup,
    };

    conflictHistory.unshift(conflictRecord);

    // 3. Update the book and chapter with winning content + prepend backup
    const updatedBooks = books.map((b) => {
      if (b.id !== bookId) return b;

      const updatedChapters = b.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch;

        const currentBackups = ch.backupVersions || [];
        const newBackups = [backup, ...currentBackups];

        return {
          ...ch,
          content: winningDevice.content,
          plainText: winningDevice.content,
          wordCount: winningDevice.content.trim().split(/\s+/).filter(Boolean).length,
          lastModified: 'تم حل التعارض والاحتفاظ بالنسخة الأحدث',
          lastModifiedTimestamp: winningDevice.timestamp,
          isSynced: true,
          backupVersions: newBackups,
        };
      });

      return {
        ...b,
        chapters: updatedChapters,
        lastModified: 'تم تحديث الفصل عبر معالج التعارضات',
        isSynced: true,
      };
    });

    return { updatedBooks, conflictRecord };
  },

  getConflictHistory: (): SyncConflictRecord[] => {
    return conflictHistory;
  },

  // Restore a previous backup version to become the current active content
  restoreBackupVersion: (
    books: Book[],
    bookId: string,
    chapterId: string,
    backupId: string
  ): Book[] => {
    return books.map((book) => {
      if (book.id !== bookId) return book;

      const updatedChapters = book.chapters.map((ch) => {
        if (ch.id !== chapterId) return ch;

        const targetBackup = ch.backupVersions?.find((b) => b.id === backupId);
        if (!targetBackup) return ch;

        // Create a snapshot of current before restoring
        const currentAsBackup: ChapterBackup = {
          id: 'bak_' + Math.random().toString(36).substring(2, 9),
          chapterId: ch.id,
          chapterTitle: ch.title,
          content: ch.content || '',
          timestamp: Date.now(),
          formattedDate: new Date().toLocaleTimeString('ar-SA'),
          deviceId: 'local_device',
          deviceName: 'الجهاز الحالي (قبل الاسترجاع)',
          reason: 'manual_snapshot',
        };

        const updatedBackups = [currentAsBackup, ...(ch.backupVersions || [])];

        return {
          ...ch,
          content: targetBackup.content,
          plainText: targetBackup.content,
          wordCount: targetBackup.content.trim().split(/\s+/).filter(Boolean).length,
          lastModified: `تمت استعادة نسخة: ${targetBackup.deviceName}`,
          lastModifiedTimestamp: Date.now(),
          isSynced: false, // يحتاج إلى مزامنة بعد الاستعادة
          backupVersions: updatedBackups,
        };
      });

      return {
        ...book,
        chapters: updatedChapters,
        isSynced: false,
      };
    });
  },
};
