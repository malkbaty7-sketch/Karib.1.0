import 'package:equatable/equatable.dart';

/// واجهة الكائن القابل للمزامنة (SyncableEntity)
/// تضيف حقلي lastModified و isSynced لجميع الكيانات (كتب، فصول، مصادر)
abstract class SyncableEntity extends Equatable {
  /// تاريخ ووقت آخر تعديل بالملي ثانية
  final DateTime lastModified;

  /// حالة المزامنة مع السحابة:
  /// true = متزامن ومحفوظ في السحابة
  /// false = تعديل محلي معلق في قاعدة البيانات المحلية (sqflite / hive)
  final bool isSynced;

  const SyncableEntity({
    required this.lastModified,
    required this.isSynced,
  });

  @override
  List<Object?> get props => [lastModified, isSynced];
}

/// نموذج بيانات المصدر القابل للمزامنة (CitationSyncModel)
class CitationSyncModel extends SyncableEntity {
  final String id;
  final String chapterId;
  final String sourceFileName;
  final int pageNumber;
  final String author;
  final String excerpt;

  const CitationSyncModel({
    required this.id,
    required this.chapterId,
    required this.sourceFileName,
    required this.pageNumber,
    required this.author,
    required this.excerpt,
    required DateTime lastModified,
    required bool isSynced,
  }) : super(lastModified: lastModified, isSynced: isSynced);

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'chapterId': chapterId,
      'sourceFileName': sourceFileName,
      'pageNumber': pageNumber,
      'author': author,
      'excerpt': excerpt,
      'lastModified': lastModified.millisecondsSinceEpoch,
      'isSynced': isSynced ? 1 : 0,
    };
  }

  factory CitationSyncModel.fromMap(Map<String, dynamic> map) {
    return CitationSyncModel(
      id: map['id'] as String,
      chapterId: map['chapterId'] as String? ?? '',
      sourceFileName: map['sourceFileName'] as String,
      pageNumber: map['pageNumber'] as int? ?? 1,
      author: map['author'] as String? ?? '',
      excerpt: map['excerpt'] as String? ?? '',
      lastModified: DateTime.fromMillisecondsSinceEpoch(map['lastModified'] as int? ?? DateTime.now().millisecondsSinceEpoch),
      isSynced: (map['isSynced'] as int? ?? 1) == 1,
    );
  }

  CitationSyncModel copyWith({
    String? id,
    String? chapterId,
    String? sourceFileName,
    int? pageNumber,
    String? author,
    String? excerpt,
    DateTime? lastModified,
    bool? isSynced,
  }) {
    return CitationSyncModel(
      id: id ?? this.id,
      chapterId: chapterId ?? this.chapterId,
      sourceFileName: sourceFileName ?? this.sourceFileName,
      pageNumber: pageNumber ?? this.pageNumber,
      author: author ?? this.author,
      excerpt: excerpt ?? this.excerpt,
      lastModified: lastModified ?? this.lastModified,
      isSynced: isSynced ?? this.isSynced,
    );
  }

  @override
  List<Object?> get props => [id, chapterId, sourceFileName, pageNumber, author, excerpt, lastModified, isSynced];
}
