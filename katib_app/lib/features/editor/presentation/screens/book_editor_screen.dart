import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;
import 'package:provider/provider.dart';
import '../providers/project_editor_provider.dart';
import '../widgets/editor_toolbar_widget.dart';
import '../widgets/chapter_sidebar_widget.dart';
import '../widgets/citation_picker_dialog.dart';
import '../widgets/editor_stats_bar.dart';
import '../widgets/export_dialog.dart';
import '../widgets/style_assistant_bottom_sheet.dart';
import '../../audiobook/domain/entities/audio_track.dart';
import '../../audiobook/data/services/audiobook_service.dart';
import '../../audiobook/presentation/widgets/audiobook_player_bottom_sheet.dart';
import '../../assistant/data/services/in_app_assistant_service.dart';
import '../../assistant/presentation/widgets/floating_assistant_widget.dart';
import 'publishing_studio_screen.dart';
import '../../../library/domain/entities/book_entity.dart';

/// شاشة محرر الكتب والتوثيق المصدري (BookEditorScreen)
/// تدعم التحرير الغني (Rich Text via flutter_quill)، اتجاه RTL، الخطوط العربية،
/// إدراج المراجع كحواشٍ سفلية Footnotes، وإعادة ترتيب الفصول بالسحب والإفلات.
class BookEditorScreen extends StatefulWidget {
  final String bookId;
  final String bookTitle;

  const BookEditorScreen({
    super.key,
    required this.bookId,
    required this.bookTitle,
  });

  @override
  State<BookEditorScreen> createState() => _BookEditorScreenState();
}

class _BookEditorScreenState extends State<BookEditorScreen> {
  late quill.QuillController _quillController;
  final FocusNode _editorFocusNode = FocusNode();
  final ScrollController _editorScrollController = ScrollController();
  
  String _currentFont = 'Tajawal';
  bool _isSidebarVisible = true;
  final InAppAssistantService _inAppAssistantService = InAppAssistantService();

