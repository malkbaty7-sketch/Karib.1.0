import 'package:equatable/equatable.dart';

/// كائن بيانات المصدر المستخرج بدقة مع رقم الصفحة والاقتباس
/// ExtractedSource Entity - katib_app Semantic Engine
class ExtractedSource extends Equatable {
  final String sourceFileName;
  final int pageNumber;
  final String author;
  final String excerpt;
  final double relevanceScore; // نسبة التطابق الدلالي من 0 إلى 100
  final String? chapterTitle;

  const ExtractedSource({
    required this.sourceFileName,
    required this.pageNumber,
    required this.author,
    required this.excerpt,
    this.relevanceScore = 95.0,
    this.chapterTitle,
  });

  /// تحويل الكائن إلى Map لتخزينه أو إرساله
  Map<String, dynamic> toMap() {
    return {
      'sourceFileName': sourceFileName,
      'pageNumber': pageNumber,
      'author': author,
      'excerpt': excerpt,
      'relevanceScore': relevanceScore,
      'chapterTitle': chapterTitle,
    };
  }

  /// بناء الكائن من Map أو استجابة JSON لـ Gemini API
  factory ExtractedSource.fromMap(Map<String, dynamic> map) {
    return ExtractedSource(
      sourceFileName: (map['sourceFileName'] ?? map['source_file_name'] ?? map['bookTitle'] ?? 'مستند غير معنون').toString(),
      pageNumber: _parsePageNumber(map['pageNumber'] ?? map['page_number'] ?? map['page']),
      author: (map['author'] ?? map['writer'] ?? 'مؤلف غير معروف').toString(),
      excerpt: (map['excerpt'] ?? map['quote'] ?? map['text'] ?? '').toString(),
      relevanceScore: (map['relevanceScore'] ?? map['relevance_score'] ?? map['score'] ?? 95.0).toDouble(),
      chapterTitle: map['chapterTitle']?.toString(),
    );
  }

  factory ExtractedSource.fromJson(Map<String, dynamic> json) => ExtractedSource.fromMap(json);

  Map<String, dynamic> toJson() => toMap();

  static int _parsePageNumber(dynamic value) {
    if (value is int) return value > 0 ? value : 1;
    if (value is num) return value.toInt() > 0 ? value.toInt() : 1;
    if (value is String) {
      final parsed = int.tryParse(value.replaceAll(RegExp(r'[^0-9]'), ''));
      if (parsed != null && parsed > 0) return parsed;
    }
    return 1;
  }

  /// نسخ الكائن مع تعديل بعض الخصائص (Immutability pattern)
  ExtractedSource copyWith({
    String? sourceFileName,
    int? pageNumber,
    String? author,
    String? excerpt,
    double? relevanceScore,
    String? chapterTitle,
  }) {
    return ExtractedSource(
      sourceFileName: sourceFileName ?? this.sourceFileName,
      pageNumber: pageNumber ?? this.pageNumber,
      author: author ?? this.author,
      excerpt: excerpt ?? this.excerpt,
      relevanceScore: relevanceScore ?? this.relevanceScore,
      chapterTitle: chapterTitle ?? this.chapterTitle,
    );
  }

  /// توليد توثيق أكاديمي معتمد باللغة العربية
  String toAcademicCitation() {
    return '«$excerpt» — $author، $sourceFileName، ص $pageNumber.';
  }

  @override
  List<Object?> get props => [sourceFileName, pageNumber, author, excerpt, relevanceScore, chapterTitle];
}

/// نتيجة استعلام البحث الدلالي المتكاملة مع إجابة Gemini وقائمة المصادر المستخرجة
class SemanticSearchResult extends Equatable {
  final String id;
  final String query;
  final String answer;
  final List<ExtractedSource> sources;
  final double overallConfidence;
  final int searchDurationMs;
  final DateTime timestamp;

  const SemanticSearchResult({
    required this.id,
    required this.query,
    required this.answer,
    required this.sources,
    this.overallConfidence = 96.0,
    required this.searchDurationMs,
    required this.timestamp,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'query': query,
      'answer': answer,
      'sources': sources.map((s) => s.toMap()).toList(),
      'overallConfidence': overallConfidence,
      'searchDurationMs': searchDurationMs,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory SemanticSearchResult.fromMap(Map<String, dynamic> map) {
    final rawSources = map['sources'] as List? ?? [];
    return SemanticSearchResult(
      id: map['id']?.toString() ?? 'res_${DateTime.now().millisecondsSinceEpoch}',
      query: map['query']?.toString() ?? '',
      answer: map['answer']?.toString() ?? '',
      sources: rawSources
          .whereType<Map<String, dynamic>>()
          .map((s) => ExtractedSource.fromMap(s))
          .toList(),
      overallConfidence: (map['overallConfidence'] ?? 95.0).toDouble(),
      searchDurationMs: (map['searchDurationMs'] ?? 0) as int,
      timestamp: DateTime.tryParse(map['timestamp']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  @override
  List<Object?> get props => [id, query, answer, sources, overallConfidence, searchDurationMs, timestamp];
}
