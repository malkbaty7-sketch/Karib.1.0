import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:share_plus/share_plus.dart';
import '../../domain/entities/sync_metadata.dart';
import '../../domain/entities/chapter_backup.dart';
import '../../data/services/auth_service.dart';
import '../../data/services/cloud_sync_service.dart';

/// واجهة إدارة الحساب والنسخ الاحتياطي AccountAndBackupScreen
/// تتضمن:
/// 1. بطاقة ملف المستخدم وتوثيق الدخول عبر firebase_auth.
/// 2. لوحة المزامنة اليدوية (Sync Now) مع مؤشر تقدم مئوي.
/// 3. تصدير واستعادة النسخ الاحتياطية المشفرة (.katib).
/// 4. سجل نسخ التعارضات الاحتياطية (Conflict Backups History) مع إمكانية استرجاع أي مسودة.
/// 5. خيارات الخصوصية والأمان ومسح الذاكرة المؤقتة.
class AccountAndBackupScreen extends StatefulWidget {
  final AuthService authService;
  final CloudSyncService syncService;
  final VoidCallback? onBack;

  const AccountAndBackupScreen({
    super.key,
    required this.authService,
    required this.syncService,
    this.onBack,
  });

  /// فتح الشاشة في مسار جديد
  static Future<void> navigate(
    BuildContext context, {
    required AuthService authService,
    required CloudSyncService syncService,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AccountAndBackupScreen(
          authService: authService,
          syncService: syncService,
        ),
      ),
    );
  }

  @override
  State<AccountAndBackupScreen> createState() => _AccountAndBackupScreenState();
}

enum SyncStatusState { synced, unsynced, syncing }

class _AccountAndBackupScreenState extends State<AccountAndBackupScreen> {
  // حالة المزامنة والتقدم
  SyncStatusState _syncStatus = SyncStatusState.unsynced;
  double _syncProgress = 0.0;
  bool _isSyncing = false;
  String _syncMessage = 'جاهز لبدء المزامنة';
  DateTime? _lastSyncTime;

  // خيارات الخصوصية والأمان
  bool _autoSyncEnabled = true;
  bool _syncOverWifiOnly = false;
  bool _encryptLocalBackups = true;

  // إحصائيات البيانات المحلية
  int _localBooksCount = 0;
  int _localChaptersCount = 0;
  int _localCitationsCount = 0;
  int _conflictBackupsCount = 0;
  int _pendingChangesCount = 0;

  @override
  void initState() {
    super.initState();
    _loadLocalStats();
    _checkInitialStatus();
  }

