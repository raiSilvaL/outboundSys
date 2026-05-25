/**
 * Controlador de Interface (Sidebar, Menus, Telas)
 */

function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
}

function initializeMenus() {
    const menuParent = document.getElementById('audit-parent');
    const submenu = document.getElementById('audit-submenu');

    if (menuParent && submenu) {
        menuParent.addEventListener('click', (e) => {
            if (e.target.classList.contains('menu-arrow')) {
                e.preventDefault();
                menuParent.classList.toggle('expanded');
                submenu.classList.toggle('active');
            }
        });
    }
}

function initializeScreens(switchCallback) {
    const menuItems = document.querySelectorAll('.menu-item[data-screen]');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const screenName = item.getAttribute('data-screen');
            switchScreen(screenName, switchCallback);
        });
    });
}

function switchScreen(screenName, callback) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.querySelectorAll('.menu-item[data-screen]').forEach(item => item.classList.remove('active'));

    const screen = document.getElementById(`screen-${screenName}`);
    if (screen) {
        screen.classList.add('active');
        screen.scrollTop = 0;
        const container = screen.querySelector('.container');
        if (container) container.scrollTop = 0;
    }

    const menuItem = document.querySelector(`.menu-item[data-screen="${screenName}"]`);
    if (menuItem) menuItem.classList.add('active');

    if (typeof callback === 'function') {
        callback(screenName);
    }
}
