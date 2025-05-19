from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils import timezone
from django.db import transaction, models as django_db_models
from django.templatetags.static import static 
from datetime import timedelta
import json

from .models import User, Book, Category, BorrowedBook
from .forms import BookForm

# --- Standard Page Rendering Views ---

def index_view(request):
    """Renders the homepage."""
    return render(request, 'index.html')

def login_page_view(request):
    """Renders the login page; redirects authenticated users to their dashboard."""
    if request.user.is_authenticated:
        return redirect('library:admin_dashboard' if request.user.is_admin else 'library:user_dashboard')
    return render(request, 'login.html')

def signup_page_view(request):
    """Renders the signup page; redirects authenticated users to their dashboard."""
    if request.user.is_authenticated:
        return redirect('library:admin_dashboard' if request.user.is_admin else 'library:user_dashboard')
    return render(request, 'signup.html')

def book_list_view(request):
    """Renders the main book listing page. Books are typically loaded via AJAX."""
    categories = Category.objects.all().order_by('name')
    context = {
        'categories_for_filter': categories,
    }
    return render(request, 'book_list.html', context)

def book_details_view(request, book_id): 
    """Renders the detail page for a single book."""
    book = get_object_or_404(Book, book_id_json=book_id)
    user_has_borrowed_this_book = False
    current_borrow_record = None

    if request.user.is_authenticated:
        current_borrow_record = BorrowedBook.objects.filter(
            book=book, user=request.user, return_date__isnull=True
        ).first()
        if current_borrow_record:
            user_has_borrowed_this_book = True
    
    context = {
        'book': book,
        'user_has_borrowed_this_book': user_has_borrowed_this_book,
        'current_borrow_record': current_borrow_record,
    }
    return render(request, 'book_details.html', context)

@login_required
@ensure_csrf_cookie 
def add_book_page_view(request):
    """Renders the page for adding a new book (admin only)."""
    if not request.user.is_admin:
        return redirect('library:index') 
    
    categories = Category.objects.all().order_by('name')
    form = BookForm() 
    context = {
        'categories_from_db': categories,
        'form_for_template': form,
        'is_editing': False,
        'book_instance': None,
        'selected_category_names': [] 
    }
    return render(request, 'add_book.html', context)

@login_required
@ensure_csrf_cookie 
def edit_book_page_view(request, book_pk):
    """Renders the page for editing an existing book (admin only)."""
    if not request.user.is_admin:
        return redirect('library:index') 
    
    book_instance = get_object_or_404(Book, pk=book_pk)
    form = BookForm(instance=book_instance, initial={'book_id_json': book_instance.book_id_json})
    selected_category_names = [cat.name for cat in book_instance.categories.all()]
    all_categories = Category.objects.all().order_by('name')
    
    context = {
        'form_for_template': form,
        'book_instance': book_instance,
        'categories_from_db': all_categories,
        'selected_category_names': selected_category_names,
        'is_editing': True
    }
    return render(request, 'add_book.html', context) 

@login_required
def admin_dashboard_view(request):
    """Renders the admin dashboard with statistics."""
    if not request.user.is_admin:
        return redirect('library:user_dashboard')
    
    total_books_count = Book.objects.count()
    available_books_sum = Book.objects.aggregate(total_available=django_db_models.Sum('available_copies'))['total_available'] or 0
    borrowed_books_count = BorrowedBook.objects.filter(return_date__isnull=True).count()
    total_users_count = User.objects.count()

    context = {
        'total_books_count': total_books_count,
        'available_books_sum': available_books_sum,
        'borrowed_books_count': borrowed_books_count,
        'total_users_count': total_users_count,
    }
    return render(request, 'admin_dashboard.html', context)

@login_required
def user_dashboard_view(request):
    """Renders the user dashboard with their borrowed books and suggestions."""
    if request.user.is_admin:
        return redirect('library:admin_dashboard') 

    current_borrowed = BorrowedBook.objects.filter(user=request.user, return_date__isnull=True).select_related('book')
    past_borrowed = BorrowedBook.objects.filter(user=request.user, return_date__isnull=False).select_related('book').order_by('-return_date')[:5]
    
    borrowed_pks = current_borrowed.values_list('book__pk', flat=True)
    suggested = Book.objects.exclude(pk__in=borrowed_pks).filter(available_copies__gt=0).order_by('?')[:3]

    context = {
        'current_borrowed_books': current_borrowed,
        'past_borrowed_books': past_borrowed,
        'suggested_books': suggested,
    }
    return render(request, 'user_dashboard.html', context)

# --- API Views ---

def books_api_view(request):
    """API endpoint to get a list of all books."""
    books_qs = Book.objects.all().order_by('book_name')
    books_data = []
    for book in books_qs:
        cover_url = None
        if book.cover_image_file and hasattr(book.cover_image_file, 'url'):
            cover_url = book.cover_image_file.url
        else: cover_url = static('images/default_cover.jpg') 

        books_data.append({
            'bookId': book.book_id_json,
            'bookName': book.book_name,
            'author': book.author,
            'categories': [cat.name for cat in book.categories.all()],
            'description': book.description,
            'publisher': book.publisher,
            'publicationDate': book.publication_date.isoformat() if book.publication_date else None,
            'language': book.language,
            'pages': book.pages,
            'isbn': book.isbn,
            'coverImage': cover_url,
            'availability': book.is_available,
            'availableCopies': book.available_copies,
            'totalCopies': book.total_copies,
            'django_pk': book.pk
        })
    return JsonResponse({'books': books_data})

