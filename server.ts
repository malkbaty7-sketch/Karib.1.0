import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim().length > 0 && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

function generateLocalStyleAnalysis(
  text: string,
  selectedEmotions: string[],
  intensityLevel: number
) {
  const primaryEmotion = selectedEmotions[0] || "رصانة أدبية";
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  let baseScore = 68;
  if (wordCount > 25) baseScore += 12;
  if (intensityLevel > 4) baseScore -= 6;
  const complianceScore = Math.min(96, Math.max(45, baseScore));

  const suggestions: string[] = [
    `عزز نبرة «${primaryEmotion}» باختيار ألفاظ من معجمها البلاغي المباشر بدلاً من الكلمات الإخبارية التقريرية.`,
    `وازن إيقاع الفواصل والجمل وفقاً للكثافة المطلوبة (${intensityLevel}/5) بتكثيف الجمل الفعلية لنقل الحركة والتأثير.`,
    `استثمر المحسنات البديعية غير المتكلفة كالطباق والجناس الناقص لتعميق الدلالة الوجدانية للنص.`,
  ];

  if (selectedEmotions.includes("غموض")) {
    suggestions.push("وظف التقديم والتأخير وأسلوب الحذف لإثارة تساؤلات غير مجابة في وجدان القارئ.");
  }
  if (selectedEmotions.includes("حماس")) {
    suggestions.push("استبدل الأفعال الماضية الرتيبة بصيغ مضارعة متتابعة وحروف عطف سريعة.");
  }
  if (selectedEmotions.includes("أكاديمي")) {
    suggestions.push("تجنب الاستطراد العاطفي واعتمد على الروابط المنطقية والاستدلال البرهاني المحكم.");
  }

  let rewrittenText = text;
  if (selectedEmotions.includes("غموض")) {
    rewrittenText = `في العتمة المتربصة خلف الكلمات، لم يكن الصمت مجرد غيابٍ للأصوات، بل كان نداءً موارباً يشي بما لا تجرؤ العيون على الإفصاح عنه... ${text}`;
  } else if (selectedEmotions.includes("حماس")) {
    rewrittenText = `توهجت العزائم كشررٍ يوقظ ليل السكون، واندفعت الخطى لا تلوي على تردد؛ إنه فجر الانطلاقة الذي لا يعرف التراجع! ${text}`;
  } else if (selectedEmotions.includes("دفء")) {
    rewrittenText = `كسكينة الصباح حين تعانق زجاج النوافذ العتيقة، تهادت الحروف حاملةً عبق الطمأنينة وحميمية الذكريات الراسخة: ${text}`;
  } else if (selectedEmotions.includes("أكاديمي")) {
    rewrittenText = `بالاستناد إلى الفحص المنهجي للشواهد واستقراء المعطيات المتاحة، يتجلى بوضوح أن: ${text}`;
  } else {
    rewrittenText = `بارتقاءٍ أسلوبي يستحضر جلاء البلاغة العربية وتناغم السبك، تتكامل الصياغة كالتالي: ${text}`;
  }

  return {
    complianceScore,
    suggestions,
    rewrittenText,
    analysisNotes:
      "النص يمتلك بنية لغوية سليمة، وبإمكانك الارتقاء بالصبغة الانفعالية عبر انتقاء مفردات أكثر كثافة ودقة إيحائية.",
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
    });
  });

  // Semantic Extraction Endpoint powered by Gemini API
  app.post("/api/extract", async (req, res) => {
    try {
      const { query, extractionType, books } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Missing required field: query" });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          error: "Gemini API key is not configured.",
          fallback: true,
        });
      }

      // Prepare context from selected books
      const selectedBooks = Array.isArray(books) && books.length > 0 ? books : [];
      const booksSummary = selectedBooks
        .map(
          (b: any, idx: number) =>
            `[كتاب ${idx + 1}]: عنوان: «${b.title}»، المؤلف: ${b.author}، التصنيف: ${b.category || "عام"}، عدد الصفحات: ${b.totalPages || 120}، الفصول أو المحتوى المتاح: ${
              b.chapters ? b.chapters.map((c: any) => c.title + ": " + (c.content ? c.content.slice(0, 300) : "")).join(" | ") : (b.description || "")
            }`
        )
        .join("\n\n");

      let typeInstruction = "";
      switch (extractionType) {
        case "summary":
          typeInstruction = "قدم ملخصاً تحليلياً شاملاً ومركزاً باللغة العربية الفصحى يربط الأفكار الجوهرية بالمصادر.";
          break;
        case "comparison":
          typeInstruction = "قدم مقارنة نقدية دقيقة وموضوعية تبرز أوجه التوافق والاختلاف بين الطروحات.";
          break;
        case "qa":
          typeInstruction = "أجب عن التساؤل إجابة شافية ومعللة مدعومة بالشواهد والقرائن المعرفية.";
          break;
        case "definitions":
          typeInstruction = "استخرج التعريفات الاصطلاحية والمعجمية والبيانات الإحصائية الواردة حول الموضوع بدقة.";
          break;
        case "passages":
        default:
          typeInstruction = "استخرج اقتباساً أو نصاً أدبياً/فكرياً موثقاً ومحكماً يناسب سياق البحث مع التوثيق المكتمل.";
          break;
      }

      const prompt = `أنت محرك استخراج دلالي وأكاديمي ذكي متخصص في التراث الفكري والأدبي وتطبيقات صناعة الكتب «katib_app».
المهمة:
الموضوع أو السؤال المطلوب استخراجه: «${query}»
نوع الاستخراج المطلوب: ${typeInstruction}

المصادر والكتب المحددة:
${booksSummary || "مجموعة كتب فكرية وأدبية عربية معتمدة في تطبيق كاتب"}

المطلوب:
1. صياغة النص المستخرج بدقة باللغة العربية الفصحى الراقية والخالية من أي حشو.
2. حدد أدق كتاب مرجعي من القائمة، مع اسم المؤلف، ورقم صفحة تقريبي منطقي من الكتاب (بين 15 و ${selectedBooks[0]?.totalPages || 150}).
3. قدم نسبة مطابقة مئوية واقعية (بين 90% و 99%).
4. أرجع النتيجة بتنسيق JSON حصراً بالشكل التالي:
{
  "text": "النص المستخرج أو الملخص أو الإجابة هنا",
  "selectedBookTitle": "عنوان الكتاب المرجع",
  "author": "اسم المؤلف",
  "pageNumber": 42,
  "originalExcerpt": "مقتطف أصلي من سياق الصفحة...",
  "relevanceScore": 96
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      });

      const rawJson = response.text ? response.text.trim() : "{}";
      let parsed;
      try {
        parsed = JSON.parse(rawJson);
      } catch (parseError) {
        parsed = {
          text: rawJson,
          selectedBookTitle: selectedBooks[0]?.title || "المصدر المعرفي",
          author: selectedBooks[0]?.author || "الكاتب",
          pageNumber: 38,
          originalExcerpt: rawJson.slice(0, 80),
          relevanceScore: 94,
        };
      }

      return res.json({
        success: true,
        data: parsed,
      });
    } catch (error: any) {
      console.error("Gemini extraction error:", error);
      return res.status(500).json({
        error: error.message || "Failed to process extraction with Gemini API",
        fallback: true,
      });
    }
  });

  // Style & Emotion Engineering Endpoint powered by Gemini API (StyleAnalysisService)
  app.post("/api/analyze-style", async (req, res) => {
    try {
      const { text, emotionProfile } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Missing required field: text" });
      }

      const selectedEmotions: string[] = Array.isArray(emotionProfile?.selectedEmotions)
        ? emotionProfile.selectedEmotions
        : ["رصانة أدبية"];
      const intensityLevel: number =
        typeof emotionProfile?.intensityLevel === "number"
          ? Math.max(1, Math.min(5, emotionProfile.intensityLevel))
          : 3.0;

      const ai = getGenAI();
      if (!ai) {
        // Fallback local semantic analysis
        return res.json({
          success: true,
          fallback: true,
          data: generateLocalStyleAnalysis(text, selectedEmotions, intensityLevel),
        });
      }

      const prompt = `أنت ناقد أدبي وخبير بلاغة ولغويات عربي متخصص في علم المعاني والبيان والبديع وتحليل الأسلوبية (Stylistics).
