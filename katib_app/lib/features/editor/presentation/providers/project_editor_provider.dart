import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/entities/chapter_model.dart';
import '../../domain/entities/citation_model.dart';
import '../../data/datasources/editor_local_database.dart';

enum SaveStatus {
  idle,
  saving,
  saved,
  error,
}

/// موفر حالة محرر المشاريع (ProjectEditorProvider)
/// يدير حالة الكتاب المفتوح، قائمة الفصول، الفصل النشط، المراجع،
/// ومحرك الحفظ التلقائي (Debounced Auto-save) لحماية بيانات الكاتب
class ProjectEditorProvider extends ChangeNotifier {
  final EditorLocalDatabase _database;

  // حالة الكتاب والفصل
  String? _currentBookId;
  List<Chapter> _chapters = [];
  Chapter? _currentChapter;
  List<Citation> _currentCitations = [];

  // حالة الحفظ التلقائي
  SaveStatus _saveStatus = SaveStatus.idle;
  DateTime? _lastSavedAt;
  Timer? _autoSaveDebounceTimer;
  final Duration _debounceDuration;

  ProjectEditorProvider({
    EditorLocalDatabase? database,
    Duration debounceDuration = const Duration(milliseconds: 1200),
  })  : _database = database ?? EditorLocalDatabase.instance,
        _debounceDuration = debounceDuration;

  // Getters
  String? get currentBookId => _currentBookId;
  List<Chapter> get chapters => List.unmodifiable(_chapters);
  Chapter? get currentChapter => _currentChapter;
  List<Citation> get currentCitations => List.unmodifiable(_currentCitations);
  SaveStatus get saveStatus => _saveStatus;
  DateTime? get lastSavedAt => _lastSavedAt;
  bool get isSaving => _saveStatus == SaveStatus.saving;

  /// إجمالي عدد الكلمات في كافة فصول الكتاب
  int get totalBookWordCount =>
      _chapters.fold(0, (total, ch) => total + ch.wordCount);

  // ==========================================
  // إدارة فتح المشروع واختيار الفصول
  // ==========================================

  /// فتح مشروع كتاب وتحميل فصوله ومراجعه من قاعدة البيانات المحلية
  Future<void> openBook(String bookId) async {
    _currentBookId = bookId;
    _saveStatus = SaveStatus.idle;
    notifyListeners();

    try {
      _chapters = await _database.getChapters(bookId);

      // إذا كان المشروع جديداً ولا يحتوي على فصول، ننشئ فصلاً تمهيدياً
      if (_chapters.isEmpty) {
        final initialChapter = Chapter(
          id: 'ch_${DateTime.now().millisecondsSinceEpoch}',
          bookId: bookId,
          title: 'الفصل الأول: البداية والتمهيد',
          orderIndex: 0,
          contentJson: '{"ops":[{"insert":"اكتب مستهل كتابك هنا...\\n"}]}',
          plainText: 'اكتب مستهل كتابك هنا...',
        );
        await _database.insertChapter(initialChapter);
        _chapters = [initialChapter];
      }

      // تحديد أول فصل افتراضياً
      _currentChapter = _chapters.first;
      await _loadCitationsForCurrentChapter();

      _saveStatus = SaveStatus.saved;
      _lastSavedAt = DateTime.now();
      notifyListeners();
    } catch (e) {
      _saveStatus = SaveStatus.error;
      notifyListeners();
    }
  }

  /// تغيير الفصل النشط
  Future<void> selectChapter(String chapterId) async {
    if (_currentChapter?.id == chapterId) return;

    // حفظ أي تعديل معلق قبل الانتقال
    await saveCurrentChapterImmediate();

    final target = _chapters.firstWhere(
      (c) => c.id == chapterId,
      orElse: () => _chapters.first,
    );

    _currentChapter = target;
    await _loadCitationsForCurrentChapter();
    notifyListeners();
  }

  // ==========================================
  // محرك الحفظ التلقائي (Debounced Auto-save)
  // ==========================================

  /// استدعاء عند كل نقرة أو تعديل في المحرر (سواء JSON أو PlainText)
  void onContentChanged({
    required String contentJson,
    required String plainText,
  }) {
    if (_currentChapter == null) return;

    // تحديث الحالة في الذاكرة فوراً لضمان تجاوب الواجهة
    _currentChapter = _currentChapter!.copyWith(
      contentJson: contentJson,
      plainText: plainText,
    );

    // تحديث الفصل في القائمة المحلية
    final index = _chapters.indexWhere((c) => c.id == _currentChapter!.id);
    if (index != -1) {
      _chapters[index] = _currentChapter!;
    }

    _saveStatus = SaveStatus.idle;
    notifyListeners();

    // تشغيل مؤقت الحفظ التلقائي الذكي (Debounce)
    _autoSaveDebounceTimer?.cancel();
    _autoSaveDebounceTimer = Timer(_debounceDuration, () {
      _performAutoSave();
    });
  }

