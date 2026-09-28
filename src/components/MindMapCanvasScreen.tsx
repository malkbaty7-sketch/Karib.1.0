import React, { useState, useRef } from 'react';
import { 
  Lightbulb, 
  User, 
  MapPin, 
  Quote, 
  Milestone, 
  Plus, 
  Trash2, 
  Edit3, 
  Link2, 
  Check, 
  X, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Database, 
  Sparkles,
  Layers,
  Palette,
  Maximize2,
  BookOpen,
  ArrowRight,
  FileText
} from 'lucide-react';
import { Book, CanvasNode, CanvasEdge, CanvasNodeType, Chapter } from '../types';

interface MindMapCanvasScreenProps {
  books: Book[];
  activeBookId?: string;
  onSelectBook?: (bookId: string) => void;
  onUpdateBook?: (book: Book) => void;
  onNavigateToEditor?: () => void;
}

export const SAMPLE_EXTRACTED_QUOTES = [
  {
    id: 'q1',
    quote: 'إن تجديد الفكر ليس قطيعة مع التراث، بل هو استنطاق لأصوله بروح الزمان وأدواته المعاصرة.',
    author: 'د. طه عبد الرحمن',
    sourceTitle: 'سؤال الأخلاق وتجديد العقل العربي',
    pageNumber: 48,
  },
  {
    id: 'q2',
    quote: 'العدل قوام الملك، والحرية شرط الإبداع، والعلم ركيزة النهضة في كل أمة تصبو إلى الريادة الحضارية.',
    author: 'عبد الرحمن ابن خلدون',
    sourceTitle: 'مقدمة ابن خلدون',
    pageNumber: 112,
  },
  {
    id: 'q3',
    quote: 'الكتابة هي الذاكرة الحية للبشرية، ومن لا يدون فكره وتاريخه يكتبه عنه الآخرون بتصوراتهم وتأويلاتهم.',
    author: 'مالك بن نبي',
    sourceTitle: 'شروط النهضة ومشكلات الحضارة',
    pageNumber: 85,
  },
  {
    id: 'q4',
    quote: 'التفكير المنهجي يستلزم الجمع الدقيق بين فقه النص المؤسس وفقه الواقع المعيش بتعقيداته.',
    author: 'د. رضوان السيد',
    sourceTitle: 'قضايا الفكر الإسلامي المعاصر',
    pageNumber: 134,
  },
  {
    id: 'q5',
    quote: 'العقل ليس قالباً جامداً، بل هو ملكة نقدية حية تتغذى على البرهان وتنفر من التقليد الأعمى.',
    author: 'ابن رشد الحفيد',
    sourceTitle: 'فصل المقال فيما بين الحكمة والشريعة',
    pageNumber: 62,
  },
];

