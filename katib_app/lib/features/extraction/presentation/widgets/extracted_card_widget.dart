import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../domain/entities/extracted_result_entity.dart';

class ExtractedCardWidget extends StatefulWidget {
  final ExtractedResultEntity result;
  final VoidCallback onToggleAccept;
  final ValueChanged<String> onSaveEdit;
  final VoidCallback onViewOriginalPage;
  final VoidCallback onAddToProject;

  const ExtractedCardWidget({
    super.key,
    required this.result,
    required this.onToggleAccept,
    required this.onSaveEdit,
    required this.onViewOriginalPage,
    required this.onAddToProject,
  });

  @override
  State<ExtractedCardWidget> createState() => _ExtractedCardWidgetState();
}

class _ExtractedCardWidgetState extends State<ExtractedCardWidget> {
  bool _isEditing = false;
  late TextEditingController _textController;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController(text: widget.result.text);
  }

  @override
  void didUpdateWidget(covariant ExtractedCardWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.result.text != widget.result.text && !_isEditing) {
      _textController.text = widget.result.text;
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  String _getTypeLabel(ExtractionType type) {
    switch (type) {
      case ExtractionType.passages:
        return 'نص أصلي موثق';
      case ExtractionType.summary:
        return 'ملخص تحليلي';
      case ExtractionType.comparison:
        return 'مقارنة بين المصادر';
      case ExtractionType.qa:
        return 'إجابة عن سؤال';
      case ExtractionType.definitions:
        return 'تعريفات وبيانات';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isAccepted = widget.result.isAccepted;

    return Card(
      elevation: isAccepted ? 2.5 : 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isAccepted
              ? Colors.emerald.withOpacity(0.5)
              : (isDark ? const Color(0xFF2E2E2E) : const Color(0xFFE5E7EB)),
          width: isAccepted ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // رأس البطاقة: نوع الاستخراج + شريط المرجع (Chip) + زر عرض الصفحة الأصلية
          Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                // النوع وشريط المرجع
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    // وسم نوع الاستخراج
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _getTypeLabel(widget.result.type),
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ),

                    // شريط المرجع (Chip): اسم الكتاب ورقم الصفحة
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.stone[800] : const Color(0xFFF3F0E8),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isDark ? Colors.stone[700]! : const Color(0xFFE5E2D9),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.menu_book_rounded, size: 14, color: theme.colorScheme.primary),
                          const SizedBox(width: 5),
                          Text(
                            widget.result.bookTitle,
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '• ص ${widget.result.pageNumber}',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                // زر 'عرض الصفحة الأصلية' للتحقق من المصدر
                OutlinedButton.icon(
                  onPressed: widget.onViewOriginalPage,
                  icon: const Icon(Icons.open_in_new_rounded, size: 14),
                  label: const Text(
                    'عرض الصفحة الأصلية',
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    visualDensity: VisualDensity.compact,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // المحتوى: النص المستخرج أو الملخص مع دعم التعديل المباشر
          Padding(
            padding: const EdgeInsets.all(14),
            child: _isEditing
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: _textController,
                        maxLines: 5,
                        style: const TextStyle(fontFamily: 'Tajawal', fontSize: 15, height: 1.6),
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: () {
                              setState(() {
                                _isEditing = false;
                                _textController.text = widget.result.text;
                              });
                            },
                            child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo')),
                          ),
                          FilledButton.icon(
                            onPressed: () {
                              widget.onSaveEdit(_textController.text.trim());
                              setState(() => _isEditing = false);
                            },
                            icon: const Icon(Icons.save_rounded, size: 16),
                            label: const Text('حفظ التعديل', style: TextStyle(fontFamily: 'Cairo')),
                          ),
                        ],
                      ),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SelectableText(
                        widget.result.text,
                        style: const TextStyle(
                          fontFamily: 'Tajawal',
                          fontSize: 15,
                          height: 1.7,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'المؤلف: ${widget.result.author}',
                            style: TextStyle(
                              fontFamily: 'Tajawal',
                              fontSize: 11,
                              color: isDark ? Colors.stone[400] : Colors.stone[600],
                            ),
                          ),
                          Text(
                            'دقة المطابقة: %${widget.result.relevanceScore}',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.secondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
          ),

          const Divider(height: 1),

          // شريط أزرار التحكم (قبول وحفظ، تعديل النص، نسخ، إضافة مباشر إلى مشروع كتاب)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF141312) : const Color(0xFFFAF9F6),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
            ),
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 6,
              children: [
                // زر قبول وحفظ
                FilledButton.tonalIcon(
                  onPressed: widget.onToggleAccept,
                  icon: Icon(
                    isAccepted ? Icons.check_circle_rounded : Icons.check_circle_outline_rounded,
                    size: 16,
                  ),
                  label: Text(
                    isAccepted ? 'مقبول ومحفوظ' : 'قبول وحفظ',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: isAccepted ? Colors.emerald.withOpacity(0.2) : null,
                    foregroundColor: isAccepted ? Colors.emerald : null,
                    visualDensity: VisualDensity.compact,
                  ),
                ),

                // الأزرار الفرعية: تعديل النص، نسخ، إضافة لمشروع كتاب
                Wrap(
                  spacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    // تعديل النص
                    TextButton.icon(
                      onPressed: () => setState(() => _isEditing = !_isEditing),
                      icon: const Icon(Icons.edit_note_rounded, size: 16),
                      label: const Text('تعديل النص', style: TextStyle(fontFamily: 'Cairo', fontSize: 11)),
                      style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                    ),

                    // نسخ إلى الحافظة
                    IconButton(
                      tooltip: 'نسخ النص',
                      icon: const Icon(Icons.copy_rounded, size: 16),
                      visualDensity: VisualDensity.compact,
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: widget.result.text));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('تم نسخ النص إلى الحافظة بنجاح', style: TextStyle(fontFamily: 'Cairo')),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                    ),

                    // إضافة مباشر إلى مشروع كتاب
                    FilledButton.icon(
                      onPressed: widget.onAddToProject,
                      icon: const Icon(Icons.post_add_rounded, size: 16),
                      label: const Text(
                        'إضافة لمشروع كتاب',
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      style: FilledButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
