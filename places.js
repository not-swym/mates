// places.js - Handles place-related functionality

// Get Firebase services
let db, doc, getDoc, updateDoc, deleteDoc;
let storage, storageRef, uploadBytes, getDownloadURL;

// DOM Elements
let placeDetails, noPlaceSelected, placeName, placeDescription, 
    saveDescriptionBtn, imagesContainer, imageUploadInput, bookmarkPlaceBtn;

// Current place data
let currentPlace = null;
let isBookmarked = false;

// Initialize places functionality
function initPlaces() {
    // Get Firebase modules
    db = window.firebaseServices.db;
    doc = window.firebaseServices.firebaseModules.doc;
    getDoc = window.firebaseServices.firebaseModules.getDoc;
    updateDoc = window.firebaseServices.firebaseModules.updateDoc;
    deleteDoc = window.firebaseServices.firebaseModules.deleteDoc;
    
    storage = window.firebaseServices.storage;
    storageRef = window.firebaseServices.firebaseModules.ref;
    uploadBytes = window.firebaseServices.firebaseModules.uploadBytes;
    getDownloadURL = window.firebaseServices.firebaseModules.getDownloadURL;
    
    // Get DOM elements
    placeDetails = document.getElementById('place-details');
    noPlaceSelected = document.getElementById('no-place-selected');
    placeName = document.getElementById('place-name');
    placeDescription = document.getElementById('place-description');
    saveDescriptionBtn = document.getElementById('save-description');
    imagesContainer = document.getElementById('images-container');
    imageUploadInput = document.getElementById('image-upload-input');
    bookmarkPlaceBtn = document.getElementById('bookmark-place');
    
    // Add event listeners
    saveDescriptionBtn.addEventListener('click', handleSaveDescription);
    imageUploadInput.addEventListener('change', handleImageUpload);
    bookmarkPlaceBtn.addEventListener('click', handleToggleBookmark);
}

// Select a place by ID
async function selectPlace(placeId) {
    if (!placeId) {
        clearPlaceSelection();
        return;
    }
    
    try {
        // Get place document
        const placeRef = doc(db, 'places', placeId);
        const placeDoc = await getDoc(placeRef);
        
        if (placeDoc.exists()) {
            // Update selected place ID
            selectedPlaceId = placeId;
            
            // Store place data
            currentPlace = {
                id: placeId,
                ...placeDoc.data()
            };
            
            // Update UI
            updatePlaceDetails();
            updateSelectedMarker(placeId);
            
            // Check if place is bookmarked
            checkBookmarkStatus(placeId);
        } else {
            clearPlaceSelection();
        }
    } catch (error) {
        console.error('Error selecting place:', error);
        clearPlaceSelection();
    }
}

// Clear place selection
function clearPlaceSelection() {
    selectedPlaceId = null;
    currentPlace = null;
    
    // Hide place details, show no place selected message
    hideElement(placeDetails);
    showElement(noPlaceSelected);
}

// Update place details in the UI
function updatePlaceDetails() {
    if (!currentPlace) {
        clearPlaceSelection();
        return;
    }
    
    // Update place name
    placeName.textContent = currentPlace.name;
    
    // Update description
    placeDescription.value = currentPlace.description || '';
    
    // Update images
    updateImagesContainer(currentPlace.imageUrls || []);
    
    // Show place details, hide no place selected message
    showElement(placeDetails);
    hideElement(noPlaceSelected);
}

// Update images container
function updateImagesContainer(imageUrls) {
    // Clear current images
    imagesContainer.innerHTML = '';
    
    // Add images
    imageUrls.forEach((url, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        
        const img = document.createElement('img');
        img.src = url;
        img.alt = `Image ${index + 1}`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => handleRemoveImage(index));
        
        imageItem.appendChild(img);
        imageItem.appendChild(removeBtn);
        imagesContainer.appendChild(imageItem);
    });
}

// Handle save description button click
async function handleSaveDescription() {
    if (!currentPlace) return;
    
    const description = placeDescription.value.trim();
    
    showLoading();
    
    try {
        // Update place document
        const placeRef = doc(db, 'places', currentPlace.id);
        await updateDoc(placeRef, {
            description: description
        });
        
        // Update local data
        currentPlace.description = description;
    } catch (error) {
        console.error('Error saving description:', error);
    }
    
    hideLoading();
}

