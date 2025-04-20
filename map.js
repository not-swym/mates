// map.js - Handles map functionality using Leaflet

// Map instance
let map;

// Map markers
let markers = {};

// Map click coordinates (for adding new place)
let newPlaceCoordinates = null;

// Current selected place
let selectedPlaceId = null;

// Map options
const mapOptions = {
    center: [22.5726, 88.3639], // Kolkata coordinates
    zoom: 13,
    zoomControl: true,
    attributionControl: true
};

// Initialize map
function initMap() {
    // Create map if it doesn't exist
    if (!map) {
        map = L.map('map', mapOptions);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Add map click event listener
        map.on('click', handleMapClick);
    }
    
    // Load places
    loadPlaces();
}

// Load places from Firestore
async function loadPlaces() {
    showLoading();
    
    try {
        // Get current user
        const currentUser = window.firebaseServices.auth.currentUser;
        
        if (currentUser) {
            // Get user document to find mate ID
            const db = window.firebaseServices.db;
            const userDoc = await window.firebaseServices.firebaseModules.getDoc(
                window.firebaseServices.firebaseModules.doc(db, 'users', currentUser.uid)
            );
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                if (userData.mateId) {
                    // Set up real-time listener for places
                    const placesRef = window.firebaseServices.firebaseModules.collection(db, 'places');
                    const q = window.firebaseServices.firebaseModules.query(
                        placesRef,
                        window.firebaseServices.firebaseModules.where('userIds', 'array-contains', currentUser.uid)
                    );
                    
                    // Clear existing markers
                    clearAllMarkers();
                    
                    // Listen for place changes
                    window.firebaseServices.firebaseModules.onSnapshot(q, (snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            const placeId = change.doc.id;
                            const placeData = change.doc.data();
                            
                            if (change.type === 'added' || change.type === 'modified') {
                                // Add or update marker
                                addOrUpdateMarker(placeId, placeData);
                            } else if (change.type === 'removed') {
                                // Remove marker
                                removeMarker(placeId);
                            }
                        });
                    });
                    
                    // Load user's bookmarks
                    loadUserBookmarks();
                }
            }
        }
    } catch (error) {
        console.error('Error loading places:', error);
    }
    
    hideLoading();
}

// Add or update a marker on the map
function addOrUpdateMarker(placeId, placeData) {
    // Remove existing marker if it exists
    if (markers[placeId]) {
        map.removeLayer(markers[placeId]);
    }
    
    // Create marker element
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';
    
    // Create marker
    const marker = L.marker([placeData.latitude, placeData.longitude], {
        icon: L.divIcon({
            className: 'custom-marker-container',
            html: markerElement,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        })
    }).addTo(map);
    
    // Add click event to marker
    marker.on('click', () => {
        selectPlace(placeId);
    });
    
    // Store marker reference
    markers[placeId] = marker;
    
    // Update marker if it's selected
    if (placeId === selectedPlaceId) {
        updateSelectedMarker(placeId);
    }
}

// Remove a marker from the map
function removeMarker(placeId) {
    if (markers[placeId]) {
        map.removeLayer(markers[placeId]);
        delete markers[placeId];
    }
    
    // Clear selection if the removed marker was selected
    if (placeId === selectedPlaceId) {
        clearPlaceSelection();
    }
}

// Clear all markers from the map
function clearAllMarkers() {
    Object.keys(markers).forEach(placeId => {
        map.removeLayer(markers[placeId]);
    });
    
    markers = {};
    selectedPlaceId = null;
}

// Handle map click event
function handleMapClick(e) {
    // Only allow adding new places if no place is currently selected
    if (!selectedPlaceId) {
        newPlaceCoordinates = e.latlng;
        showAddPlaceOverlay();
    }
}

// Show add place overlay
function showAddPlaceOverlay() {
    const overlay = document.getElementById('add-place-overlay');
    const nameInput = document.getElementById('new-place-name');
    
    showElement(overlay);
    nameInput.value = '';
    nameInput.focus();
    
    // Add one-time event listeners for confirm and cancel buttons
    document.getElementById('confirm-add-place').onclick = handleConfirmAddPlace;
    document.getElementById('cancel-add-place').onclick = handleCancelAddPlace;
}

