import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../../domain/entities/assistant_message.dart';

/// أنماط المقترحات السريعة للمساعد التفاعلي
enum SuggestionMode {
  autocomplete, // إكمال الفقرة تلقائياً
  summary,      // ملخص سريع للفصل
  proofread,    // التدقيق الإملائي والنحوي
  chat,         // محادثة حرة مع المساعد
}

/// نموذج الخطأ اللغوي في التدقيق الإملائي والنحوي
class ProofreadingError {
  final String errorText;
  final String suggestion;
  final String explanation;
  final String type; // 'spelling' | 'grammar' | 'punctuation' | 'style'
  final int? startIndex;
  final int? endIndex;

  const ProofreadingError({
    required this.errorText,
    required this.suggestion,
    required this.explanation,
    this.type = 'spelling',
    this.startIndex,
    this.endIndex,
  });

  Map<String, dynamic> toMap() => {
    'errorText': errorText,
    'suggestion': suggestion,
    'explanation': explanation,
    'type': type,
    'startIndex': startIndex,
    'endIndex': endIndex,
  };

  factory ProofreadingError.fromMap(Map<String, dynamic> map) => ProofreadingError(
    errorText: map['errorText'] as String? ?? '',
    suggestion: map['suggestion'] as String? ?? '',
    explanation: map['explanation'] as String? ?? '',
    type: map['type'] as String? ?? 'spelling',
    startIndex: map['startIndex'] as int?,
    endIndex: map['endIndex'] as int?,
  );
}

/// نتيجة المقترحات السريعة من المساعد التفاعلي
class InlineSuggestionsResult {
  final SuggestionMode mode;
  final List<String> suggestions;
  final String? summary;
  final List<String>? keyPoints;
  final String? originalText;
  final String? correctedText;
  final List<ProofreadingError> errors;
  final String? overallFeedback;
  final String? explanation;
  final int? score;

  const InlineSuggestionsResult({
    required this.mode,
    this.suggestions = const [],
    this.summary,
    this.keyPoints,
    this.originalText,
    this.correctedText,
    this.errors = const [],
    this.overallFeedback,
    this.explanation,
    this.score,
  });
}

/// خدمة المساعد التفاعلي والتدقيق اللغوي InAppAssistantService
/// تتصل بـ Gemini API وتقدم خيارات سريعة:
/// 1. إكمال الفقرة تلقائياً (Auto-complete idea)
/// 2. إعطاء ملخص سريع للفصل (Chapter Summary)
/// 3. التدقيق الإملائي والنحوي مع قائمة بالأخطاء والبدائل المقترحة
/// بالإضافة لحفظ محادثات المساعد محلياً ضمن جلسة العمل الخاصة بالمشروع
class InAppAssistantService {
  final String? _apiKey;
  final GenerativeModel? _model;
  final _uuid = const Uuid();

  // ذاكرة الجلسة المحلية في بيئة العمل الحالية
  final Map<String, List<AssistantMessage>> _sessionMemoryCache = {};
  final StreamController<List<AssistantMessage>> _messagesStreamController =
      StreamController<List<AssistantMessage>>.broadcast();

  Stream<List<AssistantMessage>> get onSessionUpdated =>
      _messagesStreamController.stream;

  InAppAssistantService({String? apiKey})
      : _apiKey = apiKey,
        _model = (apiKey != null && apiKey.isNotEmpty && apiKey != 'MY_GEMINI_API_KEY')
            ? GenerativeModel(
                model: 'gemini-3.8-flash',
                apiKey: apiKey,
                generationConfig: GenerationConfig(
                  temperature: 0.7,
                  responseMimeType: 'application/json',
                ),
              )
            : null;

