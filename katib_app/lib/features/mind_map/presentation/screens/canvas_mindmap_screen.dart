import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../domain/entities/canvas_node.dart';
import '../providers/canvas_provider.dart';
import '../widgets/canvas_edge_painter.dart';
import '../widgets/canvas_node_widget.dart';

/// شاشة السبورة الذهنية والـ Mind Mapping لـ katib_app
/// تدعم السحب الحر للعقد، رسم الروابط والمسارات بين الأفكار والشخصيات والاقتباسات،
/// والحفظ المحلي الدائم في SQLite via sqflite.
class CanvasMindMapScreen extends StatefulWidget {
  final String bookId;
  final String bookTitle;

  const CanvasMindMapScreen({
    super.key,
    required this.bookId,
    required this.bookTitle,
  });

  @override
  State<CanvasMindMapScreen> createState() => _CanvasMindMapScreenState();
}

class _CanvasMindMapScreenState extends State<CanvasMindMapScreen> {
  final TransformationController _transformController = TransformationController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CanvasProvider>().loadCanvas(widget.bookId);
    });
  }

  void _showAddNodeDialog(BuildContext context) {
    final titleController = TextEditingController();
    final contentController = TextEditingController();
    String selectedType = 'idea';
    String selectedColor = '#F59E0B';

    final colors = [
      {'name': 'عنبري', 'hex': '#F59E0B'},
      {'name': 'أزرق', 'hex': '#3B82F6'},
      {'name': 'زمردي', 'hex': '#10B981'},
      {'name': 'بنفسجي', 'hex': '#8B5CF6'},
      {'name': 'وردي', 'hex': '#EC4899'},
    ];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            title: const Text('إضافة بطاقة جديدة للسبورة',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(
                      labelText: 'عنوان الفكرة / البطاقة',
                      border: OutlineInputBorder(),
                    ),
                    style: const TextStyle(fontFamily: 'Cairo'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: contentController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'المحتوى أو الملاحظة',
                      border: OutlineInputBorder(),
                    ),
                    style: const TextStyle(fontFamily: 'Tajawal'),
                  ),
                  const SizedBox(height: 12),
                  const Text('نوع البطاقة:',
                      style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: selectedType,
                    items: const [
                      DropdownMenuItem(value: 'idea', child: Text('فكرة رئيسية')),
                      DropdownMenuItem(value: 'character', child: Text('شخصية')),
                      DropdownMenuItem(value: 'location', child: Text('مكان / مشهد')),
                      DropdownMenuItem(value: 'extracted_quote', child: Text('اقتباس موثق')),
                      DropdownMenuItem(value: 'event', child: Text('حدث / حبكة')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => selectedType = val);
                    },
                    decoration: const InputDecoration(border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  const Text('لون البطاقة:',
                      style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    children: colors.map((c) {
                      final isSelected = selectedColor == c['hex'];
                      final clean = c['hex']!.replaceAll('#', '');
                      final color = Color(int.parse('FF\$clean', radix: 16));
                      return GestureDetector(
                        onTap: () => setDialogState(() => selectedColor = c['hex']!),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: color,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isSelected ? Colors.black : Colors.transparent,
                              width: 2.5,
                            ),
                          ),
                          child: isSelected
                              ? const Icon(Icons.check, size: 16, color: Colors.white)
                              : null,
                        ),
                      );
                    }).toList(),
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
                          dx: 350,
                          dy: 250,
                          colorHex: selectedColor,
                          nodeType: selectedType,
                        );
                    Navigator.pop(ctx);
                  }
                },
                child: const Text('إضافة للسبورة',
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CanvasProvider>();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            'السبورة الذهنية: \${widget.bookTitle}',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
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
                      Text('جاري الحفظ في SQLite...', style: TextStyle(fontFamily: 'Tajawal', fontSize: 12)),
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
              tooltip: 'إضافة فكرة / بطاقة',
              icon: const Icon(Icons.add_box_rounded),
              onPressed: () => _showAddNodeDialog(context),
            ),
          ],
        ),
        body: provider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : Stack(
                children: [
                  // اللوحة القابلة للتكبير والتحريك (InteractiveViewer)
                  InteractiveViewer(
                    transformationController: _transformController,
                    constrained: false,
                    boundaryMargin: const EdgeInsets.all(1000),
                    minScale: 0.4,
                    maxScale: 2.5,
                    child: Container(
                      width: 2500,
                      height: 2500,
                      decoration: BoxDecoration(
                        color: Theme.of(context).scaffoldBackgroundColor,
                        // خلفية شبكية خفيفة
                        image: const DecorationImage(
                          image: AssetImage('assets/images/grid_pattern.png'),
                          repeat: ImageRepeat.repeat,
                          opacity: 0.05,
                        ),
                      ),
                      child: Stack(
                        children: [
                          // 1. رسم مسارات وروابط البيزيه
                          Positioned.fill(
                            child: CustomPaint(
                              painter: CanvasEdgePainter(
                                nodes: provider.nodes,
                                edges: provider.edges,
                                selectedNodeId: provider.selectedNodeId,
                              ),
                            ),
                          ),

                          // 2. رسم العقد والبطاقات
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

                  // شريط توجيه عند الربط
                  if (provider.connectingFromNodeId != null)
                    Positioned(
                      top: 16,
                      left: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade700,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 8)],
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.cable_rounded, color: Colors.white),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'انقر على أي بطاقة أخرى لإنشاء مسار ورابط ذهني معها...',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: provider.cancelConnecting,
                              child: const Text('إلغاء',
                                  style: TextStyle(fontFamily: 'Cairo', color: Colors.white)),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // لوحة تحكم سريعة أسفل الشاشة
                  Positioned(
                    bottom: 20,
                    right: 20,
                    child: Card(
                      elevation: 4,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '\${provider.nodes.length} عقدة • \${provider.edges.length} رابط',
                              style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 12),
                            IconButton(
                              tooltip: 'إعادة ضبط العرض',
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