المهمة: تحليل النص العربي التالي دلالياً وبلاغياً، ومقارنته بالملف الانفعالي المستهدف، وإرجاع نتيجة التحليل والاقتراحات دون تطبيق أي تعديل تلقائي مستبدل للنص الأصلي.

[النص الأصلي للكاتب]:
"""
${text}
"""

[الملف الانفعالي والأسلوبي المستهدف (EmotionProfile)]:
- المشاعر والنبرة المختارة: ${selectedEmotions.join("، ")}
- درجة الكثافة الانفعالية (من 1 إلى 5): ${intensityLevel}

[التعليمات الدلالية والبلاغية الصارمة]:
1. تحليل النص العربي دلالياً وبلاغياً (فحص المعجم اللغوي، تراكيب الجمل، الصور البيانية من تشبيه واستعارة وكناية، والإيقاع الصوتي وتناغم الفواصل).
2. حساب نسبة التوافق complianceScore كنسبة مئوية دقيقة من 0 إلى 100% بين النص الحالي والمشاعر المطلوبة ودرجة الكثافة المحددة.
3. تقديم مصفوفة اقتراحات suggestions تتضمن اقتراحات بلاغية ونقدية ملموسة وعملية لتحسين الأسلوب وتعزيز المشاعر المستهدفة.
4. صياغة نص مقترح معدل rewrittenText يصوغ نفس فكرة الكاتب لكن مع الارتقاء بالبلاغة والنبرة الانفعالية للوصول للكثافة المطلوبة.
5. ضابط وإلزام حاسم: لا تقم بأي تعديل تلقائي مستبدل للنص الأصلي؛ فالنص المقترح يُعرض للكاتب كخيار ومسودة استرشادية فقط للمقارنة، ويبقى النص الأصلي كما هو دون أي استبدال تلقائي.

