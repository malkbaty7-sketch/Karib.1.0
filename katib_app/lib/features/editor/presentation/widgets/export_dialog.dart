import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import '../../../library/domain/entities/book_entity.dart';
import '../../domain/entities/chapter_model.dart';
import '../../domain/entities/citation_model.dart';
import '../../data/services/export_service.dart';

class ExportDialog extends StatefulWidget {
  final BookEntity book;
  final List<Chapter> chapters;
  final List<Citation> citations;

  const ExportDialog({
    super.key,
    required this.book,
    required this.chapters,
    this.citations = const [],
  });

  static Future<void> show(
    BuildContext context, {
    required BookEntity book,
    required List<Chapter> chapters,
    List<Citation> citations = const [],
  }) {
    return showDialog(
      context: context,
      builder: (ctx) => ExportDialog(
        book: book,
        chapters: chapters,
        citations: citations,
      ),
    );
  }

  @override
  State<ExportDialog> createState() => _ExportDialogState();
}

class _ExportDialogState extends State<ExportDialog> {
  ExportFormat _selectedFormat = ExportFormat.pdf;
  String _selectedFont = 'Cairo';
  bool _includeCover = true;
  bool _includeToc = true;
  bool _includeFootnotes = true;
  bool _includePageNumbering = true;
  bool _isExporting = false;
  String? _statusMessage;

  String get _fileExtension {
    switch (_selectedFormat) {
      case ExportFormat.pdf:
        return 'pdf';
      case ExportFormat.docx:
        return 'docx';
      case ExportFormat.epub:
        return 'epub';
    }
  }

  String get _mimeType {
    switch (_selectedFormat) {
      case ExportFormat.pdf:
        return 'application/pdf';
      case ExportFormat.docx:
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case ExportFormat.epub:
        return 'application/epub+zip';
    }
  }

  Future<Uint8List> _generateBytes() async {
    final config = ExportConfig(
      fontFamily: _selectedFont,
      includeCoverPage: _includeCover,
      includeTableOfContents: _includeToc,
      includeFootnotes: _includeFootnotes,
      pageNumbering: _includePageNumbering,
    );

    switch (_selectedFormat) {
      case ExportFormat.pdf:
        return await ExportService.instance.generatePdfBook(
          book: widget.book,
          chapters: widget.chapters,
          citations: widget.citations,
          config: config,
        );
      case ExportFormat.docx:
        return await ExportService.instance.generateDocxBook(
          book: widget.book,
          chapters: widget.chapters,
          citations: widget.citations,
          config: config,
        );
      case ExportFormat.epub:
        return await ExportService.instance.generateEpubBook(
          book: widget.book,
          chapters: widget.chapters,
          citations: widget.citations,
          config: config,
        );
    }
  }

