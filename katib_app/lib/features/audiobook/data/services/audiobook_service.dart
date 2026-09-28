import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:path_provider/path_provider.dart';
import '../../domain/entities/audio_track.dart';

/// حالات مشغل تحويل النص إلى كلام (TTS Playback States)
enum AudiobookPlaybackState {
  stopped,
  playing,
  paused,
  completed,
}

/// خدمة تحويل النصوص إلى كتب صوتية (AudiobookService)
/// تستخدم حزمة flutter_tts لضبط نطق اللغة العربية الفصحى
/// والتحكم الدقيق في نبرة الصوت، سرعة القراءة، وتتبع الجمل الحالية
/// لتمكين خاصية التظليل الحي (Live Text Highlighting).
class AudiobookService {
  static final AudiobookService instance = AudiobookService._internal();

  factory AudiobookService() => instance;

  AudiobookService._internal() {
    _initTts();
  }

  final FlutterTts _flutterTts = FlutterTts();

  // الحالة والإعدادات الصوتية
  AudiobookPlaybackState _playbackState = AudiobookPlaybackState.stopped;
  String _currentLanguage = 'ar-SA';
  double _speechRate = 0.9;  // سرعة متزنة ومناسبة للإلقاء العربي الفصيح
  double _pitch = 1.0;       // نبرة طبيعية
  double _volume = 1.0;

  // إدارة الجمل والتظليل الحي
  List<String> _currentSentences = [];
  int _currentSentenceIndex = 0;
  AudioTrack? _currentTrack;

  // تدفقات الإشعارات (Streams)
  final _stateController = StreamController<AudiobookPlaybackState>.broadcast();
  final _sentenceController = StreamController<int>.broadcast();
  final _progressController = StreamController<double>.broadcast();

  Stream<AudiobookPlaybackState> get stateStream => _stateController.stream;
  Stream<int> get sentenceStream => _sentenceController.stream;
  Stream<double> get progressStream => _progressController.stream;

  AudiobookPlaybackState get playbackState => _playbackState;
  int get currentSentenceIndex => _currentSentenceIndex;
  List<String> get currentSentences => List.unmodifiable(_currentSentences);
  AudioTrack? get currentTrack => _currentTrack;
  double get speechRate => _speechRate;
  double get pitch => _pitch;
  double get volume => _volume;
  String get currentLanguage => _currentLanguage;

  bool _isInitialized = false;

  /// تهيئة محرك TTS وضبط معالجات الأحداث
  Future<void> _initTts() async {
    if (_isInitialized) return;

    try {
      await _flutterTts.setLanguage(_currentLanguage);
      await _flutterTts.setPitch(_pitch);
      await _flutterTts.setSpeechRate(_speechRate * 0.5); // معيار سرعة flutter_tts
      await _flutterTts.setVolume(_volume);

      // ضبط محرك Android على التحدث الصوتي العربي المتقدم إن وجد
      if (!kIsWeb && Platform.isAndroid) {
        await _flutterTts.isLanguageAvailable('ar-SA');
      }

      // معالج إتمام نطق جملة والانتقال للجملة التالية تلقائياً
      _flutterTts.setCompletionHandler(() {
        _onSentenceCompleted();
      });

      _flutterTts.setErrorHandler((msg) {
        debugPrint('AudiobookService TTS error: $msg');
        _updateState(AudiobookPlaybackState.stopped);
      });

      _flutterTts.setCancelHandler(() {
        _updateState(AudiobookPlaybackState.stopped);
      });

      _flutterTts.setPauseHandler(() {
        _updateState(AudiobookPlaybackState.paused);
      });

      _flutterTts.setContinueHandler(() {
        _updateState(AudiobookPlaybackState.playing);
      });

      _isInitialized = true;
    } catch (e) {
      debugPrint('Error initializing AudiobookService TTS: $e');
    }
  }

