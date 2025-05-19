// online_library_project/static/js/add-book.js

document.addEventListener('DOMContentLoaded', function() {
    const categoryCheckboxes = document.querySelectorAll('.category-options input[type="checkbox"]');
    const selectedCategoriesListDiv = document.querySelector('.selected-categories-list');
    const addBookForm = document.getElementById('add-book-form');
    const successMessageDiv = document.querySelector('.success-message');
    const addedBookIdSpan = document.getElementById('added-book-id');
    const successTitleElement = successMessageDiv ? successMessageDiv.querySelector('h3') : null;
    const successDetailElement = successMessageDiv ? successMessageDiv.querySelector('p:nth-of-type(1)') : null;

    // These are expected to be set by an inline script in add_book.html template
    const isEditingMode = typeof IS_EDITING_MODE !== 'undefined' ? IS_EDITING_MODE : false;
    const bookPKToEdit = typeof BOOK_PK_TO_EDIT !== 'undefined' ? BOOK_PK_TO_EDIT : null;

    // Manages the display of selected categories based on checkbox states.
    function updateSelectedCategoriesDisplay() {
        if (!selectedCategoriesListDiv) return;
        selectedCategoriesListDiv.innerHTML = '';
        
        document.querySelectorAll('.category-options input[type="checkbox"]:checked').forEach(checkbox => {
            const categoryTag = document.createElement('div');
            categoryTag.className = 'selected-category-tag';
            categoryTag.innerHTML = `
                ${checkbox.value}
                <span class="remove-category" data-value="${checkbox.value}" style="cursor:pointer; margin-left:5px; font-weight:bold;">×</span>
            `;
            selectedCategoriesListDiv.appendChild(categoryTag);
        });

        selectedCategoriesListDiv.querySelectorAll('.remove-category').forEach(button => {
            button.addEventListener('click', function() {
                const categoryValue = this.getAttribute('data-value');
                const checkboxToUncheck = document.querySelector(`.category-options input[type="checkbox"][value="${categoryValue}"]`);
                if (checkboxToUncheck) checkboxToUncheck.checked = false;
                updateSelectedCategoriesDisplay(); 
            });
        });
    }

    if (categoryCheckboxes.length > 0 && selectedCategoriesListDiv) {
        categoryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectedCategoriesDisplay);
        });
        updateSelectedCategoriesDisplay(); 
    }

    // Handles form submission for adding or editing a book.
    if (addBookForm) {
        addBookForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (successMessageDiv) successMessageDiv.style.display = 'none';
            clearAllFormErrors();

            const formData = new FormData(addBookForm);

            // Basic client-side validation
            let clientSideValid = true;
            if (!formData.get('book_id_json')) { displayFieldError('book_id_json', 'Book ID is required.'); clientSideValid = false; }
            if (!formData.get('book_name')) { displayFieldError('book_name', 'Book Name is required.'); clientSideValid = false; }
            if (!clientSideValid) return;

            let apiUrl, successMessageAction;
            if (isEditingMode && bookPKToEdit) {
                if (!window.APP_URLS?.updateBookApiBase) { alert("Config error: Update Book API URL missing."); return; }
                apiUrl = `${window.APP_URLS.updateBookApiBase}${bookPKToEdit}/`;
                successMessageAction = "updated";
            } else {
                if (!window.APP_URLS?.addBookApi) { alert("Config error: Add Book API URL missing."); return; }
                apiUrl = window.APP_URLS.addBookApi;
                successMessageAction = "added";
            }

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCookie('csrftoken') }, 
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    if (successMessageDiv && addedBookIdSpan && successTitleElement && successDetailElement) {
                        successTitleElement.textContent = `Book ${successMessageAction.charAt(0).toUpperCase() + successMessageAction.slice(1)} Successfully!`;
                        successDetailElement.textContent = `The book "${result.book.book_name}" has been ${successMessageAction}.`;
                        addedBookIdSpan.textContent = result.book?.book_id_json || result.book?.id || 'N/A';
                        successMessageDiv.style.display = 'flex';
                        successMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        alert(result.message || `Book ${successMessageAction} successfully!`);
                    }
                    
                    if (!isEditingMode) { // Adding a new book
                        addBookForm.reset();
                        document.querySelectorAll('.category-options input[type="checkbox"]').forEach(cb => cb.checked = false);
                        updateSelectedCategoriesDisplay(); 
                        setTimeout(() => {
                            if (successMessageDiv) successMessageDiv.style.display = 'none';
                        }, 3000); 
                    } else { // Editing an existing book
                        // Redirect to the book detail page after a short delay to show the success message
                        if (result.book && result.book.book_id_json && window.APP_URLS?.bookDetailBase) {
                            const detailUrl = `${window.APP_URLS.bookDetailBase}${result.book.book_id_json}/`;
                            setTimeout(() => {
                                window.location.href = detailUrl;
                            }, 100); 
                        } else {
                            console.warn("Could not determine redirect URL after edit. Book data or base URL missing.", result);
                            // Fallback: Hide message if redirect fails
                            setTimeout(() => {
                                if (successMessageDiv) successMessageDiv.style.display = 'none';
                            }, 5000);
                        }
                    }
                } else { // result.success is false
                    alert(`Error: ${result.message || `Could not ${successMessageAction} book.`}`);
                    if (result.errors) {
                        displayDjangoFormErrors(result.errors);
                    }
                }
            } catch (error) {
                console.error(`Error submitting ${successMessageAction} book form:`, error);
                alert(error instanceof SyntaxError ? "Server error: Unexpected response format." : "Network or script error.");
            }
        });
    }

    // Displays a single field error.
    function displayFieldError(inputName, message) {
        const errorSpan = document.getElementById(`${inputName}-error`);
        if (errorSpan) errorSpan.textContent = message;
        else console.warn(`No error span for input: ${inputName}`);
    }
    
    // Displays form errors returned by Django.
    function displayDjangoFormErrors(errors) {
        clearAllFormErrors();
        for (const fieldName in errors) {
            const errorMessages = errors[fieldName];
            if (fieldName === '__all__') {
                alert(`Form Error: ${errorMessages.join(' ')}`);
            } else {
                const errorSpan = document.getElementById(`${fieldName}-error`);
                if (errorSpan) errorSpan.textContent = errorMessages.join(' ');
                else alert(`Error for ${fieldName}: ${errorMessages.join(' ')}`);
            }
        }
    }

    // Clears all previous form error messages.
    function clearAllFormErrors() {
        document.querySelectorAll('.error-message').forEach(span => { if (span) span.textContent = ''; });
    }

    updateSelectedCategoriesDisplay(); 
});