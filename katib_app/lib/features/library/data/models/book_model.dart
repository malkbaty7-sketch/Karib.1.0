import '../../domain/entities/book_entity.dart';

class BookModel extends BookEntity {
  const BookModel({
    required super.id,
    required super.title,
    required super.author,
    required super.category,
    required super.totalPages,
    required super.currentPage,
    required super.wordCount,
    required super.targetWordCount,
    required super.status,
    super.localFilePath,
    required super.format,
    required super.lastModified,
    super.isFavorite,
  });

  factory BookModel.fromJson(Map<String, dynamic> json) {
    return BookModel(
      id: json['id'] as String,
      title: json['title'] as String,
      author: json['author'] as String,
      category: json['category'] as String,
      totalPages: json['totalPages'] as int? ?? 0,
      currentPage: json['currentPage'] as int? ?? 0,
      wordCount: json['wordCount'] as int? ?? 0,
      targetWordCount: json['targetWordCount'] as int? ?? 0,
      status: json['status'] as String? ?? 'drafting',
      localFilePath: json['localFilePath'] as String?,
      format: json['format'] as String? ?? 'project',
      lastModified: DateTime.tryParse(json['lastModified'] ?? '') ?? DateTime.now(),
      isFavorite: json['isFavorite'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'author': author,
      'category': category,
      'totalPages': totalPages,
      'currentPage': currentPage,
      'wordCount': wordCount,
      'targetWordCount': targetWordCount,
      'status': status,
      'localFilePath': localFilePath,
      'format': format,
      'lastModified': lastModified.toIso8601String(),
      'isFavorite': isFavorite,
    };
  }
}
