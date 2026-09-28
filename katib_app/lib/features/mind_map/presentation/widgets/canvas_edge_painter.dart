import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../domain/entities/canvas_node.dart';
import '../../domain/entities/canvas_edge.dart';

/// رسام المسارات والروابط بين بطاقات السبورة الذهنية
/// يرسم خطوط منحنية سلسة (Smooth Bezier Curves) مع أسهم الاتجاه وتسميات العلاقات
class CanvasEdgePainter extends CustomPainter {
  final List<CanvasNode> nodes;
  final List<CanvasEdge> edges;
  final String? selectedNodeId;

  CanvasEdgePainter({
    required this.nodes,
    required this.edges,
    this.selectedNodeId,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final Map<String, CanvasNode> nodeMap = {
      for (final n in nodes) n.id: n,
    };

    for (final edge in edges) {
      final from = nodeMap[edge.fromNodeId];
      final to = nodeMap[edge.toNodeId];
      if (from == null || to == null) continue;

      final isHighlight = selectedNodeId == edge.fromNodeId || selectedNodeId == edge.toNodeId;

      // حساب مراكز العقد
      final p1 = Offset(from.dx + (from.width / 2), from.dy + (from.height / 2));
      final p2 = Offset(to.dx + (to.width / 2), to.dy + (to.height / 2));

      final color = _parseColor(edge.colorHex, isHighlight);

      final paint = Paint()
        ..color = color
        ..strokeWidth = isHighlight ? edge.strokeWidth + 1.5 : edge.strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      // رسم منحنى بيزيه سلس
      final controlPointOffset = (p2.dx - p1.dx) * 0.4;
      final path = Path();
      path.moveTo(p1.dx, p1.dy);
      path.cubicTo(
        p1.dx + controlPointOffset,
        p1.dy,
        p2.dx - controlPointOffset,
        p2.dy,
        p2.dx,
        p2.dy,
      );

      canvas.drawPath(path, paint);

      // رسم رأس السهم التفاعلي عند نهاية المسار (Arrow Head)
      final tangentAngle = math.atan2(p2.dy - (p2.dy), (p2.dx - (p2.dx - controlPointOffset)));
      final actualAngle = math.atan2(p2.dy - p1.dy, p2.dx - p1.dx);
      const arrowLength = 12.0;
      const arrowAngle = 26 * math.pi / 180;

      final arrowPath = Path();
      arrowPath.moveTo(p2.dx, p2.dy);
      arrowPath.lineTo(
        p2.dx - arrowLength * math.cos(actualAngle - arrowAngle),
        p2.dy - arrowLength * math.sin(actualAngle - arrowAngle),
      );
      arrowPath.lineTo(
        p2.dx - (arrowLength * 0.7) * math.cos(actualAngle),
        p2.dy - (arrowLength * 0.7) * math.sin(actualAngle),
      );
      arrowPath.lineTo(
        p2.dx - arrowLength * math.cos(actualAngle + arrowAngle),
        p2.dy - arrowLength * math.sin(actualAngle + arrowAngle),
      );
      arrowPath.close();

      canvas.drawPath(arrowPath, Paint()..color = color..style = PaintingStyle.fill);

      // رسم دائرة دلالية عند المنتصف أو التسمية
      final midPoint = Offset((p1.dx + p2.dx) / 2, (p1.dy + p2.dy) / 2);
      if (edge.label != null && edge.label!.isNotEmpty) {
        _drawLabel(canvas, midPoint, edge.label!, color);
      } else {
        canvas.drawCircle(
          midPoint,
          3.5,
          Paint()..color = color..style = PaintingStyle.fill,
        );
      }
    }
  }

  void _drawLabel(Canvas canvas, Offset center, String text, Color color) {
    final textSpan = TextSpan(
      text: text,
      style: const TextStyle(
        fontFamily: 'Tajawal',
        fontSize: 10,
        fontWeight: FontWeight.bold,
        color: Colors.white,
      ),
    );

    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.rtl,
    );
    textPainter.layout();

    final bgRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: center,
        width: textPainter.width + 14,
        height: textPainter.height + 6,
      ),
      const Radius.circular(8),
    );

    canvas.drawRRect(
      bgRect,
      Paint()..color = color.withOpacity(0.9)..style = PaintingStyle.fill,
    );

    textPainter.paint(
      canvas,
      Offset(center.dx - (textPainter.width / 2), center.dy - (textPainter.height / 2)),
    );
  }

  Color _parseColor(String hex, bool highlight) {
    try {
      final clean = hex.replaceAll('#', '');
      final val = int.parse('FF\$clean', radix: 16);
      final c = Color(val);
      return highlight ? Colors.amber : c;
    } catch (_) {
      return highlight ? Colors.amber : const Color(0xFF94A3B8);
    }
  }

  @override
  bool shouldRepaint(covariant CanvasEdgePainter oldDelegate) {
    return oldDelegate.nodes != nodes ||
        oldDelegate.edges != edges ||
        oldDelegate.selectedNodeId != selectedNodeId;
  }
}
