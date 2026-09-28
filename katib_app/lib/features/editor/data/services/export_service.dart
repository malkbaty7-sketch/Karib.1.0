import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:archive/archive.dart';
import 'package:docx_template/docx_template.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:io';

import '../../../library/domain/entities/book_entity.dart';
import '../../domain/entities/chapter_model.dart';
import '../../domain/entities/citation_model.dart';

/// أنماط مقاس الصفحة المدعومة
enum PageSizeOption {
  a4,
  a5,
  b5,
  letter,
}

/// اتجاه وهوامش الصفحة
enum MarginOption {
  defaultMargins, // افتراضي 20mm
  narrow,         // ضيق 10mm
  wide,           // واسع 32mm
}

/// أنماط ترقيم الصفحات
enum NumberingStyle {
  arabicNumerals, // أرقام عربية (١، ٢، ٣)
  abjad,          // حروف أبجدية (أ، ب، ج، د)
  circled,        // رقم داخل دائرة (①، ②، ③)
  pageOfTotal,    // صيغة 'الصفحة X من Y'
}

/// خيارات وتنسيقات تصدير الكتاب
class ExportConfig {
  final String fontFamily; // 'Cairo' أو 'Tajawal'
  final bool includeCoverPage;
  final bool includeTableOfContents;
  final bool includeFootnotes;
  final bool pageNumbering;
  final PageSizeOption pageSize;
  final MarginOption margins;
  final NumberingStyle numberingStyle;
  final double fontSize;

  const ExportConfig({
    this.fontFamily = 'Cairo',
    this.includeCoverPage = true,
    this.includeTableOfContents = true,
    this.includeFootnotes = true,
    this.pageNumbering = true,
    this.pageSize = PageSizeOption.a4,
    this.margins = MarginOption.defaultMargins,
    this.numberingStyle = NumberingStyle.pageOfTotal,
    this.fontSize = 12.0,
  });

  /// حساب مقاس الصفحة مع الهوامش المحددة
  PdfPageFormat get resolvedPageFormat {
    PdfPageFormat baseFormat;
    switch (pageSize) {
      case PageSizeOption.a4:
        baseFormat = PdfPageFormat.a4;
        break;
      case PageSizeOption.a5:
        baseFormat = PdfPageFormat.a5;
        break;
      case PageSizeOption.b5:
        baseFormat = const PdfPageFormat(176 * PdfPageFormat.mm, 250 * PdfPageFormat.mm);
        break;
      case PageSizeOption.letter:
        baseFormat = PdfPageFormat.letter;
        break;
    }

    double marginMm;
    switch (margins) {
      case MarginOption.narrow:
        marginMm = 10.0;
        break;
      case MarginOption.wide:
        marginMm = 30.0;
        break;
      case MarginOption.defaultMargins:
      default:
        marginMm = 20.0;
        break;
    }

    final marginPoints = marginMm * PdfPageFormat.mm;
    return baseFormat.copyWith(
      marginTop: marginPoints,
      marginBottom: marginPoints,
      marginLeft: marginPoints,
      marginRight: marginPoints,
    );
  }

  /// تحويل رقم الصفحة إلى النمط المختار
  String formatPageNumber(int current, int total) {
    switch (numberingStyle) {
      case NumberingStyle.arabicNumerals:
        const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return current.toString().split('').map((char) {
          final n = int.tryParse(char);
          return n != null ? arabicDigits[n] : char;
        }).join();

      case NumberingStyle.abjad:
        const abjadLetters = [
          'أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي',
          'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر',
          'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'
        ];
        if (current <= abjadLetters.length && current > 0) {
          return abjadLetters[current - 1];
        }
        return '$current';

      case NumberingStyle.circled:
        const circledDigits = [
          '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
          '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'
        ];
        if (current <= circledDigits.length && current > 0) {
          return circledDigits[current - 1];
        }
        return '($current)';

      case NumberingStyle.pageOfTotal:
      default:
        return 'الصفحة $current من $total';
    }
  }
}

/// صيغ التصدير المدعومة
enum ExportFormat {
  pdf,
  docx,
  epub,
}

