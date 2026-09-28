import 'package:flutter/material.dart';
import '../../domain/entities/assistant_message.dart';
import '../../data/services/in_app_assistant_service.dart';

/// واجهة المساعد التفاعلي والتدقيق اللغوي InAppAssistantSheet
/// تفتح من محرر النصوص وتوفر خيارات سريعة وتدقيقاً متصلاً بـ Gemini API
class InAppAssistantSheet extends StatefulWidget {
  final String projectId;
  final String chapterId;
  final String currentText;
  final String? selectedText;
  final InAppAssistantService assistantService;
  final Function(String newText)? onApplyText;

  const InAppAssistantSheet({
    super.key,
    required this.projectId,
    required this.chapterId,
    required this.currentText,
    this.selectedText,
    required this.assistantService,
    this.onApplyText,
  });

  static Future<void> show({
    required BuildContext context,
    required String projectId,
    required String chapterId,
    required String currentText,
    String? selectedText,
    required InAppAssistantService assistantService,
    Function(String newText)? onApplyText,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => InAppAssistantSheet(
        projectId: projectId,
        chapterId: chapterId,
        currentText: currentText,
        selectedText: selectedText,
        assistantService: assistantService,
        onApplyText: onApplyText,
      ),
    );
  }

  @override
  State<InAppAssistantSheet> createState() => _InAppAssistantSheetState();
}

