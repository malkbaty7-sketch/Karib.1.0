import 'dart:async';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../../domain/entities/audio_track.dart';
import '../../data/services/audiobook_service.dart';

/// واجهة مشغل الكتب الصوتية المتطور (AudiobookPlayerBottomSheet)
/// تستخدم حزمة just_audio مع AudiobookService لإدارة التشغيل، شريط التقديم،
/// وضبط سرعات ونبرات الصوت، مع ميزة التظليل الحي للجملة المقروءة (Live Text Highlighting)
/// وإمكانية النقر المباشر على أي جملة للقفز إليها صوتياً.
class AudiobookPlayerBottomSheet extends StatefulWidget {
  final AudioTrack track;
  final VoidCallback? onCompleted;

  const AudiobookPlayerBottomSheet({
    super.key,
    required this.track,
    this.onCompleted,
  });

  /// فتح مشغل الكتاب الصوتي كنافذة منبثقة سفلية متجاوبة
  static Future<void> show(
    BuildContext context, {
    required AudioTrack track,
    VoidCallback? onCompleted,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AudiobookPlayerBottomSheet(
        track: track,
        onCompleted: onCompleted,
      ),
    );
  }

  @override
  State<AudiobookPlayerBottomSheet> createState() => _AudiobookPlayerBottomSheetState();
}

class _AudiobookPlayerBottomSheetState extends State<AudiobookPlayerBottomSheet> {
  late final AudiobookService _audiobookService;
  late final AudioPlayer _justAudioPlayer;

  // اشتراكات التدفقات
  StreamSubscription<AudiobookPlaybackState>? _stateSub;
  StreamSubscription<int>? _sentenceSub;
  StreamSubscription<double>? _progressSub;
  StreamSubscription<Duration>? _justAudioPositionSub;

  // حالة المشغل
  bool _isPlaying = false;
  int _activeSentenceIndex = 0;
  double _progress = 0.0;
  double _playbackSpeed = 1.0;
  double _pitch = 1.0;
  bool _isUsingAudioFile = false;

  final ScrollController _scrollController = ScrollController();
  final List<GlobalKey> _sentenceKeys = [];

  @override
  void initState() {
    super.initState();
    _audiobookService = AudiobookService.instance;
    _justAudioPlayer = AudioPlayer();

    _playbackSpeed = widget.track.speed;
    _pitch = widget.track.pitch;

    final sentences = AudiobookService.splitTextIntoSentences(widget.track.plainText);
    for (int i = 0; i < sentences.length; i++) {
      _sentenceKeys.add(GlobalKey());
    }

    _setupListeners();
    _startPlayback();
  }

  void _setupListeners() {
    // 1. مراقبة حالة تشغيل محرك TTS
    _stateSub = _audiobookService.stateStream.listen((state) {
      if (!mounted) return;
      setState(() {
        _isPlaying = state == AudiobookPlaybackState.playing;
      });
      if (state == AudiobookPlaybackState.completed) {
        widget.onCompleted?.call();
      }
    });

    // 2. مراقبة التظليل الحي للجملة الحالية (Live Text Highlighting)
    _sentenceSub = _audiobookService.sentenceStream.listen((index) {
      if (!mounted) return;
      setState(() {
        _activeSentenceIndex = index;
      });
      _scrollToActiveSentence(index);
    });

    // 3. مراقبة شريط التقدم
    _progressSub = _audiobookService.progressStream.listen((prog) {
      if (!mounted) return;
      setState(() {
        _progress = prog;
      });
    });

    // 4. مراقبة just_audio عند توفر ملف صوتي مسجل مسبقاً
    _justAudioPositionSub = _justAudioPlayer.positionStream.listen((pos) {
      if (!mounted || !_isUsingAudioFile) return;
      final total = _justAudioPlayer.duration?.inMilliseconds ?? 1;
      if (total > 0) {
        setState(() {
          _progress = (pos.inMilliseconds / total).clamp(0.0, 1.0);
        });
      }
    });
  }