  Future<void> _loadLocalStats() async {
    try {
      final stats = await widget.syncService.getLocalStats();
      final pending = await widget.syncService.getPendingChangesCount();
      if (mounted) {
        setState(() {
          _localBooksCount = stats['books'] ?? 0;
          _localChaptersCount = stats['chapters'] ?? 0;
          _localCitationsCount = stats['citations'] ?? 0;
          _conflictBackupsCount = stats['backups'] ?? 0;
          _pendingChangesCount = pending;
          if (pending > 0) {
            _syncStatus = SyncStatusState.unsynced;
            _syncMessage = 'يوجد $pending تعديل محلي بانتظار المزامنة السحابية';
          } else {
            _syncStatus = SyncStatusState.synced;
            _syncMessage = 'كافة الأعمال متزامنة ومحفوظة سحابياً';
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _checkInitialStatus() async {
    final isOnline = await widget.syncService.checkInternetConnection();
    if (!isOnline && mounted) {
      setState(() {
        _syncMessage = 'وضع عدم الاتصال: كافة التعديلات محفوظة محلياً أولاً';
      });
    }
  }

  /// زر 'المزامنة الآن' (Sync Now) يدوياً مع إظهار مؤشر تقدم مئوي وحل التعارضات
  Future<void> _performSyncNow() async {
    if (_isSyncing) return;

    setState(() {
      _isSyncing = true;
      _syncStatus = SyncStatusState.syncing;
      _syncProgress = 0.15;
      _syncMessage = 'جارٍ التحقق من الاتصال بالجلسة السحابية...';
    });

    try {
      final user = widget.authService.currentUser;
      final userId = user?.uid ?? 'guest_author_local';

      await Future.delayed(const Duration(milliseconds: 350));
      setState(() {
        _syncProgress = 0.45;
        _syncMessage = 'حصر الكتب والفصول المعلقة (isSynced = 0)...';
      });

      await Future.delayed(const Duration(milliseconds: 400));
      setState(() {
        _syncProgress = 0.75;
        _syncMessage = 'رفع التعديلات للسحابة مع فحص ومقارنة lastModified...';
      });

      final result = await widget.syncService.syncPendingChanges(userId: userId);

      await Future.delayed(const Duration(milliseconds: 300));
      await _loadLocalStats();

      setState(() {
        _syncProgress = 1.0;
        _isSyncing = false;
        _lastSyncTime = DateTime.now();
        _syncStatus = result.success ? SyncStatusState.synced : SyncStatusState.unsynced;
        _syncMessage = result.message;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.message, style: const TextStyle(fontFamily: 'Cairo')),
            backgroundColor: result.success ? const Color(0xFF059669) : Colors.red.shade800,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isSyncing = false;
        _syncStatus = SyncStatusState.unsynced;
        _syncMessage = 'فشلت المزامنة: $e';
      });
    }
  }

  /// نافذة تسجيل الدخول أو إنشاء حساب جديد
  void _openAuthDialog() {
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    bool isRegisterMode = false;
    bool authLoading = false;
    String? errorMessage;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                Icon(isRegisterMode ? Icons.person_add_rounded : Icons.login_rounded, color: const Color(0xFFD97706)),
                const SizedBox(width: 10),
                Text(
                  isRegisterMode ? 'إنشاء حساب كاتب سحابي' : 'تسجيل الدخول إلى حسابك',
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ],
            ),
            content: SizedBox(
              width: 380,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(10),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Text(
                        errorMessage!,
                        style: TextStyle(fontFamily: 'Tajawal', fontSize: 11, color: Colors.red.shade900),
                      ),
                    ),
                  ],
                  TextField(
                    controller: emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: 'البريد الإلكتروني',
                      prefixIcon: const Icon(Icons.email_outlined),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'كلمة المرور',
                      prefixIcon: const Icon(Icons.lock_outline),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (authLoading)
                    const CircularProgressIndicator(color: Color(0xFFD97706))
                  else
                    Column(
                      children: [
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFD97706),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () async {
                              final email = emailController.text.trim();
                              final pass = passwordController.text;
                              if (email.isEmpty || pass.length < 6) {
                                setDialogState(() => errorMessage = 'يرجى إدخال بريد صالح وكلمة مرور من 6 خانات على الأقل');
                                return;
                              }
                              setDialogState(() {
                                authLoading = true;
                                errorMessage = null;
                              });

                              try {
                                if (isRegisterMode) {
                                  await widget.authService.createUserWithEmailAndPassword(email: email, password: pass);
                                } else {
                                  await widget.authService.signInWithEmailAndPassword(email: email, password: pass);
                                }
                                if (ctx.mounted) Navigator.pop(ctx);
                                setState(() {});
                                _performSyncNow();
                              } catch (e) {
                                setDialogState(() {
                                  authLoading = false;
                                  errorMessage = 'فشلت العملية: $e';
                                });
                              }
                            },
                            child: Text(
                              isRegisterMode ? 'إنشاء الحساب ومزامنة الأعمال' : 'تسجيل الدخول',
                              style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        // زر Google
                        SizedBox(
                          width: double.infinity,
                          height: 42,
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.g_mobiledata, size: 24, color: Color(0xFFD97706)),
                            label: const Text('تسجيل الدخول بـ Google', style: TextStyle(fontFamily: 'Cairo')),
                            onPressed: () async {
                              setDialogState(() {
                                authLoading = true;
                                errorMessage = null;
                              });
                              try {
                                await widget.authService.signInWithGoogle();
                                if (ctx.mounted) Navigator.pop(ctx);
                                setState(() {});
                                _performSyncNow();
                              } catch (e) {
                                setDialogState(() {
                                  authLoading = false;
                                  errorMessage = 'خطأ أثناء تسجيل الدخول بـ Google: $e';
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => setDialogState(() {
                            isRegisterMode = !isRegisterMode;
                            errorMessage = null;
                          }),
                          child: Text(
                            isRegisterMode ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساباً جديداً',
                            style: const TextStyle(fontFamily: 'Tajawal', fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// زر 'تصدير نسخة احتياطية مشفرة (.katib)' مع تعيين كلمة سر للحماية
  void _createEncryptedBackup() {
    final passwordController = TextEditingController();
    bool usePassword = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Row(
              children: [
                Icon(Icons.enhanced_encryption_rounded, color: Color(0xFFD97706)),
                SizedBox(width: 8),
                Text('تصدير نسخة احتياطية مشفرة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            content: SizedBox(
              width: 360,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'سيتم ضغط وتشفير كافة أعمالك ومصادرك وفصولك بملف (.katib) آمن ومحمي.',
                    style: TextStyle(fontFamily: 'Tajawal', fontSize: 12),
                  ),
                  const SizedBox(height: 14),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('تعيين كلمة سر مخصصة للتشفير', style: TextStyle(fontFamily: 'Cairo', fontSize: 12)),
                    value: usePassword,
                    activeColor: const Color(0xFFD97706),
                    onChanged: (val) => setDialogState(() => usePassword = val ?? false),
                  ),
                  if (usePassword) ...[
                    const SizedBox(height: 6),
                    TextField(
                      controller: passwordController,
                      obscureText: true,
                      decoration: InputDecoration(
                        labelText: 'كلمة سر التشفير',
                        hintText: 'أدخل كلمة سر قوية للاستعادة',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo'))),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706), foregroundColor: Colors.white),
                icon: const Icon(Icons.download, size: 16),
                label: const Text('توليد الحزمة المشفرة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                onPressed: () async {
                  Navigator.pop(ctx);
                  final pass = usePassword ? passwordController.text.trim() : null;
                  _processExportBackup(pass);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _processExportBackup(String? password) async {
    try {
      final filePath = await widget.syncService.exportEncryptedBackup(password: password);
      await _loadLocalStats();

      if (!mounted) return;

      showDialog(
        context: context,
        builder: (ctx) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Color(0xFF059669)),
                SizedBox(width: 8),
                Text('اكتمل توليد النسخة بنجاح', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('تم حفظ وتشفير النسخة الاحتياطية بنجاح في المسار:'),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
                  child: SelectableText(filePath, style: const TextStyle(fontSize: 10, fontFamily: 'monospace')),
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إغلاق', style: TextStyle(fontFamily: 'Cairo'))),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706), foregroundColor: Colors.white),
                icon: const Icon(Icons.share, size: 16),
                label: const Text('مشاركة / حفظ الملف', style: TextStyle(fontFamily: 'Cairo')),
                onPressed: () async {
                  Navigator.pop(ctx);
                  await Share.shareXFiles([XFile(filePath)], text: 'نسخة احتياطية مشفرة لكتب منصة كاتب');
                },
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('فشل تصدير النسخة المشفرة: $e', style: const TextStyle(fontFamily: 'Cairo'))),
      );
    }
  }

  /// زر 'استعادة من نسخة احتياطية مشفرة'
  Future<void> _restoreFromBackupArchive() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.any,
      );

      if (result != null && result.files.isNotEmpty && result.files.first.path != null) {
        final filePath = result.files.first.path!;
        _promptForRestorePassword(filePath);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('خطأ أثناء اختيار الملف: $e', style: const TextStyle(fontFamily: 'Cairo'))),
      );
    }
  }

  void _promptForRestorePassword(String filePath) {
    final passwordController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('استعادة النسخة المشفرة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'إذا كانت النسخة محمية بكلمة سر مخصصة أدخلها أدناه، أو اترك الحقل فارغاً للمفتاح الافتراضي.',
                style: TextStyle(fontFamily: 'Tajawal', fontSize: 12),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'كلمة سر فك التشفير (اختياري)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo'))),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706), foregroundColor: Colors.white),
              onPressed: () async {
                Navigator.pop(ctx);
                final pass = passwordController.text.trim();
                try {
                  final count = await widget.syncService.restoreEncryptedBackup(
                    filePath: filePath,
                    password: pass.isNotEmpty ? pass : null,
                  );
                  await _loadLocalStats();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('اكتملت الاستعادة بنجاح: تم دمج $count عنصراً في المكتبة.', style: const TextStyle(fontFamily: 'Cairo')),
                        backgroundColor: const Color(0xFF059669),
                      ),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('فشلت الاستعادة: تأكد من كلمة السر وصلاحية الملف ($e)', style: const TextStyle(fontFamily: 'Cairo')),
                        backgroundColor: Colors.red.shade800,
                      ),
                    );
                  }
                }
              },
              child: const Text('فك التشفير والاستعادة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  /// فتح سجل نسخ التعارضات السابقة (Conflict Backups History)
  void _openConflictBackupsSheet() async {
    final backups = await widget.syncService.getAllConflictBackups();

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: Container(
          height: MediaQuery.of(context).size.height * 0.75,
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade400, borderRadius: BorderRadius.circular(10)),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                child: Row(
                  children: [
                    const Icon(Icons.history_toggle_off_rounded, color: Color(0xFFD97706)),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'سجل نسخ التعارضات المحفوظة تلقائياً',
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: backups.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.shield_outlined, size: 48, color: Colors.green.shade400),
                            const SizedBox(height: 12),
                            const Text('لا توجد أي تعارضات سابقة، مكتبتك متزامنة تماماً!', style: TextStyle(fontFamily: 'Cairo', fontSize: 13)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: backups.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final b = backups[index];
                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.amber.shade50.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: Colors.amber.shade200),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      b.chapterTitle.isNotEmpty ? b.chapterTitle : 'فصل غير مسمى',
                                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    Text(
                                      '${b.timestamp.year}/${b.timestamp.month}/${b.timestamp.day} ${b.timestamp.hour}:${b.timestamp.minute}',
                                      style: TextStyle(fontFamily: 'Tajawal', fontSize: 11, color: Colors.grey.shade600),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(b.reason, style: TextStyle(fontFamily: 'Tajawal', fontSize: 11, color: Colors.amber.shade900)),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                                  child: Text(
                                    b.content.length > 120 ? '${b.content.substring(0, 120)}...' : b.content,
                                    style: const TextStyle(fontFamily: 'Tajawal', fontSize: 11, height: 1.6),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: TextButton.icon(
                                    icon: const Icon(Icons.restore_page_outlined, size: 16),
                                    label: const Text('استعادة هذه النسخة في المحرر', style: TextStyle(fontFamily: 'Cairo', fontSize: 11)),
                                    onPressed: () async {
                                      await widget.syncService.restoreBackupVersion(backupId: b.id);
                                      if (ctx.mounted) Navigator.pop(ctx);
                                      _loadLocalStats();
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('تمت استعادة المسودة بنجاح وجعلها مسودة حالية', style: TextStyle(fontFamily: 'Cairo'))),
                                        );
                                      }
                                    },
                                  ),
                                ),
                              ],
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

  /// تسجيل الخروج ومسح البيانات المحلية
  void _confirmSignOutAndClearData() {
    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.red),
              SizedBox(width: 8),
              Text('تسجيل الخروج وحذف البيانات المحلية', style: TextStyle(fontFamily: 'Cairo', fontSize: 15, fontWeight: FontWeight.bold)),
            ],
          ),
          content: const Text(
            'تحذير: سيتم تسجيل الخروج ومسح قواعد البيانات المحلية المؤقتة (sqflite) من هذا الجهاز. التعديلات غير المزامنة قد تفقد إذا لم تضغط على "المزامنة الآن" أولاً.',
            style: TextStyle(fontFamily: 'Tajawal', fontSize: 12),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo'))),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade700, foregroundColor: Colors.white),
              onPressed: () async {
                Navigator.pop(ctx);
                await widget.syncService.clearLocalData();
                await widget.authService.signOut();
                await _loadLocalStats();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تم تسجيل الخروج ومسح الذاكرة المحلية المؤقتة بنجاح', style: TextStyle(fontFamily: 'Cairo'))),
                  );
                  setState(() {});
                }
              },
              child: const Text('تأكيد الخروج والمسح', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final user = widget.authService.currentUser;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: isDark ? const Color(0xFF141210) : const Color(0xFFFAF9F6),
        appBar: AppBar(
          backgroundColor: isDark ? const Color(0xFF1C1917) : Colors.white,
          elevation: 0.5,
          title: const Text('إدارة الحساب والمزامنة السحابية', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
          leading: widget.onBack != null
              ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: widget.onBack)
              : null,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              tooltip: 'تحديث الحالة',
              onPressed: _loadLocalStats,
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            // 1. بطاقة ملف المستخدم (User Profile Card)
            _buildUserProfileCard(isDark, user),
            const SizedBox(height: 18),

            // 2. بطاقة المزامنة الفورية مع مؤشر التقدم
            _buildSyncControlCard(isDark),
            const SizedBox(height: 20),

            // 3. إحصائيات البيانات ومحرك Offline-First
            _buildLocalStatsOverview(isDark),
            const SizedBox(height: 20),

            // 4. قسم النسخ الاحتياطي المشفر والاستعادة (.katib)
            _buildEncryptedBackupSection(isDark),
            const SizedBox(height: 20),

            // 5. سجل نسخ التعارضات السابقة (Conflict Resolution)
            _buildConflictHistoryTile(isDark),
            const SizedBox(height: 20),

            // 6. خيارات الخصوصية والأمان
            _buildPrivacyAndSecuritySection(isDark),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildUserProfileCard(bool isDark, dynamic user) {
    final isLoggedIn = user != null;

    Color statusColor;
    String statusText;
    IconData statusIcon;

    switch (_syncStatus) {
      case SyncStatusState.synced:
        statusColor = const Color(0xFF059669);
        statusText = 'متزامن مع السحابة ✓';
        statusIcon = Icons.cloud_done_rounded;
        break;
      case SyncStatusState.syncing:
        statusColor = const Color(0xFF2563EB);
        statusText = 'جارٍ المزامنة (${(_syncProgress * 100).toInt()}%)...';
        statusIcon = Icons.sync_rounded;
        break;
      case SyncStatusState.unsynced:
        statusColor = const Color(0xFFD97706);
        statusText = 'غير متزامن ($_pendingChangesCount معلق)';
        statusIcon = Icons.cloud_queue_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1917) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: const Color(0xFFD97706),
                child: Icon(isLoggedIn ? Icons.person_rounded : Icons.person_outline_rounded, size: 30, color: Colors.white),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isLoggedIn ? (user.displayName ?? 'مؤلف كاتب') : 'وضع الكاتب الضيف (Offline-First)',
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      isLoggedIn ? user.email : 'تسجيل الدخول يتيح مزامنة كتبك عبر أجهزتك المختلفة',
                      style: TextStyle(
                        fontFamily: isLoggedIn ? 'monospace' : 'Tajawal',
                        fontSize: 11,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              if (!isLoggedIn)
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD97706),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.login_rounded, size: 16),
                  label: const Text('تسجيل الدخول', style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: _openAuthDialog,
                ),
            ],
          ),
          const Divider(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('حالة المزامنة السحابية:', style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: statusColor.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, size: 14, color: statusColor),
                    const SizedBox(width: 6),
                    Text(
                      statusText,
                      style: TextStyle(fontFamily: 'Cairo', color: statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSyncControlCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7).withOpacity(isDark ? 0.08 : 0.4),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFD97706).withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.sync_alt_rounded, color: Color(0xFFD97706), size: 20),
              const SizedBox(width: 8),
              const Text('المزامنة اليدوية والتلقائية', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 14)),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: _isSyncing ? null : _performSyncNow,
                icon: _isSyncing
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.cloud_upload_rounded, size: 16),
                label: const Text('المزامنة الآن (Sync Now)', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD97706),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(_syncMessage, style: TextStyle(fontFamily: 'Tajawal', fontSize: 12, color: isDark ? Colors.grey.shade300 : Colors.grey.shade800)),
          if (_lastSyncTime != null) ...[
            const SizedBox(height: 4),
            Text(
              'آخر مزامنة ناجحة: ${_lastSyncTime!.hour}:${_lastSyncTime!.minute.toString().padLeft(2, '0')}',
              style: TextStyle(fontFamily: 'Tajawal', fontSize: 10, color: Colors.grey.shade600),
            ),
          ],
          if (_isSyncing) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: _syncProgress,
                      backgroundColor: Colors.grey.shade300,
                      color: const Color(0xFFD97706),
                      minHeight: 6,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  '${(_syncProgress * 100).toInt()}%',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, fontFamily: 'monospace'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLocalStatsOverview(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1917) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.storage_rounded, size: 18, color: Colors.amber.shade800),
              const SizedBox(width: 8),
              const Text('حالة السجلات المحلية (Offline-First SQLite)', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildStatChip('الكتب', '$_localBooksCount', Icons.menu_book),
              const SizedBox(width: 8),
              _buildStatChip('الفصول', '$_localChaptersCount', Icons.article),
              const SizedBox(width: 8),
              _buildStatChip('المراجع', '$_localCitationsCount', Icons.format_quote),
              const SizedBox(width: 8),
              _buildStatChip('المعلقة', '$_pendingChangesCount', Icons.pending_actions, isPending: _pendingChangesCount > 0),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatChip(String title, String val, IconData icon, {bool isPending = false}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        decoration: BoxDecoration(
          color: isPending ? Colors.orange.shade50 : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isPending ? Colors.orange.shade300 : Colors.grey.shade200),
        ),
        child: Column(
          children: [
            Icon(icon, size: 16, color: isPending ? Colors.orange.shade800 : Colors.grey.shade700),
            const SizedBox(height: 4),
            Text(val, style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13, color: isPending ? Colors.orange.shade900 : null)),
            Text(title, style: TextStyle(fontFamily: 'Tajawal', fontSize: 10, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }

  Widget _buildEncryptedBackupSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.enhanced_encryption_rounded, size: 18, color: Colors.amber.shade800),
            const SizedBox(width: 8),
            const Text('النسخ الاحتياطي المشفر والاستعادة (.katib)', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 14)),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1917) : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
          ),
          child: Column(
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.archive_rounded, color: Color(0xFFD97706)),
                ),
                title: const Text('تصدير حزمة مشفرة (.katib)', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('تصدير كافة مشاريعك وفصولك ومراجعك بملف مشفر ومحمي.', style: TextStyle(fontFamily: 'Tajawal', fontSize: 11)),
                trailing: ElevatedButton(
                  onPressed: _createEncryptedBackup,
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706), foregroundColor: Colors.white),
                  child: const Text('تصدير', style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
              const Divider(height: 18),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.unarchive_rounded, color: Color(0xFF059669)),
                ),
                title: const Text('استعادة من حزمة مشفرة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('فك تشفير واسترجاع مسوداتك ومكتبتك من ملف .katib محلي.', style: TextStyle(fontFamily: 'Tajawal', fontSize: 11)),
                trailing: OutlinedButton(
                  onPressed: _restoreFromBackupArchive,
                  child: const Text('استعادة', style: TextStyle(fontFamily: 'Cairo', fontSize: 12)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildConflictHistoryTile(bool isDark) {
    return InkWell(
      onTap: _openConflictBackupsSheet,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1C1917) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.history_toggle_off_rounded, color: Colors.blue.shade800),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('سجل نسخ التعارضات السابقة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(
                    '$_conflictBackupsCount نسخة احتياطية محفوظة لحماية نصوصك من الضياع',
                    style: TextStyle(fontFamily: 'Tajawal', fontSize: 11, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildPrivacyAndSecuritySection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.security_rounded, size: 18, color: Colors.amber.shade800),
            const SizedBox(width: 8),
            const Text('خيارات الخصوصية والأمان', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 14)),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1917) : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
          ),
          child: Column(
            children: [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: const Color(0xFFD97706),
                title: const Text('المزامنة السحابية التلقائية', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('رفع وتحديث التعديلات فور الاتصال بالإنترنت في الخلفية.', style: TextStyle(fontFamily: 'Tajawal', fontSize: 11)),
                value: _autoSyncEnabled,
                onChanged: (val) => setState(() => _autoSyncEnabled = val),
              ),
              const Divider(height: 16),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: const Color(0xFFD97706),
                title: const Text('المزامنة عبر Wi-Fi فقط', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('توفير باقة بيانات الجوال عند نقل الملفات والمصادر.', style: TextStyle(fontFamily: 'Tajawal', fontSize: 11)),
                value: _syncOverWifiOnly,
                onChanged: (val) => setState(() => _syncOverWifiOnly = val),
              ),
              const Divider(height: 20),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.logout_rounded, color: Colors.red),
                  label: const Text('تسجيل الخروج وحذف البيانات المحلية', style: TextStyle(fontFamily: 'Cairo', color: Colors.red, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _confirmSignOutAndClearData,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