@login_required
def add_book_api_view(request):
    """API endpoint for admins to add a new book."""
    if not request.user.is_admin:
        return JsonResponse({'success': False, 'message': 'Permission denied.'}, status=403)

    if request.method == 'POST':
        form = BookForm(request.POST, request.FILES)
        if form.is_valid():
            try:
                with transaction.atomic():
                    new_book = form.save(commit=False) 
                    new_book.available_copies = form.cleaned_data['total_copies'] # Ensure available = total for new book
                    new_book.save() # Save book and image file

                    # Now save M2M for categories
                    category_names = request.POST.getlist('categories_checkbox')
                    categories_to_add = []
                    for cat_name in category_names:
                        category, _ = Category.objects.get_or_create(name=cat_name.strip())
                        categories_to_add.append(category)
                    if categories_to_add:
                        new_book.categories.set(categories_to_add) 

                    return JsonResponse({
                        'success': True, 'message': 'Book added successfully!',
                        'book': {'id': new_book.pk, 'book_id_json': new_book.book_id_json, 'book_name': new_book.book_name}
                    })
            except Exception as e:
                print(f"Add Book API DB Error: {e}")
                return JsonResponse({'success': False, 'message': f'Database error: {e}'}, status=500)
        else:
            print(f"Add Book API Form Errors: {form.errors.as_json()}")
            return JsonResponse({'success': False, 'message': 'Invalid data.', 'errors': form.errors}, status=400)
    return JsonResponse({'success': False, 'message': 'POST request required.'}, status=405)

@login_required
def update_book_api_view(request, book_pk):
    """API endpoint for admins to update an existing book."""
    if not request.user.is_admin:
        return JsonResponse({'success': False, 'message': 'Permission denied.'}, status=403)

    book_instance = get_object_or_404(Book, pk=book_pk)
    if request.method == 'POST':
        form = BookForm(request.POST, request.FILES, instance=book_instance)
        if form.is_valid():
            try:
                with transaction.atomic():
                    updated_book = form.save(commit=False)
                    if updated_book.available_copies > updated_book.total_copies:
                        updated_book.available_copies = updated_book.total_copies
                    updated_book.save() # Saves main fields and ImageField if new one uploaded

                    # Update categories M2M
                    category_names = request.POST.getlist('categories_checkbox')
                    categories_to_set = []
                    for cat_name in category_names:
                        category, _ = Category.objects.get_or_create(name=cat_name.strip())
                        categories_to_set.append(category)
                    updated_book.categories.set(categories_to_set) # Clears old and adds new

                    return JsonResponse({
                        'success': True, 'message': 'Book updated successfully!',
                        'book': {'id': updated_book.pk, 'book_id_json': updated_book.book_id_json, 'book_name': updated_book.book_name}
                    })
            except Exception as e:
                print(f"Update Book API DB Error: {e}")
                return JsonResponse({'success': False, 'message': f'Database error: {e}'}, status=500)
        else:
            print(f"Update Book API Form Errors: {form.errors.as_json()}")
            return JsonResponse({'success': False, 'message': 'Invalid data.', 'errors': form.errors}, status=400)
    return JsonResponse({'success': False, 'message': 'POST request required.'}, status=405)

@login_required
def delete_book_api_view(request, book_pk):
    """API endpoint for admins to delete a book."""
    if not request.user.is_admin:
        return JsonResponse({'success': False, 'message': 'Permission denied.'}, status=403)

    book_to_delete = get_object_or_404(Book, pk=book_pk)
    if request.method == 'POST':
        try:
            with transaction.atomic():
                book_name = book_to_delete.book_name
                if BorrowedBook.objects.filter(book=book_to_delete, return_date__isnull=True).exists():
                    return JsonResponse({'success': False, 'message': f'Cannot delete "{book_name}"; it is currently borrowed.'}, status=400)
                
                book_to_delete.delete() 
                return JsonResponse({'success': True, 'message': f'Book "{book_name}" deleted successfully.'})
        except Exception as e:
            print(f"Delete Book API Error: {e}")
            return JsonResponse({'success': False, 'message': f'Error deleting book: {e}'}, status=500)
    return JsonResponse({'success': False, 'message': 'POST request required.'}, status=405)

