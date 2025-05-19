
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            console.log("Logout button clicked!"); 
            if (typeof handleLogout === 'function') {
                handleLogout();
            } else {
                console.error('handleLogout function not found. Ensure auth.js is loaded first.');
            }
        });
    }


    const dropdowns = document.querySelectorAll('.navbar .dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        if (toggle && menu) {
            toggle.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                const isVisible = menu.style.display === 'block';
                document.querySelectorAll('.navbar .dropdown-menu').forEach(m => m.style.display = 'none');
                menu.style.display = isVisible ? 'none' : 'block';
            });
        }
    });
    document.addEventListener('click', function(event) {
        document.querySelectorAll('.navbar .dropdown-menu').forEach(menu => {
            if (!menu.parentElement.contains(event.target)) {
                menu.style.display = 'none';
            }
        });
    });
});