# دليل بناء وإنتاج تطبيق كاتب للإنتاج التجاري (Katib App Release Guide)

يقدم هذا الدليل الخطوات المعتمدة خطوة بخطوة لبناء وتوقيع حزم الإنتاج الرسمية لتطبيق **كاتب (`katib_app`)** لمنصتي **Android** (بصيغة `AAB`) و **iOS** (بصيغة `.ipa`)، مع تفعيل أقصى درجات ضغط الحجم والتشفير والحماية.

---

## 📋 الفهرس
1. [تجهيز الأيقونات وشاشات البداية](#1-تجهيز-الأيقونات-وشاشات-البداية)
2. [تجهيز مفتاح التوقيع لنظام أندرويد (Keystore Setup)](#2-تجهيز-مفتاح-التوقيع-لنظام-أندرويد)
3. [بناء حزمة أندرويد الرسمية (Google Play App Bundle - .aab)](#3-بناء-حزمة-أندرويد-الرسمية-aab)
4. [بناء وتصدير تطبيق آبل (Apple App Store - .ipa)](#4-بناء-وتصدير-تطبيق-آبل-ipa)
5. [قائمة الفحص والتحقق للإنتاج (Production Checklist)](#5-قائمة-الفحص-والتحقق-للإنتاج)

---

## 1. تجهيز الأيقونات وشاشات البداية

قبل الشروع في تجميع الحزم، يتم توليد الأيقونات الملكية وشاشات البداية المتوافقة مع الوضعين الداكن والفاتح تلقائياً:

### أ) توليد أيقونات المنصات (Android & iOS)
قم بتنفيذ الأمر التالي لقراءة الإعدادات من `flutter_launcher_icons.yaml`:
```bash
flutter pub get
dart run flutter_launcher_icons
```
*النتيجة*: توليد الأيقونات في مجلدات `res/mipmap` على أندرويد و `Assets.xcassets/AppIcon.appiconset` على iOS بشعار الدرع الملكي.

### ب) توليد شاشة البداية (Native Splash Screen)
قم بتنفيذ الأمر التالي لقراءة الإعدادات من `flutter_native_splash.yaml`:
```bash
dart run flutter_native_splash:create
```
*النتيجة*: إنشاء شاشات البداية المدمجة في النظام (Native) للوضع الداكن والفاتح مع دعم كامل لـ Android 12+ Splash API.

---

## 2. تجهيز مفتاح التوقيع لنظام أندرويد (Keystore Setup)

يتطلب متجر **Google Play** توقيع حزم الإنتاج بمفتاح تشفير سري دائم:

### أ) إنشاء ملف الـ Keystore
قم بتوليد المفتاح باستخدام أداة `keytool` (عبر سطر الأوامر):
```bash
keytool -genkey -v -keystore android/app/upload-keystore.jks \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -alias katib_upload
```

### ب) إعداد ملف `android/key.properties`
أنشئ ملفاً باسم `key.properties` داخل مجلد `android/` وضعه في قائمة `.gitignore` لضمان عدم رفعه للـ Git:
```properties
storePassword=YOUR_STRONG_STORE_PASSWORD
keyPassword=YOUR_STRONG_KEY_PASSWORD
keyAlias=katib_upload
storeFile=upload-keystore.jks
```

*ملاحظة*: تم ضبط `android/app/build.gradle` ليقرأ هذا الملف تلقائياً ويطبقه عند بناء الـ Release.

---

## 3. بناء حزمة أندرويد الرسمية (.aab)

يعد تنسيق **Android App Bundle (.aab)** التنسيق الإلزامي للنشر على متجر Google Play، حيث يتيح تصغير حجم التنزيل للمستخدمين بنسبة تصل إلى 40%.

### أ) تنظيف المشروع واختبار الأكواد
```bash
flutter clean
flutter pub get
flutter test
```

### ب) أمر بناء حزمة الإنتاج (.aab) مع التشويش وتقليص الحجم
```bash
flutter build appbundle --release \
  --obfuscate \
  --split-debug-info=build/app/outputs/symbols
```

#### مميزات هذا الأمر:
- تفعيل خاصية **`minifyEnabled true`** وحذف الأكواد البرمجية غير المستخدمة.
- تفعيل خاصية **`shrinkResources true`** لحذف الصور والخطوط الزائدة وتصغير حجم الحزمة النهائي.
- تشويش الكود المصدري (**`--obfuscate`**) لمنع الهندسة العكسية وحماية حقوق التطبيق.
- حفظ رموز استكشاف الأخطاء (**`symbols`**) لربطها بـ Firebase Crashlytics أو Google Play Console.

📍 **مسار الملف الناتج:**
```
katib_app/build/app/outputs/bundle/release/app-release.aab
```

---

### ج) أمر بديل: بناء ملفات APK مقسمة للاختبار الداخلي (Per-ABI APKs)
إذا أردت تجربة التطبيق مباشرة على أجهزة الفحص دون رفعه للمتجر:
```bash
flutter build apk --release --split-per-abi
```
📍 **الملفات الناتجة:**
- `app-armeabi-v7a-release.apk` (للأجهزة القديمة)
- `app-arm64-v8a-release.apk` (لأجهزة الهواتف الحديثة - الحجم الأصغر)
- `app-x86_64-release.apk` (لأجهزة المحاكاة وسطح المكتب)

---

## 4. بناء وتصدير تطبيق آبل (.ipa)

يتطلب متجر **Apple App Store** إنشاء حساب مطور مسجل وشهادات توقيع رقمية:

### أ) تحديث ملحقات iOS
```bash
cd ios
pod install --repo-update
cd ..
```

### ب) أمر بناء ملف التوزيع المباشر (.ipa)
قم بتنفيذ أمر البناء الموجه للإنتاج:
```bash
flutter build ipa --release \
  --obfuscate \
  --split-debug-info=build/ios/outputs/symbols
```

📍 **مسار الحزمة الناتجة:**
```
katib_app/build/ios/ipa/katib_app.ipa
```

### ج) الرفع إلى App Store Connect
يمكنك رفع الملف إلى المتجر بإحدى طريقتين:
1. **عبر سطر الأوامر (xcrun altool)**:
```bash
xcrun altool --upload-app --type ios \
  -f build/ios/ipa/katib_app.ipa \
  --apiKey YOUR_API_KEY_ID \
  --apiIssuer YOUR_ISSUER_UUID
```
2. **عبر تطبيق Apple Transporter**: اسحب ملف `.ipa` الناتج وأفلته في التطبيق ثم اضغط **Deliver**.

---

## 5. قائمة الفحص والتحقق للإنتاج (Production Checklist)

قبل الضغط على زر النشر النهائي في لوحة التحكم، تأكد من مطابقة النقاط التالية:

| المتطلب | الحالة في المشروع | ملاحظات |
| :--- | :---: | :--- |
| **إصدار SDK أندرويد** | `targetSdk = 34` | متوافق مع Android 14 ومتطلبات Google Play لعام 2024+. |
| **الحد الأدنى لـ SDK** | `minSdk = 24` | يدعم محرك الـ PDFx والـ Desugaring والأداء العالي. |
| **تقليص الحجم والموارد** | `minifyEnabled true`<br>`shrinkResources true` | مدمج في `build.gradle` لتقليل مساحة التطبيق بأكثر من 35%. |
| **حماية الخصوصية** | `CrashReportingService` | تفعيل خاصية تجريد نصوص الكاتب التامة (Zero PII Redaction). |
| **أيقونة التطبيق** | درع ملكي عنبري | تم إعدادها في `flutter_launcher_icons.yaml`. |
| **شاشة البداية** | Dark & Light | تم إعدادها في `flutter_native_splash.yaml`. |
| **دعم RTL التام** | مفعل 100% | اختبار محاذاة الخطوط العربية (Cairo & Tajawal) ومحرر النصوص. |
| **قواعد ProGuard** | `proguard-rules.pro` | الحفاظ على مكتبات SQLite و PDFx و Firebase والـ Gemini SDK. |
