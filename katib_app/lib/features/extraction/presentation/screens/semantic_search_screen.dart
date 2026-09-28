import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../domain/entities/extracted_source.dart';
import '../../data/services/semantic_search_service.dart';
import '../widgets/source_selection_dialog.dart';
import '../../../library/domain/entities/book_entity.dart';

/// واجهة محرك البحث الدلالي واستخراج الاقتباسات الموثقة (SemanticSearchScreen)
/// متوافقة بالكامل مع اللغة العربية واتجاه اليمين إلى اليسار (RTL)
class SemanticSearchScreen extends StatefulWidget {
  final List<BookEntity> books;
  final Function(String sourceName, int page, String text)? onInsertToEditor;

  const SemanticSearchScreen({
    super.key,
    required this.books,
    this.onInsertToEditor,
  });

  @override
  State<SemanticSearchScreen> createState() => _SemanticSearchScreenState();
}

class _SemanticSearchScreenState extends State<SemanticSearchScreen> {
  final TextEditingController _queryController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();

  SemanticSearchMode _selectedMode = SemanticSearchMode.passages;
  late Set<String> _selectedBookIds;

  // Processing state
  bool _isSearching = false;
  String _currentStage = '';
  int _lastDurationMs = 0;

  // Results
  final List<SemanticSearchResult> _searchHistory = [];
  SemanticSearchResult? _currentResult;

  // Quick prompt suggestions
  final List<String> _quickSuggestions = [
    'جدلية اللفظ والمعنى في التراث النقدي',
    'هندسة المكان وتطوره في الرواية العربية',
    'أثر النظم والبلاغة عند الجرجاني',
    'أصالة الأسلوب في ظل التحول الرقمي',
    'مفهوم الفصاحة ومطابقة مقتضى الحال',
  ];

  @override
  void initState() {
    super.initState();
    _selectedBookIds = widget.books.map((b) => b.id).toSet();
    SemanticSearchService.instance.initialize();
    _loadInitialSampleResult();
  }

  void _loadInitialSampleResult() {
    if (widget.books.isNotEmpty) {
      final b1 = widget.books.first;
      final b2 = widget.books.length > 1 ? widget.books[1] : b1;

      _currentResult = SemanticSearchResult(
        id: 'initial-1',
        query: 'جدلية اللفظ والمعنى في التراث البلاغي',
        answer: 'استقر الرأي البلاغي الأصيل على أن الألفاظ لا تتفاضل بذواتها المجردة، بل بمقدار خدمتها للمعاني وحسن ائتلافها في سياق النظم التركيبي، وهو ما يجعل النص حياً يتجدد تأويله بحسب سياق الخطاب.',
        sources: [
          ExtractedSource(
            sourceFileName: b1.title,
            pageNumber: 42,
            author: b1.author,
            excerpt: '«الألفاظ خدم للمعاني، والمعاني هي المقصد والغاية في النظم وحسن التأليف والتناسب.»',
            relevanceScore: 98.5,
            chapterTitle: 'فصل في حقيقة النظم',
          ),
          ExtractedSource(
            sourceFileName: b2.title,
            pageNumber: 118,
            author: b2.author,
            excerpt: '«البلاغة مطابقة الكلام لمقتضى الحال مع فصاحته وحسن سبكه وملاءمة مقاصد السامعين.»',
            relevanceScore: 95.0,
            chapterTitle: 'باب الفصاحة والبيان',
          ),
        ],
        overallConfidence: 97.2,
        searchDurationMs: 420,
        timestamp: DateTime.now().subtract(const Duration(minutes: 10)),
      );
    }
  }