// Handle image upload
async function handleImageUpload(e) {
    if (!currentPlace) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }
    
    // Check if max images reached
    if (currentPlace.imageUrls && currentPlace.imageUrls.length >= 5) {
        alert('You can upload a maximum of 5 images per place.');
        return;
    }
    
    showLoading();
    
    try {
        // Create storage reference
        const currentUser = window.firebaseServices.auth.currentUser;
        const imagePath = `places/${currentPlace.id}/${currentUser.uid}_${Date.now()}_${file.name}`;
        const imageRef = storageRef(storage, imagePath);
        
        // Upload file
        await uploadBytes(imageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(imageRef);
        
        // Update place document
        const placeRef = doc(db, 'places', currentPlace.id);
        const imageUrls = [...(currentPlace.imageUrls || []), downloadURL];
        
        await updateDoc(placeRef, {
            imageUrls: imageUrls
        });
        
        // Update local data
        currentPlace.imageUrls = imageUrls;
        
        // Reset file input
        e.target.value = '';
    } catch (error) {
        console.error('Error uploading image:', error);
    }
    
    hideLoading();
}

// Handle remove image
async function handleRemoveImage(index) {
    if (!currentPlace || !currentPlace.imageUrls) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to remove this image?')) {
        return;
    }
    
    showLoading();
    
    try {
        // Remove image URL at index
        const imageUrls = [...currentPlace.imageUrls];
        imageUrls.splice(index, 1);
        
        // Update place document
        const placeRef = doc(db, 'places', currentPlace.id);
        await updateDoc(placeRef, {
            imageUrls: imageUrls
        });
        
        // Update local data
        currentPlace.imageUrls = imageUrls;
        
        // Update UI
        updateImagesContainer(imageUrls);
    } catch (error) {
        console.error('Error removing image:', error);
    }
    
    hideLoading();
}

// Check if place is bookmarked
async function checkBookmarkStatus(placeId) {
    try {
        const currentUser = window.firebaseServices.auth.currentUser;
        
        if (currentUser && placeId) {
            const bookmarksRef = window.firebaseServices.firebaseModules.collection(db, 'bookmarks');
            const q = window.firebaseServices.firebaseModules.query(
                bookmarksRef,
                window.firebaseServices.firebaseModules.where('userId', '==', currentUser.uid),
                window.firebaseServices.firebaseModules.where('placeId', '==', placeId)
            );
            
            const querySnapshot = await window.firebaseServices.firebaseModules.getDocs(q);
            
            // Update bookmark status
            isBookmarked = !querySnapshot.empty;
            updateBookmarkButton();
        }
    } catch (error) {
        console.error('Error checking bookmark status:', error);
    }
}

// Update bookmark button UI
function updateBookmarkButton() {
    const bookmarkIcon = bookmarkPlaceBtn.querySelector('.bookmark-icon');
    
    if (isBookmarked) {
        bookmarkIcon.textContent = '★';
        bookmarkIcon.classList.add('active');
    } else {
        bookmarkIcon.textContent = '☆';
        bookmarkIcon.classList.remove('active');
    }
}

// Handle toggle bookmark button click
async function handleToggleBookmark() {
    if (!currentPlace) return;
    
    showLoading();
    
    try {
        const currentUser = window.firebaseServices.auth.currentUser;
        
        if (currentUser) {
            const bookmarksRef = window.firebaseServices.firebaseModules.collection(db, 'bookmarks');
            const q = window.firebaseServices.firebaseModules.query(
                bookmarksRef,
                window.firebaseServices.firebaseModules.where('userId', '==', currentUser.uid),
                window.firebaseServices.firebaseModules.where('placeId', '==', currentPlace.id)
            );
            
            const querySnapshot = await window.firebaseServices.firebaseModules.getDocs(q);
            
            if (querySnapshot.empty) {
                // Add bookmark
                await window.firebaseServices.firebaseModules.addDoc(bookmarksRef, {
                    userId: currentUser.uid,
                    placeId: currentPlace.id,
                    createdAt: new Date()
                });
                
                isBookmarked = true;
            } else {
                // Remove bookmark
                const bookmarkDoc = querySnapshot.docs[0];
                await deleteDoc(bookmarkDoc.ref);
                
                isBookmarked = false;
            }
            
            // Update UI
            updateBookmarkButton();
        }
    } catch (error) {
        console.error('Error toggling bookmark:', error);
    }
    
    hideLoading();
}