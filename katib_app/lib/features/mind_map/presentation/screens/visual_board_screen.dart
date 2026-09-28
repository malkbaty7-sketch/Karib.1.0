import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../domain/entities/canvas_node.dart';
import '../providers/canvas_provider.dart';
import '../widgets/canvas_edge_painter.dart';
import '../widgets/canvas_node_widget.dart';

/// واجهة السبورة الذهنية والـ Visual Board لتطبيق كاتب (katib_app)
/// تدعم:
/// 1. التكبير والتحريك الحر (InteractiveViewer: Zoom & Pan).
/// 2. إنشاء بطاقة جديدة بالنقر المزدوج أو عبر الشريط السفلي التفاعلي.
/// 3. إضافة بطاقات الأفكار، وبطاقات الاقتباسات المستخرجة.
/// 4. تعديل لون وحجم البطاقات، وحفظ إحداثيات (dx, dy) تلقائياً في SQLite.
/// 5. رسم المسارات والأسهم التفاعلية عبر CustomPainter.
/// 6. خيار "تحويل المخطط إلى فصول" (Export Canvas to Chapters) لمحرر النصوص.
class VisualBoardScreen extends StatefulWidget {
  final String bookId;
  final String bookTitle;
  final VoidCallback? onNavigateToEditor;

  const VisualBoardScreen({
    super.key,
    required this.bookId,
    required this.bookTitle,
    this.onNavigateToEditor,
  });

  @override
  State<VisualBoardScreen> createState() => _VisualBoardScreenState();
}

