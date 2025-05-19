from django import forms
from .models import Book, Category

class BookForm(forms.ModelForm):
    book_id_json = forms.CharField(max_length=20, required=True, label="Book ID")
    book_name = forms.CharField(max_length=255, required=True)
    author = forms.CharField(max_length=255, required=True)
    total_copies = forms.IntegerField(min_value=0, required=True, initial=1) 
    description = forms.CharField(widget=forms.Textarea, required=True)
    
    publisher = forms.CharField(max_length=255, required=False)
    publication_date = forms.DateField(required=False, widget=forms.DateInput(attrs={'type': 'date'}))
    language = forms.CharField(max_length=50, required=False)
    pages = forms.IntegerField(min_value=1, required=False)
    isbn = forms.CharField(max_length=20, required=False)
    cover_image_file = forms.ImageField(required=False, label="Upload Cover Image")


    class Meta:
        model = Book
        fields = [
            'book_id_json', 'book_name', 'author', 'total_copies', 'description',
            'publisher', 'publication_date', 'language', 'pages', 'isbn', 
            'cover_image_file' #
        ]

    def clean_book_id_json(self):
        book_id_json = self.cleaned_data.get('book_id_json')

        query = Book.objects.filter(book_id_json=book_id_json)
        
        if self.instance and self.instance.pk:
            # If editing, exclude the current book instance from the check
            query = query.exclude(pk=self.instance.pk)
            
        if query.exists():
            raise forms.ValidationError("Another book with this ID already exists.")
        return book_id_json

    def clean_isbn(self):
        isbn = self.cleaned_data.get('isbn')
        if isbn: 
            query = Book.objects.filter(isbn=isbn)
            
            if self.instance and self.instance.pk:
                # If editing, exclude the current book instance from the check
                query = query.exclude(pk=self.instance.pk)
                
            if query.exists():
                raise forms.ValidationError("Another book with this ISBN already exists.")
        return isbn
