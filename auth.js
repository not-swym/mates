// auth.js - Handles user authentication

// Get Firebase services
let auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut;

// DOM Elements
let loginForm, signupForm, loginEmailInput, loginPasswordInput, signupNameInput, 
    signupEmailInput, signupPasswordInput, loginButton, signupButton, showLoginLink, 
    showSignupLink, logoutButton, logoutFromConnectionButton;

// Initialize auth functionality
function initAuth() {
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

    // Add event listeners
    loginButton.addEventListener('click', handleLogin);
    signupButton.addEventListener('click', handleSignup);
    showLoginLink.addEventListener('click', showLoginForm);
    showSignupLink.addEventListener('click', showSignupForm);
    logoutButton.addEventListener('click', handleLogout);
    logoutFromConnectionButton.addEventListener('click', handleLogout);

    // Listen for auth state changes
    window.firebaseServices.firebaseModules.onAuthStateChanged(auth, handleAuthStateChanged);
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
    
    showLoading();
    
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
        }
        showError('login-error', errorMessage);
        hideLoading();
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
    
    if (password.length < 6) {
        showError('signup-error', 'Password must be at least 6 characters.');
        return;
    }
    
    showLoading();
    
    try {
        // Create the user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Save the user's name to Firestore
        const db = window.firebaseServices.db;
        const userId = userCredential.user.uid;
        await window.firebaseServices.firebaseModules.setDoc(
            window.firebaseServices.firebaseModules.doc(db, 'users', userId),
            {
                name: name,
                email: email,
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
        }
        showError('signup-error', errorMessage);
        hideLoading();
    }
}

// auth.js (continued)

// Switch to login form
function showLoginForm(e) {
    if (e) e.preventDefault();
    hideElement(signupForm);
    showElement(loginForm);
    clearError('login-error');
    clearError('signup-error');
}

// Switch to signup form
function showSignupForm(e) {
    if (e) e.preventDefault();
    hideElement(loginForm);
    showElement(signupForm);
    clearError('login-error');
    clearError('signup-error');
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
    }
}

// Handle authentication state changes
async function handleAuthStateChanged(user) {
    // Get container elements
    const authContainer = document.getElementById('auth-container');
    const connectionContainer = document.getElementById('connection-container');
    const mainContainer = document.getElementById('main-container');
    
    if (user) {
        // User is signed in
        console.log('User signed in:', user.uid);
        
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
                    const mateDoc = await window.firebaseServices.firebaseModules.getDoc(
                        window.firebaseServices.firebaseModules.doc(db, 'users', userData.mateId)
                    );
                    
                    if (mateDoc.exists()) {
                        const mateData = mateDoc.data();
                        document.getElementById('mate-name').textContent = mateData.name || 'Mate';
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
            }
        } catch (error) {
            console.error('Error checking user connection:', error);
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
        
        // Show login form by default
        showLoginForm();
    }
    
    hideLoading();
}