const DEFAULT_NODES: Record<string, { nodes: CanvasNode[]; edges: CanvasEdge[] }> = {
  default: {
    nodes: [
      {
        id: 'node-root-1',
        bookId: 'b1',
        title: 'الفكرة المركزية: فقه التحولات المعاصرة',
        content: 'الأطروحة الجوهرية للكتاب حول توازن الفكر الإسلامي بين الثوابت والمتغيرات في العصر الرقمي.',
        dx: 520,
        dy: 240,
        colorHex: '#D97706',
        nodeType: 'idea',
        width: 260,
        height: 140,
      },
      {
        id: 'node-char-1',
        bookId: 'b1',
        title: 'الفئات المستهدفة والنخب',
        content: 'المفكرون المعاصرون، طلبة الدراسات العليا، والباحثون في التجديد الثقافي.',
        dx: 160,
        dy: 120,
        colorHex: '#3B82F6',
        nodeType: 'character',
        width: 240,
        height: 130,
      },
      {
        id: 'node-quote-1',
        bookId: 'b1',
        title: 'اقتباس توثيقي رئيسي',
        content: '«إن تجديد الفكر ليس قطيعة مع التراث، بل هو استنطاق لأصوله بروح الزمان وأدواته».',
        dx: 920,
        dy: 130,
        colorHex: '#10B981',
        nodeType: 'extracted_quote',
        width: 260,
        height: 130,
      },
      {
        id: 'node-loc-1',
        bookId: 'b1',
        title: 'الإطار التاريخي والمكاني',
        content: 'مراكز الإشعاع الحضاري الإسلامي وتفاعلها التاريخي مع الحضارات الأخرى.',
        dx: 180,
        dy: 440,
        colorHex: '#8B5CF6',
        nodeType: 'location',
        width: 240,
        height: 130,
      },
      {
        id: 'node-event-1',
        bookId: 'b1',
        title: 'محطة الفصل الأول: التقعيد المفاهيمي',
        content: 'تفكيك المصطلحات وبناء شبكة المفاهيم المؤسسة للبحث وتحليل إشكالياته.',
        dx: 540,
        dy: 480,
        colorHex: '#EC4899',
        nodeType: 'event',
        width: 250,
        height: 130,
      },
    ],
    edges: [
      {
        id: 'edge-1',
        bookId: 'b1',
        fromNodeId: 'node-root-1',
        toNodeId: 'node-char-1',
        label: 'محور بشري',
        colorHex: '#60A5FA',
        strokeWidth: 2,
        lineStyle: 'solid',
      },
      {
        id: 'edge-2',
        bookId: 'b1',
        fromNodeId: 'node-root-1',
        toNodeId: 'node-quote-1',
        label: 'شاهد استدلالي',
        colorHex: '#34D399',
        strokeWidth: 2,
        lineStyle: 'solid',
      },
      {
        id: 'edge-3',
        bookId: 'b1',
        fromNodeId: 'node-root-1',
        toNodeId: 'node-loc-1',
        label: 'حقل تطبيقي',
        colorHex: '#A78BFA',
        strokeWidth: 2,
        lineStyle: 'solid',
      },
      {
        id: 'edge-4',
        bookId: 'b1',
        fromNodeId: 'node-root-1',
        toNodeId: 'node-event-1',
        label: 'تسلسل منطقي',
        colorHex: '#F472B6',
        strokeWidth: 2,
        lineStyle: 'solid',
      },
    ],
  },
};

