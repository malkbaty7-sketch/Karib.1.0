import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import '../../domain/entities/canvas_node.dart';
import '../../domain/entities/canvas_edge.dart';

/// فئة إدارة قاعدة البيانات المحلية للسبورة الذهنية (SQLite via sqflite)
/// تتيح حفظ واسترجاع عقد وبطاقات الأفكار والروابط لكل مشروع/كتاب
/// مع دعم المعاملات المجمعة (Batch Transactions) للحفظ التلقائي وحذف الروابط التلقائي (Cascading).
class CanvasLocalDatabase {
  static final CanvasLocalDatabase instance = CanvasLocalDatabase._init();
  static Database? _database;

  CanvasLocalDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('katib_canvas.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
      onConfigure: (db) async {
        // تفعيل قيود المفاتيح الأجنبية لضمان حذف الروابط عند حذف العقد
        await db.execute('PRAGMA foreign_keys = ON');
      },
    );
  }

  Future<void> _createDB(Database db, int version) async {
    // 1. جدول عقد وبطاقات السبورة الذهنية (canvas_nodes)
    await db.execute('''
      CREATE TABLE canvas_nodes (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        dx REAL NOT NULL,
        dy REAL NOT NULL,
        color_hex TEXT NOT NULL,
        node_type TEXT NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');

    // فهرس تسريع استعلام عقد المشروع
    await db.execute('''
      CREATE INDEX idx_canvas_nodes_book ON canvas_nodes(book_id)
    ''');

    // 2. جدول الروابط والمسارات بين العقد (canvas_edges)
    await db.execute('''
      CREATE TABLE canvas_edges (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        from_node_id TEXT NOT NULL,
        to_node_id TEXT NOT NULL,
        label TEXT,
        color_hex TEXT NOT NULL,
        stroke_width REAL NOT NULL,
        line_style TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (from_node_id) REFERENCES canvas_nodes (id) ON DELETE CASCADE,
        FOREIGN KEY (to_node_id) REFERENCES canvas_nodes (id) ON DELETE CASCADE
      )
    ''');

    // فهرس تسريع استعلام الروابط لكل مشروع وعقدة
    await db.execute('''
      CREATE INDEX idx_canvas_edges_book ON canvas_edges(book_id)
    ''');
    await db.execute('''
      CREATE INDEX idx_canvas_edges_nodes ON canvas_edges(from_node_id, to_node_id)
    ''');
  }

  // ==========================================
  // عمليات العقد والبطاقات (Nodes CRUD)
  // ==========================================

  /// جلب كافة عقد المشروع المعين
  Future<List<CanvasNode>> getNodes(String bookId) async {
    final db = await database;
    final maps = await db.query(
      'canvas_nodes',
      where: 'book_id = ?',
      whereArgs: [bookId],
      orderBy: 'created_at ASC',
    );

    return maps.map((m) => CanvasNode.fromMap(m)).toList();
  }

  /// جلب عقدة واحدة بالمعرف
  Future<CanvasNode?> getNodeById(String id) async {
    final db = await database;
    final maps = await db.query(
      'canvas_nodes',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );

    if (maps.isNotEmpty) {
      return CanvasNode.fromMap(maps.first);
    }
    return null;
  }

  /// إدراج عقدة جديدة في السبورة
  Future<int> insertNode(CanvasNode node) async {
    final db = await database;
    return await db.insert(
      'canvas_nodes',
      node.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// تحديث بيانات العقدة بالكامل
  Future<int> updateNode(CanvasNode node) async {
    final db = await database;
    final nodeWithUpdatedTime = node.copyWith(updatedAt: DateTime.now());
    return await db.update(
      'canvas_nodes',
      nodeWithUpdatedTime.toMap(),
      where: 'id = ?',
      whereArgs: [node.id],
    );
  }

  /// تحديث إحداثيات موضع العقدة فقط (خفيف جداً أثناء السحب والإفلات Drag & Drop)
  Future<int> updateNodePosition(String nodeId, double dx, double dy) async {
    final db = await database;
    return await db.update(
      'canvas_nodes',
      {
        'dx': dx,
        'dy': dy,
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [nodeId],
    );
  }

  /// حذف عقدة (يحذف تلقائياً كافة الروابط المتصلة بها عبر ON DELETE CASCADE)
  Future<int> deleteNode(String nodeId) async {
    final db = await database;
    // مسح الروابط المرتبطة يدوياً أيضاً لضمان التوافق التام
    await db.delete(
      'canvas_edges',
      where: 'from_node_id = ? OR to_node_id = ?',
      whereArgs: [nodeId, nodeId],
    );
    return await db.delete(
      'canvas_nodes',
      where: 'id = ?',
      whereArgs: [nodeId],
    );
  }

  // ==========================================
  // عمليات المسارات والروابط (Edges CRUD)
  // ==========================================

  /// جلب كافة الروابط الخاصة بمشروع معين
  Future<List<CanvasEdge>> getEdges(String bookId) async {
    final db = await database;
    final maps = await db.query(
      'canvas_edges',
      where: 'book_id = ?',
      whereArgs: [bookId],
    );

    return maps.map((m) => CanvasEdge.fromMap(m)).toList();
  }

  /// إدراج رابط جديد بين عقدتين
  Future<int> insertEdge(CanvasEdge edge) async {
    final db = await database;
    return await db.insert(
      'canvas_edges',
      edge.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// تحديث رابط (مثلاً تغيير المسمى أو نمط الخط)
  Future<int> updateEdge(CanvasEdge edge) async {
    final db = await database;
    return await db.update(
      'canvas_edges',
      edge.toMap(),
      where: 'id = ?',
      whereArgs: [edge.id],
    );
  }

  /// حذف رابط محدد
  Future<int> deleteEdge(String edgeId) async {
    final db = await database;
    return await db.delete(
      'canvas_edges',
      where: 'id = ?',
      whereArgs: [edgeId],
    );
  }

  // ==========================================
  // عمليات المعاملات المجمعة والحفظ الدائم (Batch Sync)
  // ==========================================

  /// حفظ الحالة الكاملة للوحة الأفكار (العقد والروابط) دفعة واحدة داخل Transaction
  Future<void> saveCanvasState({
    required String bookId,
    required List<CanvasNode> nodes,
    required List<CanvasEdge> edges,
  }) async {
    final db = await database;
    await db.transaction((txn) async {
      // 1. مسح البيانات القديمة للمشروع لضمان عدم وجود أيتام
      await txn.delete('canvas_edges', where: 'book_id = ?', whereArgs: [bookId]);
      await txn.delete('canvas_nodes', where: 'book_id = ?', whereArgs: [bookId]);

      // 2. إدراج جميع العقد دفعة واحدة عبر Batch
      final nodeBatch = txn.batch();
      for (final node in nodes) {
        nodeBatch.insert('canvas_nodes', node.toMap());
      }
      await nodeBatch.commit(noResult: true);

      // 3. إدراج جميع الروابط دفعة واحدة عبر Batch
      final edgeBatch = txn.batch();
      for (final edge in edges) {
        edgeBatch.insert('canvas_edges', edge.toMap());
      }
      await edgeBatch.commit(noResult: true);
    });
  }

  /// تفريغ سبورة المشروع
  Future<void> clearCanvas(String bookId) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('canvas_edges', where: 'book_id = ?', whereArgs: [bookId]);
      await txn.delete('canvas_nodes', where: 'book_id = ?', whereArgs: [bookId]);
    });
  }

  /// إغلاق قاعدة البيانات
  Future<void> close() async {
    final db = await database;
    await db.close();
    _database = null;
  }
}
