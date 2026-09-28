import 'package:flutter/material.dart';
import '../../domain/entities/chapter_model.dart';

/// القائمة الجانبية لإدارة الفصول (ChapterSidebarWidget)
/// تدعم عرض الفصول، إضافة فصل جديد، إعادة التسمية، والسحب والإفلات لإعادة الترتيب
class ChapterSidebarWidget extends StatelessWidget {
  final List<Chapter> chapters;
  final Chapter? currentChapter;
  final Function(String chapterId) onSelectChapter;
  final VoidCallback onAddNewChapter;
  final Function(String chapterId, String newTitle) onRenameChapter;
  final Function(int oldIndex, int newIndex) onReorderChapters;
  final Function(String chapterId)? onDeleteChapter;

  const ChapterSidebarWidget({
    super.key,
    required this.chapters,
    required this.currentChapter,
    required this.onSelectChapter,
    required this.onAddNewChapter,
    required this.onRenameChapter,
    required this.onReorderChapters,
    this.onDeleteChapter,
  });

  void _showRenameDialog(BuildContext context, Chapter chapter) {
    final textController = TextEditingController(text: chapter.title);

    showDialog(
      context: context,
      builder: (ctx) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            title: const Text('إعادة تسمية الفصل', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
            content: TextField(
              controller: textController,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'عنوان الفصل الجديد',
                border: OutlineInputBorder(),
              ),
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo')),
              ),
              ElevatedButton(
                onPressed: () {
                  final newTitle = textController.text.trim();
                  if (newTitle.isNotEmpty) {
                    onRenameChapter(chapter.id, newTitle);
                  }
                  Navigator.pop(ctx);
                },
                child: const Text('حفظ', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        width: 280,
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          border: Border(
            left: BorderSide(
              color: theme.dividerColor.withOpacity(0.15),
            ),
          ),
        ),
        child: Column(
          children: [
            // ترويسة القائمة الجانبية مع زر الإضافة
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: theme.dividerColor.withOpacity(0.1),
                  ),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'فصول الكتاب (${chapters.length})',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  IconButton.filledTonal(
                    icon: const Icon(Icons.add, size: 18),
                    tooltip: 'إضافة فصل جديد',
                    onPressed: onAddNewChapter,
                  ),
                ],
              ),
            ),

            // قائمة الفصول القابلة لإعادة الترتيب بالسحب والإسقاط (ReorderableListView)
            Expanded(
              child: ReorderableListView.builder(
                padding: const EdgeInsets.all(8),
                itemCount: chapters.length,
                onReorder: onReorderChapters,
                itemBuilder: (context, index) {
                  final chapter = chapters[index];
                  final isSelected = currentChapter?.id == chapter.id;

                  return Card(
                    key: ValueKey(chapter.id),
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    elevation: isSelected ? 2 : 0,
                    color: isSelected 
                        ? theme.colorScheme.primaryContainer.withOpacity(0.4) 
                        : theme.colorScheme.surfaceVariant.withOpacity(0.25),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: isSelected 
                            ? theme.colorScheme.primary 
                            : Colors.transparent,
                        width: 1.5,
                      ),
                    ),
                    child: ListTile(
                      dense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                      leading: CircleAvatar(
                        radius: 12,
                        backgroundColor: isSelected 
                            ? theme.colorScheme.primary 
                            : theme.colorScheme.outline.withOpacity(0.2),
                        child: Text(
                          '${index + 1}',
                          style: TextStyle(
                            fontSize: 11,
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : theme.colorScheme.onSurface,
                          ),
                        ),
                      ),
                      title: Text(
                        chapter.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected 
                              ? theme.colorScheme.primary 
                              : theme.colorScheme.onSurface,
                        ),
                      ),
                      subtitle: Text(
                        '${chapter.wordCount} كلمة',
                        style: TextStyle(
                          fontFamily: 'Tajawal',
                          fontSize: 11,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 16),
                            tooltip: 'إعادة تسمية',
                            onPressed: () => _showRenameDialog(context, chapter),
                          ),
                          ReorderableDragStartListener(
                            index: index,
                            child: const Icon(Icons.drag_indicator, size: 18, color: Colors.grey),
                          ),
                        ],
                      ),
                      onTap: () => onSelectChapter(chapter.id),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