  @override
  void dispose() {
    _queryController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  Future<void> _executeSearch([String? customQuery]) async {
    final query = (customQuery ?? _queryController.text).trim();
    if (query.isEmpty || _isSearching) return;

    if (customQuery != null) {
      _queryController.text = customQuery;
    }

    _searchFocusNode.unfocus();

    setState(() {
      _isSearching = true;
      _currentStage = 'مطابقة المفاهيم واستدعاء نموذج Gemini 3.8 Flash...';
    });

    try {
      final result = await SemanticSearchService.instance.search(
        query: query,
        books: widget.books,
        mode: _selectedMode,
        selectedBookIds: _selectedBookIds,
      );

      if (mounted) {
        setState(() {
          _currentResult = result;
          _lastDurationMs = result.searchDurationMs;
          _isSearching = false;
          _currentStage = '';
          _searchHistory.insert(0, result);
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSearching = false;
          _currentStage = '';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('حدث خطأ أثناء البحث الدلالي: $e', style: const TextStyle(fontFamily: 'Cairo')),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _openSourceSelection() async {
    final result = await showDialog<Set<String>>(
      context: context,
      builder: (ctx) => SourceSelectionDialog(
        allBooks: widget.books,
        initialSelectedBookIds: _selectedBookIds,
      ),
    );

    if (result != null) {
      setState(() {
        _selectedBookIds = result;
      });
    }
  }

  void _copyToClipboard(String text, String message) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF059669),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: isDark ? const Color(0xFF0C0A09) : const Color(0xFFFAFAF9),
        body: CustomScrollView(
          slivers: [
            // 1. الشريط العلوي الرصين
            SliverAppBar(
              floating: true,
              pinned: true,
              elevation: 0,
              backgroundColor: isDark ? const Color(0xFF1C1917) : Colors.white,
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD97706).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.auto_awesome_rounded,
                      color: Color(0xFFD97706),
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'محرك البحث الدلالي والاستخراج',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Gemini API • استخراج الاقتباسات وتوثيق أرقام الصفحات',
                        style: TextStyle(
                          fontFamily: 'Tajawal',
                          fontSize: 11,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              actions: [
                // زر فلترة الكتب والمصادر المحددة
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: OutlinedButton.icon(
                    onPressed: _openSourceSelection,
                    icon: const Icon(Icons.library_books_rounded, size: 16, color: Color(0xFFD97706)),
                    label: Text(
                      'المصادر (${_selectedBookIds.length}/${widget.books.length})',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFD97706),
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFFDE68A)),
                      backgroundColor: const Color(0xFFFEF3C7).withOpacity(0.4),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),

            // 2. منطقة البحث وفلاتر الأنماط
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // حقل البحث الدلالي
                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1C1917) : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isDark ? const Color(0xFF292524) : const Color(0xFFE7E5E4),
                          width: 1.2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 14),
                            child: Icon(Icons.search_rounded, color: Color(0xFFD97706), size: 24),
                          ),
                          Expanded(
                            child: TextField(
                              controller: _queryController,
                              focusNode: _searchFocusNode,
                              textInputAction: TextInputAction.search,
                              onSubmitted: (_) => _executeSearch(),
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: const InputDecoration(
                                hintText: 'ابحث في متون الكتب بالمفهوم أو الفكرة أو السؤال المعرفي...',
                                hintStyle: TextStyle(
                                  fontFamily: 'Tajawal',
                                  fontSize: 13,
                                  color: Colors.grey,
                                ),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                          if (_queryController.text.isNotEmpty)
                            IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 18, color: Colors.grey),
                              onPressed: () {
                                _queryController.clear();
                                setState(() {});
                              },
                            ),
                          // زر التنفيذ
                          Padding(
                            padding: const EdgeInsets.all(6.0),
                            child: ElevatedButton(
                              onPressed: _isSearching ? null : () => _executeSearch(),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFD97706),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                              ),
                              child: _isSearching
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                    )
                                  : const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text('استخراج', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13)),
                                        SizedBox(width: 4),
                                        Icon(Icons.arrow_back_rounded, size: 16),
                                      ],
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    // رقاقات أنماط الاستخراج الدلالي (Extraction Modes)
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildModeChip(
                            mode: SemanticSearchMode.passages,
                            label: 'استخراج نصوص واقتباسات',
                            icon: Icons.format_quote_rounded,
                          ),
                          const SizedBox(width: 8),
                          _buildModeChip(
                            mode: SemanticSearchMode.summary,
                            label: 'ملخص فكري مكثف',
                            icon: Icons.auto_stories_rounded,
                          ),
                          const SizedBox(width: 8),
                          _buildModeChip(
                            mode: SemanticSearchMode.qa,
                            label: 'إجابة سؤال استقصائي',
                            icon: Icons.question_answer_rounded,
                          ),
                          const SizedBox(width: 8),
                          _buildModeChip(
                            mode: SemanticSearchMode.definitions,
                            label: 'تعريفات ومفاهيم',
                            icon: Icons.menu_book_rounded,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // اقتراحات بحث جاهزة وسريعة
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          const Text(
                            'اقتراحات سريعة:',
                            style: TextStyle(fontFamily: 'Tajawal', fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 8),
                          ..._quickSuggestions.map(
                            (suggestion) => Padding(
                              padding: const EdgeInsets.only(left: 6),
                              child: ActionChip(
                                label: Text(suggestion),
                                labelStyle: TextStyle(
                                  fontFamily: 'Tajawal',
                                  fontSize: 11,
                                  color: isDark ? const Color(0xFFD6D3D1) : const Color(0xFF44403C),
                                ),
                                backgroundColor: isDark ? const Color(0xFF1C1917) : const Color(0xFFF5F5F4),
                                side: BorderSide(color: isDark ? const Color(0xFF292524) : const Color(0xFFE7E5E4)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                onPressed: () => _executeSearch(suggestion),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // مؤشر التحميل ومرحلة المعالجة الحالية
            if (_isSearching)
              SliverToBoxAdapter(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7).withOpacity(0.5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFF59E0B)),
                  ),
                  child: Row(
                    children: [
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.2, color: Color(0xFFD97706)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _currentStage,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 13,
                            color: Color(0xFF92400E),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // 3. عرض النتائج والمصادر المستخرجة
            if (_currentResult != null) ...[
              // بطاقة الإجابة والتحليل الدلالي
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                  child: _buildAnswerCard(_currentResult!, isDark),
                ),
              ),

              // ترويسة قائمة المصادر المستخرجة بدقة
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Row(
                    children: [
                      const Icon(Icons.bookmark_added_rounded, color: Color(0xFFD97706), size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'المصادر والاقتباسات المستخرجة (${_currentResult!.sources.length})',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      if (_lastDurationMs > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFA7F3D0)),
                          ),
                          child: Text(
                            'زمن الاستجابة: $_lastDurationMs ms',
                            style: const TextStyle(
                              fontFamily: 'Tajawal',
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF065F46),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              // بطاقات المصادر المستخرجة (ExtractedSource Cards)
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final source = _currentResult!.sources[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      child: _buildExtractedSourceCard(source, isDark),
                    );
                  },
                  childCount: _currentResult!.sources.length,
                ),
              ),
            ] else ...[
              // شاشة البداية الفارغة
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.manage_search_rounded, size: 72, color: Colors.grey.withOpacity(0.4)),
                      const SizedBox(height: 12),
                      const Text(
                        'ابدأ بالبحث في متون مكتبتك المعرفية',
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'يدعم المحرك استخراج الاقتباسات الموثقة مع رقم الصفحة واسم المؤلف بدقة',
                        style: TextStyle(fontFamily: 'Tajawal', fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const SliverToBoxAdapter(
              child: SizedBox(height: 40),
            ),
          ],
        ),
      ),
    );
  }

  /// رقاقة اختيار نمط الاستخراج
  Widget _buildModeChip({
    required SemanticSearchMode mode,
    required String label,
    required IconData icon,
  }) {
    final isSelected = _selectedMode == mode;
    return FilterChip(
      selected: isSelected,
      showCheckmark: false,
      avatar: Icon(
        icon,
        size: 16,
        color: isSelected ? Colors.white : const Color(0xFFD97706),
      ),
      label: Text(label),
      labelStyle: TextStyle(
        fontFamily: 'Cairo',
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        color: isSelected ? Colors.white : null,
      ),
      backgroundColor: Colors.transparent,
      selectedColor: const Color(0xFFD97706),
      side: BorderSide(
        color: isSelected ? const Color(0xFFD97706) : Colors.grey.withOpacity(0.3),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      onSelected: (val) {
        if (val) {
          setState(() => _selectedMode = mode);
          if (_queryController.text.isNotEmpty) {
            _executeSearch();
          }
        }
      },
    );
  }

  /// بطاقة الإجابة التحليلية الكلية المستخرجة من Gemini
  Widget _buildAnswerCard(SemanticSearchResult result, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1917) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFF59E0B).withOpacity(0.3),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFD97706).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.auto_awesome, color: Color(0xFFD97706), size: 14),
                    SizedBox(width: 4),
                    Text(
                      'خلاصة الاستقصاء الدلالي',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFD97706),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'المطابقة: %${result.overallConfidence.toStringAsFixed(1)}',
                  style: const TextStyle(
                    fontFamily: 'Tajawal',
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF92400E),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              IconButton(
                icon: const Icon(Icons.copy_rounded, size: 16, color: Colors.grey),
                tooltip: 'نسخ الخلاصة',
                onPressed: () => _copyToClipboard(result.answer, 'تم نسخ الخلاصة التحليلية إلى الحافظة'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            result.answer,
            style: TextStyle(
              fontFamily: 'Tajawal',
              fontSize: 14.5,
              height: 1.7,
              color: isDark ? const Color(0xFFE7E5E4) : const Color(0xFF292524),
            ),
          ),
        ],
      ),
    );
  }

  /// بطاقة المصدر المستخرج (ExtractedSource Card)
  /// تتضمن: (sourceFileName, pageNumber, author, excerpt)
  Widget _buildExtractedSourceCard(ExtractedSource source, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1917) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF292524) : const Color(0xFFE7E5E4),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // شريط معلومات المصدر والصفحة والمؤلف
          Row(
            children: [
              // اسم المستند
              const Icon(Icons.menu_book_rounded, color: Color(0xFFD97706), size: 18),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  source.sourceFileName,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),

              // شارة رقم الصفحة
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.find_in_page_rounded, color: Color(0xFFB45309), size: 13),
                    const SizedBox(width: 3),
                    Text(
                      'ص ${source.pageNumber}',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF78350F),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // نسبة الصلة
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '%${source.relevanceScore.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontFamily: 'Tajawal',
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF047857),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 6),

          // الكاتب والمؤلف
          Row(
            children: [
              const Icon(Icons.person_outline_rounded, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text(
                'المؤلف: ${source.author}',
                style: const TextStyle(
                  fontFamily: 'Tajawal',
                  fontSize: 12,
                  color: Colors.grey,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (source.chapterTitle != null) ...[
                const SizedBox(width: 8),
                const Text('•', style: TextStyle(color: Colors.grey)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    source.chapterTitle!,
                    style: const TextStyle(fontFamily: 'Tajawal', fontSize: 11, color: Colors.grey),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 12),

          // حاوية نص الاقتباس المنسقة
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF292524).withOpacity(0.5) : const Color(0xFFFBFBFA),
              borderRadius: BorderRadius.circular(10),
              border: Border(
                right: const BorderSide(color: Color(0xFFD97706), width: 3.5),
                top: BorderSide(color: isDark ? const Color(0xFF292524) : const Color(0xFFE7E5E4), width: 0.5),
                bottom: BorderSide(color: isDark ? const Color(0xFF292524) : const Color(0xFFE7E5E4), width: 0.5),
                left: BorderSide(color: isDark ? const Color(0xFF292524) : const Color(0xFFE7E5E4), width: 0.5),
              ),
            ),
            child: Text(
              source.excerpt,
              style: TextStyle(
                fontFamily: 'Tajawal',
                fontSize: 14,
                height: 1.65,
                color: isDark ? const Color(0xFFF5F5F4) : const Color(0xFF1C1917),
                fontStyle: FontStyle.italic,
              ),
            ),
          ),

          const SizedBox(height: 12),

          // أزرار الإجراءات
          Row(
            children: [
              // زر نسخ التوثيق الأكاديمي
              TextButton.icon(
                onPressed: () => _copyToClipboard(
                  source.toAcademicCitation(),
                  'تم نسخ التوثيق الأكاديمي المكتمل مع الصفحة والمؤلف',
                ),
                icon: const Icon(Icons.copy_all_rounded, size: 15, color: Color(0xFFD97706)),
                label: const Text(
                  'نسخ التوثيق',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFD97706)),
                ),
                style: TextButton.styleFrom(
                  backgroundColor: const Color(0xFFFEF3C7).withOpacity(0.4),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                ),
              ),

              const SizedBox(width: 8),

              // زر الإدراج في المحرر إن توفر
              if (widget.onInsertToEditor != null)
                TextButton.icon(
                  onPressed: () {
                    widget.onInsertToEditor!(source.sourceFileName, source.pageNumber, source.excerpt);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('تم إدراج الاقتباس في محرر النصوص', style: TextStyle(fontFamily: 'Cairo')),
                        backgroundColor: Color(0xFFD97706),
                      ),
                    );
                  },
                  icon: const Icon(Icons.add_comment_rounded, size: 15, color: Color(0xFF047857)),
                  label: const Text(
                    'إدراج في المتن',
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF047857)),
                  ),
                  style: TextButton.styleFrom(
                    backgroundColor: const Color(0xFFECFDF5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                ),

              const Spacer(),

              // زر المعاينة في قارئ المستندات
              IconButton(
                icon: const Icon(Icons.open_in_new_rounded, size: 18, color: Colors.grey),
                tooltip: 'فتح الكتاب في الصفحة ${source.pageNumber}',
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'الانتقال إلى «${source.sourceFileName}» - الصفحة ${source.pageNumber}...',
                        style: const TextStyle(fontFamily: 'Cairo'),
                      ),
                      duration: const Duration(seconds: 1),
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}