class _VisualBoardScreenState extends State<VisualBoardScreen> {
  final TransformationController _transformController = TransformationController();
  final GlobalKey _canvasKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CanvasProvider>().loadCanvas(widget.bookId);
    });
  }

  /// إنشاء بطاقة سريعة عند النقر المزدوج على اللوحة في موضع النقر
  void _handleDoubleTapDown(TapDownDetails details) {
    // تحويل إحداثيات الشاشة إلى إحداثيات المشهد (Scene Coordinates) داخل InteractiveViewer
    final RenderBox? renderBox = _canvasKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final localPosition = details.localPosition;
    final scenePosition = _transformController.toScene(localPosition);

    _showQuickIdeaDialog(context, initialDx: scenePosition.dx, initialDy: scenePosition.dy);
  }

  /// حوار إضافة فكرة سريعة
  void _showQuickIdeaDialog(BuildContext context, {double? initialDx, double? initialDy}) {
    final titleController = TextEditingController();
    final contentController = TextEditingController();
    String selectedType = 'idea';
    String selectedColor = '#F59E0B';

    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: const Row(
            children: [
              Icon(Icons.lightbulb_outline_rounded, color: Colors.amber),
              SizedBox(width: 8),
              Text('إضافة فكرة سريعة للسبورة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleController,
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'عنوان الفكرة',
                    border: OutlineInputBorder(),
                  ),
                  style: const TextStyle(fontFamily: 'Cairo'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: contentController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'التفاصيل أو الملاحظات',
                    border: OutlineInputBorder(),
                  ),
                  style: const TextStyle(fontFamily: 'Tajawal'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo')),
            ),
            ElevatedButton(
              onPressed: () {
                if (titleController.text.trim().isNotEmpty) {
                  context.read<CanvasProvider>().addNode(
                        title: titleController.text.trim(),
                        content: contentController.text.trim(),
                        dx: initialDx ?? 400,
                        dy: initialDy ?? 300,
                        colorHex: selectedColor,
                        nodeType: selectedType,
                      );
                  Navigator.pop(ctx);
                }
              },
              child: const Text('إضافة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  /// حوار استيراد اقتباس مستخرج من مرحلة البحث الدلالي
  void _showImportQuoteDialog(BuildContext context) {
    // قائمة اقتباسات تجريبية مستخرجة مسبقاً من محرك الاستخراج الدلالي
    final sampleQuotes = [
      {
        'quote': 'إن تجديد الفكر ليس قطيعة مع التراث، بل هو استنطاق لأصوله بروح الزمان وأدواته المعاصرة.',
        'author': 'د. طه عبد الرحمن',
        'source': 'سؤال الأخلاق وتجديد العقل العربي',
        'page': 48,
      },
      {
        'quote': 'العدل قوام الملك، والحرية شرط الإبداع، والعلم ركيزة النهضة في كل أمة.',
        'author': 'ابن خلدون',
        'source': 'مقدمة ابن خلدون',
        'page': 112,
      },
      {
        'quote': 'الكتابة هي الذاكرة الحية للبشرية، ومن لا يكتب تاريخه يكتبه عنه الآخرون.',
        'author': 'مالك بن نبي',
        'source': 'شروط النهضة',
        'page': 85,
      },
      {
        'quote': 'منهج النظر في المصادر يستلزم الجمع بين فقه النص وفقه الواقع المعيش.',
        'author': 'د. رضوان السيد',
        'source': 'قضايا الفكر الإسلامي المعاصر',
        'page': 134,
      },
    ];

    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.format_quote_rounded, color: Colors.emerald),
              SizedBox(width: 8),
              Text('استيراد اقتباس مستخرج للسبورة',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: SizedBox(
            width: 480,
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: sampleQuotes.length,
              separatorBuilder: (_, __) => const Divider(height: 16),
              itemBuilder: (context, index) {
                final q = sampleQuotes[index];
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  title: Text(
                    '«\${q['quote']}»',
                    style: const TextStyle(fontFamily: 'Tajawal', fontSize: 13, height: 1.4),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      '— \${q['author']}، \${q['source']} (ص \${q['page']})',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: Colors.amber),
                    ),
                  ),
                  trailing: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    ),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('إدراج', style: TextStyle(fontFamily: 'Cairo', fontSize: 11)),
                    onPressed: () {
                      context.read<CanvasProvider>().importExtractedQuote(
                            quote: q['quote'] as String,
                            author: q['author'] as String,
                            sourceTitle: q['source'] as String,
                            pageNumber: q['page'] as int,
                            dx: 450 + (index * 40),
                            dy: 200 + (index * 50),
                          );
                      Navigator.pop(ctx);
                    },
                  ),
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('إغلاق', style: TextStyle(fontFamily: 'Cairo')),
            ),
          ],
        ),
      ),
    );
  }

  /// حوار تخصيص اللون والحجم للبطاقة المحددة
  void _showCustomizeCardDialog(BuildContext context, CanvasNode selectedNode) {
    String currentColor = selectedNode.colorHex;
    double currentWidth = selectedNode.width;
    double currentHeight = selectedNode.height;

    final colorOptions = [
      {'name': 'عنبري', 'hex': '#F59E0B'},
      {'name': 'أزرق', 'hex': '#3B82F6'},
      {'name': 'زمردي', 'hex': '#10B981'},
      {'name': 'بنفسجي', 'hex': '#8B5CF6'},
      {'name': 'وردي', 'hex': '#EC4899'},
      {'name': 'فحمي', 'hex': '#64748B'},
    ];

    final sizePresets = [
      {'label': 'عادي (220×140)', 'w': 220.0, 'h': 140.0},
      {'label': 'عريض (300×150)', 'w': 300.0, 'h': 150.0},
      {'label': 'كبير (360×200)', 'w': 360.0, 'h': 200.0},
    ];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            title: Text('تخصيص البطاقة: \${selectedNode.title}',
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 15)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('اختيار اللون المميز:',
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 10,
                  children: colorOptions.map((c) {
                    final isSel = currentColor == c['hex'];
                    final clean = c['hex']!.replaceAll('#', '');
                    final color = Color(int.parse('FF\$clean', radix: 16));
                    return GestureDetector(
                      onTap: () => setDialogState(() => currentColor = c['hex']!),
                      child: Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSel ? Colors.black : Colors.transparent,
                            width: 2.5,
                          ),
                        ),
                        child: isSel ? const Icon(Icons.check, color: Colors.white, size: 16) : null,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                const Text('حجم البطاقة:',
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: sizePresets.map((s) {
                    final isSel = currentWidth == s['w'];
                    return ChoiceChip(
                      label: Text(s['label'] as String, style: const TextStyle(fontFamily: 'Tajawal', fontSize: 12)),
                      selected: isSel,
                      onSelected: (val) {
                        if (val) {
                          setDialogState(() {
                            currentWidth = s['w'] as double;
                            currentHeight = s['h'] as double;
                          });
                        }
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo')),
              ),
              ElevatedButton(
                onPressed: () {
                  final provider = context.read<CanvasProvider>();
                  provider.updateNodeColor(nodeId: selectedNode.id, colorHex: currentColor);
                  provider.updateNodeSize(nodeId: selectedNode.id, width: currentWidth, height: currentHeight);
                  Navigator.pop(ctx);
                },
                child: const Text('حفظ التعديلات',
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// خيار: "تحويل المخطط إلى فصول" (Export Canvas to Chapters)
  Future<void> _handleExportToChapters(BuildContext context) async {
    final provider = context.read<CanvasProvider>();
    final chaptersData = await provider.exportToChapters();

    if (chaptersData.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اللوحة لا تحتوي على بطاقات لتحويلها إلى فصول.')),
      );
      return;
    }

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.auto_stories_rounded, color: Colors.amber),
              SizedBox(width: 8),
              Text('تحويل المخطط إلى فصول للكتاب',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: SizedBox(
            width: 440,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'سيتم إنشاء \${chaptersData.length} فصول تلقائياً وفق الترتيب المنطقي للبطاقات:',
                  style: const TextStyle(fontFamily: 'Tajawal', fontSize: 13),
                ),
                const SizedBox(height: 12),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 240),
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: chaptersData.length,
                    itemBuilder: (context, i) {
                      final item = chaptersData[i];
                      return ListTile(
                        dense: true,
                        leading: CircleAvatar(
                          radius: 12,
                          backgroundColor: Colors.amber.shade100,
                          child: Text('\${item['order_index']}',
                              style: TextStyle(fontSize: 10, color: Colors.amber.shade900, fontWeight: FontWeight.bold)),
                        ),
                        title: Text(item['title'] as String,
                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold)),
                        subtitle: Text('\${item['word_count']} كلمة مقدرة',
                            style: const TextStyle(fontFamily: 'Tajawal', fontSize: 10)),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo')),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.check_circle_rounded, size: 18),
              label: const Text('تأكيد وبدء التحرير',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
              onPressed: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('تم إنشاء \${chaptersData.length} فصول بنجاح وحفظها في SQLite!'),
                    backgroundColor: Colors.green.shade700,
                  ),
                );
                if (widget.onNavigateToEditor != null) {
                  widget.onNavigateToEditor!();
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CanvasProvider>();
    final selectedNode = provider.selectedNode;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            'السبورة الذهنية (Visual Board): \${widget.bookTitle}',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16),
          ),
          actions: [
            if (provider.isSaving)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    children: [
                      SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                      SizedBox(width: 8),
                      Text('جاري الحفظ التلقائي...', style: TextStyle(fontFamily: 'Tajawal', fontSize: 12)),
                    ],
                  ),
                ),
              )
            else
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('محفوظ محلياً (SQLite)',
                      style: TextStyle(fontFamily: 'Tajawal', fontSize: 12, color: Colors.green)),
                ),
              ),
            IconButton(
              tooltip: 'تحويل المخطط إلى فصول',
              icon: const Icon(Icons.file_upload_outlined),
              onPressed: () => _handleExportToChapters(context),
            ),
          ],
        ),
        body: Stack(
          children: [
            // 1. اللوحة التفاعلية مع دعم التكبير والتحريك والإيماءات
            GestureDetector(
              onDoubleTapDown: _handleDoubleTapDown,
              child: InteractiveViewer(
                key: _canvasKey,
                transformationController: _transformController,
                constrained: false,
                boundaryMargin: const EdgeInsets.all(1200),
                minScale: 0.35,
                maxScale: 2.5,
                child: Container(
                  width: 2800,
                  height: 2200,
                  color: Theme.of(context).scaffoldBackgroundColor,
                  child: Stack(
                    children: [
                      // رسم المسارات والأسهم التفاعلية باستخدام CustomPainter
                      Positioned.fill(
                        child: CustomPaint(
                          painter: CanvasEdgePainter(
                            nodes: provider.nodes,
                            edges: provider.edges,
                            selectedNodeId: provider.selectedNodeId,
                          ),
                        ),
                      ),

                      // البطاقات الحرة القابلة للسحب والإسقاط (GestureDetector & Positioned)
                      ...provider.nodes.map((node) {
                        return CanvasNodeWidget(
                          key: ValueKey(node.id),
                          node: node,
                          isSelected: provider.selectedNodeId == node.id,
                          isConnectingSource: provider.connectingFromNodeId == node.id,
                          onTap: () {
                            if (provider.connectingFromNodeId != null &&
                                provider.connectingFromNodeId != node.id) {
                              provider.completeConnection(node.id);
                            } else {
                              provider.selectNode(node.id);
                            }
                          },
                          onPanUpdate: (details) {
                            // حفظ الموقع الجغرافي (dx, dy) تلقائياً في SQLite
                            provider.updateNodePosition(
                              node.id,
                              node.dx + details.delta.dx,
                              node.dy + details.delta.dy,
                            );
                          },
                          onStartConnect: () {
                            if (provider.connectingFromNodeId == node.id) {
                              provider.cancelConnecting();
                            } else {
                              provider.startConnecting(node.id);
                            }
                          },
                          onDelete: () => provider.deleteNode(node.id),
                          onEdit: (title, content) {
                            provider.updateNodeData(
                              nodeId: node.id,
                              title: title,
                              content: content,
                            );
                          },
                        );
                      }),
                    ],
                  ),
                ),
              ),
            ),

            // 2. إشعار وضع الربط بين بطاقتين
            if (provider.connectingFromNodeId != null)
              Positioned(
                top: 16,
                left: 20,
                right: 20,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade700,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 8)],
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.cable_rounded, color: Colors.white),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text(
                          'انقر على أي بطاقة ثانية لإنشاء سهم ورابط بيزيه تفاعلي معها...',
                          style: TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                      TextButton(
                        onPressed: provider.cancelConnecting,
                        child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo', color: Colors.white)),
                      ),
                    ],
                  ),
                ),
              ),

            // 3. شريط الأدوات السفلي التفاعلي (Bottom Toolbar)
            Positioned(
              bottom: 24,
              left: 20,
              right: 20,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.3)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.12),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 12,
                    runSpacing: 8,
                    children: [
                      // زر إضافة بطاقة فكرة سريعة
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.amber.shade600,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.lightbulb_rounded, size: 18),
                        label: const Text('فكرة سريعة',
                            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12)),
                        onPressed: () => _showQuickIdeaDialog(context),
                      ),

                      // زر استيراد بطاقة اقتباس مستخرج
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.emerald.shade700,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.format_quote_rounded, size: 18),
                        label: const Text('اقتباس مستخرج',
                            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12)),
                        onPressed: () => _showImportQuoteDialog(context),
                      ),

                      // زر تخصيص اللون والحجم (مفعل عند تحديد بطاقة)
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.palette_outlined, size: 18),
                        label: const Text('اللون والحجم',
                            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12)),
                        onPressed: selectedNode == null
                            ? null
                            : () => _showCustomizeCardDialog(context, selectedNode),
                      ),

                      const SizedBox(width: 4),

                      // زر تحويل المخطط إلى فصول
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.stone.shade800,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.menu_book_rounded, size: 18),
                        label: const Text('تحويل إلى فصول',
                            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12)),
                        onPressed: () => _handleExportToChapters(context),
                      ),

                      // أزرار التحكم في المنظور والتقريب
                      IconButton(
                        tooltip: 'إعادة ضبط المنظور',
                        icon: const Icon(Icons.center_focus_strong_rounded, size: 20),
                        onPressed: () => _transformController.value = Matrix4.identity(),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
