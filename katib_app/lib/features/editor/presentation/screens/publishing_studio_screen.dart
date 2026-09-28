import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';
import '../../../library/domain/entities/book_entity.dart';
import '../../domain/entities/chapter_model.dart';
import '../../domain/entities/citation_model.dart';
import '../../data/services/export_service.dart';

/// شاشة استوديو التصدير والنشر المتقدم (PublishingStudioScreen)
/// توفر لوحة تحكم جانبية بالخيارات التالية:
/// 1. مقاس الصفحة: (A4, A5, B5, Letter)
/// 2. اتجاه الهوامش: (افتراضي، ضيق، واسع)
/// 3. نمط الترقيم: (أرقام عربية، حروف أبجدية، رقم داخل دائرة، صيغة 'الصفحة X من Y')
/// 4. تضمين الفهرس والمراجع: (مفاتيح تشغيل/إيقاف Switch Buttons)
/// بالإضافة لمعاينة حية (Live PDF Preview) عبر حزمة printing، وزر تصدير مع مؤشر تقدم
class PublishingStudioScreen extends StatefulWidget {
  final BookEntity book;
  final List<Chapter> chapters;
  final List<Citation> citations;

  const PublishingStudioScreen({
    super.key,
    required this.book,
    required this.chapters,
    this.citations = const [],
  });

  static Future<void> navigate(
    BuildContext context, {
    required BookEntity book,
    required List<Chapter> chapters,
    List<Citation> citations = const [],
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PublishingStudioScreen(
          book: book,
          chapters: chapters,
          citations: citations,
        ),
      ),
    );
  }

  @override
  State<PublishingStudioScreen> createState() => _PublishingStudioScreenState();
}

class _PublishingStudioScreenState extends State<PublishingStudioScreen> {
  // 1. خيارات لوحة التحكم الجانبية
  PageSizeOption _pageSize = PageSizeOption.a4;
  MarginOption _margins = MarginOption.defaultMargins;
  NumberingStyle _numberingStyle = NumberingStyle.pageOfTotal;
  bool _includeCoverPage = true;
  bool _includeTableOfContents = true;
  bool _includeFootnotes = true;
  String _fontFamily = 'Cairo';

  // مفتاح لإعادة بناء المعاينة الحية عند تعديل الخيارات
  Key _previewKey = UniqueKey();

  ExportConfig _currentConfig() {
    return ExportConfig(
      fontFamily: _fontFamily,
      includeCoverPage: _includeCoverPage,
      includeTableOfContents: _includeTableOfContents,
      includeFootnotes: _includeFootnotes,
      pageNumbering: true,
      pageSize: _pageSize,
      margins: _margins,
      numberingStyle: _numberingStyle,
    );
  }

  void _updatePreview() {
    setState(() {
      _previewKey = UniqueKey();
    });
  }

