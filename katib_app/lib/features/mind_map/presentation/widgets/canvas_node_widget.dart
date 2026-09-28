import 'package:flutter/material.dart';
import '../../domain/entities/canvas_node.dart';

/// عنصر بطاقة العقدة على السبورة الذهنية (CanvasNodeWidget)
/// يدعم السحب والإفلات، تغيير اللون، اتجاه RTL، واختيار العقد للتوصيل
class CanvasNodeWidget extends StatelessWidget {
  final CanvasNode node;
  final bool isSelected;
  final bool isConnectingSource;
  final VoidCallback onTap;
  final Function(DragUpdateDetails) onPanUpdate;
  final VoidCallback onStartConnect;
  final VoidCallback onDelete;
  final Function(String title, String content) onEdit;

  const CanvasNodeWidget({
    super.key,
    required this.node,
    required this.isSelected,
    required this.isConnectingSource,
    required this.onTap,
    required this.onPanUpdate,
    required this.onStartConnect,
    required this.onDelete,
    required this.onEdit,
  });

  Color _parseColor(String hex) {
    try {
      final clean = hex.replaceAll('#', '');
      return Color(int.parse('FF\$clean', radix: 16));
    } catch (_) {
      return const Color(0xFFF59E0B);
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'character':
        return Icons.person_rounded;
      case 'location':
        return Icons.location_on_rounded;
      case 'extracted_quote':
        return Icons.format_quote_rounded;
      case 'event':
        return Icons.timeline_rounded;
      case 'idea':
      default:
        return Icons.lightbulb_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accentColor = _parseColor(node.colorHex);

    return Positioned(
      left: node.dx,
      top: node.dy,
      width: node.width,
      child: GestureDetector(
        onTap: onTap,
        onPanUpdate: onPanUpdate,
        child: Container(
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isConnectingSource
                  ? Colors.amber
                  : isSelected
                      ? accentColor
                      : theme.dividerColor.withOpacity(0.2),
              width: isSelected || isConnectingSource ? 2.5 : 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: (isSelected ? accentColor : Colors.black).withOpacity(isSelected ? 0.25 : 0.06),
                blurRadius: isSelected ? 16 : 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // رأس البطاقة
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: accentColor.withOpacity(0.12),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(15),
                      topRight: Radius.circular(15),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(_getTypeIcon(node.nodeType), size: 16, color: accentColor),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          node.title,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: theme.textTheme.bodyLarge?.color,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      InkWell(
                        onTap: onStartConnect,
                        borderRadius: BorderRadius.circular(6),
                        child: Padding(
                          padding: const EdgeInsets.all(2),
                          child: Icon(
                            Icons.cable_rounded,
                            size: 16,
                            color: isConnectingSource ? Colors.amber : theme.hintColor,
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      InkWell(
                        onTap: onDelete,
                        borderRadius: BorderRadius.circular(6),
                        child: const Padding(
                          padding: EdgeInsets.all(2),
                          child: Icon(Icons.close_rounded, size: 16, color: Colors.redAccent),
                        ),
                      ),
                    ],
                  ),
                ),

                // محتوى البطاقة
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    node.content,
                    style: TextStyle(
                      fontFamily: 'Tajawal',
                      fontSize: 12,
                      height: 1.4,
                      color: theme.textTheme.bodyMedium?.color?.withOpacity(0.85),
                    ),
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),

                // تذييل البطاقة (النوع واللون)
                Padding(
                  padding: const EdgeInsets.only(left: 10, right: 10, bottom: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: accentColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          node.typeEnum.arabicLabel,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 9.5,
                            fontWeight: FontWeight.w600,
                            color: accentColor,
                          ),
                        ),
                      ),
                      Text(
                        '(${node.dx.toInt()}, ${node.dy.toInt()})',
                        style: TextStyle(
                          fontSize: 9,
                          fontFamily: 'Tajawal',
                          color: theme.hintColor.withOpacity(0.7),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
