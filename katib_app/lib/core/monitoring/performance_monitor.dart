import 'dart:developer' as developer;

/// تتبع قياس مؤشرات الأداء والزمن
class LatencyMetric {
  final String traceName;
  final int durationMs;
  final DateTime timestamp;
  final bool isCacheHit;
  final Map<String, dynamic> metadata;

  const LatencyMetric({
    required this.traceName,
    required this.durationMs,
    required this.timestamp,
    this.isCacheHit = false,
    this.metadata = const {},
  });
}

/// تقرير تشخيصي شامل للأداء واستهلاك الذاكرة
class PerformanceDiagnosticReport {
  final double avgSemanticSearchLatencyMs;
  final int p50LatencyMs;
  final int p95LatencyMs;
  final int totalSemanticQueries;
  final double searchCacheHitRatio;
  
  // ذاكرة التخزين المؤقت للـ PDF
  final double pdfCacheMemoryMb;
  final int cachedPdfPagesCount;
  final int maxPdfMemoryLimitMb;

  // ذاكرة التخزين المؤقت للصور والأغلفة
  final double imageCacheMemoryMb;
  final int cachedImagesCount;
  final int maxImageMemoryLimitMb;

  final DateTime generatedAt;

  const PerformanceDiagnosticReport({
    required this.avgSemanticSearchLatencyMs,
    required this.p50LatencyMs,
    required this.p95LatencyMs,
    required this.totalSemanticQueries,
    required this.searchCacheHitRatio,
    required this.pdfCacheMemoryMb,
    required this.cachedPdfPagesCount,
    required this.maxPdfMemoryLimitMb,
    required this.imageCacheMemoryMb,
    required this.cachedImagesCount,
    required this.maxImageMemoryLimitMb,
    required this.generatedAt,
  });
}

/// كائن تتبع زمني فردي
class PerformanceTrace {
  final String name;
  final Stopwatch _stopwatch = Stopwatch();
  final Map<String, dynamic> metadata = {};

  PerformanceTrace(this.name) {
    _stopwatch.start();
  }

  int stop({bool isCacheHit = false}) {
    _stopwatch.stop();
    final elapsed = _stopwatch.elapsedMilliseconds;
    PerformanceMonitor.instance.recordMetric(
      LatencyMetric(
        traceName: name,
        durationMs: elapsed,
        timestamp: DateTime.now(),
        isCacheHit: isCacheHit,
        metadata: metadata,
      ),
    );
    return elapsed;
  }
}

/// محرك مراقبة الأداء وذاكرة التخزين المؤقت PerformanceMonitor لتطبيق katib_app
/// يقيس:
/// 1. زمن استجابة استعلامات البحث الدلالي (Semantic Search Latency & P95).
/// 2. ذاكرة التخزين المؤقت لملفات وصفحات الـ PDF.
/// 3. ذاكرة التخزين المؤقت لصور الأغلفة والنماذج والزخارف.
class PerformanceMonitor {
  PerformanceMonitor._();
  static final PerformanceMonitor instance = PerformanceMonitor._();

  // حدود الذاكرة القصوى
  static const int defaultMaxPdfCacheMb = 120;
  static const int defaultMaxImageCacheMb = 80;

  // سجل زمن الاستجابة
  final List<LatencyMetric> _semanticQueryMetrics = [];
  static const int _maxRetainedMetrics = 100;

  // حالة ذاكرة الـ PDF المؤقتة
  int _pdfCacheBytes = 0;
  int _cachedPdfPages = 0;
  int _pdfCacheHits = 0;
  int _pdfCacheMisses = 0;

  // حالة ذاكرة الصور والأغلفة المؤقتة
  int _imageCacheBytes = 0;
  int _cachedImagesCount = 0;
  int _imageCacheHits = 0;
  int _imageCacheMisses = 0;

  // ==========================================
  // 1. تتبع استعلامات البحث الدلالي (Semantic Search)
  // ==========================================

  /// بدء تتبع زمني لاستعلام بحث دلالي عبر Gemini API
  PerformanceTrace startSemanticSearchTrace(String query) {
    final trace = PerformanceTrace('semantic_search');
    trace.metadata['query_length'] = query.length;
    return trace;
  }

  /// تسجيل مقياس زمني مكتمل
  void recordMetric(LatencyMetric metric) {
    _semanticQueryMetrics.insert(0, metric);
    if (_semanticQueryMetrics.length > _maxRetainedMetrics) {
      _semanticQueryMetrics.removeLast();
    }

    if (metric.durationMs > 3500) {
      developer.log(
        '⚠️ Slow query detected: [${metric.traceName}] took ${metric.durationMs}ms',
        name: 'PerformanceMonitor',
        level: 900,
      );
    }
  }

