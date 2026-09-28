import 'package:equatable/equatable.dart';

enum ExtractionType {
  passages,   // نصوص أصلية
  summary,    // ملخص
  comparison, // مقارنة
  qa,         // إجابة عن سؤال
  definitions // استخراج تعريفات/إحصاءات
}

class ExtractedResultEntity extends Equatable {
  final String id;
  final ExtractionType type;
  final String topicQuery;
  final String text;
  final String bookId;
  final String bookTitle;
  final String author;
  final int pageNumber;
  final String originalExcerpt;
  final int relevanceScore;
  final String status; // pending, accepted, edited
  final DateTime createdAt;

  const ExtractedResultEntity({
    required this.id,
    required this.type,
    required this.topicQuery,
    required this.text,
    required this.bookId,
    required this.bookTitle,
    required this.author,
    required this.pageNumber,
    required this.originalExcerpt,
    required this.relevanceScore,
    this.status = 'pending',
    required this.createdAt,
  });

  bool get isAccepted => status == 'accepted';

  ExtractedResultEntity copyWith({
    String? id,
    ExtractionType? type,
    String? topicQuery,
    String? text,
    String? bookId,
    String? bookTitle,
    String? author,
    int? pageNumber,
    String? originalExcerpt,
    int? relevanceScore,
    String? status,
    DateTime? createdAt,
  }) {
    return ExtractedResultEntity(
      id: id ?? this.id,
      type: type ?? this.type,
      topicQuery: topicQuery ?? this.topicQuery,
      text: text ?? this.text,
      bookId: bookId ?? this.bookId,
      bookTitle: bookTitle ?? this.bookTitle,
      author: author ?? this.author,
      pageNumber: pageNumber ?? this.pageNumber,
      originalExcerpt: originalExcerpt ?? this.originalExcerpt,
      relevanceScore: relevanceScore ?? this.relevanceScore,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        type,
        topicQuery,
        text,
        bookId,
        bookTitle,
        author,
        pageNumber,
        originalExcerpt,
        relevanceScore,
        status,
        createdAt,
      ];
}
