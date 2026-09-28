import React, { useState, useMemo, useRef } from 'react';
import { 
  Printer, 
  FileDown, 
  BookOpen, 
  Settings2, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Columns, 
  Layers, 
  Type, 
  FileText, 
  Share2, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Download,
  AlertCircle,
  Eye,
  Sliders,
  Code2,
  Copy,
  RotateCw,
  LayoutGrid
} from 'lucide-react';
import JSZip from 'jszip';
import { Book, Chapter, Citation } from '../types';

interface PublishingStudioScreenProps {
  book: Book;
  onBackToEditor: () => void;
}

export type PageSizeKey = 'a4' | 'a5' | 'b5' | 'letter';
export type MarginKey = 'default' | 'narrow' | 'wide';
export type NumberingStyleKey = 'arabic' | 'abjad' | 'circled' | 'pageOfTotal';
export type ExportFormatKey = 'pdf' | 'docx' | 'epub';
export type PreviewModeKey = 'interactive' | 'flutterPrinting' | 'code';

export const PublishingStudioScreen: React.FC<PublishingStudioScreenProps> = ({
  book,
  onBackToEditor,
}) => {
  // ===========================================================================
  // 1. خيارات لوحة التحكم الجانبية (Sidebar Control Panel Options)
  // ===========================================================================
  
  // أ. مقاس الصفحة: (A4, A5, B5, Letter)
  const [pageSize, setPageSize] = useState<PageSizeKey>('a4');

  // ب. اتجاه الهوامش: (افتراضي، ضيق، واسع)
  const [margin, setMargin] = useState<MarginKey>('default');

  // ج. نمط الترقيم: (أرقام عربية، حروف أبجدية، رقم داخل دائرة، صيغة 'الصفحة X من Y')
  const [numberingStyle, setNumberingStyle] = useState<NumberingStyleKey>('pageOfTotal');

  // د. تضمين الفهرس والمراجع: (مفاتيح تشغيل/إيقاف Switch Buttons)
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true);
  const [includeFootnotes, setIncludeFootnotes] = useState(true);
  const [includeCoverPage, setIncludeCoverPage] = useState(true);

  // خيارات إضافية للطباعة
  const [fontFamily, setFontFamily] = useState<'cairo' | 'tajawal' | 'amiri'>('cairo');
  const [lineSpacing, setLineSpacing] = useState<'normal' | 'relaxed' | 'loose'>('relaxed');
  const [showMarginGuides, setShowMarginGuides] = useState(false);

  // ===========================================================================
  // 2. خيارات شاشة المعاينة الحيّة (Live Preview Options)
  // ===========================================================================
  const [previewMode, setPreviewMode] = useState<PreviewModeKey>('interactive');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isSpreadMode, setIsSpreadMode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // ===========================================================================
  // 3. حالة التصدير ومؤشر التقدم (Export Modal & Progress State)
  // ===========================================================================
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormatKey>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');
  const [downloadReadyUrl, setDownloadReadyUrl] = useState<{ url: string; filename: string; sizeKb: number } | null>(null);

  // مواصفات مقاسات الصفحات
  const pageDimensions = useMemo(() => {
    switch (pageSize) {
      case 'a5':
        return { 
          name: 'A5', 
          desc: '148 × 210 مم (روايات وكتب الجيب المدمجة)', 
          widthMm: 148, 
          heightMm: 210, 
          aspectRatioClass: 'aspect-[148/210]',
          flutterConstant: 'PdfPageFormat.a5',
          cssPageSize: '148mm 210mm'
        };
      case 'b5':
        return { 
          name: 'B5', 
          desc: '176 × 250 مم (المقاس الفاخر للكتب والمراجع التراثية)', 
          widthMm: 176, 
          heightMm: 250, 
          aspectRatioClass: 'aspect-[176/250]',
          flutterConstant: 'PdfPageFormat.b5',
          cssPageSize: '176mm 250mm'
        };
      case 'letter':
        return { 
          name: 'Letter', 
          desc: '216 × 279 مم (المستندات والمراسلات القياسية)', 
          widthMm: 216, 
          heightMm: 279, 
          aspectRatioClass: 'aspect-[216/279]',
          flutterConstant: 'PdfPageFormat.letter',
          cssPageSize: 'letter'
        };
      case 'a4':
      default:
        return { 
          name: 'A4', 
          desc: '210 × 297 مم (المقاس الأكاديمي والكتب المرجعية الشائعة)', 
          widthMm: 210, 
          heightMm: 297, 
          aspectRatioClass: 'aspect-[210/297]',
          flutterConstant: 'PdfPageFormat.a4',
          cssPageSize: 'a4'
        };
    }
  }, [pageSize]);

  // مواصفات الهوامش
  const marginSpecs = useMemo(() => {
    switch (margin) {
      case 'narrow':
        return { 
          label: 'ضيق', 
          mm: 10, 
          desc: '10 مم (استغلال كامل لمساحة الصفحة والمحتوى الكثيف)', 
          previewPaddingClass: 'p-4 sm:p-5',
          guideInsetClass: 'inset-3 sm:inset-4',
          flutterMargin: '10 * PdfPageFormat.mm'
        };
      case 'wide':
        return { 
          label: 'واسع', 
          mm: 32, 
          desc: '32 مم (فخامة وهوامش رحبة للملاحظات والتعليقات)', 
          previewPaddingClass: 'p-8 sm:p-12',
          guideInsetClass: 'inset-8 sm:inset-10',
          flutterMargin: '32 * PdfPageFormat.mm'
        };
      case 'default':
      default:
        return { 
          label: 'افتراضي', 
          mm: 20, 
          desc: '20 مم (توازن كلاسيكي مناسب للطباعة والتجليد)', 
          previewPaddingClass: 'p-6 sm:p-8',
          guideInsetClass: 'inset-5 sm:inset-6',
          flutterMargin: '20 * PdfPageFormat.mm'
        };
    }
  }, [margin]);

  // دالة تحويل رقم الصفحة إلى النمط المختار
  const formatPageNumber = (current: number, total: number) => {
    switch (numberingStyle) {
      case 'arabic': {
        const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return String(current).split('').map(c => arabicDigits[parseInt(c, 10)] || c).join('');
      }
      case 'abjad': {
        const abjadLetters = [
          'أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي',
          'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر',
          'ش', 'ت', 'ث', 'خ', 'ذ', 'ض', 'ظ', 'غ'
        ];
        return abjadLetters[current - 1] || String(current);
      }
      case 'circled': {
        const circled = [
          '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
          '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'
        ];
        return circled[current - 1] || `(${current})`;
      }
      case 'pageOfTotal':
      default:
        return `الصفحة ${current} من ${total}`;
    }
  };

  // تجميع كل مراجع وهوامش الكتاب
  const allCitations = useMemo(() => {
    return book.chapters.flatMap(ch => 
      (ch.citations || []).map(c => ({ ...c, chapterTitle: ch.title, chapterId: ch.id }))
    );
  }, [book.chapters]);

  // هيكلية صفحات المعاينة الحية
  interface PreviewPage {
    id: string;
    type: 'cover' | 'toc' | 'chapter';
    title: string;
    chapterNumber?: number;
    paragraphs?: string[];
    citations?: Citation[];
  }

  // بناء صفحات الكتاب المتطابقة حياً مع خيارات الفهرس والغلاف والفصول
  const generatedPages: PreviewPage[] = useMemo(() => {
    const pages: PreviewPage[] = [];

    // 1. صفحة الغلاف الفاخرة (إذا تم تفعيلها)
    if (includeCoverPage) {
      pages.push({
        id: 'page-cover',
        type: 'cover',
        title: book.title,
      });
    }

    // 2. صفحة فهرس المحتويات (إذا تم تفعيلها)
    if (includeTableOfContents && book.chapters.length > 0) {
      pages.push({
        id: 'page-toc',
        type: 'toc',
        title: 'فهرس المحتويات',
      });
    }

    // 3. صفحات الفصول
    book.chapters.forEach((ch, idx) => {
      const rawText = ch.plainText || ch.content || '';
      const paragraphs = rawText.split('\n').map(p => p.trim()).filter(p => p.length > 0);

      pages.push({
        id: `page-chapter-${ch.id || idx}`,
        type: 'chapter',
        title: ch.title,
        chapterNumber: idx + 1,
        paragraphs: paragraphs.length > 0 ? paragraphs : ['(لا يوجد محتوى في هذا الفصل بعد، يمكنك كتابة نصوص الفصل في محرر الكتب)'],
        citations: ch.citations || [],
      });
    });

    return pages;
  }, [book, includeCoverPage, includeTableOfContents]);

  // معالجة فهرس الصفحة الحالية مع حماية الحدود
  const safePageIndex = Math.min(currentPageIndex, Math.max(0, generatedPages.length - 1));
  const currentPage = generatedPages[safePageIndex];
  const secondPage = isSpreadMode && safePageIndex + 1 < generatedPages.length ? generatedPages[safePageIndex + 1] : null;

  // فئة الخط المعتمد
  const fontClass = useMemo(() => {
    switch (fontFamily) {
      case 'tajawal':
        return 'font-tajawal';
      case 'amiri':
        return 'font-amiri';
      case 'cairo':
      default:
        return 'font-cairo';
    }
  }, [fontFamily]);

  // فئة تباعد الأسطر
  const lineSpacingClass = useMemo(() => {
    switch (lineSpacing) {
      case 'normal':
        return 'leading-normal';
      case 'loose':
        return 'leading-loose';
      case 'relaxed':
      default:
        return 'leading-relaxed';
    }
  }, [lineSpacing]);

  // دالة مساعدة لتشفير XML
  const xmlEscape = (str: string) => {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // ===========================================================================
  // دالة تصدير الكتاب مع مؤشر التقدم متعدد المراحل
  // ===========================================================================
  const handleStartExport = async () => {
    setIsExporting(true);
    setExportProgress(12);
    setExportStatusText('تهيئة محرك النشر ومعالجة نصوص وفصول الكتاب...');
    setDownloadReadyUrl(null);

    await new Promise(r => setTimeout(r, 450));
    setExportProgress(38);
    setExportStatusText(`تطبيق إعدادات المقاس (${pageDimensions.name}) والهوامش (${marginSpecs.label})...`);

    await new Promise(r => setTimeout(r, 500));
    setExportProgress(65);
    setExportStatusText(`توليد الترقيم (${numberingStyle}) ومصفوفة الهوامش والمراجع...`);

    await new Promise(r => setTimeout(r, 550));
    setExportProgress(88);
    setExportStatusText('تجميع وتغليف بنية المستند والأرشيف القياسي...');

    try {
      const font = fontFamily === 'cairo' ? 'Cairo' : fontFamily === 'tajawal' ? 'Tajawal' : 'Amiri';
      const safeTitle = (book.title || 'كتاب').replace(/[/\\?%*:|"<>]/g, '_');

      if (exportFormat === 'pdf') {
        // إنشاء مستند الطباعة عالي الدقة HTML/PDF
        await new Promise(r => setTimeout(r, 300));
        let html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>${xmlEscape(book.title)} - كاتب</title>
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
@page { 
  size: ${pageDimensions.cssPageSize}; 
  margin: ${marginSpecs.mm}mm; 
}
body { 
  font-family: '${font}', serif, sans-serif; 
  direction: rtl; 
  line-height: ${lineSpacing === 'loose' ? '2.1' : lineSpacing === 'normal' ? '1.6' : '1.85'}; 
  color: #1c1917; 
  background: #fff;
  margin: 0;
  padding: 0;
}
.page-break { 
  page-break-after: always; 
  break-after: page; 
  min-height: 90vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.cover-page { 
  border: 4px double #b45309; 
  border-radius: 8px; 
  padding: 32px; 
  text-align: center; 
  justify-content: space-between;
}
.toc-title { text-align: center; border-bottom: 2px solid #b45309; padding-bottom: 12px; margin-bottom: 24px; }
.toc-item { display: flex; justify-content: space-between; border-bottom: 1px dotted #a8a29e; padding: 8px 0; font-size: 11pt; }
.chapter-header { border-bottom: 1px solid #f59e0b; padding-bottom: 8px; margin-bottom: 20px; }
.chapter-num { font-size: 11pt; color: #b45309; font-weight: bold; }
.chapter-title { font-size: 18pt; margin: 4px 0 0 0; color: #451a03; }
.paragraph { text-align: justify; text-indent: 24px; margin-bottom: 14px; font-size: 11pt; }
.footnotes { margin-top: 30px; border-top: 1px solid #d6d3d1; padding-top: 10px; font-size: 9.5pt; color: #444; }
.footnote-item { margin-bottom: 6px; }
.footer-num { text-align: center; font-size: 9pt; color: #78716c; border-top: 1px solid #e7e5e4; padding-top: 8px; margin-top: 24px; }
</style></head><body>`;

        if (includeCoverPage) {
          html += `<div class="page-break cover-page">
            <div>
              <span style="display:inline-block; padding:4px 16px; background:#fef3c7; color:#92400e; border-radius:20px; font-size:10pt; font-weight:bold;">${xmlEscape(book.category || 'مصنف كتابي')}</span>
              <p style="font-size:10pt; color:#78716c; margin-top:8px;">منصة كاتب للنشر الذكي</p>
            </div>
            <div>
              <h1 style="font-size:26pt; margin:0 0 12px 0; color:#451a03;">${xmlEscape(book.title)}</h1>
              <h3 style="font-size:14pt; color:#57534e; margin:0;">تأليف: ${xmlEscape(book.author || 'الكاتب')}</h3>
            </div>
            <div style="font-size:9.5pt; color:#78716c;">
              <p>عدد الفصول: ${book.chapters.length} • الكلمات: ${book.wordCount} كلمة</p>
              <p>طبعة نشر معتمدة وفق مقاس ${pageDimensions.name}</p>
            </div>
          </div>`;
        }

        if (includeTableOfContents) {
          html += `<div class="page-break">
            <div>
              <div class="toc-title"><h2 style="margin:0; color:#451a03;">فهرس المحتويات</h2></div>`;
          book.chapters.forEach((c, i) => {
            html += `<div class="toc-item">
              <span>الفصل ${i + 1}: ${xmlEscape(c.title)}</span>
              <span>${c.wordCount} كلمة</span>
            </div>`;
          });
          html += `</div><div class="footer-num">${formatPageNumber(includeCoverPage ? 2 : 1, generatedPages.length)}</div></div>`;
        }

        book.chapters.forEach((c, i) => {
          const pageNum = (includeCoverPage ? 1 : 0) + (includeTableOfContents ? 1 : 0) + i + 1;
          html += `<div class="page-break"><div>
            <div class="chapter-header">
              <span class="chapter-num">الفصل ${i + 1}</span>
              <h2 class="chapter-title">${xmlEscape(c.title)}</h2>
            </div>`;

          (c.plainText || c.content || '').split('\n').filter(p => p.trim()).forEach(p => {
            html += `<p class="paragraph">${xmlEscape(p)}</p>`;
          });

          if (includeFootnotes && c.citations && c.citations.length > 0) {
            html += `<div class="footnotes"><b>الهوامش والمراجع المستخرجة:</b><br/>`;
            c.citations.forEach((cit, ci) => {
              html += `<div class="footnote-item">(${ci + 1}) «${xmlEscape(cit.excerpt)}» — ${xmlEscape(cit.author)}، ص ${cit.pageNumber}.</div>`;
            });
            html += `</div>`;
          }

          html += `</div><div class="footer-num">${formatPageNumber(pageNum, generatedPages.length)}</div></div>`;
        });

        html += `</body></html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const sizeEstimateKb = Math.max(1, Math.round(blob.size / 1024));
        setDownloadReadyUrl({ url, filename: `${safeTitle}_جاهز_للطباعة_PDF.html`, sizeKb: sizeEstimateKb });

      } else if (exportFormat === 'docx') {
        // توليد ملف Microsoft Word (.docx) قياسي متوافق مع معايير OpenXML
        const zip = new JSZip();
        zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
        zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);

        let docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>`;

        if (includeCoverPage) {
          docXml += `<w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="60"/><w:color w:val="92400E"/></w:rPr><w:t>${xmlEscape(book.title)}</w:t></w:r></w:p>`;
          docXml += `<w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="32"/></w:rPr><w:t>تأليف: ${xmlEscape(book.author || 'الكاتب')}</w:t></w:r></w:p>`;
          docXml += `<w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:color w:val="78716C"/></w:rPr><w:t>منصة كاتب • مقاس ${pageDimensions.name}</w:t></w:r></w:p>`;
          docXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
        }

        if (includeTableOfContents) {
          docXml += `<w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="92400E"/></w:rPr><w:t>فهرس المحتويات</w:t></w:r></w:p>`;
          book.chapters.forEach((ch, idx) => {
            docXml += `<w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>الفصل ${idx + 1}: ${xmlEscape(ch.title)} (${ch.wordCount} كلمة)</w:t></w:r></w:p>`;
          });
          docXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
        }

        book.chapters.forEach((ch, idx) => {
          docXml += `<w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="92400E"/></w:rPr><w:t>الفصل ${idx + 1}: ${xmlEscape(ch.title)}</w:t></w:r></w:p>`;
          (ch.plainText || ch.content || '').split('\n').filter(p => p.trim()).forEach(p => {
            docXml += `<w:p><w:pPr><w:bidi/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>${xmlEscape(p)}</w:t></w:r></w:p>`;
          });
          if (includeFootnotes && ch.citations && ch.citations.length > 0) {
            docXml += `<w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="92400E"/></w:rPr><w:t>الهوامش والمراجع:</w:t></w:r></w:p>`;
            ch.citations.forEach((cit, ci) => {
              docXml += `<w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="57534E"/></w:rPr><w:t>(${ci + 1}) «${xmlEscape(cit.excerpt)}» — ${xmlEscape(cit.author)}، ص ${cit.pageNumber}.</w:t></w:r></w:p>`;
            });
          }
          if (idx < book.chapters.length - 1) {
            docXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
          }
        });

        docXml += `<w:sectPr><w:bidi/></w:sectPr></w:body></w:document>`;
        zip.file('word/document.xml', docXml);

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const sizeEstimateKb = Math.max(1, Math.round(blob.size / 1024));
        setDownloadReadyUrl({ url, filename: `${safeTitle}.docx`, sizeKb: sizeEstimateKb });

      } else {
        // توليد ملف الكتاب الرقمي القياسي ePub 3.0
        const zip = new JSZip();
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        zip.file('META-INF/container.xml', `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
        
        let manifestItems = `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`;
        let spineItems = `<itemref idref="nav"/>`;

        book.chapters.forEach((ch, idx) => {
          manifestItems += `<item id="ch${idx + 1}" href="chapter_${idx + 1}.xhtml" media-type="application/xhtml+xml"/>`;
          spineItems += `<itemref idref="ch${idx + 1}"/>`;
          
          let chHtml = `<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl"><head><title>${xmlEscape(ch.title)}</title><style>body{font-family:sans-serif;direction:rtl;line-height:1.8;padding:20px;}h2{color:#92400e;}p{text-align:justify;text-indent:20px;}</style></head><body><h2>الفصل ${idx + 1}: ${xmlEscape(ch.title)}</h2>`;
          (ch.plainText || ch.content || '').split('\n').filter(p => p.trim()).forEach(p => {
            chHtml += `<p>${xmlEscape(p)}</p>`;
          });
          chHtml += `</body></html>`;
          zip.file(`OEBPS/chapter_${idx + 1}.xhtml`, chHtml);
        });

        zip.file('OEBPS/content.opf', `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" dir="rtl"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xmlEscape(book.title)}</dc:title><dc:creator>${xmlEscape(book.author || 'الكاتب')}</dc:creator><dc:language>ar</dc:language></metadata><manifest>${manifestItems}</manifest><spine page-progression-direction="rtl">${spineItems}</spine></package>`);
        zip.file('OEBPS/nav.xhtml', `<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ar" dir="rtl"><head><title>فهرس</title></head><body><nav epub:type="toc"><h1>${xmlEscape(book.title)}</h1><ol>${book.chapters.map((c, i) => `<li><a href="chapter_${i + 1}.xhtml">${xmlEscape(c.title)}</a></li>`).join('')}</ol></nav></body></html>`);

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const sizeEstimateKb = Math.max(1, Math.round(blob.size / 1024));
        setDownloadReadyUrl({ url, filename: `${safeTitle}.epub`, sizeKb: sizeEstimateKb });
      }

      setExportProgress(100);
      setExportStatusText('اكتمل تجهيز الملف بنجاح! جاهز للتنزيل المباشر.');
    } catch (e) {
      console.error(e);
      setExportStatusText('حدث خطأ أثناء معالجة الملف. يرجى المحاولة ثانية.');
    } finally {
      setIsExporting(false);
    }
  };

  // تنزيل الملف المباشر
  const triggerDirectDownload = () => {
    if (!downloadReadyUrl) return;
    const a = document.createElement('a');
    a.href = downloadReadyUrl.url;
    a.download = downloadReadyUrl.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // تشغيل نافذة الطباعة المباشرة عبر المتصفح
  const triggerBrowserPrint = () => {
    window.print();
  };

  // توليد كود Flutter لحزمة printing متزامناً بدقة مع الإعدادات
  const flutterPrintingCode = useMemo(() => {
    return `// ============================================================================
// استوديو النشر ومعاينة الـ PDF في Flutter باستخدام حزمة printing
// pubspec.yaml dependencies:
//   pdf: ^3.10.8
//   printing: ^5.13.0
// ============================================================================

import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class KatibPublishingStudioPreview extends StatelessWidget {
  final BookEntity book;

  const KatibPublishingStudioPreview({Key? key, required this.book}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('معاينة طباعة الكتاب (Live PDF Preview)'),
        backgroundColor: const Color(0xFF92400E),
      ),
      body: PdfPreview(
        // إعداد مقاس الصفحة وهوامش الطباعة المحددة
        initialPageFormat: ${pageDimensions.flutterConstant},
        canChangePageFormat: false,
        canChangeOrientation: false,
        pdfFileName: '\${book.title}_katib.pdf',
        
        // بناء مستند الـ PDF حياً فور تعديل الخيارات
        build: (PdfPageFormat format) async {
          return await generateBookDocument(
            book: book,
            pageFormat: ${pageDimensions.flutterConstant},
            marginMm: ${marginSpecs.flutterMargin},
            numberingFormat: '${numberingStyle}',
            includeToc: ${includeTableOfContents},
            includeFootnotes: ${includeFootnotes},
            includeCover: ${includeCoverPage},
            fontFamily: '${fontFamily}',
          );
        },
      ),
    );
  }

  // مولد المستند الطباعي pw.Document
  Future<Uint8List> generateBookDocument({
    required BookEntity book,
    required PdfPageFormat pageFormat,
    required double marginMm,
    required String numberingFormat,
    required bool includeToc,
    required bool includeFootnotes,
    required bool includeCover,
    required String fontFamily,
  }) async {
    final doc = pw.Document();
    
    // تحميل الخط العربي المعتمد (Cairo / Tajawal / Amiri)
    final arabicFont = await PdfGoogleFonts.${fontFamily === 'cairo' ? 'cairoRegular' : fontFamily === 'tajawal' ? 'tajawalRegular' : 'amiriRegular'}();
    final arabicBoldFont = await PdfGoogleFonts.${fontFamily === 'cairo' ? 'cairoBold' : fontFamily === 'tajawal' ? 'tajawalBold' : 'amiriBold'}();

    // 1. صفحة الغلاف
    if (includeCover) {
      doc.addPage(
        pw.Page(
          pageFormat: pageFormat,
          margin: pw.EdgeInsets.all(marginMm),
          textDirection: pw.TextDirection.rtl,
          build: (pw.Context context) => pw.Center(
            child: pw.Column(
              mainAxisAlignment: pw.MainAxisAlignment.center,
              children: [
                pw.Text(book.title, style: pw.TextStyle(font: arabicBoldFont, fontSize: 28)),
                pw.SizedBox(height: 12),
                pw.Text('تأليف: \${book.author}', style: pw.TextStyle(font: arabicFont, fontSize: 16)),
              ],
            ),
          ),
        ),
      );
    }

    // 2. الفهرس والفصول
    for (var i = 0; i < book.chapters.length; i++) {
      final ch = book.chapters[i];
      doc.addPage(
        pw.Page(
          pageFormat: pageFormat,
          margin: pw.EdgeInsets.all(marginMm),
          textDirection: pw.TextDirection.rtl,
          build: (pw.Context context) => pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('الفصل \${i + 1}: \${ch.title}', style: pw.TextStyle(font: arabicBoldFont, fontSize: 18)),
              pw.SizedBox(height: 10),
              pw.Text(ch.plainText, style: pw.TextStyle(font: arabicFont, fontSize: 12)),
            ],
          ),
        ),
      );
    }

    return doc.save();
  }
}`;
  }, [pageDimensions, marginSpecs, numberingStyle, includeTableOfContents, includeFootnotes, includeCoverPage, fontFamily, book]);

  // نسخ كود فلاتر
  const handleCopyCode = () => {
    navigator.clipboard.writeText(flutterPrintingCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-100 dark:bg-stone-950 font-cairo overflow-hidden" dir="rtl">
      
      {/* =====================================================================
          1. شريط الأدوات العلوي (Header Toolbar)
         ===================================================================== */}
      <header className="h-14 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 flex items-center justify-between shrink-0 shadow-xs z-20">
        
        {/* اليمين: زر العودة للمحرر + عنوان الاستوديو */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEditor}
            className="flex items-center gap-1 text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للمحرر</span>
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  استوديو التصدير والنشر الحي
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-normal">
                  حزمة printing
                </span>
              </div>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 font-tajawal hidden md:block">
                معاينة مباشرة ومطابقة فورية للتصميم مع خيارات المقاس والهوامش والترقيم
              </p>
            </div>
          </div>
        </div>

        {/* المنتصف: محدد نمط العرض (المعاينة الحية / محاكي printing / كود Flutter) */}
        <div className="hidden sm:flex items-center bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold">
          <button
            onClick={() => setPreviewMode('interactive')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              previewMode === 'interactive' 
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs' 
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>المعاينة الحية</span>
          </button>

          <button
            onClick={() => setPreviewMode('flutterPrinting')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              previewMode === 'flutterPrinting' 
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs' 
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>محاكي printing (PdfPreview)</span>
          </button>

          <button
            onClick={() => setPreviewMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              previewMode === 'code' 
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs' 
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>أكواد Flutter</span>
          </button>
        </div>

        {/* اليسار: أدوات التكبير + زر تصدير الكتاب الأساسي */}
        <div className="flex items-center gap-2">
          
          {/* شريط التحكم بالتقريب Zoom */}
          <div className="hidden md:flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-stone-600 dark:text-stone-300 text-xs">
            <button
              onClick={() => setZoomLevel(z => Math.max(60, z - 10))}
              className="p-1 hover:bg-white dark:hover:bg-stone-700 rounded-md transition-colors"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-mono font-bold text-[11px]">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(z => Math.min(140, z + 10))}
              className="p-1 hover:bg-white dark:hover:bg-stone-700 rounded-md transition-colors"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* تبديل عرض صفحتين متقابلتين Spread Mode */}
          <button
            onClick={() => setIsSpreadMode(s => !s)}
            className={`p-2 rounded-xl text-xs font-bold border transition-colors hidden lg:flex items-center gap-1 ${
              isSpreadMode 
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-800 dark:text-amber-300' 
                : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
            title="تبديل وضع العرض: صفحة مفردة أو صفحتين متقابلتين"
          >
            <Columns className="w-4 h-4" />
          </button>

          {/* إظهار حدود الهوامش للطباعة */}
          <button
            onClick={() => setShowMarginGuides(v => !v)}
            className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
              showMarginGuides 
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-800 dark:text-amber-300' 
                : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
            title="إظهار/إخفاء حدود الهوامش للطباعة"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* زر طباعة المتصفح السريعة */}
          <button
            onClick={triggerBrowserPrint}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold transition-colors hidden sm:block"
            title="طباعة مباشرة أو حفظ كـ PDF عبر المتصفح"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* زر تصدير الكتاب المطلوب في السؤال */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>تصدير الكتاب</span>
          </button>

        </div>

      </header>

      {/* =====================================================================
          2. مساحة العمل الرئيسية (Sidebar + Main Preview Canvas)
         ===================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ===================================================================
            لوحة التحكم الجانبية (Sidebar Control Panel)
           =================================================================== */}
        <aside className="w-80 lg:w-88 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-y-auto shrink-0 p-5 space-y-6 shadow-xs select-none">
          
          {/* إشعار التزامن الحي الفوري */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-300 font-medium">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
            <span>المعاينة الحية تطابق اختياراتك فوراً في شاشة العرض.</span>
          </div>

          {/* -----------------------------------------------------------------
              1. مقاس الصفحة: (A4, A5, B5, Letter)
             ----------------------------------------------------------------- */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span>مقاس الصفحة:</span>
              </label>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 font-mono">
                {pageDimensions.name} ({pageDimensions.widthMm}×{pageDimensions.heightMm} مم)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'a4', name: 'A4', sub: '210×297 مم', tag: 'أكاديمي' },
                { key: 'a5', name: 'A5', sub: '148×210 مم', tag: 'روايات وجيب' },
                { key: 'b5', name: 'B5', sub: '176×250 مم', tag: 'كتب فاخرة' },
                { key: 'letter', name: 'Letter', sub: '216×279 مم', tag: 'مكتبي' },
              ].map(opt => {
                const isSelected = pageSize === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPageSize(opt.key as PageSizeKey)}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-500/10 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/30 font-bold'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs">{opt.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                        {opt.tag}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono mt-1">
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-tajawal">
              {pageDimensions.desc}
            </p>
          </section>

          <hr className="border-stone-200 dark:border-stone-800" />

          {/* -----------------------------------------------------------------
              2. اتجاه الهوامش: (افتراضي، ضيق، واسع)
             ----------------------------------------------------------------- */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span>اتجاه الهوامش:</span>
              </label>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 font-mono">
                {marginSpecs.label} ({marginSpecs.mm} مم)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'default', label: 'افتراضي', mm: '20 مم', tag: 'متوازن' },
                { key: 'narrow', label: 'ضيق', mm: '10 مم', tag: 'مكثف' },
                { key: 'wide', label: 'واسع', mm: '32 مم', tag: 'هوامش رحبة' },
              ].map(m => {
                const isSelected = margin === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMargin(m.key as MarginKey)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-500/10 text-amber-900 dark:text-amber-300 font-bold ring-2 ring-amber-500/20'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{m.label}</div>
                    <div className="text-[10px] font-mono text-stone-400">{m.mm}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-tajawal">
              {marginSpecs.desc}
            </p>
          </section>

          <hr className="border-stone-200 dark:border-stone-800" />

          {/* -----------------------------------------------------------------
              3. نمط الترقيم: (أرقام عربية، حروف أبجدية، رقم داخل دائرة، صيغة 'الصفحة X من Y')
             ----------------------------------------------------------------- */}
          <section className="space-y-2.5">
            <label className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span>نمط الترقيم:</span>
            </label>

            <div className="space-y-1.5">
              {[
                { key: 'arabic', title: 'أرقام عربية مشرقية', example: '١، ٢، ٣، ٤، ٥...' },
                { key: 'abjad', title: 'حروف أبجدية', example: 'أ، ب، ج، د، هـ...' },
                { key: 'circled', title: 'رقم داخل دائرة', example: '①، ②، ③، ④، ⑤...' },
                { key: 'pageOfTotal', title: "صيغة 'الصفحة X من Y'", example: "الصفحة ٣ من ٢٤" },
              ].map(style => {
                const isSelected = numberingStyle === style.key;
                return (
                  <label
                    key={style.key}
                    onClick={() => setNumberingStyle(style.key as NumberingStyleKey)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-500/10 text-amber-900 dark:text-amber-300 font-bold ring-1 ring-amber-500/20'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-400'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs">{style.title}</span>
                    </div>
                    <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                      {style.example}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <hr className="border-stone-200 dark:border-stone-800" />

          {/* -----------------------------------------------------------------
              4. تضمين الفهرس والمراجع: (مفاتيح تشغيل/إيقاف Switch Buttons)
             ----------------------------------------------------------------- */}
          <section className="space-y-3">
            <label className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span>تضمين الفهرس والمراجع:</span>
            </label>

            <div className="space-y-2.5 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
              
              {/* Switch 1: فهرس المحتويات (TOC) */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    فهرس المحتويات الآلي
                  </div>
                  <div className="text-[11px] text-stone-500 font-tajawal">
                    توليد جدول الفصول وأرقام الصفحات
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeTableOfContents(v => !v)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    includeTableOfContents ? 'bg-amber-600' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                  aria-label="تضمين الفهرس"
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    includeTableOfContents ? '-translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="h-px bg-stone-200 dark:bg-stone-700/60" />

              {/* Switch 2: توثيق الهوامش والمراجع (Citations / Footnotes) */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <span>توثيق الهوامش والمراجع</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                      {allCitations.length} مرجع
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-tajawal">
                    حواشي سفلية منسوبة في ذيل كل صفحة
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeFootnotes(v => !v)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    includeFootnotes ? 'bg-amber-600' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                  aria-label="تضمين المراجع"
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    includeFootnotes ? '-translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="h-px bg-stone-200 dark:bg-stone-700/60" />

              {/* Switch 3: صفحة الغلاف الفاخرة */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    صفحة الغلاف الفاخرة
                  </div>
                  <div className="text-[11px] text-stone-500 font-tajawal">
                    واجهة مزخرفة مع بيانات المؤلف والتصنيف
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeCoverPage(v => !v)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    includeCoverPage ? 'bg-amber-600' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                  aria-label="تضمين صفحة الغلاف"
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    includeCoverPage ? '-translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>
          </section>

          <hr className="border-stone-200 dark:border-stone-800" />

          {/* -----------------------------------------------------------------
              5. الخط العربي وخصائص الإخراج الطباعي
             ----------------------------------------------------------------- */}
          <section className="space-y-3">
            <label className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-amber-600" />
              <span>الخط العربي وتنسيق الطباعة:</span>
            </label>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: 'cairo', name: 'كـايرو', sub: 'حديث وواضح' },
                { key: 'tajawal', name: 'تـجـوال', sub: 'سلس للرواية' },
                { key: 'amiri', name: 'أمـيري', sub: 'تراثي وفاخر' },
              ].map(f => {
                const isSelected = fontFamily === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFontFamily(f.key as any)}
                    className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-500/10 text-amber-900 dark:text-amber-300 font-bold'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{f.name}</div>
                    <div className="text-[9px] text-stone-400 mt-0.5">{f.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* تباعد الأسطر */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-stone-600 dark:text-stone-400">تباعد الأسطر:</span>
              <div className="flex items-center gap-1">
                {[
                  { key: 'normal', label: 'عادي' },
                  { key: 'relaxed', label: 'مريح' },
                  { key: 'loose', label: 'رحب' },
                ].map(sp => (
                  <button
                    key={sp.key}
                    onClick={() => setLineSpacing(sp.key as any)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      lineSpacing === sp.key 
                        ? 'bg-amber-600 text-white' 
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600'
                    }`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* زر التصدير في أسفل الشريط الجانبي */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>تصدير الكتاب (PDF / DOCX / EPUB)</span>
          </button>

        </aside>

        {/* ===================================================================
            شاشة المعاينة الحيّة (Live Preview Canvas / Stage)
           =================================================================== */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-between bg-stone-200/70 dark:bg-stone-950/80 relative">
          
          {/* شريط معلومات الصفحة والتنقل العلوي للمعاينة */}
          <div className="w-full max-w-3xl flex items-center justify-between mb-4 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs text-xs">
            
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-800 dark:text-stone-200">
                {currentPage?.type === 'cover' ? 'صفحة الغلاف' : currentPage?.type === 'toc' ? 'فهرس المحتويات' : `الفصل ${currentPage?.chapterNumber}: ${currentPage?.title}`}
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                {pageDimensions.name} • {marginSpecs.label} ({marginSpecs.mm}mm)
              </span>
            </div>

            {/* أدوات تقليب الصفحات السريعة */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
                disabled={safePageIndex === 0}
                className="p-1 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
                title="الصفحة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="font-bold text-stone-700 dark:text-stone-300 font-tajawal min-w-24 text-center">
                {safePageIndex + 1} / {generatedPages.length}
              </span>

              <button
                onClick={() => setCurrentPageIndex(p => Math.min(generatedPages.length - 1, p + 1))}
                disabled={safePageIndex === generatedPages.length - 1}
                className="p-1 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
                title="الصفحة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* -----------------------------------------------------------------
              الحالة 1: المعاينة التفاعلية لمطابقة التصميم فور تعديل الخيارات
             ----------------------------------------------------------------- */}
          {previewMode === 'interactive' && (
            <div 
              style={{ 
                transform: `scale(${zoomLevel / 100})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out'
              }}
              className={`w-full max-w-2xl my-auto ${isSpreadMode ? 'max-w-4xl flex items-center justify-center gap-4' : ''}`}
            >
              
              {/* الصفحة الأولى / الفردية */}
              <div 
                className={`w-full bg-white text-stone-900 shadow-2xl rounded-sm border border-stone-300 relative flex flex-col justify-between select-text ${pageDimensions.aspectRatioClass} ${marginSpecs.previewPaddingClass} ${fontClass} ${lineSpacingClass}`}
                style={{
                  boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  minHeight: '620px',
                }}
              >
                {/* دليل الهوامش المرئي عند تفعيله */}
                {showMarginGuides && (
                  <div 
                    className={`absolute ${marginSpecs.guideInsetClass} border-2 border-dashed border-amber-500/50 pointer-events-none rounded-xs flex items-start justify-end p-1 z-10`}
                  >
                    <span className="text-[9px] font-mono text-amber-800 bg-amber-100/90 px-1 rounded shadow-xs">
                      هامش {marginSpecs.mm} مم
                    </span>
                  </div>
                )}

                {/* 1. صفحة الغلاف */}
                {currentPage?.type === 'cover' && (
                  <div className="h-full flex flex-col justify-between items-center text-center py-6 px-4 border-4 border-double border-amber-800/80 rounded-sm">
                    <div>
                      <div className="inline-block px-4 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                        {book.category || 'مصنف أدبي وفكري'}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-2 font-tajawal">
                        منصة كـاتـب للنشر والتأليف
                      </p>
                    </div>

                    <div className="space-y-4 my-auto">
                      <div className="w-16 h-0.5 bg-amber-800 mx-auto" />
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-950 leading-tight">
                        {book.title}
                      </h1>
                      <p className="text-sm sm:text-base font-bold text-stone-700">
                        تأليف: {book.author || 'الكاتب'}
                      </p>
                      <div className="w-16 h-0.5 bg-amber-800 mx-auto" />
                    </div>

                    <div className="text-[11px] text-stone-500 font-tajawal space-y-1">
                      <p>عدد الفصول: {book.chapters.length} فصول • مجموع الكلمات: {book.wordCount} كلمة</p>
                      <p className="text-[10px] text-stone-400">طبعة طباعية معتمدة وفق مقاس {pageDimensions.name}</p>
                    </div>
                  </div>
                )}

                {/* 2. صفحة الفهرس */}
                {currentPage?.type === 'toc' && (
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      <div className="text-center pb-4 mb-6 border-b-2 border-amber-800">
                        <h2 className="text-xl font-extrabold text-amber-950">فـهـرس الـمـحـتـويـات</h2>
                        <div className="w-12 h-1 bg-amber-600 mx-auto mt-2 rounded-full" />
                      </div>

                      <div className="space-y-3">
                        {book.chapters.map((ch, idx) => (
                          <div key={ch.id || idx} className="flex items-baseline justify-between text-xs py-1">
                            <div className="font-bold text-stone-800">
                              الفصل {idx + 1}: {ch.title}
                            </div>
                            <div className="flex-1 mx-3 border-b border-dotted border-stone-400" />
                            <div className="font-mono text-stone-500 text-[11px]">
                              {ch.wordCount} كلمة
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* الترقيم السفلي المتزامن بالنمط المختار */}
                    <div className="text-center text-[11px] text-stone-500 font-semibold border-t border-stone-200 pt-3">
                      {formatPageNumber(safePageIndex + 1, generatedPages.length)}
                    </div>
                  </div>
                )}

                {/* 3. صفحات الفصول */}
                {currentPage?.type === 'chapter' && (
                  <div className="h-full flex flex-col justify-between">
                    
                    <div>
                      {/* كليشة رأس الصفحة (Running Header) */}
                      <div className="flex items-center justify-between text-[10px] text-stone-400 border-b border-stone-200 pb-2 mb-5 font-tajawal">
                        <span>{book.title}</span>
                        <span>الفصل {currentPage.chapterNumber}: {currentPage.title}</span>
                      </div>

                      {/* عنوان الفصل */}
                      <div className="mb-5 pb-2 border-b border-amber-500/50">
                        <span className="text-[11px] font-bold text-amber-700 block">
                          الفصل {currentPage.chapterNumber}
                        </span>
                        <h2 className="text-lg sm:text-xl font-bold text-amber-950 mt-0.5">
                          {currentPage.title}
                        </h2>
                      </div>

                      {/* نصوص الفصل */}
                      <div className="space-y-3 text-stone-800 text-xs sm:text-sm text-justify">
                        {currentPage.paragraphs?.slice(0, 5).map((p, pIdx) => (
                          <p key={pIdx} className="indent-6">
                            {p}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* الحواشي السفلية وترقيم الصفحة */}
                    <div>
                      {includeFootnotes && currentPage.citations && currentPage.citations.length > 0 && (
                        <div className="mt-6 pt-3 border-t border-stone-300 text-[10px] text-stone-600 font-tajawal space-y-1">
                          <div className="font-bold text-amber-900 mb-1">الهوامش والمراجع المستخرجة:</div>
                          {currentPage.citations.map((c, cIdx) => (
                            <div key={c.id || cIdx}>
                              ({cIdx + 1}) «{c.excerpt}» — {c.author}، المصدر: [{c.sourceFileName || 'الكتاب'}]، ص {c.pageNumber}.
                            </div>
                          ))}
                        </div>
                      )}

                      {/* الترقيم السفلي المتزامن بالنمط المختار */}
                      <div className="text-center text-[11px] font-semibold text-stone-500 border-t border-stone-200 mt-4 pt-3">
                        {formatPageNumber(safePageIndex + 1, generatedPages.length)}
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* الصفحة المقابلة في وضع الصفحتين المزدوج (Spread Mode) */}
              {isSpreadMode && secondPage && (
                <div 
                  className={`w-full bg-white text-stone-900 shadow-2xl rounded-sm border border-stone-300 relative flex flex-col justify-between select-text ${pageDimensions.aspectRatioClass} ${marginSpecs.previewPaddingClass} ${fontClass} ${lineSpacingClass}`}
                  style={{
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    minHeight: '620px',
                  }}
                >
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 border-b border-stone-200 pb-2 mb-5 font-tajawal">
                        <span>{book.title}</span>
                        <span>{secondPage.title}</span>
                      </div>
                      <div className="mb-5 pb-2 border-b border-amber-500/50">
                        <span className="text-[11px] font-bold text-amber-700 block">
                          الفصل {secondPage.chapterNumber}
                        </span>
                        <h2 className="text-lg sm:text-xl font-bold text-amber-950 mt-0.5">
                          {secondPage.title}
                        </h2>
                      </div>
                      <div className="space-y-3 text-stone-800 text-xs sm:text-sm text-justify">
                        {secondPage.paragraphs?.slice(0, 5).map((p, pIdx) => (
                          <p key={pIdx} className="indent-6">
                            {p}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="text-center text-[11px] font-semibold text-stone-500 border-t border-stone-200 mt-4 pt-3">
                      {formatPageNumber(safePageIndex + 2, generatedPages.length)}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* -----------------------------------------------------------------
              الحالة 2: محاكي حزمة printing (Flutter PdfPreview Widget)
             ----------------------------------------------------------------- */}
          {previewMode === 'flutterPrinting' && (
            <div className="w-full max-w-3xl my-auto bg-stone-900 text-white rounded-2xl shadow-2xl border border-stone-700 overflow-hidden flex flex-col">
              
              {/* شريط أدوات PdfPreview الأصلي في فلاتر */}
              <div className="h-12 bg-stone-800 border-b border-stone-700 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {'PdfPreview(build: (format) => ...)'}
                  </span>
                  <span className="text-[11px] text-stone-300 font-tajawal">
                    {pageDimensions.flutterConstant} • الهامش: {marginSpecs.mm}mm
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-stone-300">
                  <button 
                    onClick={triggerBrowserPrint} 
                    className="p-1.5 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1 text-amber-400"
                    title="الطباعة عبر الحزمة"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة</span>
                  </button>
                  <button 
                    onClick={() => setIsExportModalOpen(true)}
                    className="p-1.5 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1"
                    title="تنزيل الـ PDF"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>حفظ PDF</span>
                  </button>
                </div>
              </div>

              {/* مساحة عرض الصفحة المحاكية */}
              <div className="p-8 flex items-center justify-center bg-stone-950/60 overflow-auto">
                <div className={`w-80 bg-white text-stone-900 p-6 shadow-2xl rounded-xs ${pageDimensions.aspectRatioClass} flex flex-col justify-between text-xs`}>
                  <div>
                    <div className="text-[9px] text-stone-400 border-b pb-1 mb-2 font-tajawal flex justify-between">
                      <span>{book.title}</span>
                      <span>{currentPage.title}</span>
                    </div>
                    <h3 className="font-bold text-amber-900 mb-2">الفصل {currentPage.chapterNumber}: {currentPage.title}</h3>
                    <p className="text-[10px] text-stone-700 leading-relaxed text-justify">
                      {currentPage.paragraphs?.[0] || 'محتوى الفصل في كاتب...'}
                    </p>
                  </div>
                  <div className="text-center text-[10px] text-stone-500 border-t pt-2">
                    {formatPageNumber(safePageIndex + 1, generatedPages.length)}
                  </div>
                </div>
              </div>

              {/* شريط الإحصائيات السفلي للمحاكي */}
              <div className="h-9 bg-stone-800/80 px-4 flex items-center justify-between text-[11px] text-stone-400 font-mono">
                <span>Rendering Engine: PdfRasterBase (600 DPI)</span>
                <span>Pages: {generatedPages.length} | Format: {pageDimensions.name}</span>
              </div>

            </div>
          )}

          {/* -----------------------------------------------------------------
              الحالة 3: أكواد حزمة printing في Flutter
             ----------------------------------------------------------------- */}
          {previewMode === 'code' && (
            <div className="w-full max-w-3xl my-auto bg-stone-900 text-stone-100 rounded-2xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col">
              <div className="h-11 bg-stone-800/80 border-b border-stone-700 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-stone-200">
                    كود Flutter المتزامن مع الإعدادات الحالية (printing & pdf)
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-700 hover:bg-stone-600 text-xs font-bold transition-colors cursor-pointer text-stone-200"
                >
                  {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{codeCopied ? 'تم النسخ!' : 'نسخ الكود'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-auto max-h-[500px] leading-relaxed text-amber-200/90" dir="ltr">
                {flutterPrintingCode}
              </pre>
            </div>
          )}

          {/* -----------------------------------------------------------------
              شريط مصغرات الصفحات في الأسفل (Thumbnails Ribbon)
             ----------------------------------------------------------------- */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto max-w-2xl p-2 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-2xl border border-stone-200 dark:border-stone-800 shadow-lg">
            {generatedPages.map((p, idx) => {
              const isCurrent = idx === safePageIndex;
              return (
                <button
                  key={p.id || idx}
                  onClick={() => setCurrentPageIndex(idx)}
                  className={`w-12 h-16 rounded-lg border text-[10px] font-bold shrink-0 flex flex-col items-center justify-between p-1 transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/40'
                      : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-500 hover:border-amber-400'
                  }`}
                >
                  <span className="truncate w-full text-center text-[9px] font-tajawal">
                    {p.type === 'cover' ? 'الغلاف' : p.type === 'toc' ? 'الفهرس' : `ف ${p.chapterNumber}`}
                  </span>
                  <span className="font-mono text-[9px]">{idx + 1}</span>
                </button>
              );
            })}
          </div>

        </main>

      </div>

      {/* =====================================================================
          3. نافذة تصدير الكتاب مع مؤشر التقدم (Export Modal with Progress Bar)
         ===================================================================== */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-cairo">
          <div 
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 text-stone-900 dark:text-stone-100 animate-in fade-in zoom-in-95"
            dir="rtl"
          >
            {/* عنوان النافذة */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">تصدير الكتاب النهائي</h3>
                <p className="text-xs text-stone-500 font-tajawal">{book.title}</p>
              </div>
            </div>

            {/* اختيار الصيغة المطلوبة: (PDF, DOCX, EPUB) */}
            {!isExporting && !downloadReadyUrl && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  اختر الصيغة المطلوبة للتصدير:
                </label>
                
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'pdf', title: 'مستند PDF', desc: 'عالي الدقة ومعد للطباعة', icon: Printer, color: 'text-red-600' },
                    { key: 'docx', title: 'Word (.docx)', desc: 'تحرير مكتبي OpenXML', icon: FileText, color: 'text-blue-600' },
                    { key: 'epub', title: 'كتاب ePub 3', desc: 'للقراء الرقميين وKindle', icon: BookOpen, color: 'text-emerald-600' },
                  ].map(f => {
                    const isSelected = exportFormat === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setExportFormat(f.key as ExportFormatKey)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/30'
                            : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        <f.icon className={`w-5 h-5 mx-auto mb-1.5 ${f.color}`} />
                        <div className="text-xs font-bold">{f.title}</div>
                        <div className="text-[10px] text-stone-500 font-tajawal mt-0.5">{f.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* بطاقة ملخص الإعدادات المطبقة */}
                <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-1.5 font-tajawal">
                  <div className="flex justify-between">
                    <span className="text-stone-500">المقاس والهوامش:</span>
                    <span className="font-bold">{pageDimensions.name} • {marginSpecs.label} ({marginSpecs.mm}mm)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">الترقيم المعتمد:</span>
                    <span className="font-bold">{numberingStyle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">الأقسام المضمنة:</span>
                    <span className="font-bold">
                      {includeCoverPage ? 'الغلاف • ' : ''}
                      {includeTableOfContents ? 'الفهرس • ' : ''}
                      {includeFootnotes ? `المراجع (${allCitations.length})` : 'بدون مراجع'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* مؤشر التقدّم أثناء المعالجة */}
            {(isExporting || downloadReadyUrl) && (
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-700 dark:text-stone-300">
                    {exportStatusText}
                  </span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                    {exportProgress}%
                  </span>
                </div>

                {/* شريط التقدم المرئي المتحرك */}
                <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-600 to-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>

                {/* إشعار جاهزية الملف للتنزيل */}
                {downloadReadyUrl && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold">جاهز للتنزيل: {downloadReadyUrl.filename}</div>
                        <div className="text-[10px] text-emerald-600 font-mono">الحجم التقديري: {downloadReadyUrl.sizeKb} KB</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* أزرار الإجراءات في أسفل النافذة */}
            <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setIsExportModalOpen(false);
                  setDownloadReadyUrl(null);
                  setIsExporting(false);
                }}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 cursor-pointer"
              >
                {downloadReadyUrl ? 'إغلاق' : 'إلغاء'}
              </button>

              {!downloadReadyUrl ? (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleStartExport}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isExporting ? 'جارٍ المعالجة...' : 'بدء التصدير الآن'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={triggerDirectDownload}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل الملف فوراً</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