  Future<void> _handleSaveToStorage() async {
    setState(() {
      _isExporting = true;
      _statusMessage = 'جارٍ إنشاء الملف وتنسيق المستند...';
    });

    try {
      final bytes = await _generateBytes();
      final safeTitle = widget.book.title.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
      final fileName = '$safeTitle.$_fileExtension';

      final savedPath = await ExportService.instance.saveExportedFile(
        bytes: bytes,
        fileName: fileName,
      );

      if (mounted) {
        setState(() {
          _isExporting = false;
          _statusMessage = 'تم الحفظ بنجاح في: $savedPath';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.green.shade800,
            content: Text(
              'تم حفظ الكتاب في: $savedPath',
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isExporting = false;
          _statusMessage = 'حدث خطأ أثناء التصدير: $e';
        });
      }
    }
  }

  Future<void> _handleShare() async {
    setState(() {
      _isExporting = true;
      _statusMessage = 'جارٍ إعداد الملف للمشاركة...';
    });

    try {
      final bytes = await _generateBytes();
      final safeTitle = widget.book.title.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
      final fileName = '$safeTitle.$_fileExtension';

      await ExportService.instance.shareExportedFile(
        bytes: bytes,
        fileName: fileName,
        mimeType: _mimeType,
        subject: widget.book.title,
      );

      if (mounted) {
        setState(() {
          _isExporting = false;
          _statusMessage = 'تمت المشاركة بنجاح';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isExporting = false;
          _statusMessage = 'حدث خطأ: $e';
        });
      }
    }
  }

  Future<void> _handlePdfPreview() async {
    if (_selectedFormat != ExportFormat.pdf) {
      setState(() => _selectedFormat = ExportFormat.pdf);
    }

    setState(() {
      _isExporting = true;
      _statusMessage = 'جارٍ تجهيز معاينة الطباعة...';
    });

    try {
      final bytes = await _generateBytes();
      if (mounted) {
        setState(() => _isExporting = false);
        await Printing.layoutPdf(
          onLayout: (_) => bytes,
          name: widget.book.title,
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isExporting = false;
          _statusMessage = 'تعذر فتح المعاينة: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          width: 540,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.file_download_outlined, color: Colors.amber.shade900),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'تصدير الكتاب والنشر الرقمي',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                        Text(
                          widget.book.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontFamily: 'Tajawal',
                            fontSize: 13,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),

              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 12),

              // صيغ التصدير
              const Text(
                'اختر صيغة الملف:',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildFormatCard(
                      format: ExportFormat.pdf,
                      title: 'مستند PDF',
                      subtitle: 'جاهز للطباعة وتنسيق RTL',
                      icon: Icons.picture_as_pdf,
                      color: Colors.red.shade700,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildFormatCard(
                      format: ExportFormat.docx,
                      title: 'Word (.docx)',
                      subtitle: 'قابل للتحرير بتنسيق عربي',
                      icon: Icons.article_outlined,
                      color: Colors.blue.shade700,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildFormatCard(
                      format: ExportFormat.epub,
                      title: 'كتاب ePub3',
                      subtitle: 'للقراء والأجهزة اللوحية',
                      icon: Icons.menu_book_outlined,
                      color: Colors.emerald ?? Colors.green.shade700,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // إعدادات التنسيق المتقدم
              const Text(
                'خيارات التنسيق والصفحات:',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const SizedBox(height: 8),

              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceVariant.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    // نوع الخط العربي
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('الخط العربي المعتمد:', style: TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                        DropdownButton<String>(
                          value: _selectedFont,
                          underline: const SizedBox(),
                          items: const [
                            DropdownMenuItem(value: 'Cairo', child: Text('خط كـايرو (Cairo)')),
                            DropdownMenuItem(value: 'Tajawal', child: Text('خط تـجـوال (Tajawal)')),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _selectedFont = val);
                          },
                        ),
                      ],
                    ),
                    const Divider(height: 12),
                    // Checkboxes
                    CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      value: _includeCover,
                      title: const Text('تضمين صفحة الغلاف الفاخرة', style: TextStyle(fontFamily: 'Tajawal', fontSize: 13)),
                      onChanged: (val) => setState(() => _includeCover = val ?? true),
                    ),
                    CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      value: _includeToc,
                      title: const Text('تضمين صفحة الفهرس الآلي (Table of Contents)', style: TextStyle(fontFamily: 'Tajawal', fontSize: 13)),
                      onChanged: (val) => setState(() => _includeToc = val ?? true),
                    ),
                    CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      value: _includeFootnotes,
                      title: Text('توثيق الحواشي السفلية والهوامش (${widget.citations.length} مراجع)', style: const TextStyle(fontFamily: 'Tajawal', fontSize: 13)),
                      onChanged: (val) => setState(() => _includeFootnotes = val ?? true),
                    ),
                    if (_selectedFormat == ExportFormat.pdf)
                      CheckboxListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        value: _includePageNumbering,
                        title: const Text('ترقيم الصفحات التلقائي في الأسفل', style: TextStyle(fontFamily: 'Tajawal', fontSize: 13)),
                        onChanged: (val) => setState(() => _includePageNumbering = val ?? true),
                      ),
                  ],
                ),
              ),

              if (_statusMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  _statusMessage!,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    color: _statusMessage!.contains('خطأ') ? Colors.red : Colors.amber.shade900,
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // الأزرار التفاعلية
              Row(
                children: [
                  if (_selectedFormat == ExportFormat.pdf) ...[
                    OutlinedButton.icon(
                      icon: const Icon(Icons.print_outlined, size: 18),
                      label: const Text('معاينة وطباعة', style: TextStyle(fontFamily: 'Cairo')),
                      onPressed: _isExporting ? null : _handlePdfPreview,
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.share_outlined, size: 18),
                      label: const Text('مشاركة', style: TextStyle(fontFamily: 'Cairo')),
                      onPressed: _isExporting ? null : _handleShare,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: _isExporting
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.download, size: 18),
                      label: Text(
                        _isExporting ? 'جارٍ التصدير...' : 'حفظ في الذاكرة',
                        style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                      ),
                      onPressed: _isExporting ? null : _handleSaveToStorage,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFormatCard({
    required ExportFormat format,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    final isSelected = _selectedFormat == format;

    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => setState(() => _selectedFormat = format),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 6),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: isSelected ? color : null,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Tajawal',
                fontSize: 10,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
