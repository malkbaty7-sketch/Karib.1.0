import 'package:flutter/material.dart';

/// الشريط السفلي لإحصائيات المحرر الحية (EditorStatsBar)
/// يعرض عدد الكلمات، عدد الحروف، وزمن القراءة المتوقع وحالة الحفظ
class EditorStatsBar extends StatelessWidget {
  final int wordCount;
  final int characterCount;
  final bool isSaving;
  final DateTime? lastSavedAt;

  const EditorStatsBar({
    super.key,
    required this.wordCount,
    required this.characterCount,
    this.isSaving = false,
    this.lastSavedAt,
  });

  /// حساب زمن القراءة المتوقع (متوسط سرعة القراءة العربية ~200 كلمة/دقيقة)
  String get estimatedReadingTime {
    if (wordCount == 0) return 'أقل من دقيقة';
    final minutes = (wordCount / 200).ceil();
    if (minutes == 1) return 'دقيقة واحدة قراءة';
    if (minutes == 2) return 'دقيقتان قراءة';
    if (minutes <= 10) return '$minutes دقائق قراءة';
    return '$minutes دقيقة قراءة';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        height: 38,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          border: Border(
            top: BorderSide(
              color: theme.dividerColor.withOpacity(0.15),
            ),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // الإحصائيات الحية
            Row(
              children: [
                _buildStatItem(Icons.short_text, '$wordCount كلمة', theme),
                const SizedBox(width: 16),
                _buildStatItem(Icons.text_fields, '$characterCount حرف', theme),
                const SizedBox(width: 16),
                _buildStatItem(Icons.timer_outlined, estimatedReadingTime, theme),
              ],
            ),

            // مؤشر الحفظ التلقائي في SQLite
            Row(
              children: [
                if (isSaving) ...[
                  const SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'جاري الحفظ التلقائي...',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ] else ...[
                  Icon(Icons.check_circle_outline, size: 14, color: Colors.green.shade600),
                  const SizedBox(width: 6),
                  Text(
                    'محفوظ في SQLite',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      color: Colors.green.shade700,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String text, ThemeData theme) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 5),
        Text(
          text,
          style: TextStyle(
            fontFamily: 'Tajawal',
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: theme.colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}
