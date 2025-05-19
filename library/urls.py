from django.urls import path
from . import views

app_name = 'library'

urlpatterns = [
    path('', views.index_view, name='index'),
    path('login/', views.login_page_view, name='login_page'), # Changed name
    path('signup/', views.signup_page_view, name='signup_page'),
    path('api/signup/', views.signup_api_view, name='signup_api'),
    path('api/login/', views.login_api_view, name='login_api'),
    path('api/logout/', views.logout_api_view, name='logout_api'),
    path('books/', views.book_list_view, name='book_list'), # Clean URL
    path('books/<str:book_id>/', views.book_details_view, name='book_detail'),
    path('add-book/', views.add_book_page_view, name='add_book_page'),
    path('api/books/add/', views.add_book_api_view, name='add_book_api'), 
    path('api/books/', views.books_api_view, name='books_api'),
    path('api/books/borrow/<int:book_pk>/', views.borrow_book_api_view, name='borrow_book_api'),
    path('api/borrowed-books/return/<int:borrowed_pk>/', views.return_book_api_view, name='return_book_api'),
    path('edit-book/<int:book_pk>/', views.edit_book_page_view, name='edit_book_page'),
    path('api/books/update/<int:book_pk>/', views.update_book_api_view, name='update_book_api'),
    path('api/books/delete/<int:book_pk>/', views.delete_book_api_view, name='delete_book_api'),
    path('api/borrowed-books/all/', views.all_borrowed_books_api_view, name='all_borrowed_books_api'),
    path('admin-dashboard/', views.admin_dashboard_view, name='admin_dashboard'),
    path('user-dashboard/', views.user_dashboard_view, name='user_dashboard'),
]