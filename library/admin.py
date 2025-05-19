from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Category, Book, BorrowedBook

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = UserAdmin.list_display + ('is_admin',)
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('is_admin',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('is_admin',)}),
    )

admin.site.register(User, CustomUserAdmin)
admin.site.register(Category)
admin.site.register(Book) 
admin.site.register(BorrowedBook)