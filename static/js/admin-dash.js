
let allAdminBooks = []; 
let currentAdminPage = 1;
const adminBooksPerPage = 5; 
let paginationNumbersDivGlobal; 
let allBorrowedAdminRecords = [];
let currentBorrowedAdminPage = 1;
const borrowedAdminBooksPerPage = 5; 
let borrowedPaginationNumbersDivGlobal; 

document.addEventListener('DOMContentLoaded', function() {
    paginationNumbersDivGlobal = document.getElementById('paginationNumbers');
    borrowedPaginationNumbersDivGlobal = document.getElementById('borrowedPaginationNumbers');

    if (document.getElementById('bookTableBody')) {
        loadAdminBooks(); 
        setupAdminPaginationListeners();
    }

    const viewBorrowedBooksAction = document.getElementById('view-borrowed-books-action');
    if (viewBorrowedBooksAction) {
        viewBorrowedBooksAction.addEventListener('click', function(e) {
            e.preventDefault();
            toggleAdminTables('borrowed'); 
            loadAllBorrowedAdminRecords(); 
            setupBorrowedAdminPaginationListeners(); 
        });
    }
    

     const viewAllBooksAction = document.getElementById('view-all-books-action');
     if (viewAllBooksAction) {
         viewAllBooksAction.addEventListener('click', function(e) {
             e.preventDefault();
             toggleAdminTables('all');
         });
     }
});

// Toggles visibility between "All Books" and "Borrowed Books" tables
function toggleAdminTables(viewToShow) {
    const allBooksSection = document.getElementById('all-books-management-section');
    const borrowedBooksSection = document.getElementById('borrowed-books-management-section');

    if (viewToShow === 'borrowed') {
        if (allBooksSection) allBooksSection.style.display = 'none';
        if (borrowedBooksSection) borrowedBooksSection.style.display = 'block';
    } else { 
        if (allBooksSection) allBooksSection.style.display = 'block';
        if (borrowedBooksSection) borrowedBooksSection.style.display = 'none';
    }
}

// Fetches book data from the API and initiates table rendering.
async function loadAdminBooks() {
    if (!window.APP_URLS?.booksApi) {
        console.error("Admin Books: APP_URLS.booksApi not defined.");
        displayTableMessage("Error: Book API URL not configured.", 8);
        return;
    }
    try {
        const response = await fetch(window.APP_URLS.booksApi);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();

        if (data.books) {
            allAdminBooks = data.books;
            currentAdminPage = 1; // Reset to first page on new load
            renderAdminBookTablePage(currentAdminPage);
            renderAdminPaginationControls();
        } else {
            displayTableMessage("No books found or error in data format.", 8);
        }
    } catch (error) {
        console.error('Error loading admin books:', error);
        displayTableMessage(`Error loading books: ${error.message}.`, 8);
    }
}

// Renders a single page of books into the admin table.
function renderAdminBookTablePage(page) {
    const tableBody = document.getElementById('bookTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    currentAdminPage = page;

    const startIndex = (page - 1) * adminBooksPerPage;
    const paginatedBooks = allAdminBooks.slice(startIndex, startIndex + adminBooksPerPage);

    if (paginatedBooks.length === 0) {
        displayTableMessage(page === 1 ? "No books in the library." : "No more books to display.", 8);
        return;
    }

    paginatedBooks.forEach(book => {
        const row = tableBody.insertRow();
        const availabilityStatus = book.availability ? 'available' : 'borrowed';
        const coverImageUrl = book.coverImage || '/static/images/default_cover.jpg';
        const editUrl = (window.APP_URLS?.editBookPageBase && book.django_pk) ? `${window.APP_URLS.editBookPageBase}${book.django_pk}/` : '#';

        row.innerHTML = `
            <td>${book.bookId || 'N/A'}</td>
            <td><img src="${coverImageUrl}" alt="${book.bookName || ''}" style="width:30px; height:auto; margin-right:5px;"> ${book.bookName || 'N/A'}</td>
            <td>${book.author || 'N/A'}</td>
            <td>${Array.isArray(book.categories) ? book.categories.join(', ') : 'N/A'}</td>
            <td>${book.totalCopies ?? 0}</td>
            <td>${book.availableCopies ?? 0}</td>
            <td><span class="status-${availabilityStatus}">${availabilityStatus.charAt(0).toUpperCase() + availabilityStatus.slice(1)}</span></td>
            <td>
                <div class="action-buttons">
                    <a href="${editUrl}" class="btn edit-btn">Edit</a>
                    <button class="btn delete-btn" data-book-pk="${book.django_pk}">Delete</button>
                </div>
            </td>
        `;
    });
    attachAdminActionListeners();
}

// Renders pagination controls (page numbers, prev/next buttons).
function renderAdminPaginationControls() {
    const prevBtn = document.querySelector('.admin-dashboard-container .pagination .prev-btn');
    const nextBtn = document.querySelector('.admin-dashboard-container .pagination .next-btn');

    if (!paginationNumbersDivGlobal || !prevBtn || !nextBtn) { 
        console.warn("Pagination control elements not found in renderAdminPaginationControls.");
        return;
    }

    paginationNumbersDivGlobal.innerHTML = ''; 
    const totalPages = Math.ceil(allAdminBooks.length / adminBooksPerPage);

    if (totalPages <= 1) {
        prevBtn.parentElement.style.display = 'none'; 
        return;
    }
    prevBtn.parentElement.style.display = 'flex';

    for (let i = 1; i <= totalPages; i++) {
        const pageLink = document.createElement('a');
        pageLink.href = '#';
        pageLink.textContent = i;
        if (i === currentAdminPage) {
            pageLink.classList.add('active');
        }
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            renderAdminBookTablePage(i);
            updateAdminPaginationActiveState(); 
        });
        paginationNumbersDivGlobal.appendChild(pageLink); 
    }
    updateAdminPaginationActiveState(); 
}

