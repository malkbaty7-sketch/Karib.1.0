import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katib_app/features/editor/domain/entities/citation_model.dart';
import 'package:katib_app/features/editor/presentation/widgets/citation_picker_dialog.dart';
import 'package:katib_app/features/assistant/data/services/in_app_assistant_service.dart';
import 'package:katib_app/features/assistant/presentation/widgets/floating_assistant_widget.dart';
import 'package:katib_app/features/sync/presentation/screens/account_and_backup_screen.dart';
import 'package:katib_app/features/sync/data/services/auth_service.dart';
import 'package:katib_app/features/sync/data/services/cloud_sync_service.dart';

void main() {
  group('اختبارات واجهة محرر النصوص وإدراج الحواشي السفلية (Widget Tests)', () {
    // قائمة مراجع تجريبية لاختبار حوار الحواشي السفلية
    final testCitations = [
      const Citation(
        id: 'cit_1',
        chapterId: 'chap_1',
        sourceFileName: 'كتاب سحر البلاغة',
        pageNumber: 42,
        author: 'أبو منصور الثعالبي',
        excerpt: 'البلاغة مطابقة الكلام لمقتضى الحال مع فصاحته وحسن سبكه.',
      ),
      const Citation(
        id: 'cit_2',
        chapterId: 'chap_1',
        sourceFileName: 'دلائل الإعجاز',
        pageNumber: 118,
        author: 'عبد القاهر الجرجاني',
        excerpt: 'الألفاظ خدم للمعاني، والمعاني هي المقصد والغاية في النظم.',
      ),
    ];

    testWidgets('يجب التحقق من بناء حوار اختيار المراجع وإدراج الحاشية السفلية (CitationPickerDialog)',
        (WidgetTester tester) async {
      String selectedFootnote = '';

      // بناء ويدجت الحوار داخل بيئة اختبار RTL
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => CitationPickerDialog(
                        availableCitations: testCitations,
                        onCitationSelected: (footnoteText) {
                          selectedFootnote = footnoteText;
                        },
                      ),
                    );
                  },
                  child: const Text('فتح حوار الحواشي السفلية'),
                );
              },
            ),
          ),
        ),
      );

      // التأكد من ظهور زر الفتح
      expect(find.text('فتح حوار الحواشي السفلية'), findsOneWidget);

      // النقر لفتح حوار اختيار الحاشية
      await tester.tap(find.text('فتح حوار الحواشي السفلية'));
      await tester.pumpAndSettle();

      // التحقق من ظهور عنوان الحوار وخيارات المراجع
      expect(find.text('إدراج مرجع واقتباس أكاديمي'), findsOneWidget);
      expect(find.textContaining('سحر البلاغة'), findsOneWidget);
      expect(find.textContaining('الثعالبي'), findsOneWidget);
      expect(find.textContaining('دلائل الإعجاز'), findsOneWidget);
      expect(find.textContaining('الجرجاني'), findsOneWidget);

      // التحقق من وجود حقل البحث في المراجع
      expect(find.byType(TextField), findsOneWidget);

      // التحقق من زر الإدراج كحاشية سفلية
      final insertButtons = find.text('إدراج كحاشية سفلية');
      expect(insertButtons, findsNWidgets(2));

      // النقر على إدراج الحاشية الأولى
      await tester.tap(insertButtons.first);
      await tester.pumpAndSettle();

      // التحقق من إرجاع نص الحاشية بصيغة أكاديمية موثقة
      expect(selectedFootnote, contains('الثعالبي'));
      expect(selectedFootnote, contains('42'));
      expect(selectedFootnote, contains('سحر البلاغة'));
    });

    testWidgets('يجب فحص تصفية وبحث المراجع داخل حوار الحواشي السفلية',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CitationPickerDialog(
              availableCitations: testCitations,
              onCitationSelected: (_) {},
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // كتابة كلمة 'الجرجاني' في حقل البحث
      await tester.enterText(find.byType(TextField), 'الجرجاني');
      await tester.pumpAndSettle();

      // يجب أن يظهر مرجع الجرجاني ويختفي مرجع الثعالبي
      expect(find.textContaining('دلائل الإعجاز'), findsOneWidget);
      expect(find.textContaining('سحر البلاغة'), findsNothing);
    });

    testWidgets('يجب محاكاة محرر النصوص والتأكد من إدراج الحاشية في المتن وتحديث العداد',
        (WidgetTester tester) async {
      final textController = TextEditingController(text: 'هذا نص أصلي في بداية الفصل.');
      int footnoteCounter = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(
              appBar: AppBar(
                title: const Text('محرر الكتب - كاتب'),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.format_quote_rounded),
                    tooltip: 'إدراج حاشية',
                    onPressed: () {
                      footnoteCounter++;
                      final footnote = '\n\n[$footnoteCounter] «البلاغة مطابقة الكلام لمقتضى الحال» — الثعالبي، ص 42';
                      textController.text += footnote;
                    },
                  ),
                ],
              ),
              body: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    // شريط الأدوات المصغر
                    Row(
                      children: const [
                        Text('عنوان: الفصل الأول', style: TextStyle(fontWeight: FontWeight.bold)),
                        Spacer(),
                        Icon(Icons.auto_awesome, color: Colors.amber),
                      ],
                    ),
                    const Divider(),
                    // مساحة التحرير
                    Expanded(
                      child: TextField(
                        controller: textController,
                        maxLines: null,
                        decoration: const InputDecoration(
                          hintText: 'اكتب محتوى الفصل هنا...',
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      // التأكد من ظهور النص المبدئي
      expect(find.text('هذا نص أصلي في بداية الفصل.'), findsOneWidget);
      expect(find.byIcon(Icons.format_quote_rounded), findsOneWidget);

      // محاكاة النقر على زر إدراج الحاشية
      await tester.tap(find.byIcon(Icons.format_quote_rounded));
      await tester.pumpAndSettle();

      // التحقق من تحديث المتن ليشمل الحاشية السفلية المنسقة
      expect(textController.text, contains('[1] «البلاغة مطابقة الكلام لمقتضى الحال» — الثعالبي، ص 42'));
      expect(footnoteCounter, equals(1));
    });

    testWidgets('يجب التحقق من ظهور الزر العائم للمساعد FloatingAssistantWidget وفتح اللوحة',
        (WidgetTester tester) async {
      final assistantService = InAppAssistantService();
      String appliedText = '';

      await tester.pumpWidget(
        MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(
              body: Stack(
                children: [
                  const Center(child: Text('محتوى محرر كاتب')),
                  FloatingAssistantWidget(
                    projectId: 'proj_test',
                    chapterId: 'chap_test',
                    chapterTitle: 'الفصل التجريبي',
                    currentText: 'هذا نص تجريبي لاختبار المساعد العائم داخل كاتب.',
                    assistantService: assistantService,
                    onApplySuggestion: (snippet, {bool replaceSelected = false}) {
                      appliedText = snippet;
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // التحقق من وجود ويدجت المساعد العائم
      expect(find.byType(FloatingAssistantWidget), findsOneWidget);
      expect(find.byIcon(Icons.smart_toy_outlined), findsOneWidget);

      // النقر على الزر العائم لفتح لوحة المساعد
      await tester.tap(find.byIcon(Icons.smart_toy_outlined));
      await tester.pumpAndSettle();

      // التأكد من فتح اللوحة وظهور العنوان وتبويبات المساعد
      expect(find.text('مساعد كاتب الذكي'), findsOneWidget);
      expect(find.text('الاقتراحات'), findsOneWidget);
      expect(find.text('المحادثة'), findsOneWidget);
      expect(find.text('أوامر سريعة'), findsOneWidget);
      expect(find.text('الثيمات'), findsOneWidget);
    });
  });

  group('اختبارات واجهة إدارة الحساب والنسخ الاحتياطي والمزامنة (AccountAndBackupScreen Tests)', () {
    testWidgets('يجب التحقق من بناء شاشة الحساب وعناصر المزامنة والنسخ الاحتياطي',
        (WidgetTester tester) async {
      final authService = AuthService();
      final syncService = CloudSyncService();

      await tester.pumpWidget(
        MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(
              body: AccountAndBackupScreen(
                authService: authService,
                syncService: syncService,
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // التحقق من ظهور عنوان الشاشة
      expect(find.text('إدارة الحساب والمزامنة السحابية'), findsOneWidget);

      // التحقق من ظهور أزرار وإعدادات المزامنة والنسخ
      expect(find.text('المزامنة السحابية الفورية'), findsOneWidget);
      expect(find.text('تصدير نسخة احتياطية مشفرة (.katib)'), findsOneWidget);
      expect(find.text('استعادة من نسخة احتياطية مشفرة'), findsOneWidget);
      expect(find.text('المزامنة التلقائية عند وجود اتصال'), findsOneWidget);
    });
  });
}

