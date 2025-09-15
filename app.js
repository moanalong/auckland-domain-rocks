class RockHunterApp {
    constructor() {
        this.map = null;
        this.rocks = this.loadRocks();
        this.isAddingMode = false;
        this.currentPhoto = null;
        this.stream = null;
        this.pendingRockLocation = null;
        this.currentFilters = {
            search: '',
            status: 'all',
            date: 'all'
        };
        this.filteredRocks = this.rocks;
        
        // User authentication system
        this.currentUser = this.loadCurrentUser();
        this.users = this.loadUsers();
        this.postAsUser = true; // Default to posting as user when logged in

        this.initMap();
        this.initEventListeners();
        this.filteredRocks = this.rocks; // Ensure filtered rocks is initialized
        this.displayRocksOnMap();
        this.updateStats();
        this.setupAdminAccess();
        this.updateUserInterface();
        this.checkForUpdates();
        this.trackUserLocation();
        this.createDebugPanel();
    }

    initMap() {
        // Auckland Domain coordinates
        const aucklandDomain = [-36.8627, 174.7775];
        
        this.map = L.map('map').setView(aucklandDomain, 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add a smaller marker for Auckland Domain center
        L.marker(aucklandDomain, {
            icon: L.divIcon({
                className: 'domain-center-marker',
                html: '<div class="domain-center">🏛️</div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        })
            .addTo(this.map)
            .bindPopup('<b>Auckland Domain</b><br>Rock hunting area!');

        // Add click event for adding rocks
        this.map.on('click', (e) => {
            if (this.isAddingMode) {
                this.handleMapClick(e);
            }
        });
    }

    initEventListeners() {
        // Toggle view button
        document.getElementById('toggle-view').addEventListener('click', () => {
            this.toggleRockPanel();
        });

        // Add rock mode button
        document.getElementById('add-rock-mode').addEventListener('click', () => {
            this.toggleAddMode();
        });

        // Modal controls
        document.getElementById('cancel-add').addEventListener('click', () => {
            this.closeAddRockModal();
        });

        document.getElementById('close-panel').addEventListener('click', () => {
            this.closeRockPanel();
        });

        // Photo source controls
        document.getElementById('camera-btn').addEventListener('click', () => {
            this.debugLog && this.debugLog('Camera button clicked');

            // Try using Media Capture API first, fallback to file input
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                this.debugLog && this.debugLog('Using Media Capture API');
                this.openCamera();
            } else {
                this.debugLog && this.debugLog('Using file input fallback');
                // Fallback to file input with specific camera attributes
                const cameraInput = document.createElement('input');
                cameraInput.type = 'file';
                cameraInput.accept = 'image/*';
                cameraInput.setAttribute('capture', 'environment');
                cameraInput.setAttribute('capture', 'camera');
                cameraInput.style.display = 'none';
                cameraInput.addEventListener('change', (e) => {
                    this.debugLog && this.debugLog('Camera input file selected');
                    this.handlePhotoUpload(e);
                });
                document.body.appendChild(cameraInput);
                cameraInput.click();
                setTimeout(() => {
                    if (document.body.contains(cameraInput)) {
                        document.body.removeChild(cameraInput);
                    }
                }, 1000);
            }
        });

        document.getElementById('gallery-btn').addEventListener('click', () => {
            this.debugLog && this.debugLog('Gallery button clicked');

            // Use file input with very specific gallery attributes
            const galleryInput = document.createElement('input');
            galleryInput.type = 'file';
            galleryInput.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/tiff';
            galleryInput.style.display = 'none';

            // Add attributes to hint at gallery-only behavior
            galleryInput.setAttribute('data-source', 'gallery');

            galleryInput.addEventListener('change', (e) => {
                this.debugLog && this.debugLog('Gallery input file selected');
                this.handlePhotoUpload(e);
            });
            document.body.appendChild(galleryInput);
            galleryInput.click();
            setTimeout(() => {
                if (document.body.contains(galleryInput)) {
                    document.body.removeChild(galleryInput);
                }
            }, 1000);
        });




        // Form submission
        document.getElementById('rock-form').addEventListener('submit', (e) => {
            this.debugLog && this.debugLog('Rock form submitted');
            this.handleRockSubmission(e);
        });

        // Also add direct button click handler as backup
        document.querySelector('#rock-form button[type="submit"]').addEventListener('click', (e) => {
            this.debugLog && this.debugLog('Save Rock button clicked directly');
            // Don't prevent default here - let it trigger form submit
        });

        // Search and filter event listeners
        document.getElementById('search-input').addEventListener('input', () => {
            this.updateFilters();
        });

        document.getElementById('status-filter').addEventListener('change', () => {
            this.updateFilters();
        });

        document.getElementById('date-filter').addEventListener('change', () => {
            this.updateFilters();
        });

        document.getElementById('apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });
    }

    toggleAddMode() {
        this.isAddingMode = !this.isAddingMode;
        const button = document.getElementById('add-rock-mode');
        
        if (this.isAddingMode) {
            button.textContent = '❌ Cancel Adding';
            button.style.background = '#e74c3c';
            this.map.getContainer().style.cursor = 'crosshair';
        } else {
            button.textContent = '➕ Add Rock';
            button.style.background = '#3498db';
            this.map.getContainer().style.cursor = '';
        }
    }

    handleMapClick(e) {
        if (!this.isAddingMode) return;

        this.pendingRockLocation = e.latlng;
        this.showAddRockModal();
    }

    showAddRockModal() {
        document.getElementById('add-rock-modal').classList.remove('hidden');
        document.getElementById('rock-name').focus();
        
        // Show/hide posting toggle based on login status
        const postingToggle = document.getElementById('posting-toggle');
        const currentUsername = document.getElementById('current-username');
        const postAsUserCheckbox = document.getElementById('post-as-user');
        
        if (this.currentUser) {
            postingToggle.classList.remove('hidden');
            currentUsername.textContent = this.currentUser.username;
            postAsUserCheckbox.checked = this.postAsUser;
            
            // Update postAsUser when checkbox changes
            postAsUserCheckbox.onchange = () => {
                this.postAsUser = postAsUserCheckbox.checked;
            };
        } else {
            postingToggle.classList.add('hidden');
        }
    }

    closeAddRockModal() {
        document.getElementById('add-rock-modal').classList.add('hidden');
        this.resetForm();
        this.pendingRockLocation = null;
    }

    resetForm() {
        document.getElementById('rock-form').reset();
        this.resetPhotoSection();
        this.currentPhoto = null;
    }

    async openCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            // Create a video element to show camera preview
            const video = document.createElement('video');
            video.style.position = 'fixed';
            video.style.top = '0';
            video.style.left = '0';
            video.style.width = '100vw';
            video.style.height = '100vh';
            video.style.zIndex = '10000';
            video.style.objectFit = 'cover';
            video.autoplay = true;
            video.playsInline = true;
            video.srcObject = stream;

            // Create capture button
            const captureBtn = document.createElement('button');
            captureBtn.innerHTML = '📷 Capture';
            captureBtn.style.position = 'fixed';
            captureBtn.style.bottom = '50px';
            captureBtn.style.left = '50%';
            captureBtn.style.transform = 'translateX(-50%)';
            captureBtn.style.zIndex = '10001';
            captureBtn.style.padding = '15px 30px';
            captureBtn.style.fontSize = '18px';
            captureBtn.style.backgroundColor = 'var(--cherry-medium)';
            captureBtn.style.color = 'white';
            captureBtn.style.border = 'none';
            captureBtn.style.borderRadius = '25px';

            // Create close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '❌';
            closeBtn.style.position = 'fixed';
            closeBtn.style.top = '20px';
            closeBtn.style.right = '20px';
            closeBtn.style.zIndex = '10001';
            closeBtn.style.padding = '10px';
            closeBtn.style.fontSize = '20px';
            closeBtn.style.backgroundColor = 'rgba(0,0,0,0.5)';
            closeBtn.style.color = 'white';
            closeBtn.style.border = 'none';
            closeBtn.style.borderRadius = '50%';

            document.body.appendChild(video);
            document.body.appendChild(captureBtn);
            document.body.appendChild(closeBtn);

            const cleanup = () => {
                stream.getTracks().forEach(track => track.stop());
                if (document.body.contains(video)) document.body.removeChild(video);
                if (document.body.contains(captureBtn)) document.body.removeChild(captureBtn);
                if (document.body.contains(closeBtn)) document.body.removeChild(closeBtn);
            };

            captureBtn.addEventListener('click', () => {
                // Capture frame from video
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);

                // Convert to photo
                this.currentPhoto = canvas.toDataURL('image/jpeg', 0.8);

                // Show preview
                const preview = document.getElementById('photo-preview');
                preview.innerHTML = `<img src="${this.currentPhoto}" alt="Captured photo">`;
                preview.classList.remove('hidden');

                cleanup();
            });

            closeBtn.addEventListener('click', cleanup);

        } catch (error) {
            console.error('Camera access failed:', error);
            // Fallback to file input
            const cameraInput = document.createElement('input');
            cameraInput.type = 'file';
            cameraInput.accept = 'image/*';
            cameraInput.setAttribute('capture', 'environment');
            cameraInput.addEventListener('change', (e) => {
                this.handlePhotoUpload(e);
            });
            cameraInput.click();
        }
    }

    resetPhotoSection() {
        // Clear camera input (gallery uses dynamic inputs)
        const cameraInput = document.getElementById('camera-input');
        if (cameraInput) {
            cameraInput.value = '';
        }

        // Hide photo preview
        document.getElementById('photo-preview').classList.add('hidden');
        this.currentPhoto = null;
    }

    handlePhotoUpload(event) {
        this.debugLog && this.debugLog('handlePhotoUpload called');

        const file = event.target.files[0];
        if (!file) {
            this.debugLog && this.debugLog('No file selected');
            return;
        }

        this.debugLog && this.debugLog(`File selected: ${file.name}, size: ${file.size}, type: ${file.type}`);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.debugLog && this.debugLog('Invalid file type');
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.debugLog && this.debugLog('File too large');
            alert('Image file too large. Please select an image under 10MB.');
            return;
        }

        this.debugLog && this.debugLog('File validation passed, processing...');

        const reader = new FileReader();
        reader.onload = (e) => {
            this.debugLog && this.debugLog('FileReader loaded successfully');

            try {
                // Simple approach - use the image directly without canvas processing
                this.currentPhoto = e.target.result;
                this.debugLog && this.debugLog(`Photo set directly, length: ${this.currentPhoto.length} characters`);

                // Show preview
                const preview = document.getElementById('photo-preview');
                preview.innerHTML = `<img src="${this.currentPhoto}" alt="Uploaded rock photo" style="max-width:100px;max-height:100px;object-fit:cover;">`;
                preview.classList.remove('hidden');

                this.debugLog && this.debugLog('Photo preview displayed');

            } catch (error) {
                this.debugLog && this.debugLog(`Error processing photo: ${error.message}`);

                // Fallback - try canvas method
                const img = new Image();
                img.onload = () => {
                    this.debugLog && this.debugLog('Fallback: Image loaded, trying canvas');

                    // Create canvas to resize image if needed
                    const canvas = document.getElementById('photo-canvas');
                    if (!canvas) {
                        this.debugLog && this.debugLog('ERROR: photo-canvas element not found');
                        return;
                    }

                    const ctx = canvas.getContext('2d');

                    // Calculate new dimensions (max 800px width/height)
                    let { width, height } = img;
                    const maxSize = 800;

                    if (width > height && width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    } else if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw and compress image
                    ctx.drawImage(img, 0, 0, width, height);
                    this.currentPhoto = canvas.toDataURL('image/jpeg', 0.8);

                    this.debugLog && this.debugLog(`Fallback photo processed, length: ${this.currentPhoto.length} characters`);

                    // Show preview
                    const preview = document.getElementById('photo-preview');
                    preview.innerHTML = `<img src="${this.currentPhoto}" alt="Uploaded rock photo">`;
                    preview.classList.remove('hidden');

                    this.debugLog && this.debugLog('Fallback photo preview displayed');
                };
                img.onerror = () => {
                    this.debugLog && this.debugLog('ERROR: Image failed to load');
                };
                img.src = e.target.result;
            }
        };

        reader.onerror = () => {
            this.debugLog && this.debugLog('ERROR: FileReader failed');
        };

        this.debugLog && this.debugLog('Starting FileReader...');
        reader.readAsDataURL(file);
    }


    checkForUpdates() {
        const currentVersion = '1757751037-photo-gallery-fix';
        const lastVersion = localStorage.getItem('auckland_app_version');
        const lastCheck = localStorage.getItem('auckland_last_check');
        const now = Date.now();
        
        console.log('Version Check: Current =', currentVersion, 'Last =', lastVersion);
        
        // Check if version changed or it's been more than 2 minutes since last check
        if (lastVersion !== currentVersion || (now - parseInt(lastCheck || '0')) > 120000) {
            console.log('UPDATE DETECTED: Clearing caches and updating');
            
            localStorage.setItem('auckland_app_version', currentVersion);
            localStorage.setItem('auckland_last_check', now.toString());
            
            if (lastVersion && lastVersion !== currentVersion) {
                // Version changed - show update notification
                this.showUpdateNotification();
                this.clearAllStorageAndCaches();
            }
        }
    }

    showUpdateNotification() {
        // Create update notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: bold;
            animation: slideIn 0.5s ease-out;
        `;
        notification.innerHTML = `
            🚀 App Updated! Photo gallery access fixed - choose from photos now works!
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;margin-left:10px;cursor:pointer;">✕</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    handleRockSubmission(e) {
        this.debugLog && this.debugLog('handleRockSubmission called');
        e.preventDefault();

        if (!this.pendingRockLocation) {
            this.debugLog && this.debugLog('ERROR: No location selected');
            alert('No location selected');
            return;
        }

        this.debugLog && this.debugLog(`Location: ${this.pendingRockLocation.lat}, ${this.pendingRockLocation.lng}`);

        const name = document.getElementById('rock-name').value.trim();
        const description = document.getElementById('rock-description').value.trim();

        this.debugLog && this.debugLog(`Name: "${name}", Description: "${description}"`);

        if (!name) {
            this.debugLog && this.debugLog('ERROR: No rock name entered');
            alert('Please enter a rock name');
            return;
        }

        const rock = {
            id: Date.now().toString(),
            name: name,
            description: description,
            lat: this.pendingRockLocation.lat,
            lng: this.pendingRockLocation.lng,
            photos: this.currentPhoto ? [this.currentPhoto] : [],
            timestamp: new Date().toISOString(),
            status: 'hidden',
            foundBy: null,
            foundTimestamp: null,
            foundPhoto: null,
            foundNotes: '',
            // User tracking
            postedBy: this.currentUser && this.postAsUser ? this.currentUser.id : null,
            postedByUsername: this.currentUser && this.postAsUser ? this.currentUser.username : null,
            isAnonymous: !this.currentUser || !this.postAsUser,
            foundByUserId: null
        };

        this.debugLog && this.debugLog(`Rock has photo: ${this.currentPhoto ? 'YES' : 'NO'}`);
        if (this.currentPhoto) {
            this.debugLog && this.debugLog(`Photo length: ${this.currentPhoto.length} characters`);
        }

        this.addRock(rock);
        this.closeAddRockModal();
        this.toggleAddMode(); // Exit add mode after adding
    }

    addRock(rock) {
        this.debugLog && this.debugLog(`Adding rock: ${rock.name} at ${rock.lat}, ${rock.lng}`);
        this.rocks.push(rock);
        this.debugLog && this.debugLog(`Total rocks now: ${this.rocks.length}`);
        this.saveRocks();
        this.addRockToMap(rock);
        this.updateStats(); // Update statistics when adding rocks
        this.filteredRocks = this.rocks; // Update filtered rocks
        this.debugLog && this.debugLog('Rock added to map and stats updated');
    }

    addRockToMap(rock) {
        this.debugLog && this.debugLog(`Creating marker for ${rock.name} at ${rock.lat}, ${rock.lng} (status: ${rock.status})`);

        // Validate coordinates
        if (!rock.lat || !rock.lng || isNaN(rock.lat) || isNaN(rock.lng)) {
            this.debugLog && this.debugLog(`ERROR: Invalid coordinates for ${rock.name}`);
            return;
        }

        // Check if map exists
        if (!this.map) {
            this.debugLog && this.debugLog('ERROR: Map not initialized');
            return;
        }

        const marker = L.marker([rock.lat, rock.lng], {
            icon: L.divIcon({
                className: `rock-marker ${rock.status}`,
                html: `<div class="header-rock"></div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            })
        });

        let popupContent = `<div class="rock-popup"><h4>${rock.name}</h4>`;
        if (rock.description) {
            popupContent += `<p>${rock.description}</p>`;
        }
        
        // Photo gallery
        if (rock.photos && rock.photos.length > 0) {
            popupContent += `<div class="photo-gallery">`;
            rock.photos.forEach((photo, index) => {
                popupContent += `<img src="${photo}" class="popup-photo" alt="${rock.name}" onclick="window.rockApp.showPhotoModal('${photo}')">`;
            });
            popupContent += `</div>`;
        } else if (rock.photo) { // Backward compatibility
            popupContent += `<img src="${rock.photo}" class="popup-photo" alt="${rock.name}">`;
        }
        
        // Rock status and timestamps
        popupContent += `<div class="rock-info">`;
        if (rock.postedByUsername && !rock.isAnonymous) {
            popupContent += `<p class="posted-by">👤 Posted by: <strong>${rock.postedByUsername}</strong></p>`;
        } else {
            popupContent += `<p class="posted-by">👻 Posted anonymously</p>`;
        }
        popupContent += `<p><small>📅 Added: ${new Date(rock.timestamp).toLocaleDateString()}</small></p>`;
        
        if (rock.status === 'found') {
            popupContent += `<p class="found-status">✅ Found by ${rock.foundBy || 'Anonymous'}</p>`;
            popupContent += `<p><small>🕒 Found: ${new Date(rock.foundTimestamp).toLocaleDateString()}</small></p>`;
            if (rock.foundPhoto) {
                popupContent += `<img src="${rock.foundPhoto}" class="found-photo" alt="Found photo">`;
            }
            if (rock.foundNotes) {
                popupContent += `<p class="found-notes">"${rock.foundNotes}"</p>`;
            }
        } else {
            popupContent += `<button class="mark-found-btn" onclick="window.rockApp.markAsFound('${rock.id}')">🎯 Mark as Found</button>`;
        }
        
        popupContent += `</div></div>`;

        marker.bindPopup(popupContent);

        try {
            marker.addTo(this.map);
            this.debugLog && this.debugLog(`✓ Marker successfully added for ${rock.name}`);

            // Check if marker is within current map bounds
            const bounds = this.map.getBounds();
            const markerLatLng = L.latLng(rock.lat, rock.lng);
            const inBounds = bounds.contains(markerLatLng);

            this.debugLog && this.debugLog(`Marker in view bounds: ${inBounds ? 'YES' : 'NO'}`);

            if (!inBounds) {
                this.debugLog && this.debugLog(`Marker outside bounds - lat: ${rock.lat}, lng: ${rock.lng}`);
                this.debugLog && this.debugLog(`Map center: ${this.map.getCenter()}, zoom: ${this.map.getZoom()}`);
            }
        } catch (error) {
            this.debugLog && this.debugLog(`ERROR adding marker: ${error.message}`);
        }
    }

    displayRocksOnMap() {
        this.debugLog && this.debugLog(`Displaying ${this.rocks.length} rocks on map`);
        this.rocks.forEach(rock => {
            this.debugLog && this.debugLog(`Adding ${rock.name} to map`);
            this.addRockToMap(rock);
        });
    }

    toggleRockPanel() {
        const panel = document.getElementById('rock-panel');
        const button = document.getElementById('toggle-view');
        
        if (panel.classList.contains('hidden')) {
            this.showRockPanel();
            button.textContent = '🗺️ Show Map';
        } else {
            this.closeRockPanel();
            button.textContent = '📍 View All Rocks';
        }
    }

    showRockPanel() {
        document.getElementById('rock-panel').classList.remove('hidden');
        this.updateRocksList();
    }

    closeRockPanel() {
        document.getElementById('rock-panel').classList.add('hidden');
    }

    updateRocksList() {
        const container = document.getElementById('rocks-list');
        
        if (this.rocks.length === 0) {
            container.innerHTML = '<p>No rocks found yet. Start hunting!</p>';
            return;
        }

        container.innerHTML = this.rocks.map(rock => {
            // Debug photo data
            this.debugLog && this.debugLog(`Rock ${rock.name}: photos=${rock.photos ? rock.photos.length : 'none'}, photo=${rock.photo ? 'exists' : 'none'}`);

            // Get photo - check both photos array and legacy photo field
            let photoHtml = '';
            if (rock.photos && rock.photos.length > 0) {
                photoHtml = `<img src="${rock.photos[0]}" class="rock-photo" alt="${rock.name}" onclick="window.rockApp.showPhotoModal('${rock.photos[0]}')">`;
                this.debugLog && this.debugLog(`Using photos[0] for ${rock.name}`);
            } else if (rock.photo) {
                photoHtml = `<img src="${rock.photo}" class="rock-photo" alt="${rock.name}" onclick="window.rockApp.showPhotoModal('${rock.photo}')">`;
                this.debugLog && this.debugLog(`Using photo for ${rock.name}`);
            } else {
                this.debugLog && this.debugLog(`No photo found for ${rock.name}`);
            }

            return `
                <div class="rock-item">
                    <h4>${rock.name}</h4>
                    ${rock.description ? `<p class="rock-description">${rock.description}</p>` : ''}
                    ${photoHtml}
                    <div class="rock-meta">
                        <div class="coordinates">
                            📍 ${rock.lat.toFixed(6)}, ${rock.lng.toFixed(6)}
                        </div>
                        <div class="coordinates">
                            🕒 ${new Date(rock.timestamp).toLocaleString()}
                        </div>
                        <div class="rock-status ${rock.status}">
                            ${rock.status === 'found' ? '✅ Found' : '🎨 Hidden'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadRocks() {
        const stored = localStorage.getItem('auckland-rocks');
        const rocks = stored ? JSON.parse(stored) : [];
        this.debugLog && this.debugLog(`Loading rocks: ${rocks.length} found`);
        return rocks;
    }

    saveRocks() {
        this.debugLog && this.debugLog(`Saving ${this.rocks.length} rocks`);
        localStorage.setItem('auckland-rocks', JSON.stringify(this.rocks));
        this.debugLog && this.debugLog('Rocks saved successfully');
    }

    markAsFound(rockId) {
        const rock = this.rocks.find(r => r.id === rockId);
        if (!rock) return;

        this.showMarkFoundModal(rock);
    }

    showMarkFoundModal(rock) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🎯 Mark "${rock.name}" as Found!</h3>
                <form id="mark-found-form">
                    <input type="text" id="finder-name" placeholder="Your name (optional)" maxlength="50">
                    <textarea id="found-notes" placeholder="Share your finding experience! (optional)" maxlength="200"></textarea>
                    
                    <div class="camera-section">
                        <p>📸 Add a photo of where you found it:</p>
                        <video id="found-camera-preview" autoplay playsinline style="display: none;"></video>
                        <div class="camera-controls">
                            <button type="button" id="start-found-camera" class="btn">📷 Start Camera</button>
                            <button type="button" id="capture-found-photo" class="btn" style="display: none;">📸 Take Photo</button>
                            <button type="button" id="stop-found-camera" class="btn" style="display: none;">❌ Stop Camera</button>
                        </div>
                        <div id="found-photo-preview" class="photo-preview"></div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn primary">✅ Mark as Found</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupFoundCameraHandlers(rock, modal);
    }

    setupFoundCameraHandlers(rock, modal) {
        let stream = null;
        let foundPhoto = null;

        const video = modal.querySelector('#found-camera-preview');
        const startBtn = modal.querySelector('#start-found-camera');
        const captureBtn = modal.querySelector('#capture-found-photo');
        const stopBtn = modal.querySelector('#stop-found-camera');
        const preview = modal.querySelector('#found-photo-preview');

        startBtn.addEventListener('click', async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                video.srcObject = stream;
                video.style.display = 'block';
                startBtn.style.display = 'none';
                captureBtn.style.display = 'inline-block';
                stopBtn.style.display = 'inline-block';
            } catch (err) {
                alert('Camera access failed. You can still mark the rock as found without a photo.');
            }
        });

        captureBtn.addEventListener('click', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            foundPhoto = canvas.toDataURL('image/jpeg', 0.8);
            preview.innerHTML = `<img src="${foundPhoto}" alt="Found photo">`;
            
            // Stop camera after capture
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                video.style.display = 'none';
                captureBtn.style.display = 'none';
                stopBtn.style.display = 'none';
                startBtn.style.display = 'inline-block';
            }
        });

        stopBtn.addEventListener('click', () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                video.style.display = 'none';
                captureBtn.style.display = 'none';
                stopBtn.style.display = 'none';
                startBtn.style.display = 'inline-block';
            }
        });

        modal.querySelector('#mark-found-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const finderName = modal.querySelector('#finder-name').value.trim();
            const foundNotes = modal.querySelector('#found-notes').value.trim();

            // Update rock status
            rock.status = 'found';
            rock.foundBy = finderName || (this.currentUser ? this.currentUser.username : 'Anonymous');
            rock.foundTimestamp = new Date().toISOString();
            rock.foundPhoto = foundPhoto;
            rock.foundNotes = foundNotes;
            rock.foundByUserId = this.currentUser ? this.currentUser.id : null;

            this.saveRocks();
            this.refreshMap();
            this.updateStats();
            modal.remove();
            
            // Show success message
            alert(`🎉 Congratulations! You found "${rock.name}"!`);
        });
    }

    refreshMap() {
        this.debugLog && this.debugLog('--- Refreshing map ---');
        let markerCount = 0;

        // Clear existing markers (except tile layer)
        this.map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                markerCount++;
                this.map.removeLayer(layer);
            }
        });

        this.debugLog && this.debugLog(`Removed ${markerCount} existing markers`);

        // Re-add all markers
        this.displayRocksOnMap();

        // Count current markers after adding
        let currentMarkers = 0;
        this.map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                currentMarkers++;
            }
        });
        this.debugLog && this.debugLog(`Map now has ${currentMarkers} markers`);
    }

    showPhotoModal(photoUrl) {
        const modal = document.createElement('div');
        modal.className = 'modal photo-modal';
        modal.innerHTML = `
            <div class="modal-content photo-content">
                <img src="${photoUrl}" alt="Rock photo" class="full-photo">
                <button class="close-photo" onclick="this.closest('.modal').remove()">✕</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    getStats() {
        const total = this.rocks.length;
        const found = this.rocks.filter(r => r.status === 'found').length;
        const hidden = total - found;
        return { total, found, hidden };
    }

    updateStats() {
        const stats = this.getStats();
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <span class="stat-number">${stats.total}</span>
                    <span class="stat-label">Total Rocks</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.hidden}</span>
                    <span class="stat-label">Still Hidden</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.found}</span>
                    <span class="stat-label">Found</span>
                </div>
            `;
        }
    }

    updateFilters() {
        this.currentFilters.search = document.getElementById('search-input').value.toLowerCase();
        this.currentFilters.status = document.getElementById('status-filter').value;
        this.currentFilters.date = document.getElementById('date-filter').value;
        this.applyFilters();
    }

    applyFilters() {
        this.filteredRocks = this.rocks.filter(rock => {
            // Search filter
            if (this.currentFilters.search) {
                const searchMatch = rock.name.toLowerCase().includes(this.currentFilters.search) ||
                                  (rock.description && rock.description.toLowerCase().includes(this.currentFilters.search));
                if (!searchMatch) return false;
            }

            // Status filter
            if (this.currentFilters.status !== 'all') {
                if (rock.status !== this.currentFilters.status) return false;
            }

            // Date filter
            if (this.currentFilters.date !== 'all') {
                const rockDate = new Date(rock.timestamp);
                const now = new Date();
                const daysDiff = (now - rockDate) / (1000 * 60 * 60 * 24);

                switch (this.currentFilters.date) {
                    case 'recent':
                        if (daysDiff > 3) return false;
                        break;
                    case 'week':
                        if (daysDiff > 7) return false;
                        break;
                    case 'month':
                        if (daysDiff > 30) return false;
                        break;
                }
            }

            return true;
        });

        this.refreshMapWithFiltered();
        this.updateRocksList();
    }

    clearFilters() {
        document.getElementById('search-input').value = '';
        document.getElementById('status-filter').value = 'all';
        document.getElementById('date-filter').value = 'all';
        
        this.currentFilters = {
            search: '',
            status: 'all',
            date: 'all'
        };
        
        this.filteredRocks = this.rocks;
        this.refreshMapWithFiltered();
        this.updateRocksList();
    }

    refreshMapWithFiltered() {
        // Clear existing markers
        this.map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                this.map.removeLayer(layer);
            }
        });
        
        // Add filtered markers
        this.filteredRocks.forEach(rock => this.addRockToMap(rock));
    }


    // Admin function to clear all data for team testing
    clearAllRockData() {
        if (confirm('⚠️ ADMIN: Clear ALL rock data? This cannot be undone!')) {
            localStorage.removeItem('auckland-rocks');
            this.rocks = [];
            this.filteredRocks = [];
            this.refreshMap();
            this.updateStats();
            this.updateRocksList();
            alert('✅ All rock data cleared! Fresh start for testing.');
        }
    }

    // Secret admin access (triple-click header)
    setupAdminAccess() {
        let clickCount = 0;
        const header = document.querySelector('h1');
        header.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 3) {
                this.clearAllRockData();
                clickCount = 0;
            }
            setTimeout(() => { clickCount = 0; }, 2000);
        });
    }

    // User Authentication Methods
    loadUsers() {
        const stored = localStorage.getItem('auckland-rock-users');
        return stored ? JSON.parse(stored) : [];
    }

    saveUsers() {
        localStorage.setItem('auckland-rock-users', JSON.stringify(this.users));
    }

    loadCurrentUser() {
        const stored = localStorage.getItem('auckland-rock-current-user');
        return stored ? JSON.parse(stored) : null;
    }

    saveCurrentUser(user) {
        if (user) {
            localStorage.setItem('auckland-rock-current-user', JSON.stringify(user));
        } else {
            localStorage.removeItem('auckland-rock-current-user');
        }
        this.currentUser = user;
        this.updateUserInterface();
    }

    signUp(username, email, password) {
        // Check if username or email already exists
        if (this.users.find(u => u.username === username)) {
            throw new Error('Username already exists');
        }
        if (this.users.find(u => u.email === email)) {
            throw new Error('Email already registered');
        }

        const user = {
            id: Date.now().toString(),
            username: username,
            email: email,
            password: password, // In production, this should be hashed
            joinDate: new Date().toISOString(),
            rocksPosted: 0,
            rocksFound: 0
        };

        this.users.push(user);
        this.saveUsers();
        return user;
    }

    signIn(usernameOrEmail, password) {
        const user = this.users.find(u => 
            (u.username === usernameOrEmail || u.email === usernameOrEmail) && 
            u.password === password
        );
        
        if (!user) {
            throw new Error('Invalid username/email or password');
        }

        this.saveCurrentUser(user);
        return user;
    }

    signOut() {
        this.saveCurrentUser(null);
        this.postAsUser = true;
    }

    updateUserInterface() {
        const userSection = document.getElementById('user-section');
        if (!userSection) return;

        if (this.currentUser) {
            userSection.innerHTML = `
                <div class="user-info">
                    <span class="username">👤 ${this.currentUser.username}</span>
                    <button id="user-profile" class="btn">Profile</button>
                    <button id="sign-out" class="btn">Sign Out</button>
                </div>
            `;
            
            document.getElementById('user-profile').addEventListener('click', () => {
                this.showUserProfile();
            });
            
            document.getElementById('sign-out').addEventListener('click', () => {
                this.signOut();
            });
        } else {
            userSection.innerHTML = `
                <div class="auth-buttons">
                    <button id="sign-up-btn" class="btn">Sign Up (optional)</button>
                    <button id="sign-in-btn" class="btn primary">Login</button>
                </div>
            `;
            
            document.getElementById('sign-up-btn').addEventListener('click', () => {
                this.showSignUpModal();
            });
            
            document.getElementById('sign-in-btn').addEventListener('click', () => {
                this.showSignInModal();
            });
        }
    }

    showSignUpModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🔑 Join Auckland Domain Rock Hunters</h3>
                <form id="signup-form">
                    <input type="text" id="signup-username" placeholder="Choose a username" required minlength="3" maxlength="20">
                    <input type="email" id="signup-email" placeholder="Your email" required>
                    <input type="password" id="signup-password" placeholder="Choose a password" required minlength="6">
                    
                    <div class="benefits">
                        <p><strong>Benefits of signing up:</strong></p>
                        <ul>
                            <li>✅ Track your posted rocks</li>
                            <li>🎯 View your found rocks history</li>
                            <li>👤 Get credit for your discoveries</li>
                            <li>📊 See your personal statistics</li>
                        </ul>
                        <p><em>You can still post anonymously anytime!</em></p>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn primary">Create Account</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        
        modal.querySelector('#signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignUp(modal);
        });
    }

    showSignInModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🔐 Welcome Back!</h3>
                <form id="signin-form">
                    <input type="text" id="signin-username" placeholder="Username or email" required>
                    <input type="password" id="signin-password" placeholder="Password" required>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn primary">Sign In</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        
        modal.querySelector('#signin-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignIn(modal);
        });
    }

    handleSignUp(modal) {
        const username = modal.querySelector('#signup-username').value.trim();
        const email = modal.querySelector('#signup-email').value.trim();
        const password = modal.querySelector('#signup-password').value;

        try {
            const user = this.signUp(username, email, password);
            this.saveCurrentUser(user);
            modal.remove();
            alert(`🎉 Welcome to Auckland Domain Rock Hunters, ${username}!`);
        } catch (error) {
            alert(`❌ ${error.message}`);
        }
    }

    handleSignIn(modal) {
        const usernameOrEmail = modal.querySelector('#signin-username').value.trim();
        const password = modal.querySelector('#signin-password').value;

        try {
            const user = this.signIn(usernameOrEmail, password);
            modal.remove();
            alert(`👋 Welcome back, ${user.username}!`);
        } catch (error) {
            alert(`❌ ${error.message}`);
        }
    }

    showUserProfile() {
        const userRocks = this.rocks.filter(rock => rock.postedBy === this.currentUser.id);
        const foundRocks = this.rocks.filter(rock => rock.foundByUserId === this.currentUser.id);

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content profile-content">
                <h3>👤 ${this.currentUser.username}'s Profile</h3>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <span class="stat-number">${userRocks.length}</span>
                        <span class="stat-label">Rocks Posted</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${foundRocks.length}</span>
                        <span class="stat-label">Rocks Found</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${new Date(this.currentUser.joinDate).toLocaleDateString()}</span>
                        <span class="stat-label">Member Since</span>
                    </div>
                </div>

                <div class="profile-sections">
                    <div class="profile-section">
                        <h4>🪨 Your Posted Rocks</h4>
                        <div class="user-rocks-list">
                            ${userRocks.length > 0 ? userRocks.map(rock => `
                                <div class="user-rock-item">
                                    <strong>${rock.name}</strong>
                                    <span class="rock-status ${rock.status}">${rock.status === 'found' ? '✅ Found' : '🔍 Hidden'}</span>
                                    <small>${new Date(rock.timestamp).toLocaleDateString()}</small>
                                </div>
                            `).join('') : '<p>No rocks posted yet. Start hiding some rocks!</p>'}
                        </div>
                    </div>

                    <div class="profile-section">
                        <h4>🎯 Rocks You Found</h4>
                        <div class="user-rocks-list">
                            ${foundRocks.length > 0 ? foundRocks.map(rock => `
                                <div class="user-rock-item">
                                    <strong>${rock.name}</strong>
                                    <span class="found-date">Found: ${new Date(rock.foundTimestamp).toLocaleDateString()}</span>
                                </div>
                            `).join('') : '<p>No rocks found yet. Keep hunting!</p>'}
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    trackUserLocation() {
        if (!navigator.geolocation) {
            this.debugLog && this.debugLog('GPS not supported by browser');
            return;
        }

        this.debugLog && this.debugLog('Requesting GPS location...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                this.debugLog && this.debugLog(`GPS found: ${userLat}, ${userLng}`);

                // Add user location marker with different icon
                const userMarker = L.marker([userLat, userLng], {
                    icon: L.divIcon({
                        className: 'user-location-marker',
                        html: '<div class="user-location-icon">📍</div>',
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    })
                });

                userMarker.bindPopup('📍 You are here!').addTo(this.map);

                // Optional: Center map on user if they're close to Domain
                const domainLat = -36.8627;
                const domainLng = 174.7775;
                const distance = this.calculateDistance(userLat, userLng, domainLat, domainLng);

                this.debugLog && this.debugLog(`Distance to Domain: ${distance.toFixed(2)}km`);

                if (distance < 2) { // Within 2km of Auckland Domain
                    this.map.setView([userLat, userLng], 17);
                    this.debugLog && this.debugLog('Centered map on your location');
                }
            },
            (error) => {
                let errorMsg = '';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = 'GPS permission denied. Enable in Settings > Privacy > Location Services > Safari';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = 'GPS location unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'GPS request timeout';
                        break;
                    default:
                        errorMsg = `GPS error: ${error.message}`;
                        break;
                }
                this.debugLog && this.debugLog(errorMsg);

                // Show user-friendly message
                if (error.code === error.PERMISSION_DENIED) {
                    setTimeout(() => {
                        alert('💡 Tip: Enable location access in Safari settings to see your position on the map!');
                    }, 2000);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    createDebugPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            max-height: 150px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;
        debugPanel.innerHTML = '<strong>Debug Info:</strong><br><div id="debug-content"></div>';

        // Add toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = '🐛';
        toggleBtn.style.cssText = `
            position: fixed;
            bottom: 170px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #ff6b6b;
            color: white;
            border: none;
            font-size: 16px;
            z-index: 1001;
        `;
        toggleBtn.onclick = () => {
            debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        };

        // Add reload rocks button
        const reloadBtn = document.createElement('button');
        reloadBtn.innerHTML = '🔄';
        reloadBtn.style.cssText = `
            position: fixed;
            bottom: 220px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #4CAF50;
            color: white;
            border: none;
            font-size: 16px;
            z-index: 1001;
        `;
        reloadBtn.onclick = () => {
            this.debugLog && this.debugLog('--- Reloading rocks from storage ---');
            this.rocks = this.loadRocks();
            this.filteredRocks = this.rocks;
            this.refreshMap();
            this.updateStats();
            this.debugLog && this.debugLog(`Reloaded ${this.rocks.length} rocks`);
        };

        // Add center map button
        const centerBtn = document.createElement('button');
        centerBtn.innerHTML = '🎯';
        centerBtn.style.cssText = `
            position: fixed;
            bottom: 270px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #FF9800;
            color: white;
            border: none;
            font-size: 16px;
            z-index: 1001;
        `;
        centerBtn.onclick = () => {
            this.debugLog && this.debugLog('Centering map on Auckland Domain');
            this.map.setView([-36.8627, 174.7775], 16);
            setTimeout(() => {
                this.refreshMap();
            }, 100);
        };

        // Add clear all rocks button
        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = '🗑️';
        clearBtn.style.cssText = `
            position: fixed;
            bottom: 320px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e74c3c;
            color: white;
            border: none;
            font-size: 16px;
            z-index: 1001;
        `;
        clearBtn.onclick = () => {
            if (confirm('🗑️ Delete ALL rocks? This cannot be undone!')) {
                this.debugLog && this.debugLog('Clearing all rock data');
                localStorage.removeItem('auckland-rocks');
                this.rocks = [];
                this.filteredRocks = [];
                this.refreshMap();
                this.updateStats();
                this.debugLog && this.debugLog('All rocks deleted successfully');
                alert('✅ All rocks cleared! Fresh start.');
            }
        };

        document.body.appendChild(debugPanel);
        document.body.appendChild(toggleBtn);
        document.body.appendChild(reloadBtn);
        document.body.appendChild(centerBtn);
        document.body.appendChild(clearBtn);
    }

    debugLog(message) {
        console.log(message);
        const debugContent = document.getElementById('debug-content');
        if (debugContent) {
            const time = new Date().toLocaleTimeString();
            debugContent.innerHTML += `<br>${time}: ${message}`;
            debugContent.scrollTop = debugContent.scrollHeight;
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rockApp = new RockHunterApp();
});