  /// تنفيذ الحفظ التلقائي في قاعدة البيانات SQLite
  Future<void> _performAutoSave() async {
    if (_currentChapter == null) return;

    _saveStatus = SaveStatus.saving;
    notifyListeners();

    try {
      await _database.updateChapter(_currentChapter!);
      _saveStatus = SaveStatus.saved;
      _lastSavedAt = DateTime.now();
      notifyListeners();
    } catch (e) {
      _saveStatus = SaveStatus.error;
      notifyListeners();
    }
  }

  /// حفظ فوري مباشر بدون انتظار المؤقت
  Future<void> saveCurrentChapterImmediate() async {
    _autoSaveDebounceTimer?.cancel();
    if (_currentChapter != null) {
      await _performAutoSave();
    }
  }

  // ==========================================
  // عمليات إدارة الفصول (CRUD & Reorder)
  // ==========================================

  /// إضافة فصل جديد للمشروع
  Future<void> addNewChapter({String title = 'فصل جديد'}) async {
    if (_currentBookId == null) return;

    final newIndex = _chapters.length;
    final newChapter = Chapter(
      id: 'ch_${DateTime.now().millisecondsSinceEpoch}',
      bookId: _currentBookId!,
      title: title,
      orderIndex: newIndex,
      contentJson: '{"ops":[{"insert":"\\n"}]}',
      plainText: '',
    );

    await _database.insertChapter(newChapter);
    _chapters.add(newChapter);
    _currentChapter = newChapter;
    _currentCitations = [];

    _saveStatus = SaveStatus.saved;
    _lastSavedAt = DateTime.now();
    notifyListeners();
  }

  /// تعديل عنوان الفصل
  Future<void> updateChapterTitle(String chapterId, String newTitle) async {
    final index = _chapters.indexWhere((c) => c.id == chapterId);
    if (index == -1) return;

    final updated = _chapters[index].copyWith(title: newTitle.trim());
    _chapters[index] = updated;
    if (_currentChapter?.id == chapterId) {
      _currentChapter = updated;
    }

    await _database.updateChapter(updated);
    notifyListeners();
  }

  /// حذف فصل
  Future<void> deleteChapter(String chapterId) async {
    if (_chapters.length <= 1) return; // منع حذف آخر فصل في الكتاب

    await _database.deleteChapter(chapterId);
    _chapters.removeWhere((c) => c.id == chapterId);

    // إعادة تسلسل order_index
    await _database.reorderChapters(_currentBookId!, _chapters);

    if (_currentChapter?.id == chapterId) {
      _currentChapter = _chapters.first;
      await _loadCitationsForCurrentChapter();
    }

    notifyListeners();
  }

  /// إعادة ترتيب الفصول بالسحب والإفلات أو الأسهم
  Future<void> reorderChapters(int oldIndex, int newIndex) async {
    if (oldIndex < newIndex) {
      newIndex -= 1;
    }
    final item = _chapters.removeAt(oldIndex);
    _chapters.insert(newIndex, item);

    notifyListeners();

    // حفظ الترتيب الجديد ذرياً في SQLite
    if (_currentBookId != null) {
      await _database.reorderChapters(_currentBookId!, _chapters);
    }
  }

  // ==========================================
  // إدارة المراجع والاقتباسات (Citations)
  // ==========================================

  Future<void> _loadCitationsForCurrentChapter() async {
    if (_currentChapter == null) {
      _currentCitations = [];
      return;
    }
    _currentCitations = await _database.getCitationsByChapter(_currentChapter!.id);
  }

  /// إضافة مرجع جديد للفصل الحالي
  Future<void> addCitation({
    required String sourceFileName,
    required int pageNumber,
    required String author,
    required String excerpt,
  }) async {
    if (_currentChapter == null || _currentBookId == null) return;

    final citation = Citation(
      id: 'cit_${DateTime.now().millisecondsSinceEpoch}',
      chapterId: _currentChapter!.id,
      bookId: _currentBookId!,
      sourceFileName: sourceFileName,
      pageNumber: pageNumber,
      author: author,
      excerpt: excerpt,
      createdAt: DateTime.now(),
    );

    await _database.insertCitation(citation);
    _currentCitations.insert(0, citation);
    notifyListeners();
  }

  /// حذف مرجع
  Future<void> deleteCitation(String citationId) async {
    await _database.deleteCitation(citationId);
    _currentCitations.removeWhere((c) => c.id == citationId);
    notifyListeners();
  }

  @override
  void dispose() {
    _autoSaveDebounceTimer?.cancel();
    super.dispose();
  }
}
