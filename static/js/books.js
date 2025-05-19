
let allBooksGlobal = []; // Stores all books fetched from the API for client-side filtering.

// Initializes book fetching and filter setup when the DOM is ready.
document.addEventListener('DOMContentLoaded', function() {
    if (!window.APP_URLS?.booksApi) {
        console.error("Books JS: APP_URLS.booksApi not defined.");
        displayBookGridMessage("<p class='error-message'>Configuration error: Cannot load books.</p>");
        return;
    }

    fetch(window.APP_URLS.booksApi)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error ${response.status}: Failed to fetch books.`);
            return response.json();
        })
        .then(data => {
            if (data.books) {
                allBooksGlobal = data.books; 
                displayBooks(data.books);
                setupBookListFilters();      
                populateCategoryFilterOptions(data.books); 
            } else {
                displayBookGridMessage("<p class='error-message'>No books found or error in data format.</p>");
            }
        })
        .catch(error => {
            console.error('Error fetching books for book list:', error);
            displayBookGridMessage(`<p class='error-message'>Failed to load books: ${error.message}.</p>`);
        });
});

// Renders book cards into the .book-grid element.
function displayBooks(booksToDisplay) {
    const bookGrid = document.querySelector('.book-grid');
    if (!bookGrid) { console.error("Element '.book-grid' not found."); return; }
    bookGrid.innerHTML = ''; 
    
    if (!booksToDisplay || booksToDisplay.length === 0) {
        bookGrid.innerHTML = '<p class="no-results">No books matching your criteria found.</p>';
        return;
    }
    
    booksToDisplay.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        
        const availabilityStatus = book.availability ? 'available' : 'borrowed';
        const borrowButtonState = book.availability ? '' : 'disabled';
        const borrowButtonText = book.availability ? 'Borrow' : (book.totalCopies > 0 ? 'Unavailable' : 'Out of Stock');
        const isAdmin = typeof localIsAdmin === 'function' ? localIsAdmin() : false; // From auth.js

        const coverImageUrl = book.coverImage || '/static/images/default_cover.jpg';
        let detailUrl = (window.APP_URLS?.bookDetailBase && book.bookId) ? `${window.APP_URLS.bookDetailBase}${book.bookId}/` : '#';
        let editUrl = (isAdmin && window.APP_URLS?.editBookPageBase && book.django_pk) ? `${window.APP_URLS.editBookPageBase}${book.django_pk}/` : '#';


        bookCard.innerHTML = `
            <img src="${coverImageUrl}" alt="${book.bookName || 'Book'} cover" class="book-cover">
            <div class="book-info">
                <h3 class="book-title">${book.bookName || 'Untitled'}</h3>
                <p class="book-author">${book.author || 'Unknown'}</p>
                <p class="book-category">${Array.isArray(book.categories) && book.categories.length > 0 ? book.categories.join(', ') : 'Uncategorized'}</p>
                <p class="book-status ${availabilityStatus}">${availabilityStatus.charAt(0).toUpperCase() + availabilityStatus.slice(1)}</p>
                <div class="book-actions">
                    <a href="${detailUrl}" class="btn details-btn">View Details</a> 
                    <button class="btn borrow-btn" data-book-pk="${book.django_pk}" ${borrowButtonState}>${borrowButtonText}</button>
                    ${isAdmin ? `<a href="${editUrl}" class="btn edit-btn">Edit</a>` : ''}
                </div>
            </div>
        `;
        bookGrid.appendChild(bookCard);
    });
    attachBorrowButtonListeners();
}

// Populates the category filter dropdown from the list of all books.
function populateCategoryFilterOptions(allBooks) {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;

    const uniqueCategories = new Set();
    allBooks.forEach(book => {
        if (Array.isArray(book.categories)) book.categories.forEach(cat => uniqueCategories.add(cat));
    });

    const firstOptionHTML = categoryFilter.options.length > 0 ? categoryFilter.options[0].outerHTML : '<option value="all">All Categories</option>';
    categoryFilter.innerHTML = firstOptionHTML; 
    
    Array.from(uniqueCategories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category.toLowerCase(); 
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// Sets up event listeners for all filter and search input elements.
function setupBookListFilters() { 
    const elements = {
        category: document.getElementById('category-filter'),
        availability: document.getElementById('availability-filter'),
        sort: document.getElementById('sort-by'),
        search: document.getElementById('search'),
        searchType: document.getElementById('search-type'),
        searchForm: document.querySelector('.search-form')
    };

    for (const key in elements) {
        if (elements[key] && key !== 'searchForm') {
            elements[key].addEventListener('change', applyBookListFilters);
            if (key === 'search') elements[key].addEventListener('input', applyBookListFilters); // Search on input
        }
    }
    if (elements.searchForm) {
        elements.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyBookListFilters();
        });
    }
}

// Applies all active filters and re-renders the book list.
function applyBookListFilters() {
    const filters = {
        category: document.getElementById('category-filter')?.value || 'all',
        availability: document.getElementById('availability-filter')?.value || 'all',
        sort: document.getElementById('sort-by')?.value || 'title-asc',
        search: document.getElementById('search')?.value.toLowerCase() || '',
        searchType: document.getElementById('search-type')?.value || 'all'
    };
    
    let filteredBooks = [...allBooksGlobal]; 

    // Apply category filter
    if (filters.category !== 'all') {
        filteredBooks = filteredBooks.filter(book => 
            Array.isArray(book.categories) && book.categories.some(cat => cat.toLowerCase() === filters.category)
        );
    }
    // Apply availability filter
    if (filters.availability === 'available') filteredBooks = filteredBooks.filter(book => book.availability);
    else if (filters.availability === 'borrowed') filteredBooks = filteredBooks.filter(book => !book.availability);
    
    // Apply search filter
    if (filters.search) {
        filteredBooks = filteredBooks.filter(book => {
            const name = (book.bookName || '').toLowerCase();
            const author = (book.author || '').toLowerCase();
            const cats = Array.isArray(book.categories) ? book.categories.map(c => c.toLowerCase()) : [];

            const titleMatch = name.includes(filters.search);
            const authorMatch = author.includes(filters.search);
            const categoryMatch = cats.some(cat => cat.includes(filters.search));

            if (filters.searchType === 'all') return titleMatch || authorMatch || categoryMatch;
            if (filters.searchType === 'title') return titleMatch;
            if (filters.searchType === 'author') return authorMatch;
            if (filters.searchType === 'category') return categoryMatch;
            return false;
        });
    }
    
    // Apply sorting
    filteredBooks.sort((a, b) => {
        const valA = (field) => (a[field] || (field.includes('Date') ? 0 : '')).toString();
        const valB = (field) => (b[field] || (field.includes('Date') ? 0 : '')).toString();

        switch (filters.sort) {
            case 'title-asc': return valA('bookName').localeCompare(valB('bookName'));
            case 'title-desc': return valB('bookName').localeCompare(valA('bookName'));
            case 'author-asc': return valA('author').localeCompare(valB('author'));
            case 'author-desc': return valB('author').localeCompare(valA('author'));
            case 'newest': return (new Date(valB('publicationDate'))) - (new Date(valA('publicationDate')));
            case 'oldest': return (new Date(valA('publicationDate'))) - (new Date(valB('publicationDate')));
            default: return 0;
        }
    });
    
    displayBooks(filteredBooks);
}

// Attaches click listeners to all "Borrow" buttons.
function attachBorrowButtonListeners() {
    document.querySelectorAll('.book-grid .borrow-btn').forEach(button => {
        const newButton = button.cloneNode(true); 
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', function() {
            const bookPK = this.dataset.bookPk;
            if (this.disabled || !bookPK) return;
            handleBorrowBook(bookPK, this);
        });
    });
}

// Handles the request to borrow a book.
async function handleBorrowBook(bookPK, buttonElement) {
    let isAuthenticatedClientSide = false;
    if (window.UserContext && typeof window.UserContext.isAuthenticated === 'boolean') {
        isAuthenticatedClientSide = window.UserContext.isAuthenticated;
    } else if (typeof localIsAuthenticated === 'function') {
        isAuthenticatedClientSide = localIsAuthenticated();
    }

    if (!isAuthenticatedClientSide) {
        alert("Please log in to borrow books.");
        const loginUrl = window.APP_URLS?.loginPage || '/login/';
        window.location.href = loginUrl;
        return;
    }

    console.log(`Attempting to borrow book with PK: ${bookPK}`);
    
    if (!window.APP_URLS?.borrowBookApiBase) {
        alert("Configuration error: Borrow API URL is not defined.");
        return;
    }
    const borrowUrl = `${window.APP_URLS.borrowBookApiBase}${bookPK}/`;

    try {
        const response = await fetch(borrowUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
        });

        // Handle cases where the server indicates user is not authenticated
        if (response.status === 401 || response.status === 403) {
            alert("Authentication session may have expired or is invalid. Please log in again to borrow books.");
            const loginUrl = window.APP_URLS?.loginPage || '/login/';
            window.location.href = loginUrl;
            return;
        }

        // Handle other non-OK responses that might not be JSON
        if (!response.ok) {
            let errorMsg = `Failed to process borrow request. Server status: ${response.status}.`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorMsg;
            } catch (e) {
                console.warn("Borrow API response was not JSON. Status:", response.status);
            }
            alert(errorMsg);
            return;
        }

        const result = await response.json();

        if (result.success) {
            alert(result.message || "Book borrowed successfully!");
            if (buttonElement) {
                buttonElement.textContent = 'Unavailable';
                buttonElement.disabled = true;
                const card = buttonElement.closest('.book-card');
                if (card) {
                    const statusEl = card.querySelector('.book-status');
                    if (statusEl) {
                        statusEl.textContent = 'Borrowed';
                        statusEl.className = 'book-status borrowed';
                    }
                }
            }
            // Update local data and re-render
            const bookInGlobalList = allBooksGlobal.find(b => b.django_pk == bookPK);
            if (bookInGlobalList) {
                bookInGlobalList.availability = false;
                if (typeof bookInGlobalList.availableCopies === 'number') {
                     bookInGlobalList.availableCopies = Math.max(0, bookInGlobalList.availableCopies - 1);
                }
            }
            applyBookListFilters(); // Re-render the list to reflect changes
        } else {
            alert(result.message || "Failed to borrow book. Please try again.");
        }
    } catch (error) { // Catches network errors or errors from await response.json() if not JSON
        console.error('Error borrowing book:', error);
        alert(`An error occurred while trying to borrow the book: ${error.message}`);
    }
}

// Helper to display a message in the book grid area.
function displayBookGridMessage(htmlMessage) {
    const bookGrid = document.querySelector('.book-grid');
    if (bookGrid) bookGrid.innerHTML = htmlMessage;
}