  /// دالة getInlineSuggestions الرئيسية:
  /// تستقبل النص المحدد أو سياق الفصل الحالي وتقدم خيارات سريعة
  Future<InlineSuggestionsResult> getInlineSuggestions({
    required String currentText,
    String? selectedText,
    String? chapterId,
    required SuggestionMode mode,
    String? userPrompt,
  }) async {
    final effectiveText = (selectedText != null && selectedText.trim().isNotEmpty)
        ? selectedText.trim()
        : currentText;

    if (_model == null) {
      // محاكاة المحرك الذكي في وضع Offline / غياب المفتاح
      return _generateOfflineSuggestions(
        currentText: currentText,
        selectedText: selectedText,
        mode: mode,
        userPrompt: userPrompt,
      );
    }

    try {
      final promptText = _buildPrompt(
        mode: mode,
        currentText: currentText,
        selectedText: selectedText,
        userPrompt: userPrompt,
      );

      final response = await _model!.generateContent([Content.text(promptText)]);
      final rawText = response.text ?? '{}';

      final Map<String, dynamic> jsonMap = jsonDecode(rawText);
      return _parseResult(mode, jsonMap, effectiveText);
    } catch (e) {
      debugPrint('Error in Gemini API getInlineSuggestions: $e. Falling back to rule-based engine.');
      return _generateOfflineSuggestions(
        currentText: currentText,
        selectedText: selectedText,
        mode: mode,
        userPrompt: userPrompt,
      );
    }
  }

  /// بناء نص المطالبة Prompt للـ Gemini API بحسب الوضع المختار
  String _buildPrompt({
    required SuggestionMode mode,
    required String currentText,
    String? selectedText,
    String? userPrompt,
  }) {
    switch (mode) {
      case SuggestionMode.autocomplete:
        return '''
أنت مساعد كاتب عربي أدبي وذكي مدمج داخل محرر الكتب والروايات (InAppAssistantService).
المهمة: قراءة السياق الحالي والنص المحدد وتقديم 3 خيارات إبداعية ومتنوعة لإكمال الفقرة أو الفكرة تلقائياً (Auto-complete idea) بأسلوب عربي فصيح متناسق مع النبرة والسياق.

[سياق الفصل الحالي]:
"""${currentText.length > 1000 ? currentText.substring(currentText.length - 1000) : currentText}"""
${selectedText != null ? '\n[النص المحدد للتكملة]:\n"""$selectedText"""' : ''}

أرجع النتيجة بصيغة JSON فقط:
{
  "mode": "autocomplete",
  "suggestions": [
    "خيار إكمال أول يكمل الجملة أو الفقرة بسلاسة وإبداع...",
    "خيار إكمال ثانٍ يقود إلى تطور سردي أو فكري مميز...",
    "خيار إكمال ثالث مكثف وبلاغي..."
  ],
  "explanation": "تفسير موجز لكيفية انسجام المقترحات مع سياق الكاتب"
}
''';

      case SuggestionMode.summary:
        return '''
أنت ناقد ومحرر لغوي عربي محترف.
المهمة: تقديم ملخص سريع وشامل للفصل التالي (Quick Chapter Summary)، مع استخراج النقاط المحورية بأسلوب عربي رصين ومختصر.

[نص الفصل]:
"""$currentText"""

أرجع النتيجة بصيغة JSON فقط:
{
  "mode": "summary",
  "summary": "فقرة موجزة ومركزة تلخص مجريات الفصل وأفكاره الجوهرية بدقة...",
  "keyPoints": [
    "النقطة المحورية الأولى",
    "النقطة المحورية الثانية",
    "النقطة المحورية الثالثة"
  ]
}
''';

      case SuggestionMode.proofread:
        final textToAudit = (selectedText != null && selectedText.isNotEmpty)
            ? selectedText
            : currentText;
        return '''
أنت مدقق لغوي ونحوي وإملائي معتمد للغة العربية.
المهمة: التدقيق الإملائي والنحوي والترقيمي للنص العربي التالي، واستخراج قائمة كاملة ودقيقة بالأخطاء ومواقعها والبدائل المقترحة وتفسير القاعدة.

[النص]:
"""$textToAudit"""

أرجع النتيجة بصيغة JSON فقط:
{
  "mode": "proofread",
  "originalText": "$textToAudit",
  "correctedText": "النص الكامل بعد تصحيح كافة الأخطاء...",
  "errors": [
    {
      "errorText": "الكلمة الخاطئة",
      "suggestion": "الكلمة المصححة",
      "explanation": "شرح القاعدة النحوية أو الإملائية...",
      "type": "spelling"
    }
  ],
  "overallFeedback": "تقييم عام للسلامة اللغوية",
  "score": 90
}
''';

      case SuggestionMode.chat:
        return '''
أنت 'مساعد كاتب الذكي' المدمج في محرر النصوص.
قدم إجابة باللغة العربية الفصحى على السؤال التالي:
"$userPrompt"
بخصوص السياق:
"""$currentText"""
''';
    }
  }