  // ==========================================
  // 2. إدارة ومراقبة ذاكرة الـ PDF المؤقتة
  // ==========================================

  /// تسجيل إضافة صفحة أو مستند PDF للذاكرة المؤقتة
  void recordPdfPageCached({required int sizeBytes, required int pageNumber}) {
    _pdfCacheBytes += sizeBytes;
    _cachedPdfPages++;

    // التحقق من تجاوز الحد الأقصى وإفراغ الذاكرة القديمة إن لزم
    final maxBytes = defaultMaxPdfCacheMb * 1024 * 1024;
    if (_pdfCacheBytes > maxBytes) {
      _evictPdfCache(targetBytes: (maxBytes * 0.8).toInt());
    }
  }

  /// تسجيل استخدام صفحة PDF من الذاكرة المؤقتة (Cache Hit / Miss)
  void recordPdfAccess({required bool hit}) {
    if (hit) {
      _pdfCacheHits++;
    } else {
      _pdfCacheMisses++;
    }
  }

  /// تفريغ جزء من ذاكرة الـ PDF
  void _evictPdfCache({required int targetBytes}) {
    while (_pdfCacheBytes > targetBytes && _cachedPdfPages > 0) {
      // محاكاة إزالة الصفحات الأقل استخداماً (LRU)
      final avgPageSize = _pdfCacheBytes ~/ _cachedPdfPages;
      _pdfCacheBytes -= avgPageSize;
      _cachedPdfPages--;
    }
    developer.log('Trimmed PDF cache to ${_pdfCacheBytes ~/ (1024 * 1024)}MB', name: 'PerformanceMonitor');
  }

  /// تفريغ كاش الـ PDF بالكامل
  void clearPdfCache() {
    _pdfCacheBytes = 0;
    _cachedPdfPages = 0;
  }

  // ==========================================
  // 3. إدارة ومراقبة ذاكرة صور الأغلفة والزخارف
  // ==========================================

  /// تسجيل إضافة صورة غلاف أو معاينة للكاش
  void recordImageCached({required int sizeBytes}) {
    _imageCacheBytes += sizeBytes;
    _cachedImagesCount++;

    final maxBytes = defaultMaxImageCacheMb * 1024 * 1024;
    if (_imageCacheBytes > maxBytes) {
      _evictImageCache(targetBytes: (maxBytes * 0.75).toInt());
    }
  }

  void recordImageAccess({required bool hit}) {
    if (hit) {
      _imageCacheHits++;
    } else {
      _imageCacheMisses++;
    }
  }

  void _evictImageCache({required int targetBytes}) {
    while (_imageCacheBytes > targetBytes && _cachedImagesCount > 0) {
      final avgSize = _imageCacheBytes ~/ _cachedImagesCount;
      _imageCacheBytes -= avgSize;
      _cachedImagesCount--;
    }
  }

  void clearImageCache() {
    _imageCacheBytes = 0;
    _cachedImagesCount = 0;
  }

  // ==========================================
  // 4. استخراج التقرير التشخيصي وحساب المؤشرات
  // ==========================================

  /// الحصول على التقرير التشخيصي الفوري
  PerformanceDiagnosticReport getDiagnosticReport() {
    final searchMetrics = _semanticQueryMetrics.where((m) => m.traceName == 'semantic_search').toList();
    
    double avgLatency = 0.0;
    int p50 = 0;
    int p95 = 0;
    double hitRatio = 0.0;

    if (searchMetrics.isNotEmpty) {
      final durations = searchMetrics.map((m) => m.durationMs).toList()..sort();
      final total = durations.reduce((a, b) => a + b);
      avgLatency = total / durations.length;

      p50 = durations[durations.length ~/ 2];
      final p95Index = ((durations.length - 1) * 0.95).toInt();
      p95 = durations[p95Index];

      final hits = searchMetrics.where((m) => m.isCacheHit).length;
      hitRatio = (hits / searchMetrics.length) * 100.0;
    }

    return PerformanceDiagnosticReport(
      avgSemanticSearchLatencyMs: double.parse(avgLatency.toStringAsFixed(1)),
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      totalSemanticQueries: searchMetrics.length,
      searchCacheHitRatio: double.parse(hitRatio.toStringAsFixed(1)),
      pdfCacheMemoryMb: double.parse((_pdfCacheBytes / (1024 * 1024)).toStringAsFixed(2)),
      cachedPdfPagesCount: _cachedPdfPages,
      maxPdfMemoryLimitMb: defaultMaxPdfCacheMb,
      imageCacheMemoryMb: double.parse((_imageCacheBytes / (1024 * 1024)).toStringAsFixed(2)),
      cachedImagesCount: _cachedImagesCount,
      maxImageMemoryLimitMb: defaultMaxImageCacheMb,
      generatedAt: DateTime.now(),
    );
  }
}