// Updates the active state of pagination buttons and page numbers.
function updateAdminPaginationActiveState() {
    const prevBtn = document.querySelector('.admin-dashboard-container .pagination .prev-btn');
    const nextBtn = document.querySelector('.admin-dashboard-container .pagination .next-btn');
    if (!paginationNumbersDivGlobal || !prevBtn || !nextBtn) {
        console.warn("Pagination control elements not found in updateAdminPaginationActiveState.");
        return;
    }
    const pageLinks = paginationNumbersDivGlobal.querySelectorAll('a'); 
    const totalPages = Math.ceil(allAdminBooks.length / adminBooksPerPage);

    prevBtn.disabled = currentAdminPage === 1;
    nextBtn.disabled = currentAdminPage === totalPages;

    pageLinks.forEach(link => {
        link.classList.remove('active');
        if (parseInt(link.textContent) === currentAdminPage) {
            link.classList.add('active');
        }
    });
}

// Sets up event listeners for previous and next pagination buttons.
function setupAdminPaginationListeners() {
    const prevBtn = document.querySelector('.admin-dashboard-container .pagination .prev-btn');
    const nextBtn = document.querySelector('.admin-dashboard-container .pagination .next-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentAdminPage > 1) {
                renderAdminBookTablePage(currentAdminPage - 1);
                renderAdminPaginationControls(); 
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(allAdminBooks.length / adminBooksPerPage);
            if (currentAdminPage < totalPages) {
                renderAdminBookTablePage(currentAdminPage + 1);
                renderAdminPaginationControls();
            }
        });
    }
}

// Attaches event listeners to dynamically created Edit and Delete buttons.
function attachAdminActionListeners() {
    document.querySelectorAll('.book-table .delete-btn').forEach(button => {
        const newButton = button.cloneNode(true); // Prevent multiple listeners
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', function() {
            const bookPK = this.dataset.bookPk;
            let bookTitle = 'this book';
            const titleCell = this.closest('tr')?.querySelector('td:nth-child(2)');
            if (titleCell) bookTitle = titleCell.textContent.trim().split('\n')[0];
            
            if (confirm(`Delete "${bookTitle}" (PK: ${bookPK})? This cannot be undone.`)) {
                handleDeleteBook(bookPK);
            }
        });
    });
}

// Handles the request to delete a book.
async function handleDeleteBook(bookPK) {
    if (!window.APP_URLS?.deleteBookApiBase) {
        alert("Config error: Delete Book API URL missing.");
        return;
    }
    const deleteUrl = `${window.APP_URLS.deleteBookApiBase}${bookPK}/`;

    try {
        const response = await fetch(deleteUrl, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message || "Book deleted.");
            loadAdminBooks(); 
        } else {
            alert(`Error: ${result.message || "Could not delete book."}`);
        }
    } catch (error) {
        console.error("Error deleting book:", error);
        alert("Network error during delete operation.");
    }
}


async function loadAllBorrowedAdminRecords() {
    if (!window.APP_URLS?.allBorrowedBooksApi) {
        console.error("Admin Borrowed: APP_URLS.allBorrowedBooksApi not defined.");
        displayBorrowedTableMessage("Error: Borrowed Books API URL not configured.", 5);
        return;
    }
    try {
        const response = await fetch(window.APP_URLS.allBorrowedBooksApi);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();

        if (data.borrowed_books) {
            allBorrowedAdminRecords = data.borrowed_books;
            currentBorrowedAdminPage = 1; 
            renderBorrowedAdminBookTablePage(currentBorrowedAdminPage);
            renderBorrowedAdminPaginationControls();
        } else {
            displayBorrowedTableMessage("No currently borrowed books or error in data format.", 5);
        }
    } catch (error) {
        console.error('Error loading borrowed books for admin:', error);
        displayBorrowedTableMessage(`Error loading borrowed books: ${error.message}.`, 5);
    }
}