  /// ضبط لغة القراءة (افتراضياً ar-SA)
  Future<void> setLanguage(String lang) async {
    _currentLanguage = lang;
    try {
      await _flutterTts.setLanguage(lang);
    } catch (_) {}
  }

  /// ضبط سرعة القراءة (0.5 إلى 2.0)
  Future<void> setSpeechRate(double rate) async {
    _speechRate = rate.clamp(0.25, 2.0);
    try {
      // تعيير السرعة بما يناسب flutter_tts (0.5 يمثل السرعة العادية 1.0x في معظم المحركات)
      await _flutterTts.setSpeechRate((_speechRate * 0.5).clamp(0.0, 1.0));
    } catch (_) {}
  }

  /// ضبط نبرة الصوت (0.5 إلى 2.0)
  Future<void> setPitch(double pitchVal) async {
    _pitch = pitchVal.clamp(0.5, 2.0);
    try {
      await _flutterTts.setPitch(_pitch);
    } catch (_) {}
  }

  /// ضبط مستوى الصوت (0.0 إلى 1.0)
  Future<void> setVolume(double volumeVal) async {
    _volume = volumeVal.clamp(0.0, 1.0);
    try {
      await _flutterTts.setVolume(_volume);
    } catch (_) {}
  }

  /// تقسيم النص العربي إلى جمل قصيرة ومتماسكة وفق علامات الترقيم العربية والإنجليزية
  /// لضمان انسيابية الإلقاء والتظليل الحي الدقيق
  static List<String> splitTextIntoSentences(String text) {
    if (text.trim().isEmpty) return [];

    // تنظيف وتقسيم الفقرات
    final paragraphs = text.split(RegExp(r'\n+'));
    final List<String> sentences = [];

    for (final para in paragraphs) {
      final trimmedPara = para.trim();
      if (trimmedPara.isEmpty) continue;

      // فواصل المعنى: النقطة، الفاصلة المنقوطة، علامات الاستفهام والتعجب، والفواصل
      final parts = trimmedPara.split(RegExp(r'(?<=[.؛!؟،,\n])\s+'));
      for (final part in parts) {
        final clean = part.trim();
        if (clean.isNotEmpty) {
          sentences.add(clean);
        }
      }
    }

    return sentences.isNotEmpty ? sentences : [text.trim()];
  }

  /// تقدير مدة المسار الصوتي بناءً على الكلمات وسرعة القراءة
  /// (متوسط القراءة العربية الفصيحة حوالي 130 كلمة بالدقيقة عند 1.0x)
  static Duration estimateAudioDuration(String text, {double speed = 1.0}) {
    if (text.trim().isEmpty) return Duration.zero;
    final wordCount = text.trim().split(RegExp(r'\s+')).length;
    final wordsPerSec = (130 / 60) * (speed > 0 ? speed : 1.0);
    final totalSeconds = (wordCount / wordsPerSec).round();
    return Duration(seconds: totalSeconds > 0 ? totalSeconds : 1);
  }

  /// بدء قراءة مسار كتاب صوتي بالكامل مع التظليل الحي
  Future<void> playTrack(AudioTrack track, {int startSentence = 0}) async {
    await _initTts();
    _currentTrack = track;
    _currentSentences = splitTextIntoSentences(track.plainText);

    if (_currentSentences.isEmpty) {
      _updateState(AudiobookPlaybackState.completed);
      return;
    }

    _currentSentenceIndex = startSentence.clamp(0, _currentSentences.length - 1);
    await _speakCurrentSentence();
  }

  /// التحدث بنص مباشر مع تقسيمه وتظليله
  Future<void> speakText({
    required String title,
    required String chapterId,
    required String text,
    int startSentence = 0,
  }) async {
    final track = AudioTrack(
      chapterId: chapterId,
      chapterTitle: title,
      plainText: text,
      duration: estimateAudioDuration(text, speed: _speechRate),
      speed: _speechRate,
      pitch: _pitch,
      language: _currentLanguage,
      createdAt: DateTime.now(),
    );
    await playTrack(track, startSentence: startSentence);
  }

