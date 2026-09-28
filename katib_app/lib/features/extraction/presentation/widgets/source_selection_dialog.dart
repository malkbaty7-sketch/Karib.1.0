import 'package:flutter/material.dart';
import '../../../library/domain/entities/book_entity.dart';

class SourceSelectionDialog extends StatefulWidget {
  final List<BookEntity> allBooks;
  final Set<String> initialSelectedBookIds;

  const SourceSelectionDialog({
    super.key,
    required this.allBooks,
    required this.initialSelectedBookIds,
  });

  @override
  State<SourceSelectionDialog> createState() => _SourceSelectionDialogState();
}

class _SourceSelectionDialogState extends State<SourceSelectionDialog> {
  late Set<String> _selectedBookIds;

  @override
  void initState() {
    super.initState();
    _selectedBookIds = Set.from(widget.initialSelectedBookIds);
  }

  void _selectAll() {
    setState(() {
      _selectedBookIds = widget.allBooks.map((b) => b.id).toSet();
    });
  }

  void _deselectAll() {
    setState(() {
      _selectedBookIds.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.library_books_rounded, color: Color(0xFFD97706)),
            const SizedBox(width: 8),
            const Text(
              'اختيار مصادر الاستخراج',
              style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        content: SizedBox(
          width: 500,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'تم تحديد ${_selectedBookIds.length} من ${widget.allBooks.length} كتب',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  Row(
                    children: [
                      TextButton(
                        onPressed: _selectAll,
                        child: const Text('تحديد الكل', style: TextStyle(fontFamily: 'Cairo', fontSize: 12)),
                      ),
                      TextButton(
                        onPressed: _deselectAll,
                        child: const Text('إلغاء التحديد', style: TextStyle(fontFamily: 'Cairo', fontSize: 12)),
                      ),
                    ],
                  ),
                ],
              ),
              const Divider(),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: widget.allBooks.length,
                  itemBuilder: (context, index) {
                    final book = widget.allBooks[index];
                    final isSelected = _selectedBookIds.contains(book.id);

                    return CheckboxListTile(
                      value: isSelected,
                      title: Text(
                        book.title,
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        '${book.author} • ${book.category} (${book.totalPages} ص)',
                        style: const TextStyle(fontFamily: 'Tajawal', fontSize: 11),
                      ),
                      activeColor: const Color(0xFFD97706),
                      onChanged: (bool? val) {
                        setState(() {
                          if (val == true) {
                            _selectedBookIds.add(book.id);
                          } else {
                            _selectedBookIds.remove(book.id);
                          }
                        });
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, _selectedBookIds),
            child: Text(
              'تأكيد الاختيار (${_selectedBookIds.length})',
              style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
