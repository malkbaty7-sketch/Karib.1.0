/// موديل الملف الانفعالي ومحددات الأسلوب EmotionProfile
class EmotionProfile {
  /// قائمة المشاعر المختارة (مثل: غموض، حماس، دفء، أكاديمي، إلهام)
  final List<String> selectedEmotions;

  /// درجة الكثافة الانفعالية من 1.0 إلى 5.0
  final double intensityLevel;

  const EmotionProfile({
    required this.selectedEmotions,
    this.intensityLevel = 3.0,
  }) : assert(intensityLevel >= 1.0 && intensityLevel <= 5.0, 'مستوى الكثافة يجب أن يتراوح بين 1.0 و 5.0');

  /// نماذج مسبقة شائعة في الكتابة الإبداعية والأكاديمية العربية
  static const List<String> availableEmotions = [
    'غموض',
    'حماس',
    'دفء',
    'أكاديمي',
    'إلهام',
    'تشويق',
    'هدوء',
    'حزن شجي',
    'بلاغة رصينة',
    'سخرية مبطنة',
  ];

  EmotionProfile copyWith({
    List<String>? selectedEmotions,
    double? intensityLevel,
  }) {
    return EmotionProfile(
      selectedEmotions: selectedEmotions ?? this.selectedEmotions,
      intensityLevel: intensityLevel ?? this.intensityLevel,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'selectedEmotions': selectedEmotions,
      'intensityLevel': intensityLevel,
    };
  }

  factory EmotionProfile.fromJson(Map<String, dynamic> json) {
    return EmotionProfile(
      selectedEmotions: (json['selectedEmotions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      intensityLevel: (json['intensityLevel'] as num?)?.toDouble() ?? 3.0,
    );
  }

  @override
  String toString() =>
      'EmotionProfile(selectedEmotions: $selectedEmotions, intensityLevel: $intensityLevel)';
}
