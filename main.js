// main.js - Main application initialization

// Initialize the application
function initApp() {
    console.log('Initializing application...');
    
    // Initialize auth functionality
    if (typeof initAuth === 'function') {
        initAuth();
    }
    
    // Initialize places functionality
    if (typeof initPlaces === 'function') {
        initPlaces();
    }
    
    console.log('Application initialized');
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // This will be called by the Firebase initialization script
    // but we add this listener just in case
    if (window.firebaseServices) {
        initApp();
    }
});