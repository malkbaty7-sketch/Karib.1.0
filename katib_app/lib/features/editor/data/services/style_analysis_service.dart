import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../../domain/entities/emotion_profile_model.dart';
import '../../domain/entities/style_analysis_result.dart';

/// خدمة هندسة المشاعر والأسلوب البلاغي StyleAnalysisService
/// تتصل بـ Gemini API عبر google_generative_ai لتحليل النصوص العربية
/// وإرجاع مؤشرات التوافق والاقتراحات البلاغية مع نص مقترح دون استبدال النص الأصلي.
class StyleAnalysisService {
  StyleAnalysisService._();
  static final StyleAnalysisService instance = StyleAnalysisService._();

  /// المفتاح الافتراضي لـ Gemini من البيئة أو الإعدادات
  String? _cachedApiKey;

  void initialize({required String apiKey}) {
    _cachedApiKey = apiKey;
  }

  /// دالة تحليل وتطوير الأسلوب العربي
  /// [text]: النص العربي المراد تحليله
  /// [emotionProfile]: حزمة المشاعر ومستوى الكثافة المحدد
  /// [apiKey]: مفتاح Gemini اختياري في حال التجاوز
  Future<StyleAnalysisResult> analyzeAndImproveStyle({
    required String text,
    required EmotionProfile emotionProfile,
    String? apiKey,
  }) async {
    final key = apiKey ?? _cachedApiKey;

    if (text.trim().isEmpty) {
      return const StyleAnalysisResult(
        complianceScore: 0,
        suggestions: ['الرجاء تزويد نص لتحليله أسلوبياً وبلاغياً.'],
        rewrittenText: '',
      );
    }

    if (key == null || key.isEmpty) {
      // محاكاة محلية ذكية في حال عدم توفر مفتاح الـ API
      return _generateLocalSemanticAnalysis(text, emotionProfile);
    }

    try {
      // تهيئة نموذج Gemini عبر google_generative_ai
      final model = GenerativeModel(
        model: 'gemini-2.5-flash',
        apiKey: key,
        generationConfig: GenerationConfig(
          temperature: 0.7,
          responseMimeType: 'application/json',
        ),
      );

      final prompt = _buildRhetoricalPrompt(text, emotionProfile);
      final response = await model.generateContent([Content.text(prompt)]);
      final rawText = response.text;

      if (rawText == null || rawText.isEmpty) {
        return _generateLocalSemanticAnalysis(text, emotionProfile);
      }

      final dynamic parsedJson = jsonDecode(rawText);
      if (parsedJson is Map<String, dynamic>) {
        return StyleAnalysisResult.fromJson(parsedJson);
      }

      return _generateLocalSemanticAnalysis(text, emotionProfile);
    } catch (e) {
      // معالجة الخطأ والرجوع للتحليل الدلالي الاحتياطي
      return _generateLocalSemanticAnalysis(text, emotionProfile);
    }
  }

  /// صياغة الـ Prompt الهندسي الموجه لنموذج Gemini
  /// متخصص في البلاغة العربية (المعاني، البيان، البديع) والموسيقى اللفظية
  String _buildRhetoricalPrompt(String text, EmotionProfile profile) {
    final emotionsJoined = profile.selectedEmotions.isEmpty
        ? 'رصانة أدبية ووضوح'
        : profile.selectedEmotions.join('، ');

    return '''
أنت ناقد أدبي وعالم بلاغة ولغويات عربي متخصص في علم المعاني والبيان وتحليل الأسلوبية (Stylistics).
المهمة: تحليل النص العربي التالي دلالياً وبلاغياً ومقارنته بالملف الانفعالي المستهدف، وتقديم اقتراحات أسلوبية دقيقة.

[النص الأصلي للكاتب]:
"""
$text
"""

[الملف الانفعالي والأسلوبي المستهدف]:
- المشاعر والنبرة المطلوبة: $emotionsJoined
- درجة الكثافة الشعورية والدرامية: ${profile.intensityLevel} من 5.0

[قواعد التحليل والنقد البلاغي]:
1. حلل المعجم اللغوي (Lexicon)، وتراكيب الجمل (Syntax)، والإيقاع الموسيقي، والصور البيانية (استعارة، تشبيه، كناية).
2. احسب نسبة التوافق complianceScore (بين 0 و 100) بين النص الحالي والملف الانفعالي المطلوب ودرجة كثافته.
3. قدم قائمة suggestions تتضمن من 3 إلى 5 اقتراحات بلاغية ونقدية ملموسة (مثل: استبدال مفردات باهتة، تكثيف الجمل الفعلية أو الاسمية، موازنة الفواصل الموسيقية).
4. اكتب نصاً بديلاً مقترحاً rewrittenText يصوغ نفس المعنى الأصلي بنفس الفكرة ولكن مع رفع البلاغة والانفعال للوصول للكثافة المطلوبة، مع الحفاظ الصارم على فكرة الكاتب الأصلية.
5. ضوابط صارمة: لا تقم بأي تعديل مستبدل تلقائياً للنص الأصلي، فالصياغة المقترحة مخصصة كمسودة إرشادية مستقلة.

أرجع النتيجة حصراً بصيغة JSON مطابقة للهيكل التالي دون أي مقدمات نصية:
{
  "complianceScore": 78.5,
  "suggestions": [
    "اقتراح بلاغي دقيق 1",
    "اقتراح بلاغي دقيق 2",
    "اقتراح بلاغي دقيق 3"
  ],
  "rewrittenText": "النص البديل المقترح الذي يعكس المشاعر المطلوبة...",
  "analysisNotes": "إضاءة نقدية موجزة حول السمة الغالبة على النص الأصلي"
}
''';
  }

