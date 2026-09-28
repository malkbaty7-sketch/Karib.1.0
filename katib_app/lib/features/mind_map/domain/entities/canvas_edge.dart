import 'package:equatable/equatable.dart';

/// موديل بيانات مسار/رابط السبورة الذهنية (CanvasEdge)
/// يربط بين عقدتين (fromNodeId و toNodeId) مع دعم تسمية توضيحية اختيارية (label)
/// ونمط الخط (متصل solid أو متقطع dashed) ومعرف المشروع bookId.
class CanvasEdge extends Equatable {
  final String id;
  final String bookId;
  final String fromNodeId;
  final String toNodeId;
  final String? label;
  final String colorHex;
  final double strokeWidth;
  final String lineStyle; // 'solid' or 'dashed'
  final DateTime? createdAt;

  const CanvasEdge({
    required this.id,
    required this.bookId,
    required this.fromNodeId,
    required this.toNodeId,
    this.label,
    this.colorHex = '#94A3B8',
    this.strokeWidth = 2.0,
    this.lineStyle = 'solid',
    this.createdAt,
  });

  /// تحويل المسار إلى Map للتخزين في SQLite
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'book_id': bookId,
      'from_node_id': fromNodeId,
      'to_node_id': toNodeId,
      'label': label,
      'color_hex': colorHex,
      'stroke_width': strokeWidth,
      'line_style': lineStyle,
      'created_at': createdAt?.toIso8601String() ?? DateTime.now().toIso8601String(),
    };
  }

  /// إنشاء كائن CanvasEdge من Map مسترجع من SQLite
  factory CanvasEdge.fromMap(Map<String, dynamic> map) {
    return CanvasEdge(
      id: map['id'] as String,
      bookId: map['book_id'] as String? ?? '',
      fromNodeId: map['from_node_id'] as String,
      toNodeId: map['to_node_id'] as String,
      label: map['label'] as String?,
      colorHex: map['color_hex'] as String? ?? '#94A3B8',
      strokeWidth: (map['stroke_width'] as num?)?.toDouble() ?? 2.0,
      lineStyle: map['line_style'] as String? ?? 'solid',
      createdAt: map['created_at'] != null
          ? DateTime.tryParse(map['created_at'] as String)
          : null,
    );
  }

  /// استنساخ الرابط مع إمكانية تعديل الخصائص
  CanvasEdge copyWith({
    String? id,
    String? bookId,
    String? fromNodeId,
    String? toNodeId,
    String? label,
    String? colorHex,
    double? strokeWidth,
    String? lineStyle,
    DateTime? createdAt,
  }) {
    return CanvasEdge(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      fromNodeId: fromNodeId ?? this.fromNodeId,
      toNodeId: toNodeId ?? this.toNodeId,
      label: label ?? this.label,
      colorHex: colorHex ?? this.colorHex,
      strokeWidth: strokeWidth ?? this.strokeWidth,
      lineStyle: lineStyle ?? this.lineStyle,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        bookId,
        fromNodeId,
        toNodeId,
        label,
        colorHex,
        strokeWidth,
        lineStyle,
        createdAt,
      ];
}
