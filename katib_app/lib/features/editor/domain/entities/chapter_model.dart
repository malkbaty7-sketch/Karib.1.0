import 'package:equatable/equatable.dart';

/// كائن بيانات الفصل (Chapter Model)
/// يدعم حفظ النصوص الخام وحساب الكلمات مع بنية JSON للتنسيقات المتقدمة
class Chapter extends Equatable {
  final String id;
  final String bookId;
  final String title;
  final int orderIndex;
  final String contentJson; // لحفظ التنسيقات المتقدمة (مثل Quill Delta أو Markdown AST)
  final String plainText;   // للنص الخام وحساب عدد الكلمات والأحرف والبحث

  const Chapter({
    required this.id,
    required this.bookId,
    required this.title,
    required this.orderIndex,
    required this.contentJson,
    required this.plainText,
  });

  /// حساب عدد الكلمات تلقائياً من النص الخام
  int get wordCount {
    if (plainText.trim().isEmpty) return 0;
    return plainText.trim().split(RegExp(r'\s+')).length;
  }

  /// حساب عدد الأحرف
  int get characterCount => plainText.length;

  /// نسخ الكائن مع تعديل خصائص محددة (Immutability pattern)
  Chapter copyWith({
    String? id,
    String? bookId,
    String? title,
    int? orderIndex,
    String? contentJson,
    String? plainText,
  }) {
    return Chapter(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      title: title ?? this.title,
      orderIndex: orderIndex ?? this.orderIndex,
      contentJson: contentJson ?? this.contentJson,
      plainText: plainText ?? this.plainText,
    );
  }

  /// التحويل من Map (لقاعدة بيانات sqflite)
  factory Chapter.fromMap(Map<String, dynamic> map) {
    return Chapter(
      id: map['id'] as String,
      bookId: map['book_id'] as String? ?? '',
      title: map['title'] as String,
      orderIndex: (map['order_index'] as num?)?.toInt() ?? 0,
      contentJson: map['content_json'] as String? ?? '{}',
      plainText: map['plain_text'] as String? ?? '',
    );
  }

  /// التحويل إلى Map لتخزينه في جدول sqflite
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'book_id': bookId,
      'title': title,
      'order_index': orderIndex,
      'content_json': contentJson,
      'plain_text': plainText,
    };
  }

  @override
  List<Object?> get props => [id, bookId, title, orderIndex, contentJson, plainText];
}
