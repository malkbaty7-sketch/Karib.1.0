import '../../domain/entities/book_entity.dart';
import '../../domain/repositories/book_repository.dart';
import '../datasources/book_local_data_source.dart';
import '../models/book_model.dart';

class BookRepositoryImpl implements BookRepository {
  final BookLocalDataSource localDataSource;

  BookRepositoryImpl(this.localDataSource);

  @override
  Future<List<BookEntity>> getBooks() async {
    return await localDataSource.getBooks();
  }

  @override
  Future<void> saveBook(BookEntity book) async {
    final model = BookModel(
      id: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      totalPages: book.totalPages,
      currentPage: book.currentPage,
      wordCount: book.wordCount,
      targetWordCount: book.targetWordCount,
      status: book.status,
      localFilePath: book.localFilePath,
      format: book.format,
      lastModified: book.lastModified,
      isFavorite: book.isFavorite,
    );
    await localDataSource.saveBook(model);
  }

  @override
  Future<void> deleteBook(String id) async {
    await localDataSource.deleteBook(id);
  }

  @override
  Future<void> toggleFavorite(String id) async {
    await localDataSource.toggleFavorite(id);
  }
}
