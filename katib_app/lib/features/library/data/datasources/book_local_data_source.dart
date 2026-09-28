import '../models/book_model.dart';

abstract class BookLocalDataSource {
  Future<List<BookModel>> getBooks();
  Future<void> saveBook(BookModel book);
  Future<void> deleteBook(String id);
  Future<void> toggleFavorite(String id);
}

class BookLocalDataSourceImpl implements BookLocalDataSource {
  final List<BookModel> _inMemoryBooks = [
    BookModel(
      id: 'b1',
      title: 'أسرار البيان في فن كتابة الرواية العربية',
      author: 'د. طارق المعمري',
      category: 'نقد وأدب',
      totalPages: 320,
      currentPage: 184,
      wordCount: 54200,
      targetWordCount: 70000,
      status: 'drafting',
      format: 'project',
      lastModified: DateTime.now(),
      isFavorite: true,
    ),
    BookModel(
      id: 'b2',
      title: 'مدارج الفكر: دراسات في الحضارة الرقمية',
      author: 'أحمد الكاتب',
      category: 'فكر ودراسات',
      totalPages: 240,
      currentPage: 240,
      wordCount: 42000,
      targetWordCount: 40000,
      status: 'published',
      format: 'pdf',
      lastModified: DateTime.now().subtract(const Duration(days: 1)),
      isFavorite: true,
    ),
  ];

  @override
  Future<List<BookModel>> getBooks() async {
    return List.from(_inMemoryBooks);
  }

  @override
  Future<void> saveBook(BookModel book) async {
    final index = _inMemoryBooks.indexWhere((b) => b.id == book.id);
    if (index >= 0) {
      _inMemoryBooks[index] = book;
    } else {
      _inMemoryBooks.insert(0, book);
    }
  }

  @override
  Future<void> deleteBook(String id) async {
    _inMemoryBooks.removeWhere((b) => b.id == id);
  }

  @override
  Future<void> toggleFavorite(String id) async {
    final index = _inMemoryBooks.indexWhere((b) => b.id == id);
    if (index >= 0) {
      final old = _inMemoryBooks[index];
      _inMemoryBooks[index] = BookModel(
        id: old.id,
        title: old.title,
        author: old.author,
        category: old.category,
        totalPages: old.totalPages,
        currentPage: old.currentPage,
        wordCount: old.wordCount,
        targetWordCount: old.targetWordCount,
        status: old.status,
        localFilePath: old.localFilePath,
        format: old.format,
        lastModified: old.lastModified,
        isFavorite: !old.isFavorite,
      );
    }
  }
}
