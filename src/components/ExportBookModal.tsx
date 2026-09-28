import React, { useState } from 'react';
import { 
  FileDown, 
  X, 
  Check, 
  Printer, 
  Share2, 
  FileText, 
  BookOpen, 
  Layers, 
  Type, 
  ShieldCheck, 
  Sparkles,
  Download,
  AlertCircle
} from 'lucide-react';
import JSZip from 'jszip';
import { Book, Chapter } from '../types';

interface ExportBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
}

type ExportFormat = 'pdf' | 'docx' | 'epub';

export const ExportBookModal: React.FC<ExportBookModalProps> = ({
  isOpen,
  onClose,
  book,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [fontFamily, setFontFamily] = useState<'cairo' | 'tajawal'>('cairo');
  const [includeCover, setIncludeCover] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeFootnotes, setIncludeFootnotes] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Flatten all citations from all chapters
  const allCitations = book.chapters.flatMap(ch => 
    (ch.citations || []).map(cit => ({
      ...cit,
      chapterTitle: ch.title,
      chapterId: ch.id,
    }))
  );

  // Helper for XML escaping
  const xmlEscape = (str: string) => {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Helper to trigger browser download
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ===========================================================================
  // 1. Generate Word Document (.docx) using OpenXML and JSZip
  // ===========================================================================
  const handleExportDocx = async () => {
    setIsExporting(true);
    setExportSuccessMessage(null);

    try {
      const zip = new JSZip();
      const font = fontFamily === 'cairo' ? 'Cairo' : 'Tajawal';

      // 1. [Content_Types].xml
      const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;
      zip.file('[Content_Types].xml', contentTypes);

      // 2. _rels/.rels
      const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
      zip.file('_rels/.rels', rels);

      // 3. word/_rels/document.xml.rels
      const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;
      zip.file('word/_rels/document.xml.rels', docRels);

      // 4. word/settings.xml
      const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:evenAndOddHeaders/>
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;
      zip.file('word/settings.xml', settings);

      // 5. word/styles.xml
      const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
        <w:lang w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:bidi/>
        <w:jc w:val="both"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:bidi/>
      <w:spacing w:before="400" w:after="200"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>
      <w:b/>
      <w:bCs/>
      <w:color w:val="92400E"/>
      <w:sz w:val="40"/>
      <w:szCs w:val="40"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="FootnoteText">
    <w:name w:val="footnote text"/>
    <w:pPr>
      <w:bidi/>
      <w:spacing w:before="60" w:after="60"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
      <w:color w:val="555555"/>
    </w:rPr>
  </w:style>
</w:styles>`;
      zip.file('word/styles.xml', styles);

      // 6. word/document.xml
      let docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>`;

      // Cover Page in DOCX
      if (includeCover) {
        docXml += `
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="center"/>
    <w:spacing w:before="1400" w:after="240"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="60"/><w:szCs w:val="60"/><w:color w:val="92400E"/></w:rPr>
    <w:t>${xmlEscape(book.title)}</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="center"/>
    <w:spacing w:before="120" w:after="400"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="333333"/></w:rPr>
    <w:t>تأليف: ${xmlEscape(book.author)}</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="center"/>
    <w:spacing w:before="100" w:after="1400"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="777777"/></w:rPr>
    <w:t>التصنيف: ${xmlEscape(book.category)} • إجمالي الكلمات: ${book.wordCount}</w:t>
  </w:r>
</w:p>
<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
      }

      // Table of Contents in DOCX
      if (includeToc) {
        docXml += `
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="center"/>
    <w:spacing w:before="240" w:after="300"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/><w:color w:val="92400E"/></w:rPr>
    <w:t>فهرس المحتويات</w:t>
  </w:r>
</w:p>`;

        book.chapters.forEach((ch, idx) => {
          docXml += `
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:spacing w:before="80" w:after="80"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:bCs/></w:rPr>
    <w:t>الفصل ${idx + 1}: ${xmlEscape(ch.title)}</w:t>
  </w:r>
  <w:r>
    <w:rPr><w:color w:val="888888"/></w:rPr>
    <w:t>  ...............  (${ch.wordCount} كلمة)</w:t>
  </w:r>
</w:p>`;
        });

        docXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
      }

      // Chapters content in DOCX
      book.chapters.forEach((ch, i) => {
        docXml += `
<w:p>
  <w:pPr>
    <w:pStyle w:val="Heading1"/>
    <w:bidi/>
    <w:jc w:val="right"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:bCs/></w:rPr>
    <w:t>الفصل ${i + 1}: ${xmlEscape(ch.title)}</w:t>
  </w:r>
</w:p>`;

        const text = ch.plainText || ch.content || '';
        const paragraphs = text.split('\n').filter(p => p.trim());

        paragraphs.forEach(p => {
          docXml += `
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="both"/>
    <w:spacing w:before="100" w:after="120" w:line="360" w:lineRule="auto"/>
    <w:ind w:firstLine="420"/>
  </w:pPr>
  <w:r>
    <w:t>${xmlEscape(p)}</w:t>
  </w:r>
</w:p>`;
        });

        // Footnotes / Citations
        if (includeFootnotes && ch.citations && ch.citations.length > 0) {
          docXml += `
<w:p>
  <w:pPr>
    <w:bidi/>
    <w:spacing w:before="360" w:after="100"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="92400E"/></w:rPr>
    <w:t>الهوامش والمراجع المستخرجة للفصل:</w:t>
  </w:r>
</w:p>`;

          ch.citations.forEach((cit, cIdx) => {
            const footnoteText = `(${cIdx + 1}) «${cit.excerpt}» — ${cit.author}، المصدر: [${cit.sourceFileName}]، ص ${cit.pageNumber}.`;
            docXml += `
<w:p>
  <w:pPr>
    <w:pStyle w:val="FootnoteText"/>
    <w:bidi/>
    <w:jc w:val="right"/>
  </w:pPr>
  <w:r>
    <w:t>${xmlEscape(footnoteText)}</w:t>
  </w:r>
</w:p>`;
          });
        }

        if (i < book.chapters.length - 1) {
          docXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
        }
      });

      docXml += `
  <w:sectPr>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    <w:bidi/>
  </w:sectPr>
</w:body>
</w:document>`;

      zip.file('word/document.xml', docXml);

      const blob = await zip.generateAsync({ type: 'blob' });
      const safeTitle = book.title.replace(/[/\\?%*:|"<>]/g, '_');
      triggerDownload(blob, `${safeTitle}.docx`);

      setExportSuccessMessage('تم توليد وتنزيل ملف Word (.docx) بنجاح بتنسيق RTL كامل!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تصدير ملف Word');
    } finally {
      setIsExporting(false);
    }
  };

  // ===========================================================================
  // 2. Generate ePub 3.0 Container using JSZip
  // ===========================================================================
  const handleExportEpub = async () => {
    setIsExporting(true);
    setExportSuccessMessage(null);

    try {
      const zip = new JSZip();
      const font = fontFamily === 'cairo' ? 'Cairo' : 'Tajawal';
      const bookUuid = `urn:uuid:katib-${book.id}`;

      // 1. mimetype (must be uncompressed)
      zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

      // 2. META-INF/container.xml
      zip.file(
        'META-INF/container.xml',
        `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
      );

      // 3. OEBPS/styles.css
      const stylesCss = `@charset "UTF-8";
html, body {
  direction: rtl;
  unicode-bidi: embed;
  font-family: '${font}', 'Cairo', 'Tajawal', sans-serif;
  margin: 1.5em;
  padding: 0;
  line-height: 1.8;
  color: #1c1917;
  background-color: #ffffff;
}
h1, h2, h3 {
  color: #78350f;
  text-align: right;
  font-weight: bold;
}
.cover-wrapper {
  text-align: center;
  padding: 4em 1.5em;
  border: 3px double #d97706;
  border-radius: 16px;
  margin: 2em 0;
}
.cover-title {
  font-size: 2.4em;
  margin-bottom: 0.4em;
  color: #78350f;
}
.cover-author {
  font-size: 1.4em;
  color: #44403c;
  margin-bottom: 1em;
}
.cover-meta {
  font-size: 0.9em;
  color: #78716c;
}
p {
  text-align: justify;
  margin-bottom: 1.2em;
  text-indent: 1.6em;
}
.chapter-title {
  border-bottom: 2px solid #f59e0b;
  padding-bottom: 0.4em;
  margin-bottom: 1.2em;
}
.footnotes-box {
  margin-top: 3em;
  padding-top: 1.2em;
  border-top: 1px solid #d6d3d1;
  font-size: 0.85em;
  color: #57534e;
}
.footnote-item {
  margin-bottom: 0.6em;
}`;
      zip.file('OEBPS/styles.css', stylesCss);

      // 4. OEBPS/cover.xhtml
      const coverHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ar" dir="rtl">
<head>
  <title>${xmlEscape(book.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="cover-wrapper">
    <h1 class="cover-title">${xmlEscape(book.title)}</h1>
    <div class="cover-author">تأليف: ${xmlEscape(book.author)}</div>
    <div class="cover-meta">التصنيف: ${xmlEscape(book.category)} • عدد الفصول: ${book.chapters.length}</div>
    <div class="cover-meta" style="margin-top: 2em;">تم النشر عبر منصة كاتب - Katib Publishing</div>
  </div>
</body>
</html>`;
      zip.file('OEBPS/cover.xhtml', coverHtml);

      // 5. OEBPS/chapter_*.xhtml
      book.chapters.forEach((ch, i) => {
        let chHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ar" dir="rtl">
<head>
  <title>${xmlEscape(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h2 class="chapter-title">الفصل ${i + 1}: ${xmlEscape(ch.title)}</h2>`;

        const text = ch.plainText || ch.content || '';
        const paragraphs = text.split('\n').filter(p => p.trim());
        paragraphs.forEach(p => {
          chHtml += `\n  <p>${xmlEscape(p)}</p>`;
        });

        if (includeFootnotes && ch.citations && ch.citations.length > 0) {
          chHtml += `\n  <div class="footnotes-box">
    <h3>الهوامش والمراجع المستخرجة:</h3>`;
          ch.citations.forEach((cit, cIdx) => {
            chHtml += `\n    <div class="footnote-item">(${cIdx + 1}) «${xmlEscape(cit.excerpt)}» — ${xmlEscape(cit.author)}، المصدر: [${xmlEscape(cit.sourceFileName)}]، ص ${cit.pageNumber}.</div>`;
          });
          chHtml += `\n  </div>`;
        }

        chHtml += `\n</body>\n</html>`;
        zip.file(`OEBPS/chapter_${i + 1}.xhtml`, chHtml);
      });

      // 6. OEBPS/nav.xhtml (ePub3 Nav)
      let navHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ar" dir="rtl">
<head>
  <title>فهرس الكتاب</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>فهرس المحتويات</h1>
    <ol>
      <li><a href="cover.xhtml">صفحة الغلاف</a></li>`;

      book.chapters.forEach((ch, i) => {
        navHtml += `\n      <li><a href="chapter_${i + 1}.xhtml">الفصل ${i + 1}: ${xmlEscape(ch.title)}</a></li>`;
      });

      navHtml += `\n    </ol>
  </nav>
</body>
</html>`;
      zip.file('OEBPS/nav.xhtml', navHtml);

      // 7. OEBPS/content.opf
      let opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" dir="rtl" xml:lang="ar">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookUuid}</dc:identifier>
    <dc:title>${xmlEscape(book.title)}</dc:title>
    <dc:creator>${xmlEscape(book.author)}</dc:creator>
    <dc:language>ar</dc:language>
    <dc:subject>${xmlEscape(book.category)}</dc:subject>
    <dc:publisher>منصة كاتب - Katib Publishing</dc:publisher>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`;

      book.chapters.forEach((ch, i) => {
        opf += `\n    <item id="chapter_${i + 1}" href="chapter_${i + 1}.xhtml" media-type="application/xhtml+xml"/>`;
      });

      opf += `\n  </manifest>
  <spine page-progression-direction="rtl">
    <itemref idref="cover"/>`;

      book.chapters.forEach((ch, i) => {
        opf += `\n    <itemref idref="chapter_${i + 1}"/>`;
      });

      opf += `\n  </spine>
</package>`;
      zip.file('OEBPS/content.opf', opf);

      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
      const safeTitle = book.title.replace(/[/\\?%*:|"<>]/g, '_');
      triggerDownload(blob, `${safeTitle}.epub`);

      setExportSuccessMessage('تم توليد وتنزيل كتاب ePub 3.0 بنجاح للنشر الرقمي!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تصدير ملف EPUB');
    } finally {
      setIsExporting(false);
    }
  };

  // ===========================================================================
  // 3. Generate Printable PDF Book via Browser Print Window
  // ===========================================================================
  const handleExportPdfOrPrint = (action: 'download' | 'print') => {
    setIsExporting(true);
    setExportSuccessMessage(null);

    const font = fontFamily === 'cairo' ? 'Cairo' : 'Tajawal';

    let printHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${xmlEscape(book.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-center {
        content: ${includePageNumbers ? '"صفحة " counter(page)' : '""'};
        font-family: '${font}', sans-serif;
        font-size: 10pt;
        color: #78716c;
      }
    }
    body {
      font-family: '${font}', sans-serif;
      direction: rtl;
      margin: 0;
      padding: 0;
      color: #1c1917;
      background: #fff;
      line-height: 1.8;
      font-size: 12pt;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    /* COVER */
    .cover-page {
      height: 90vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      border: 3px solid #b45309;
      border-radius: 12px;
      padding: 40px;
      box-sizing: border-box;
    }
    .cover-badge {
      display: inline-block;
      padding: 6px 18px;
      background: #fef3c7;
      color: #92400e;
      border-radius: 20px;
      font-weight: 700;
      font-size: 11pt;
    }
    .cover-title {
      font-size: 32pt;
      font-weight: 800;
      color: #78350f;
      margin: 20px 0 10px 0;
    }
    .cover-author {
      font-size: 18pt;
      font-weight: 700;
      color: #44403c;
    }
    .divider {
      width: 80px;
      height: 3px;
      background: #b45309;
      margin: 20px auto;
    }
    .cover-footer {
      font-size: 10pt;
      color: #78716c;
    }
    /* TOC */
    .toc-title {
      text-align: center;
      font-size: 22pt;
      font-weight: 800;
      color: #78350f;
      margin-bottom: 25px;
    }
    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 14px;
      border-bottom: 1px dotted #d6d3d1;
      padding-bottom: 4px;
    }
    .toc-item-title {
      font-weight: 700;
      font-size: 13pt;
      color: #292524;
    }
    .toc-item-words {
      font-size: 10pt;
      color: #78716c;
    }
    /* CHAPTER */
    .chapter-header {
      margin-bottom: 30px;
      padding-bottom: 12px;
      border-bottom: 2px solid #f59e0b;
    }
    .chapter-tag {
      font-size: 11pt;
      font-weight: 700;
      color: #d97706;
      text-transform: uppercase;
    }
    .chapter-title {
      font-size: 24pt;
      font-weight: 800;
      color: #78350f;
      margin: 4px 0 0 0;
    }
    p {
      text-align: justify;
      margin-bottom: 16px;
      text-indent: 24px;
    }
    /* FOOTNOTES */
    .footnotes-section {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #a8a29e;
      font-size: 9.5pt;
      color: #57534e;
    }
    .footnotes-title {
      font-weight: 700;
      margin-bottom: 8px;
      color: #92400e;
    }
    .footnote-row {
      margin-bottom: 6px;
    }
    .page-footer-num {
      text-align: center;
      font-size: 9pt;
      color: #a8a29e;
      margin-top: 20px;
    }
  </style>
</head>
<body>`;

    // 1. Cover Page
    if (includeCover) {
      printHtml += `
  <div class="cover-page page-break">
    <div>
      <div class="cover-badge">${xmlEscape(book.category || 'كتاب أدبي وبحثي')}</div>
      <p style="margin: 8px 0 0 0; font-size: 10pt; color: #78716c; text-indent: 0;">منصة كاتب للكتب العربية</p>
    </div>
    <div>
      <div class="divider"></div>
      <div class="cover-title">${xmlEscape(book.title)}</div>
      <div class="cover-author">تأليف: ${xmlEscape(book.author)}</div>
      <div class="divider"></div>
    </div>
    <div class="cover-footer">
      <div>إجمالي الفصول: ${book.chapters.length} فصول  •  عدد الكلمات: ${book.wordCount}</div>
      <div style="margin-top: 4px;">تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</div>
    </div>
  </div>`;
    }

    // 2. Table of Contents
    if (includeToc) {
      printHtml += `
  <div class="page-break" style="padding: 20px 0;">
    <div class="toc-title">فـهـرس الـمـحـتـويـات</div>
    <div class="divider"></div>
    <div style="margin-top: 30px;">`;

      book.chapters.forEach((ch, idx) => {
        printHtml += `
      <div class="toc-item">
        <span class="toc-item-title">الفصل ${idx + 1}: ${xmlEscape(ch.title)}</span>
        <span class="toc-item-words">${ch.wordCount} كلمة</span>
      </div>`;
      });

      printHtml += `
    </div>
  </div>`;
    }

    // 3. Chapters
    book.chapters.forEach((ch, idx) => {
      printHtml += `
  <div class="chapter-container page-break">
    <div class="chapter-header">
      <div class="chapter-tag">الفصل ${idx + 1}</div>
      <h1 class="chapter-title">${xmlEscape(ch.title)}</h1>
    </div>`;

      const text = ch.plainText || ch.content || '';
      const paragraphs = text.split('\n').filter(p => p.trim());
      paragraphs.forEach(p => {
        printHtml += `\n    <p>${xmlEscape(p)}</p>`;
      });

      // Footnotes
      if (includeFootnotes && ch.citations && ch.citations.length > 0) {
        printHtml += `
    <div class="footnotes-section">
      <div class="footnotes-title">الهوامش والمراجع المستخرجة:</div>`;
        ch.citations.forEach((cit, cIdx) => {
          printHtml += `
      <div class="footnote-row">(${cIdx + 1}) «${xmlEscape(cit.excerpt)}» — ${xmlEscape(cit.author)}، المصدر: [${xmlEscape(cit.sourceFileName)}]، ص ${cit.pageNumber}.</div>`;
        });
        printHtml += `\n    </div>`;
      }

      if (includePageNumbers) {
        printHtml += `\n    <div class="page-footer-num">— الفصل ${idx + 1} —</div>`;
      }

      printHtml += `\n  </div>`;
    });

    printHtml += `
</body>
</html>`;

    if (action === 'download') {
      const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
      const safeTitle = book.title.replace(/[/\\?%*:|"<>]/g, '_');
      triggerDownload(blob, `${safeTitle}_جاهز_للطباعة.html`);
      setExportSuccessMessage('تم تنزيل نسخة الكتاب المتوافقة مع الطباعة وPDF بنجاح!');
      setIsExporting(false);
    } else {
      // Print Dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 600);
      } else {
        alert('يرجى السماح بالنوافذ المنبثقة لمعاينة الطباعة');
      }
      setIsExporting(false);
    }
  };

  // ===========================================================================
  // 4. Share via Web Share API or Clipboard
  // ===========================================================================
  const handleShare = async () => {
    const shareData = {
      title: book.title,
      text: `كتاب «${book.title}» للمؤلف ${book.author}، مصنف في ${book.category} ويحتوي على ${book.chapters.length} فصول بمجموع ${book.wordCount} كلمة. صُمم وصُدّر عبر تطبيق كاتب.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setExportSuccessMessage('تمت المشاركة بنجاح!');
      } catch (err) {
        // user cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(
        `كتاب: «${book.title}» - تأليف: ${book.author}\nعدد الفصول: ${book.chapters.length} | الكلمات: ${book.wordCount}\nتم التصدير عبر منصة كاتب.`
      );
      setExportSuccessMessage('تم نسخ ملخص الكتاب وروابط المشاركة إلى الحافظة!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-cairo">
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden text-stone-900 dark:text-stone-100 animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                محرك تصدير الكتاب والنشر الرقمي
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
                {book.title} • {book.chapters.length} فصول • {allCitations.length} مرجع موثق
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Success Banner */}
          {exportSuccessMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{exportSuccessMessage}</span>
            </div>
          )}

          {/* 1. Format Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
              اختر صيغة التصدير المستهدفة:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* PDF Card */}
              <button
                type="button"
                onClick={() => setSelectedFormat('pdf')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col items-start gap-1.5 ${
                  selectedFormat === 'pdf'
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-300 ring-2 ring-red-500/20'
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/40 dark:bg-stone-800/40'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">مستند PDF</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 font-tajawal">طباعة وRTL عربي</div>
                </div>
              </button>

              {/* DOCX Card */}
              <button
                type="button"
                onClick={() => setSelectedFormat('docx')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col items-start gap-1.5 ${
                  selectedFormat === 'docx'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/40 dark:bg-stone-800/40'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Word (.docx)</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 font-tajawal">تحرير مكتبي كامل</div>
                </div>
              </button>

              {/* EPUB Card */}
              <button
                type="button"
                onClick={() => setSelectedFormat('epub')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col items-start gap-1.5 ${
                  selectedFormat === 'epub'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/40 dark:bg-stone-800/40'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">كتاب ePub 3</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 font-tajawal">نشر رقمي وقراء</div>
                </div>
              </button>

            </div>
          </div>

          {/* 2. Typography Options */}
          <div className="bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">الخط العربي الأصيل المعتمد:</span>
              </div>
              <div className="flex items-center gap-1 bg-white dark:bg-stone-700 p-0.5 rounded-lg border border-stone-200 dark:border-stone-600">
                <button
                  type="button"
                  onClick={() => setFontFamily('cairo')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    fontFamily === 'cairo'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-300 hover:text-amber-600'
                  }`}
                >
                  كـايرو (Cairo)
                </button>
                <button
                  type="button"
                  onClick={() => setFontFamily('tajawal')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    fontFamily === 'tajawal'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-300 hover:text-amber-600'
                  }`}
                >
                  تـجـوال (Tajawal)
                </button>
              </div>
            </div>

            <hr className="border-stone-200 dark:border-stone-700/60" />

            {/* Checkbox Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-tajawal">
              
              <label className="flex items-center gap-2 cursor-pointer select-none text-stone-700 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={includeCover}
                  onChange={(e) => setIncludeCover(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 accent-amber-600"
                />
                <span>تضمين صفحة الغلاف (Cover Page)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-stone-700 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={includeToc}
                  onChange={(e) => setIncludeToc(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 accent-amber-600"
                />
                <span>صفحة الفهرس الآلي (Table of Contents)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-stone-700 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={includeFootnotes}
                  onChange={(e) => setIncludeFootnotes(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 accent-amber-600"
                />
                <span>توثيق الهوامش والحواشي ({allCitations.length} مراجع)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-stone-700 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={includePageNumbers}
                  onChange={(e) => setIncludePageNumbers(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 accent-amber-600"
                />
                <span>ترقيم الصفحات التلقائي في الأسفل</span>
              </label>

            </div>
          </div>

          {/* Book Summary Info Box */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-stone-700 dark:text-stone-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>جاهز للتصدير بحجم كتاب حقيقي مع مراعاة قواعد الطباعة العربية والـ RTL</span>
            </div>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              {book.wordCount} كلمة
            </span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 bg-stone-50 dark:bg-stone-800/40">
          
          <div className="flex items-center gap-2">
            {/* Print / Preview Button (PDF only) */}
            {selectedFormat === 'pdf' && (
              <button
                type="button"
                onClick={() => handleExportPdfOrPrint('print')}
                disabled={isExporting}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors"
                title="معاينة الطباعة المباشرة"
              >
                <Printer className="w-4 h-4" />
                <span>معاينة وطباعة</span>
              </button>
            )}

            {/* Share Button (share_plus equivalent) */}
            <button
              type="button"
              onClick={handleShare}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors"
              title="مشاركة الكتاب (share_plus)"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
            >
              إغلاق
            </button>

            {/* Main Action: Save / Download to device */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => {
                if (selectedFormat === 'pdf') {
                  handleExportPdfOrPrint('download');
                } else if (selectedFormat === 'docx') {
                  handleExportDocx();
                } else if (selectedFormat === 'epub') {
                  handleExportEpub();
                }
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExporting 
                  ? 'جارٍ تجهيز المستند...' 
                  : `حفظ ${selectedFormat === 'pdf' ? 'PDF' : selectedFormat === 'docx' ? 'Word' : 'ePub'} في الذاكرة`
                }
              </span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