// Handle confirm add place button click
async function handleConfirmAddPlace() {
    const nameInput = document.getElementById('new-place-name');
    const placeName = nameInput.value.trim();
    
    if (!placeName) {
        alert('Please enter a place name.');
        return;
    }
    
    if (!newPlaceCoordinates) {
        hideAddPlaceOverlay();
        return;
    }
    
    showLoading();
    
    try {
        // Get current user
        const currentUser = window.firebaseServices.auth.currentUser;
        
        if (currentUser) {
            // Get user document to find mate ID
            const db = window.firebaseServices.db;
            const userDoc = await window.firebaseServices.firebaseModules.getDoc(
                window.firebaseServices.firebaseModules.doc(db, 'users', currentUser.uid)
            );
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                if (userData.mateId) {
                    // Create new place document
                    const placesRef = window.firebaseServices.firebaseModules.collection(db, 'places');
                    const newPlace = {
                        name: placeName,
                        latitude: newPlaceCoordinates.lat,
                        longitude: newPlaceCoordinates.lng,
                        description: '',
                        imageUrls: [],
                        userIds: [currentUser.uid, userData.mateId],
                        createdBy: currentUser.uid,
                        createdAt: new Date()
                    };
                    
                    const placeRef = await window.firebaseServices.firebaseModules.addDoc(placesRef, newPlace);
                    
                    // Select the new place
                    selectPlace(placeRef.id);
                }
            }
        }
    } catch (error) {
        console.error('Error adding place:', error);
    }
    
    hideAddPlaceOverlay();
    hideLoading();
}

// Handle cancel add place button click
function handleCancelAddPlace() {
    hideAddPlaceOverlay();
}

// Hide add place overlay
function hideAddPlaceOverlay() {
    const overlay = document.getElementById('add-place-overlay');
    hideElement(overlay);
    newPlaceCoordinates = null;
}

// Load user's bookmarks
async function loadUserBookmarks() {
    try {
        const currentUser = window.firebaseServices.auth.currentUser;
        
        if (currentUser) {
            const db = window.firebaseServices.db;
            const bookmarksRef = window.firebaseServices.firebaseModules.collection(db, 'bookmarks');
            const q = window.firebaseServices.firebaseModules.query(
                bookmarksRef,
                window.firebaseServices.firebaseModules.where('userId', '==', currentUser.uid)
            );
            
            // Listen for bookmark changes
            window.firebaseServices.firebaseModules.onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const bookmarkData = change.doc.data();
                    const placeId = bookmarkData.placeId;
                    
                    if (change.type === 'added') {
                        updateMarkerBookmarkStatus(placeId, true);
                    } else if (change.type === 'removed') {
                        updateMarkerBookmarkStatus(placeId, false);
                    }
                });
            });
        }
    } catch (error) {
        console.error('Error loading bookmarks:', error);
    }
}

// Update marker bookmark status
function updateMarkerBookmarkStatus(placeId, isBookmarked) {
    const marker = markers[placeId];
    
    if (marker) {
        // Update marker style
        const markerElement = marker.getElement().querySelector('.custom-marker');
        
        if (markerElement) {
            if (isBookmarked) {
                markerElement.classList.add('bookmarked');
            } else {
                markerElement.classList.remove('bookmarked');
            }
        }
    }
}

// Update selected marker
function updateSelectedMarker(placeId) {
    // Reset all markers to default style
    Object.keys(markers).forEach(id => {
        const markerElement = markers[id].getElement().querySelector('.custom-marker');
        if (markerElement) {
            markerElement.style.transform = '';
            markerElement.style.zIndex = '';
        }
    });
    
    // Highlight selected marker
    if (markers[placeId]) {
        const markerElement = markers[placeId].getElement().querySelector('.custom-marker');
        if (markerElement) {
            markerElement.style.transform = 'scale(1.3)';
            markerElement.style.zIndex = '1000';
        }
    }
}