  @override
  void initState() {
    super.initState();
    _initQuill();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<ProjectEditorProvider>();
      provider.openBook(widget.bookId).then((_) {
        _syncQuillFromCurrentChapter();
      });
    });
  }

  void _initQuill() {
    _quillController = quill.QuillController.basic();
    _quillController.addListener(_onEditorContentChanged);
  }

  void _syncQuillFromCurrentChapter() {
    final provider = context.read<ProjectEditorProvider>();
    final currentChapter = provider.currentChapter;

    if (currentChapter != null && currentChapter.contentJson.isNotEmpty) {
      try {
        final docJson = jsonDecode(currentChapter.contentJson);
        final doc = quill.Document.fromJson(docJson);
        setState(() {
          _quillController = quill.QuillController(
            document: doc,
            selection: const TextSelection.collapsed(offset: 0),
          );
          _quillController.addListener(_onEditorContentChanged);
        });
      } catch (_) {
        // في حال كان النص غير مهيأ بعد كـ Delta JSON
        final doc = quill.Document()..insert(0, currentChapter.plainText.isEmpty ? '\n' : '${currentChapter.plainText}\n');
        setState(() {
          _quillController = quill.QuillController(
            document: doc,
            selection: const TextSelection.collapsed(offset: 0),
          );
          _quillController.addListener(_onEditorContentChanged);
        });
      }
    }
  }

  void _onEditorContentChanged() {
    final provider = context.read<ProjectEditorProvider>();
    final plainText = _quillController.document.toPlainText();
    final jsonDelta = jsonEncode(_quillController.document.toDelta().toJson());

    provider.onContentChanged(
      contentJson: jsonDelta,
      plainText: plainText,
    );
  }

  void _toggleArabicFont() {
    setState(() {
      _currentFont = _currentFont == 'Cairo' ? 'Tajawal' : 'Cairo';
    });
  }

  void _openCitationPicker() {
    final provider = context.read<ProjectEditorProvider>();

    showDialog(
      context: context,
      builder: (ctx) => CitationPickerDialog(
        availableCitations: provider.currentCitations,
        onCitationSelected: (footnoteText) {
          _insertFootnoteIntoDocument(footnoteText);
        },
      ),
    );
  }

  /// إدراج المرجع كحاشية سفلية (Footnote) أكاديمية منسقة
  void _insertFootnoteIntoDocument(String footnoteText) {
    final index = _quillController.selection.baseOffset;
    final length = _quillController.document.length;
    final targetIndex = (index < 0 || index > length) ? length - 1 : index;

    // إدراج علامة التوثيق ونص الحاشية السفلية في نهاية المستند
    final footnoteMarker = ' [مرجع] ';
    _quillController.document.insert(targetIndex, footnoteMarker);

    // إضافة التوثيق الكامل في ذيل الفصل
    final docLength = _quillController.document.length;
    final footnoteBlock = '\n\n---\nحاشية توثيقية: $footnoteText\n';
    _quillController.document.insert(docLength - 1, footnoteBlock);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('تم إدراج المرجع الأكاديمي كحاشية سفلية بنجاح', style: TextStyle(fontFamily: 'Cairo')),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _openStyleAssistant() {
    final plainText = _quillController.document.toPlainText();
    final provider = context.read<ProjectEditorProvider>();
    final chapterTitle = provider.currentChapter?.title ?? 'الفصل الحالي';

    StyleAssistantBottomSheet.show(
      context,
      currentText: plainText,
      chapterTitle: chapterTitle,
      onApplySuggestion: (revisedText) {
        // استبدال النص فقط بطلب واعٍ ومباشر من المستخدم عند الضغط على زر الاعتماد
        setState(() {
          final doc = quill.Document()..insert(0, revisedText.endsWith('\n') ? revisedText : '$revisedText\n');
          _quillController = quill.QuillController(
            document: doc,
            selection: const TextSelection.collapsed(offset: 0),
          );
          _quillController.addListener(_onEditorContentChanged);
        });
        _onEditorContentChanged();
      },
    );
  }

  void _openAudiobookPlayer() {
    final plainText = _quillController.document.toPlainText();
    final provider = context.read<ProjectEditorProvider>();
    final currentChapter = provider.currentChapter;
    final chapterTitle = currentChapter?.title ?? 'الفصل الصوتي';
    final chapterId = currentChapter?.id ?? 'chap_default';

    if (plainText.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('لا يوجد نص في الفصل الحالي لتحويله إلى كتاب صوتي.', style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final track = AudioTrack(
      chapterId: chapterId,
      chapterTitle: chapterTitle,
      plainText: plainText,
      duration: AudiobookService.estimateAudioDuration(plainText),
      createdAt: DateTime.now(),
    );

    AudiobookPlayerBottomSheet.show(
      context,
      track: track,
    );
  }

  @override
  void dispose() {
    _quillController.removeListener(_onEditorContentChanged);
    _quillController.dispose();
    _editorFocusNode.dispose();
    _editorScrollController.dispose();
    _inAppAssistantService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ProjectEditorProvider>();
    final currentChapter = provider.currentChapter;
    final plainText = _quillController.document.toPlainText();
    final words = plainText.trim().isEmpty ? 0 : plainText.trim().split(RegExp(r'\s+')).length;
    final chars = plainText.length;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            widget.bookTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.print_outlined),
              tooltip: 'استوديو التصدير والنشر الحي (Publishing Studio)',
              onPressed: () {
                final dummyBook = BookEntity(
                  id: widget.bookId,
                  title: widget.bookTitle,
                  author: 'الكاتب',
                  category: 'أدب وبحث',
                  totalPages: (provider.totalBookWordCount / 250).ceil().clamp(1, 999),
                  currentPage: 1,
                  wordCount: provider.totalBookWordCount,
                  targetWordCount: 50000,
                  status: 'drafting',
                  format: 'project',
                  lastModified: DateTime.now(),
                );

                PublishingStudioScreen.navigate(
                  context,
                  book: dummyBook,
                  chapters: provider.chapters,
                  citations: provider.currentCitations,
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.file_download_outlined),
              tooltip: 'تصدير سريع للكتاب (PDF / Word / ePub3)',
              onPressed: () {
                final dummyBook = BookEntity(
                  id: widget.bookId,
                  title: widget.bookTitle,
                  author: 'الكاتب',
                  category: 'أدب وبحث',
                  totalPages: (provider.totalBookWordCount / 250).ceil().clamp(1, 999),
                  currentPage: 1,
                  wordCount: provider.totalBookWordCount,
                  targetWordCount: 50000,
                  status: 'drafting',
                  format: 'project',
                  lastModified: DateTime.now(),
                );

                ExportDialog.show(
                  context,
                  book: dummyBook,
                  chapters: provider.chapters,
                  citations: provider.currentCitations,
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.auto_awesome),
              tooltip: 'مساعد الأسلوب والمشاعر البلاغية (Gemini)',
              color: Colors.amber.shade700,
              onPressed: _openStyleAssistant,
            ),
            IconButton(
              icon: const Icon(Icons.headphones_rounded),
              tooltip: 'تحويل الفصل إلى كتاب صوتي (Audiobook)',
              color: Colors.amber.shade800,
              onPressed: _openAudiobookPlayer,
            ),
            IconButton(
              icon: Icon(_isSidebarVisible ? Icons.view_sidebar : Icons.view_sidebar_outlined),
              tooltip: 'إظهار/إخفاء الفصول',
              onPressed: () => setState(() => _isSidebarVisible = !_isSidebarVisible),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: Stack(
          children: [
            Column(
              children: [
                // 1. شريط أدوات التنسيق العلوي
                EditorToolbarWidget(
                  controller: _quillController,
                  onOpenCitationPicker: _openCitationPicker,
                  onToggleFont: _toggleArabicFont,
                  currentFont: _currentFont,
                  onOpenStyleAssistant: _openStyleAssistant,
                  onOpenAudiobook: _openAudiobookPlayer,
                ),

                // 2. المحتوى الأساسي: القائمة الجانبية + محرر النصوص
                Expanded(
                  child: Row(
                    children: [
                      // القائمة الجانبية للفصول (Sidebar)
                      if (_isSidebarVisible)
                        ChapterSidebarWidget(
                          chapters: provider.chapters,
                          currentChapter: currentChapter,
                          onSelectChapter: (id) async {
                            await provider.selectChapter(id);
                            _syncQuillFromCurrentChapter();
                          },
                          onAddNewChapter: () async {
                            await provider.addNewChapter();
                            _syncQuillFromCurrentChapter();
                          },
                          onRenameChapter: (id, newTitle) {
                            provider.updateChapterTitle(id, newTitle);
                          },
                          onReorderChapters: (oldIdx, newIdx) {
                            provider.reorderChapters(oldIdx, newIdx);
                          },
                          onDeleteChapter: (id) {
                            provider.deleteChapter(id);
                          },
                        ),

                      // لوحة محرر النصوص Rich Text
                      Expanded(
                        child: Container(
                          color: Theme.of(context).colorScheme.background,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // عنوان الفصل الحالي
                              if (currentChapter != null)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Text(
                                    currentChapter.title,
                                    style: TextStyle(
                                      fontFamily: _currentFont,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 22,
                                    ),
                                  ),
                                ),

                              // محرر Quill Editor
                              Expanded(
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.surface,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: Theme.of(context).dividerColor.withOpacity(0.1),
                                    ),
                                  ),
                                  padding: const EdgeInsets.all(20),
                                  child: quill.QuillEditor.basic(
                                    controller: _quillController,
                                    configurations: quill.QuillEditorConfigurations(
                                      scrollable: true,
                                      autoFocus: false,
                                      expands: true,
                                      padding: EdgeInsets.zero,
                                      customStyles: quill.DefaultStyles(
                                        paragraph: quill.DefaultTextBlockStyle(
                                          TextStyle(
                                            fontFamily: _currentFont,
                                            fontSize: 16,
                                            height: 1.8,
                                            color: Theme.of(context).colorScheme.onSurface,
                                          ),
                                          const quill.HorizontalSpacing(0, 0),
                                          const quill.VerticalSpacing(4, 4),
                                          const quill.VerticalSpacing(0, 0),
                                          null,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // 3. الشريط السفلي للإحصائيات الحية
                EditorStatsBar(
                  wordCount: words,
                  characterCount: chars,
                  isSaving: provider.isSaving,
                  lastSavedAt: provider.lastSavedAt,
                ),
              ],
            ),

            // 4. المساعد التفاعلي العائم داخل المحرر (FloatingAssistantWidget)
            FloatingAssistantWidget(
              projectId: widget.bookId,
              chapterId: currentChapter?.id ?? 'chap_1',
              chapterTitle: currentChapter?.title ?? 'الفصل الحالي',
              currentText: _quillController.document.toPlainText(),
              assistantService: _inAppAssistantService,
              onApplySuggestion: (snippet, {bool replaceSelected = false}) {
                final selection = _quillController.selection;
                if (replaceSelected && !selection.isCollapsed && selection.isValid) {
                  _quillController.replaceText(
                    selection.start,
                    selection.end - selection.start,
                    snippet,
                    null,
                  );
                } else {
                  final insertOffset = selection.isValid && selection.baseOffset >= 0
                      ? selection.baseOffset
                      : _quillController.document.length - 1;
                  _quillController.document.insert(insertOffset, snippet);
                }
                _onEditorContentChanged();
              },
            ),
          ],
        ),
      ),
    );
  }
}