class _InAppAssistantSheetState extends State<InAppAssistantSheet>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _chatInputController = TextEditingController();
  final ScrollController _chatScrollController = ScrollController();

  bool _isLoading = false;
  InlineSuggestionsResult? _lastResult;
  List<AssistantMessage> _sessionMessages = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadSessionMessages();
  }

  Future<void> _loadSessionMessages() async {
    final msgs = await widget.assistantService.getSessionMessages(
      projectId: widget.projectId,
      chapterId: widget.chapterId,
    );
    if (mounted) {
      setState(() {
        _sessionMessages = msgs;
      });
    }
  }

  Future<void> _triggerQuickAction(SuggestionMode mode) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final res = await widget.assistantService.getInlineSuggestions(
        currentText: widget.currentText,
        selectedText: widget.selectedText,
        chapterId: widget.chapterId,
        mode: mode,
      );

      // حفظ الرد في سجل الجلسة
      String messageText = '';
      if (mode == SuggestionMode.autocomplete && res.suggestions.isNotEmpty) {
        messageText = 'مقترحات إكمال الفقرة:\n• ' + res.suggestions.join('\n• ');
      } else if (mode == SuggestionMode.summary) {
        messageText = 'ملخص الفصل:\n${res.summary ?? ''}';
      } else if (mode == SuggestionMode.proofread) {
        messageText = res.overallFeedback ?? 'تم التدقيق الإملائي والنحوي بنجاح.';
      }

      final aiMsg = AssistantMessage.ai(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        text: messageText,
        relatedChapterId: widget.chapterId,
        suggestionType: mode.name,
      );

      await widget.assistantService.saveSessionMessage(
        projectId: widget.projectId,
        message: aiMsg,
      );

      if (mounted) {
        setState(() {
          _lastResult = res;
          _sessionMessages.add(aiMsg);
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _sendChatMessage() async {
    final text = _chatInputController.text.trim();
    if (text.isEmpty) return;

    _chatInputController.clear();
    final userMsg = AssistantMessage.user(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: text,
      relatedChapterId: widget.chapterId,
    );

    setState(() {
      _sessionMessages.add(userMsg);
      _isLoading = true;
    });

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
        userPrompt: text,
      );

      final replyText = result.overallFeedback ??
          'أنا هنا لمساعدتك في كتابة ومراجعة كتابك خطوة بخطوة.';

      final aiMsg = AssistantMessage.ai(
        id: (DateTime.now().millisecondsSinceEpoch + 1).toString(),
        text: replyText,
        relatedChapterId: widget.chapterId,
        suggestionType: 'chat',
      );

      await widget.assistantService.saveSessionMessage(
        projectId: widget.projectId,
        message: aiMsg,
      );

      if (mounted) {
        setState(() {
          _sessionMessages.add(aiMsg);
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _chatInputController.dispose();
    _chatScrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1C1917) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 20,
              offset: const Offset(0, -4),
            )
          ],
        ),
        child: Column(
          children: [
            // مقبض السحب والعنوان
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? Colors.stone[800]! : Colors.stone[200]!,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.auto_awesome, color: Colors.amber, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'مساعد كاتب التفاعلي (InAppAssistant)',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'مدعوم بـ Gemini API • تدقيق لغوي ومقترحات سياقية',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.stone[400] : Colors.stone[600],
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // شريط التبويبات
            TabBar(
              controller: _tabController,
              labelColor: Colors.amber[800],
              unselectedLabelColor: isDark ? Colors.stone[400] : Colors.stone[600],
              indicatorColor: Colors.amber[800],
              tabs: const [
                Tab(icon: Icon(Icons.electric_bolt, size: 18), text: 'إكمال الفكرة'),
                Tab(icon: Icon(Icons.article, size: 18), text: 'ملخص الفصل'),
                Tab(icon: Icon(Icons.spellcheck, size: 18), text: 'التدقيق اللغوي'),
                Tab(icon: Icon(Icons.forum, size: 18), text: 'المحادثة'),
              ],
            ),

            // المحتوى الرئيسي للتبويبات
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // 1. تبويب إكمال الفقرة تلقائياً
                  _buildAutocompleteTab(),

                  // 2. تبويب ملخص سريع للفصل
                  _buildSummaryTab(),

                  // 3. تبويب التدقيق الإملائي والنحوي
                  _buildProofreadTab(),

                  // 4. تبويب محادثات الجلسة المحفوظة
                  _buildChatTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAutocompleteTab() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ElevatedButton.icon(
            onPressed: _isLoading ? null : () => _triggerQuickAction(SuggestionMode.autocomplete),
            icon: _isLoading
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.bolt),
            label: const Text('توليد خيارات إكمال الفقرة تلقائياً'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.amber[700],
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _lastResult?.mode == SuggestionMode.autocomplete && _lastResult!.suggestions.isNotEmpty
                ? ListView.separated(
                    itemCount: _lastResult!.suggestions.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (ctx, index) {
                      final item = _lastResult!.suggestions[index];
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.amber.withOpacity(0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item, style: const TextStyle(height: 1.6)),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: TextButton.icon(
                                onPressed: () {
                                  widget.onApplyText?.call('${widget.currentText}\n\n$item');
                                  Navigator.pop(context);
                                },
                                icon: const Icon(Icons.add, size: 16),
                                label: const Text('إدراج في المحرر'),
                              ),
                            )
                          ],
                        ),
                      );
                    },
                  )
                : const Center(
                    child: Text(
                      'اضغط على الزر أعلاه لقراءة سياق الفصل وتوليد مقترحات إكمال متناسقة',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
          )
        ],
      ),
    );
  }

  Widget _buildSummaryTab() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          ElevatedButton.icon(
            onPressed: _isLoading ? null : () => _triggerQuickAction(SuggestionMode.summary),
            icon: const Icon(Icons.summarize),
            label: const Text('توليد ملخص سريع وشامل للفصل'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.amber[700],
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _lastResult?.summary != null
                ? SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_lastResult!.summary!, style: const TextStyle(fontSize: 15, height: 1.7)),
                        if (_lastResult!.keyPoints != null && _lastResult!.keyPoints!.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          const Text('النقاط المحورية:', style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          ..._lastResult!.keyPoints!.map((p) => Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('• ', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
                                    Expanded(child: Text(p)),
                                  ],
                                ),
                              )),
                        ]
                      ],
                    ),
                  )
                : const Center(
                    child: Text(
                      'اضغط لتوليد ملخص سردي يبرز أفكار الفصل والنقاط المحورية',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
          )
        ],
      ),
    );
  }

  Widget _buildProofreadTab() {
    final errors = _lastResult?.errors ?? [];
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          ElevatedButton.icon(
            onPressed: _isLoading ? null : () => _triggerQuickAction(SuggestionMode.proofread),
            icon: const Icon(Icons.check_circle_outline),
            label: const Text('بدء التدقيق الإملائي والنحوي والترقيمي'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.amber[700],
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _lastResult?.mode == SuggestionMode.proofread
                ? ListView(
                    children: [
                      if (_lastResult!.correctedText != null)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              widget.onApplyText?.call(_lastResult!.correctedText!);
                              Navigator.pop(context);
                            },
                            icon: const Icon(Icons.done_all, size: 16),
                            label: const Text('تطبيق كافة التصحيحات في النص'),
                          ),
                        ),
                      const SizedBox(height: 12),
                      ...errors.map((err) => Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        err.errorText,
                                        style: const TextStyle(
                                          color: Colors.red,
                                          decoration: TextDecoration.lineThrough,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const Icon(Icons.arrow_left, size: 18),
                                      Text(
                                        err.suggestion,
                                        style: const TextStyle(
                                          color: Colors.green,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(err.explanation, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                            ),
                          )),
                    ],
                  )
                : const Center(
                    child: Text(
                      'اضغط لفحص النص ورصد أخطاء الهمزات، التاء المربوطة، الإعراب، وعلامات الترقيم',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
          )
        ],
      ),
    );
  }

  Widget _buildChatTab() {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: _chatScrollController,
            padding: const EdgeInsets.all(16),
            itemCount: _sessionMessages.length,
            itemBuilder: (ctx, i) {
              final msg = _sessionMessages[i];
              final isUser = msg.sender == 'user';
              return Align(
                alignment: isUser ? Alignment.centerLeft : Alignment.centerRight,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                  decoration: BoxDecoration(
                    color: isUser
                        ? Colors.amber[700]
                        : (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF292524) : Colors.stone[100]),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    msg.text,
                    style: TextStyle(
                      color: isUser ? Colors.white : (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black87),
                      height: 1.5,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: Colors.grey.withOpacity(0.2))),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _chatInputController,
                  decoration: const InputDecoration(
                    hintText: 'اكتب سؤالك أو استفسارك للمساعد الذكي...',
                    border: InputBorder.none,
                  ),
                  onSubmitted: (_) => _sendChatMessage(),
                ),
              ),
              IconButton(
                onPressed: _sendChatMessage,
                icon: const Icon(Icons.send, color: Colors.amber),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
