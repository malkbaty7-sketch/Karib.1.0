import 'package:flutter/material.dart';
import '../../domain/entities/assistant_message.dart';
import '../../data/services/in_app_assistant_service.dart';

/// ثيمات واجهة المساعد التفاعلي الثلاثة المخصصة
enum AssistantCustomTheme {
  sunset, // الغروب الدافئ (Warm Sunset)
  nature, // الهدوء الطبيعي (Natural Serenity)
  sky,    // السماء الهادئة (Calm Sky)
}

/// موضع لوحة المساعد المنزلقة
enum PanelDockMode {
  side,   // لوحة جانبية
  bottom, // لوحة سفلية
}

/// حجم خط المساعد وإمكانية الوصول
enum AssistantFontScale {
  small,  // 12sp
  normal, // 14sp
  large,  // 17sp
  xlarge, // 20sp لدعم سهولة الوصول
}

/// ويدجت المساعد التفاعلي العائم FloatingAssistantWidget لتطبيق katib_app
/// يحتوي على زر عائم قابل للسحب (Draggable FAB) ولوحة منزلقة تفاعلية (Sliding Panel)
/// تدعم الثيمات المخصصة، إمكانية الوصول، الأوامر السريعة، وتطبيق المقترحات مباشرة في المحرر.
class FloatingAssistantWidget extends StatefulWidget {
  final String projectId;
  final String chapterId;
  final String chapterTitle;
  final String currentText;
  final String? selectedText;
  final InAppAssistantService assistantService;
  final Function(String snippet, {bool replaceSelected})? onApplySuggestion;
  final VoidCallback? onRefreshEditor;

  const FloatingAssistantWidget({
    Key? key,
    required this.projectId,
    required this.chapterId,
    required this.chapterTitle,
    required this.currentText,
    this.selectedText,
    required this.assistantService,
    this.onApplySuggestion,
    this.onRefreshEditor,
  }) : super(key: key);

  @override
  State<FloatingAssistantWidget> createState() => _FloatingAssistantWidgetState();
}

