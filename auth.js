// auth.js - Handles user authentication

// Get Firebase services
let auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut;

// DOM Elements
let loginForm, signupForm, loginEmailInput, loginPasswordInput, signupNameInput, 
    signupEmailInput, signupPasswordInput, loginButton, signupButton, showLoginLink, 
    showSignupLink, logoutButton, logoutFromConnectionButton;

// Initialize auth functionality
function initAuth() {
    try {
        // Get Firebase auth module
        auth = window.firebaseServices.auth;
        createUserWithEmailAndPassword = window.firebaseServices.firebaseModules.createUserWithEmailAndPassword;
        signInWithEmailAndPassword = window.firebaseServices.firebaseModules.signInWithEmailAndPassword;
        signOut = window.firebaseServices.firebaseModules.signOut;

        // Get DOM elements
        loginForm = document.getElementById('login-form');
        signupForm = document.getElementById('signup-form');
        loginEmailInput = document.getElementById('login-email');
        loginPasswordInput = document.getElementById('login-password');
        signupNameInput = document.getElementById('signup-name');
        signupEmailInput = document.getElementById('signup-email');
        signupPasswordInput = document.getElementById('signup-password');
        loginButton = document.getElementById('login-button');
        signupButton = document.getElementById('signup-button');
        showLoginLink = document.getElementById('show-login');
        showSignupLink = document.getElementById('show-signup');
        logoutButton = document.getElementById('logout-button');
        logoutFromConnectionButton = document.getElementById('logout-from-connection');

        if (!loginButton || !signupButton) {
            console.error('Authentication buttons not found in the DOM');
            return;
        }

        // Add event listeners
        loginButton.addEventListener('click', handleLogin);
        signupButton.addEventListener('click', handleSignup);
        showLoginLink.addEventListener('click', showLoginForm);
        showSignupLink.addEventListener('click', showSignupForm);
        logoutButton.addEventListener('click', handleLogout);
        logoutFromConnectionButton.addEventListener('click', handleLogout);

        // Enter key handling for forms
        loginEmailInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') loginPasswordInput.focus();
        });
        
        loginPasswordInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
        
        signupNameInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') signupEmailInput.focus();
        });
        
        signupEmailInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') signupPasswordInput.focus();
        });
        
        signupPasswordInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleSignup();
        });

        // Listen for auth state changes
        window.firebaseServices.firebaseModules.onAuthStateChanged(auth, handleAuthStateChanged);
        
        console.log('Auth module initialized successfully');
    } catch (error) {
        console.error('Error initializing auth module:', error);
        showError('login-error', 'Failed to initialize authentication. Please refresh the page.');
    }
}

// Handle login form submission
async function handleLogin() {
    clearError('login-error');
    
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    
    if (!email || !password) {
        showError('login-error', 'Please enter both email and password.');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('login-error', 'Please enter a valid email address.');
        return;
    }
    
    showLoading();
    loginButton.disabled = true;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Auth state change will handle UI updates
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Failed to login. Please check your credentials.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed login attempts. Please try again later.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your connection and try again.';
        }
        showError('login-error', errorMessage);
        hideLoading();
        loginButton.disabled = false;
    }
}

// Handle signup form submission
async function handleSignup() {
    clearError('signup-error');
    
    const name = signupNameInput.value.trim();
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value;
    
    if (!name || !email || !password) {
        showError('signup-error', 'Please fill out all fields.');
        return;
    }
    
    if (name.length < 2) {
        showError('signup-error', 'Name must be at least 2 characters.');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('signup-error', 'Please enter a valid email address.');
        return;
    }
    
    if (password.length < 6) {
        showError('signup-error', 'Password must be at least 6 characters.');
        return;
    }
    
    showLoading();
    signupButton.disabled = true;
    
    try {
        // Create the user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Save the user's name to Firestore
        const db = window.firebaseServices.db;
        const userId = userCredential.user.uid;
        
        // Generate connection code for the new user
        const connectionCode = generateConnectionCode();
        
        await window.firebaseServices.firebaseModules.setDoc(
            window.firebaseServices.firebaseModules.doc(db, 'users', userId),
            {
                name: name,
                email: email,
                connectionCode: connectionCode,
                createdAt: new Date()
            }
        );
        
        // Auth state change will handle UI updates
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Failed to create account.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email is already in use.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your connection and try again.';
        }
        showError('signup-error', errorMessage);
        hideLoading();
        signupButton.disabled = false;
    }
}