  Future<void> _startPlayback() async {
    // إذا كان هناك ملف صوتي مخصص متوفر في المسار، نستخدم just_audio
    if (widget.track.audioFilePath != null && widget.track.audioFilePath!.isNotEmpty) {
      try {
        _isUsingAudioFile = true;
        await _justAudioPlayer.setFilePath(widget.track.audioFilePath!);
        await _justAudioPlayer.setSpeed(_playbackSpeed);
        await _justAudioPlayer.play();
        setState(() => _isPlaying = true);
        return;
      } catch (e) {
        debugPrint('Falling back to TTS because just_audio file failed: $e');
        _isUsingAudioFile = false;
      }
    }

    // الاعتماد على محرك التوليد الحي العربي TTS مع التظليل المتزامن
    await _audiobookService.setSpeechRate(_playbackSpeed);
    await _audiobookService.setPitch(_pitch);
    await _audiobookService.playTrack(widget.track);
  }

  void _scrollToActiveSentence(int index) {
    if (index >= 0 && index < _sentenceKeys.length) {
      final key = _sentenceKeys[index];
      final context = key.currentContext;
      if (context != null) {
        Scrollable.ensureVisible(
          context,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeInOut,
          alignment: 0.35, // إبقاء الجملة في الثلث العلوي المريح للقراءة
        );
      }
    }
  }

  Future<void> _togglePlayPause() async {
    if (_isUsingAudioFile) {
      if (_isPlaying) {
        await _justAudioPlayer.pause();
        setState(() => _isPlaying = false);
      } else {
        await _justAudioPlayer.play();
        setState(() => _isPlaying = true);
      }
    } else {
      if (_isPlaying) {
        await _audiobookService.pause();
      } else {
        if (_audiobookService.playbackState == AudiobookPlaybackState.paused) {
          await _audiobookService.resume();
        } else {
          await _audiobookService.playTrack(widget.track, startSentence: _activeSentenceIndex);
        }
      }
    }
  }

  Future<void> _changeSpeed(double speed) async {
    setState(() => _playbackSpeed = speed);
    if (_isUsingAudioFile) {
      await _justAudioPlayer.setSpeed(speed);
    } else {
      await _audiobookService.setSpeechRate(speed);
    }
  }

  Future<void> _changePitch(double pitchVal) async {
    setState(() => _pitch = pitchVal);
    await _audiobookService.setPitch(pitchVal);
  }

  Future<void> _seekSentence(int index) async {
    if (_isUsingAudioFile) {
      final total = _justAudioPlayer.duration ?? widget.track.duration;
      final sentences = AudiobookService.splitTextIntoSentences(widget.track.plainText);
      if (sentences.isNotEmpty) {
        final targetMs = (total.inMilliseconds * (index / sentences.length)).round();
        await _justAudioPlayer.seek(Duration(milliseconds: targetMs));
      }
    } else {
      await _audiobookService.seekToSentence(index);
    }
  }

