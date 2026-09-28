import 'package:equatable/equatable.dart';

/// موديل بيانات المسار الصوتي للفصل (AudioTrack)
/// يربط محتوى الفصل بالملف الصوتي والمدة الزمنية وإعدادات القراءة
class AudioTrack extends Equatable {
  /// معرّف الفصل المرتبط
  final String chapterId;

  /// عنوان الفصل
  final String chapterTitle;

  /// مسار الملف الصوتي المحفوظ محلياً (إن وجد)
  final String? audioFilePath;

  /// المدة الزمنية للمسار الصوتي
  final Duration duration;

  /// النص الكامل للفصل المراد تحويله أو قراءته صوتياً
  final String plainText;

  /// سرعة القراءة المستخدمة (مثل 1.0، 1.25، 1.5)
  final double speed;

  /// نبرة الصوت (Pitch) من 0.5 إلى 2.0
  final double pitch;

  /// لغة التوليد الصوتي (افتراضياً 'ar-SA')
  final String language;

  /// تاريخ إنشاء أو تحديث المسار
  final DateTime createdAt;

  const AudioTrack({
    required this.chapterId,
    required this.chapterTitle,
    this.audioFilePath,
    required this.duration,
    this.plainText = '',
    this.speed = 1.0,
    this.pitch = 1.0,
    this.language = 'ar-SA',
    required this.createdAt,
  });

  /// إنشاء نسخة جديدة مع تعديل بعض الخصائص (Immutability)
  AudioTrack copyWith({
    String? chapterId,
    String? chapterTitle,
    String? audioFilePath,
    Duration? duration,
    String? plainText,
    double? speed,
    double? pitch,
    String? language,
    DateTime? createdAt,
  }) {
    return AudioTrack(
      chapterId: chapterId ?? this.chapterId,
      chapterTitle: chapterTitle ?? this.chapterTitle,
      audioFilePath: audioFilePath ?? this.audioFilePath,
      duration: duration ?? this.duration,
      plainText: plainText ?? this.plainText,
      speed: speed ?? this.speed,
      pitch: pitch ?? this.pitch,
      language: language ?? this.language,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// تحويل الكائن إلى Map للتخزين في قاعدة بيانات SQLite أو SharedPreferences
  Map<String, dynamic> toMap() {
    return {
      'chapter_id': chapterId,
      'chapter_title': chapterTitle,
      'audio_file_path': audioFilePath,
      'duration_ms': duration.inMilliseconds,
      'plain_text': plainText,
      'speed': speed,
      'pitch': pitch,
      'language': language,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// استرجاع وبناء كائن AudioTrack من Map
  factory AudioTrack.fromMap(Map<String, dynamic> map) {
    return AudioTrack(
      chapterId: map['chapter_id'] as String? ?? '',
      chapterTitle: map['chapter_title'] as String? ?? '',
      audioFilePath: map['audio_file_path'] as String?,
      duration: Duration(milliseconds: (map['duration_ms'] as num?)?.toInt() ?? 0),
      plainText: map['plain_text'] as String? ?? '',
      speed: (map['speed'] as num?)?.toDouble() ?? 1.0,
      pitch: (map['pitch'] as num?)?.toDouble() ?? 1.0,
      language: map['language'] as String? ?? 'ar-SA',
      createdAt: map['created_at'] != null
          ? DateTime.tryParse(map['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  /// تحويل الكائن إلى JSON
  Map<String, dynamic> toJson() => toMap();

  /// بناء الكائن من JSON
  factory AudioTrack.fromJson(Map<String, dynamic> json) => AudioTrack.fromMap(json);

  /// تنسيق المدة بصيغة دقيقة:ثانية (05:20) أو ساعة:دقيقة:ثانية (01:15:30)
  String get formattedDuration {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);

    final minStr = minutes.toString().padLeft(2, '0');
    final secStr = seconds.toString().padLeft(2, '0');

    if (hours > 0) {
      return '$hours:$minStr:$secStr';
    }
    return '$minStr:$secStr';
  }

  /// عدد الكلمات المقروءة في المسار الصوتي
  int get wordCount {
    if (plainText.trim().isEmpty) return 0;
    return plainText.trim().split(RegExp(r'\s+')).length;
  }

  @override
  List<Object?> get props => [
        chapterId,
        chapterTitle,
        audioFilePath,
        duration,
        plainText,
        speed,
        pitch,
        language,
        createdAt,
      ];
}