class _FloatingAssistantWidgetState extends State<FloatingAssistantWidget>
    with SingleTickerProviderStateMixin {
  // موقع الزر العائم على حواف الشاشة
  Offset _fabPosition = const Offset(20, 90);
  bool _isPanelOpen = false;
  bool _isPinned = false;

  // إعدادات الثيم وإمكانية الوصول
  AssistantCustomTheme _theme = AssistantCustomTheme.sunset;
  PanelDockMode _dockMode = PanelDockMode.side;
  AssistantFontScale _fontScale = AssistantFontScale.normal;
  bool _highContrast = false;

  // تحكم بالتبويبات داخل اللوحة
  late TabController _tabController;
  final TextEditingController _chatController = TextEditingController();
  final ScrollController _chatScrollController = ScrollController();

  List<AssistantMessage> _messages = [];
  bool _isLoading = false;
  String? _statusBanner;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadMessages();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _chatController.dispose();
    _chatScrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    final msgs = await widget.assistantService.getSessionMessages(
      projectId: widget.projectId,
      chapterId: widget.chapterId,
    );
    if (mounted) {
      setState(() {
        _messages = msgs;
      });
    }
  }

  // تطبيق المقترح في المحرر
  void _applySuggestion(String snippet, {bool replaceSelected = false}) {
    if (widget.onApplySuggestion != null) {
      widget.onApplySuggestion!(snippet, replaceSelected: replaceSelected);
    }
    setState(() {
      _statusBanner = '✓ تم تطبيق المقترح بنجاح في موضع المؤشر بالمحرر!';
    });
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() {
          _statusBanner = null;
        });
      }
    });
  }

  // إرسال رسالة أو تشغيل أمر سريع
  Future<void> _handleCommand(String promptText) async {
    if (promptText.trim().isEmpty || _isLoading) return;

    final userMsg = AssistantMessage(
      id: 'usr_${DateTime.now().millisecondsSinceEpoch}',
      sender: 'user',
      text: promptText,
      timestamp: DateTime.now(),
      relatedChapterId: widget.chapterId,
      suggestionType: SuggestionType.chat,
    );

    setState(() {
      _messages.add(userMsg);
      _isLoading = true;
    });

    _chatController.clear();
    _scrollToBottom();

    // حفظ في الجلسة
    await widget.assistantService.saveSessionMessage(
      projectId: widget.projectId,
      message: userMsg,
    );

    try {
      final result = await widget.assistantService.getInlineSuggestions(
        currentText: widget.currentText,
        selectedText: widget.selectedText,
        chapterId: widget.chapterId,
        mode: SuggestionMode.chat,
        userPrompt: promptText,
      );

      final reply = result.reply ?? result.summary ?? 'تمت المعالجة بنجاح.';
      final aiMsg = AssistantMessage(
        id: 'ai_${DateTime.now().millisecondsSinceEpoch}',
        sender: 'ai',
        text: reply,
        timestamp: DateTime.now(),
        relatedChapterId: widget.chapterId,
        suggestionType: SuggestionType.chat,
      );

      setState(() {
        _messages.add(aiMsg);
      });

      await widget.assistantService.saveSessionMessage(
        projectId: widget.projectId,
        message: aiMsg,
      );
    } catch (e) {
      final errorMsg = AssistantMessage(
        id: 'ai_err_${DateTime.now().millisecondsSinceEpoch}',
        sender: 'ai',
        text: 'تعذر الاتصال بالمساعد حالياً. يرجى إعادة المحاولة.',
        timestamp: DateTime.now(),
        relatedChapterId: widget.chapterId,
        suggestionType: SuggestionType.chat,
      );
      setState(() {
        _messages.add(errorMsg);
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScrollController.hasClients) {
        _chatScrollController.animateTo(
          _chatScrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // ألوان وتدرجات الثيم المختار
  Color get _primaryColor {
    switch (_theme) {
      case AssistantCustomTheme.nature:
        return const Color(0xFF059669); // Emerald
      case AssistantCustomTheme.sky:
        return const Color(0xFF0284C7); // Sky/Indigo
      case AssistantCustomTheme.sunset:
      default:
        return const Color(0xFFD97706); // Amber
    }
  }

  LinearGradient get _fabGradient {
    switch (_theme) {
      case AssistantCustomTheme.nature:
        return const LinearGradient(
          colors: [Color(0xFF059669), Color(0xFF0D9488), Color(0xFF047857)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case AssistantCustomTheme.sky:
        return const LinearGradient(
          colors: [Color(0xFF0284C7), Color(0xFF4F46E5), Color(0xFF1D4ED8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case AssistantCustomTheme.sunset:
      default:
        return const LinearGradient(
          colors: [Color(0xFFD97706), Color(0xFFEA580C), Color(0xFFB45309)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
    }
  }

  double get _fontSizeVal {
    switch (_fontScale) {
      case AssistantFontScale.small:
        return 12.0;
      case AssistantFontScale.large:
        return 16.0;
      case AssistantFontScale.xlarge:
        return 19.0;
      case AssistantFontScale.normal:
      default:
        return 14.0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;

    return Stack(
      children: [
        // 1. الزر العائم القابل للسحب (Draggable Floating Action Button)
        Positioned(
          right: _fabPosition.dx,
          bottom: _fabPosition.dy,
          child: GestureDetector(
            onPanUpdate: (details) {
              setState(() {
                final newX = (_fabPosition.dx - details.delta.dx).clamp(16.0, screenSize.width - 76.0);
                final newY = (_fabPosition.dy - details.delta.dy).clamp(24.0, screenSize.height - 90.0);
                _fabPosition = Offset(newX, newY);
              });
            },
            onTap: () {
              setState(() {
                _isPanelOpen = !_isPanelOpen;
              });
            },
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(18),
              shadowColor: _primaryColor.withOpacity(0.4),
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: _fabGradient,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.white.withOpacity(0.3), width: 1.5),
                ),
                child: const Center(
                  child: Icon(
                    Icons.auto_awesome,
                    color: Colors.white,
                    size: 26,
                  ),
                ),
              ),
            ),
          ),
        ),

        // 2. النافذة المنزلقة (Sliding Panel: Side or Bottom)
        if (_isPanelOpen)
          Positioned(
            top: _dockMode == PanelDockMode.side ? 0 : null,
            right: 0,
            bottom: 0,
            left: _dockMode == PanelDockMode.bottom ? 0 : null,
            width: _dockMode == PanelDockMode.side ? 450 : screenSize.width,
            height: _dockMode == PanelDockMode.bottom ? 540 : screenSize.height,
            child: Directionality(
              textDirection: TextDirection.rtl,
              child: Material(
                elevation: 16,
                color: Theme.of(context).brightness == Brightness.dark
                    ? const Color(0xFF1C1917)
                    : Colors.white,
                borderRadius: _dockMode == PanelDockMode.bottom
                    ? const BorderRadius.vertical(top: Radius.circular(24))
                    : const BorderRadius.horizontal(left: Radius.circular(24)),
                child: SafeArea(
                  child: Column(
                    children: [
                      // شريط الرأس
                      _buildHeader(),

                      // شريط التنبيه عند تطبيق مقترح
                      if (_statusBanner != null)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          color: const Color(0xFF059669),
                          child: Text(
                            _statusBanner!,
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),

                      // شريط التبويبات (الدردشة / الأوامر / الإعدادات)
                      Container(
                        color: _primaryColor.withOpacity(0.06),
                        child: TabBar(
                          controller: _tabController,
                          indicatorColor: _primaryColor,
                          labelColor: _primaryColor,
                          unselectedLabelColor: Colors.grey,
                          tabs: const [
                            Tab(icon: Icon(Icons.chat_bubble_outline, size: 18), text: 'الدردشة'),
                            Tab(icon: Icon(Icons.bolt, size: 18), text: 'أوامر سريعة'),
                            Tab(icon: Icon(Icons.palette_outlined, size: 18), text: 'الثيمات والضبط'),
                          ],
                        ),
                      ),

                      // محتوى التبويبات
                      Expanded(
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            _buildChatTab(),
                            _buildQuickCommandsTab(),
                            _buildSettingsTab(),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  // رأس اللوحة
  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey.withOpacity(0.2))),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              gradient: _fabGradient,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'المساعد التفاعلي والتدقيق الذكي',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                Text(
                  'سياق: ${widget.chapterTitle}',
                  style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // زر التثبيت
          IconButton(
            icon: Icon(_isPinned ? Icons.push_pin : Icons.push_pin_outlined, size: 20),
            color: _isPinned ? _primaryColor : Colors.grey,
            onPressed: () {
              setState(() {
                _isPinned = !_isPinned;
              });
            },
            tooltip: 'تثبيت اللوحة بجانب المحرر',
          ),
          // زر تبديل النمط جانبي/سفلي
          IconButton(
            icon: Icon(_dockMode == PanelDockMode.side ? Icons.vertical_align_bottom : Icons.view_sidebar_outlined, size: 20),
            onPressed: () {
              setState(() {
                _dockMode = _dockMode == PanelDockMode.side ? PanelDockMode.bottom : PanelDockMode.side;
              });
            },
            tooltip: 'تبديل وضع اللوحة',
          ),
          // إغلاق
          IconButton(
            icon: const Icon(Icons.close, size: 22),
            onPressed: () => setState(() => _isPanelOpen = false),
          ),
        ],
      ),
    );
  }

  // تبويب المحادثة والأوامر السريعة
  Widget _buildChatTab() {
    return Column(
      children: [
        // رقاقات الأوامر السريعة المحددة في الطلب
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildQuickChip('اقترح عناوين فرعية لهذا الفصل', Icons.format_list_numbered),
                const SizedBox(width: 6),
                _buildQuickChip('افحص الجودة الإملائية للنص', Icons.spellcheck),
                const SizedBox(width: 6),
                _buildQuickChip('لخص أهم النقاط في المصدر المفتوح', Icons.auto_stories),
              ],
            ),
          ),
        ),

        // قائمة الرسائل
        Expanded(
          child: ListView.builder(
            controller: _chatScrollController,
            padding: const EdgeInsets.all(12),
            itemCount: _messages.length,
            itemBuilder: (ctx, index) {
              final msg = _messages[index];
              final isAi = msg.sender == 'ai';
              return Align(
                alignment: isAi ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  padding: const EdgeInsets.all(12),
                  constraints: const BoxConstraints(maxWidth: 360),
                  decoration: BoxDecoration(
                    color: isAi
                        ? _primaryColor.withOpacity(0.08)
                        : _primaryColor,
                    borderRadius: BorderRadius.circular(14),
                    border: isAi ? Border.all(color: _primaryColor.withOpacity(0.2)) : null,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        msg.text,
                        style: TextStyle(
                          fontSize: _fontSizeVal,
                          color: isAi ? null : Colors.white,
                          height: 1.5,
                        ),
                      ),
                      // زر تطبيق المقترح
                      if (isAi) ...[
                        const SizedBox(height: 8),
                        Divider(height: 1, color: _primaryColor.withOpacity(0.2)),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _primaryColor,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              onPressed: () => _applySuggestion(msg.text),
                              icon: const Icon(Icons.add_task, size: 14),
                              label: const Text('تطبيق المقترح في المحرر'),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        if (_isLoading)
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: _primaryColor),
                ),
                const SizedBox(width: 8),
                const Text('جاري معالجة طلبك بواسطة Gemini...', style: TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),

        // إدخال النص
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: Colors.grey.withOpacity(0.2))),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _chatController,
                  decoration: const InputDecoration(
                    hintText: 'اكتب سؤالك أو اطلب تحسين النص...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  onSubmitted: _handleCommand,
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                style: IconButton.styleFrom(backgroundColor: _primaryColor, foregroundColor: Colors.white),
                icon: const Icon(Icons.send),
                onPressed: () => _handleCommand(_chatController.text),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuickChip(String label, IconData icon) {
    return ActionChip(
      avatar: Icon(icon, size: 14, color: _primaryColor),
      label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
      backgroundColor: _primaryColor.withOpacity(0.08),
      side: BorderSide(color: _primaryColor.withOpacity(0.3)),
      onPressed: () => _handleCommand(label),
    );
  }

  // تبويب الأوامر السريعة المباشرة
  Widget _buildQuickCommandsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildCommandCard(
          title: 'اقترح عناوين فرعية لهذا الفصل',
          subtitle: 'توليد 4 عناوين فرعية أدبية عميقة متسقة مع سياق الفصل',
          icon: Icons.format_list_numbered,
          onTap: () => _handleCommand('اقترح عناوين فرعية لهذا الفصل'),
        ),
        const SizedBox(height: 12),
        _buildCommandCard(
          title: 'افحص الجودة الإملائية للنص',
          subtitle: 'تدقيق همزات القطع، التاء المربوطة، وعلامات الترقيم وتصحيحها',
          icon: Icons.spellcheck,
          onTap: () => _handleCommand('افحص الجودة الإملائية للنص'),
        ),
        const SizedBox(height: 12),
        _buildCommandCard(
          title: 'لخص أهم النقاط في المصدر المفتوح',
          subtitle: 'استخلاص الرؤى والأفكار المحورية من هوامش ومراجع الكتاب',
          icon: Icons.auto_stories,
          onTap: () => _handleCommand('لخص أهم النقاط في المصدر المفتوح'),
        ),
        const SizedBox(height: 12),
        _buildCommandCard(
          title: 'إكمال الفقرة الحالية تلقائياً',
          subtitle: 'صياغة استكمال أدبي بليغ يتناغم مع النبرة العامة',
          icon: Icons.bolt,
          onTap: () => _handleCommand('أكمل الفكرة الحالية بأسلوب أدبي بليغ'),
        ),
      ],
    );
  }

  Widget _buildCommandCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.grey.withOpacity(0.2)),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _primaryColor.withOpacity(0.12),
          child: Icon(icon, color: _primaryColor, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 11)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14),
        onTap: onTap,
      ),
    );
  }

  // تبويب الثيمات الثلاثة المخصصة والتنسيق المتقدم وإمكانية الوصول
  Widget _buildSettingsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'الثيمات الثلاثة المخصصة:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 10),

        // اختيار الثيمات الثلاثة
        Row(
          children: [
            Expanded(
              child: _buildThemeOption(
                name: 'الغروب الدافئ',
                theme: AssistantCustomTheme.sunset,
                color: const Color(0xFFD97706),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildThemeOption(
                name: 'الهدوء الطبيعي',
                theme: AssistantCustomTheme.nature,
                color: const Color(0xFF059669),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildThemeOption(
                name: 'السماء الهادئة',
                theme: AssistantCustomTheme.sky,
                color: const Color(0xFF0284C7),
              ),
            ),
          ],
        ),

        const SizedBox(height: 24),
        const Text(
          'تكبير الخط وإمكانية الوصول (Accessibility):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 10),

        // مقاس الخط
        Wrap(
          spacing: 8,
          children: [
            _buildFontOption('صغير', AssistantFontScale.small),
            _buildFontOption('افتراضي', AssistantFontScale.normal),
            _buildFontOption('كبير', AssistantFontScale.large),
            _buildFontOption('كبير جداً', AssistantFontScale.xlarge),
          ],
        ),

        const SizedBox(height: 16),

        // تباين عالٍ
        SwitchListTile(
          title: const Text('وضع التباين العالي (High Contrast)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
          subtitle: const Text('وضوح مضاعف للنصوص والحدود', style: TextStyle(fontSize: 11)),
          value: _highContrast,
          activeColor: _primaryColor,
          onChanged: (val) => setState(() => _highContrast = val),
        ),

        // تثبيت اللوحة
        SwitchListTile(
          title: const Text('تثبيت اللوحة مفتوحة (Pinned Mode)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
          subtitle: const Text('إبقاء المساعد مرئياً ومثبتاً أثناء الكتابة في المحرر', style: TextStyle(fontSize: 11)),
          value: _isPinned,
          activeColor: _primaryColor,
          onChanged: (val) => setState(() => _isPinned = val),
        ),
      ],
    );
  }

  Widget _buildThemeOption({
    required String name,
    required AssistantCustomTheme theme,
    required Color color,
  }) {
    final isSelected = _theme == theme;
    return InkWell(
      onTap: () => setState(() => _theme = theme),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(isSelected ? 0.18 : 0.05),
          border: Border.all(color: isSelected ? color : Colors.grey.withOpacity(0.3), width: isSelected ? 2 : 1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            CircleAvatar(radius: 12, backgroundColor: color),
            const SizedBox(height: 6),
            Text(
              name,
              style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? color : null),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFontOption(String label, AssistantFontScale scale) {
    final isSelected = _fontScale == scale;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: _primaryColor.withOpacity(0.2),
      labelStyle: TextStyle(
        fontSize: 12,
        color: isSelected ? _primaryColor : null,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      onSelected: (_) => setState(() => _fontScale = scale),
    );
  }
}