  @override
  void dispose() {
    _stateSub?.cancel();
    _sentenceSub?.cancel();
    _progressSub?.cancel();
    _justAudioPositionSub?.cancel();
    _scrollController.dispose();
    _justAudioPlayer.dispose();
    _audiobookService.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final sentences = AudiobookService.splitTextIntoSentences(widget.track.plainText);
    final screenHeight = MediaQuery.of(context).size.height;

    // حساب الوقت المنقضي تقريبياً
    final totalSeconds = widget.track.duration.inSeconds;
    final currentSeconds = (totalSeconds * _progress).round();
    final elapsedDuration = Duration(seconds: currentSeconds);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        height: screenHeight * 0.88,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 25,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        child: Column(
          children: [
            // مقبض السحب العلوي
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                width: 44,
                height: 4.5,
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),

            // ترويسة المشغل الصوتي
            _buildHeader(isDark),

            const Divider(height: 1),

            // شريط السرعة والنبرة
            _buildControlsQuickBar(isDark),

            // منطقة متن النص مع التظليل الحي (Live Text Highlighting)
            Expanded(
              child: sentences.isEmpty
                  ? _buildEmptyState(isDark)
                  : _buildLiveHighlightedText(sentences, isDark),
            ),

            const Divider(height: 1),

            // لوحة أزرار التحكم وشريط التقديم
            _buildPlayerBottomControls(elapsedDuration, sentences, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.amber.shade500.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.headphones_rounded, color: Colors.amber.shade800, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.track.chapterTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                Row(
                  children: [
                    Text(
                      'كتاب صوتي عربي (just_audio)',
                      style: TextStyle(
                        fontFamily: 'Tajawal',
                        fontSize: 11,
                        color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        widget.track.formattedDuration,
                        style: TextStyle(
                          fontFamily: 'Tajawal',
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.amber.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close_rounded),
            tooltip: 'إغلاق المشغل',
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }

  Widget _buildControlsQuickBar(bool isDark) {
    final speeds = [0.75, 1.0, 1.25, 1.5, 2.0];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: isDark ? const Color(0xFF242426) : const Color(0xFFF9FAFB),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(Icons.speed_rounded, size: 16, color: Colors.amber.shade800),
              const SizedBox(width: 6),
              const Text(
                'السرعة:',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 6),
              ...speeds.map((s) {
                final isSelected = (_playbackSpeed - s).abs() < 0.05;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(6),
                    onTap: () => _changeSpeed(s),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.amber.shade700 : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isSelected ? Colors.amber.shade700 : Colors.grey.shade400,
                          width: 0.8,
                        ),
                      ),
                      child: Text(
                        '${s}x',
                        style: TextStyle(
                          fontFamily: 'Tajawal',
                          fontSize: 10,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected ? Colors.white : (isDark ? Colors.grey.shade300 : Colors.grey.shade800),
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ],
          ),
          // نبرة الصوت
          Row(
            children: [
              Icon(Icons.graphic_eq_rounded, size: 16, color: Colors.amber.shade800),
              const SizedBox(width: 4),
              Text(
                'النبرة: ${_pitch.toStringAsFixed(1)}',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 11),
              ),
              PopupMenuButton<double>(
                tooltip: 'تغيير النبرة الصوتية',
                icon: const Icon(Icons.arrow_drop_down, size: 18),
                onSelected: _changePitch,
                itemBuilder: (ctx) => [
                  const PopupMenuItem(value: 0.8, child: Text('عميقة (0.8)', style: TextStyle(fontFamily: 'Cairo', fontSize: 12))),
                  const PopupMenuItem(value: 1.0, child: Text('طبيعية (1.0)', style: TextStyle(fontFamily: 'Cairo', fontSize: 12))),
                  const PopupMenuItem(value: 1.2, child: Text('حيوية (1.2)', style: TextStyle(fontFamily: 'Cairo', fontSize: 12))),
                  const PopupMenuItem(value: 1.4, child: Text('رفيعة (1.4)', style: TextStyle(fontFamily: 'Cairo', fontSize: 12))),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// مساحة عرض النصوص مع التظليل الحي (Live Text Highlighting)
  Widget _buildLiveHighlightedText(List<String> sentences, bool isDark) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      itemCount: sentences.length,
      itemBuilder: (context, index) {
        final sentence = sentences[index];
        final isActive = index == _activeSentenceIndex;
        final isPast = index < _activeSentenceIndex;

        return Padding(
          key: _sentenceKeys[index],
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => _seekSentence(index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isActive
                    ? Colors.amber.shade500.withOpacity(isDark ? 0.22 : 0.15)
                    : (isPast
                        ? (isDark ? Colors.transparent : Colors.grey.shade50.withOpacity(0.5))
                        : Colors.transparent),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isActive
                      ? Colors.amber.shade600
                      : Colors.transparent,
                  width: isActive ? 1.5 : 0,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // مؤشر الجملة النشطة / أيقونة الصوت
                  Container(
                    margin: const EdgeInsets.only(top: 3, left: 10),
                    child: isActive
                        ? Icon(
                            _isPlaying ? Icons.volume_up_rounded : Icons.pause_circle_filled_rounded,
                            size: 18,
                            color: Colors.amber.shade800,
                          )
                        : Text(
                            '${index + 1}',
                            style: TextStyle(
                              fontFamily: 'Tajawal',
                              fontSize: 11,
                              color: isPast ? Colors.grey.shade400 : Colors.grey.shade500,
                            ),
                          ),
                  ),
                  // نص الجملة
                  Expanded(
                    child: Text(
                      sentence,
                      textAlign: TextAlign.justify,
                      style: TextStyle(
                        fontFamily: 'Tajawal',
                        fontSize: isActive ? 15.5 : 14.5,
                        fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                        height: 1.85,
                        color: isActive
                            ? (isDark ? Colors.amber.shade200 : Colors.amber.shade900)
                            : (isPast
                                ? (isDark ? Colors.grey.shade500 : Colors.grey.shade600)
                                : (isDark ? Colors.grey.shade200 : Colors.grey.shade900)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.speaker_notes_off_outlined, size: 48, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          const Text(
            'لا يتوفر نص في هذا الفصل لتحويله إلى كتاب صوتي.',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 13),
          ),
        ],
      ),
    );
  }

  /// عناصر التحكم السفلية والشريط الزمني
  Widget _buildPlayerBottomControls(Duration elapsed, List<String> sentences, bool isDark) {
    final formatDuration = (Duration d) {
      final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
      final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
      return '$m:$s';
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E20) : Colors.white,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // شريط التقديم والتأخير (Seek Slider)
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 4,
              activeTrackColor: Colors.amber.shade700,
              inactiveTrackColor: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
              thumbColor: Colors.amber.shade800,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
            ),
            child: Slider(
              value: _progress.clamp(0.0, 1.0),
              onChanged: (val) {
                if (sentences.isNotEmpty) {
                  final targetIndex = (val * (sentences.length - 1)).round();
                  _seekSentence(targetIndex);
                }
              },
            ),
          ),

          // عدادات الوقت
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  formatDuration(elapsed),
                  style: TextStyle(fontFamily: 'Tajawal', fontSize: 11, color: Colors.grey.shade600),
                ),
                Text(
                  'الجملة ${_activeSentenceIndex + 1} من ${sentences.length}',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Colors.amber.shade800,
                  ),
                ),
                Text(
                  formatDuration(widget.track.duration),
                  style: TextStyle(fontFamily: 'Tajawal', fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),

          const SizedBox(height: 6),

          // أزرار التشغيل والتقديم
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // الجملة السابقة
              IconButton(
                icon: const Icon(Icons.skip_previous_rounded),
                iconSize: 28,
                tooltip: 'الجملة السابقة',
                onPressed: _activeSentenceIndex > 0
                    ? () => _seekSentence(_activeSentenceIndex - 1)
                    : null,
              ),

              const SizedBox(width: 8),

              // ترجيع 10 ثوانٍ / جملتين
              IconButton(
                icon: const Icon(Icons.replay_10_rounded),
                iconSize: 26,
                tooltip: 'تأخير 10 ثوانٍ',
                onPressed: () => _audiobookService.skipBackward(sentences: 2),
              ),

              const SizedBox(width: 14),

              // زر التشغيل والإيقاف المؤقت الرئيسي
              GestureDetector(
                onTap: _togglePlayPause,
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: Colors.amber.shade700,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.amber.shade700.withOpacity(0.35),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Icon(
                    _isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    size: 34,
                    color: Colors.white,
                  ),
                ),
              ),

              const SizedBox(width: 14),

              // تقديم 10 ثوانٍ / جملتين
              IconButton(
                icon: const Icon(Icons.forward_10_rounded),
                iconSize: 26,
                tooltip: 'تقديم 10 ثوانٍ',
                onPressed: () => _audiobookService.skipForward(sentences: 2),
              ),

              const SizedBox(width: 8),

              // الجملة التالية
              IconButton(
                icon: const Icon(Icons.skip_next_rounded),
                iconSize: 28,
                tooltip: 'الجملة التالية',
                onPressed: _activeSentenceIndex + 1 < sentences.length
                    ? () => _seekSentence(_activeSentenceIndex + 1)
                    : null,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
