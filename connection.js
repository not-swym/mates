// connection.js - Handles user connection functionality

// Get Firebase services
let db, doc, getDoc, setDoc, updateDoc;

// DOM Elements
let myConnectionCodeInput, mateConnectionCodeInput, connectButton, copyCodeButton, connectionError;

// Current user data
let currentUser;

// Initialize connection functionality
function initConnection() {
    // Get Firebase Firestore modules
    db = window.firebaseServices.db;
    doc = window.firebaseServices.firebaseModules.doc;
    getDoc = window.firebaseServices.firebaseModules.getDoc;
    setDoc = window.firebaseServices.firebaseModules.setDoc;
    updateDoc = window.firebaseServices.firebaseModules.updateDoc;
    
    // Get DOM elements
    myConnectionCodeInput = document.getElementById('my-connection-code');
    mateConnectionCodeInput = document.getElementById('mate-connection-code');
    connectButton = document.getElementById('connect-button');
    copyCodeButton = document.getElementById('copy-code');
    connectionError = document.getElementById('connection-error');
    
    // Add event listeners
    connectButton.addEventListener('click', handleConnect);
    copyCodeButton.addEventListener('click', handleCopyCode);
    
    // Initialize with current user
    initializeUserCode();
}

// Initialize user with connection code
async function initializeUserCode() {
    showLoading();
    
    try {
        // Get current user
        currentUser = window.firebaseServices.auth.currentUser;
        
        if (currentUser) {
            // Get user document
            const userRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Check if user already has a connection code
                if (userData.connectionCode) {
                    myConnectionCodeInput.value = userData.connectionCode;
                } else {
                    // Generate new connection code
                    const connectionCode = generateConnectionCode();
                    myConnectionCodeInput.value = connectionCode;
                    
                    // Save connection code to user document
                    await updateDoc(userRef, {
                        connectionCode: connectionCode
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error initializing user code:', error);
        showError('connection-error', 'Failed to initialize connection code.');
    }
    
    hideLoading();
}

// Handle copy code button click
async function handleCopyCode() {
    const code = myConnectionCodeInput.value.trim();
    
    if (code) {
        const success = await copyToClipboard(code);
        
        if (success) {
            const originalText = copyCodeButton.textContent;
            copyCodeButton.textContent = 'Copied!';
            
            // Reset button text after 2 seconds
            setTimeout(() => {
                copyCodeButton.textContent = originalText;
            }, 2000);
        }
    }
}

// Handle connect button click
async function handleConnect() {
    clearError('connection-error');
    
    const mateCode = mateConnectionCodeInput.value.trim();
    
    if (!mateCode) {
        showError('connection-error', 'Please enter your mate\'s connection code.');
        return;
    }
    
    if (mateCode === myConnectionCodeInput.value) {
        showError('connection-error', 'You cannot connect with yourself.');
        return;
    }
    
    showLoading();
    
    try {
        // Find user with the given connection code
        const usersRef = window.firebaseServices.firebaseModules.collection(db, 'users');
        const q = window.firebaseServices.firebaseModules.query(
            usersRef,
            window.firebaseServices.firebaseModules.where('connectionCode', '==', mateCode)
        );
        
        const querySnapshot = await window.firebaseServices.firebaseModules.getDocs(q);
        
        if (querySnapshot.empty) {
            showError('connection-error', 'No user found with this connection code.');
            hideLoading();
            return;
        }
        
        // Get the first (and should be only) matching user
        const mateDoc = querySnapshot.docs[0];
        const mateId = mateDoc.id;
        const mateData = mateDoc.data();
        
        // Update current user's document with mate ID
        const currentUserRef = doc(db, 'users', currentUser.uid);
        await updateDoc(currentUserRef, {
            mateId: mateId
        });
        
        // Update mate's document with current user's ID
        const mateRef = doc(db, 'users', mateId);
        await updateDoc(mateRef, {
            mateId: currentUser.uid
        });
        
        // Connection successful - auth state change listener will handle UI update
    } catch (error) {
        console.error('Error connecting with mate:', error);
        showError('connection-error', 'Failed to connect with mate. Please try again.');
        hideLoading();
    }
}