export const MindMapCanvasScreen: React.FC<MindMapCanvasScreenProps> = ({
  books,
  activeBookId,
  onSelectBook,
  onUpdateBook,
  onNavigateToEditor,
}) => {
  const selectedBook = books.find(b => b.id === activeBookId) || books[0];
  const [currentBookId, setCurrentBookId] = useState<string>(selectedBook?.id || 'b1');

  // Canvas State
  const [nodes, setNodes] = useState<CanvasNode[]>(() => {
    return DEFAULT_NODES.default.nodes.map(n => ({ ...n, bookId: currentBookId }));
  });
  const [edges, setEdges] = useState<CanvasEdge[]>(() => {
    return DEFAULT_NODES.default.edges.map(e => ({ ...e, bookId: currentBookId }));
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [zoom, setZoom] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('منذ ثوانٍ');

  // Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modal State for Add / Edit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<CanvasNode | null>(null);
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeContent, setNodeContent] = useState('');
  const [nodeType, setNodeType] = useState<CanvasNodeType>('idea');
  const [nodeColor, setNodeColor] = useState('#F59E0B');
  const [newCardCoords, setNewCardCoords] = useState<{ dx: number; dy: number }>({ dx: 450, dy: 280 });

  // Modal State for Extracted Quote Import
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Modal State for Card Color & Size Customization
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  // Modal State for Export Canvas to Chapters
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  // Relation Label Dialog
  const [pendingTargetNodeId, setPendingTargetNodeId] = useState<string | null>(null);
  const [edgeLabel, setEdgeLabel] = useState('علاقة ترابطية');

  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  // Trigger SQLite sync simulator
  const triggerSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setLastSavedTime(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 600);
  };

  // Node Drag Handlers (GestureDetector & Positioned simulation)
  const handleMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    if (connectingFromId) return;
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: e.clientX - node.dx,
      y: e.clientY - node.dy,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId) return;
    const newDx = Math.max(20, Math.min(2600, e.clientX - dragOffset.x));
    const newDy = Math.max(20, Math.min(2000, e.clientY - dragOffset.y));

    setNodes(prev =>
      prev.map(n => (n.id === draggingNodeId ? { ...n, dx: newDx, dy: newDy } : n))
    );
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      triggerSave();
    }
  };

  // Double Click on Canvas: create card at click position
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.canvas-card') || target.closest('button')) {
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scrollLeft = canvasRef.current?.scrollLeft || 0;
    const scrollTop = canvasRef.current?.scrollTop || 0;
    const clickX = (e.clientX - rect.left + scrollLeft) / zoom;
    const clickY = (e.clientY - rect.top + scrollTop) / zoom;

    setNewCardCoords({ dx: Math.round(clickX), dy: Math.round(clickY) });
    setEditingNode(null);
    setNodeTitle('');
    setNodeContent('');
    setNodeType('idea');
    setNodeColor('#F59E0B');
    setIsAddModalOpen(true);
  };

  // Connecting Logic
  const handleNodeClick = (nodeId: string) => {
    if (connectingFromId) {
      if (connectingFromId !== nodeId) {
        setPendingTargetNodeId(nodeId);
      } else {
        setConnectingFromId(null);
      }
    } else {
      setSelectedNodeId(nodeId);
    }
  };

  const confirmAddEdge = () => {
    if (!connectingFromId || !pendingTargetNodeId) return;
    const exists = edges.some(
      e =>
        (e.fromNodeId === connectingFromId && e.toNodeId === pendingTargetNodeId) ||
        (e.fromNodeId === pendingTargetNodeId && e.toNodeId === connectingFromId)
    );

    if (!exists) {
      const newEdge: CanvasEdge = {
        id: `edge-${Date.now()}`,
        bookId: currentBookId,
        fromNodeId: connectingFromId,
        toNodeId: pendingTargetNodeId,
        label: edgeLabel.trim() || undefined,
        colorHex: '#94A3B8',
        strokeWidth: 2,
        lineStyle: 'solid',
      };
      setEdges(prev => [...prev, newEdge]);
      triggerSave();
    }

    setConnectingFromId(null);
    setPendingTargetNodeId(null);
    setEdgeLabel('علاقة ترابطية');
  };

  // Add Quick Idea from Toolbar
  const openQuickIdeaModal = () => {
    setEditingNode(null);
    setNodeTitle('');
    setNodeContent('');
    setNodeType('idea');
    setNodeColor('#F59E0B');
    setNewCardCoords({ dx: 450 + Math.floor(Math.random() * 60), dy: 260 + Math.floor(Math.random() * 60) });
    setIsAddModalOpen(true);
  };

  const openEditModal = (node: CanvasNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNode(node);
    setNodeTitle(node.title);
    setNodeContent(node.content);
    setNodeType(node.nodeType);
    setNodeColor(node.colorHex);
    setIsAddModalOpen(true);
  };

  const handleSaveNode = () => {
    if (!nodeTitle.trim()) return;

    if (editingNode) {
      setNodes(prev =>
        prev.map(n =>
          n.id === editingNode.id
            ? {
                ...n,
                title: nodeTitle.trim(),
                content: nodeContent.trim(),
                nodeType,
                colorHex: nodeColor,
              }
            : n
        )
      );
    } else {
      const newNode: CanvasNode = {
        id: `node-${Date.now()}`,
        bookId: currentBookId,
        title: nodeTitle.trim(),
        content: nodeContent.trim(),
        dx: newCardCoords.dx,
        dy: newCardCoords.dy,
        colorHex: nodeColor,
        nodeType,
        width: 240,
        height: 135,
      };
      setNodes(prev => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
    }

    setIsAddModalOpen(false);
    triggerSave();
  };

  // Import Quote as Node
  const handleImportQuote = (item: typeof SAMPLE_EXTRACTED_QUOTES[0]) => {
    const newNode: CanvasNode = {
      id: `node-quote-${Date.now()}`,
      bookId: currentBookId,
      title: `مقتبس من ${item.sourceTitle}`,
      content: `«${item.quote}»\n— ${item.author} (ص ${item.pageNumber})`,
      dx: 480 + (nodes.length * 20),
      dy: 240 + (nodes.length * 25),
      colorHex: '#10B981',
      nodeType: 'extracted_quote',
      width: 290,
      height: 150,
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setIsQuoteModalOpen(false);
    triggerSave();
  };

  // Customize Selected Node Color & Size
  const handleUpdateNodeStyle = (colorHex: string, width: number, height: number) => {
    if (!selectedNodeId) return;
    setNodes(prev =>
      prev.map(n => (n.id === selectedNodeId ? { ...n, colorHex, width, height } : n))
    );
    setIsCustomizeModalOpen(false);
    triggerSave();
  };

  const handleDeleteNode = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.fromNodeId !== id && e.toNodeId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    triggerSave();
  };

  const handleDeleteEdge = (id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id));
    triggerSave();
  };

  // Export Canvas to Chapters (تحويل المخطط إلى فصول)
  const getSortedNodesForExport = () => {
    return [...nodes].sort((a, b) => {
      if (Math.abs(a.dy - b.dy) > 60) {
        return a.dy - b.dy;
      }
      return b.dx - a.dx; // RTL: Right cards first
    });
  };

  const handleConfirmExportToChapters = () => {
    const sorted = getSortedNodesForExport();
    if (sorted.length === 0) return;

    const newChapters: Chapter[] = sorted.map((n, i) => {
      const words = n.content.trim().split(/\s+/).filter(Boolean).length;
      return {
        id: `chap-canvas-${Date.now()}-${i}`,
        title: n.title,
        orderIndex: i + 1,
        contentJson: JSON.stringify([{ insert: `${n.title}\n\n${n.content}\n` }]),
        plainText: `${n.title}\n\n${n.content}`,
        wordCount: words,
        content: `${n.title}\n\n${n.content}`,
      };
    });

    if (onUpdateBook && selectedBook) {
      const updatedBook: Book = {
        ...selectedBook,
        chapters: newChapters,
        wordCount: newChapters.reduce((acc, c) => acc + c.wordCount, 0),
        lastModified: 'الآن (مستورد من السبورة الذهنية)',
      };
      onUpdateBook(updatedBook);
    }

    setIsExportModalOpen(false);
    setExportNotification(`تم بنجاح تحويل ${newChapters.length} بطاقات إلى فصول مقابلة في محرر النصوص!`);
    setTimeout(() => setExportNotification(null), 5000);
  };

  // Helper type metadata
  const getTypeInfo = (type: CanvasNodeType) => {
    switch (type) {
      case 'character':
        return { label: 'شخصية', icon: User, defaultColor: '#3B82F6' };
      case 'location':
        return { label: 'مكان / مشهد', icon: MapPin, defaultColor: '#8B5CF6' };
      case 'extracted_quote':
        return { label: 'اقتباس موثق', icon: Quote, defaultColor: '#10B981' };
      case 'event':
        return { label: 'حدث / حبكة', icon: Milestone, defaultColor: '#EC4899' };
      case 'idea':
      default:
        return { label: 'فكرة رئيسية', icon: Lightbulb, defaultColor: '#F59E0B' };
    }
  };

  const filteredNodes = nodes.filter(n => filterType === 'all' || n.nodeType === filterType);

  return (
    <div 
      className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-stone-100/80 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden font-cairo select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Header Bar */}
      <div className="h-14 px-4 sm:px-6 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4 z-20 shadow-xs">
        
        {/* Book Selector & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200/60 dark:border-amber-800/60">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                السبورة الذهنية (Visual Board)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                Interactive Viewer
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-tajawal">
              <span>المشروع:</span>
              <select
                value={currentBookId}
                onChange={(e) => {
                  setCurrentBookId(e.target.value);
                  if (onSelectBook) onSelectBook(e.target.value);
                }}
                className="bg-transparent font-semibold text-amber-700 dark:text-amber-400 outline-none cursor-pointer"
              >
                {books.map(b => (
                  <option key={b.id} value={b.id} className="dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="hidden md:flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'idea', label: 'الأفكار' },
            { id: 'character', label: 'الشخصيات' },
            { id: 'extracted_quote', label: 'الاقتباسات' },
            { id: 'location', label: 'الأماكن' },
            { id: 'event', label: 'الأحداث' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                filterType === f.id
                  ? 'bg-white dark:bg-stone-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Quick Top Actions & Persistence State */}
        <div className="flex items-center gap-2">
          {/* SQLite Auto-save status */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 text-xs font-tajawal text-stone-600 dark:text-stone-400">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {isSaving ? 'جاري الحفظ في SQLite...' : `محفوظ (${lastSavedTime})`}
            </span>
          </div>

          {/* Export to Chapters Top Trigger */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 text-white dark:text-stone-900 text-xs font-bold font-cairo transition-all shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>تحويل المخطط إلى فصول</span>
          </button>
        </div>

      </div>

      {/* Connection Mode Banner */}
      {connectingFromId && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between z-20 shadow-md text-xs font-cairo">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 animate-pulse" />
            <span>وضع الربط مفعل: انقر الآن على أي بطاقة أخرى لتوصيل مسار تفكيري وسهم تفاعلي معها...</span>
          </div>
          <button
            onClick={() => setConnectingFromId(null)}
            className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 font-bold"
          >
            إلغاء الربط
          </button>
        </div>
      )}

      {/* Export Success Notification */}
      {exportNotification && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between z-20 shadow-md text-xs font-cairo animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{exportNotification}</span>
          </div>
          {onNavigateToEditor && (
            <button
              onClick={onNavigateToEditor}
              className="flex items-center gap-1 px-3 py-1 bg-white text-emerald-800 rounded-lg font-bold shadow-xs hover:bg-emerald-50"
            >
              <span>فتح محرر الفصول</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          )}
        </div>
      )}

      {/* Main Canvas Stage (InteractiveViewer with Zoom & Pan) */}
      <div 
        ref={canvasRef}
        onDoubleClick={handleCanvasDoubleClick}
        className="flex-1 relative overflow-auto bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:26px_26px] cursor-grab active:cursor-grabbing"
      >
        <div 
          className="relative min-w-[2800px] min-h-[2200px] transition-transform origin-top-left"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Instruction hint for double click */}
          <div className="absolute top-4 right-4 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xs border border-stone-200 dark:border-stone-800 px-3 py-1.5 rounded-xl text-[11px] font-tajawal text-stone-500 flex items-center gap-1.5 pointer-events-none z-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>انقر نقراً مزدوجاً في أي موضع بالسبورة لإنشاء بطاقة فكرة جديدة</span>
          </div>

          {/* SVG Layer: Curved Arrows and Bezier Lines (CustomPainter logic) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker
                id="arrow-end"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
              </marker>
            </defs>

            {edges.map(edge => {
              const from = nodes.find(n => n.id === edge.fromNodeId);
              const to = nodes.find(n => n.id === edge.toNodeId);
              if (!from || !to) return null;

              const p1 = { x: from.dx + (from.width || 240) / 2, y: from.dy + (from.height || 130) / 2 };
              const p2 = { x: to.dx + (to.width || 240) / 2, y: to.dy + (to.height || 130) / 2 };

              const deltaX = p2.x - p1.x;
              const ctrlOffset = deltaX * 0.4;
              const pathD = `M ${p1.x} ${p1.y} C ${p1.x + ctrlOffset} ${p1.y}, ${p2.x - ctrlOffset} ${p2.y}, ${p2.x} ${p2.y}`;

              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const isHighlighted = selectedNodeId === edge.fromNodeId || selectedNodeId === edge.toNodeId;

              return (
                <g key={edge.id}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isHighlighted ? '#F59E0B' : edge.colorHex || '#94A3B8'}
                    strokeWidth={isHighlighted ? 3.5 : edge.strokeWidth || 2}
                    strokeDasharray={edge.lineStyle === 'dashed' ? '6,4' : undefined}
                    className="transition-colors duration-200"
                  />
                  {/* Relation label pill */}
                  {edge.label && (
                    <g 
                      transform={`translate(${midX}, ${midY})`}
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => handleDeleteEdge(edge.id)}
                    >
                      <title>انقر لحذف الرابط</title>
                      <rect
                        x="-45"
                        y="-11"
                        width="90"
                        height="22"
                        rx="11"
                        className="fill-white dark:fill-stone-800 stroke-stone-300 dark:stroke-stone-700 shadow-xs hover:stroke-red-400"
                      />
                      <text
                        textAnchor="middle"
                        y="4"
                        className="fill-stone-700 dark:fill-stone-200 font-tajawal text-[11px] font-bold"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Draggable Cards (Positioned & GestureDetector) */}
          {filteredNodes.map(node => {
            const typeInfo = getTypeInfo(node.nodeType);
            const Icon = typeInfo.icon;
            const isSelected = selectedNodeId === node.id;
            const isConnectingSource = connectingFromId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDown(e, node)}
                onClick={() => handleNodeClick(node.id)}
                style={{
                  left: `${node.dx}px`,
                  top: `${node.dy}px`,
                  width: `${node.width || 240}px`,
                }}
                className={`canvas-card absolute z-10 rounded-2xl bg-white dark:bg-stone-900 border transition-shadow cursor-grab active:cursor-grabbing ${
                  isConnectingSource
                    ? 'ring-4 ring-amber-500/50 border-amber-500 shadow-xl'
                    : isSelected
                    ? 'ring-2 ring-amber-500 border-amber-500 shadow-xl'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 shadow-sm'
                }`}
              >
                {/* Header Bar */}
                <div 
                  className="px-3 py-2 rounded-t-2xl flex items-center justify-between text-xs"
                  style={{ backgroundColor: `${node.colorHex}15` }}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: node.colorHex }} />
                    <span className="font-bold font-cairo text-stone-900 dark:text-stone-100 truncate">
                      {node.title}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectingFromId(connectingFromId === node.id ? null : node.id);
                      }}
                      className={`p-1 rounded-md transition-colors ${
                        isConnectingSource
                          ? 'bg-amber-500 text-white'
                          : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                      title="توصيل رابط ببطاقة أخرى"
                    >
                      <Link2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => openEditModal(node, e)}
                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                      title="تعديل"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteNode(node.id, e)}
                      className="p-1 rounded-md text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                      title="حذف"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3">
                  <p className="text-xs font-tajawal text-stone-700 dark:text-stone-300 line-clamp-4 leading-relaxed">
                    {node.content}
                  </p>
                </div>

                {/* Footer */}
                <div className="px-3 pb-2.5 pt-0 flex items-center justify-between text-[10px] font-tajawal text-stone-400">
                  <span 
                    className="font-bold px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: `${node.colorHex}18`, color: node.colorHex }}
                  >
                    {typeInfo.label}
                  </span>
                  <span>({Math.round(node.dx)}, {Math.round(node.dy)})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Toolbar (شريط أدوات سفلي تفاعلي) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-2 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 shadow-xl font-cairo">
        
        {/* Quick Idea Button */}
        <button
          onClick={openQuickIdeaModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
        >
          <Lightbulb className="w-4 h-4" />
          <span>فكرة سريعة</span>
        </button>

        {/* Import Extracted Quote Button */}
        <button
          onClick={() => setIsQuoteModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all"
        >
          <Quote className="w-4 h-4" />
          <span>اقتباس مستخرج</span>
        </button>

        {/* Change Color & Size (Active when a card is selected) */}
        <button
          onClick={() => {
            if (selectedNode) setIsCustomizeModalOpen(true);
          }}
          disabled={!selectedNode}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
            selectedNode
              ? 'bg-stone-50 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-amber-500'
              : 'opacity-40 cursor-not-allowed border-transparent text-stone-400'
          }`}
          title={selectedNode ? 'تخصيص لون وحجم البطاقة المحددة' : 'حدد بطاقة أولاً لتعديل لونها وحجمها'}
        >
          <Palette className="w-4 h-4" />
          <span>اللون والحجم</span>
        </button>

        <div className="h-5 w-px bg-stone-200 dark:bg-stone-700 mx-1" />

        {/* Export Canvas to Chapters Button */}
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 text-xs font-bold transition-all"
        >
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span>تحويل إلى فصول</span>
        </button>

        <div className="h-5 w-px bg-stone-200 dark:bg-stone-700 mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(prev => Math.max(0.6, prev - 0.1))}
            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-1 text-xs font-tajawal font-bold text-stone-700 dark:text-stone-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(1.6, prev + 0.1))}
            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
            title="إعادة ضبط المنظور"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 1. Modal: Add / Edit Card */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base font-cairo">
                {editingNode ? 'تعديل بطاقة السبورة' : 'إضافة بطاقة فكرة جديدة'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  عنوان الفكرة / البطاقة
                </label>
                <input
                  type="text"
                  value={nodeTitle}
                  onChange={(e) => setNodeTitle(e.target.value)}
                  placeholder="مثال: مدخل إلى تأصيل المفهوم..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  نوع البطاقة
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'idea', label: 'فكرة رئيسية', icon: Lightbulb },
                    { id: 'character', label: 'شخصية / فئة', icon: User },
                    { id: 'location', label: 'مكان / مشهد', icon: MapPin },
                    { id: 'extracted_quote', label: 'اقتباس موثق', icon: Quote },
                    { id: 'event', label: 'حدث / حبكة', icon: Milestone },
                  ].map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNodeType(t.id as CanvasNodeType)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                          nodeType === t.id
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                            : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-amber-600" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  المحتوى والتفاصيل
                </label>
                <textarea
                  rows={3}
                  value={nodeContent}
                  onChange={(e) => setNodeContent(e.target.value)}
                  placeholder="اكتب شرحاً موجزاً، نقاطاً رئيسية، أو مسودة أولية..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:border-amber-500 font-tajawal resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  لون البطاقة المميز
                </label>
                <div className="flex items-center gap-2">
                  {['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#64748B'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNodeColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        nodeColor === color ? 'scale-110 ring-2 ring-stone-900 dark:ring-white ring-offset-2' : ''
                      }`}
                    >
                      {nodeColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveNode}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
              >
                {editingNode ? 'تحديث البطاقة' : 'إضافة للسبورة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Import Extracted Quote (استيراد اقتباس من البحث الدلالي) */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Quote className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base font-cairo">
                  استيراد اقتباس مستخرج من محرك البحث الدلالي
                </h3>
              </div>
              <button
                onClick={() => setIsQuoteModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
              اختر أي اقتباس مستخرج لإنشاء بطاقة توثيقية موصولة مباشرة بالمصدر الأصلي:
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
              {SAMPLE_EXTRACTED_QUOTES.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-emerald-500/60 bg-stone-50/50 dark:bg-stone-800/50 transition-all flex flex-col gap-2"
                >
                  <p className="text-xs font-tajawal text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                    «{item.quote}»
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-stone-700/60 text-[11px] font-tajawal">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      {item.author} — {item.sourceTitle} (ص {item.pageNumber})
                    </span>
                    <button
                      onClick={() => handleImportQuote(item)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-cairo font-bold text-xs shadow-xs"
                    >
                      إدراج في السبورة
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setIsQuoteModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-xl text-stone-600 dark:text-stone-400"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Customize Card Color & Size (تغيير اللون والحجم) */}
      {isCustomizeModalOpen && selectedNode && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-sm font-cairo">
                تخصيص لون وحجم البطاقة
              </h3>
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
                  لون البطاقة المميز
                </label>
                <div className="flex items-center gap-2.5">
                  {['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#64748B'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleUpdateNodeStyle(c, selectedNode.width || 240, selectedNode.height || 135)}
                      style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                        selectedNode.colorHex === c ? 'scale-110 ring-2 ring-stone-900 dark:ring-white ring-offset-2' : ''
                      }`}
                    >
                      {selectedNode.colorHex === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
                  أبعاد وحجم البطاقة
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-cairo">
                  {[
                    { label: 'عادي', w: 240, h: 135 },
                    { label: 'عريض', w: 320, h: 155 },
                    { label: 'كبير', w: 380, h: 200 },
                  ].map(s => {
                    const isCur = (selectedNode.width || 240) === s.w;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => handleUpdateNodeStyle(selectedNode.colorHex, s.w, s.h)}
                        className={`p-2 rounded-xl border text-center font-bold transition-all ${
                          isCur
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            : 'border-stone-200 dark:border-stone-700 hover:border-stone-400'
                        }`}
                      >
                        <div>{s.label}</div>
                        <div className="text-[10px] font-tajawal text-stone-400">{s.w}×{s.h}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-600 text-white"
              >
                تم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Export Canvas to Chapters (تحويل المخطط إلى فصول) */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base font-cairo">
                  تحويل المخطط إلى فصول للكتاب
                </h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 font-tajawal">
              يقرأ النظام الترتيب المنطقي للبطاقات (من اليمين للأعلى وفق النمط العربي)، وسيقوم بإنشاء الفصول التالية في محرر النصوص:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {getSortedNodesForExport().map((n, i) => (
                <div 
                  key={n.id}
                  className="flex items-start gap-3 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 text-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {i + 1}
                  </span>
                  <div className="overflow-hidden">
                    <div className="font-bold text-stone-900 dark:text-stone-100 truncate">
                      {n.title}
                    </div>
                    <div className="text-[11px] font-tajawal text-stone-500 line-clamp-1">
                      {n.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl text-stone-600 dark:text-stone-400"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmExportToChapters}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد وبدء التحرير</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Connect Nodes Label */}
      {pendingTargetNodeId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm font-cairo">
              تسمية رابط العلاقة الذهنية
            </h3>
            <p className="text-xs text-stone-500 font-tajawal">
              حدد طبيعة الارتباط بين الفكرتين (مثال: شاهد استدلالي، نتيجة منطقية، شخصية مساعدة):
            </p>
            <input
              type="text"
              value={edgeLabel}
              onChange={(e) => setEdgeLabel(e.target.value)}
              placeholder="مثال: شاهد استدلالي..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:border-amber-500"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConnectingFromId(null);
                  setPendingTargetNodeId(null);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-xl text-stone-600 dark:text-stone-400"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmAddEdge}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
              >
                تأكيد الرابط
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
