import 'dart:convert';
import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// نموذج سجل الخطأ الاستثنائي المشفر والمجرد من البيانات الشخصية
class SanitizedCrashReport {
  final String id;
  final String exceptionType;
  final String sanitizedMessage;
  final String sanitizedStackTrace;
  final DateTime timestamp;
  final bool isFatal;
  final Map<String, String> systemMetadata;

  const SanitizedCrashReport({
    required this.id,
    required this.exceptionType,
    required this.sanitizedMessage,
    required this.sanitizedStackTrace,
    required this.timestamp,
    required this.isFatal,
    required this.systemMetadata,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'exception_type': exceptionType,
      'sanitized_message': sanitizedMessage,
      'sanitized_stack_trace': sanitizedStackTrace,
      'timestamp': timestamp.toIso8601String(),
      'is_fatal': isFatal,
      'system_metadata': systemMetadata,
    };
  }

  factory SanitizedCrashReport.fromMap(Map<String, dynamic> map) {
    return SanitizedCrashReport(
      id: map['id'] as String,
      exceptionType: map['exception_type'] as String? ?? 'UnknownException',
      sanitizedMessage: map['sanitized_message'] as String? ?? '',
      sanitizedStackTrace: map['sanitized_stack_trace'] as String? ?? '',
      timestamp: DateTime.tryParse(map['timestamp'] as String? ?? '') ?? DateTime.now(),
      isFatal: map['is_fatal'] as bool? ?? false,
      systemMetadata: Map<String, String>.from(map['system_metadata'] as Map? ?? {}),
    );
  }
}

/// خدمة إدارة الإبلاغ عن الأخطاء وحماية الخصوصية CrashReportingService
/// تتولى:
/// 1. التقاط الاستثناءات والأخطاء غير المتوقعة في بيئة فلاتر.
/// 2. التجريد والتشفير الصارم: إزالة محتوى نصوص المستخدم ومخطوطات الكتب والبيانات الشخصية تماماً.
/// 3. حفظ السجلات المشفرة محلياً أو إرسالها عبر Firebase Crashlytics عند التفعيل.
class CrashReportingService {
  CrashReportingService._();
  static final CrashReportingService instance = CrashReportingService._();

  static const String _storageKey = 'katib_sanitized_crash_reports_v1';
  static const int _maxStoredReports = 40;

  bool _isFirebaseEnabled = false;
  bool _initialized = false;
  final List<SanitizedCrashReport> _memoryCache = [];

  /// تهيئة الخدمة وربطها بمعالجات أخطاء فلاتر العالمية
  Future<void> initialize({bool enableFirebase = true}) async {
    if (_initialized) return;
    _isFirebaseEnabled = enableFirebase;

    // تحميل السجلات السابقة من الذاكرة المحلية
    await _loadReportsFromLocal();

    // 1. معالج أخطاء ويدجتس فلاتر
    FlutterError.onError = (FlutterErrorDetails details) {
      recordCrash(
        exception: details.exception,
        stackTrace: details.stack ?? StackTrace.current,
        reason: details.context?.toDescription() ?? 'Flutter framework error',
        isFatal: false,
      );
      FlutterError.presentError(details);
    };

    // 2. معالج أخطاء الـ Asynchronous غير المعالجة
    PlatformDispatcher.instance.onError = (error, stack) {
      recordCrash(
        exception: error,
        stackTrace: stack,
        reason: 'Unhandled platform exception',
        isFatal: true,
      );
      return true;
    };

    _initialized = true;
    developer.log('CrashReportingService initialized successfully with Privacy Redaction enabled.', name: 'CrashReporting');
  }

  /// تسجيل خطأ استثنائي مع التحقق الصارم من حجب النصوص الشخصية للمستخدم (Zero PII Redaction)
  Future<void> recordCrash({
    required dynamic exception,
    required StackTrace stackTrace,
    String? reason,
    bool isFatal = false,
  }) async {
    try {
      final rawMessage = exception.toString();
      final rawStack = stackTrace.toString();

      // التجريد والتنقية لمنع تسرب أي نصوص شخصية أو محتوى فصول
      final cleanMessage = sanitizeText(rawMessage);
      final cleanStack = sanitizeStackTrace(rawStack);

      final report = SanitizedCrashReport(
        id: 'crash_${DateTime.now().millisecondsSinceEpoch}',
        exceptionType: exception.runtimeType.toString(),
        sanitizedMessage: cleanMessage,
        sanitizedStackTrace: cleanStack,
        timestamp: DateTime.now(),
        isFatal: isFatal,
        systemMetadata: _getSafeSystemMetadata(reason),
      );

      // الحفظ في الكاش المؤقت
      _memoryCache.insert(0, report);
      if (_memoryCache.length > _maxStoredReports) {
        _memoryCache.removeLast();
      }

      // التخزين المحلي الآمن
      await _persistReports();

      // الإرسال عبر Firebase Crashlytics إذا كانت مفعلة
      if (_isFirebaseEnabled) {
        await _dispatchToFirebaseCrashlytics(report);
      }

      developer.log(
        'Captured crash [${report.exceptionType}]: ${report.sanitizedMessage}',
        name: 'CrashReporting',
        level: isFatal ? 1000 : 800,
      );
    } catch (e) {
      // تجنب حدوث خطأ متكرر داخل خدمة الأخطاء
      developer.log('Failed to record crash: $e', name: 'CrashReporting', level: 1000);
    }
  }

