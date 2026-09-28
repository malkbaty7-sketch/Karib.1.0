import 'package:equatable/equatable.dart';

/// أنواع العقد والبطاقات المتاحة على السبورة الذهنية
enum CanvasNodeType {
  idea,
  character,
  location,
  extractedQuote,
  event;

  String toValue() {
    switch (this) {
      case CanvasNodeType.idea:
        return 'idea';
      case CanvasNodeType.character:
        return 'character';
      case CanvasNodeType.location:
        return 'location';
      case CanvasNodeType.extractedQuote:
        return 'extracted_quote';
      case CanvasNodeType.event:
        return 'event';
    }
  }

  static CanvasNodeType fromValue(String value) {
    switch (value) {
      case 'character':
        return CanvasNodeType.character;
      case 'location':
        return CanvasNodeType.location;
      case 'extracted_quote':
        return CanvasNodeType.extractedQuote;
      case 'event':
        return CanvasNodeType.event;
      case 'idea':
      default:
        return CanvasNodeType.idea;
    }
  }

  String get arabicLabel {
    switch (this) {
      case CanvasNodeType.idea:
        return 'فكرة رئيسية';
      case CanvasNodeType.character:
        return 'شخصية';
      case CanvasNodeType.location:
        return 'مكان / مشهد';
      case CanvasNodeType.extractedQuote:
        return 'اقتباس موثق';
      case CanvasNodeType.event:
        return 'حدث / حبكة';
    }
  }
}

/// موديل بيانات عقدة السبورة الذهنية (CanvasNode)
/// يحتوي على معرف العقدة، العنوان، المحتوى، إحداثيات الموضع (dx, dy)،
/// اللون السداسي colorHex، نوع العقدة nodeType، ومعرف المشروع bookId.
class CanvasNode extends Equatable {
  final String id;
  final String bookId;
  final String title;
  final String content;
  final double dx;
  final double dy;
  final String colorHex;
  final String nodeType;
  final double width;
  final double height;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const CanvasNode({
    required this.id,
    required this.bookId,
    required this.title,
    required this.content,
    required this.dx,
    required this.dy,
    required this.colorHex,
    required this.nodeType,
    this.width = 220.0,
    this.height = 140.0,
    this.createdAt,
    this.updatedAt,
  });

  /// الحصول على نوع العقدة كـ Enum
  CanvasNodeType get typeEnum => CanvasNodeType.fromValue(nodeType);

  /// تحويل الكائن إلى Map لتخزينه في SQLite (sqflite)
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'book_id': bookId,
      'title': title,
      'content': content,
      'dx': dx,
      'dy': dy,
      'color_hex': colorHex,
      'node_type': nodeType,
      'width': width,
      'height': height,
      'created_at': createdAt?.toIso8601String() ?? DateTime.now().toIso8601String(),
      'updated_at': updatedAt?.toIso8601String() ?? DateTime.now().toIso8601String(),
    };
  }

  /// إنشاء كائن CanvasNode من Map مسترجع من SQLite
  factory CanvasNode.fromMap(Map<String, dynamic> map) {
    return CanvasNode(
      id: map['id'] as String,
      bookId: map['book_id'] as String? ?? '',
      title: map['title'] as String? ?? '',
      content: map['content'] as String? ?? '',
      dx: (map['dx'] as num?)?.toDouble() ?? 0.0,
      dy: (map['dy'] as num?)?.toDouble() ?? 0.0,
      colorHex: map['color_hex'] as String? ?? '#F59E0B',
      nodeType: map['node_type'] as String? ?? 'idea',
      width: (map['width'] as num?)?.toDouble() ?? 220.0,
      height: (map['height'] as num?)?.toDouble() ?? 140.0,
      createdAt: map['created_at'] != null 
          ? DateTime.tryParse(map['created_at'] as String) 
          : null,
      updatedAt: map['updated_at'] != null 
          ? DateTime.tryParse(map['updated_at'] as String) 
          : null,
    );
  }

  /// استنساخ العقدة مع تعديل بعض الخصائص (مفيد جداً عند تحريك البطاقة drag & drop)
  CanvasNode copyWith({
    String? id,
    String? bookId,
    String? title,
    String? content,
    double? dx,
    double? dy,
    String? colorHex,
    String? nodeType,
    double? width,
    double? height,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CanvasNode(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      title: title ?? this.title,
      content: content ?? this.content,
      dx: dx ?? this.dx,
      dy: dy ?? this.dy,
      colorHex: colorHex ?? this.colorHex,
      nodeType: nodeType ?? this.nodeType,
      width: width ?? this.width,
      height: height ?? this.height,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        bookId,
        title,
        content,
        dx,
        dy,
        colorHex,
        nodeType,
        width,
        height,
        createdAt,
        updatedAt,
      ];
}
