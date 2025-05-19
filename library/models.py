from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    is_admin = models.BooleanField(default=False)

    def __str__(self):
        return self.username

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Book(models.Model):

    book_id_json = models.CharField(max_length=20, unique=True, help_text="Corresponds to bookId in original JSON") 
    book_name = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    categories = models.ManyToManyField(Category, related_name='books')
    description = models.TextField()
    publisher = models.CharField(max_length=255, blank=True, null=True)
    publication_date = models.DateField(blank=True, null=True)
    language = models.CharField(max_length=50, blank=True, null=True)
    pages = models.IntegerField(blank=True, null=True)
    isbn = models.CharField(max_length=20, unique=True, blank=True, null=True)
    cover_image_file = models.ImageField(upload_to='book_covers/', blank=True, null=True, verbose_name="Cover Image File")
    
    total_copies = models.PositiveIntegerField(default=1)
    available_copies = models.PositiveIntegerField(default=1)

    @property
    def cover_image_url(self):
        if self.cover_image_file and hasattr(self.cover_image_file, 'url'):
            return self.cover_image_file.url
        return None 
        
    @property
    def is_available(self):
        return self.available_copies > 0

    def __str__(self):
        return self.book_name
        
class BorrowedBook(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrowed_records')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='borrow_records')
    borrow_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField() # To be calculated upon borrowing
    return_date = models.DateTimeField(null=True, blank=True)
    
    @property
    def is_returned(self):
        return self.return_date is not None

    def __str__(self):
        return f"{self.user.username} borrowed {self.book.book_name}"