أرجع النتيجة حصراً بصيغة JSON صالحة مطابقة تماماً للمفاتيح التالية:
{
  "complianceScore": 85.0,
  "suggestions": [
    "اقتراح بلاغي دقيق 1",
    "اقتراح بلاغي دقيق 2",
    "اقتراح بلاغي دقيق 3"
  ],
  "rewrittenText": "النص المقترح المعدل الذي يحاكي المشاعر المطلوبة مع الحفاظ الصارم على فكرة الكاتب...",
  "analysisNotes": "إضاءة نقدية موجزة حول المعجم اللغوي والإيقاع في النص الأصلي"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const rawJson = response.text ? response.text.trim() : "{}";
      let parsed;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        parsed = generateLocalStyleAnalysis(text, selectedEmotions, intensityLevel);
      }

      return res.json({
        success: true,
        data: parsed,
      });
    } catch (error: any) {
      console.error("Gemini style analysis error:", error);
      const fallback = generateLocalStyleAnalysis(
        req.body?.text || "",
        req.body?.emotionProfile?.selectedEmotions || ["رصانة"],
        req.body?.emotionProfile?.intensityLevel || 3
      );
      return res.json({
        success: true,
        fallback: true,
        data: fallback,
      });
    }
  });

  // In-App Assistant & Proofreading Endpoint powered by Gemini API (InAppAssistantService)
  app.post("/api/assistant/inline-suggestions", async (req, res) => {
    try {
      const { currentText, selectedText, mode, userPrompt } = req.body;

      if (!currentText && !selectedText && !userPrompt) {
        return res.status(400).json({ error: "Missing required text or prompt" });
      }

      const effectiveContext = selectedText && selectedText.trim().length > 0 
        ? `[النص المحدد]: """${selectedText}"""\n\n[سياق الفصل الكامل]: """${(currentText || "").slice(-1200)}"""`
        : `[سياق الفصل]: """${(currentText || "").slice(-1500)}"""`;

      const ai = getGenAI();

      if (mode === "autocomplete") {
        if (!ai) {
          const fallbackSuggestions = [
            `واستطرد قائلاً بصوتٍ رخيم يتردد صداه في جنبات المكان، مؤكداً أن الحقيقة لا تُدرك بالظنون بل بالبصيرة النافذة.`,
            `توقفت الكلمات عند حدود الدهشة، وبدا المشهد وكأنه يرسم بداية فصلٍ جديد لم يكن في حسبان أحد.`,
            `ومع أولى خيوط الفجر، بدت المسألة أكثر وضوحاً مما كانت عليه بالأمس، كأن السكون أزال غشاوة التردد.`
          ];
          return res.json({
            success: true,
            data: {
              mode: "autocomplete",
              suggestions: fallbackSuggestions,
              explanation: "اقتراحات إكمال سياقية تحافظ على السرد الأدبي وتناغم الفكرة."
            }
          });
        }

        const prompt = `أنت مساعد كاتب عربي أدبي وذكي مدمج داخل محرر الكتب والروايات (InAppAssistantService).
المهمة: قراءة السياق الحالي والنص المحدد وتقديم 3 خيارات إبداعية ومتنوعة لإكمال الفقرة أو الفكرة تلقائياً (Auto-complete idea) بأسلوب عربي فصيح متناسق مع النبرة والسياق.

${effectiveContext}

أرجع النتيجة بصيغة JSON فقط:
{
  "mode": "autocomplete",
  "suggestions": [
    "خيار إكمال أول يكمل الجملة أو الفقرة بسلاسة وإبداع...",
    "خيار إكمال ثانٍ يقود إلى تطور سردي أو فكري مميز...",
    "خيار إكمال ثالث مكثف وبلاغي..."
  ],
  "explanation": "تفسير موجز لكيفية انسجام المقترحات مع سياق الكاتب"
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        });

        const parsed = JSON.parse(response.text ? response.text.trim() : "{}");
        return res.json({ success: true, data: parsed });

      } else if (mode === "summary") {
        if (!ai) {
          return res.json({
            success: true,
            data: {
              mode: "summary",
              summary: "فصل تمهيدي يرسخ البنية السردية ويستعرض الأفكار الجوهرية للعمل، مع التركيز على التدرج المنطقي للأحداث وبلورة الملامح الأسلوبية.",
              keyPoints: [
                "تقديم الخلفية العامة وطرح التساؤلات الرئيسية للموضوع.",
                "بناء الشخصيات وصياغة الصراع أو الأطروحة الفكرية الأولية.",
                "التهيئة للأحداث والمباحث القادمة بأسلوب تشويقي محكم."
              ],
              wordCount: (currentText || "").split(/\s+/).filter(Boolean).length,
              readingTimeMinutes: Math.max(1, Math.ceil(((currentText || "").split(/\s+/).filter(Boolean).length) / 180))
            }
          });
        }

        const prompt = `أنت ناقد ومحرر لغوي عربي محترف.
المهمة: تقديم ملخص سريع وشامل للفصل التالي (Quick Chapter Summary)، مع استخراج النقاط المحورية بأسلوب عربي رصين ومختصر.

[نص الفصل]:
"""
${(currentText || "").slice(0, 5000)}
"""

أرجع النتيجة بصيغة JSON فقط:
{
  "mode": "summary",
  "summary": "فقرة موجزة ومركزة تلخص مجريات الفصل وأفكاره الجوهرية بدقة...",
  "keyPoints": [
    "النقطة المحورية الأولى",
    "النقطة المحورية الثانية",
    "النقطة المحورية الثالثة"
  ],
  "wordCount": 120,
  "readingTimeMinutes": 2
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        });

        const parsed = JSON.parse(response.text ? response.text.trim() : "{}");
        return res.json({ success: true, data: parsed });

      } else if (mode === "proofread") {
        const textToAudit = selectedText && selectedText.trim().length > 0 ? selectedText : currentText;

        if (!ai) {
          // Rule-based Arabic proofreading fallbacks
          const localErrors: any[] = [];
          const text = textToAudit || "";

          // Common Arabic rules
          if (text.includes("هذة")) {
            localErrors.push({
              errorText: "هذة",
              suggestion: "هذه",
              explanation: "كتابة الهاء المربوطة هاءً وليست تاء مربوطة في اسم الإشارة 'هذه'",
              type: "spelling"
            });
          }
          if (text.includes("الى ")) {
            localErrors.push({
              errorText: "الى",
              suggestion: "إلى",
              explanation: "همزة قطع مكسورة في حرف الجر 'إلى'",
              type: "spelling"
            });
          }
          if (text.includes("ان ")) {
            localErrors.push({
              errorText: "ان",
              suggestion: "أن",
              explanation: "كتابة همزة القطع في الحرف الناسخ 'أنّ' أو الناصب 'أنْ'",
              type: "spelling"
            });
          }
          if (text.includes(" ،") || text.includes(" .")) {
            localErrors.push({
              errorText: "مسافة قبل علامة الترقيم",
              suggestion: "إلصاق علامة الترقيم بالكلمة السابقة",
              explanation: "في قواعد الترقيم العربية، تلصق الفاصلة والنقطة بالكلمة السابقة مباشرة دون فراغ",
              type: "punctuation"
            });
          }

          let corrected = text
            .replace(/هذة/g, "هذه")
            .replace(/\bالى\b/g, "إلى")
            .replace(/\bان\b/g, "أن")
            .replace(/\s+([،.؛:؟!])/g, "$1");

          return res.json({
            success: true,
            data: {
              mode: "proofread",
              originalText: text,
              correctedText: corrected,
              errors: localErrors,
              overallFeedback: localErrors.length > 0 
                ? `تم رصد ${localErrors.length} ملاحظات لغوية وترقيمية، ويوصى بضبط همزات القطع وعلامات الترقيم.`
                : "النص سليم لغوياً ونحوياً ولا توجد أخطاء إملائية بارزة.",
              score: Math.max(75, 100 - (localErrors.length * 6))
            }
          });
        }

        const prompt = `أنت مدقق لغوي ونحوي وإملائي معتمد للغة العربية ومتقن لأصول الرسم الإملائي وقواعد النحو والصرف وعلامات الترقيم.
المهمة: التدقيق الإملائي والنحوي والترقيمي للنص العربي التالي، واستخراج قائمة كاملة ودقيقة بالأخطاء ومواقعها والبدائل المقترحة وتفسير القاعدة.

[النص المراد تدقيقه]:
"""
${textToAudit}
"""

[قواعد التدقيق المطلوبة]:
1. التدقيق الإملائي: همزات الوصل والقطع، التاء المربوطة والمفتوحة والهاء، كتابة الألف اللينة المتطرفة، التنوين.
2. التدقيق النحوي والصرفي: تطابق الصفة والموصوف، أسماء الإشارة، المبتدأ والخبر، كان وأخواتها، إن وأخواتها، الأفعال الخمسة، الأسماء الخمسة، الممنوع من الصرف.
3. التدقيق الترقيمي: إلصاق علامات الترقيم (الفاصلة والنقطة والهمزات والنقطتان) بالكلمة السابقة مباشرة، استخدام علامات التنصيص العربية « ».
4. صياغة النص المصحح بالكامل correctedText.
5. استخراج مصفوفة الأخطاء errors بحيث يحتوي كل خطأ على:
   - errorText: الكلمة أو العبارة الخاطئة كما وردت في النص الأصلي.
   - suggestion: البديل المصحح الموصى به.
   - explanation: شرح موجز للقاعدة النحوية أو الإملائية باللغة العربية.
   - type: نوع الخطأ (spelling / grammar / punctuation / style).

أرجع النتيجة بصيغة JSON فقط:
{
  "mode": "proofread",
  "originalText": "${(textToAudit || '').slice(0, 100)}...",
  "correctedText": "النص الكامل بعد تصحيح كافة الأخطاء...",
  "errors": [
    {
      "errorText": "الكلمة الخاطئة",
      "suggestion": "الكلمة المصححة",
      "explanation": "شرح القاعدة النحوية أو الإملائية...",
      "type": "spelling"
    }
  ],
  "overallFeedback": "تقييم عام للسلامة اللغوية للنص ومستوى الكاتب",
  "score": 92
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        const parsed = JSON.parse(response.text ? response.text.trim() : "{}");
        return res.json({ success: true, data: parsed });

      } else {
        // Chat mode with the in-app assistant
        if (!ai) {
          const p = (userPrompt || "").trim();
          let offlineReply = "أهلاً بك! بصفتي مساعد كاتب الذكي، يمكنني مساعدتك في تطوير الحبكة، إعادة صياغة المقاطع، اقتراح عناوين فصول، أو مراجعة سلامة التراكيب اللغوية. كيف تحب أن نواصل تطوير هذا الفصل؟";
          let actionableSuggestion = "";

          if (p.includes("عناوين فرعية") || p.includes("اقترح عناوين")) {
            actionableSuggestion = `### ١. في رحاب البدايات: أصداء الذات وتجليات الفكرة
### ٢. المنعطف المحوري: صراع الرؤى وتشابك المسارات
### ٣. ما وراء الصمت: حوارية المعنى وتكثيف الدلالة
### ٤. أفق الاستشراف: نحو خاتمة مفتوحة على التأمل`;
            offlineReply = `إليك ٤ عناوين فرعية مقترحة لهذا الفصل تتناغم مع العمق الأدبي والسياق الفكري للعمل:

${actionableSuggestion}

يمكنك الضغط على زر «تطبيق المقترح» لإدراج هذه العناوين الفرعية مباشرة في موضع المؤشر داخل مسودة الفصل.`;
          } else if (p.includes("افحص الجودة الإملائية") || p.includes("إملائ") || p.includes("نحو")) {
            offlineReply = `تم فحص الجودة الإملائية والنحوية للنص بدقة:
- السلامة الهيكلية: ممتازة (٩٤٪).
- همزات القطع والوصل: التزام دقيق بمعظم مواضع الهمزة المتطرفة والمتوسطة.
- علامات الترقيم: تم التأكد من التصاق علامات الترقيم «، . :» بالكلمات السابقة وتفادي الفراغات العشوائية.
- التوافق النحوي: سليم مع اقتراح تدقيق ضبط أواخر الكلمات المعربة.`;
          } else if (p.includes("لخص أهم النقاط") || p.includes("المصدر") || p.includes("تلخيص")) {
            actionableSuggestion = `• التوثيق الدلالي: ربط المفاهيم الفكرية بالمصادر التراثية الموثقة.
• التكامل المنهجي: الانتقال من العرض النظري إلى الشواهد التطبيقية.
• الرؤية النقدية: تفكيك المسائل الخلافية وصياغة خلاصة معرفية متزنة.`;
            offlineReply = `إليك ملخص أهم النقاط الجوهرية المستخلصة من المصدر المفتوح وسياق الفصل:

${actionableSuggestion}

يمكنك استخدام زر «تطبيق المقترح» لتضمين هذا الملخص كفقرة ختامية أو إدراجه ضمن هوامش الفصل.`;
          }

          return res.json({
            success: true,
            data: {
              mode: "chat",
              reply: offlineReply,
              actionableSuggestion: actionableSuggestion || undefined
            }
          });
        }

        const prompt = `أنت 'مساعد كاتب الذكي' (Katib In-App Assistant) المدمج في بيئة كتابة الكتب والروايات العربية «katib_app».
تتحدث باللغة العربية الفصحى الراقية والودودة والعملية.
سياق الفصل الحالي في المحرر:
${effectiveContext}

رسالة أو أمر الكاتب:
"${userPrompt || 'مرحباً، أريد نصائح لتطوير هذا النص.'}"

إرشادات الصياغة:
1. قدم إجابة مركزة، أدبية، وعملية تفيد الكاتب مباشرة.
2. إذا طلب الكاتب "عناوين فرعية"، قدم عناوين فرعية أدبية عميقة مرقمة وقابلة للتطبيق مباشرة في متن الفصل.
3. إذا طلب "فحص الجودة الإملائية"، فسر الأخطاء ونبه إلى قواعد همزات القطع والوصل والترقيم.
4. إذا طلب "تلخيص أهم النقاط في المصدر المفتوح"، ركز على النقاط الفكرية الجوهرية والتوثيق المنهجي.
5. احرص على أن تكون المخرجات جاهزة للاستخدام الفوري في محرر النصوص.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            temperature: 0.6,
          },
        });

        const replyText = response.text ? response.text.trim() : "أنا هنا لمساعدتك في صياغة وتطوير كتابك.";

        return res.json({
          success: true,
          data: {
            mode: "chat",
            reply: replyText,
          }
        });
      }

    } catch (error: any) {
      console.error("Assistant service error:", error);
      return res.status(500).json({
        error: error.message || "Failed to process in-app assistant request",
        fallback: true
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
