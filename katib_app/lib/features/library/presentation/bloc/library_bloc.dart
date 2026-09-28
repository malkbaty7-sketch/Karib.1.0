import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:file_picker/file_picker.dart';
import '../../domain/entities/book_entity.dart';
import '../../domain/repositories/book_repository.dart';

// Events
abstract class LibraryEvent {}

class LoadBooksEvent extends LibraryEvent {}

class SearchBooksEvent extends LibraryEvent {
  final String query;
  SearchBooksEvent(this.query);
}

class FilterByCategoryEvent extends LibraryEvent {
  final String category;
  FilterByCategoryEvent(this.category);
}

class ImportPdfBookEvent extends LibraryEvent {}

class AddNewProjectEvent extends LibraryEvent {
  final BookEntity newBook;
  AddNewProjectEvent(this.newBook);
}

class ToggleFavoriteEvent extends LibraryEvent {
  final String bookId;
  ToggleFavoriteEvent(this.bookId);
}

class DeleteBookEvent extends LibraryEvent {
  final String bookId;
  DeleteBookEvent(this.bookId);
}

// States
abstract class LibraryState {}

class LibraryLoadingState extends LibraryState {}

class LibraryLoadedState extends LibraryState {
  final List<BookEntity> allBooks;
  final List<BookEntity> filteredBooks;
  final String selectedCategory;
  final String searchQuery;

  LibraryLoadedState({
    required this.allBooks,
    required this.filteredBooks,
    this.selectedCategory = 'الكل',
    this.searchQuery = '',
  });
}

class LibraryErrorState extends LibraryState {
  final String message;
  LibraryErrorState(this.message);
}

// BLoC
class LibraryBloc extends Bloc<LibraryEvent, LibraryState> {
  final BookRepository repository;

  LibraryBloc(this.repository) : super(LibraryLoadingState()) {
    on<LoadBooksEvent>(_onLoadBooks);
    on<SearchBooksEvent>(_onSearchBooks);
    on<FilterByCategoryEvent>(_onFilterCategory);
    on<ImportPdfBookEvent>(_onImportPdf);
    on<AddNewProjectEvent>(_onAddNewProject);
    on<ToggleFavoriteEvent>(_onToggleFavorite);
    on<DeleteBookEvent>(_onDeleteBook);
  }

  void _onLoadBooks(LoadBooksEvent event, Emitter<LibraryState> emit) async {
    emit(LibraryLoadingState());
    try {
      final books = await repository.getBooks();
      emit(LibraryLoadedState(allBooks: books, filteredBooks: books));
    } catch (e) {
      emit(LibraryErrorState('تعذر تحميل الكتب: ${e.toString()}'));
    }
  }

  void _onSearchBooks(SearchBooksEvent event, Emitter<LibraryState> emit) {
    if (state is LibraryLoadedState) {
      final current = state as LibraryLoadedState;
      final filtered = current.allBooks.where((book) {
        final matchesQuery = book.title.contains(event.query) || book.author.contains(event.query);
        final matchesCategory = current.selectedCategory == 'الكل' || book.category == current.selectedCategory;
        return matchesQuery && matchesCategory;
      }).toList();
      emit(LibraryLoadedState(
        allBooks: current.allBooks,
        filteredBooks: filtered,
        selectedCategory: current.selectedCategory,
        searchQuery: event.query,
      ));
    }
  }

  void _onFilterCategory(FilterByCategoryEvent event, Emitter<LibraryState> emit) {
    if (state is LibraryLoadedState) {
      final current = state as LibraryLoadedState;
      final filtered = current.allBooks.where((book) {
        final matchesCategory = event.category == 'الكل' || book.category == event.category;
        final matchesQuery = current.searchQuery.isEmpty || 
          book.title.contains(current.searchQuery) || book.author.contains(current.searchQuery);
        return matchesCategory && matchesQuery;
      }).toList();
      emit(LibraryLoadedState(
        allBooks: current.allBooks,
        filteredBooks: filtered,
        selectedCategory: event.category,
        searchQuery: current.searchQuery,
      ));
    }
  }

  void _onImportPdf(ImportPdfBookEvent event, Emitter<LibraryState> emit) async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'epub'],
      );

      if (result != null && result.files.isNotEmpty) {
        final platformFile = result.files.single;
        final importedBook = BookEntity(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          title: platformFile.name.replaceAll('.pdf', ''),
          author: 'كتاب مستورد',
          category: 'مستندات PDF',
          totalPages: 120,
          currentPage: 1,
          wordCount: 0,
          targetWordCount: 0,
          status: 'reading',
          localFilePath: platformFile.path,
          format: 'pdf',
          lastModified: DateTime.now(),
        );

        await repository.saveBook(importedBook);
        add(LoadBooksEvent());
      }
    } catch (e) {
      emit(LibraryErrorState('فشل في استيراد الملف: ${e.toString()}'));
    }
  }

  void _onAddNewProject(AddNewProjectEvent event, Emitter<LibraryState> emit) async {
    await repository.saveBook(event.newBook);
    add(LoadBooksEvent());
  }

  void _onToggleFavorite(ToggleFavoriteEvent event, Emitter<LibraryState> emit) async {
    await repository.toggleFavorite(event.bookId);
    add(LoadBooksEvent());
  }

  void _onDeleteBook(DeleteBookEvent event, Emitter<LibraryState> emit) async {
    await repository.deleteBook(event.bookId);
    add(LoadBooksEvent());
  }
}
