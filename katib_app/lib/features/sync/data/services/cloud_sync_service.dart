import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:uuid/uuid.dart';
import '../domain/entities/sync_metadata.dart';
import '../domain/entities/chapter_backup.dart';

/// محرك المزامنة المزدوجة (Offline-First Sync Engine)
/// يحفظ التعديلات في قاعدة البيانات المحلية (sqflite / hive) أولاً،
/// مع تتبع حقول lastModified و isSynced لكل كتاب وفصل ومصدر،
/// ويتولى رفع التعديلات المعلقة وحل التعارضات تلقائياً مع الاحتفاظ بنسخ احتياطية.
class CloudSyncService {
  final FirebaseFirestore _firestore;
  final Database _localDb;
  final Connectivity _connectivity;
  final String currentDeviceId;

  CloudSyncService({
    FirebaseFirestore? firestore,
    required Database localDb,
    Connectivity? connectivity,
    String? deviceId,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _localDb = localDb,
        _connectivity = connectivity ?? Connectivity(),
        currentDeviceId = deviceId ?? const Uuid().v4();

  // ==========================================
  // 1. التخزين المحلي أولاً (Offline-First Persistence)
  // ==========================================

  /// حفظ أو تحديث كتاب في قاعدة البيانات المحلية أولاً مع وسم عدم المزامنة
  Future<void> saveBookLocally({
    required String id,
    required String title,
    required String author,
    required String description,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await _localDb.insert(
      'books',
      {
        'id': id,
        'title': title,
        'author': author,
        'description': description,
        'lastModified': now,
        'isSynced': 0, // 0 = معلق محلياً
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// حفظ أو تعديل فصل محلياً (Offline-First) وتحديث lastModified و isSynced
  Future<void> saveChapterLocally({
    required String id,
    required String bookId,
    required String title,
    required String content,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await _localDb.insert(
      'chapters',
      {
        'id': id,
        'bookId': bookId,
        'title': title,
        'content': content,
        'lastModified': now,
        'isSynced': 0, // معلق محلياً بانتظار المزامنة
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    // وسم الكتاب أيضاً بأنه بحاجة لمزامنة
    await _localDb.update(
      'books',
      {'lastModified': now, 'isSynced': 0},
      where: 'id = ?',
      whereArgs: [bookId],
    );
  }

  /// حفظ أو تعديل مصدر/اقتباس محلياً
  Future<void> saveCitationLocally(CitationSyncModel citation) async {
    final map = citation.toMap();
    map['isSynced'] = 0; // وسم محلي
    await _localDb.insert(
      'citations',
      map,
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  // ==========================================
  // 2. التحقق من الاتصال ورفع التعديلات المعلقة
  // ==========================================

  /// التحقق من الاتصال الفعلي بالإنترنت
  Future<bool> checkInternetConnection() async {
    final connectivityResult = await _connectivity.checkConnectivity();
    return !connectivityResult.contains(ConnectivityResult.none);
  }

  /// دالة syncPendingChanges للتحقق من الاتصال ورفع التعديلات المعلقة تلقائياً
  Future<SyncResult> syncPendingChanges({required String userId}) async {
    final isOnline = await checkInternetConnection();
    if (!isOnline) {
      return SyncResult(
        success: false,
        syncedCount: 0,
        message: 'لا يوجد اتصال بالإنترنت. تم حفظ كافة التعديلات محلياً بأمان.',
      );
    }

    int syncedCount = 0;

    try {
      final userDoc = _firestore.collection('users').doc(userId);

      // أ) جلب ورفع الكتب غير المزامنة (isSynced = 0)
      final pendingBooks = await _localDb.query(
        'books',
        where: 'isSynced = ?',
        whereArgs: [0],
      );

      for (final bookMap in pendingBooks) {
        final bookId = bookMap['id'] as String;
        await userDoc.collection('books').doc(bookId).set({
          ...bookMap,
          'isSynced': 1,
          'syncedAt': FieldValue.serverTimestamp(),
          'lastModifiedDeviceId': currentDeviceId,
        }, SetOptions(merge: true));

        // تحديث السجل المحلي إلى متزامن
        await _localDb.update(
          'books',
          {'isSynced': 1},
          where: 'id = ?',
          whereArgs: [bookId],
        );
        syncedCount++;
      }

      // ب) جلب ورفع الفصول غير المزامنة (isSynced = 0)
      final pendingChapters = await _localDb.query(
        'chapters',
        where: 'isSynced = ?',
        whereArgs: [0],
      );

      for (final chMap in pendingChapters) {
        final chapterId = chMap['id'] as String;
        final bookId = chMap['bookId'] as String;

        // التحقق من تعارض محتمل قبل الكتابة
        await _syncChapterWithConflictCheck(
          userDoc: userDoc,
          bookId: bookId,
          chapterMap: chMap,
        );

        syncedCount++;
      }

      // ج) جلب ورفع المصادر غير المزامنة (isSynced = 0)
      final pendingCitations = await _localDb.query(
        'citations',
        where: 'isSynced = ?',
        whereArgs: [0],
      );

      for (final citMap in pendingCitations) {
        final citId = citMap['id'] as String;
        await userDoc.collection('citations').doc(citId).set({
          ...citMap,
          'isSynced': 1,
          'syncedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));

        await _localDb.update(
          'citations',
          {'isSynced': 1},
          where: 'id = ?',
          whereArgs: [citId],
        );
        syncedCount++;
      }

      return SyncResult(
        success: true,
        syncedCount: syncedCount,
        message: 'تمت مزامنة $syncedCount عنصراً بنجاح مع السحابة.',
      );
    } catch (e) {
      debugPrint('خطأ أثناء المزامنة السحابية: $e');
      return SyncResult(
        success: false,
        syncedCount: syncedCount,
        message: 'حدث خطأ أثناء المزامنة: $e',
      );
    }
  }

  // ==========================================
  // 3. معالجة التعارضات (Conflict Resolution Strategy)
  // ==========================================

  /// معالجة تعارض تعديل نفس الفصل من جهازين:
  /// - مقارنة طابع lastModified
  /// - حفظ النسخة الأكثر أحدثية
  /// - إنشاء وحفظ نسخة احتياطية من التعديل السابق دون ضياع أي كلمة
  Future<void> _syncChapterWithConflictCheck({
    required DocumentReference userDoc,
    required String bookId,
    required Map<String, dynamic> chapterMap,
  }) async {
    final chapterId = chapterMap['id'] as String;
    final localModified = chapterMap['lastModified'] as int;
    final localContent = chapterMap['content'] as String;

    final remoteDocRef = userDoc.collection('books').doc(bookId).collection('chapters').doc(chapterId);
    final remoteSnapshot = await remoteDocRef.get();

    if (remoteSnapshot.exists) {
      final remoteData = remoteSnapshot.data() as Map<String, dynamic>;
      final remoteModified = remoteData['lastModified'] as int? ?? 0;
      final remoteDeviceId = remoteData['lastModifiedDeviceId'] as String? ?? '';
      final remoteContent = remoteData['content'] as String? ?? '';

      // في حال وجود تعديل من جهاز آخر وبتاريخ مختلف
      if (remoteDeviceId != currentDeviceId && remoteContent != localContent) {
        if (remoteModified > localModified) {
          // السحابة أحدث: نحفظ التعديل المحلي كنسخة احتياطية أولاً
          await _saveConflictBackup(
            chapterId: chapterId,
            chapterTitle: chapterMap['title'] as String? ?? 'فصل',
            content: localContent,
            timestamp: DateTime.fromMillisecondsSinceEpoch(localModified),
            deviceId: currentDeviceId,
            reason: 'تعديل محلي سابق تم استبداله بنسخة أحدث من جهاز سحابي',
          );

          // نعتمد النسخة السحابية الأكثر أحدثية
          await _localDb.update(
            'chapters',
            {
              'content': remoteContent,
              'lastModified': remoteModified,
              'isSynced': 1,
            },
            where: 'id = ?',
            whereArgs: [chapterId],
          );
          return;
        } else {
          // المحلي أحدث من السحابي: نحفظ النسخة السحابية كنسخة احتياطية أولاً
          await _saveConflictBackup(
            chapterId: chapterId,
            chapterTitle: remoteData['title'] as String? ?? 'فصل',
            content: remoteContent,
            timestamp: DateTime.fromMillisecondsSinceEpoch(remoteModified),
            deviceId: remoteDeviceId,
            reason: 'نسخة سحابية سابقة تم استبدالها بتعديل محلي أحدث',
          );
        }
      }
    }

    // رفع التعديل الحالي للسحابة واعتماده كأحدث نسخة
    await remoteDocRef.set({
      ...chapterMap,
      'isSynced': 1,
      'lastModifiedDeviceId': currentDeviceId,
      'syncedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));

    // تحديث الحالة محلياً
    await _localDb.update(
      'chapters',
      {'isSynced': 1},
      where: 'id = ?',
      whereArgs: [chapterId],
    );
  }

  /// حفظ نسخة احتياطية من التعديل السابق في جدول النسخ الاحتياطية (Backups)
  Future<void> _saveConflictBackup({
    required String chapterId,
    required String chapterTitle,
    required String content,
    required DateTime timestamp,
    required String deviceId,
    required String reason,
  }) async {
    final backup = ChapterBackup(
      id: const Uuid().v4(),
      chapterId: chapterId,
      chapterTitle: chapterTitle,
      content: content,
      timestamp: timestamp,
      deviceId: deviceId,
      deviceName: deviceId == currentDeviceId ? 'الجهاز الحالي' : 'جهاز متزامن آخر',
      reason: reason,
    );

    // تخزين محلي في sqflite
    await _localDb.insert(
      'chapter_backups',
      backup.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// استرجاع قائمة النسخ الاحتياطية لفصل معين
  Future<List<ChapterBackup>> getChapterBackups(String chapterId) async {
    final maps = await _localDb.query(
      'chapter_backups',
      where: 'chapterId = ?',
      whereArgs: [chapterId],
      orderBy: 'timestamp DESC',
    );

    return maps.map((m) => ChapterBackup.fromMap(m)).toList();
  }

  /// استرجاع كافة نسخ التعارضات الاحتياطية
  Future<List<ChapterBackup>> getAllConflictBackups() async {
    final maps = await _localDb.query(
      'chapter_backups',
      orderBy: 'timestamp DESC',
    );
    return maps.map((m) => ChapterBackup.fromMap(m)).toList();
  }

  /// استعادة نسخة احتياطية من التعارض واستبدال نص الفصل بها
  Future<void> restoreBackupVersion({required String backupId}) async {
    final maps = await _localDb.query(
      'chapter_backups',
      where: 'id = ?',
      whereArgs: [backupId],
      limit: 1,
    );

    if (maps.isNotEmpty) {
      final backup = ChapterBackup.fromMap(maps.first);
      final now = DateTime.now().millisecondsSinceEpoch;
      await _localDb.update(
        'chapters',
        {
          'content': backup.content,
          'plain_text': backup.content,
          'lastModified': now,
          'isSynced': 0, // يعاد وسمه كمعلق للمزامنة
        },
        where: 'id = ?',
        whereArgs: [backup.chapterId],
      );
    }
  }

  /// حساب عدد التعديلات المعلقة محلياً وغير المزامنة (isSynced = 0)
  Future<int> getPendingChangesCount() async {
    final books = await _localDb.query('books', where: 'isSynced = ?', whereArgs: [0]);
    final chapters = await _localDb.query('chapters', where: 'isSynced = ?', whereArgs: [0]);
    final citations = await _localDb.query('citations', where: 'isSynced = ?', whereArgs: [0]);
    return books.length + chapters.length + citations.length;
  }

  /// جلب إحصائيات العناصر المحلية الإجمالية
  Future<Map<String, int>> getLocalStats() async {
    final books = await _localDb.query('books');
    final chapters = await _localDb.query('chapters');
    final citations = await _localDb.query('citations');
    final backups = await _localDb.query('chapter_backups');
    return {
      'books': books.length,
      'chapters': chapters.length,
      'citations': citations.length,
      'backups': backups.length,
    };
  }

  // ==========================================
  // 4. تصدير واستعادة النسخ الاحتياطية المشفرة (.katib)
  // ==========================================

  static const String _magicHeader = 'KATIB_ENCRYPTED_BACKUP_V1:';

  /// تشفير سلسلة نصية باستخدام مفتاح الحماية
  static String _encrypt(String plainText, String key) {
    final effectiveKey = key.isNotEmpty ? key : 'katib_default_sec_key_2026';
    final keyBytes = utf8.encode(effectiveKey);
    final textBytes = utf8.encode(plainText);
    final encrypted = Uint8List(textBytes.length);
    for (int i = 0; i < textBytes.length; i++) {
      encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return '$_magicHeader${base64.encode(encrypted)}';
  }

  /// فك تشفير السلسلة المشفرة
  static String _decrypt(String cipherText, String key) {
    final trimmed = cipherText.trim();
    if (!trimmed.startsWith(_magicHeader)) {
      throw const FormatException('الملف المحدد ليس حزمة نسخ احتياطي مشفرة صالحة لتطبيق كاتب.');
    }
    final rawBase64 = trimmed.substring(_magicHeader.length);
    final encrypted = base64.decode(rawBase64);
    final effectiveKey = key.isNotEmpty ? key : 'katib_default_sec_key_2026';
    final keyBytes = utf8.encode(effectiveKey);
    final decrypted = Uint8List(encrypted.length);
    for (int i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    return utf8.decode(decrypted);
  }

  /// تصدير حزمة احتياطية مشفرة (.katib) تحتوي كافة الكتب، الفصول، المصادر، ونسخ التعارض
  Future<String> exportEncryptedBackup({String? password}) async {
    final books = await _localDb.query('books');
    final chapters = await _localDb.query('chapters');
    final citations = await _localDb.query('citations');
    final backups = await _localDb.query('chapter_backups');

    final payload = {
      'app': 'katib_app',
      'version': 1,
      'exported_at': DateTime.now().toIso8601String(),
      'device_id': currentDeviceId,
      'has_custom_password': password != null && password.isNotEmpty,
      'books': books,
      'chapters': chapters,
      'citations': citations,
      'backups': backups,
    };

    final rawJson = jsonEncode(payload);
    final encryptedContent = _encrypt(rawJson, password ?? '');

    final dir = await getApplicationDocumentsDirectory();
    final backupDir = Directory('${dir.path}/katib_backups');
    if (!await backupDir.exists()) {
      await backupDir.create(recursive: true);
    }

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final filePath = '${backupDir.path}/katib_backup_$timestamp.katib';
    final file = File(filePath);
    await file.writeAsString(encryptedContent, flush: true);

    return filePath;
  }

  /// استعادة ودمج البيانات من حزمة احتياطية مشفرة (.katib)
  Future<int> restoreEncryptedBackup({
    required String filePath,
    String? password,
  }) async {
    final file = File(filePath);
    if (!await file.exists()) {
      throw const FileSystemException('الملف المحدد غير موجود على الجهاز');
    }

    final cipherText = await file.readAsString();
    final decryptedJson = _decrypt(cipherText, password ?? '');
    final data = jsonDecode(decryptedJson) as Map<String, dynamic>;

    if (data['app'] != 'katib_app') {
      throw const FormatException('هذا الملف لا ينتمي لتطبيق كاتب.');
    }

    int restoredCount = 0;

    // 1. استعادة الكتب
    if (data['books'] is List) {
      for (final item in data['books'] as List) {
        if (item is Map<String, dynamic>) {
          await _localDb.insert('books', item, conflictAlgorithm: ConflictAlgorithm.replace);
          restoredCount++;
        }
      }
    }

    // 2. استعادة الفصول
    if (data['chapters'] is List) {
      for (final item in data['chapters'] as List) {
        if (item is Map<String, dynamic>) {
          await _localDb.insert('chapters', item, conflictAlgorithm: ConflictAlgorithm.replace);
          restoredCount++;
        }
      }
    }

    // 3. استعادة المصادر
    if (data['citations'] is List) {
      for (final item in data['citations'] as List) {
        if (item is Map<String, dynamic>) {
          await _localDb.insert('citations', item, conflictAlgorithm: ConflictAlgorithm.replace);
          restoredCount++;
        }
      }
    }

    // 4. استعادة نسخ التعارض
    if (data['backups'] is List) {
      for (final item in data['backups'] as List) {
        if (item is Map<String, dynamic>) {
          await _localDb.insert('chapter_backups', item, conflictAlgorithm: ConflictAlgorithm.replace);
          restoredCount++;
        }
      }
    }

    return restoredCount;
  }

  /// مسح البيانات المحلية المؤقتة عند تسجيل الخروج
  Future<void> clearLocalData() async {
    await _localDb.delete('books');
    await _localDb.delete('chapters');
    await _localDb.delete('citations');
    await _localDb.delete('chapter_backups');
  }
}

/// نتيجة عملية المزامنة
class SyncResult {
  final bool success;
  final int syncedCount;
  final String message;

  const SyncResult({
    required this.success,
    required this.syncedCount,
    required this.message,
  });
}
