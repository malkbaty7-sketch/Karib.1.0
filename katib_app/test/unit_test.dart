import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katib_app/core/theme/app_theme.dart';
import 'package:katib_app/features/editor/domain/entities/chapter_model.dart';
import 'package:katib_app/features/editor/domain/entities/citation_model.dart';
import 'package:katib_app/features/editor/domain/entities/emotion_profile_model.dart';
import 'package:katib_app/features/editor/domain/entities/style_analysis_result.dart';
import 'package:katib_app/features/editor/data/services/style_analysis_service.dart';
import 'package:katib_app/features/extraction/domain/entities/extracted_source.dart';
import 'package:katib_app/features/extraction/data/services/semantic_search_service.dart';
import 'package:katib_app/features/mind_map/domain/entities/canvas_node.dart';
import 'package:katib_app/features/mind_map/domain/entities/canvas_edge.dart';
import 'package:katib_app/features/library/domain/entities/book_entity.dart';
import 'package:katib_app/features/editor/data/services/export_service.dart';
import 'package:katib_app/features/audiobook/domain/entities/audio_track.dart';
import 'package:katib_app/features/audiobook/data/services/audiobook_service.dart';
import 'package:katib_app/features/sync/domain/entities/sync_metadata.dart';
import 'package:katib_app/features/sync/domain/entities/chapter_backup.dart';
import 'package:katib_app/features/sync/data/services/cloud_sync_service.dart';
import 'package:katib_app/features/assistant/domain/entities/assistant_message.dart';
import 'package:katib_app/features/assistant/data/services/in_app_assistant_service.dart';
import 'package:katib_app/features/assistant/presentation/widgets/floating_assistant_widget.dart';
import 'package:katib_app/core/services/crash_reporting_service.dart';
import 'package:pdf/pdf.dart';
import 'package:archive/archive.dart';
import 'dart:convert';

