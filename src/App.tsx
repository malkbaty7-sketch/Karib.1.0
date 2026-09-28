import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LibraryHomeScreen } from './components/LibraryHomeScreen';
import { SemanticSearchScreen } from './components/SemanticSearchScreen';
import { FlutterArchitectureExplorer } from './components/FlutterArchitectureExplorer';
import { CreateBookModal } from './components/CreateBookModal';
import { ImportFileModal } from './components/ImportFileModal';
import { BookReaderModal } from './components/BookReaderModal';
import { BookEditorScreen } from './components/BookEditorScreen';
import { MindMapCanvasScreen } from './components/MindMapCanvasScreen';
import { PublishingStudioScreen } from './components/PublishingStudioScreen';
import { CloudSyncStudioModal } from './components/CloudSyncStudioModal';
import { AccountAndBackupScreen } from './components/AccountAndBackupScreen';
import { TestingAndMonitoringModal } from './components/TestingAndMonitoringModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SAMPLE_BOOKS } from './data/sampleBooks';
import { Book, DeviceFrame, ThemeMode, ActiveTab } from './types';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<ActiveTab>('app');
  const [deviceFrame, setDeviceFrame] = useState<DeviceFrame>('desktop');
  const [books, setBooks] = useState<Book[]>(SAMPLE_BOOKS);
  const [selectedEditorBookId, setSelectedEditorBookId] = useState<string>(SAMPLE_BOOKS[0]?.id || '');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isTestingModalOpen, setIsTestingModalOpen] = useState(false);
  const [readingBook, setReadingBook] = useState<Book | null>(null);

  // Compute pending items count for header badge
  const pendingSyncCount = React.useMemo(() => {
    let count = 0;
    for (const b of books) {
      if (b.isSynced === false) count++;
      for (const ch of b.chapters) {
        if (ch.isSynced === false) count++;
      }
    }
    return count;
  }, [books]);

  // Synchronize dark mode class on HTML document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleCreateBook = (newBook: Book) => {
    setBooks((prev) => [newBook, ...prev]);
  };

  const handleImportBook = (newBook: Book) => {
    setBooks((prev) => [newBook, ...prev]);
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === updatedBook.id ? updatedBook : b))
    );
    if (readingBook?.id === updatedBook.id) {
      setReadingBook(updatedBook);
    }
  };

  const handleAppendToBook = (bookId: string, chapterId: string, contentToAppend: string) => {
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id !== bookId) return book;

        const updatedChapters = book.chapters.map((ch) => {
          if (ch.id !== chapterId) return ch;
          const newContent = ch.content + contentToAppend;
          const addedWords = contentToAppend.trim().split(/\s+/).length;
          return {
            ...ch,
            content: newContent,
            wordCount: ch.wordCount + addedWords,
          };
        });

        const totalWordCount = updatedChapters.reduce((acc, c) => acc + c.wordCount, 0);

        return {
          ...book,
          chapters: updatedChapters,
          wordCount: totalWordCount,
          lastModified: 'الآن (تم تحديث الاقتباس)',
        };
      })
    );
  };

  const handleToggleFavorite = (id: string) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isFavorite: !b.isFavorite } : b))
    );
  };

  const handleDeleteBook = (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-cairo transition-colors">
      
      {/* Top Main Navigation Header */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        deviceFrame={deviceFrame}
        onSelectDevice={setDeviceFrame}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenTestingModal={() => setIsTestingModalOpen(true)}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Main View: Interactive Library Screen, Semantic Extraction Engine, or Clean Architecture Explorer */}
      <main className="flex-1 pb-16">
        {activeTab === 'app' && (
          <LibraryHomeScreen
            books={books}
            deviceFrame={deviceFrame}
            onOpenBook={(book) => {
              if (book.format === 'project') {
                setSelectedEditorBookId(book.id);
                setActiveTab('editor');
              } else {
                setReadingBook(book);
              }
            }}
            onToggleFavorite={handleToggleFavorite}
            onDeleteBook={handleDeleteBook}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
          />
        )}

        {activeTab === 'editor' && (
          <BookEditorScreen
            book={books.find((b) => b.id === selectedEditorBookId) || books[0]}
            onUpdateBook={handleUpdateBook}
            onBackToLibrary={() => setActiveTab('app')}
            onNavigateToPublishing={() => setActiveTab('publishing')}
          />
        )}

        {activeTab === 'publishing' && (
          <PublishingStudioScreen
            book={books.find((b) => b.id === selectedEditorBookId) || books[0]}
            onBackToEditor={() => setActiveTab('editor')}
          />
        )}

        {activeTab === 'mindmap' && (
          <MindMapCanvasScreen
            books={books}
            activeBookId={selectedEditorBookId}
            onSelectBook={setSelectedEditorBookId}
            onUpdateBook={handleUpdateBook}
            onNavigateToEditor={() => setActiveTab('editor')}
          />
        )}

        {activeTab === 'extraction' && (
          <SemanticSearchScreen
            books={books}
            onAppendToBook={handleAppendToBook}
          />
        )}

        {activeTab === 'architecture' && (
          <FlutterArchitectureExplorer />
        )}

        {activeTab === 'account' && (
          <AccountAndBackupScreen
            books={books}
            onUpdateBooks={setBooks}
            onNavigateBack={() => setActiveTab('app')}
          />
        )}
      </main>

      {/* Create Book Dialog */}
      <CreateBookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateBook={handleCreateBook}
      />

      {/* Import File Dialog (file_picker demonstration) */}
      <ImportFileModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportBook={handleImportBook}
      />

      {/* Interactive Reader & Chapter Editor */}
      <BookReaderModal
        book={readingBook}
        onClose={() => setReadingBook(null)}
        onUpdateBook={handleUpdateBook}
      />

      {/* Cloud Sync & Account Management Studio (CloudSyncService & Offline-First Engine) */}
      <CloudSyncStudioModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        books={books}
        onUpdateBooks={setBooks}
        currentBookId={selectedEditorBookId}
      />

      {/* QA, Testing & Performance Monitoring Studio */}
      <TestingAndMonitoringModal
        isOpen={isTestingModalOpen}
        onClose={() => setIsTestingModalOpen(false)}
      />

      {/* Subtle Bottom Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-6 px-4 text-center text-xs font-tajawal text-stone-500 dark:text-stone-400 bg-white/50 dark:bg-stone-900/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            تطبيق كاتب (Katib App) • هيكلية Clean Architecture متوافقة مع Web وDesktop وAndroid
          </span>
          <div className="flex items-center gap-4 text-xs font-cairo">
            <span>الخطوط: Cairo & Tajawal</span>
            <span>•</span>
            <span>إدارة الحالة: BLoC & Provider</span>
            <span>•</span>
            <span>المكتبات: file_picker & pdfx</span>
          </div>
        </div>
      </footer>

      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator />

    </div>
  );
}
