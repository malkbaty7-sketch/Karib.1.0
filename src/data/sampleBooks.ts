import { Book } from '../types';

export const SAMPLE_BOOKS: Book[] = [
  {
    id: 'b1',
    title: 'أسرار البيان في فن كتابة الرواية العربية',
    author: 'د. طارق المعمري',
    category: 'نقد وأدب',
    coverGradient: 'from-amber-700 via-amber-800 to-stone-900',
    coverPattern: 'arabesque',
    totalPages: 320,
    currentPage: 184,
    wordCount: 54200,
    targetWordCount: 70000,
    status: 'drafting',
    lastModified: 'منذ ساعتين',
    format: 'project',
    description: 'دليل منهجي تطبيقي للكتّاب الشباب في تقنيات السرد العربي وبناء الشخصيات والحبكة الروائية المستوحاة من التراث المعاصر.',
    isFavorite: true,
    chapters: [
      {
        id: 'c1',
        title: 'المقدمة: السرد العربي بين الأصالة والتجديد',
        orderIndex: 0,
        contentJson: '{"ops":[{"insert":"إن صناعة الكتاب ليست مجرد تجميع للكلمات على صفحات صامتة، بل هي نفخ للروح في أفكار تموج في عقل الكاتب.\\n","attributes":{"header":2}}]}',
        plainText: 'إن صناعة الكتاب ليست مجرد تجميع للكلمات على صفحات صامتة، بل هي نفخ للروح في أفكار تموج في عقل الكاتب. تمتاز اللغة العربية بقدرة بلاغية فريدة على التعبير عن أدق خلجات النفس الإنسانية.',
        wordCount: 3200,
        content: 'إن صناعة الكتاب ليست مجرد تجميع للكلمات على صفحات صامتة، بل هي نفخ للروح في أفكار تموج في عقل الكاتب. تمتاز اللغة العربية بقدرة بلاغية فريدة على التعبير عن أدق خلجات النفس الإنسانية.',
        citations: [
          {
            id: 'cit_1',
            chapterId: 'c1',
            sourceFileName: 'دلائل_الإعجاز_الجرجاني.pdf',
            pageNumber: 42,
            author: 'عبد القاهر الجرجاني',
            excerpt: 'النظم هو توخي معاني النحو وأحكامه فيما بين الكلم على حسب الأغراض المصوغة لها.',
          }
        ]
      },
      {
        id: 'c2',
        title: 'الفصل الأول: هندسة المكان والذاكرة',
        orderIndex: 1,
        contentJson: '{"ops":[{"insert":"المكان في الرواية العربية ليس خلفية جامدة، بل هو كائن حي يتنفس مع الشخوص.\\n"}]}',
        plainText: 'المكان في الرواية العربية ليس خلفية جامدة، بل هو كائن حي يتنفس مع الشخوص ويتحول إلى فاعل سردي مستقل. عندما نصف حياً قديماً أو مدينة صاخبة، نحن ننقل وجداناً كاملاً.',
        wordCount: 5400,
        content: 'المكان في الرواية العربية ليس خلفية جامدة، بل هو كائن حي يتنفس مع الشخوص ويتحول إلى فاعل سردي مستقل. عندما نصف حياً قديماً أو مدينة صاخبة، نحن ننقل وجداناً كاملاً.',
        citations: [
          {
            id: 'cit_2',
            chapterId: 'c2',
            sourceFileName: 'جماليات_المكان_باشلار.pdf',
            pageNumber: 88,
            author: 'غاستون باشلار',
            excerpt: 'المكان الذي ننجذب إليه هو مساحة محمية تمنح الخيال ملجأً دافئاً.',
          }
        ]
      },
      {
        id: 'c3',
        title: 'الفصل الثاني: صوت الراوي والضمائر السردية',
        orderIndex: 2,
        contentJson: '{"ops":[{"insert":"اختيار زاوية الرؤية يحدد مصير العمل الأدبي.\\n"}]}',
        plainText: 'اختيار زاوية الرؤية يحدد مصير العمل الأدبي. هل يتحدث الراوي العليم بكل شيء؟ أم نشهد الأحداث عبر منظور ضمير المتكلم المنحاز لأوجاعه؟',
        wordCount: 6100,
        content: 'اختيار زاوية الرؤية يحدد مصير العمل الأدبي. هل يتحدث الراوي العليم بكل شيء؟ أم نشهد الأحداث عبر منظور ضمير المتكلم المنحاز لأوجاعه؟',
        citations: []
      }
    ]
  },
  {
    id: 'b2',
    title: 'مدارج الفكر: دراسات في الحضارة الرقمية',
    author: 'أحمد الكاتب',
    category: 'فكر ودراسات',
    coverGradient: 'from-emerald-800 via-teal-900 to-slate-950',
    coverPattern: 'geometric',
    totalPages: 240,
    currentPage: 240,
    wordCount: 42000,
    targetWordCount: 40000,
    status: 'published',
    lastModified: 'أمس',
    format: 'pdf',
    description: 'أطروحة فكرية معمقة حول تأثير خوارزميات الذكاء الاصطناعي على الهوية الثقافية العربية واستقلالية الإبداع.',
    isFavorite: true,
    chapters: [
      {
        id: 'c2_1',
        title: 'المدخل الفلسفي للعصر الرقمي',
        orderIndex: 0,
        contentJson: '{"ops":[{"insert":"نعيش اليوم تحولاً معرفياً جذرياً يعيد تشكيل علاقة الإنسان بالمعرفة والقراءة والكتابة.\\n"}]}',
        plainText: 'نعيش اليوم تحولاً معرفياً جذرياً يعيد تشكيل علاقة الإنسان بالمعرفة والقراءة والكتابة.',
        wordCount: 4500,
        content: 'نعيش اليوم تحولاً معرفياً جذرياً يعيد تشكيل علاقة الإنسان بالمعرفة والقراءة والكتابة.',
        citations: []
      }
    ]
  },
  {
    id: 'b3',
    title: 'طيف الأندلس: ملحمة قرطبة المفقودة',
    author: 'سارة الزهراني',
    category: 'رواية تاريخية',
    coverGradient: 'from-rose-900 via-red-950 to-neutral-950',
    coverPattern: 'floral',
    totalPages: 410,
    currentPage: 95,
    wordCount: 88500,
    targetWordCount: 110000,
    status: 'drafting',
    lastModified: 'منذ 3 أيام',
    format: 'project',
    description: 'رواية ملحمية ترصد حيوات المترجمين وعلماء الفلك والمخطوطات في قرطبة خلال القرن العاشر الميلادي.',
    isFavorite: false,
    chapters: [
      {
        id: 'c3_1',
        title: 'في ظلال جامع قرطبة',
        orderIndex: 0,
        contentJson: '{"ops":[{"insert":"كان الندى يبلل أعمدة الرخام الأحمر والأبيض حين اجتمع النساخون حول المخطوطة القادمة من بغداد.\\n"}]}',
        plainText: 'كان الندى يبلل أعمدة الرخام الأحمر والأبيض حين اجتمع النساخون حول المخطوطة القادمة من بغداد.',
        wordCount: 7200,
        content: 'كان الندى يبلل أعمدة الرخام الأحمر والأبيض حين اجتمع النساخون حول المخطوطة القادمة من بغداد.',
        citations: []
      }
    ]
  },
  {
    id: 'b4',
    title: 'دليل مبرمج فلاتر المتقدم: Clean Architecture',
    author: 'مهندس برمجيات كاتب',
    category: 'تقنية وبرمجة',
    coverGradient: 'from-blue-800 via-indigo-950 to-slate-950',
    coverPattern: 'circuit',
    totalPages: 180,
    currentPage: 45,
    wordCount: 31000,
    targetWordCount: 35000,
    status: 'reviewing',
    lastModified: 'منذ أسبوع',
    format: 'pdf',
    description: 'مرجع شامل لبناء تطبيقات Flutter هجينة قابلة للتوسع باستخدام BLoC وClean Architecture ومكتبات PDF والملفات.',
    isFavorite: true,
    chapters: [
      {
        id: 'c4_1',
        title: 'مبادئ SOLID وهندسة البرمجيات النظيفة في دارت',
        orderIndex: 0,
        contentJson: '{"ops":[{"insert":"إن تطبيق مبدأ المسؤولية الواحدة وعزل طبقات البيانات عن المنطق المجرد هو أساس أي مشروع مستقر وقابل للاختبار.\\n"}]}',
        plainText: 'إن تطبيق مبدأ المسؤولية الواحدة وعزل طبقات البيانات عن المنطق المجرد هو أساس أي مشروع مستقر وقابل للاختبار.',
        wordCount: 4100,
        content: 'إن تطبيق مبدأ المسؤولية الواحدة وعزل طبقات البيانات عن المنطق المجرد هو أساس أي مشروع مستقر وقابل للاختبار.',
        citations: []
      }
    ]
  },
  {
    id: 'b5',
    title: 'ديوان مرايا الغيم: قصائد معاصرة',
    author: 'يوسف الهواشمي',
    category: 'شعر وأدب',
    coverGradient: 'from-violet-900 via-purple-950 to-stone-950',
    coverPattern: 'nebula',
    totalPages: 120,
    currentPage: 120,
    wordCount: 15400,
    targetWordCount: 15000,
    status: 'published',
    lastModified: 'منذ أسبوعين',
    format: 'project',
    description: 'مجموعة قصائد شعرية تنبض بالحنين والتأمل في تضاريس المدن والوجوه العابرة.',
    isFavorite: false,
    chapters: [
      {
        id: 'c5_1',
        title: 'مرثية للمساء الأزرق',
        orderIndex: 0,
        contentJson: '{"ops":[{"insert":"على شرفة الوقتِ.. ينسابُ ظلُّ القصيدةِ في دفاتري العتيقة، كأن الحروفَ وميضٌ قديمٌ يُعانقُ صدرَ السحاب.\\n"}]}',
        plainText: 'على شرفة الوقتِ.. ينسابُ ظلُّ القصيدةِ في دفاتري العتيقة، كأن الحروفَ وميضٌ قديمٌ يُعانقُ صدرَ السحاب.',
        wordCount: 1200,
        content: 'على شرفة الوقتِ.. ينسابُ ظلُّ القصيدةِ في دفاتري العتيقة، كأن الحروفَ وميضٌ قديمٌ يُعانقُ صدرَ السحاب.',
        citations: []
      }
    ]
  }
];

export const CATEGORIES = [
  'الكل',
  'نقد وأدب',
  'رواية تاريخية',
  'فكر ودراسات',
  'تقنية وبرمجة',
  'شعر وأدب',
  'قيد التأليف',
  'المفضلة'
];
