# Online Library Django Project

This project is a web-based Online Library system built with Django, allowing users to browse, borrow, and return books, while administrators can manage the book inventory and user activity.

## Features

*   User Authentication (Signup, Login, Logout) with distinct Admin and Regular User roles.
*   Admins:
    *   Add new books with details and cover images.
    *   Edit existing book information.
    *   Delete books from the library.
    *   View a dashboard with library statistics.
    *   Manage and view all books in a paginated table.
    *   View and manage currently borrowed books, including marking books as returned.
*   Regular Users:
    *   Browse and search for books (by title, author, category).
    *   View detailed information for each book.
    *   Borrow available books.
    *   View their dashboard with currently borrowed books and borrowing history.
    *   Return borrowed books.
*   Dynamic UI updates using JavaScript and AJAX for most operations.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

1.  **Python:** Version 3.8 or higher. You can download it from [python.org](https://www.python.org/downloads/).
    *   Make sure Python is added to your system's PATH. You can check by typing `python --version` or `python3 --version` in your terminal.
2.  **pip:** Python's package installer. It usually comes with Python installations.
    *   You can check by typing `pip --version` or `pip3 --version`.
3.  **Git:** (Optional, but recommended for cloning the project if it's in a Git repository). Download from [git-scm.com](https://git-scm.com/).

## Setup and Installation

Follow these steps to get the project running on your local machine:

1.  **Clone the Repository (if applicable):**
    If the project is hosted on a Git platform (like GitHub), clone it:
    ```bash
    git clone <repository_url>
    cd online_library_project
    ```
    If you have the project files as a ZIP, extract them and navigate into the main project directory (the one containing `manage.py`).

2.  **Create and Activate a Virtual Environment:**
    It's highly recommended to use a virtual environment to manage project dependencies.
    ```bash
    # Navigate to the project root directory (e.g., online_library_project/)
    python -m venv venv
    ```
    Activate the virtual environment:
    *   On Windows:
        ```bash
        venv\Scripts\activate
        ```
    *   On macOS/Linux:
        ```bash
        source venv/bin/activate
        ```
    Your terminal prompt should change to indicate the virtual environment is active (e.g., `(venv) ...$`).

3.  **Install Dependencies:**
    The project requires Django and Pillow (for image handling). Install them using pip:
    ```bash
    pip install Django Pillow
    ```

4.  **Apply Database Migrations:**
    This step creates the database schema (tables) based on the project's models. Django uses SQLite by default, which will create a `db.sqlite3` file in your project root.
    ```bash
    python manage.py makemigrations library
    python manage.py migrate
    ```
    *   The `makemigrations library` command prepares migration files specifically for your `library` app if there are any model changes that haven't been recorded. Usually, `migrate` is sufficient if migrations are already present.

5.  **Create a Superuser (Admin Account):**
    This account will allow you to access the Django admin interface (`/admin/`).
    ```bash
    python manage.py createsuperuser
    ```
    Follow the prompts to set a username, email (optional), and password. Remember these credentials.


## Running the Development Server

Once the setup is complete, you can run the Django development server:

```bash
python manage.py runserver
