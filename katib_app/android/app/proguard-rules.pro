# قواعد الحماية والضغط ProGuard / R8 لتطبيق كاتب (katib_app)

# 1. الحفاظ على محرك فلاتر والاتصال مع النظام (Flutter Engine & Platform Channels)
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# 2. الحفاظ على حزم Firebase و Google AI Generative
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# 3. الحفاظ على مكتبات الـ SQLite و PDFx
-keep class com.tekartik.sqflite.** { *; }
-keep class io.scer.pdfx.** { *; }

# 4. منع حذف كائنات JSON Models المستخدمة في تحويل الفصول والمراجع
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# 5. الحفاظ على حزم تحويل النص لكتاب صوتي (TTS)
-keep class com.tundralabs.fluttertts.** { *; }
