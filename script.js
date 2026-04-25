document.addEventListener('DOMContentLoaded', () => {
    const desktopIcons = document.querySelectorAll('.desktop-icon');
    const windows = document.querySelectorAll('.win-window');
    const taskbarApps = document.getElementById('taskbar-apps');
    const startButton = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');

    let zIndexCounter = 100;
    let openWindows = new Set();

    // Clock
    function updateClock() {
        const clock = document.getElementById('clock');
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        clock.textContent = `${hours}:${minutes} ${ampm}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Start Menu Toggle
    startButton.addEventListener('click', (e) => {
        e.stopPropagation();
        startMenu.classList.toggle('hidden');
        startButton.classList.toggle('active');
    });

    // Close Start Menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
            startMenu.classList.add('hidden');
            startButton.classList.remove('active');
        }

        // Deselect icons when clicking desktop background
        if (e.target.id === 'desktop') {
            desktopIcons.forEach(i => i.classList.remove('selected'));
        }
    });

    // Start Menu shortcuts - open windows
    document.querySelectorAll('.start-shortcut').forEach(shortcut => {
        shortcut.addEventListener('click', (e) => {
            e.stopPropagation();
            const windowId = shortcut.getAttribute('data-open');
            if (windowId) {
                openWindow(windowId);
                startMenu.classList.add('hidden');
                startButton.classList.remove('active');
            }
        });
    });

    // Bring window to front
    function bringToFront(windowElement) {
        zIndexCounter++;
        windowElement.style.zIndex = zIndexCounter;
        updateTaskbarActive(windowElement.id);
    }

    // Open Window — natural spread positioning (avoids left icon column)
    let cascadeIndex = 0;
    const positions = [
        { x: 0.30, y: 0.05 },   // upper-center
        { x: 0.15, y: 0.15 },   // center-left
        { x: 0.22, y: 0.22 },   // center
        { x: 0.35, y: 0.10 },   // right of center
    ];

    function openWindow(windowId) {
        const win = document.getElementById(windowId);
        if (win) {
            if (win.classList.contains('hidden')) {
                // Pick position from spread pattern + slight randomness
                const pos = positions[cascadeIndex % positions.length];
                const jitterX = Math.floor(Math.random() * 40) - 20;
                const jitterY = Math.floor(Math.random() * 30) - 15;
                const x = Math.floor(window.innerWidth * pos.x) + jitterX;
                const y = Math.floor(window.innerHeight * pos.y) + jitterY;

                win.style.left = `${Math.max(100, x)}px`;
                win.style.top = `${Math.max(10, y)}px`;
                cascadeIndex++;

                win.classList.remove('hidden');
                openWindows.add(windowId);
                createTaskbarTab(windowId, win.querySelector('.win-title').textContent.trim());
            }
            bringToFront(win);
        }
    }

    // Close Window
    function closeWindow(windowId) {
        const win = document.getElementById(windowId);
        if (win) {
            win.classList.add('hidden');
            // Reset size to default so reopening doesn't keep maximized dimensions
            win.style.width = '600px';
            win.style.height = '500px';
            openWindows.delete(windowId);
            removeTaskbarTab(windowId);
        }
    }

    // Toggle Minimize
    function toggleMinimizeWindow(windowId) {
        const win = document.getElementById(windowId);
        if (win) {
            if (win.classList.contains('hidden')) {
                win.classList.remove('hidden');
                bringToFront(win);
            } else {
                win.classList.add('hidden');
                updateTaskbarActive(null); // Deselect tab
            }
        }
    }

    // Taskbar Tabs
    function createTaskbarTab(windowId, title) {
        if (document.querySelector(`.taskbar-tab[data-window="${windowId}"]`)) return;

        const tab = document.createElement('div');
        tab.className = 'taskbar-tab active';
        tab.setAttribute('data-window', windowId);
        tab.textContent = title;

        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            const win = document.getElementById(windowId);
            if (win.classList.contains('hidden')) {
                win.classList.remove('hidden');
                bringToFront(win);
            } else if (win.style.zIndex == zIndexCounter) {
                win.classList.add('hidden');
                tab.classList.remove('active');
            } else {
                bringToFront(win);
            }
        });

        taskbarApps.appendChild(tab);
    }

    function removeTaskbarTab(windowId) {
        const tab = document.querySelector(`.taskbar-tab[data-window="${windowId}"]`);
        if (tab) {
            tab.remove();
        }
    }

    function updateTaskbarActive(activeWindowId) {
        document.querySelectorAll('.taskbar-tab').forEach(tab => {
            if (tab.getAttribute('data-window') === activeWindowId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    // Window Controls
    windows.forEach(win => {
        win.addEventListener('mousedown', () => bringToFront(win));

        const closeBtn = win.querySelector('.win-close');
        const minBtn = win.querySelector('.win-min');
        const maxBtn = win.querySelector('.win-max');

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeWindow(win.id);
            });
        }

        if (minBtn) {
            minBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMinimizeWindow(win.id);
            });
        }

        if (maxBtn) {
            maxBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (win.style.width === '100%') {
                    win.style.width = '600px';
                    win.style.height = '470px';
                    win.style.top = '100px';
                    win.style.left = '150px';
                } else {
                    win.style.top = '0';
                    win.style.left = '0';
                    win.style.width = '100%';
                    win.style.height = 'calc(100vh - 30px)';
                }
            });
        }        // Window dragging
        const titlebar = win.querySelector('.win-titlebar');
        if (titlebar) {
            let isDragging = false;
            let offsetX, offsetY;

            const startDrag = (clientX, clientY) => {
                isDragging = true;
                offsetX = clientX - win.offsetLeft;
                offsetY = clientY - win.offsetTop;
                bringToFront(win);
            };

            const moveDrag = (clientX, clientY) => {
                if (isDragging) {
                    let x = clientX - offsetX;
                    let y = clientY - offsetY;

                    if (y < 0) y = 0;
                    if (y > window.innerHeight - 30) y = window.innerHeight - 30;

                    win.style.left = `${x}px`;
                    win.style.top = `${y}px`;
                }
            };

            titlebar.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                startDrag(e.clientX, e.clientY);
            });

            titlebar.addEventListener('touchstart', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                const touch = e.touches[0];
                startDrag(touch.clientX, touch.clientY);
                // Prevent scrolling while dragging window
                e.preventDefault();
            }, { passive: false });

            document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
            document.addEventListener('touchmove', (e) => {
                if (isDragging) {
                    const touch = e.touches[0];
                    moveDrag(touch.clientX, touch.clientY);
                    e.preventDefault();
                }
            }, { passive: false });

            document.addEventListener('mouseup', () => isDragging = false);
            document.addEventListener('touchend', () => isDragging = false);
        }
    });

    // Icon Dragging & Interaction
    let draggedIcon = null;
    let iconOffsetX, iconOffsetY;

    desktopIcons.forEach(icon => {
        // Selection & Interaction
        const handleDown = (clientX, clientY) => {
            desktopIcons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');

            if (icon.classList.contains('draggable-icon')) {
                draggedIcon = icon;
                iconOffsetX = clientX - icon.offsetLeft;
                iconOffsetY = clientY - icon.offsetTop;
            }
        };

        icon.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            handleDown(e.clientX, e.clientY);
        });

        icon.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            const touch = e.touches[0];
            handleDown(touch.clientX, touch.clientY);
        }, { passive: true });

        icon.addEventListener('dblclick', () => {
            const winId = icon.getAttribute('data-window');
            if (winId) openWindow(winId);
        });

        // For mobile: Open on tap if already selected or just open on tap
        icon.addEventListener('touchend', (e) => {
            if (window.innerWidth <= 480) {
                const winId = icon.getAttribute('data-window');
                if (winId) openWindow(winId);
            }
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (draggedIcon) {
            let x = e.clientX - iconOffsetX;
            let y = e.clientY - iconOffsetY;

            if (x < 0) x = 0;
            if (y < 0) y = 0;

            draggedIcon.style.left = `${x}px`;
            draggedIcon.style.top = `${y}px`;
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (draggedIcon) {
            const touch = e.touches[0];
            let x = touch.clientX - iconOffsetX;
            let y = touch.clientY - iconOffsetY;

            if (x < 0) x = 0;
            if (y < 0) y = 0;

            draggedIcon.style.left = `${x}px`;
            draggedIcon.style.top = `${y}px`;
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('mouseup', () => draggedIcon = null);
    document.addEventListener('touchend', () => draggedIcon = null);

    // Contact Form Handler
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const phone = document.getElementById('contact-phone').value;
            const req = document.getElementById('contact-req').value;

            const subject = encodeURIComponent(`New Inquiry from ${name}`);
            const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nRequirement:\n${req}`);

            // Trigger mailto link
            window.location.href = `mailto:bhargav@limitedhq.com?subject=${subject}&body=${body}`;
        });
    }
});
