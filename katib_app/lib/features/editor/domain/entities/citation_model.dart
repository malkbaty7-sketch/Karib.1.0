import 'package:equatable/equatable.dart';

/// كائن بيانات المرجع والاقتباس (Citation Model)
/// لتوثيق المصدر، اسم الملف الأصلي، رقم الصفحة، والمؤلف داخل فصول الكتاب
class Citation extends Equatable {
  final String id;
  final String chapterId;
  final String bookId;
  final String sourceFileName;
  final int pageNumber;
  final String author;
  final String excerpt;
  final DateTime createdAt;

  const Citation({
    required this.id,
    required this.chapterId,
    required this.bookId,
    required this.sourceFileName,
    required this.pageNumber,
    required this.author,
    required this.excerpt,
    required this.createdAt,
  });

  /// نص التوثيق المرجعي الأكاديمي الموحد
  String get formattedAcademicReference {
    return '«$excerpt» — $author، ملف المصدر: [$sourceFileName]، ص $pageNumber.';
  }

  Citation copyWith({
    String? id,
    String? chapterId,
    String? bookId,
    String? sourceFileName,
    int? pageNumber,
    String? author,
    String? excerpt,
    DateTime? createdAt,
  }) {
    return Citation(
      id: id ?? this.id,
      chapterId: chapterId ?? this.chapterId,
      bookId: bookId ?? this.bookId,
      sourceFileName: sourceFileName ?? this.sourceFileName,
      pageNumber: pageNumber ?? this.pageNumber,
      author: author ?? this.author,
      excerpt: excerpt ?? this.excerpt,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// التحويل من Map (sqflite)
  factory Citation.fromMap(Map<String, dynamic> map) {
    return Citation(
      id: map['id'] as String,
      chapterId: map['chapter_id'] as String? ?? '',
      bookId: map['book_id'] as String? ?? '',
      sourceFileName: map['source_file_name'] as String,
      pageNumber: (map['page_number'] as num?)?.toInt() ?? 1,
      author: map['author'] as String? ?? 'مؤلف غير محدد',
      excerpt: map['excerpt'] as String,
      createdAt: map['created_at'] != null 
          ? DateTime.tryParse(map['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  /// التحويل إلى Map للحفظ في sqflite
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'chapter_id': chapterId,
      'book_id': bookId,
      'source_file_name': sourceFileName,
      'page_number': pageNumber,
      'author': author,
      'excerpt': excerpt,
      'created_at': createdAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
        id,
        chapterId,
        bookId,
        sourceFileName,
        pageNumber,
        author,
        excerpt,
        createdAt,
      ];
}