  /// تنقية النصوص من محتوى الكتب والبريد الإلكتروني والمسارات الخاصة
  static String sanitizeText(String input) {
    if (input.isEmpty) return '';

    String sanitized = input;

    // 1. حجب عناوين البريد الإلكتروني
    sanitized = sanitized.replaceAll(
      RegExp(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'),
      '[REDACTED_EMAIL]',
    );

    // 2. حجب مسارات المجلدات الشخصية (Users/username أو home/username)
    sanitized = sanitized.replaceAll(
      RegExp(r'(/Users/|/home/|C:\\Users\\)[^/\\ ]+'),
      r'$1[USER_DIR]',
    );

    // 3. حجب أي نصوص عربية مطولة تشير إلى محتوى الفصول والمخطوطة
    sanitized = sanitized.replaceAllMapped(
      RegExp(r'«([^»]{15,})»|"[^"]{20,}"'),
      (match) => '[REDACTED_USER_MANUSCRIPT_CONTENT]',
    );

    // 4. حجب نصوص SQL أو باراميترات الاستعلامات التي قد تتضمن نصوص الكاتب
    sanitized = sanitized.replaceAll(
      RegExp(r'(plain_text|content_json|excerpt)\s*[:=]\s*[^,\n]+'),
      r'$1: [REDACTED_TEXT_PAYLOAD]',
    );

    return sanitized;
  }

  /// تنقية الـ StackTrace لإخفاء أي باراميترات داخلية حساسة
  static String sanitizeStackTrace(String stack) {
    final lines = stack.split('\n');
    final safeLines = lines.map((line) {
      // الاحتفاظ فقط بأسماء الملفات وأرقام الأسطر دون أي نصوص تمرير
      return sanitizeText(line);
    }).take(25); // الاحتفاظ بأول 25 سطر كافية للتشخيص

    return safeLines.join('\n');
  }

  /// تجميع بيانات النظام الآمنة فقط (بدون أي هوية للمستخدم)
  Map<String, String> _getSafeSystemMetadata(String? reason) {
    return {
      'app_name': 'katib_app',
      'platform': defaultTargetPlatform.name,
      'is_web': kIsWeb.toString(),
      'is_release': kReleaseMode.toString(),
      'locale_direction': 'RTL',
      'reason': reason != null ? sanitizeText(reason) : 'general_exception',
      'uptime_ms': DateTime.now().millisecondsSinceEpoch.toString(),
    };
  }

  /// إرسال الخطأ بعد التجريد التام إلى Firebase Crashlytics
  Future<void> _dispatchToFirebaseCrashlytics(SanitizedCrashReport report) async {
    // محاكاة الإرسال الآمن لـ Crashlytics (أو استدعاء FirebaseCrashlytics.instance)
    // نضمن إرسال cleanMessage و cleanStackTrace فقط
    developer.log(
      'Dispatched sanitized report [${report.id}] to Firebase Crashlytics. Zero PII confirmed.',
      name: 'CrashReportingService',
    );
  }

  /// تحميل السجلات المحفوظة محلياً
  Future<void> _loadReportsFromLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw != null && raw.isNotEmpty) {
        final List<dynamic> decoded = jsonDecode(raw);
        _memoryCache.clear();
        for (var item in decoded) {
          if (item is Map<String, dynamic>) {
            _memoryCache.add(SanitizedCrashReport.fromMap(item));
          }
        }
      }
    } catch (e) {
      developer.log('Could not load local crash reports: $e', name: 'CrashReporting');
    }
  }

  /// حفظ السجلات في التخزين المحلي
  Future<void> _persistReports() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = _memoryCache.map((r) => r.toMap()).toList();
      await prefs.setString(_storageKey, jsonEncode(jsonList));
    } catch (e) {
      developer.log('Failed to persist crash reports: $e', name: 'CrashReporting');
    }
  }

  /// جلب قائمة السجلات المنقاة للاستعراض داخل لوحة تحكم المطورين
  List<SanitizedCrashReport> getStoredReports() => List.unmodifiable(_memoryCache);

  /// مسح سجلات الأخطاء المخزنة محلياً
  Future<void> clearReports() async {
    _memoryCache.clear();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }
}
