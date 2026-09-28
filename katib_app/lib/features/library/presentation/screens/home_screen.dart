import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:file_picker/file_picker.dart';

import '../../../../core/theme/theme_cubit.dart';
import '../../domain/entities/book_entity.dart';
import '../bloc/library_bloc.dart';
import '../../../reader/presentation/screens/pdf_reader_screen.dart';
import '../../../../core/database/database_helper.dart';
import '../../../sync/data/services/auth_service.dart';
import '../../../sync/data/services/cloud_sync_service.dart';
import '../../../sync/presentation/screens/account_and_backup_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  final List<String> _categories = [
    'الكل',
    'نقد وأدب',
    'رواية تاريخية',
    'فكر ودراسات',
    'تقنية وبرمجة',
    'شعر وأدب',
    'مستندات PDF',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.auto_stories_rounded, color: theme.colorScheme.primary),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'كاتب | Katib',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  Text(
                    'منصة صناعة ومكتبة الكتب العربية',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: isDark ? Colors.stone[400] : Colors.stone[600],
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            IconButton.filledTonal(
              icon: const Icon(Icons.cloud_sync_outlined),
              tooltip: 'المزامنة السحابية والحساب',
              onPressed: () async {
                final db = await DatabaseHelper.instance.database;
                final authService = AuthService();
                final syncService = CloudSyncService(localDb: db);
                if (context.mounted) {
                  AccountAndBackupScreen.navigate(
                    context,
                    authService: authService,
                    syncService: syncService,
                  );
                }
              },
            ),
            const SizedBox(width: 8),
            IconButton.filledTonal(
              icon: const Icon(Icons.file_upload_outlined),
              tooltip: 'استيراد كتاب (PDF)',
              onPressed: () {
                context.read<LibraryBloc>().add(ImportPdfBookEvent());
              },
            ),
            const SizedBox(width: 8),
            IconButton.filledTonal(
              icon: Icon(isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded),
              tooltip: isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن',
              onPressed: () {
                context.read<ThemeCubit>().toggleTheme();
              },
            ),
            const SizedBox(width: 16),
          ],
        ),
        body: const Center(
          child: Text(
            'مرحباً بك في تطبيق كاتب',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 24),
          ),
        ),
      ),
    );
  }
}
