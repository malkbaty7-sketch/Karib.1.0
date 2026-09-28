import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../domain/entities/emotion_profile_model.dart';
import '../../domain/entities/style_analysis_result.dart';
import '../../data/services/style_analysis_service.dart';

/// أنماط عرض مقارنة النصوص
enum DiffViewMode {
  sideBySide, // جنباً إلى جنب في عمودين
  inlineDiff,  // فروقات مدمجة ملونة
}

/// بطاقة شريحة المشاعر التفاعلية
class _EmotionItem {
  final String name;
  final String description;
  final IconData icon;

  const _EmotionItem({
    required this.name,
    required this.description,
    required this.icon,
  });
}

/// واجهة مساعد الأسلوب والمشاعر البلاغية (StyleAssistantBottomSheet)
/// تتيح اختيار المشاعر عبر Chips وتعديل الكثافة،
/// والاتصال بـ Gemini API لتحليل النص بلاغياً وإرجاع اقتراحات ونص مقترح
/// دون استبدال النص الأصلي تلقائياً، مع شاشة مقارنة جنباً إلى جنب (Diff View).
class StyleAssistantBottomSheet extends StatefulWidget {
  final String currentText;
  final String chapterTitle;
  final ValueChanged<String>? onApplySuggestion;

  const StyleAssistantBottomSheet({
    super.key,
    required this.currentText,
    this.chapterTitle = 'الفصل الحالي',
    this.onApplySuggestion,
  });

  /// فتح الواجهة كنافذة منبثقة سفلية متجاوبة
  static Future<void> show(
    BuildContext context, {
    required String currentText,
    String chapterTitle = 'الفصل الحالي',
    ValueChanged<String>? onApplySuggestion,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StyleAssistantBottomSheet(
        currentText: currentText,
        chapterTitle: chapterTitle,
        onApplySuggestion: onApplySuggestion,
      ),
    );
  }

  @override
  State<StyleAssistantBottomSheet> createState() => _StyleAssistantBottomSheetState();
}

class _StyleAssistantBottomSheetState extends State<StyleAssistantBottomSheet> {
  // المشاعر المتاحة للبلاغة العربية
  static const List<_EmotionItem> _availableEmotions = [
    _EmotionItem(name: 'غموض', description: 'تشويق وحذف وإيحاء موارب', icon: Icons.visibility_off_outlined),
    _EmotionItem(name: 'حماس', description: 'اندفاع وحيوية وأفعال متتابعة', icon: Icons.local_fire_department_outlined),
    _EmotionItem(name: 'دفء', description: 'ألفة وطمأنينة وحميمية', icon: Icons.favorite_border_rounded),
    _EmotionItem(name: 'أكاديمي', description: 'رصانة واستدلال وبرهان', icon: Icons.school_outlined),
    _EmotionItem(name: 'إلهام', description: 'أمل وتفاؤل وبلاغة وجدانية', icon: Icons.lightbulb_outline_rounded),
    _EmotionItem(name: 'تشويق', description: 'تسارع وتيرة وتأجيل الإفصاح', icon: Icons.flash_on_outlined),
    _EmotionItem(name: 'هدوء', description: 'سكينة وتوازن في الفواصل', icon: Icons.spa_outlined),
    _EmotionItem(name: 'بلاغة رصينة', description: 'فصاحة لغوية وتناغم بديعي', icon: Icons.auto_stories_outlined),
    _EmotionItem(name: 'حزن شجي', description: 'عمق وجداني واستحضار الفقد', icon: Icons.water_drop_outlined),
    _EmotionItem(name: 'سخرية مبطنة', description: 'تهكم ذكي وتلميح رمزي', icon: Icons.mood_bad_outlined),
  ];