// Renders a page of borrowed book records into the admin's borrowed books table.
function renderBorrowedAdminBookTablePage(page) {
    const tableBody = document.getElementById('borrowedBookTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    currentBorrowedAdminPage = page;

    const startIndex = (page - 1) * borrowedAdminBooksPerPage;
    const paginatedRecords = allBorrowedAdminRecords.slice(startIndex, startIndex + borrowedAdminBooksPerPage);

    if (paginatedRecords.length === 0) {
        displayBorrowedTableMessage(page === 1 ? "No books are currently borrowed." : "No more borrowed records.", 5);
        return;
    }

    paginatedRecords.forEach(record => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${record.username || 'N/A'}</td>
            <td>${record.book_title || 'N/A'}</td>
            <td>${record.borrow_date || 'N/A'}</td>
            <td>${record.due_date || 'N/A'}</td>
            <td>
                <button class="btn primary-btn admin-return-book-btn" data-borrowed-pk="${record.borrowed_pk}" data-book-title="${record.book_title || 'this book'}">Mark as Returned</button>
            </td>
        `;
    });
    attachAdminReturnButtonListeners(); 
}

// Renders pagination controls for the admin's borrowed books table.
function renderBorrowedAdminPaginationControls() {
    const paginationContainer = document.getElementById('borrowedPagination');
    if (!borrowedPaginationNumbersDivGlobal || !paginationContainer) return;
    
    const totalPages = Math.ceil(allBorrowedAdminRecords.length / borrowedAdminBooksPerPage);
    borrowedPaginationNumbersDivGlobal.innerHTML = '';

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    paginationContainer.style.display = 'flex';

    for (let i = 1; i <= totalPages; i++) {
        const pageLink = document.createElement('a');
        pageLink.href = '#';
        pageLink.textContent = i;
        if (i === currentBorrowedAdminPage) pageLink.classList.add('active');
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            renderBorrowedAdminBookTablePage(i);
            updateBorrowedAdminPaginationActiveState();
        });
        borrowedPaginationNumbersDivGlobal.appendChild(pageLink);
    }
    updateBorrowedAdminPaginationActiveState();
}

// Updates active state for borrowed books pagination.
function updateBorrowedAdminPaginationActiveState() {
    const prevBtn = document.getElementById('borrowedPrevBtn');
    const nextBtn = document.getElementById('borrowedNextBtn');
    if (!borrowedPaginationNumbersDivGlobal || !prevBtn || !nextBtn) return;

    const pageLinks = borrowedPaginationNumbersDivGlobal.querySelectorAll('a');
    const totalPages = Math.ceil(allBorrowedAdminRecords.length / borrowedAdminBooksPerPage);

    prevBtn.disabled = currentBorrowedAdminPage === 1;
    nextBtn.disabled = currentBorrowedAdminPage === totalPages;

    pageLinks.forEach(link => {
        link.classList.remove('active');
        if (parseInt(link.textContent) === currentBorrowedAdminPage) link.classList.add('active');
    });
}

// Sets up listeners for borrowed books pagination.
function setupBorrowedAdminPaginationListeners() {
    const prevBtn = document.getElementById('borrowedPrevBtn');
    const nextBtn = document.getElementById('borrowedNextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (!prevBtn.disabled && currentBorrowedAdminPage > 1) {
                renderBorrowedAdminBookTablePage(currentBorrowedAdminPage - 1);
                updateBorrowedAdminPaginationActiveState();
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(allBorrowedAdminRecords.length / borrowedAdminBooksPerPage);
            if (!nextBtn.disabled && currentBorrowedAdminPage < totalPages) {
                renderBorrowedAdminBookTablePage(currentBorrowedAdminPage + 1);
                updateBorrowedAdminPaginationActiveState();
            }
        });
    }
}

// Attaches listeners to "Mark as Returned" buttons in the admin's borrowed books table.
function attachAdminReturnButtonListeners() {
    document.querySelectorAll('.admin-return-book-btn').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', function() {
            const borrowedPk = this.dataset.borrowedPk;
            const bookTitle = this.dataset.bookTitle;
            if (confirm(`Mark "${bookTitle}" (Borrowed Record PK: ${borrowedPk}) as returned?`)) {
                handleAdminReturnBook(borrowedPk, this.closest('tr'));
            }
        });
    });
}

// Handles therequest for an admin to return a book.
async function handleAdminReturnBook(borrowedPk, tableRowElement) {
    if (!window.APP_URLS?.returnBookApiBase) {
        alert("Config error: Return Book API URL missing.");
        return;
    }
    const returnUrl = `${window.APP_URLS.returnBookApiBase}${borrowedPk}/`;

    try {
        const response = await fetch(returnUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') }
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message || "Book marked as returned.");
            if (tableRowElement) tableRowElement.remove(); 
            loadAllBorrowedAdminRecords(); // Refresh this table
     
        } else {
            alert(`Error: ${result.message || "Could not mark book as returned."}`);
        }
    } catch (error) {
        console.error("Error marking book as returned (admin):", error);
        alert("Network error during return operation.");
    }
}

// Helper to display a message in the borrowed books table body.
function displayBorrowedTableMessage(message, colspan) {
    const tableBody = document.getElementById('borrowedBookTableBody');
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
}

// (Keep displayTableMessage for the main book table if it was separate, or make it generic)
function displayTableMessage(message, colspan) { // For the main book table
    const tableBody = document.getElementById('bookTableBody');
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
}