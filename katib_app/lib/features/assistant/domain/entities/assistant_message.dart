import 'package:equatable/equatable.dart';

/// نوع مرسل الرسالة في المساعد التفاعلي
enum MessageSender { user, ai }

/// موديل البيانات AssistantMessage لرسائل المساعد التفاعلي والتدقيق اللغوي
class AssistantMessage extends Equatable {
  /// المعرف الفريد للرسالة
  final String id;

  /// المرسل (user / ai)
  final String sender;

  /// نص الرسالة أو المقترح أو التحليل
  final String text;

  /// الطابع الزمني لإنشاء الرسالة (DateTime)
  final DateTime timestamp;

  /// معرف الفصل المرتبط بالرسالة (اختياري)
  final String? relatedChapterId;

  /// نوع المقترح السريع (auto_complete, summary, proofreading, chat)
  final String? suggestionType;

  /// بيانات تفصيلية إضافية مثل قائمة الأخطاء النحوية أو النقاط المفتاحية
  final Map<String, dynamic>? metadata;

  const AssistantMessage({
    required this.id,
    required this.sender,
    required this.text,
    required this.timestamp,
    this.relatedChapterId,
    this.suggestionType,
    this.metadata,
  });

  /// إنشاء رسالة من المستخدم
  factory AssistantMessage.user({
    required String id,
    required String text,
    String? relatedChapterId,
    String? suggestionType,
  }) {
    return AssistantMessage(
      id: id,
      sender: 'user',
      text: text,
      timestamp: DateTime.now(),
      relatedChapterId: relatedChapterId,
      suggestionType: suggestionType,
    );
  }

  /// إنشاء رسالة من المساعد الذكي AI
  factory AssistantMessage.ai({
    required String id,
    required String text,
    String? relatedChapterId,
    String? suggestionType,
    Map<String, dynamic>? metadata,
  }) {
    return AssistantMessage(
      id: id,
      sender: 'ai',
      text: text,
      timestamp: DateTime.now(),
      relatedChapterId: relatedChapterId,
      suggestionType: suggestionType,
      metadata: metadata,
    );
  }

  /// تحويل الموديل إلى خريطة Map لحفظه محلياً في sqflite أو Hive
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'sender': sender,
      'text': text,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'relatedChapterId': relatedChapterId,
      'suggestionType': suggestionType,
    };
  }

  /// استرجاع الموديل من خريطة بيانات
  factory AssistantMessage.fromMap(Map<String, dynamic> map) {
    return AssistantMessage(
      id: map['id'] as String,
      sender: map['sender'] as String? ?? 'ai',
      text: map['text'] as String? ?? '',
      timestamp: DateTime.fromMillisecondsSinceEpoch(
        map['timestamp'] as int? ?? DateTime.now().millisecondsSinceEpoch,
      ),
      relatedChapterId: map['relatedChapterId'] as String?,
      suggestionType: map['suggestionType'] as String?,
      metadata: map['metadata'] as Map<String, dynamic>?,
    );
  }

  AssistantMessage copyWith({
    String? id,
    String? sender,
    String? text,
    DateTime? timestamp,
    String? relatedChapterId,
    String? suggestionType,
    Map<String, dynamic>? metadata,
  }) {
    return AssistantMessage(
      id: id ?? this.id,
      sender: sender ?? this.sender,
      text: text ?? this.text,
      timestamp: timestamp ?? this.timestamp,
      relatedChapterId: relatedChapterId ?? this.relatedChapterId,
      suggestionType: suggestionType ?? this.suggestionType,
      metadata: metadata ?? this.metadata,
    );
  }

  @override
  List<Object?> get props => [id, sender, text, timestamp, relatedChapterId, suggestionType, metadata];
}
