import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/book_entity.dart';
import '../bloc/library_bloc.dart';

class CreateBookDialog extends StatefulWidget {
  const CreateBookDialog({super.key});

  @override
  State<CreateBookDialog> createState() => _CreateBookDialogState();
}

class _CreateBookDialogState extends State<CreateBookDialog> {
  final _titleController = TextEditingController();
  final _authorController = TextEditingController();
  String _category = 'رواية عربية';
  int _targetWordCount = 50000;

  @override
  void dispose() {
    _titleController.dispose();
    _authorController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: AlertDialog(
        title: const Text(
          'مشروع كتاب جديد',
          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'عنوان الكتاب *',
                  hintText: 'مثال: أسرار البيان...',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _authorController,
                decoration: const InputDecoration(
                  labelText: 'اسم المؤلف',
                  hintText: 'اسمك أو اللقب الأدبي',
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _category,
                decoration: const InputDecoration(labelText: 'التصنيف الأدبي'),
                items: const [
                  DropdownMenuItem(value: 'رواية عربية', child: Text('رواية عربية')),
                  DropdownMenuItem(value: 'نقد وأدب', child: Text('نقد وأدب')),
                  DropdownMenuItem(value: 'فكر ودراسات', child: Text('فكر ودراسات')),
                  DropdownMenuItem(value: 'شعر وبلاغة', child: Text('شعر وبلاغة')),
                  DropdownMenuItem(value: 'تقنية وبرمجة', child: Text('تقنية وبرمجة')),
                ],
                onChanged: (val) => setState(() => _category = val ?? _category),
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
            onPressed: () {
              if (_titleController.text.trim().isEmpty) return;

              final newBook = BookEntity(
                id: DateTime.now().millisecondsSinceEpoch.toString(),
                title: _titleController.text.trim(),
                author: _authorController.text.trim().isEmpty ? 'كاتب مستقل' : _authorController.text.trim(),
                category: _category,
                totalPages: 200,
                currentPage: 0,
                wordCount: 0,
                targetWordCount: _targetWordCount,
                status: 'drafting',
                format: 'project',
                lastModified: DateTime.now(),
              );

              context.read<LibraryBloc>().add(AddNewProjectEvent(newBook));
              Navigator.pop(context);
            },
            child: const Text('إنشاء المشروع', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
