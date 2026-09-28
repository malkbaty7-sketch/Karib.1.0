import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import '../../features/editor/domain/entities/chapter_model.dart';
import '../../features/editor/domain/entities/citation_model.dart';

/// مساعد إدارة قاعدة البيانات المحلية (DatabaseHelper) لتطبيق katib_app
/// يوفر عمليات الـ CRUD وتحديث ترتيب الفصول (Reordering) ومعاملات الذرية (Transactions)
class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  /// الحصول على كائن قاعدة البيانات المحلية
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('katib_app_database.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
      onConfigure: (db) async {
        await db.execute('PRAGMA foreign_keys = ON');
      },
    );
  }

  Future<void> _createDB(Database db, int version) async {
    // 1. جدول الكتب (books)
    await db.execute('''
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        description TEXT,
        category TEXT,
        total_pages INTEGER DEFAULT 0,
        current_page INTEGER DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        target_word_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'drafting',
        format TEXT DEFAULT 'project',
        lastModified INTEGER,
        isSynced INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0
      )
    ''');

    // 2. جدول الفصول (chapters)
    await db.execute('''
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        title TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        content_json TEXT NOT NULL,
        plain_text TEXT NOT NULL,
        lastModified INTEGER,
        isSynced INTEGER DEFAULT 0
      )
    ''');

    // فهرس لترتيب الفصول واستدعائها حسب الكتاب
    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_chapters_book_order ON chapters(book_id, order_index ASC)
    ''');

    // 3. جدول المراجع والاقتباسات (citations)
    await db.execute('''
      CREATE TABLE IF NOT EXISTS citations (
        id TEXT PRIMARY KEY,
        chapter_id TEXT NOT NULL,
        book_id TEXT NOT NULL,
        source_file_name TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        author TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        created_at TEXT NOT NULL,
        lastModified INTEGER,
        isSynced INTEGER DEFAULT 0,
        FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_citations_chapter ON citations(chapter_id)
    ''');

    // 4. جدول النسخ الاحتياطية عند حدوث تعارض (chapter_backups)
    await db.execute('''
      CREATE TABLE IF NOT EXISTS chapter_backups (
        id TEXT PRIMARY KEY,
        chapterId TEXT NOT NULL,
        chapterTitle TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        deviceId TEXT NOT NULL,
        deviceName TEXT NOT NULL,
        reason TEXT NOT NULL
      )
    ''');
  }

  // ==========================================
  // عمليات إدارة الفصول (Chapter CRUD Operations)
  // ==========================================

  /// جلب فصول كتاب مرتبة تصاعدياً بحسب order_index
  Future<List<Chapter>> getChapters(String bookId) async {
    final db = await database;
    final maps = await db.query(
      'chapters',
      where: 'book_id = ?',
      whereArgs: [bookId],
      orderBy: 'order_index ASC',
    );

    return maps.map((map) => Chapter.fromMap(map)).toList();
  }

  /// إدراج فصل جديد (Create)
  Future<int> insertChapter(Chapter chapter) async {
    final db = await database;
    return await db.insert(
      'chapters',
      chapter.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// قراءة بيانات فصل واحد بمُعرّفه (Read)
  Future<Chapter?> getChapterById(String chapterId) async {
    final db = await database;
    final maps = await db.query(
      'chapters',
      where: 'id = ?',
      whereArgs: [chapterId],
      limit: 1,
    );

    if (maps.isNotEmpty) {
      return Chapter.fromMap(maps.first);
    }
    return null;
  }

  /// تحديث بيانات الفصل (Update)
  Future<int> updateChapter(Chapter chapter) async {
    final db = await database;
    return await db.update(
      'chapters',
      chapter.toMap(),
      where: 'id = ?',
      whereArgs: [chapter.id],
    );
  }

  /// حذف فصل بمُعرّفه مع مراجعة المربوطة به (Delete)
  Future<int> deleteChapter(String chapterId) async {
    final db = await database;
    return await db.delete(
      'chapters',
      where: 'id = ?',
      whereArgs: [chapterId],
    );
  }

  /// إعادة ترتيب قائمة الفصول في معاملة ذرية موحدة (Reorder Transaction)
  Future<void> reorderChapters(String bookId, List<Chapter> reorderedChapters) async {
    final db = await database;
    await db.transaction((txn) async {
      final batch = txn.batch();
      for (int i = 0; i < reorderedChapters.length; i++) {
        final chapter = reorderedChapters[i];
        batch.update(
          'chapters',
          {'order_index': i},
          where: 'id = ?',
          whereArgs: [chapter.id],
        );
      }
      await batch.commit(noResult: true);
    });
  }

  // ==========================================
  // عمليات المراجع والاقتباسات (Citation CRUD Operations)
  // ==========================================

  /// جلب المراجع التابعة لفصل معين
  Future<List<Citation>> getCitationsByChapter(String chapterId) async {
    final db = await database;
    final maps = await db.query(
      'citations',
      where: 'chapter_id = ?',
      whereArgs: [chapterId],
      orderBy: 'created_at DESC',
    );

    return maps.map((map) => Citation.fromMap(map)).toList();
  }

  /// جلب كافة مراجع الكتاب
  Future<List<Citation>> getCitationsByBook(String bookId) async {
    final db = await database;
    final maps = await db.query(
      'citations',
      where: 'book_id = ?',
      whereArgs: [bookId],
      orderBy: 'created_at DESC',
    );

    return maps.map((map) => Citation.fromMap(map)).toList();
  }

  /// إضافة مرجع أو اقتباس جديد كـ Footnote
  Future<int> insertCitation(Citation citation) async {
    final db = await database;
    return await db.insert(
      'citations',
      citation.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// تحديث بيانات المرجع
  Future<int> updateCitation(Citation citation) async {
    final db = await database;
    return await db.update(
      'citations',
      citation.toMap(),
      where: 'id = ?',
      whereArgs: [citation.id],
    );
  }

  /// حذف مرجع
  Future<int> deleteCitation(String citationId) async {
    final db = await database;
    return await db.delete(
      'citations',
      where: 'id = ?',
      whereArgs: [citationId],
    );
  }

  /// إغلاق اتصال قاعدة البيانات
  Future<void> close() async {
    final db = await database;
    await db.close();
  }
}