  // الحالة التفاعلية
  final Set<String> _selectedEmotions = {'غموض', 'حماس'};
  double _intensityLevel = 3.5;
  bool _isLoading = false;
  String _loadingMessage = 'جارٍ الاتصال بمحرك البلاغة الذكي...';
  StyleAnalysisResult? _analysisResult;
  DiffViewMode _diffMode = DiffViewMode.sideBySide;
  bool _isCopied = false;

  void _toggleEmotion(String emotion) {
    setState(() {
      if (_selectedEmotions.contains(emotion)) {
        if (_selectedEmotions.length > 1) {
          _selectedEmotions.remove(emotion);
        }
      } else {
        _selectedEmotions.add(emotion);
      }
    });
  }

  Future<void> _runStyleAnalysis() async {
    if (widget.currentText.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('لا يوجد نص في المحرر لتحليله، اكتب فقرة أولاً.', style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _loadingMessage = 'جارٍ فحص التراكيب المعجمية والبلاغية مع Gemini...';
    });

    final profile = EmotionProfile(
      selectedEmotions: _selectedEmotions.toList(),
      intensityLevel: _intensityLevel,
    );

    try {
      final result = await StyleAnalysisService.instance.analyzeAndImproveStyle(
        text: widget.currentText,
        emotionProfile: profile,
      );

      if (mounted) {
        setState(() {
          _analysisResult = result;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('حدث خطأ أثناء تحليل الأسلوب: $e', style: const TextStyle(fontFamily: 'Cairo')),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    setState(() => _isCopied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _isCopied = false);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('تم نسخ النص المقترح إلى الحافظة بنجاح', style: TextStyle(fontFamily: 'Cairo')),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _applyRevisedText(String revisedText) {
    if (widget.onApplySuggestion != null) {
      widget.onApplySuggestion!(revisedText);
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تم اعتماد وتطبيق الصياغة المقترحة في المحرر بنجاح', style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final screenHeight = MediaQuery.of(context).size.height;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        height: screenHeight * 0.90,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.25),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          children: [
            // مقبض السحب العلوي
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 48,
                height: 5,
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),

            // ترويسة الواجهة
            _buildHeader(theme, isDark),

            const Divider(height: 1),

            // المحتوى القابل للتمرير
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(18),
                children: [
                  // 1. قسم اختيار المشاعر (رقائق Chips)
                  _buildEmotionsSelector(theme, isDark),

                  const SizedBox(height: 18),

                  // 2. شريط الكثافة الانفعالية (Intensity Slider)
                  _buildIntensitySlider(theme, isDark),

                  const SizedBox(height: 18),

                  // 3. زر التحليل البلاغي
                  _buildAnalyzeButton(theme),

                  // 4. حالة التحميل والانتظار
                  if (_isLoading) _buildLoadingState(theme),

                  // 5. قسم النتائج وشاشة المقارنة (Diff View)
                  if (!_isLoading && _analysisResult != null) ...[
                    const SizedBox(height: 24),
                    _buildResultsSection(theme, isDark),
                  ],
                ],
              ),
            ),

            // شريط الإجراءات السفلي (عند توفر نتيجة التحليل)
            if (_analysisResult != null && !_isLoading)
              _buildBottomActionsBar(theme, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.amber.shade500.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.auto_awesome, color: Colors.amber.shade800, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'مساعد الأسلوب والمشاعر البلاغية',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  'تحليل بلاغي مدعوم بـ Gemini دون استبدال النص الأصلي تلقائياً',
                  style: TextStyle(
                    fontFamily: 'Tajawal',
                    fontSize: 11,
                    color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close),
            tooltip: 'إغلاق',
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }

  Widget _buildEmotionsSelector(ThemeData theme, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.palette_outlined, size: 16, color: Colors.amber.shade800),
            const SizedBox(width: 6),
            const Text(
              'اختر المشاعر والنبرة البلاغية المستهدفة:',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _availableEmotions.map((item) {
            final isSelected = _selectedEmotions.contains(item.name);
            return FilterChip(
              avatar: Icon(
                item.icon,
                size: 16,
                color: isSelected ? Colors.white : Colors.amber.shade800,
              ),
              label: Text(
                item.name,
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? Colors.white : (isDark ? Colors.grey.shade200 : Colors.grey.shade800),
                ),
              ),
              selected: isSelected,
              selectedColor: Colors.amber.shade700,
              backgroundColor: isDark ? const Color(0xFF2C2C2C) : Colors.grey.shade100,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(
                  color: isSelected
                      ? Colors.amber.shade700
                      : (isDark ? Colors.grey.shade700 : Colors.grey.shade300),
                ),
              ),
              showCheckmark: false,
              onSelected: (_) => _toggleEmotion(item.name),
              tooltip: item.description,
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildIntensitySlider(ThemeData theme, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2A2A2A) : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.tune, size: 16, color: Colors.amber.shade800),
                  const SizedBox(width: 6),
                  const Text(
                    'كثافة التأثير البلاغي والدرامي:',
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.amber.shade500.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${_intensityLevel.toStringAsFixed(1)} / 5.0',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                    color: Colors.amber.shade900,
                  ),
                ),
              ),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: Colors.amber.shade700,
              inactiveTrackColor: Colors.grey.shade300,
              thumbColor: Colors.amber.shade800,
              overlayColor: Colors.amber.shade500.withOpacity(0.15),
            ),
            child: Slider(
              value: _intensityLevel,
              min: 1.0,
              max: 5.0,
              divisions: 8,
              onChanged: (val) => setState(() => _intensityLevel = val),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '1.0 خافت وهادئ',
                style: TextStyle(fontFamily: 'Tajawal', fontSize: 10, color: Colors.grey.shade500),
              ),
              Text(
                '5.0 أقصى درجات الذروة والتأثير',
                style: TextStyle(fontFamily: 'Tajawal', fontSize: 10, color: Colors.grey.shade500),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAnalyzeButton(ThemeData theme) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.amber.shade700,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 2,
        ),
        icon: _isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
              )
            : const Icon(Icons.auto_awesome, size: 20),
        label: Text(
          _isLoading ? 'جارٍ التحليل البلاغي...' : 'تحليل وتطوير الأسلوب البلاغي (Gemini)',
          style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 14),
        ),
        onPressed: _isLoading ? null : _runStyleAnalysis,
      ),
    );
  }

  Widget _buildLoadingState(ThemeData theme) {
    return Container(
      margin: const EdgeInsets.only(top: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.amber.shade500.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.shade500.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          CircularProgressIndicator(color: Colors.amber.shade800),
          const SizedBox(height: 16),
          Text(
            _loadingMessage,
            textAlign: TextAlign.center,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            'يتم فحص موازين المعاني والبيان وصياغة بديل إرشادي دون مساس بنصك الأصلي',
            textAlign: TextAlign.center,
            style: TextStyle(fontFamily: 'Tajawal', fontSize: 11, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildResultsSection(ThemeData theme, bool isDark) {
    final result = _analysisResult!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. بطاقة نسبة التوافق مع المشاعر
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF252525) : Colors.amber.shade50.withOpacity(0.6),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.amber.shade500.withOpacity(0.3)),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.insights, size: 20, color: Colors.amber.shade800),
                      const SizedBox(width: 8),
                      const Text(
                        'نسبة التوافق مع النبرة المطلوبة:',
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                  Text(
                    '${result.complianceScore.toStringAsFixed(1)}%',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      color: result.complianceScore >= 75
                          ? Colors.green.shade700
                          : (result.complianceScore >= 50 ? Colors.amber.shade800 : Colors.red.shade700),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: (result.complianceScore / 100).clamp(0.0, 1.0),
                  minHeight: 8,
                  backgroundColor: Colors.grey.shade300,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    result.complianceScore >= 75
                        ? Colors.green.shade600
                        : (result.complianceScore >= 50 ? Colors.amber.shade700 : Colors.orange.shade700),
                  ),
                ),
              ),
              if (result.analysisNotes != null && result.analysisNotes!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  result.analysisNotes!,
                  style: TextStyle(
                    fontFamily: 'Tajawal',
                    fontSize: 11,
                    color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 18),

        // 2. بطاقة الاقتراحات البلاغية والنقدية
        if (result.suggestions.isNotEmpty) ...[
          Row(
            children: [
              Icon(Icons.lightbulb_outline, size: 16, color: Colors.amber.shade800),
              const SizedBox(width: 6),
              const Text(
                'الاقتراحات والتوجيهات البلاغية:',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...result.suggestions.map((sug) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 6),
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: Colors.amber.shade800,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        sug,
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          color: isDark ? Colors.grey.shade200 : Colors.grey.shade800,
                        ),
                      ),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 18),
        ],

        // 3. شاشة المقارنة (Diff View) بين النص الأصلي والمقترح
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(Icons.compare_arrows_rounded, size: 18, color: Colors.amber.shade800),
                const SizedBox(width: 6),
                const Text(
                  'شاشة المقارنة (Diff View):',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ],
            ),
            // أزرار تبديل نمط المقارنة
            Container(
              decoration: BoxDecoration(
                color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  _buildModeToggleButton(
                    label: 'جنباً إلى جنب',
                    icon: Icons.view_column_outlined,
                    isSelected: _diffMode == DiffViewMode.sideBySide,
                    onTap: () => setState(() => _diffMode = DiffViewMode.sideBySide),
                  ),
                  _buildModeToggleButton(
                    label: 'فروقات مدمجة',
                    icon: Icons.difference_outlined,
                    isSelected: _diffMode == DiffViewMode.inlineDiff,
                    onTap: () => setState(() => _diffMode = DiffViewMode.inlineDiff),
                  ),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // عرض وضع المقارنة المختار
        if (_diffMode == DiffViewMode.sideBySide)
          _buildSideBySideDiffView(isDark)
        else
          _buildInlineDiffView(isDark),
      ],
    );
  }

  Widget _buildModeToggleButton({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Colors.amber.shade700 : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: isSelected ? Colors.white : Colors.grey.shade600),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? Colors.white : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// شاشة المقارنة جنباً إلى جنب (Side-by-Side Diff View)
  Widget _buildSideBySideDiffView(bool isDark) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 500;
        final originalCard = _buildDiffCard(
          title: 'النص الأصلي للكاتب (محمي دون تعديل)',
          text: widget.currentText,
          badgeColor: Colors.blue.shade100,
          badgeTextColor: Colors.blue.shade900,
          icon: Icons.edit_note,
          isDark: isDark,
          isOriginal: true,
        );

        final suggestedCard = _buildDiffCard(
          title: 'النص المقترح بالأسلوب المطور (مسودة إرشادية)',
          text: _analysisResult?.rewrittenText ?? '',
          badgeColor: Colors.green.shade100,
          badgeTextColor: Colors.green.shade900,
          icon: Icons.auto_awesome,
          isDark: isDark,
          isOriginal: false,
        );

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: originalCard),
              const SizedBox(width: 12),
              Expanded(child: suggestedCard),
            ],
          );
        } else {
          return Column(
            children: [
              originalCard,
              const SizedBox(height: 12),
              suggestedCard,
            ],
          );
        }
      },
    );
  }

  Widget _buildDiffCard({
    required String title,
    required String text,
    required Color badgeColor,
    required Color badgeTextColor,
    required IconData icon,
    required bool isDark,
    required bool isOriginal,
  }) {
    final wordCount = text.trim().isEmpty ? 0 : text.trim().split(RegExp(r'\s+')).length;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF282828) : (isOriginal ? Colors.grey.shade50 : const Color(0xFFF9FDF9)),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isOriginal
              ? (isDark ? Colors.grey.shade800 : Colors.grey.shade300)
              : (isDark ? Colors.green.shade900 : Colors.green.shade300),
          width: isOriginal ? 1 : 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ترويسة البطاقة
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isOriginal
                  ? (isDark ? Colors.grey.shade800.withOpacity(0.5) : Colors.grey.shade200)
                  : (isDark ? Colors.green.shade950 : Colors.green.shade50),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(icon, size: 16, color: isOriginal ? Colors.grey.shade700 : Colors.green.shade700),
                    const SizedBox(width: 6),
                    Text(
                      title,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                        color: isOriginal
                            ? (isDark ? Colors.grey.shade300 : Colors.grey.shade800)
                            : Colors.green.shade800,
                      ),
                    ),
                  ],
                ),
                Text(
                  '$wordCount كلمة',
                  style: TextStyle(fontFamily: 'Tajawal', fontSize: 10, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          // متن النص
          Padding(
            padding: const EdgeInsets.all(14),
            child: SelectableText(
              text.trim().isEmpty ? '(النص فارغ)' : text,
              style: TextStyle(
                fontFamily: 'Tajawal',
                fontSize: 13,
                height: 1.8,
                color: isDark ? Colors.grey.shade200 : Colors.grey.shade900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// شاشة الفروقات المدمجة بالكلمات (Inline Diff View)
  Widget _buildInlineDiffView(bool isDark) {
    final origWords = widget.currentText.trim().split(RegExp(r'\s+'));
    final rewritten = _analysisResult?.rewrittenText ?? '';
    final rewWords = rewritten.trim().split(RegExp(r'\s+'));

    final origSet = origWords.toSet();
    final rewSet = rewWords.toSet();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF282828) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // مفتاح الألوان التوضيحي
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.green.shade100,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '+ إضافات بلاغية مقترحة',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Colors.green.shade900, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.red.shade100,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '- كلمات مقترح استبدالها',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Colors.red.shade900, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // توليد النص الملون
          RichText(
            textDirection: TextDirection.rtl,
            text: TextSpan(
              style: TextStyle(
                fontFamily: 'Tajawal',
                fontSize: 14,
                height: 2.0,
                color: isDark ? Colors.grey.shade200 : Colors.grey.shade900,
              ),
              children: rewWords.map((word) {
                final isAdded = !origSet.contains(word);
                if (isAdded) {
                  return TextSpan(
                    text: '$word ',
                    style: TextStyle(
                      color: Colors.green.shade800,
                      backgroundColor: Colors.green.shade100.withOpacity(0.5),
                      fontWeight: FontWeight.bold,
                    ),
                  );
                }
                return TextSpan(text: '$word ');
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  /// شريط الإجراءات السفلي (نسخ النص أو تطبيقه اختيارياً)
  Widget _buildBottomActionsBar(ThemeData theme, bool isDark) {
    final rewritten = _analysisResult?.rewrittenText ?? '';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        border: Border(
          top: BorderSide(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
        ),
      ),
      child: Row(
        children: [
          // زر نسخ النص المقترح
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: Icon(_isCopied ? Icons.check : Icons.copy, size: 16),
            label: Text(
              _isCopied ? 'تم النسخ' : 'نسخ المقترح',
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 12),
            ),
            onPressed: rewritten.isEmpty ? null : () => _copyToClipboard(rewritten),
          ),

          const SizedBox(width: 10),

          // زر اعتماد وتطبيق النص في المحرر (بإرادة الكاتب الصريحة)
          Expanded(
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 2,
              ),
              icon: const Icon(Icons.check_circle_outline, size: 18),
              label: const Text(
                'اعتماد وتطبيق الصياغة في المحرر',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13),
              ),
              onPressed: rewritten.isEmpty ? null : () => _applyRevisedText(rewritten),
            ),
          ),
        ],
      ),
    );
  }
}
