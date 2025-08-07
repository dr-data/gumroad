// Main application JavaScript for Cloudflare Pages
class GumroadApp {
    constructor() {
        this.apiBaseUrl = 'https://your-workers-subdomain.your-account.workers.dev';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Login modal
        const loginBtn = document.getElementById('loginBtn');
        const loginModal = document.getElementById('loginModal');
        const closeModal = document.getElementById('closeModal');
        const loginForm = document.getElementById('loginForm');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                loginModal.classList.remove('hidden');
                loginModal.classList.add('flex');
            });
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => {
                loginModal.classList.add('hidden');
                loginModal.classList.remove('flex');
            });
        }

        // Close modal on outside click
        if (loginModal) {
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) {
                    loginModal.classList.add('hidden');
                    loginModal.classList.remove('flex');
                }
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const statusDiv = document.getElementById('loginStatus');

        statusDiv.textContent = 'Logging in...';
        statusDiv.className = 'mt-4 text-center text-blue-600';
        statusDiv.classList.remove('hidden');

        try {
            const response = await fetch(`${this.apiBaseUrl}/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success) {
                statusDiv.textContent = 'Login successful! Redirecting...';
                statusDiv.className = 'mt-4 text-center text-green-600';
                
                // Store user data
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Update UI
                this.updateAuthState(true, data.user);
                
                // Close modal
                setTimeout(() => {
                    document.getElementById('loginModal').classList.add('hidden');
                    document.getElementById('loginModal').classList.remove('flex');
                }, 1000);
                
            } else {
                statusDiv.textContent = data.error || 'Login failed';
                statusDiv.className = 'mt-4 text-center text-red-600';
            }
        } catch (error) {
            console.error('Login error:', error);
            statusDiv.textContent = 'Network error. Please try again.';
            statusDiv.className = 'mt-4 text-center text-red-600';
        }
    }

    async checkAuthStatus() {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                // Verify session is still valid
                const response = await fetch(`${this.apiBaseUrl}/users/me`, {
                    credentials: 'include',
                });
                
                if (response.ok) {
                    this.updateAuthState(true, userData);
                } else {
                    localStorage.removeItem('user');
                    this.updateAuthState(false);
                }
            } catch (error) {
                console.error('Auth check error:', error);
                localStorage.removeItem('user');
                this.updateAuthState(false);
            }
        }
    }

    updateAuthState(isLoggedIn, user = null) {
        const loginBtn = document.getElementById('loginBtn');
        
        if (isLoggedIn && user) {
            loginBtn.textContent = `Hello, ${user.display_name}`;
            loginBtn.onclick = () => this.showUserMenu();
        } else {
            loginBtn.textContent = 'Log in';
            loginBtn.onclick = () => {
                document.getElementById('loginModal').classList.remove('hidden');
                document.getElementById('loginModal').classList.add('flex');
            };
        }
    }

    showUserMenu() {
        // Create a simple dropdown menu
        const existingMenu = document.getElementById('userMenu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement('div');
        menu.id = 'userMenu';
        menu.className = 'absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50';
        menu.innerHTML = `
            <div class="py-1">
                <a href="/dashboard" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Dashboard</a>
                <a href="/products" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">My Products</a>
                <a href="/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
                <button onclick="app.logout()" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</button>
            </div>
        `;

        // Position relative to login button
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.parentNode.style.position = 'relative';
        loginBtn.parentNode.appendChild(menu);

        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target) && e.target !== loginBtn) {
                    menu.remove();
                }
            }, { once: true });
        }, 100);
    }

    async logout() {
        try {
            await fetch(`${this.apiBaseUrl}/users/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        localStorage.removeItem('user');
        this.updateAuthState(false);
        
        // Remove user menu if open
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.remove();
        }
    }

    // API helper methods
    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        };

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        });

        return response.json();
    }

    // Product management methods
    async createProduct(productData) {
        return this.apiCall('/api/v2/products', {
            method: 'POST',
            body: JSON.stringify(productData),
        });
    }

    async getProduct(permalink) {
        return this.apiCall(`/products/${permalink}`);
    }

    async verifyLicense(productPermalink, licenseKey) {
        return this.apiCall('/api/v2/licenses/verify', {
            method: 'POST',
            body: JSON.stringify({
                product_permalink: productPermalink,
                license_key: licenseKey,
            }),
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GumroadApp();
});

// Utility functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    } text-white`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GumroadApp, showToast };
}