/// خدمة محرك التصدير الشاملة لكتب كاتب (ExportService)
/// تدعم توليد PDF عربي أصيل مع خطوط Cairo/Tajawal وحواشي سفلية،
/// توليد مستندات Word (DOCX) بتنسيق RTL،
/// وحزم EPUB3 للنشر الرقمي مع دعم الحفظ والمشاركة عبر share_plus.
class ExportService {
  static final ExportService instance = ExportService._internal();
  ExportService._internal();

  // ===========================================================================
  // 1. توليد مستند PDF العربي الكامل (PDF Generator)
  // ===========================================================================

  /// توليد ملف PDF كامل للكتاب مع الغلاف، الفهرس، نصوص الفصول، والحواشي السفلية
  Future<Uint8List> generatePdfBook({
    required BookEntity book,
    required List<Chapter> chapters,
    List<Citation> citations = const [],
    ExportConfig config = const ExportConfig(),
  }) async {
    final pdf = pw.Document(
      title: book.title,
      author: book.author,
      subject: book.category,
      keywords: 'كتاب, كاتب, ${book.category}, تأليف',
    );

    // تحميل الخطوط العربية المضمنة (Cairo أو Tajawal)
    pw.Font arabicRegular;
    pw.Font arabicBold;

    try {
      final fontPrefix = config.fontFamily == 'Tajawal' ? 'Tajawal' : 'Cairo';
      final regularData = await rootBundle.load('assets/fonts/$fontPrefix-Regular.ttf');
      final boldData = await rootBundle.load('assets/fonts/$fontPrefix-Bold.ttf');
      arabicRegular = pw.Font.ttf(regularData);
      arabicBold = pw.Font.ttf(boldData);
    } catch (_) {
      try {
        // بديل احتياطي سحابي سريع إذا لم تكن الأصول في المسار المحدد
        arabicRegular = await PdfGoogleFonts.cairoRegular();
        arabicBold = await PdfGoogleFonts.cairoBold();
      } catch (_) {
        arabicRegular = pw.Font.helvetica();
        arabicBold = pw.Font.helveticaBold();
      }
    }

    final arabicTheme = pw.ThemeData.withFont(
      base: arabicRegular,
      bold: arabicBold,
    );

    // 1.1 صفحة الغلاف الفاخرة (Cover Page)
    if (config.includeCoverPage) {
      pdf.addPage(
        pw.Page(
          pageFormat: config.resolvedPageFormat,
          theme: arabicTheme,
          textDirection: pw.TextDirection.rtl,
          build: (pw.Context context) {
            return pw.Container(
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.amber800, width: 3),
                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(12)),
              ),
              padding: const pw.EdgeInsets.all(36),
              child: pw.Column(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.center,
                children: [
                  // شارة الغلاف والتصنيف
                  pw.Column(
                    children: [
                      pw.Container(
                        padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        decoration: pw.BoxDecoration(
                          color: PdfColors.amber100,
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(20)),
                        ),
                        child: pw.Text(
                          book.category.isNotEmpty ? book.category : 'مصنف أدبي وبحثي',
                          style: pw.TextStyle(
                            font: arabicBold,
                            fontSize: 12,
                            color: PdfColors.amber900,
                          ),
                        ),
                      ),
                      pw.SizedBox(height: 12),
                      pw.Text(
                        'منصة كـاتـب للـتـألـيـف',
                        style: pw.TextStyle(
                          font: arabicRegular,
                          fontSize: 10,
                          color: PdfColors.grey700,
                        ),
                      ),
                    ],
                  ),

                  // عنوان الكتاب والمؤلف
                  pw.Column(
                    children: [
                      pw.Container(
                        width: 80,
                        height: 2,
                        color: PdfColors.amber800,
                      ),
                      pw.SizedBox(height: 20),
                      pw.Text(
                        book.title,
                        textAlign: pw.TextAlign.center,
                        style: pw.TextStyle(
                          font: arabicBold,
                          fontSize: 28,
                          color: PdfColors.brown900,
                        ),
                      ),
                      pw.SizedBox(height: 14),
                      pw.Text(
                        'تأليف: ${book.author}',
                        style: pw.TextStyle(
                          font: arabicBold,
                          fontSize: 16,
                          color: PdfColors.grey800,
                        ),
                      ),
                      pw.SizedBox(height: 20),
                      pw.Container(
                        width: 80,
                        height: 2,
                        color: PdfColors.amber800,
                      ),
                    ],
                  ),

                  // بيانات التوثيق والإحصاء
                  pw.Column(
                    children: [
                      pw.Text(
                        'إجمالي الفصول: ${chapters.length} فصول  •  عدد الكلمات: ${book.wordCount}',
                        style: pw.TextStyle(
                          font: arabicRegular,
                          fontSize: 11,
                          color: PdfColors.grey600,
                        ),
                      ),
                      pw.SizedBox(height: 6),
                      pw.Text(
                        'تاريخ التصدير: ${DateTime.now().year}/${DateTime.now().month}/${DateTime.now().day}',
                        style: pw.TextStyle(
                          font: arabicRegular,
                          fontSize: 10,
                          color: PdfColors.grey500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      );
    }

    // 1.2 صفحة الفهرس الآلي (Table of Contents)
    if (config.includeTableOfContents && chapters.isNotEmpty) {
      pdf.addPage(
        pw.Page(
          pageFormat: config.resolvedPageFormat,
          theme: arabicTheme,
          textDirection: pw.TextDirection.rtl,
          build: (pw.Context context) {
            return pw.Padding(
              padding: const pw.EdgeInsets.all(32),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Center(
                    child: pw.Text(
                      'فـهـرس الـمـحـتـويـات',
                      style: pw.TextStyle(
                        font: arabicBold,
                        fontSize: 20,
                        color: PdfColors.brown900,
                      ),
                    ),
                  ),
                  pw.SizedBox(height: 8),
                  pw.Center(
                    child: pw.Container(
                      width: 60,
                      height: 1.5,
                      color: PdfColors.amber800,
                    ),
                  ),
                  pw.SizedBox(height: 28),
                  pw.Expanded(
                    child: pw.ListView.builder(
                      itemCount: chapters.length,
                      itemBuilder: (ctx, index) {
                        final ch = chapters[index];
                        return pw.Container(
                          margin: const pw.EdgeInsets.symmetric(vertical: 8),
                          child: pw.Row(
                            children: [
                              pw.Text(
                                'الفصل ${index + 1}: ${ch.title}',
                                style: pw.TextStyle(
                                  font: arabicBold,
                                  fontSize: 13,
                                  color: PdfColors.grey900,
                                ),
                              ),
                              pw.Expanded(
                                child: pw.Container(
                                  margin: const pw.EdgeInsets.symmetric(horizontal: 8),
                                  child: pw.Text(
                                    '................................................................................................................',
                                    maxLines: 1,
                                    style: const pw.TextStyle(color: PdfColors.grey400, fontSize: 10),
                                  ),
                                ),
                              ),
                              pw.Text(
                                '${ch.wordCount} كلمة',
                                style: pw.TextStyle(
                                  font: arabicRegular,
                                  fontSize: 11,
                                  color: PdfColors.grey600,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      );
    }

    // 1.3 صفحات الفصول المتعددة مع الحواشي السفلية وترقيم الصفحات
    for (int i = 0; i < chapters.length; i++) {
      final chapter = chapters[i];
      final chapterCitations = citations.where((c) => c.chapterId == chapter.id).toList();

      pdf.addPage(
        pw.MultiPage(
          pageFormat: config.resolvedPageFormat,
          theme: arabicTheme,
          textDirection: pw.TextDirection.rtl,
          header: (pw.Context context) {
            return pw.Container(
              margin: const pw.EdgeInsets.only(bottom: 16),
              padding: const pw.EdgeInsets.only(bottom: 6),
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey300, width: 0.5)),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    book.title,
                    style: pw.TextStyle(font: arabicRegular, fontSize: 9, color: PdfColors.grey600),
                  ),
                  pw.Text(
                    'الفصل ${i + 1}: ${chapter.title}',
                    style: pw.TextStyle(font: arabicBold, fontSize: 9, color: PdfColors.grey700),
                  ),
                ],
              ),
            );
          },
          footer: (pw.Context context) {
            if (!config.pageNumbering) return pw.SizedBox();
            return pw.Container(
              margin: const pw.EdgeInsets.only(top: 14),
              padding: const pw.EdgeInsets.only(top: 6),
              decoration: const pw.BoxDecoration(
                border: pw.Border(top: pw.BorderSide(color: PdfColors.grey300, width: 0.5)),
              ),
              child: pw.Center(
                child: pw.Text(
                  config.formatPageNumber(context.pageNumber, context.pagesCount),
                  style: pw.TextStyle(font: arabicRegular, fontSize: 9, color: PdfColors.grey600),
                ),
              ),
            );
          },
          build: (pw.Context context) {
            final paragraphs = chapter.plainText
                .split('\n')
                .map((p) => p.trim())
                .where((p) => p.isNotEmpty)
                .toList();

            return [
              // ترويسة الفصل
              pw.Container(
                margin: const pw.EdgeInsets.only(bottom: 20),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'الفصل ${i + 1}',
                      style: pw.TextStyle(
                        font: arabicBold,
                        fontSize: 12,
                        color: PdfColors.amber800,
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      chapter.title,
                      style: pw.TextStyle(
                        font: arabicBold,
                        fontSize: 20,
                        color: PdfColors.brown900,
                      ),
                    ),
                    pw.SizedBox(height: 6),
                    pw.Container(width: 40, height: 2, color: PdfColors.amber800),
                  ],
                ),
              ),

              // فقرات متن الفصل
              ...paragraphs.map((p) {
                return pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 12),
                  child: pw.Text(
                    p,
                    textAlign: pw.TextAlign.justify,
                    style: pw.TextStyle(
                      font: arabicRegular,
                      fontSize: config.fontSize,
                      lineSpacing: 4.5,
                      color: PdfColors.grey900,
                    ),
                  ),
                );
              }),

              // قسم الحواشي السفلية والمراجع الموثقة بالهوامش
              if (config.includeFootnotes && chapterCitations.isNotEmpty) ...[
                pw.SizedBox(height: 24),
                pw.Container(
                  width: 120,
                  height: 0.8,
                  color: PdfColors.grey500,
                ),
                pw.SizedBox(height: 8),
                pw.Text(
                  'الهوامش والمراجع المستخرجة:',
                  style: pw.TextStyle(
                    font: arabicBold,
                    fontSize: 10,
                    color: PdfColors.grey700,
                  ),
                ),
                pw.SizedBox(height: 6),
                ...chapterCitations.asMap().entries.map((entry) {
                  final idx = entry.key + 1;
                  final cit = entry.value;
                  return pw.Padding(
                    padding: const pw.EdgeInsets.only(bottom: 4),
                    child: pw.Text(
                      '($idx) «${cit.excerpt}» — ${cit.author}، المصدر: [${cit.sourceFileName}]، ص ${cit.pageNumber}.',
                      style: pw.TextStyle(
                        font: arabicRegular,
                        fontSize: 9,
                        color: PdfColors.grey700,
                      ),
                    ),
                  );
                }),
              ],
            ];
          },
        ),
      );
    }

    return pdf.save();
  }

  // ===========================================================================
  // 2. توليد مستند Word (.docx) متوافق مع RTL والعربية (DOCX OpenXML)
  // ===========================================================================

  /// توليد مستند مايكروسوفت وورد (.docx) متكامل يدعم اتجاه الكتابة من اليمين لليسار (RTL)
  /// مع العناوين، الفصول، والحواشي السفلية، أو عبر قالب باستخدام docx_template
  Future<Uint8List> generateDocxBook({
    required BookEntity book,
    required List<Chapter> chapters,
    List<Citation> citations = const [],
    ExportConfig config = const ExportConfig(),
    Uint8List? templateBytes,
  }) async {
    if (templateBytes != null) {
      return generateDocxFromTemplate(
        templateBytes: templateBytes,
        book: book,
        chapters: chapters,
        citations: citations,
      );
    }

    final archive = Archive();

    // 1. [Content_Types].xml
    const contentTypesXml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>''';
    archive.addFile(ArchiveFile('[Content_Types].xml', contentTypesXml.length, utf8.encode(contentTypesXml)));

    // 2. _rels/.rels
    const relsXml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>''';
    archive.addFile(ArchiveFile('_rels/.rels', relsXml.length, utf8.encode(relsXml)));

    // 3. word/_rels/document.xml.rels
    const docRelsXml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>''';
    archive.addFile(ArchiveFile('word/_rels/document.xml.rels', docRelsXml.length, utf8.encode(docRelsXml)));

    // 4. word/settings.xml (دعم RTL الكامل)
    const settingsXml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:evenAndOddHeaders/>
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>''';
    archive.addFile(ArchiveFile('word/settings.xml', settingsXml.length, utf8.encode(settingsXml)));

    // 5. word/styles.xml (تضمين خط Cairo / Tajawal وخصائص RTL)
    final fontName = config.fontFamily;
    final stylesXml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="$fontName" w:hAnsi="$fontName" w:cs="$fontName"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:bidi/>
        <w:jc w:val="both"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:bidi/>
      <w:spacing w:before="360" w:after="160"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="$fontName" w:hAnsi="$fontName" w:cs="$fontName"/>
      <w:b/>
      <w:bCs/>
      <w:color w:val="92400E"/>
      <w:sz w:val="36"/>
      <w:szCs w:val="36"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="FootnoteText">
    <w:name w:val="footnote text"/>
    <w:pPr>
      <w:bidi/>
      <w:spacing w:before="60" w:after="60"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="$fontName" w:hAnsi="$fontName" w:cs="$fontName"/>
      <w:sz w:val="18"/>
      <w:szCs w:val="18"/>
      <w:color w:val="555555"/>
    </w:rPr>
  </w:style>
</w:styles>''';
    archive.addFile(ArchiveFile('word/styles.xml', stylesXml.length, utf8.encode(stylesXml)));

    // 6. word/document.xml - تجميع متن الكتاب بالكامل
    final buffer = StringBuffer();
    buffer.write('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n');
    buffer.write('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">\n');
    buffer.write('<w:body>\n');

    // صفحة الغلاف في Word
    if (config.includeCoverPage) {
      buffer.write('''
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="center"/>
    <w:spacing w:before="1200" w:after="240"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="56"/><w:szCs w:val="56"/><w:color w:val="92400E"/></w:rPr>
    <w:t>${_xmlEscape(book.title)}</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="center"/>
    <w:spacing w:before="120" w:after="480"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="444444"/></w:rPr>
    <w:t>تأليف: ${_xmlEscape(book.author)}</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="center"/>
    <w:spacing w:before="120" w:after="1200"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="888888"/></w:rPr>
    <w:t>التصنيف: ${_xmlEscape(book.category)} | تم الإعداد عبر منصة كاتب</w:t>
  </w:r>
</w:p>
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
''');
    }

    // الفصول ونصوصها
    for (int i = 0; i < chapters.length; i++) {
      final ch = chapters[i];
      final chapterCitations = citations.where((c) => c.chapterId == ch.id).toList();

      // عنوان الفصل
      buffer.write('''
<w:p>
  <w:pPr>
    <w:pStyle w:val="Heading1"/>
    <w:bidi/>
    <w:jc w:val="right"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:bCs/></w:rPr>
    <w:t>الفصل ${i + 1}: ${_xmlEscape(ch.title)}</w:t>
  </w:r>
</w:p>
''');

      // فقرات الفصل
      final paragraphs = ch.plainText.split('\n').where((p) => p.trim().isNotEmpty);
      for (final p in paragraphs) {
        buffer.write('''
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="both"/>
    <w:spacing w:before="80" w:after="120" w:line="360" w:lineRule="auto"/>
    <w:ind w:firstLine="400"/>
  </w:pPr>
  <w:r>
    <w:t>${_xmlEscape(p)}</w:t>
  </w:r>
</w:p>
''');
      }

      // الحواشي السفلية للفصل
      if (config.includeFootnotes && chapterCitations.isNotEmpty) {
        buffer.write('''
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:spacing w:before="360" w:after="120"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="92400E"/></w:rPr>
    <w:t>المراجع والحواشي المستخرجة للفصل:</w:t>
  </w:r>
</w:p>
''');
        for (int cIdx = 0; cIdx < chapterCitations.length; cIdx++) {
          final cit = chapterCitations[cIdx];
          final text = '(${cIdx + 1}) «${cit.excerpt}» — ${cit.author}، المصدر: [${cit.sourceFileName}]، ص ${cit.pageNumber}.';
          buffer.write('''
<w:p>
  <w:pPr>
    <w:pStyle w:val="FootnoteText"/>
    <w:bidi/>
    <w:jc w:val="right"/>
  </w:pPr>
  <w:r>
    <w:t>${_xmlEscape(text)}</w:t>
  </w:r>
</w:p>
''');
        }
      }

      // فاصل صفحات بين الفصول
      if (i < chapters.length - 1) {
        buffer.write('<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n');
      }
    }

    // إعدادات مقطع الصفحة وتطبيق RTL
    buffer.write('''
  <w:sectPr>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    <w:bidi/>
  </w:sectPr>
</w:body>
</w:document>
''');

    archive.addFile(ArchiveFile('word/document.xml', buffer.length, utf8.encode(buffer.toString())));

    // ضغط حزمة ZIP بصيغة .docx
    final zipEncoder = ZipEncoder();
    final docxBytes = zipEncoder.encode(archive);
    return Uint8List.fromList(docxBytes!);
  }

  /// توليد مستند Word (.docx) اعتماداً على قالب مخصص باستخدام حزمة docx_template
  Future<Uint8List> generateDocxFromTemplate({
    required Uint8List templateBytes,
    required BookEntity book,
    required List<Chapter> chapters,
    List<Citation> citations = const [],
  }) async {
    final docx = await DocxTemplate.fromBytes(templateBytes);
    final content = Content();

    // إضافة وسوم الكتاب الأساسية في القالب
    content.add(TextContent('title', book.title));
    content.add(TextContent('author', book.author));
    content.add(TextContent('category', book.category));
    content.add(TextContent('word_count', book.wordCount.toString()));
    content.add(TextContent('chapters_count', chapters.length.toString()));
    content.add(TextContent('date', '${DateTime.now().year}/${DateTime.now().month}/${DateTime.now().day}'));

    // قائمة الفصول
    final chaptersList = <Content>[];
    for (int i = 0; i < chapters.length; i++) {
      final ch = chapters[i];
      final chContent = Content();
      chContent.add(TextContent('index', '${i + 1}'));
      chContent.add(TextContent('title', ch.title));
      chContent.add(TextContent('text', ch.plainText));
      chContent.add(TextContent('words', '${ch.wordCount}'));
      chaptersList.add(chContent);
    }
    content.add(ListContent('chapters', chaptersList));

    // قائمة المراجع والهوامش
    final citationsList = <Content>[];
    for (int i = 0; i < citations.length; i++) {
      final cit = citations[i];
      final citContent = Content();
      citContent.add(TextContent('index', '${i + 1}'));
      citContent.add(TextContent('author', cit.author));
      citContent.add(TextContent('source', cit.sourceFileName));
      citContent.add(TextContent('page', '${cit.pageNumber}'));
      citContent.add(TextContent('excerpt', cit.excerpt));
      citationsList.add(citContent);
    }
    content.add(ListContent('citations', citationsList));

    final generatedBytes = await docx.generate(content);
    if (generatedBytes == null) {
      throw Exception('فشل توليد مستند Word من القالب باستخدام docx_template');
    }
    return Uint8List.fromList(generatedBytes);
  }

  // ===========================================================================
  // 3. توليد ملفات EPUB3 للنشر الرقمي المتوافق مع قراء الكتب الإلكترونية
  // ===========================================================================

  /// توليد كتاب رقمي بصيغة ePub 3.0 متوافق مع معايير IDPF وقارئات الكتب العالمية
  /// مع دعم RTL الكامل للغة العربية
  Future<Uint8List> generateEpubBook({
    required BookEntity book,
    required List<Chapter> chapters,
    List<Citation> citations = const [],
    ExportConfig config = const ExportConfig(),
  }) async {
    final archive = Archive();
    final bookUuid = 'urn:uuid:katib-${book.id}';

    // 1. mimetype (يجب أن يكون غير مضغوط وفي بداية الأرشيف وفق مواصفات EPUB)
    const mimetypeContent = 'application/epub+zip';
    final mimetypeBytes = utf8.encode(mimetypeContent);
    final mimetypeFile = ArchiveFile('mimetype', mimetypeBytes.length, mimetypeBytes);
    mimetypeFile.compress = false;
    archive.addFile(mimetypeFile);

    // 2. META-INF/container.xml
    const containerXml = '''<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>''';
    archive.addFile(ArchiveFile('META-INF/container.xml', containerXml.length, utf8.encode(containerXml)));

    // 3. OEBPS/styles.css
    const stylesCss = '''
@charset "UTF-8";
html, body {
  direction: rtl;
  unicode-bidi: embed;
  font-family: 'Cairo', 'Tajawal', 'Traditional Arabic', serif, sans-serif;
  margin: 1.5em;
  padding: 0;
  line-height: 1.8;
  color: #1c1917;
  background-color: #fafaf9;
}
h1, h2, h3 {
  font-weight: bold;
  color: #78350f;
  text-align: right;
}
.cover-wrapper {
  text-align: center;
  padding: 4em 1em;
  border: 3px double #d97706;
  border-radius: 12px;
}
.cover-title {
  font-size: 2.2em;
  margin-bottom: 0.4em;
}
.cover-author {
  font-size: 1.3em;
  color: #44403c;
  margin-bottom: 1em;
}
.cover-meta {
  font-size: 0.9em;
  color: #78716c;
}
p {
  text-align: justify;
  text-justify: inter-word;
  margin-bottom: 1em;
  text-indent: 1.5em;
}
.chapter-title {
  border-bottom: 2px solid #f59e0b;
  padding-bottom: 0.4em;
  margin-bottom: 1.2em;
}
.footnotes-box {
  margin-top: 3em;
  padding-top: 1em;
  border-top: 1px solid #d6d3d1;
  font-size: 0.85em;
  color: #57534e;
}
.footnote-item {
  margin-bottom: 0.6em;
}
''';
    archive.addFile(ArchiveFile('OEBPS/styles.css', stylesCss.length, utf8.encode(stylesCss)));

    // 4. OEBPS/cover.xhtml
    final coverHtml = '''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ar" dir="rtl">
<head>
  <title>${_xmlEscape(book.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="cover-wrapper">
    <h1 class="cover-title">${_xmlEscape(book.title)}</h1>
    <div class="cover-author">تأليف: ${_xmlEscape(book.author)}</div>
    <div class="cover-meta">التصنيف: ${_xmlEscape(book.category)} • فصول الكتاب: ${chapters.length}</div>
    <div class="cover-meta" style="margin-top: 2em;">تم النشر عبر منصة كاتب - Katib App</div>
  </div>
</body>
</html>''';
    archive.addFile(ArchiveFile('OEBPS/cover.xhtml', coverHtml.length, utf8.encode(coverHtml)));

    // 5. OEBPS/chapter_*.xhtml
    for (int i = 0; i < chapters.length; i++) {
      final ch = chapters[i];
      final chapterCitations = citations.where((c) => c.chapterId == ch.id).toList();

      final chapterHtml = StringBuffer();
      chapterHtml.write('''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ar" dir="rtl">
<head>
  <title>${_xmlEscape(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h2 class="chapter-title">الفصل ${i + 1}: ${_xmlEscape(ch.title)}</h2>
''');

      final paragraphs = ch.plainText.split('\n').where((p) => p.trim().isNotEmpty);
      for (final p in paragraphs) {
        chapterHtml.write('  <p>${_xmlEscape(p)}</p>\n');
      }

      if (config.includeFootnotes && chapterCitations.isNotEmpty) {
        chapterHtml.write('  <div class="footnotes-box">\n');
        chapterHtml.write('    <h3>الهوامش والمراجع المستخرجة:</h3>\n');
        for (int cIdx = 0; cIdx < chapterCitations.length; cIdx++) {
          final cit = chapterCitations[cIdx];
          chapterHtml.write('    <div class="footnote-item">(${cIdx + 1}) «${_xmlEscape(cit.excerpt)}» — ${_xmlEscape(cit.author)}، المصدر: [${_xmlEscape(cit.sourceFileName)}]، ص ${cit.pageNumber}.</div>\n');
        }
        chapterHtml.write('  </div>\n');
      }

      chapterHtml.write('</body>\n</html>');
      final chFileName = 'OEBPS/chapter_${i + 1}.xhtml';
      archive.addFile(ArchiveFile(chFileName, chapterHtml.length, utf8.encode(chapterHtml.toString())));
    }

    // 6. OEBPS/nav.xhtml (ePub3 Navigation Document)
    final navHtml = StringBuffer();
    navHtml.write('''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ar" dir="rtl">
<head>
  <title>فهرس الكتاب</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>فهرس المحتويات</h1>
    <ol>
      <li><a href="cover.xhtml">صفحة الغلاف</a></li>
''');
    for (int i = 0; i < chapters.length; i++) {
      navHtml.write('      <li><a href="chapter_${i + 1}.xhtml">الفصل ${i + 1}: ${_xmlEscape(chapters[i].title)}</a></li>\n');
    }
    navHtml.write('''    </ol>
  </nav>
</body>
</html>''');
    archive.addFile(ArchiveFile('OEBPS/nav.xhtml', navHtml.length, utf8.encode(navHtml.toString())));

    // 7. OEBPS/content.opf (Package Document with metadata, manifest, spine)
    final opf = StringBuffer();
    opf.write('''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" dir="rtl" xml:lang="ar">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">$bookUuid</dc:identifier>
    <dc:title>${_xmlEscape(book.title)}</dc:title>
    <dc:creator>${_xmlEscape(book.author)}</dc:creator>
    <dc:language>ar</dc:language>
    <dc:subject>${_xmlEscape(book.category)}</dc:subject>
    <dc:publisher>منصة كاتب - Katib Publishing</dc:publisher>
    <meta property="dcterms:modified">${DateTime.now().toUtc().toIso8601String().split('.').first}Z</meta>
  </metadata>
  <manifest>
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
''');
    for (int i = 0; i < chapters.length; i++) {
      opf.write('    <item id="chapter_${i + 1}" href="chapter_${i + 1}.xhtml" media-type="application/xhtml+xml"/>\n');
    }
    opf.write('''  </manifest>
  <spine page-progression-direction="rtl">
    <itemref idref="cover"/>
''');
    for (int i = 0; i < chapters.length; i++) {
      opf.write('    <itemref idref="chapter_${i + 1}"/>\n');
    }
    opf.write('''  </spine>
</package>''');
    archive.addFile(ArchiveFile('OEBPS/content.opf', opf.length, utf8.encode(opf.toString())));

    // ضغط حزمة EPUB3
    final zipEncoder = ZipEncoder();
    final epubBytes = zipEncoder.encode(archive);
    return Uint8List.fromList(epubBytes!);
  }

  // ===========================================================================
  // 4. عمليات الحفظ في ذاكرة الجهاز والمشاركة عبر share_plus
  // ===========================================================================

  /// حفظ الملف المُصدّر في مجلد مستندات الجهاز أو التنزيلات
  Future<String> saveExportedFile({
    required Uint8List bytes,
    required String fileName,
  }) async {
    final dir = await getApplicationDocumentsDirectory();
    final exportDir = Directory('${dir.path}/katib_exports');
    if (!await exportDir.exists()) {
      await exportDir.create(recursive: true);
    }

    final filePath = '${exportDir.path}/$fileName';
    final file = File(filePath);
    await file.writeAsBytes(bytes, flush: true);
    return filePath;
  }

  /// مشاركة الملف المُصدّر عبر تطبيقات النظام الأخرى (واتساب، تيليجرام، البريد، درايف)
  Future<void> shareExportedFile({
    required Uint8List bytes,
    required String fileName,
    required String mimeType,
    String? subject,
  }) async {
    final tempDir = await getTemporaryDirectory();
    final tempPath = '${tempDir.path}/$fileName';
    final file = File(tempPath);
    await file.writeAsBytes(bytes, flush: true);

    await Share.shareXFiles(
      [XFile(tempPath, mimeType: mimeType)],
      text: 'كتاب: ${subject ?? fileName} مُصدّر عبر منصة كاتب',
      subject: subject,
    );
  }

  // دالة مساعدة لتطهير نصوص XML
  String _xmlEscape(String input) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
  }
}