@login_required 
def borrow_book_api_view(request, book_pk):
    """API endpoint for authenticated users to borrow a book."""
    if request.method == 'POST':
        book_to_borrow = get_object_or_404(Book, pk=book_pk)

        if not book_to_borrow.is_available:
            return JsonResponse({'success': False, 'message': 'Book is not available.'}, status=400)
        if BorrowedBook.objects.filter(user=request.user, book=book_to_borrow, return_date__isnull=True).exists():
            return JsonResponse({'success': False, 'message': 'You have already borrowed this book.'}, status=400)

        try:
            with transaction.atomic():
                book_to_borrow.available_copies -= 1
                book_to_borrow.save()
                due_date = timezone.now() + timedelta(days=14) # 2-week borrow period
                BorrowedBook.objects.create(user=request.user, book=book_to_borrow, due_date=due_date)
            return JsonResponse({'success': True, 'message': f'"{book_to_borrow.book_name}" borrowed! Due: {due_date.strftime("%b %d, %Y")}.'})
        except Exception as e:
            print(f"Borrow Book API Error: {e}")
            return JsonResponse({'success': False, 'message': f'Error borrowing book: {e}'}, status=500)
    return JsonResponse({'success': False, 'message': 'POST request required.'}, status=405)

@login_required
def return_book_api_view(request, borrowed_pk):
    """API endpoint for a user or admin to return a borrowed book."""
    if request.method == 'POST':
        try:
            borrowed_record = get_object_or_404(BorrowedBook, pk=borrowed_pk)
            if borrowed_record.user != request.user and not request.user.is_admin:
                return JsonResponse({'success': False, 'message': 'Permission denied to return this book.'}, status=403)
            if borrowed_record.return_date is not None:
                return JsonResponse({'success': False, 'message': 'Book already returned.'}, status=400)

            with transaction.atomic():
                borrowed_record.return_date = timezone.now()
                borrowed_record.save()
                book = borrowed_record.book
                book.available_copies += 1
                if book.available_copies > book.total_copies: book.available_copies = book.total_copies
                book.save()
            return JsonResponse({'success': True, 'message': f'"{book.book_name}" returned successfully.'})
        except BorrowedBook.DoesNotExist:
             return JsonResponse({'success': False, 'message': 'Borrowed record not found.'}, status=404)
        except Exception as e:
            print(f"Return Book API Error: {e}")
            return JsonResponse({'success': False, 'message': f'Error returning book: {e}'}, status=500)
    return JsonResponse({'success': False, 'message': 'POST request required.'}, status=405)

@login_required
def all_borrowed_books_api_view(request):
    """API endpoint for admins to view all currently borrowed books."""
    if not request.user.is_admin:
        return JsonResponse({'success': False, 'message': 'Permission denied.'}, status=403)

    borrowed_records = BorrowedBook.objects.filter(return_date__isnull=True)\
                                           .select_related('user', 'book')\
                                           .order_by('due_date', 'user__username')
    borrowed_data = [{
        'borrowed_pk': rec.pk, 'username': rec.user.username,
        'book_title': rec.book.book_name, 'book_pk': rec.book.pk,
        'borrow_date': rec.borrow_date.strftime('%Y-%m-%d %H:%M') if rec.borrow_date else None,
        'due_date': rec.due_date.strftime('%Y-%m-%d') if rec.due_date else None,
    } for rec in borrowed_records]
    return JsonResponse({'borrowed_books': borrowed_data})

# --- Authentication API Views ---
def signup_api_view(request):
    """API endpoint for user registration."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # validation
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            is_admin_str = data.get('is_admin', 'false')
            is_admin = is_admin_str.lower() == 'true'

            if not all([username, email, password]):
                return JsonResponse({'success': False, 'message': 'All fields are required.'}, status=400)
            if len(password) < 8:
                 return JsonResponse({'success': False, 'message': 'Password must be at least 8 characters long.'}, status=400)
            if User.objects.filter(username=username).exists():
                return JsonResponse({'success': False, 'message': 'Username already exists.'}, status=400)
            if User.objects.filter(email=email).exists():
                return JsonResponse({'success': False, 'message': 'Email already exists.'}, status=400)

            user = User.objects.create_user(username=username, email=email, password=password)
            user.is_admin = is_admin
            user.save()
            return JsonResponse({'success': True, 'message': 'Account created successfully! Please log in.'})
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'}, status=400)
        except Exception as e:
            print(f"Signup API Error: {e}")
            return JsonResponse({'success': False, 'message': f'An unexpected error occurred during signup.'}, status=500)
    return JsonResponse({'success': False, 'message': 'POST request required.'}, status=405)

def login_api_view(request):
    """API endpoint for user login."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            if not username or not password:
                return JsonResponse({'success': False, 'message': 'Username and password are required.'}, status=400)

            user = authenticate(request, username=username, password=password)
            if user is not None:
                django_login(request, user)
                return JsonResponse({'success': True, 'isAdmin': user.is_admin, 'username': user.username})
            else:
                return JsonResponse({'success': False, 'message': 'Invalid username or password.'}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'}, status=400)
        except Exception as e:
            print(f"Login API Error: {e}")
            return JsonResponse({'success': False, 'message': f'An unexpected error occurred during login.'}, status=500)
    return JsonResponse({'success': False, 'message': 'POST request required.'}, status=405)

@login_required 
def logout_api_view(request):
    """API endpoint for user logout."""
    if request.method == 'POST':
        django_logout(request)
        return JsonResponse({'success': True, 'message': 'Logged out successfully.'})
    return JsonResponse({'success': False, 'message': 'POST request required.'}, status=405)