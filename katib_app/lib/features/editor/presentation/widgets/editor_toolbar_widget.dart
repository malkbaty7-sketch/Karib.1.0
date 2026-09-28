import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;

/// شريط أدوات التنسيق (EditorToolbarWidget)
/// يدعم اتجاه اليمين إلى اليسار (RTL)، العناوين، المحاذاة، القوائم، والاقتباسات
class EditorToolbarWidget extends StatelessWidget {
  final quill.QuillController controller;
  final VoidCallback onOpenCitationPicker;
  final VoidCallback onToggleFont;
  final String currentFont;
  final VoidCallback? onOpenStyleAssistant;
  final VoidCallback? onOpenAudiobook;

  const EditorToolbarWidget({
    super.key,
    required this.controller,
    required this.onOpenCitationPicker,
    required this.onToggleFont,
    required this.currentFont,
    this.onOpenStyleAssistant,
    this.onOpenAudiobook,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          border: Border(
            bottom: BorderSide(
              color: theme.dividerColor.withOpacity(0.15),
            ),
          ),
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              // 1. زر تبديل الخط العربي (Cairo / Tajawal)
              ActionChip(
                avatar: const Icon(Icons.font_download_outlined, size: 16),
                label: Text(
                  currentFont == 'Cairo' ? 'خط كـايرو' : 'خط تجـوال',
                  style: TextStyle(fontFamily: currentFont, fontSize: 12),
                ),
                onPressed: onToggleFont,
              ),
              const SizedBox(width: 8),
              const VerticalDivider(width: 1, indent: 6, endIndent: 6),
              const SizedBox(width: 8),

              // 2. العناوين (H1, H2, H3)
              quill.QuillToolbarSelectHeaderStyleDropdownButton(
                controller: controller,
                options: const quill.QuillToolbarSelectHeaderStyleDropdownButtonOptions(),
              ),
              const SizedBox(width: 4),

              // 3. التنسيقات الأساسية (غامق، مائل، تحته خط)
              quill.QuillToolbarToggleStyleButton(
                attribute: quill.Attribute.bold,
                controller: controller,
              ),
              quill.QuillToolbarToggleStyleButton(
                attribute: quill.Attribute.italic,
                controller: controller,
              ),
              quill.QuillToolbarToggleStyleButton(
                attribute: quill.Attribute.underline,
                controller: controller,
              ),
              const SizedBox(width: 4),
              const VerticalDivider(width: 1, indent: 6, endIndent: 6),
              const SizedBox(width: 4),

              // 4. محاذاة النص (يمين، وسط، يسار، ضبط كامل)
              IconButton(
                icon: const Icon(Icons.format_align_right, size: 20),
                tooltip: 'محاذاة لليمين',
                onPressed: () {
                  controller.formatSelection(quill.Attribute.rightAlignment);
                },
              ),
              IconButton(
                icon: const Icon(Icons.format_align_center, size: 20),
                tooltip: 'توسيط النص',
                onPressed: () {
                  controller.formatSelection(quill.Attribute.centerAlignment);
                },
              ),
              IconButton(
                icon: const Icon(Icons.format_align_left, size: 20),
                tooltip: 'محاذاة لليسار',
                onPressed: () {
                  controller.formatSelection(quill.Attribute.leftAlignment);
                },
              ),
              IconButton(
                icon: const Icon(Icons.format_align_justify, size: 20),
                tooltip: 'ضبط كامل',
                onPressed: () {
                  controller.formatSelection(quill.Attribute.justifyAlignment);
                },
              ),
              const SizedBox(width: 4),
              const VerticalDivider(width: 1, indent: 6, endIndent: 6),
              const SizedBox(width: 4),

              // 5. القوائم النقطية والرقمية
              quill.QuillToolbarToggleStyleButton(
                attribute: quill.Attribute.ul,
                controller: controller,
              ),
              quill.QuillToolbarToggleStyleButton(
                attribute: quill.Attribute.ol,
                controller: controller,
              ),

              // 6. اقتباس مخصص (Blockquote)
              quill.QuillToolbarToggleStyleButton(
                attribute: quill.Attribute.blockQuote,
                controller: controller,
              ),
              const SizedBox(width: 8),
              const VerticalDivider(width: 1, indent: 6, endIndent: 6),
              const SizedBox(width: 8),

              // 7. زر إدراج مرجع (Insert Citation)
              ElevatedButton.icon(
                icon: const Icon(Icons.format_quote_rounded, size: 18),
                label: const Text(
                  'إدراج مرجع',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: onOpenCitationPicker,
              ),

              // 8. زر مساعد الأسلوب والمشاعر (Gemini Style Assistant)
              if (onOpenStyleAssistant != null) ...[
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  icon: const Icon(Icons.auto_awesome, size: 16),
                  label: const Text(
                    'مساعد الأسلوب',
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber.shade700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: onOpenStyleAssistant,
                ),
              ],

              // 9. زر تحويل الفصل إلى كتاب صوتي (Audiobook Player)
              if (onOpenAudiobook != null) ...[
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  icon: Icon(Icons.headphones_rounded, size: 16, color: Colors.amber.shade800),
                  label: Text(
                    'كتاب صوتي',
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: Colors.amber.shade700, width: 1.2),
                    backgroundColor: Colors.amber.shade50.withOpacity(0.5),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: onOpenAudiobook,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
