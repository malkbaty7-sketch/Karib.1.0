import 'package:equatable/equatable.dart';

class BookEntity extends Equatable {
  final String id;
  final String title;
  final String author;
  final String category;
  final int totalPages;
  final int currentPage;
  final int wordCount;
  final int targetWordCount;
  final String status; // drafting, reviewing, published, reading
  final String? localFilePath;
  final String format; // project, pdf, epub
  final DateTime lastModified;
  final bool isFavorite;

  const BookEntity({
    required this.id,
    required this.title,
    required this.author,
    required this.category,
    required this.totalPages,
    required this.currentPage,
    required this.wordCount,
    required this.targetWordCount,
    required this.status,
    this.localFilePath,
    required this.format,
    required this.lastModified,
    this.isFavorite = false,
  });

  double get progress => totalPages > 0 ? (currentPage / totalPages).clamp(0.0, 1.0) : 0.0;
  double get writingProgress => targetWordCount > 0 ? (wordCount / targetWordCount).clamp(0.0, 1.0) : 0.0;

  @override
  List<Object?> get props => [
    id, title, author, category, totalPages, currentPage,
    wordCount, targetWordCount, status, localFilePath, format, lastModified, isFavorite,
  ];
}
