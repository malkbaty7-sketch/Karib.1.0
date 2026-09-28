import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/entities/canvas_node.dart';
import '../../domain/entities/canvas_edge.dart';
import '../../data/datasources/canvas_local_database.dart';

/// موفر إدارة حالة السبورة الذهنية وخريطة الأفكار (CanvasProvider)
/// يدير حالة العقد (Nodes) والروابط (Edges) والتحديد (Selection) والسحب والإفلات (Drag)
/// مع حفظ تلقائي مستمر في قاعدة بيانات SQLite المحلية عبر sqflite.
class CanvasProvider extends ChangeNotifier {
  final CanvasLocalDatabase _database;

  String? _currentBookId;
  List<CanvasNode> _nodes = [];
  List<CanvasEdge> _edges = [];
  String? _selectedNodeId;
  String? _connectingFromNodeId;
  bool _isLoading = false;
  bool _isSaving = false;
  Timer? _debounceTimer;

  CanvasProvider({CanvasLocalDatabase? database})
      : _database = database ?? CanvasLocalDatabase.instance;

  // Getters
  String? get currentBookId => _currentBookId;
  List<CanvasNode> get nodes => List.unmodifiable(_nodes);
  List<CanvasEdge> get edges => List.unmodifiable(_edges);
  String? get selectedNodeId => _selectedNodeId;
  String? get connectingFromNodeId => _connectingFromNodeId;
  bool get isLoading => _isLoading;
  bool get isSaving => _isSaving;

  CanvasNode? get selectedNode {
    if (_selectedNodeId == null) return null;
    try {
      return _nodes.firstWhere((n) => n.id == _selectedNodeId);
    } catch (_) {
      return null;
    }
  }