  /// محرك تحليل دلالي محلي سريع عند العمل دون اتصال بالإنترنت
  StyleAnalysisResult _generateLocalSemanticAnalysis(
    String text,
    EmotionProfile profile,
  ) {
    final emotions = profile.selectedEmotions;
    final primaryEmotion = emotions.isNotEmpty ? emotions.first : 'رصانة أدبية';
    
    // حساب تقريبي للتوافق بناءً على كثافة الكلمات وطول النص
    final wordCount = text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
    double baseScore = 65.0;
    if (wordCount > 20) baseScore += 10.0;
    if (profile.intensityLevel > 4.0) baseScore -= 5.0; // الكثافة العالية تتطلب جهداً بلاغياً أكبر
    final finalScore = baseScore.clamp(40.0, 95.0);

    final suggestions = <String>[
      'عزز نبرة "$primaryEmotion" باختيار مفردات تنتمي للحقل الدلالي المستهدف بدلاً من التعبيرات المحايدة.',
      'وازن بين طول الجمل وإيقاع الفواصل؛ فالنصوص الانفعالية تستفيد من الجمل القصيرة الضاغطة.',
      if (profile.intensityLevel >= 3.5)
        'كثف الصور الاستعارية والكنايات لإبراز المشاعر دون التصريح المباشر بها.',
      if (emotions.contains('غموض'))
        'استخدم التقديم والتأخير وأسلوب الحذف لإثارة تساؤلات غير مجابة في ذهن المتلقي.',
      if (emotions.contains('حماس'))
        'استبدل الأفعال الماضية الرتيبة بصيغ مضارعة متتابعة وحروف عطف سريعة.',
      if (emotions.contains('أكاديمي'))
        'تجنب التكرار والاطناب العاطفي، وركز على الاستدلال المنطقي والروابط البرهانية.',
    ];

    final rewrittenSample = _generateSuggestedRewrite(text, primaryEmotion, profile.intensityLevel);

    return StyleAnalysisResult(
      complianceScore: finalScore,
      suggestions: suggestions,
      rewrittenText: rewrittenSample,
      analysisNotes:
          'النص يمتلك بنية لغوية سليمة، وبإمكانك تعزيز الطابع الوجداني عبر تنويع الطباق والجناس الخفي.',
    );
  }

  String _generateSuggestedRewrite(String original, String emotion, double intensity) {
    if (emotion == 'غموض') {
      return 'في العتمة المتربصة خلف الكلمات، لم يكن الصمت مجرد غيابٍ للأصوات، بل كان نداءً موارباً يشي بما لا تجرؤ العيون على الإفصاح عنه... $original';
    } else if (emotion == 'حماس') {
      return 'توهجت العزائم كشررٍ يوقظ ليل السكون، واندفعت الخطى لا تلوي على تردد؛ إنه فجر الانطلاقة الذي لا يعرف التراجع! $original';
    } else if (emotion == 'دفء') {
      return 'كسكينة الصباح حين تعانق زجاج النوافذ العتيقة، تهادت الحروف حاملةً عبق الطمأنينة وحميمية الذكريات الراسخة: $original';
    } else if (emotion == 'أكاديمي') {
      return 'بالاستناد إلى الفحص المنهجي للشواهد، يتجلى بوضوح أن العلاقة بين المعطيات تستوجب استقراءً رصيناً: $original';
    } else {
      return 'بارتقاءٍ أسلوبي يستحضر جلاء البلاغة العربية وتناغم السبك، تتكامل الرؤية الأدبية كالتالي: $original';
    }
  }
}