  /// نطق الجملة الحالية وإشعار الواجهة برقمها للتظليل
  Future<void> _speakCurrentSentence() async {
    if (_currentSentenceIndex >= _currentSentences.length) {
      _updateState(AudiobookPlaybackState.completed);
      return;
    }

    final sentence = _currentSentences[_currentSentenceIndex];
    _updateState(AudiobookPlaybackState.playing);
    _sentenceController.add(_currentSentenceIndex);

    final progress = _currentSentences.isEmpty
        ? 0.0
        : (_currentSentenceIndex / _currentSentences.length).clamp(0.0, 1.0);
    _progressController.add(progress);

    try {
      await _flutterTts.speak(sentence);
    } catch (e) {
      debugPrint('Error speaking sentence: $e');
    }
  }

  /// معالجة اكتمال الجملة والانتقال للجملة التالية
  void _onSentenceCompleted() {
    if (_playbackState != AudiobookPlaybackState.playing) return;

    if (_currentSentenceIndex + 1 < _currentSentences.length) {
      _currentSentenceIndex++;
      _speakCurrentSentence();
    } else {
      _updateState(AudiobookPlaybackState.completed);
    }
  }

  /// إيقاف مؤقت للقراءة الصوتية
  Future<void> pause() async {
    try {
      await _flutterTts.pause();
    } catch (_) {
      await _flutterTts.stop();
    }
    _updateState(AudiobookPlaybackState.paused);
  }

  /// استئناف القراءة الصوتية
  Future<void> resume() async {
    if (_playbackState == AudiobookPlaybackState.paused) {
      await _speakCurrentSentence();
    }
  }

  /// إيقاف نهائي وإرجاع المؤشر للبداية
  Future<void> stop() async {
    try {
      await _flutterTts.stop();
    } catch (_) {}
    _currentSentenceIndex = 0;
    _updateState(AudiobookPlaybackState.stopped);
    _sentenceController.add(0);
    _progressController.add(0.0);
  }

  /// القفز إلى جملة محددة بالنقر المباشر (Interactive Live Highlighting Tap)
  Future<void> seekToSentence(int sentenceIndex) async {
    if (_currentSentences.isEmpty) return;
    try {
      await _flutterTts.stop();
    } catch (_) {}

    _currentSentenceIndex = sentenceIndex.clamp(0, _currentSentences.length - 1);
    await _speakCurrentSentence();
  }

  /// تقديم القراءة بعدد معين من الجمل (Skip Forward)
  Future<void> skipForward({int sentences = 2}) async {
    final next = (_currentSentenceIndex + sentences).clamp(0, _currentSentences.length - 1);
    await seekToSentence(next);
  }

  /// ترجيع القراءة بعدد معين من الجمل (Skip Backward)
  Future<void> skipBackward({int sentences = 2}) async {
    final prev = (_currentSentenceIndex - sentences).clamp(0, _currentSentences.length - 1);
    await seekToSentence(prev);
  }

  /// توليد وحفظ ملف صوتي محلياً للشار والتحميل (Synthesize to File)
  Future<String?> synthesizeToFile({
    required String text,
    required String fileName,
  }) async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final audioDir = Directory('${dir.path}/katib_audiobooks');
      if (!await audioDir.exists()) {
        await audioDir.create(recursive: true);
      }

      final filePath = '${audioDir.path}/$fileName.wav';
      await _flutterTts.synthesizeToFile(text, fileName);
      return filePath;
    } catch (e) {
      debugPrint('Error synthesizing TTS to file: $e');
      return null;
    }
  }

  void _updateState(AudiobookPlaybackState newState) {
    _playbackState = newState;
    _stateController.add(newState);
  }

  void dispose() {
    _flutterTts.stop();
    _stateController.close();
    _sentenceController.close();
    _progressController.close();
  }
}
