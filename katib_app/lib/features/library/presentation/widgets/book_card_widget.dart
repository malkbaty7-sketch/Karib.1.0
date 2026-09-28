import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/book_entity.dart';
import '../bloc/library_bloc.dart';

class BookCardWidget extends StatelessWidget {
  final BookEntity book;
  final VoidCallback onTap;

  const BookCardWidget({
    super.key,
    required this.book,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? const Color(0xFF2E2E2E) : const Color(0xFFE5E7EB),
        ),
      ),
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // غلاف الكتاب الفني
            Expanded(
              flex: 5,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: book.format == 'pdf'
                        ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                        : [const Color(0xFFB45309), const Color(0xFF78350F)],
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                  ),
                ),
                padding: const EdgeInsets.all(12),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black38,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            book.category,
                            style: const TextStyle(
                              color: Color(0xFFFDE68A),
                              fontSize: 10,
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        IconButton(
                          iconSize: 18,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: Icon(
                            book.isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                            color: book.isFavorite ? Colors.redAccent : Colors.white70,
                          ),
                          onPressed: () {
                            context.read<LibraryBloc>().add(ToggleFavoriteEvent(book.id));
                          },
                        ),
                      ],
                    ),
                    Column(
                      children: [
                        Text(
                          book.title,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          book.author,
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontFamily: 'Tajawal',
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '${book.totalPages} صفحة',
                        style: const TextStyle(color: Colors.white54, fontSize: 10, fontFamily: 'Tajawal'),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // البيانات ونسبة الإنجاز
            Expanded(
              flex: 4,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          book.format == 'project' ? 'إنجاز التأليف' : 'نسبة القراءة',
                          style: const TextStyle(fontSize: 11, fontFamily: 'Tajawal', color: Colors.grey),
                        ),
                        Text(
                          '%${(book.progress * 100).toInt()}',
                          style: TextStyle(
                            fontSize: 11,
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: book.progress,
                        minHeight: 5,
                        backgroundColor: isDark ? Colors.stone[800] : Colors.stone[200],
                        valueColor: AlwaysStoppedAnimation(theme.colorScheme.primary),
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${book.wordCount} كلمة',
                          style: const TextStyle(fontSize: 11, fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                        ),
                        Icon(
                          book.format == 'pdf' ? Icons.picture_as_pdf_rounded : Icons.edit_note_rounded,
                          size: 16,
                          color: Colors.grey,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