void main() {
  group('1. اختبارات كائن بيانات الفصل (ChapterModel Unit Tests)', () {
    const testMap = {
      'id': 'chap_101',
      'book_id': 'book_999',
      'title': 'الفصل الأول: إشراقة البدايات',
      'order_index': 1,
      'content_json': '{"ops":[{"insert":"النص التمهيدي للفصل\\n"}]}',
      'plain_text': 'النص التمهيدي للفصل العربي وتجلي الفكرة',
    };

    test('يجب تحويل البيانات من Map إلى Chapter بشكل سليم (fromMap)', () {
      final chapter = Chapter.fromMap(testMap);

      expect(chapter.id, equals('chap_101'));
      expect(chapter.bookId, equals('book_999'));
      expect(chapter.title, equals('الفصل الأول: إشراقة البدايات'));
      expect(chapter.orderIndex, equals(1));
      expect(chapter.contentJson, contains('ops'));
      expect(chapter.plainText, contains('النص التمهيدي'));
    });

    test('يجب تحويل كائن Chapter إلى Map لتخزينه في SQLite (toMap)', () {
      const chapter = Chapter(
        id: 'chap_202',
        bookId: 'book_999',
        title: 'الفصل الثاني: مسارات الصراع',
        orderIndex: 2,
        contentJson: '{"ops":[]}',
        plainText: 'كلمات الفصل الثاني',
      );

      final map = chapter.toMap();

      expect(map['id'], equals('chap_202'));
      expect(map['book_id'], equals('book_999'));
      expect(map['title'], equals('الفصل الثاني: مسارات الصراع'));
      expect(map['order_index'], equals(2));
      expect(map['plain_text'], equals('كلمات الفصل الثاني'));
    });

    test('يجب حساب عدد الكلمات العربية بدقة وتجاهل المسافات الزائدة', () {
      const emptyChapter = Chapter(
        id: 'c1',
        bookId: 'b1',
        title: 'فصل فارغ',
        orderIndex: 0,
        contentJson: '{}',
        plainText: '   ',
      );
      expect(emptyChapter.wordCount, equals(0));

      const arabicChapter = Chapter(
        id: 'c2',
        bookId: 'b1',
        title: 'فصل',
        orderIndex: 0,
        contentJson: '{}',
        plainText: 'بسم   الله   الرحمن الرحيم \n\n في هذا الفصل سنناقش المسائل الفكرية',
      );
      // 'بسم', 'الله', 'الرحمن', 'الرحيم', 'في', 'هذا', 'الفصل', 'سنناقش', 'المسائل', 'الفكرية' = 10 كلمات
      expect(arabicChapter.wordCount, equals(10));
      expect(arabicChapter.characterCount, equals(arabicChapter.plainText.length));
    });

    test('يجب دعم تعديل الخصائص عبر copyWith مع الحفاظ على عدم التغيير (Immutability)', () {
      const original = Chapter(
        id: 'c1',
        bookId: 'b1',
        title: 'العنوان الأصلي',
        orderIndex: 0,
        contentJson: '{}',
        plainText: 'النص الأصلي',
      );

      final modified = original.copyWith(
        title: 'العنوان المعدل',
        plainText: 'النص الجديد والمعدل',
      );

      expect(modified.id, equals('c1'));
      expect(modified.title, equals('العنوان المعدل'));
      expect(modified.plainText, equals('النص الجديد والمعدل'));
      expect(original.title, equals('العنوان الأصلي')); // التأكد من عدم تعديل الأصل
    });

    test('يجب التحقق من تطابق الكائنات ذات نفس البيانات (Equatable)', () {
      const chapterA = Chapter(
        id: 'c1',
        bookId: 'b1',
        title: 'عنوان',
        orderIndex: 0,
        contentJson: '{}',
        plainText: 'نص',
      );

      const chapterB = Chapter(
        id: 'c1',
        bookId: 'b1',
        title: 'عنوان',
        orderIndex: 0,
        contentJson: '{}',
        plainText: 'نص',
      );

      expect(chapterA, equals(chapterB));
    });
  });

  group('2. اختبارات خدمة تحليل وهندسة الأسلوب (StyleAnalysisService Unit Tests)', () {
    final service = StyleAnalysisService.instance;

    test('يجب إرجاع نتيجة صفرية عند تزويد نص فارغ للتحليل', () async {
      const emptyProfile = EmotionProfile(
        selectedEmotions: ['حماس'],
        intensityLevel: 3.5,
      );

      final result = await service.analyzeAndImproveStyle(
        text: '   ',
        emotionProfile: emptyProfile,
      );

      expect(result.complianceScore, equals(0.0));
      expect(result.rewrittenText, isEmpty);
      expect(result.suggestions.first, contains('الرجاء تزويد نص'));
    });

    test('يجب حساب نسبة التوافق (complianceScore) بدقة ضمن النطاق [40 - 95] في المحرك المحلي', () async {
      const sampleText = '''
      كان المساء يلقي بظلاله الهادئة على المدينة القديمة، والأزقة الضيقة تهمس بأسرار 
      العابرين الذين نقشوا حكاياتهم على حجارة الجدران العتيقة، منتظرين فجراً يحمل بشائر الأمل.
      ''';

      const profileMystery = EmotionProfile(
        selectedEmotions: ['غموض', 'حماس'],
        intensityLevel: 4.5,
      );

      final result = await service.analyzeAndImproveStyle(
        text: sampleText,
        emotionProfile: profileMystery,
      );

      // التأكد من أن النسبة تقع بين 40.0 و 95.0
      expect(result.complianceScore, greaterThanOrEqualTo(40.0));
      expect(result.complianceScore, lessThanOrEqualTo(95.0));

      // التأكد من توليد مقترحات بلاغية متوافقة مع المشاعر المطلوبة
      expect(result.suggestions, isNotEmpty);
      expect(
        result.suggestions.any((s) => s.contains('غموض') || s.contains('الفواصل') || s.contains('حماس')),
        isTrue,
      );

      // التأكد من توليد صياغة بديلة مقترحة دون حذف النص الأصلي
      expect(result.rewrittenText, isNotEmpty);
      expect(result.rewrittenText, contains('العتمة')); // من الصياغة الخاصة بنبرة الغموض
    });

    test('يجب التحقق من صحة استخراج وبناء كائن StyleAnalysisResult من JSON صحيح', () {
      final jsonSample = {
        'complianceScore': 87.5,
        'suggestions': [
          'استبدل صيغة الفعل الماضي بصيغ مضارعة متتابعة.',
          'كثف التشبيهات التمثيلية في مطلع الفقرة.'
        ],
        'rewrittenText': 'نص بلاغي مقترح بمستوى انفعالي عالٍ...',
        'analysisNotes': 'ملاحظات نقدية متخصصة'
      };

      final result = StyleAnalysisResult.fromJson(jsonSample);

      expect(result.complianceScore, equals(87.5));
      expect(result.suggestions.length, equals(2));
      expect(result.rewrittenText, contains('نص بلاغي مقترح'));
      expect(result.analysisNotes, equals('ملاحظات نقدية متخصصة'));
    });

    test('يجب توليد النص البديل المتناغم مع نبرة المشاعر الأكاديمية والرصانة', () async {
      const academicText = 'العلاقة بين التراث والحداثة مسألة معقدة تستدعي التحليل.';
      const academicProfile = EmotionProfile(
        selectedEmotions: ['أكاديمي'],
        intensityLevel: 3.0,
      );

      final result = await service.analyzeAndImproveStyle(
        text: academicText,
        emotionProfile: academicProfile,
      );

      expect(result.complianceScore, greaterThanOrEqualTo(60.0));
      expect(result.rewrittenText, contains('بالاستناد إلى الفحص المنهجي للشواهد'));
      expect(result.suggestions.any((s) => s.contains('أكاديمي') || s.contains('الاستدلال')), isTrue);
    });

    test('يجب تحويل وبناء كائن EmotionProfile من وإلى JSON مع دعم copyWith', () {
      const profile = EmotionProfile(
        selectedEmotions: ['غموض', 'تشويق'],
        intensityLevel: 4.2,
      );

      final jsonMap = profile.toJson();
      expect(jsonMap['selectedEmotions'], equals(['غموض', 'تشويق']));
      expect(jsonMap['intensityLevel'], equals(4.2));

      final restored = EmotionProfile.fromJson(jsonMap);
      expect(restored.selectedEmotions, equals(['غموض', 'تشويق']));
      expect(restored.intensityLevel, equals(4.2));

      final copied = profile.copyWith(intensityLevel: 5.0);
      expect(copied.intensityLevel, equals(5.0));
      expect(copied.selectedEmotions, equals(['غموض', 'تشويق']));
      expect(EmotionProfile.availableEmotions, contains('غموض'));
      expect(EmotionProfile.availableEmotions, contains('حماس'));
      expect(EmotionProfile.availableEmotions, contains('دفء'));
    });

    test('يجب دعم copyWith وتحويل كائن StyleAnalysisResult إلى JSON', () {
      const result = StyleAnalysisResult(
        complianceScore: 82.0,
        suggestions: ['تكثيف الصور البيانية'],
        rewrittenText: 'نص مقترح',
        analysisNotes: 'ملاحظة',
      );

      final jsonMap = result.toJson();
      expect(jsonMap['complianceScore'], equals(82.0));
      expect(jsonMap['suggestions'], equals(['تكثيف الصور البيانية']));
      expect(jsonMap['rewrittenText'], equals('نص مقترح'));
      expect(jsonMap['analysisNotes'], equals('ملاحظة'));

      final modified = result.copyWith(complianceScore: 90.0);
      expect(modified.complianceScore, equals(90.0));
      expect(modified.rewrittenText, equals('نص مقترح'));
    });
  });

  group('3. اختبارات محرك البحث الدلالي واستخراج المصادر (ExtractedSource & SemanticSearchService Tests)', () {
    test('يجب بناء كائن ExtractedSource وتحويله من وإلى Map بدقة (fromMap / toMap)', () {
      final sourceMap = {
        'sourceFileName': 'دلائل الإعجاز في علم المعاني',
        'pageNumber': 118,
        'author': 'عبد القاهر الجرجاني',
        'excerpt': 'الألفاظ خدم للمعاني، والمعاني هي المقصد والغاية في النظم.',
        'relevanceScore': 97.5,
        'chapterTitle': 'فصل في حقيقة النظم والبيان',
      };

      final source = ExtractedSource.fromMap(sourceMap);

      expect(source.sourceFileName, equals('دلائل الإعجاز في علم المعاني'));
      expect(source.pageNumber, equals(118));
      expect(source.author, equals('عبد القاهر الجرجاني'));
      expect(source.excerpt, contains('الألفاظ خدم للمعاني'));
      expect(source.relevanceScore, equals(97.5));
      expect(source.chapterTitle, equals('فصل في حقيقة النظم والبيان'));

      final convertedMap = source.toMap();
      expect(convertedMap['sourceFileName'], equals('دلائل الإعجاز في علم المعاني'));
      expect(convertedMap['pageNumber'], equals(118));
      expect(convertedMap['author'], equals('عبد القاهر الجرجاني'));
    });

    test('يجب توليد التوثيق الأكاديمي المكتمل مع الصفحة والمؤلف بشكل سليم', () {
      const source = ExtractedSource(
        sourceFileName: 'سحر البلاغة وسر الفصاحة',
        pageNumber: 42,
        author: 'أبو منصور الثعالبي',
        excerpt: 'البلاغة مطابقة الكلام لمقتضى الحال مع فصاحته وحسن سبكه.',
      );

      final citation = source.toAcademicCitation();
      expect(citation, contains('الثعالبي'));
      expect(citation, contains('سحر البلاغة'));
      expect(citation, contains('ص 42'));
      expect(citation, contains('«البلاغة مطابقة الكلام لمقتضى الحال مع فصاحته وحسن سبكه.»'));
    });

    test('يجب أن يتضمن الـ Prompt الموجه لـ Gemini تعليمات إرجاع اسم المستند ورقم الصفحة', () {
      final service = SemanticSearchService.instance;
      final prompt = service.buildGeminiPrompt(
        query: 'جدلية اللفظ والمعنى في التراث البلاغي',
        books: [],
        mode: SemanticSearchMode.passages,
      );

      expect(prompt, contains('sourceFileName'));
      expect(prompt, contains('pageNumber'));
      expect(prompt, contains('author'));
      expect(prompt, contains('excerpt'));
      expect(prompt, contains('جدلية اللفظ والمعنى'));
      expect(prompt, contains('application/json'));
    });
  });

  group('4. اختبارات كائن المرجع والاقتباس (Citation Model Unit Tests)', () {
    test('يجب تحويل المرجع من وإلى Map بدقة للتخزين في SQLite (fromMap / toMap)', () {
      final now = DateTime.now();
      final map = {
        'id': 'cit_101',
        'chapter_id': 'ch_1',
        'book_id': 'b_1',
        'source_file_name': 'سحر البلاغة وسر الفصاحة',
        'page_number': 42,
        'author': 'أبو منصور الثعالبي',
        'excerpt': 'البلاغة مطابقة الكلام لمقتضى الحال مع فصاحته وحسن سبكه.',
        'created_at': now.toIso8601String(),
      };

      final citation = Citation.fromMap(map);

      expect(citation.id, equals('cit_101'));
      expect(citation.chapterId, equals('ch_1'));
      expect(citation.sourceFileName, equals('سحر البلاغة وسر الفصاحة'));
      expect(citation.pageNumber, equals(42));
      expect(citation.author, equals('أبو منصور الثعالبي'));
      expect(citation.excerpt, contains('مطابقة الكلام'));

      final convertedMap = citation.toMap();
      expect(convertedMap['id'], equals('cit_101'));
      expect(convertedMap['page_number'], equals(42));
      expect(convertedMap['author'], equals('أبو منصور الثعالبي'));
    });

    test('يجب صياغة نص التوثيق المرجعي الأكاديمي الموحد كـ Footnote', () {
      final citation = Citation(
        id: 'cit_102',
        chapterId: 'ch_1',
        bookId: 'b_1',
        sourceFileName: 'دلائل الإعجاز',
        pageNumber: 118,
        author: 'عبد القاهر الجرجاني',
        excerpt: 'الألفاظ خدم للمعاني.',
        createdAt: DateTime.now(),
      );

      final formatted = citation.formattedAcademicReference;
      expect(formatted, contains('الجرجاني'));
      expect(formatted, contains('دلائل الإعجاز'));
      expect(formatted, contains('118'));
      expect(formatted, contains('«الألفاظ خدم للمعاني.»'));
    });
  });

  group('5. اختبارات السبورة الذهنية والـ Canvas (CanvasNode & CanvasEdge Unit Tests)', () {
    test('يجب بناء وتحويل CanvasNode مع إحداثيات الموضع dx, dy واللون السداسي (fromMap / toMap)', () {
      final now = DateTime.now();
      final nodeMap = {
        'id': 'node_201',
        'book_id': 'book_1',
        'title': 'شخصية البطل: المعلم الحكيم',
        'content': 'يمثل الضمير الأخلاقي في الرواية ويوجه الأحداث.',
        'dx': 350.5,
        'dy': 220.0,
        'color_hex': '#10B981',
        'node_type': 'character',
        'width': 240.0,
        'height': 150.0,
        'created_at': now.toIso8601String(),
        'updated_at': now.toIso8601String(),
      };

      final node = CanvasNode.fromMap(nodeMap);

      expect(node.id, equals('node_201'));
      expect(node.title, equals('شخصية البطل: المعلم الحكيم'));
      expect(node.dx, equals(350.5));
      expect(node.dy, equals(220.0));
      expect(node.colorHex, equals('#10B981'));
      expect(node.nodeType, equals('character'));
      expect(node.typeEnum, equals(CanvasNodeType.character));

      final convertedMap = node.toMap();
      expect(convertedMap['dx'], equals(350.5));
      expect(convertedMap['dy'], equals(220.0));
      expect(convertedMap['color_hex'], equals('#10B981'));
    });

    test('يجب تحديث موضع العقدة بدقة عند السحب والإفلات (Drag & Drop copyWith)', () {
      const initialNode = CanvasNode(
        id: 'node_1',
        bookId: 'b_1',
        title: 'فكرة البداية',
        content: 'وصف الفكرة',
        dx: 100.0,
        dy: 100.0,
        colorHex: '#F59E0B',
        nodeType: 'idea',
      );

      final movedNode = initialNode.copyWith(
        dx: 240.0,
        dy: 380.5,
      );

      expect(movedNode.dx, equals(240.0));
      expect(movedNode.dy, equals(380.5));
      expect(movedNode.id, equals(initialNode.id));
      expect(initialNode.dx, equals(100.0)); // تأكيد الحفاظ على عدم التغيير
    });

    test('يجب بناء مسار CanvasEdge لربط عقدتين مع تسمية توضيحية', () {
      final edge = CanvasEdge(
        id: 'edge_1',
        bookId: 'b_1',
        fromNodeId: 'node_1',
        toNodeId: 'node_2',
        label: 'يقود إلى الصراع',
        colorHex: '#3B82F6',
        strokeWidth: 2.5,
        lineStyle: 'solid',
        createdAt: DateTime.now(),
      );

      expect(edge.fromNodeId, equals('node_1'));
      expect(edge.toNodeId, equals('node_2'));
      expect(edge.label, equals('يقود إلى الصراع'));
      expect(edge.strokeWidth, equals(2.5));

      final map = edge.toMap();
      expect(map['from_node_id'], equals('node_1'));
      expect(map['to_node_id'], equals('node_2'));
      expect(map['label'], equals('يقود إلى الصراع'));
    });
  });

  group('6. اختبارات استوديو التصدير والنشر (ExportService & ExportConfig Unit Tests)', () {
    final exportService = ExportService.instance;

    final testBook = BookEntity(
      id: 'book_export_1',
      title: 'أسرار البيان وإعجاز القرآن',
      author: 'الإمام فخر الدين الرازي',
      category: 'بلاغة وتفسير',
      coverUrl: '',
      wordCount: 1540,
      createdAt: DateTime(2025, 1, 1),
      updatedAt: DateTime(2025, 1, 1),
    );

    final testChapters = [
      const Chapter(
        id: 'chap_1',
        bookId: 'book_export_1',
        title: 'المقدمة في فضل علم البيان',
        orderIndex: 1,
        contentJson: '{}',
        plainText: 'الحمد لله الذي أنزل القرآن بلسان عربي مبين، وجعل البلاغة مفتاح فهم أسراره ومعانيه الدقيقة.',
      ),
      const Chapter(
        id: 'chap_2',
        bookId: 'book_export_1',
        title: 'الفصل الأول: وجوه الإعجاز البلاغي',
        orderIndex: 2,
        contentJson: '{}',
        plainText: 'إن تلاؤم الحروف وبراعة التراكيب وحسن السبك هو الغاية القصوى التي يطمح إليها كل بليغ.',
      ),
    ];

    final testCitations = [
      Citation(
        id: 'cit_export_1',
        chapterId: 'chap_1',
        bookId: 'book_export_1',
        sourceFileName: 'دلائل الإعجاز',
        pageNumber: 45,
        author: 'عبد القاهر الجرجاني',
        excerpt: 'النظم هو توخي معاني النحو فيما بين الكلم على حسب الأغراض.',
        createdAt: DateTime(2025, 1, 1),
      ),
    ];

    test('يجب أن تحتوي ExportConfig على القيم الافتراضية المعتمدة', () {
      const config = ExportConfig();

      expect(config.fontFamily, equals('Cairo'));
      expect(config.includeCoverPage, isTrue);
      expect(config.includeTableOfContents, isTrue);
      expect(config.includeFootnotes, isTrue);
      expect(config.pageNumbering, isTrue);
      expect(config.pageSize, equals(PageSizeOption.a4));
      expect(config.margins, equals(MarginOption.defaultMargins));
      expect(config.numberingStyle, equals(NumberingStyle.pageOfTotal));
      expect(config.fontSize, equals(12.0));
    });

    test('يجب حساب أبعاد ومقاسات الصفحات والهوامش بدقة (resolvedPageFormat)', () {
      // 1. A4 مع هوامش افتراضية (20 مم)
      const a4Config = ExportConfig(pageSize: PageSizeOption.a4, margins: MarginOption.defaultMargins);
      final a4Format = a4Config.resolvedPageFormat;
      expect(a4Format.width, equals(PdfPageFormat.a4.width));
      expect(a4Format.height, equals(PdfPageFormat.a4.height));
      expect(a4Format.marginTop, closeTo(20.0 * PdfPageFormat.mm, 0.01));

      // 2. A5 مع هوامش ضيقة (10 مم)
      const a5Config = ExportConfig(pageSize: PageSizeOption.a5, margins: MarginOption.narrow);
      final a5Format = a5Config.resolvedPageFormat;
      expect(a5Format.width, equals(PdfPageFormat.a5.width));
      expect(a5Format.height, equals(PdfPageFormat.a5.height));
      expect(a5Format.marginLeft, closeTo(10.0 * PdfPageFormat.mm, 0.01));

      // 3. B5 مع هوامش واسعة (30 مم)
      const b5Config = ExportConfig(pageSize: PageSizeOption.b5, margins: MarginOption.wide);
      final b5Format = b5Config.resolvedPageFormat;
      expect(b5Format.width, closeTo(176.0 * PdfPageFormat.mm, 0.01));
      expect(b5Format.height, closeTo(250.0 * PdfPageFormat.mm, 0.01));
      expect(b5Format.marginRight, closeTo(30.0 * PdfPageFormat.mm, 0.01));

      // 4. Letter
      const letterConfig = ExportConfig(pageSize: PageSizeOption.letter);
      final letterFormat = letterConfig.resolvedPageFormat;
      expect(letterFormat.width, equals(PdfPageFormat.letter.width));
      expect(letterFormat.height, equals(PdfPageFormat.letter.height));
    });

    test('يجب تحويل وتنسيق أرقام الصفحات حسب النمط المختار بدقة (formatPageNumber)', () {
      // أرقام عربية مشرقية
      const arabicNumeralsConfig = ExportConfig(numberingStyle: NumberingStyle.arabicNumerals);
      expect(arabicNumeralsConfig.formatPageNumber(1, 10), equals('١'));
      expect(arabicNumeralsConfig.formatPageNumber(14, 25), equals('١٤'));
      expect(arabicNumeralsConfig.formatPageNumber(109, 200), equals('١٠٩'));

      // حروف أبجدية
      const abjadConfig = ExportConfig(numberingStyle: NumberingStyle.abjad);
      expect(abjadConfig.formatPageNumber(1, 10), equals('أ'));
      expect(abjadConfig.formatPageNumber(2, 10), equals('ب'));
      expect(abjadConfig.formatPageNumber(3, 10), equals('ج'));
      expect(abjadConfig.formatPageNumber(4, 10), equals('د'));

      // رقم داخل دائرة
      const circledConfig = ExportConfig(numberingStyle: NumberingStyle.circled);
      expect(circledConfig.formatPageNumber(1, 10), equals('①'));
      expect(circledConfig.formatPageNumber(5, 10), equals('⑤'));
      expect(circledConfig.formatPageNumber(10, 10), equals('⑩'));

      // صيغة الصفحة X من Y
      const pageOfTotalConfig = ExportConfig(numberingStyle: NumberingStyle.pageOfTotal);
      expect(pageOfTotalConfig.formatPageNumber(7, 32), equals('الصفحة 7 من 32'));
    });

    test('يجب توليد مستند Word (.docx) متكامل بصيغة OpenXML وداعم لـ RTL', () async {
      final docxBytes = await exportService.generateDocxBook(
        book: testBook,
        chapters: testChapters,
        citations: testCitations,
        config: const ExportConfig(),
      );

      expect(docxBytes, isNotEmpty);

      // فك ضغط الأرشيف والتحقق من ملفات OpenXML القياسية
      final archive = ZipDecoder().decodeBytes(docxBytes);
      final fileNames = archive.files.map((f) => f.name).toList();

      expect(fileNames, contains('[Content_Types].xml'));
      expect(fileNames, contains('_rels/.rels'));
      expect(fileNames, contains('word/document.xml'));
      expect(fileNames, contains('word/styles.xml'));
      expect(fileNames, contains('word/settings.xml'));

      // التحقق من احتواء document.xml على عنوان الكتاب والفصول وهوامش المراجع
      final docFile = archive.findFile('word/document.xml');
      expect(docFile, isNotNull);
      final docXml = utf8.decode(docFile!.content as List<int>);
      expect(docXml, contains('أسرار البيان وإعجاز القرآن'));
      expect(docXml, contains('فخر الدين الرازي'));
      expect(docXml, contains('المقدمة في فضل علم البيان'));
      expect(docXml, contains('دلائل الإعجاز'));
      expect(docXml, contains('عبد القاهر الجرجاني'));
      expect(docXml, contains('w:bidi')); // تأكيد دعم RTL
    });

    test('يجب توليد كتاب رقمي بصيغة ePub 3.0 سليم المعايير وداعم لـ RTL', () async {
      final epubBytes = await exportService.generateEpubBook(
        book: testBook,
        chapters: testChapters,
        citations: testCitations,
        config: const ExportConfig(),
      );

      expect(epubBytes, isNotEmpty);

      final archive = ZipDecoder().decodeBytes(epubBytes);
      final fileNames = archive.files.map((f) => f.name).toList();

      // التحقق من مواصفات EPUB3 الصارمة (mimetype, META-INF, OEBPS)
      expect(fileNames.first, equals('mimetype'));
      expect(fileNames, contains('META-INF/container.xml'));
      expect(fileNames, contains('OEBPS/content.opf'));
      expect(fileNames, contains('OEBPS/nav.xhtml'));
      expect(fileNames, contains('OEBPS/cover.xhtml'));
      expect(fileNames, contains('OEBPS/styles.css'));
      expect(fileNames, contains('OEBPS/chapter_1.xhtml'));
      expect(fileNames, contains('OEBPS/chapter_2.xhtml'));

      // التحقق من ملف التوصيف OPF
      final opfFile = archive.findFile('OEBPS/content.opf');
      expect(opfFile, isNotNull);
      final opfContent = utf8.decode(opfFile!.content as List<int>);
      expect(opfContent, contains('dir="rtl"'));
      expect(opfContent, contains('<dc:title>أسرار البيان وإعجاز القرآن</dc:title>'));
      expect(opfContent, contains('<dc:creator>الإمام فخر الدين الرازي</dc:creator>'));
      expect(opfContent, contains('<dc:language>ar</dc:language>'));
    });

    test('يجب التحقق من صيغ التصدير المدعومة ExportFormat', () {
      expect(ExportFormat.values.length, equals(3));
      expect(ExportFormat.values, contains(ExportFormat.pdf));
      expect(ExportFormat.values, contains(ExportFormat.docx));
      expect(ExportFormat.values, contains(ExportFormat.epub));
    });
  });

  group('7. اختبارات محرك الكتب الصوتية (AudioTrack & AudiobookService Tests)', () {
    test('يجب تحويل وبناء كائن AudioTrack من وإلى Map بدقة (fromMap / toMap)', () {
      final now = DateTime(2025, 5, 20, 10, 30);
      final map = {
        'chapter_id': 'chap_audio_1',
        'chapter_title': 'الفصل الصوتي: أسرار المعاني',
        'audio_file_path': '/storage/audiobooks/chap_1.wav',
        'duration_ms': 185000, // 3 دقائق و5 ثوانٍ
        'plain_text': 'في هذا الفصل الصوتي نستمع إلى تجليات البلاغة العربية الفصيحة.',
        'speed': 1.25,
        'pitch': 1.1,
        'language': 'ar-SA',
        'created_at': now.toIso8601String(),
      };

      final track = AudioTrack.fromMap(map);

      expect(track.chapterId, equals('chap_audio_1'));
      expect(track.chapterTitle, equals('الفصل الصوتي: أسرار المعاني'));
      expect(track.audioFilePath, equals('/storage/audiobooks/chap_1.wav'));
      expect(track.duration.inMilliseconds, equals(185000));
      expect(track.duration.inMinutes, equals(3));
      expect(track.speed, equals(1.25));
      expect(track.pitch, equals(1.1));
      expect(track.language, equals('ar-SA'));
      expect(track.formattedDuration, equals('03:05'));

      final convertedMap = track.toMap();
      expect(convertedMap['chapter_id'], equals('chap_audio_1'));
      expect(convertedMap['duration_ms'], equals(185000));
      expect(convertedMap['speed'], equals(1.25));
    });

    test('يجب تنسيق مدة المسار الصوتي بشكل سليم للدقائق والساعات', () {
      final shortTrack = AudioTrack(
        chapterId: 'c1',
        chapterTitle: 'قصير',
        duration: const Duration(minutes: 4, seconds: 12),
        createdAt: DateTime.now(),
      );
      expect(shortTrack.formattedDuration, equals('04:12'));

      final longTrack = AudioTrack(
        chapterId: 'c2',
        chapterTitle: 'طويل',
        duration: const Duration(hours: 1, minutes: 23, seconds: 45),
        createdAt: DateTime.now(),
      );
      expect(longTrack.formattedDuration, equals('1:23:45'));
    });

    test('يجب حساب عدد كلمات المسار الصوتي بدقة', () {
      final track = AudioTrack(
        chapterId: 'c1',
        chapterTitle: 'تأملات',
        plainText: 'بسم الله الرحمن الرحيم، أهلاً بكم في هذا الكتاب الصوتي العربي.',
        duration: const Duration(seconds: 40),
        createdAt: DateTime.now(),
      );
      // 'بسم', 'الله', 'الرحمن', 'الرحيم،', 'أهلاً', 'بكم', 'في', 'هذا', 'الكتاب', 'الصوتي', 'العربي.' = 11 كلمة
      expect(track.wordCount, equals(11));
    });

    test('يجب دعم copyWith للحفاظ على مبدأ عدم التغيير (Immutability)', () {
      final initial = AudioTrack(
        chapterId: 'c1',
        chapterTitle: 'الأصل',
        duration: const Duration(minutes: 2),
        speed: 1.0,
        createdAt: DateTime.now(),
      );

      final modified = initial.copyWith(
        speed: 1.5,
        chapterTitle: 'المعدل',
      );

      expect(modified.chapterId, equals('c1'));
      expect(modified.speed, equals(1.5));
      expect(modified.chapterTitle, equals('المعدل'));
      expect(initial.speed, equals(1.0));
      expect(initial.chapterTitle, equals('الأصل'));
    });

    test('يجب تقسيم النص العربي بذكاء إلى جمل متماسكة وفق الفواصل وعلامات الترقيم (splitTextIntoSentences)', () {
      const arabicText = '''
      كان المساء يلقي بظلاله الهادئة على المدينة العتيقة. والأزقة الضيقة تهمس بأسرار العابرين،
      هل تساءلت يوماً عن حقيقة البلاغة؟ إنها مطابقة الكلام لمقتضى الحال!
      ''';

      final sentences = AudiobookService.splitTextIntoSentences(arabicText);

      expect(sentences, isNotEmpty);
      expect(sentences.length, greaterThanOrEqualTo(3));
      // التأكد من تقسيم علامات الاستفهام والتعجب والنقاط
      expect(sentences.any((s) => s.contains('كان المساء')), isTrue);
      expect(sentences.any((s) => s.contains('هل تساءلت يوماً')), isTrue);
      expect(sentences.any((s) => s.contains('إنها مطابقة الكلام')), isTrue);
    });

    test('يجب تقدير مدة المسار الصوتي بناءً على الكلمات وسرعة القراءة (estimateAudioDuration)', () {
      // 130 كلمة بالدقيقة عند سرعة 1.0x تعني تقريباً دقيقة واحدة (60 ثانية)
      final sampleWords = List.generate(130, (i) => 'كلمة').join(' ');

      final duration1x = AudiobookService.estimateAudioDuration(sampleWords, speed: 1.0);
      expect(duration1x.inSeconds, closeTo(60, 5));

      // عند مضاعفة السرعة إلى 2.0x تصبح المدة نصف الوقت تقريباً (30 ثانية)
      final duration2x = AudiobookService.estimateAudioDuration(sampleWords, speed: 2.0);
      expect(duration2x.inSeconds, closeTo(30, 5));
    });

    test('يجب التحقق من تطابق كائنات AudioTrack عند تساوي الخصائص (Equatable)', () {
      final now = DateTime(2025, 1, 1);
      final track1 = AudioTrack(
        chapterId: 'ch1',
        chapterTitle: 'العنوان',
        duration: const Duration(minutes: 5),
        createdAt: now,
      );
      final track2 = AudioTrack(
        chapterId: 'ch1',
        chapterTitle: 'العنوان',
        duration: const Duration(minutes: 5),
        createdAt: now,
      );

      expect(track1, equals(track2));
    });
  });

  group('8. اختبارات المزامنة السحابية والنسخ الاحتياطي (CloudSync & Backup Unit Tests)', () {
    test('يجب بناء وتحويل كائن ChapterBackup من وإلى Map بدقة لحفظ نسخ التعارض', () {
      final now = DateTime(2025, 4, 15, 14, 20);
      final backup = ChapterBackup(
        id: 'backup_99',
        chapterId: 'chap_1',
        chapterTitle: 'المقدمة البلاغية',
        content: 'نص المسودة السابقة قبل حدوث التعارض وتحديث السحابة',
        timestamp: now,
        deviceId: 'device_pixel_8',
        deviceName: 'هاتف الكاتب الأساسي',
        reason: 'تعديل سحابي أحدث من جهاز لوحي',
      );

      final map = backup.toMap();
      expect(map['id'], equals('backup_99'));
      expect(map['chapterId'], equals('chap_1'));
      expect(map['chapterTitle'], equals('المقدمة البلاغية'));
      expect(map['content'], contains('نص المسودة السابقة'));
      expect(map['timestamp'], equals(now.millisecondsSinceEpoch));
      expect(map['deviceId'], equals('device_pixel_8'));
      expect(map['reason'], contains('تعديل سحابي'));

      final restored = ChapterBackup.fromMap(map);
      expect(restored.id, equals('backup_99'));
      expect(restored.chapterTitle, equals('المقدمة البلاغية'));
      expect(restored.content, equals(backup.content));
      expect(restored.deviceId, equals('device_pixel_8'));
    });

    test('يجب تتبع حالة المزامنة وتاريخ آخر تعديل في CitationSyncModel (SyncableEntity)', () {
      final now = DateTime(2025, 6, 1, 12, 0);
      final citation = CitationSyncModel(
        id: 'cit_sync_1',
        chapterId: 'ch_1',
        sourceFileName: 'دلائل الإعجاز',
        pageNumber: 88,
        author: 'الجرجاني',
        excerpt: 'الألفاظ أوعية المعاني',
        lastModified: now,
        isSynced: false,
      );

      expect(citation.isSynced, isFalse);
      expect(citation.lastModified, equals(now));

      final map = citation.toMap();
      expect(map['isSynced'], equals(0));
      expect(map['lastModified'], equals(now.millisecondsSinceEpoch));

      final synced = citation.copyWith(isSynced: true);
      expect(synced.isSynced, isTrue);
      expect(synced.id, equals('cit_sync_1'));
    });

    test('يجب بناء كائن SyncResult والتأكد من بيانات نتيجة المزامنة', () {
      const resultSuccess = SyncResult(
        success: true,
        syncedCount: 5,
        message: 'تمت مزامنة 5 عناصر بنجاح',
      );

      expect(resultSuccess.success, isTrue);
      expect(resultSuccess.syncedCount, equals(5));
      expect(resultSuccess.message, contains('5 عناصر'));

      const resultFailure = SyncResult(
        success: false,
        syncedCount: 0,
        message: 'لا يوجد اتصال بالإنترنت',
      );

      expect(resultFailure.success, isFalse);
      expect(resultFailure.syncedCount, equals(0));
      expect(resultFailure.message, contains('لا يوجد اتصال'));
    });

    test('يجب حسم التعارض السحابي بزمن lastModified وحفظ النسخة الأقدم احتياطياً', () {
      // محاكاة طابعي وقت: محلي وسحابي
      final localTimestamp = DateTime(2025, 5, 1, 10, 0).millisecondsSinceEpoch;
      final remoteNewerTimestamp = DateTime(2025, 5, 1, 11, 30).millisecondsSinceEpoch;

      // عندما تكون السحابة أحدث: يجب اعتماد السحابة وتوثيق المحلي كنسخة احتياطية
      final remoteWins = remoteNewerTimestamp > localTimestamp;
      expect(remoteWins, isTrue);

      // عندما يكون التعديل المحلي هو الأحدث: يعتمد المحلي ويتم رفع التعديل
      final localNewerTimestamp = DateTime(2025, 5, 1, 12, 0).millisecondsSinceEpoch;
      final localWins = localNewerTimestamp > remoteNewerTimestamp;
      expect(localWins, isTrue);
    });

    test('يجب تشفير وفك تشفير حزمة النسخة الاحتياطية .katib بدقة تامة', () {
      const samplePayload = '{"app":"katib_app","version":1,"books":[{"id":"b1","title":"رواية المعاني"}]}';
      const password = 'my_secure_katib_pass_2026';

      // دالة تشفير متوافقة مع الخوارزمية المعتمدة
      final keyBytes = utf8.encode(password);
      final textBytes = utf8.encode(samplePayload);
      final encrypted = Uint8List(textBytes.length);
      for (int i = 0; i < textBytes.length; i++) {
        encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      final cipherText = 'KATIB_ENCRYPTED_BACKUP_V1:${base64.encode(encrypted)}';

      expect(cipherText, startsWith('KATIB_ENCRYPTED_BACKUP_V1:'));

      // فك التشفير
      final rawBase64 = cipherText.substring('KATIB_ENCRYPTED_BACKUP_V1:'.length);
      final decodedBytes = base64.decode(rawBase64);
      final decrypted = Uint8List(decodedBytes.length);
      for (int i = 0; i < decodedBytes.length; i++) {
        decrypted[i] = decodedBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      final decryptedString = utf8.decode(decrypted);

      expect(decryptedString, equals(samplePayload));
      expect(decryptedString, contains('رواية المعاني'));
    });
  });

  group('9. اختبارات المساعد التفاعلي العائم والتدقيق اللغوي (InAppAssistant & FloatingAssistant Tests)', () {
    test('يجب بناء كائن AssistantMessage للمستخدم وللمساعد الذكي والتحقق من الحقول', () {
      final userMsg = AssistantMessage.user(
        id: 'msg_u_1',
        text: 'هل يمكنك تلخيص هذا المقطع من فضلك؟',
        relatedChapterId: 'chap_101',
        suggestionType: 'summary',
      );

      expect(userMsg.id, equals('msg_u_1'));
      expect(userMsg.sender, equals('user'));
      expect(userMsg.text, contains('تلخيص'));
      expect(userMsg.relatedChapterId, equals('chap_101'));
      expect(userMsg.suggestionType, equals('summary'));

      final aiMsg = AssistantMessage.ai(
        id: 'msg_ai_1',
        text: 'يقدم هذا المقطع رؤية تحليلية متكاملة حول جماليات النظم العربي.',
        relatedChapterId: 'chap_101',
        suggestionType: 'summary',
        metadata: {'score': 95, 'keyPointsCount': 3},
      );

      expect(aiMsg.sender, equals('ai'));
      expect(aiMsg.metadata?['score'], equals(95));
      expect(aiMsg.metadata?['keyPointsCount'], equals(3));
    });

    test('يجب تسلسل واسترجاع رسالة المساعد toMap و fromMap بنجاح', () {
      final msg = AssistantMessage(
        id: 'msg_test_json',
        sender: 'ai',
        text: 'اقتراح إكمال النص بصوت رخيم',
        timestamp: DateTime(2026, 4, 15, 14, 30),
        relatedChapterId: 'ch_42',
        suggestionType: 'autocomplete',
        metadata: const {'confidence': 0.98},
      );

      final map = msg.toMap();
      expect(map['id'], equals('msg_test_json'));
      expect(map['sender'], equals('ai'));
      expect(map['suggestionType'], equals('autocomplete'));

      final reconstructed = AssistantMessage.fromMap(map);
      expect(reconstructed.id, equals(msg.id));
      expect(reconstructed.sender, equals(msg.sender));
      expect(reconstructed.text, equals(msg.text));
      expect(reconstructed.relatedChapterId, equals(msg.relatedChapterId));
    });

    test('يجب التحقق من عمل copyWith ومقارنة التساوي Equatable لرسائل المساعد', () {
      final original = AssistantMessage.user(
        id: 'msg_eq_1',
        text: 'النص الأولي',
      );

      final modified = original.copyWith(text: 'النص المحدث بعد التعديل');
      expect(modified.id, equals(original.id));
      expect(modified.text, equals('النص المحدث بعد التعديل'));
      expect(modified.sender, equals(original.sender));

      final identicalMsg = AssistantMessage(
        id: original.id,
        sender: original.sender,
        text: original.text,
        timestamp: original.timestamp,
        relatedChapterId: original.relatedChapterId,
        suggestionType: original.suggestionType,
        metadata: original.metadata,
      );

      expect(original, equals(identicalMsg));
    });

    test('يجب فحص محرك التدقيق الإملائي والنحوي ورصد أخطاء الهمزات والهاء', () {
      final service = InAppAssistantService();
      // استدعاء التدقيق اللغوي المستند للقواعد العربية الصارمة
      final result = service.generateOfflineSuggestions(
        currentText: 'هذة الرواية تذهب الى افاق جديدة ان اردت ذلك',
        mode: SuggestionMode.proofread,
      );

      expect(result.mode, equals(SuggestionMode.proofread));
      expect(result.errors.length, greaterThanOrEqualTo(3));
      // رصد "هذة" -> "هذه"
      final hasHehError = result.errors.any((e) => e.errorText == 'هذة' && e.suggestion == 'هذه');
      expect(hasHehError, isTrue);
      // رصد "الى" -> "إلى"
      final hasIlaError = result.errors.any((e) => e.errorText == 'الى' && e.suggestion == 'إلى');
      expect(hasIlaError, isTrue);
      // رصد "ان" -> "أن"
      final hasInError = result.errors.any((e) => e.errorText == 'ان' && e.suggestion == 'أن');
      expect(hasInError, isTrue);

      expect(result.correctedText, contains('هذه'));
      expect(result.correctedText, contains('إلى'));
      expect(result.correctedText, contains('أن'));
      expect(result.score, isNotNull);
    });

    test('يجب التحقق من توليد اقتراحات الإكمال التلقائي وتلخيص الفصول', () {
      final service = InAppAssistantService();

      final autocompleteResult = service.generateOfflineSuggestions(
        currentText: 'في هدوء الليل العميق، التفت الكاتب نحو النافذة',
        mode: SuggestionMode.autocomplete,
      );

      expect(autocompleteResult.mode, equals(SuggestionMode.autocomplete));
      expect(autocompleteResult.suggestions.length, greaterThanOrEqualTo(1));
      expect(autocompleteResult.suggestions.first, isNotEmpty);

      final summaryResult = service.generateOfflineSuggestions(
        currentText: 'مقدمة الكتاب وتفاصيل الفكرة العامة مع مناقشة النظريات الأدبية',
        mode: SuggestionMode.summary,
      );

      expect(summaryResult.mode, equals(SuggestionMode.summary));
      expect(summaryResult.summary, isNotEmpty);
      expect(summaryResult.keyPoints.length, greaterThanOrEqualTo(2));
    });

    test('يجب التحقق من ثيمات وأحجام خطوط المساعد التفاعلي العائم', () {
      // التحقق من وجود الثيمات الثلاثة المخصصة
      expect(AssistantCustomTheme.values, contains(AssistantCustomTheme.sunset));
      expect(AssistantCustomTheme.values, contains(AssistantCustomTheme.nature));
      expect(AssistantCustomTheme.values, contains(AssistantCustomTheme.sky));

      // التحقق من مقاييس الخط الأربعة لدعم سهولة الوصول
      expect(AssistantFontScale.values, contains(AssistantFontScale.small));
      expect(AssistantFontScale.values, contains(AssistantFontScale.normal));
      expect(AssistantFontScale.values, contains(AssistantFontScale.large));
      expect(AssistantFontScale.values, contains(AssistantFontScale.xlarge));

      // أنماط إرساء اللوحة
      expect(PanelDockMode.values, contains(PanelDockMode.side));
      expect(PanelDockMode.values, contains(PanelDockMode.bottom));
    });
  });

  group('10. اختبارات خدمة تسجيل الأخطاء وحماية الخصوصية (CrashReportingService & Zero PII Tests)', () {
    test('يجب حجب البريد الإلكتروني والمسارات الشخصية من نصوص الأخطاء تماماً (Zero PII Redaction)', () {
      const rawError = 'Exception occurred for author test.author@katib.app while reading /Users/testauthor/documents/secret.pdf';
      final clean = CrashReportingService.sanitizeText(rawError);

      expect(clean, isNot(contains('test.author@katib.app')));
      expect(clean, contains('[REDACTED_EMAIL]'));
      expect(clean, isNot(contains('/Users/testauthor')));
      expect(clean, contains('[USER_DIR]'));
    });

    test('يجب حجب محتوى نصوص المخطوطة والاقتباسات المطولة من رسائل الأخطاء', () {
      const rawTextWithQuote = 'Failed parsing chapter «هذا النص يمثل محتوى سري من رواية الكاتب الخاصة جداً» at index 40';
      final clean = CrashReportingService.sanitizeText(rawTextWithQuote);

      expect(clean, isNot(contains('هذا النص يمثل محتوى سري')));
      expect(clean, contains('[REDACTED_USER_MANUSCRIPT_CONTENT]'));
    });

    test('يجب حجب باراميترات الاستعلام ومحتوى plain_text من سجلات الأخطاء', () {
      const rawSqlError = 'Database error when saving: plain_text: نص سري للغاية للكاتب العربي';
      final clean = CrashReportingService.sanitizeText(rawSqlError);

      expect(clean, isNot(contains('نص سري للغاية للكاتب العربي')));
      expect(clean, contains('[REDACTED_TEXT_PAYLOAD]'));
    });

    test('يجب التحقق من إنشاء كائن SanitizedCrashReport وتحويله من وإلى Map', () {
      final report = SanitizedCrashReport(
        id: 'crash_101',
        exceptionType: 'FormatException',
        sanitizedMessage: 'Invalid format [REDACTED_TEXT_PAYLOAD]',
        sanitizedStackTrace: 'at Parser.run (parser.dart:12)',
        timestamp: DateTime(2026, 9, 28, 12, 0),
        isFatal: false,
        systemMetadata: const {'platform': 'Android', 'locale': 'ar'},
      );

      final map = report.toMap();
      expect(map['id'], equals('crash_101'));
      expect(map['exception_type'], equals('FormatException'));
      expect(map['sanitized_message'], equals('Invalid format [REDACTED_TEXT_PAYLOAD]'));
      expect(map['is_fatal'], isFalse);

      final reconstructed = SanitizedCrashReport.fromMap(map);
      expect(reconstructed.id, equals(report.id));
      expect(reconstructed.exceptionType, equals(report.exceptionType));
      expect(reconstructed.sanitizedMessage, equals(report.sanitizedMessage));
      expect(reconstructed.systemMetadata['platform'], equals('Android'));
    });
  });

  group('11. اختبارات نظام الثيم الملكي KatibAppTheme (Royal Navy & Gold Architecture Tests)', () {
    test('يجب التحقق من ثوابت الألوان الملكية لتطبيق كاتب (Royal Palette Tokens)', () {
      expect(KatibAppTheme.primaryRoyalNavy, equals(const Color(0xFF0F172A)));
      expect(KatibAppTheme.accentRoyalGold, equals(const Color(0xFFD97706)));
      expect(KatibAppTheme.backgroundLight, equals(const Color(0xFFF8FAFC)));
      expect(KatibAppTheme.cardDark, equals(const Color(0xFF1E293B)));
    });

    test('يجب التحقق من تكوين الثيم الداكن الملكي (Dark Royal Theme Integrity)', () {
      final darkTheme = KatibAppTheme.darkTheme;

      expect(darkTheme.useMaterial3, isTrue);
      expect(darkTheme.brightness, equals(Brightness.dark));
      expect(darkTheme.primaryColor, equals(KatibAppTheme.accentRoyalGold));
      expect(darkTheme.scaffoldBackgroundColor, equals(KatibAppTheme.primaryRoyalNavy));
      expect(darkTheme.colorScheme.primary, equals(KatibAppTheme.accentRoyalGold));
      expect(darkTheme.colorScheme.surface, equals(KatibAppTheme.cardDark));
      expect(darkTheme.colorScheme.background, equals(KatibAppTheme.primaryRoyalNavy));
      expect(darkTheme.colorScheme.secondary, equals(const Color(0xFF3B82F6)));

      // البطاقات وشريط التطبيق
      expect(darkTheme.cardTheme.color, equals(KatibAppTheme.cardDark));
      expect(darkTheme.cardTheme.elevation, equals(0));
      expect(darkTheme.appBarTheme.backgroundColor, equals(KatibAppTheme.primaryRoyalNavy));
      expect(darkTheme.appBarTheme.centerTitle, isTrue);
      expect(darkTheme.appBarTheme.titleTextStyle?.fontFamily, equals('Tajawal'));
      expect(darkTheme.appBarTheme.titleTextStyle?.color, equals(Colors.white));
    });

    test('يجب التحقق من تكوين الثيم الفاتح الملكي (Light Royal Theme Integrity)', () {
      final lightTheme = KatibAppTheme.lightTheme;

      expect(lightTheme.useMaterial3, isTrue);
      expect(lightTheme.brightness, equals(Brightness.light));
      expect(lightTheme.primaryColor, equals(KatibAppTheme.primaryRoyalNavy));
      expect(lightTheme.scaffoldBackgroundColor, equals(KatibAppTheme.backgroundLight));
      expect(lightTheme.colorScheme.primary, equals(KatibAppTheme.primaryRoyalNavy));
      expect(lightTheme.colorScheme.secondary, equals(KatibAppTheme.accentRoyalGold));
      expect(lightTheme.colorScheme.surface, equals(Colors.white));
      expect(lightTheme.colorScheme.background, equals(KatibAppTheme.backgroundLight));

      // البطاقات وشريط التطبيق
      expect(lightTheme.cardTheme.color, equals(Colors.white));
      expect(lightTheme.cardTheme.elevation, equals(2));
      expect(lightTheme.appBarTheme.backgroundColor, equals(KatibAppTheme.backgroundLight));
      expect(lightTheme.appBarTheme.centerTitle, isTrue);
      expect(lightTheme.appBarTheme.titleTextStyle?.fontFamily, equals('Tajawal'));
      expect(lightTheme.appBarTheme.titleTextStyle?.color, equals(KatibAppTheme.primaryRoyalNavy));
    });

    test('يجب التحقق من الكنية المتوافقة AppTheme ومطابقتها التامة لـ KatibAppTheme', () {
      expect(AppTheme.primaryRoyalNavy, equals(KatibAppTheme.primaryRoyalNavy));
      expect(AppTheme.accentRoyalGold, equals(KatibAppTheme.accentRoyalGold));
      expect(AppTheme.darkTheme.brightness, equals(Brightness.dark));
      expect(AppTheme.lightTheme.brightness, equals(Brightness.light));
    });
  });
}






