import 'package:flutter/material.dart';

/// نظام الثيم والتصميم الملكي المتقدم لتطبيق «كاتب» (KatibAppTheme)
/// مبني بأعلى معايير الإنتاج (Production-Ready) مع دعم كامل للغة العربية واتجاه RTL
/// يتضمن الألوان الكحلية الملكية (Royal Navy) والذهبي الأصيل (Royal Gold)
class KatibAppTheme {
  // الألوان الملكية الرئيسية (Royal Palette Tokens)
  static const Color primaryRoyalNavy = Color(0xFF0F172A); // كحلي ملكي عميق
  static const Color accentRoyalGold = Color(0xFFD97706);  // ذهبي عنبري فخم
  static const Color backgroundLight = Color(0xFFF8FAFC);  // خلفية ناصعة مريحة للعين
  static const Color cardDark = Color(0xFF1E293B);         // كحلي أردوازي للبطاقات الداكنة
  static const Color accentRoyalBlue = Color(0xFF3B82F6);  // أزرق ملكي ثانوي
  static const Color surfaceLight = Colors.white;          // أسطح الوضع الفاتح
  static const Color textMutedDark = Color(0xFF94A3B8);    // نص فرعي للوضع الداكن
  static const Color textMutedLight = Color(0xFF64748B);   // نص فرعي للوضع الفاتح
  static const Color borderDark = Color(0xFF334155);       // حدود الوضع الداكن
  static const Color borderLight = Color(0xFFE2E8F0);      // حدود الوضع الفاتح

  // الثيم الداكن (Dark Royal Theme)
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: accentRoyalGold,
      scaffoldBackgroundColor: primaryRoyalNavy,
      fontFamily: 'Tajawal',
      cardTheme: CardTheme(
        color: cardDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: accentRoyalGold.withOpacity(0.15), width: 1),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryRoyalNavy,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: 'Tajawal',
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
      colorScheme: const ColorScheme.dark(
        primary: accentRoyalGold,
        onPrimary: Colors.black,
        secondary: Color(0xFF3B82F6),
        onSecondary: Colors.white,
        surface: cardDark,
        onSurface: Color(0xFFF1F5F9),
        background: primaryRoyalNavy,
        onBackground: Color(0xFFF8FAFC),
        error: Color(0xFFEF4444),
        onError: Colors.white,
      ),
      dialogTheme: DialogTheme(
        backgroundColor: cardDark,
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: accentRoyalGold.withOpacity(0.2), width: 1),
        ),
        titleTextStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accentRoyalGold,
          foregroundColor: Colors.black,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Tajawal',
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: accentRoyalGold,
          side: const BorderSide(color: accentRoyalGold, width: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Tajawal',
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: accentRoyalGold,
          textStyle: const TextStyle(
            fontFamily: 'Tajawal',
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF0B1120),
        hintStyle: const TextStyle(
          fontFamily: 'Tajawal',
          color: textMutedDark,
          fontSize: 14,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderDark),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderDark),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: accentRoyalGold, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFEF4444), width: 1.2),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: Color(0xFF334155),
        thickness: 1,
        space: 24,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: cardDark,
        contentTextStyle: const TextStyle(
          fontFamily: 'Tajawal',
          color: Colors.white,
          fontSize: 14,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: accentRoyalGold.withOpacity(0.3)),
        ),
        behavior: SnackBarBehavior.floating,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: Colors.white, fontSize: 32),
        titleLarge: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 20),
        titleMedium: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: Colors.white, fontSize: 16),
        bodyLarge: TextStyle(fontFamily: 'Tajawal', fontSize: 16, height: 1.6, color: Color(0xFFF1F5F9)),
        bodyMedium: TextStyle(fontFamily: 'Tajawal', fontSize: 14, height: 1.5, color: Color(0xFFCBD5E1)),
        bodySmall: TextStyle(fontFamily: 'Tajawal', fontSize: 12, color: textMutedDark),
      ),
    );
  }

  // الثيم الفاتح (Light Royal Theme)
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: primaryRoyalNavy,
      scaffoldBackgroundColor: backgroundLight,
      fontFamily: 'Tajawal',
      cardTheme: CardTheme(
        color: Colors.white,
        elevation: 2,
        shadowColor: primaryRoyalNavy.withOpacity(0.05),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: backgroundLight,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: primaryRoyalNavy),
        titleTextStyle: TextStyle(
          fontFamily: 'Tajawal',
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: primaryRoyalNavy,
        ),
      ),
      colorScheme: const ColorScheme.light(
        primary: primaryRoyalNavy,
        onPrimary: Colors.white,
        secondary: accentRoyalGold,
        onSecondary: Colors.white,
        surface: Colors.white,
        onSurface: primaryRoyalNavy,
        background: backgroundLight,
        onBackground: primaryRoyalNavy,
        error: Color(0xFFDC2626),
        onError: Colors.white,
      ),
      dialogTheme: DialogTheme(
        backgroundColor: Colors.white,
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        titleTextStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: primaryRoyalNavy,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryRoyalNavy,
          foregroundColor: Colors.white,
          elevation: 1,
          shadowColor: primaryRoyalNavy.withOpacity(0.2),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Tajawal',
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryRoyalNavy,
          side: const BorderSide(color: primaryRoyalNavy, width: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Tajawal',
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: accentRoyalGold,
          textStyle: const TextStyle(
            fontFamily: 'Tajawal',
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        hintStyle: const TextStyle(
          fontFamily: 'Tajawal',
          color: textMutedLight,
          fontSize: 14,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryRoyalNavy, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFDC2626), width: 1.2),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: Color(0xFFE2E8F0),
        thickness: 1,
        space: 24,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: primaryRoyalNavy,
        contentTextStyle: const TextStyle(
          fontFamily: 'Tajawal',
          color: Colors.white,
          fontSize: 14,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        behavior: SnackBarBehavior.floating,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: primaryRoyalNavy, fontSize: 32),
        titleLarge: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: primaryRoyalNavy, fontSize: 20),
        titleMedium: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: primaryRoyalNavy, fontSize: 16),
        bodyLarge: TextStyle(fontFamily: 'Tajawal', fontSize: 16, height: 1.6, color: Color(0xFF1E293B)),
        bodyMedium: TextStyle(fontFamily: 'Tajawal', fontSize: 14, height: 1.5, color: Color(0xFF334155)),
        bodySmall: TextStyle(fontFamily: 'Tajawal', fontSize: 12, color: textMutedLight),
      ),
    );
  }
}

/// كنية متوافقة لضمان العمل مع كافة أجزاء المشروع بسلاسة (Backward Compatibility)
typedef AppTheme = KatibAppTheme;