  /// تحميل لوحة أفكار مشروع محدد
  Future<void> loadCanvas(String bookId) async {
    _isLoading = true;
    _currentBookId = bookId;
    _selectedNodeId = null;
    _connectingFromNodeId = null;
    notifyListeners();

    try {
      final loadedNodes = await _database.getNodes(bookId);
      final loadedEdges = await _database.getEdges(bookId);

      if (loadedNodes.isEmpty) {
        // إنشاء عُقد افتراضية تأسيسية للسبورة الذهنية إذا كانت اللوحة فارغة
        await _seedInitialMindMap(bookId);
      } else {
        _nodes = loadedNodes;
        _edges = loadedEdges;
      }
    } catch (e) {
      debugPrint('Error loading canvas: \$e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// بذر عُقد أولية ذكية للمشروع
  Future<void> _seedInitialMindMap(String bookId) async {
    final now = DateTime.now();
    final centerNode = CanvasNode(
      id: 'node_root_\${now.millisecondsSinceEpoch}',
      bookId: bookId,
      title: 'الفكرة المركزية للكتاب',
      content: 'موضوع البحث والرسالة الأساسية التي تدور حولها فصول الكتاب.',
      dx: 450,
      dy: 280,
      colorHex: '#D97706', // amber
      nodeType: 'idea',
      width: 240,
      height: 140,
      createdAt: now,
    );

    final characterNode = CanvasNode(
      id: 'node_char_\${now.millisecondsSinceEpoch + 1}',
      bookId: bookId,
      title: 'الشخصيات / الفئات المستهدفة',
      content: 'المحاور الإنسانية، رواد الأعمال، والباحثون في المجال.',
      dx: 150,
      dy: 140,
      colorHex: '#3B82F6', // blue
      nodeType: 'character',
      width: 220,
      height: 130,
      createdAt: now,
    );

    final quoteNode = CanvasNode(
      id: 'node_quote_\${now.millisecondsSinceEpoch + 2}',
      bookId: bookId,
      title: 'مقتبس توثيقي رئيسي',
      content: '«العلم صيد والكتابة قيده... قيّد صيودك بالحبال الواثقة»',
      dx: 750,
      dy: 160,
      colorHex: '#10B981', // emerald
      nodeType: 'extracted_quote',
      width: 230,
      height: 130,
      createdAt: now,
    );

    final eventNode = CanvasNode(
      id: 'node_event_\${now.millisecondsSinceEpoch + 3}',
      bookId: bookId,
      title: 'محطة الفصل الأول',
      content: 'المقدمة التاريخية والأطر المفاهيمية الأساسية.',
      dx: 450,
      dy: 480,
      colorHex: '#8B5CF6', // purple
      nodeType: 'event',
      width: 220,
      height: 130,
      createdAt: now,
    );

    _nodes = [centerNode, characterNode, quoteNode, eventNode];

    // ربط العقد بالمركز
    final edge1 = CanvasEdge(
      id: 'edge_1',
      bookId: bookId,
      fromNodeId: centerNode.id,
      toNodeId: characterNode.id,
      label: 'محور بشري',
      colorHex: '#60A5FA',
    );
    final edge2 = CanvasEdge(
      id: 'edge_2',
      bookId: bookId,
      fromNodeId: centerNode.id,
      toNodeId: quoteNode.id,
      label: 'شاهد استدلالي',
      colorHex: '#34D399',
    );
    final edge3 = CanvasEdge(
      id: 'edge_3',
      bookId: bookId,
      fromNodeId: centerNode.id,
      toNodeId: eventNode.id,
      label: 'تسلسل منطقي',
      colorHex: '#A78BFA',
    );

    _edges = [edge1, edge2, edge3];

    await _database.saveCanvasState(
      bookId: bookId,
      nodes: _nodes,
      edges: _edges,
    );
  }

  /// تحديد عقدة نشطة
  void selectNode(String? nodeId) {
    _selectedNodeId = nodeId;
    notifyListeners();
  }

  /// تحريك العقدة وتحديث إحداثياتها (مع دعم الحفظ التلقائي المؤجل)
  void updateNodePosition(String nodeId, double dx, double dy) {
    final index = _nodes.indexWhere((n) => n.id == nodeId);
    if (index != -1) {
      _nodes[index] = _nodes[index].copyWith(dx: dx, dy: dy);
      notifyListeners();

      // جدولة الحفظ التلقائي في SQLite
      _triggerAutoSave();
    }
  }

  /// إضافة عقدة جديدة
  Future<void> addNode({
    required String title,
    required String content,
    required double dx,
    required double dy,
    required String colorHex,
    required String nodeType,
  }) async {
    if (_currentBookId == null) return;

    final newNode = CanvasNode(
      id: 'node_\${DateTime.now().millisecondsSinceEpoch}',
      bookId: _currentBookId!,
      title: title,
      content: content,
      dx: dx,
      dy: dy,
      colorHex: colorHex,
      nodeType: nodeType,
      createdAt: DateTime.now(),
    );

    _nodes.add(newNode);
    _selectedNodeId = newNode.id;
    notifyListeners();

    await _database.insertNode(newNode);
  }

  /// تعديل محتوى العقدة الحالية
  Future<void> updateNodeData({
    required String nodeId,
    String? title,
    String? content,
    String? colorHex,
    String? nodeType,
  }) async {
    final index = _nodes.indexWhere((n) => n.id == nodeId);
    if (index != -1) {
      final updated = _nodes[index].copyWith(
        title: title,
        content: content,
        colorHex: colorHex,
        nodeType: nodeType,
      );
      _nodes[index] = updated;
      notifyListeners();

      await _database.updateNode(updated);
    }
  }

  /// حذف عقدة وما يرتبط بها من خطوط
  Future<void> deleteNode(String nodeId) async {
    _nodes.removeWhere((n) => n.id == nodeId);
    _edges.removeWhere((e) => e.fromNodeId == nodeId || e.toNodeId == nodeId);
    if (_selectedNodeId == nodeId) {
      _selectedNodeId = null;
    }
    notifyListeners();

    await _database.deleteNode(nodeId);
  }

  /// بدء أو إنهاء توصيل رابط بين عقدتين
  void startConnecting(String fromNodeId) {
    _connectingFromNodeId = fromNodeId;
    notifyListeners();
  }

  void cancelConnecting() {
    _connectingFromNodeId = null;
    notifyListeners();
  }

  /// إتمام وصل رابط إلى عقدة أخرى
  Future<void> completeConnection(String toNodeId, {String? label}) async {
    if (_connectingFromNodeId == null || _connectingFromNodeId == toNodeId || _currentBookId == null) {
      _connectingFromNodeId = null;
      notifyListeners();
      return;
    }

    // التحقق من عدم وجود رابط مكرر
    final exists = _edges.any((e) =>
        (e.fromNodeId == _connectingFromNodeId && e.toNodeId == toNodeId) ||
        (e.fromNodeId == toNodeId && e.toNodeId == _connectingFromNodeId));

    if (!exists) {
      final newEdge = CanvasEdge(
        id: 'edge_\${DateTime.now().millisecondsSinceEpoch}',
        bookId: _currentBookId!,
        fromNodeId: _connectingFromNodeId!,
        toNodeId: toNodeId,
        label: label,
        colorHex: '#94A3B8',
        createdAt: DateTime.now(),
      );

      _edges.add(newEdge);
      await _database.insertEdge(newEdge);
    }

    _connectingFromNodeId = null;
    notifyListeners();
  }

  /// حذف رابط
  Future<void> deleteEdge(String edgeId) async {
    _edges.removeWhere((e) => e.id == edgeId);
    notifyListeners();
    await _database.deleteEdge(edgeId);
  }

  /// تعديل حجم وأبعاد البطاقة
  Future<void> updateNodeSize({
    required String nodeId,
    required double width,
    required double height,
  }) async {
    final index = _nodes.indexWhere((n) => n.id == nodeId);
    if (index != -1) {
      final updated = _nodes[index].copyWith(width: width, height: height);
      _nodes[index] = updated;
      notifyListeners();
      await _database.updateNode(updated);
    }
  }

  /// تعديل لون البطاقة
  Future<void> updateNodeColor({
    required String nodeId,
    required String colorHex,
  }) async {
    final index = _nodes.indexWhere((n) => n.id == nodeId);
    if (index != -1) {
      final updated = _nodes[index].copyWith(colorHex: colorHex);
      _nodes[index] = updated;
      notifyListeners();
      await _database.updateNode(updated);
    }
  }

  /// استيراد اقتباس مستخرج من مرحلة البحث الدلالي وتحويله إلى بطاقة بالسبورة
  Future<void> importExtractedQuote({
    required String quote,
    required String author,
    required String sourceTitle,
    int pageNumber = 1,
    double dx = 400,
    double dy = 300,
  }) async {
    if (_currentBookId == null) return;

    final title = 'مقتبس من \$sourceTitle';
    final content = '«\$quote»\n— \$author، ص \$pageNumber';

    final newNode = CanvasNode(
      id: 'node_quote_\${DateTime.now().millisecondsSinceEpoch}',
      bookId: _currentBookId!,
      title: title,
      content: content,
      dx: dx,
      dy: dy,
      colorHex: '#10B981', // Emerald for quotes
      nodeType: 'extracted_quote',
      width: 280,
      height: 150,
      createdAt: DateTime.now(),
    );

    _nodes.add(newNode);
    _selectedNodeId = newNode.id;
    notifyListeners();

    await _database.insertNode(newNode);
  }

  /// تحويل المخطط والبطاقات إلى فصول في محرر الكتب (Export Canvas to Chapters)
  /// يقرأ البطاقات بالترتيب المنطقي، وينشئ فصولاً مقابلة لها في SQLite
  Future<List<Map<String, dynamic>>> exportToChapters() async {
    if (_currentBookId == null || _nodes.isEmpty) return [];

    // ترتيب البطاقات منطقياً: من الأعلى إلى الأسفل، ثم من اليمين إلى اليسار (وفق RTL)
    final sortedNodes = List<CanvasNode>.from(_nodes)
      ..sort((a, b) {
        // إذا كان هناك فارق عمودي يزيد عن 60px نعتمد الترتيب العمودي
        if ((a.dy - b.dy).abs() > 60) {
          return a.dy.compareTo(b.dy);
        }
        return b.dx.compareTo(a.dx); // اليمين أولاً
      });

    final List<Map<String, dynamic>> generatedChapters = [];

    for (int i = 0; i < sortedNodes.length; i++) {
      final node = sortedNodes[i];
      final chapterData = {
        'id': 'chap_from_canvas_\${DateTime.now().millisecondsSinceEpoch}_\$i',
        'book_id': _currentBookId!,
        'title': node.title,
        'order_index': i + 1,
        'content_json': '[{"insert":"\${node.title}\\n\\n\${node.content}\\n"}]',
        'plain_text': '\${node.title}\\n\\n\${node.content}',
        'word_count': node.content.trim().split(RegExp(r'\\s+')).length,
      };
      generatedChapters.add(chapterData);
    }

    return generatedChapters;
  }

  /// الحفظ التلقائي مع تأخير نبضي (Debounce 800ms)
  void _triggerAutoSave() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 800), () async {
      if (_currentBookId == null) return;
      _isSaving = true;
      notifyListeners();

      try {
        await _database.saveCanvasState(
          bookId: _currentBookId!,
          nodes: _nodes,
          edges: _edges,
        );
      } catch (e) {
        debugPrint('Auto-save canvas error: \$e');
      } finally {
        _isSaving = false;
        notifyListeners();
      }
    });
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }
}
