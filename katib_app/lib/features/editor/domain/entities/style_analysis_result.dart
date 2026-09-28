/// نتيجة تحليل المشاعر والأسلوب البلاغي StyleAnalysisResult
class StyleAnalysisResult {
  /// نسبة التوافق مع المشاعر والأسلوب المحدد (من 0 إلى 100%)
  final double complianceScore;

  /// قائمة اقتراحات التحسين البلاغي والدلالي
  final List<String> suggestions;

  /// النص المقترح المعدل وفقاً للمشاعر المحددة (للمعاينة والمقارنة دون استبدال تلقائي)
  final String rewrittenText;

  /// ملاحظات نقدية وبلاغية إضافية
  final String? analysisNotes;

  const StyleAnalysisResult({
    required this.complianceScore,
    required this.suggestions,
    required this.rewrittenText,
    this.analysisNotes,
  });

  Map<String, dynamic> toJson() {
    return {
      'complianceScore': complianceScore,
      'suggestions': suggestions,
      'rewrittenText': rewrittenText,
      'analysisNotes': analysisNotes,
    };
  }

  factory StyleAnalysisResult.fromJson(Map<String, dynamic> json) {
    return StyleAnalysisResult(
      complianceScore: (json['complianceScore'] as num?)?.toDouble() ?? 0.0,
      suggestions: (json['suggestions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      rewrittenText: json['rewrittenText']?.toString() ?? '',
      analysisNotes: json['analysisNotes']?.toString(),
    );
  }

  StyleAnalysisResult copyWith({
    double? complianceScore,
    List<String>? suggestions,
    String? rewrittenText,
    String? analysisNotes,
  }) {
    return StyleAnalysisResult(
      complianceScore: complianceScore ?? this.complianceScore,
      suggestions: suggestions ?? this.suggestions,
      rewrittenText: rewrittenText ?? this.rewrittenText,
      analysisNotes: analysisNotes ?? this.analysisNotes,
    );
  }

  @override
  String toString() =>
      'StyleAnalysisResult(complianceScore: $complianceScore%, suggestionsCount: ${suggestions.length})';
}
