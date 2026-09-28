import 'package:flutter/material.dart';
import '../../domain/entities/citation_model.dart';

/// حوار اختيار وإدراج المرجع (CitationPickerDialog)
/// يتيح اختيار اقتباس من المستخرجات الدلالية السابقة وإدراجه كحاشية سفلية أكاديمية منسقة
class CitationPickerDialog extends StatefulWidget {
  final List<Citation> availableCitations;
  final Function(String footnoteText) onCitationSelected;

  const CitationPickerDialog({
    super.key,
    required this.availableCitations,
    required this.onCitationSelected,
  });

  @override
  State<CitationPickerDialog> createState() => _CitationPickerDialogState();
}

class _CitationPickerDialogState extends State<CitationPickerDialog> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filtered = widget.availableCitations.where((c) {
      return c.excerpt.contains(_searchQuery) ||
             c.sourceFileName.contains(_searchQuery) ||
             c.author.contains(_searchQuery);
    }).toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          width: 540,
          maxHeight: 600,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // عنوان الحوار
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.format_quote_rounded, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      const Text(
                        'إدراج مرجع واقتباس أكاديمي',
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // حقل البحث في المراجع المستخرجة
              TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: InputDecoration(
                  hintText: 'ابحث في الاقتباسات أو أسماء الكتب والمؤلفين...',
                  hintStyle: const TextStyle(fontFamily: 'Tajawal', fontSize: 13),
                  prefixIcon: const Icon(Icons.search, size: 20),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
              ),
              const SizedBox(height: 14),

              // قائمة الاقتباسات
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.library_books_outlined, size: 40, color: Colors.grey),
                            SizedBox(height: 8),
                            Text(
                              'لا توجد اقتباسات مطابقة في سجل البحث الدلالي',
                              style: TextStyle(fontFamily: 'Tajawal', color: Colors.grey),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final cit = filtered[index];
                          final footnoteFormat = '«${cit.excerpt}» — ${cit.author}، [${cit.sourceFileName}]، ص ${cit.pageNumber}.';

                          return Card(
                            elevation: 0,
                            color: theme.colorScheme.surfaceVariant.withOpacity(0.3),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                              side: BorderSide(color: theme.dividerColor.withOpacity(0.2)),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: theme.colorScheme.primary.withOpacity(0.12),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          'ص ${cit.pageNumber}',
                                          style: TextStyle(
                                            fontFamily: 'Cairo',
                                            fontWeight: FontWeight.bold,
                                            fontSize: 11,
                                            color: theme.colorScheme.primary,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          cit.sourceFileName,
                                          style: const TextStyle(
                                            fontFamily: 'Cairo',
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      Text(
                                        cit.author,
                                        style: TextStyle(
                                          fontFamily: 'Tajawal',
                                          fontSize: 12,
                                          color: theme.colorScheme.onSurfaceVariant,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    '«${cit.excerpt}»',
                                    style: const TextStyle(
                                      fontFamily: 'Tajawal',
                                      fontSize: 13,
                                      height: 1.5,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Align(
                                    alignment: Alignment.centerLeft,
                                    child: ElevatedButton.icon(
                                      icon: const Icon(Icons.add_link, size: 16),
                                      label: const Text(
                                        'إدراج كحاشية سفلية (Footnote)',
                                        style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                      style: ElevatedButton.styleFrom(
                                        visualDensity: VisualDensity.compact,
                                        backgroundColor: theme.colorScheme.primary,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      onPressed: () {
                                        widget.onCitationSelected(footnoteFormat);
                                        Navigator.pop(context);
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