  // نافذة تصدير الكتاب مع مؤشر التقدم واختيار الصيغة
  void _openExportDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _ExportProgressDialog(
        book: widget.book,
        chapters: widget.chapters,
        citations: widget.citations,
        config: _currentConfig(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          elevation: 0.5,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'استوديو النشر والتصدير الحي',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16),
              ),
              Text(
                '${widget.book.title} • ${widget.chapters.length} فصول • ${widget.book.wordCount} كلمة',
                style: TextStyle(
                  fontFamily: 'Tajawal',
                  fontSize: 12,
                  color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                ),
              ),
            ],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8.0),
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.amber.shade700,
                  foregroundColor: Colors.white,
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                ),
                icon: const Icon(Icons.file_download_outlined, size: 18),
                label: const Text(
                  'تصدير الكتاب',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13),
                ),
                onPressed: _openExportDialog,
              ),
            ),
          ],
        ),
        body: Row(
          children: [
            // =================================================================
            // 1. لوحة التحكم الجانبية (Sidebar Control Panel)
            // =================================================================
            Container(
              width: 340,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                border: Border(
                  left: BorderSide(
                    color: isDark ? Colors.stone[800] ?? Colors.grey.shade800 : Colors.grey.shade200,
                    width: 1,
                  ),
                ),
              ),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // شارة التحكم
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade500.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber.shade500.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.tune, color: Colors.amber.shade800, size: 20),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'تُحدّث المعاينة فوراً عند تغيير أي خيار',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // 1.1 مقاس الصفحة (A4, A5, B5, Letter)
                  _buildSectionHeader('مقاس الصفحة:', Icons.aspect_ratio),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildChoiceChip(
                        label: 'A4 (210×297)',
                        selected: _pageSize == PageSizeOption.a4,
                        onSelected: () {
                          setState(() => _pageSize = PageSizeOption.a4);
                          _updatePreview();
                        },
                      ),
                      _buildChoiceChip(
                        label: 'A5 (148×210)',
                        selected: _pageSize == PageSizeOption.a5,
                        onSelected: () {
                          setState(() => _pageSize = PageSizeOption.a5);
                          _updatePreview();
                        },
                      ),
                      _buildChoiceChip(
                        label: 'B5 (176×250)',
                        selected: _pageSize == PageSizeOption.b5,
                        onSelected: () {
                          setState(() => _pageSize = PageSizeOption.b5);
                          _updatePreview();
                        },
                      ),
                      _buildChoiceChip(
                        label: 'Letter',
                        selected: _pageSize == PageSizeOption.letter,
                        onSelected: () {
                          setState(() => _pageSize = PageSizeOption.letter);
                          _updatePreview();
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // 1.2 اتجاه وهوامش الصفحة (افتراضي، ضيق، واسع)
                  _buildSectionHeader('اتجاه الهوامش:', Icons.space_bar_outlined),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildChoiceChip(
                          label: 'افتراضي (20mm)',
                          selected: _margins == MarginOption.defaultMargins,
                          onSelected: () {
                            setState(() => _margins = MarginOption.defaultMargins);
                            _updatePreview();
                          },
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: _buildChoiceChip(
                          label: 'ضيق (10mm)',
                          selected: _margins == MarginOption.narrow,
                          onSelected: () {
                            setState(() => _margins = MarginOption.narrow);
                            _updatePreview();
                          },
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: _buildChoiceChip(
                          label: 'واسع (30mm)',
                          selected: _margins == MarginOption.wide,
                          onSelected: () {
                            setState(() => _margins = MarginOption.wide);
                            _updatePreview();
                          },
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // 1.3 نمط الترقيم (أرقام عربية، حروف أبجدية، رقم داخل دائرة، صيغة 'الصفحة X من Y')
                  _buildSectionHeader('نمط الترقيم في أسفل الصفحات:', Icons.format_list_numbered_rtl),
                  const SizedBox(height: 8),
                  Column(
                    children: [
                      _buildRadioListTile(
                        title: 'صيغة "الصفحة X من Y"',
                        subtitle: 'الصفحة ١ من ٢٤',
                        value: NumberingStyle.pageOfTotal,
                        groupValue: _numberingStyle,
                        onChanged: (val) {
                          setState(() => _numberingStyle = val!);
                          _updatePreview();
                        },
                      ),
                      _buildRadioListTile(
                        title: 'أرقام عربية مشرقية',
                        subtitle: '١، ٢، ٣، ٤...',
                        value: NumberingStyle.arabicNumerals,
                        groupValue: _numberingStyle,
                        onChanged: (val) {
                          setState(() => _numberingStyle = val!);
                          _updatePreview();
                        },
                      ),
                      _buildRadioListTile(
                        title: 'حروف أبجدية عربية',
                        subtitle: 'أ، ب، ج، د...',
                        value: NumberingStyle.abjad,
                        groupValue: _numberingStyle,
                        onChanged: (val) {
                          setState(() => _numberingStyle = val!);
                          _updatePreview();
                        },
                      ),
                      _buildRadioListTile(
                        title: 'رقم داخل دائرة',
                        subtitle: '①، ②، ③...',
                        value: NumberingStyle.circled,
                        groupValue: _numberingStyle,
                        onChanged: (val) {
                          setState(() => _numberingStyle = val!);
                          _updatePreview();
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // 1.4 تضمين الفهرس والمراجع وصفحة الغلاف (Switch Buttons)
                  _buildSectionHeader('تضمين الأقسام التلقائية:', Icons.layers_outlined),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: isDark ? Colors.stone[900] ?? Colors.grey.shade900 : Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
                    ),
                    child: Column(
                      children: [
                        SwitchListTile(
                          dense: true,
                          title: const Text('فهرس المحتويات الآلي', style: TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                          subtitle: const Text('توليد جدول الفصول وأرقام الصفحات', style: TextStyle(fontFamily: 'Tajawal', fontSize: 11)),
                          value: _includeTableOfContents,
                          activeColor: Colors.amber.shade700,
                          onChanged: (val) {
                            setState(() => _includeTableOfContents = val);
                            _updatePreview();
                          },
                        ),
                        const Divider(height: 1),
                        SwitchListTile(
                          dense: true,
                          title: Text('توثيق الهوامش والمراجع (${widget.citations.length})', style: const TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                          subtitle: const Text('الحواشي السفلية المستخرجة للفصول', style: TextStyle(fontFamily: 'Tajawal', fontSize: 11)),
                          value: _includeFootnotes,
                          activeColor: Colors.amber.shade700,
                          onChanged: (val) {
                            setState(() => _includeFootnotes = val);
                            _updatePreview();
                          },
                        ),
                        const Divider(height: 1),
                        SwitchListTile(
                          dense: true,
                          title: const Text('صفحة الغلاف الفاخرة', style: TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                          subtitle: const Text('عنوان الكتاب وتأطير تراثي فاخر', style: TextStyle(fontFamily: 'Tajawal', fontSize: 11)),
                          value: _includeCoverPage,
                          activeColor: Colors.amber.shade700,
                          onChanged: (val) {
                            setState(() => _includeCoverPage = val);
                            _updatePreview();
                          },
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // 1.5 نوع الخط العربي
                  _buildSectionHeader('الخط المعتمد للطباعة:', Icons.font_download_outlined),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildChoiceChip(
                          label: 'خط كـايرو (Cairo)',
                          selected: _fontFamily == 'Cairo',
                          onSelected: () {
                            setState(() => _fontFamily = 'Cairo');
                            _updatePreview();
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildChoiceChip(
                          label: 'خط تـجـوال (Tajawal)',
                          selected: _fontFamily == 'Tajawal',
                          onSelected: () {
                            setState(() => _fontFamily = 'Tajawal');
                            _updatePreview();
                          },
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 28),

                  // زر التصدير في أسفل اللوحة الجانبية
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber.shade700,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 3,
                      ),
                      icon: const Icon(Icons.file_download_outlined),
                      label: const Text(
                        'تصدير الكتاب (PDF / Word / ePub)',
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      onPressed: _openExportDialog,
                    ),
                  ),
                ],
              ),
            ),

            // =================================================================
            // 2. شاشة المعاينة الحيّة (Live PDF Preview via printing)
            // =================================================================
            Expanded(
              child: Container(
                color: isDark ? const Color(0xFF121212) : const Color(0xFFF3F4F6),
                child: PdfPreview(
                  key: _previewKey,
                  maxPageWidth: 700,
                  build: (format) => ExportService.instance.generatePdfBook(
                    book: widget.book,
                    chapters: widget.chapters,
                    citations: widget.citations,
                    config: _currentConfig(),
                  ),
                  allowPrinting: true,
                  allowSharing: true,
                  canChangeOrientation: false,
                  canChangePageFormat: false,
                  canDebug: false,
                  loadingWidget: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(color: Colors.amber.shade700),
                        const SizedBox(height: 14),
                        const Text(
                          'جارٍ تحديث المعاينة الحية فوراً مع الخيارات...',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  pdfFileName: '${widget.book.title}.pdf',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.amber.shade800),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
        ),
      ],
    );
  }

  Widget _buildChoiceChip({
    required String label,
    required bool selected,
    required VoidCallback onSelected,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onSelected,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? Colors.amber.shade700 : Colors.amber.shade500.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? Colors.amber.shade800 : Colors.amber.shade500.withOpacity(0.2),
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 12,
            fontWeight: selected ? FontWeight.bold : FontWeight.w600,
            color: selected ? Colors.white : Colors.amber.shade900,
          ),
        ),
      ),
    );
  }

  Widget _buildRadioListTile({
    required String title,
    required String subtitle,
    required NumberingStyle value,
    required NumberingStyle groupValue,
    required ValueChanged<NumberingStyle?> onChanged,
  }) {
    final isSelected = value == groupValue;
    return InkWell(
      onTap: () => onChanged(value),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        margin: const EdgeInsets.symmetric(vertical: 2),
        decoration: BoxDecoration(
          color: isSelected ? Colors.amber.shade500.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Radio<NumberingStyle>(
              value: value,
              groupValue: groupValue,
              onChanged: onChanged,
              activeColor: Colors.amber.shade800,
              visualDensity: VisualDensity.compact,
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontFamily: 'Tajawal',
                      fontSize: 10,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// نافذة تصدير الكتاب مع مؤشر التقدم الحي واختيار الصيغة (PDF, DOCX, EPUB)
class _ExportProgressDialog extends StatefulWidget {
  final BookEntity book;
  final List<Chapter> chapters;
  final List<Citation> citations;
  final ExportConfig config;

  const _ExportProgressDialog({
    required this.book,
    required this.chapters,
    required this.citations,
    required this.config,
  });

  @override
  State<_ExportProgressDialog> createState() => _ExportProgressDialogState();
}

class _ExportProgressDialogState extends State<_ExportProgressDialog> {
  ExportFormat _chosenFormat = ExportFormat.pdf;
  bool _isProcessing = false;
  double _progressValue = 0.0;
  String _statusMessage = 'جاهز لبدء التصدير';
  String? _finalFilePath;

  Future<void> _startExport() async {
    setState(() {
      _isProcessing = true;
      _progressValue = 0.15;
      _statusMessage = 'جارٍ إعداد نصوص الفصول والهيكل...';
    });

    await Future.delayed(const Duration(milliseconds: 300));

    setState(() {
      _progressValue = 0.45;
      _statusMessage = 'جارٍ معالجة الهوامش والمراجع وتنسيق الخطوط...';
    });

    await Future.delayed(const Duration(milliseconds: 350));

    try {
      Uint8List bytes;
      String extension;
      String mime;

      switch (_chosenFormat) {
        case ExportFormat.pdf:
          extension = 'pdf';
          mime = 'application/pdf';
          bytes = await ExportService.instance.generatePdfBook(
            book: widget.book,
            chapters: widget.chapters,
            citations: widget.citations,
            config: widget.config,
          );
          break;
        case ExportFormat.docx:
          extension = 'docx';
          mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          bytes = await ExportService.instance.generateDocxBook(
            book: widget.book,
            chapters: widget.chapters,
            citations: widget.citations,
            config: widget.config,
          );
          break;
        case ExportFormat.epub:
          extension = 'epub';
          mime = 'application/epub+zip';
          bytes = await ExportService.instance.generateEpubBook(
            book: widget.book,
            chapters: widget.chapters,
            citations: widget.citations,
            config: widget.config,
          );
          break;
      }

      setState(() {
        _progressValue = 0.85;
        _statusMessage = 'جارٍ حفظ وتغليف المستند النهائي...';
      });

      await Future.delayed(const Duration(milliseconds: 250));

      final safeTitle = widget.book.title.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
      final fileName = '$safeTitle.$extension';

      final path = await ExportService.instance.saveExportedFile(
        bytes: bytes,
        fileName: fileName,
      );

      setState(() {
        _isProcessing = false;
        _progressValue = 1.0;
        _statusMessage = 'اكتمل التصدير بنجاح!';
        _finalFilePath = path;
      });
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _statusMessage = 'حدث خطأ أثناء التصدير: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.amber.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.file_download_outlined, color: Colors.amber.shade900, size: 22),
            ),
            const SizedBox(width: 12),
            const Text(
              'تصدير الكتاب وتوليد الملفات',
              style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!_isProcessing && _finalFilePath == null) ...[
                const Text(
                  'حدد الصيغة المطلوبة للإخراج:',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _buildFormatCard(
                        format: ExportFormat.pdf,
                        name: 'PDF',
                        desc: 'طباعة وتنسيق RTL',
                        icon: Icons.picture_as_pdf,
                        color: Colors.red.shade700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildFormatCard(
                        format: ExportFormat.docx,
                        name: 'Word',
                        desc: 'ملف DOCX محرر',
                        icon: Icons.article_outlined,
                        color: Colors.blue.shade700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildFormatCard(
                        format: ExportFormat.epub,
                        name: 'ePub3',
                        desc: 'نشر رقمي للأجهزة',
                        icon: Icons.menu_book_outlined,
                        color: Colors.green.shade700,
                      ),
                    ),
                  ],
                ),
              ],

              // شريط تقدم المعالجة
              if (_isProcessing || _finalFilePath != null) ...[
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _statusMessage,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: _finalFilePath != null ? Colors.green.shade800 : Colors.amber.shade900,
                      ),
                    ),
                    Text(
                      '${(_progressValue * 100).toInt()}%',
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: _progressValue,
                    minHeight: 8,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _finalFilePath != null ? Colors.green : Colors.amber.shade700,
                    ),
                  ),
                ),
                if (_finalFilePath != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.green.shade200),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: Colors.green, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'تم الحفظ في: $_finalFilePath',
                            style: const TextStyle(fontFamily: 'Tajawal', fontSize: 11, color: Colors.black87),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: _isProcessing ? null : () => Navigator.pop(context),
            child: Text(
              _finalFilePath != null ? 'إغلاق' : 'إلغاء',
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
          ),
          if (_finalFilePath == null)
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber.shade700,
                foregroundColor: Colors.white,
              ),
              icon: _isProcessing
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.download, size: 18),
              label: Text(
                _isProcessing ? 'جارٍ التوليد...' : 'بدء التصدير',
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
              ),
              onPressed: _isProcessing ? null : _startExport,
            ),
        ],
      ),
    );
  }

  Widget _buildFormatCard({
    required ExportFormat format,
    required String name,
    required String desc,
    required IconData icon,
    required Color color,
  }) {
    final isSelected = _chosenFormat == format;
    return InkWell(
      onTap: () => setState(() => _chosenFormat = format),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(name, style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13, color: isSelected ? color : null)),
            Text(desc, textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Tajawal', fontSize: 10, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }
}
