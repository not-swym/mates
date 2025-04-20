// utils.js - Utility functions for the app

/**
 * Shows an element by removing the hidden class
 * @param {HTMLElement} element - The element to show
 */
function showElement(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

/**
 * Hides an element by adding the hidden class
 * @param {HTMLElement} element - The element to hide
 */
function hideElement(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

/**
 * Shows the loading overlay
 */
function showLoading() {
    showElement(document.getElementById('loading-overlay'));
}

/**
 * Hides the loading overlay
 */
function hideLoading() {
    hideElement(document.getElementById('loading-overlay'));
}

/**
 * Displays an error message in the specified container
 * @param {string} containerId - The ID of the error container
 * @param {string} message - The error message to display
 */
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.textContent = message;
        showElement(container);
    }
}

/**
 * Clears the error message in the specified container
 * @param {string} containerId - The ID of the error container
 */
function clearError(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.textContent = '';
    }
}

/**
 * Generates a random connection code
 * @returns {string} A random 8-character connection code
 */
function generateConnectionCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

/**
 * Copy text to clipboard
 * @param {string} text - The text to copy
 * @returns {Promise} A promise that resolves when the text is copied
 */
function copyToClipboard(text) {
    return navigator.clipboard.writeText(text)
        .then(() => true)
        .catch(err => {
            console.error('Could not copy text: ', err);
            return false;
        });
}

function handleGlobalErrors() {
  window.onerror = (msg, url, line) => {
    console.error(`Error: ${msg} at ${url}:${line}`);
    alert("An unexpected error occurred. Please refresh the page.");
    return true;
  };
}

/**
 * Format a timestamp to a readable date string
 * @param {Timestamp} timestamp - Firebase timestamp
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
