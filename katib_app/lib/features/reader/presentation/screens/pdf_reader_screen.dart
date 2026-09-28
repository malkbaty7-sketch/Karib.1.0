import 'package:flutter/material.dart';
import 'package:pdfx/pdfx.dart';

class PdfReaderScreen extends StatefulWidget {
  final String title;
  final String filePath;

  const PdfReaderScreen({
    super.key,
    required this.title,
    required this.filePath,
  });

  @override
  State<PdfReaderScreen> createState() => _PdfReaderScreenState();
}

class _PdfReaderScreenState extends State<PdfReaderScreen> {
  late PdfControllerPinch _pdfController;
  int _actualPageNumber = 1;
  int _allPagesCount = 0;

  @override
  void initState() {
    super.initState();
    _pdfController = PdfControllerPinch(
      document: PdfDocument.openFile(widget.filePath),
    );
  }

  @override
  void dispose() {
    _pdfController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            widget.title,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 18),
          ),
          actions: [
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  '$_actualPageNumber من $_allPagesCount',
                  style: const TextStyle(fontFamily: 'Tajawal', fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
        body: PdfViewPinch(
          controller: _pdfController,
          onDocumentLoaded: (document) {
            setState(() {
              _allPagesCount = document.pagesCount;
            });
          },
          onPageChanged: (page) {
            setState(() {
              _actualPageNumber = page;
            });
          },
          builders: PdfViewPinchBuilders<DefaultBuilderOptions>(
            options: const DefaultBuilderOptions(),
            documentLoaderBuilder: (_) => const Center(child: CircularProgressIndicator()),
            pageLoaderBuilder: (_) => const Center(child: CircularProgressIndicator()),
            errorBuilder: (_, error) => Center(
              child: Text(
                'خطأ في تحميل ملف PDF: $error',
                style: const TextStyle(fontFamily: 'Cairo'),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
