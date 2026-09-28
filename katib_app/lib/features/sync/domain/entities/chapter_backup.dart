import 'package:equatable/equatable.dart';

/// نموذج بيانات النسخة الاحتياطية للفصل عند حدوث تعارض أو حفظ يدوي
/// يضمن عدم ضياع أي كلمة كتبها الكاتب من أي جهاز
class ChapterBackup extends Equatable {
  final String id;
  final String chapterId;
  final String chapterTitle;
  final String content;
  final DateTime timestamp;
  final String deviceId;
  final String deviceName;
  final String reason;

  const ChapterBackup({
    required this.id,
    required this.chapterId,
    required this.chapterTitle,
    required this.content,
    required this.timestamp,
    required this.deviceId,
    required this.deviceName,
    required this.reason,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'chapterId': chapterId,
      'chapterTitle': chapterTitle,
      'content': content,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'deviceId': deviceId,
      'deviceName': deviceName,
      'reason': reason,
    };
  }

  factory ChapterBackup.fromMap(Map<String, dynamic> map) {
    return ChapterBackup(
      id: map['id'] as String,
      chapterId: map['chapterId'] as String,
      chapterTitle: map['chapterTitle'] as String? ?? '',
      content: map['content'] as String,
      timestamp: DateTime.fromMillisecondsSinceEpoch(map['timestamp'] as int? ?? DateTime.now().millisecondsSinceEpoch),
      deviceId: map['deviceId'] as String? ?? 'unknown_device',
      deviceName: map['deviceName'] as String? ?? 'جهاز غير معروف',
      reason: map['reason'] as String? ?? 'conflict_resolution',
    );
  }

  @override
  List<Object?> get props => [id, chapterId, chapterTitle, content, timestamp, deviceId, deviceName, reason];
}
