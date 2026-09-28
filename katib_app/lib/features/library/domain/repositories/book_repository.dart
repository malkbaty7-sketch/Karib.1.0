import '../entities/book_entity.dart';

abstract class BookRepository {
  Future<List<BookEntity>> getBooks();
  Future<void> saveBook(BookEntity book);
  Future<void> deleteBook(String id);
  Future<void> toggleFavorite(String id);
}