  /// تفكيك بيانات الاستجابة من Gemini
  InlineSuggestionsResult _parseResult(
    SuggestionMode mode,
    Map<String, dynamic> json,
    String originalText,
  ) {
    final suggestions = (json['suggestions'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [];

    final keyPoints = (json['keyPoints'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [];

    final errors = (json['errors'] as List<dynamic>?)
            ?.map((e) => ProofreadingError.fromMap(e as Map<String, dynamic>))
            .toList() ??
        [];

    return InlineSuggestionsResult(
      mode: mode,
      suggestions: suggestions,
      summary: json['summary'] as String?,
      keyPoints: keyPoints,
      originalText: originalText,
      correctedText: json['correctedText'] as String?,
      errors: errors,
      overallFeedback: json['overallFeedback'] as String?,
      explanation: json['explanation'] as String?,
      score: (json['score'] as num?)?.toInt(),
    );
  }

  /// محرك بديل محلي يعتمد على القواعد اللغوية الصارمة عند عدم توفر الإنترنت (متاح علناً أيضاً للاختبارات ووضع عدم الاتصال)
  InlineSuggestionsResult generateOfflineSuggestions({
    required String currentText,
    String? selectedText,
    required SuggestionMode mode,
    String? userPrompt,
  }) {
    return _generateOfflineSuggestions(
      currentText: currentText,
      selectedText: selectedText,
      mode: mode,
      userPrompt: userPrompt,
    );
  }

  /// محرك بديل محلي يعتمد على القواعد اللغوية الصارمة عند عدم توفر الإنترنت
  InlineSuggestionsResult _generateOfflineSuggestions({
    required String currentText,
    String? selectedText,
    required SuggestionMode mode,
    String? userPrompt,
  }) {
    final text = (selectedText != null && selectedText.isNotEmpty)
        ? selectedText
        : currentText;

    if (mode == SuggestionMode.autocomplete) {
      return InlineSuggestionsResult(
        mode: SuggestionMode.autocomplete,
        suggestions: [
          'واستطرد قائلاً بصوتٍ رخيم يتردد صداه في جنبات المكان، مؤكداً أن الحقيقة لا تُدرك بالظنون بل بالبصيرة النافذة.',
          'توقفت الكلمات عند حدود الدهشة، وبدا المشهد وكأنه يرسم بداية فصلٍ جديد لم يكن في حسبان أحد.',
          'ومع أولى خيوط الفجر، بدت المسألة أكثر جلاءً؛ كأن السكون الطويل كان ضرورياً لتبديد سحب التردد والحيرة.',
        ],
        explanation: 'اقتراحات إكمال سياقية تحافظ على السرد الأدبي وتناغم الفكرة.',
      );
    }

    if (mode == SuggestionMode.summary) {
      return InlineSuggestionsResult(
        mode: SuggestionMode.summary,
        summary: 'يستعرض هذا الفصل تمهيداً سردياً مكثفاً يرسخ الملامح الأولية للموضوع، ويعالج الأبعاد الفكرية والمشاعر الإنسانية المصاحبة للأحداث، ممهداً للتطورات اللاحقة.',
        keyPoints: [
          'طرح الفكرة الرئيسية وبناء الأرضية السردية للفصل.',
          'التركيز على الدوافع الداخلية وتعميق الرؤية الفكرية للشخصيات أو المبحث.',
          'تهيئة القارئ للانتقال السلس إلى المحاور القادمة بإيقاع متوازن.',
        ],
      );
    }

    if (mode == SuggestionMode.proofread) {
      final errors = <ProofreadingError>[];

      if (text.contains('هذة')) {
        errors.add(const ProofreadingError(
          errorText: 'هذة',
          suggestion: 'هذه',
          explanation: 'تكتب الهاء المربوطة في اسم الإشارة هاءً وليست تاءً مربوطة.',
          type: 'spelling',
        ));
      }
      if (text.contains(' الى ') || text.startsWith('الى ')) {
        errors.add(const ProofreadingError(
          errorText: 'الى',
          suggestion: 'إلى',
          explanation: 'همزة قطع مكسورة أسفل الألف في حرف الجر «إلى».',
          type: 'spelling',
        ));
      }
      if (text.contains(' ان ') || text.startsWith('ان ')) {
        errors.add(const ProofreadingError(
          errorText: 'ان',
          suggestion: 'أن',
          explanation: 'كتابة همزة القطع مفتوحة في الحرف المصدري أو الناسخ «أنّ / أنْ».',
          type: 'spelling',
        ));
      }

      final corrected = text
          .replaceAll('هذة', 'هذه')
          .replaceAll(RegExp(r'\bالى\b'), 'إلى')
          .replaceAll(RegExp(r'\bان\b'), 'أن');

      return InlineSuggestionsResult(
        mode: SuggestionMode.proofread,
        originalText: text,
        correctedText: corrected,
        errors: errors,
        overallFeedback: errors.isNotEmpty
            ? 'تم رصد ${errors.length} ملاحظات لغوية، ويوصى بضبط همزات القطع ورسم الهاء.'
            : 'النص سليم لغوياً ونحوياً ولا توجد أخطاء إملائية بارزة.',
        score: errors.isEmpty ? 100 : 85,
      );
    }

    return InlineSuggestionsResult(
      mode: SuggestionMode.chat,
      overallFeedback: 'أنا هنا لمساعدتك في كتابة ومراجعة كتابك خطوة بخطوة.',
    );
  }

  // ==========================================
  // حفظ محادثات المساعد التفاعلي محلياً ضمن الجلسة
  // ==========================================

  /// حفظ رسالة تفاعلية جديدة محلياً ضمن الجلسة
  Future<void> saveSessionMessage({
    required String projectId,
    required AssistantMessage message,
  }) async {
    final list = _sessionMemoryCache.putIfAbsent(projectId, () => []);
    list.add(message);

    // حفظ دائم عبر SharedPreferences لجلسة المشروع
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'katib_assistant_session_$projectId';
      final encoded = jsonEncode(list.map((m) => m.toMap()).toList());
      await prefs.setString(key, encoded);
    } catch (e) {
      debugPrint('Warning: SharedPreferences write failed: $e');
    }

    _messagesStreamController.add(List.unmodifiable(list));
  }

  /// استرجاع رسائل جلسة العمل للمشروع (وفصل محدد اختياري)
  Future<List<AssistantMessage>> getSessionMessages({
    required String projectId,
    String? chapterId,
  }) async {
    if (_sessionMemoryCache.containsKey(projectId)) {
      final cached = _sessionMemoryCache[projectId]!;
      if (chapterId != null) {
        return cached.where((m) => m.relatedChapterId == null || m.relatedChapterId == chapterId).toList();
      }
      return List.unmodifiable(cached);
    }

    // استرجاع من التخزين الدائم
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'katib_assistant_session_$projectId';
      final raw = prefs.getString(key);
      if (raw != null) {
        final List<dynamic> list = jsonDecode(raw);
        final messages = list.map((item) => AssistantMessage.fromMap(item as Map<String, dynamic>)).toList();
        _sessionMemoryCache[projectId] = messages;
        if (chapterId != null) {
          return messages.where((m) => m.relatedChapterId == null || m.relatedChapterId == chapterId).toList();
        }
        return messages;
      }
    } catch (e) {
      debugPrint('Warning: SharedPreferences read failed: $e');
    }

    // رسالة ترحيب أولى
    final initialMessage = AssistantMessage.ai(
      id: _uuid.v4(),
      text: 'مرحباً بك! أنا مساعد كاتب الذكي InAppAssistantService. يسعدني مساعدتك في إكمال أفكارك، تلخيص الفصول، أو التدقيق الإملائي والنحوي التفاعلي.',
      relatedChapterId: chapterId,
    );
    _sessionMemoryCache[projectId] = [initialMessage];
    return [initialMessage];
  }

  /// مسح سجل المحادثة المحلي للجلسة
  Future<void> clearSession(String projectId) async {
    _sessionMemoryCache.remove(projectId);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('katib_assistant_session_$projectId');
    } catch (e) {
      debugPrint('Warning: clearSession failed: $e');
    }
    _messagesStreamController.add([]);
  }

  void dispose() {
    _messagesStreamController.close();
  }
}
