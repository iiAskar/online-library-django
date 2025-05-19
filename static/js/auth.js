function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Performs a basic client-side check for Django's sessionid cookie.
 * @returns {boolean}
 */
function localIsAuthenticated() {
    return document.cookie.includes('sessionid');
}


function localIsAdmin() {

    if (window.UserContext && typeof window.UserContext.isAdmin === 'boolean') {
        return window.UserContext.isAdmin;
    }
    return false; 
}


// Handles the signup  request.
 
async function handleSignup(username, email, password, isAdminStr) {
    if (!window.APP_URLS || !window.APP_URLS.signupApi) {
        console.error("Configuration error: Signup API URL not defined.");
        return { success: false, message: 'Configuration error for signup.' };
    }
    try {
        const response = await fetch(window.APP_URLS.signupApi, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ username, email, password, is_admin: isAdminStr })
        });
        return await response.json();
    } catch (error) {
        console.error('Signup fetch error:', error);
        return { success: false, message: 'Network error or server issue during signup.' };
    }
}


 // Handles the login request.
 
async function handleLogin(username, password) {
    if (!window.APP_URLS || !window.APP_URLS.loginApi) {
        console.error("Configuration error: Login API URL not defined.");
        return { success: false, message: 'Configuration error for login.' };
    }
    try {
        const response = await fetch(window.APP_URLS.loginApi, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ username, password })
        });
        return await response.json();
    } catch (error) {
        console.error('Login fetch error:', error);
        return { success: false, message: 'Network error or server issue during login.' };
    }
}


  // Handles the logout request.
async function handleLogout() {
    if (!window.APP_URLS || !window.APP_URLS.logoutApi || !window.APP_URLS.index) {
        console.error("Configuration error: Logout or Index URL not defined.");
        alert('Logout configuration error.');
        return;
    }
    try {
        const response = await fetch(window.APP_URLS.logoutApi, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        const result = await response.json();
        if (result.success) {
            window.location.href = window.APP_URLS.index; 
        } else {
            alert(result.message || 'Logout failed.');
        }
    } catch (error) {
        console.error('Logout fetch error:', error);
        alert('Network error or server issue during logout.');
    }
}

// Event listeners for login and signup forms.
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');

    if (signupForm) {
        signupForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const isAdminInput = document.querySelector('input[name="is_admin"]:checked');
            const isAdminStr = isAdminInput ? isAdminInput.value : 'false';

            // Clear previous errors
            document.getElementById('username-error').textContent = '';
            document.getElementById('email-error').textContent = '';
            document.getElementById('password-error').textContent = '';
            document.getElementById('confirm-password-error').textContent = '';

            // Basic client-side validation
            let hasError = false;
            if (!username) {hasError = true; }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {  hasError = true; }
            if (password.length < 8) { hasError = true; }
            if (password !== confirmPassword) {  hasError = true; }
            if (hasError) return;

            const result = await handleSignup(username, email, password, isAdminStr);
            if (result.success) {
                alert(result.message);
                window.location.href = window.APP_URLS.loginPage; 
            } else {
 
                if (result.message) {
                    if (result.message.toLowerCase().includes('username')) {
                        document.getElementById('username-error').textContent = result.message;
                    } else if (result.message.toLowerCase().includes('email')) {
                        document.getElementById('email-error').textContent = result.message;
                    } else if (result.message.toLowerCase().includes('password')) { 
                        document.getElementById('password-error').textContent = result.message;
                    } else { // General error
                        alert(`Signup failed: ${result.message}`);
                    }
                } else {
                    alert('Signup failed due to an unknown error.');
                }
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            document.getElementById('username-error').textContent = '';
            document.getElementById('password-error').textContent = '';
            
            if (!username || !password) {  return; }

            const result = await handleLogin(username, password);
            if (result.success) {
                window.location.href = result.isAdmin ? window.APP_URLS.adminDashboard : window.APP_URLS.userDashboard;
            } else {
                const passwordErrorSpan = document.getElementById('password-error');
                if (passwordErrorSpan) {
                     passwordErrorSpan.textContent = result.message || 'Login failed.';
                } else {
                     alert(`Login Failed: ${result.message || 'Unknown error'}`);
                }
            }
        });
    }
});