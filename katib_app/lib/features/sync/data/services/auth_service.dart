import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

/// خدمة إدارة الحسابات والمصادقة AuthService
/// تدعم تسجيل الدخول عبر Google وعبر البريد الإلكتروني وكلمة المرور
class AuthService {
  final FirebaseAuth _firebaseAuth;

  AuthService({FirebaseAuth? firebaseAuth})
      : _firebaseAuth = firebaseAuth ?? FirebaseAuth.instance;

  /// الحصول على المستخدم الحالي
  User? get currentUser => _firebaseAuth.currentUser;

  /// هل المستخدم مسجل دخوله حالياً
  bool get isLoggedIn => currentUser != null;

  /// تدفق تغييرات حالة المصادقة (AuthState Stream)
  Stream<User?> get authStateChanges => _firebaseAuth.authStateChanges();

  /// تسجيل الدخول كضيف (Anonymous Guest Login)
  Future<UserCredential> signInAnonymously() async {
    try {
      return await _firebaseAuth.signInAnonymously();
    } catch (e) {
      debugPrint('خطأ في تسجيل الدخول كضيف: $e');
      rethrow;
    }
  }

  /// إرسال رابط إعادة تعيين كلمة المرور
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _firebaseAuth.sendPasswordResetEmail(email: email.trim());
    } catch (e) {
      debugPrint('خطأ في إرسال رابط استعادة كلمة المرور: $e');
      rethrow;
    }
  }

  /// تسجيل الدخول عبر Google (Google Sign-In)
  Future<UserCredential?> signInWithGoogle() async {
    try {
      // مزود خدمة جوجل السحابي
      final GoogleAuthProvider googleProvider = GoogleAuthProvider();
      googleProvider.addScope('email');
      googleProvider.addScope('profile');

      if (kIsWeb) {
        return await _firebaseAuth.signInWithPopup(googleProvider);
      } else {
        return await _firebaseAuth.signInWithProvider(googleProvider);
      }
    } catch (e) {
      debugPrint('خطأ أثناء تسجيل الدخول بـ Google: $e');
      rethrow;
    }
  }

  /// تسجيل الدخول بالبريد الإلكتروني وكلمة المرور (Email & Password)
  Future<UserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      return await _firebaseAuth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
    } catch (e) {
      debugPrint('خطأ في تسجيل الدخول بالبريد: $e');
      rethrow;
    }
  }

  /// إنشاء حساب جديد بالبريد الإلكتروني وكلمة المرور
  Future<UserCredential> createUserWithEmailAndPassword({
    required String email,
    required String password,
    String? displayName,
  }) async {
    try {
      final credential = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      if (displayName != null && displayName.isNotEmpty) {
        await credential.user?.updateDisplayName(displayName);
      }
      return credential;
    } catch (e) {
      debugPrint('خطأ أثناء إنشاء الحساب: $e');
      rethrow;
    }
  }

  /// تسجيل الخروج
  Future<void> signOut() async {
    try {
      await _firebaseAuth.signOut();
    } catch (e) {
      debugPrint('خطأ أثناء تسجيل الخروج: $e');
      rethrow;
    }
  }
}