// Switch to login form
function showLoginForm(e) {
    if (e) e.preventDefault();
    hideElement(signupForm);
    showElement(loginForm);
    clearError('login-error');
    clearError('signup-error');
    loginEmailInput.focus();
}

// Switch to signup form
function showSignupForm(e) {
    if (e) e.preventDefault();
    hideElement(loginForm);
    showElement(signupForm);
    clearError('login-error');
    clearError('signup-error');
    signupNameInput.focus();
}

// Handle user logout
async function handleLogout() {
    try {
        showLoading();
        await signOut(auth);
        // Auth state change will handle UI updates
    } catch (error) {
        console.error('Logout error:', error);
        hideLoading();
        alert('Failed to log out. Please try again.');
    }
}

// Handle authentication state changes
async function handleAuthStateChanged(user) {
    // Get container elements
    const authContainer = document.getElementById('auth-container');
    const connectionContainer = document.getElementById('connection-container');
    const mainContainer = document.getElementById('main-container');
    
    try {
        if (user) {
            // User is signed in
            console.log('User signed in:', user.uid);
            
            // Re-enable buttons
            if (loginButton) loginButton.disabled = false;
            if (signupButton) signupButton.disabled = false;
            
            // Hide auth container
            hideElement(authContainer);
            
            // Check if user is connected with a mate
            try {
                const db = window.firebaseServices.db;
                const userDoc = await window.firebaseServices.firebaseModules.getDoc(
                    window.firebaseServices.firebaseModules.doc(db, 'users', user.uid)
                );
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    // Set user name in the UI
                    document.getElementById('user-name').textContent = userData.name || 'User';
                    
                    // Check if user has a mate connection
                    if (userData.mateId) {
                        // User is connected, show main container
                        hideElement(connectionContainer);
                        showElement(mainContainer);
                        
                        // Initialize map and load places
                        if (typeof initMap === 'function') {
                            initMap();
                        }
                        
                        // Get mate's name
                        try {
                            const mateDoc = await window.firebaseServices.firebaseModules.getDoc(
                                window.firebaseServices.firebaseModules.doc(db, 'users', userData.mateId)
                            );
                            
                            if (mateDoc.exists()) {
                                const mateData = mateDoc.data();
                                document.getElementById('mate-name').textContent = mateData.name || 'Mate';
                            }
                        } catch (mateError) {
                            console.error('Error fetching mate data:', mateError);
                            document.getElementById('mate-name').textContent = 'Mate';
                        }
                    } else {
                        // User not connected, show connection container
                        hideElement(mainContainer);
                        showElement(connectionContainer);
                        
                        // Initialize connection functionality
                        if (typeof initConnection === 'function') {
                            initConnection();
                        }
                    }
                } else {
                    // User document doesn't exist (unusual case)
                    console.error('User document not found in Firestore');
                    showError('connection-error', 'User data not found. Please try logging out and back in.');
                    hideElement(mainContainer);
                    showElement(connectionContainer);
                }
            } catch (error) {
                console.error('Error checking user connection:', error);
                showError('connection-error', 'Failed to load user data. Please refresh the page.');
            }
        } else {
            // User is signed out
            console.log('User signed out');
            
            // Show auth container, hide others
            showElement(authContainer);
            hideElement(connectionContainer);
            hideElement(mainContainer);
            
            // Reset form fields
            loginEmailInput.value = '';
            loginPasswordInput.value = '';
            signupNameInput.value = '';
            signupEmailInput.value = '';
            signupPasswordInput.value = '';
            
            // Re-enable buttons
            if (loginButton) loginButton.disabled = false;
            if (signupButton) signupButton.disabled = false;
            
            // Show login form by default
            showLoginForm();
        }
    } catch (error) {
        console.error('Error in auth state change handler:', error);
    } finally {
        hideLoading();
    }
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
