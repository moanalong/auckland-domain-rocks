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
        this.displayRocksOnMap();
        this.updateStats();
        this.setupAdminAccess();
        this.updateUserInterface();
        this.checkForUpdates();
    }

    initMap() {
        // Auckland Domain coordinates
        const aucklandDomain = [-36.8627, 174.7775];
        
        this.map = L.map('map').setView(aucklandDomain, 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add a marker for Auckland Domain center
        L.marker(aucklandDomain)
            .addTo(this.map)
            .bindPopup('<b>Auckland Domain</b><br>Rock hunting area!')
            .openPopup();

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

        // Photo option controls
        document.getElementById('take-photo-option').addEventListener('click', () => {
            this.showCameraSection();
        });

        document.getElementById('upload-photo-option').addEventListener('click', () => {
            this.showUploadSection();
        });

        // Camera controls
        document.getElementById('start-camera').addEventListener('click', () => {
            this.startCamera();
        });

        document.getElementById('take-photo').addEventListener('click', () => {
            this.takePhoto();
        });

        document.getElementById('retake-photo').addEventListener('click', () => {
            this.retakePhoto();
        });

        document.getElementById('cancel-camera').addEventListener('click', () => {
            this.hideCameraSection();
        });

        // Upload controls
        document.getElementById('choose-file').addEventListener('click', () => {
            document.getElementById('photo-upload').click();
        });

        document.getElementById('photo-upload').addEventListener('change', (e) => {
            this.handlePhotoUpload(e);
        });

        document.getElementById('cancel-upload').addEventListener('click', () => {
            this.hideUploadSection();
        });

        // Nuclear refresh button
        document.getElementById('nuclear-refresh').addEventListener('click', () => {
            this.nuclearRefresh();
        });

        // Form submission
        document.getElementById('rock-form').addEventListener('submit', (e) => {
            this.handleRockSubmission(e);
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
        
        this.resetCameraState();
    }

    closeAddRockModal() {
        document.getElementById('add-rock-modal').classList.add('hidden');
        this.resetForm();
        this.stopCamera();
        this.pendingRockLocation = null;
    }

    resetForm() {
        document.getElementById('rock-form').reset();
        this.resetPhotoSection();
        this.currentPhoto = null;
    }

    resetPhotoSection() {
        // Show photo options
        document.querySelector('.photo-options').classList.remove('hidden');
        
        // Hide camera and upload sections
        document.querySelector('.camera-section').classList.add('hidden');
        document.querySelector('.upload-section').classList.add('hidden');
        
        // Reset camera state
        this.resetCameraState();
        
        // Clear file input
        document.getElementById('photo-upload').value = '';
        
        // Hide photo preview
        document.getElementById('photo-preview').classList.add('hidden');
    }

    resetCameraState() {
        document.getElementById('camera-preview').classList.remove('hidden');
        document.getElementById('start-camera').classList.remove('hidden');
        document.getElementById('take-photo').classList.add('hidden');
        document.getElementById('retake-photo').classList.add('hidden');
        document.getElementById('photo-preview').classList.add('hidden');
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: 300, 
                    height: 300,
                    facingMode: 'environment' // Use back camera if available
                } 
            });
            
            const video = document.getElementById('camera-preview');
            video.srcObject = this.stream;
            
            document.getElementById('start-camera').classList.add('hidden');
            document.getElementById('take-photo').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera. Please check permissions.');
        }
    }

    takePhoto() {
        const video = document.getElementById('camera-preview');
        const canvas = document.getElementById('photo-canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0);
        
        this.currentPhoto = canvas.toDataURL('image/jpeg', 0.8);
        
        // Show preview
        const preview = document.getElementById('photo-preview');
        preview.innerHTML = `<img src="${this.currentPhoto}" alt="Rock photo">`;
        preview.classList.remove('hidden');
        
        // Hide video and show retake option
        video.classList.add('hidden');
        document.getElementById('take-photo').classList.add('hidden');
        document.getElementById('retake-photo').classList.remove('hidden');
        
        this.stopCamera();
    }

    retakePhoto() {
        this.resetCameraState();
        this.currentPhoto = null;
        this.startCamera();
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    showCameraSection() {
        // Hide photo options and upload section
        document.querySelector('.photo-options').classList.add('hidden');
        document.querySelector('.upload-section').classList.add('hidden');
        
        // Show camera section
        document.querySelector('.camera-section').classList.remove('hidden');
        
        // Reset camera state
        this.resetCameraState();
    }

    hideCameraSection() {
        // Hide camera section
        document.querySelector('.camera-section').classList.add('hidden');
        
        // Show photo options
        document.querySelector('.photo-options').classList.remove('hidden');
        
        // Stop camera and reset
        this.stopCamera();
        this.resetCameraState();
        
        // Clear any existing photo
        document.getElementById('photo-preview').classList.add('hidden');
        this.currentPhoto = null;
    }

    showUploadSection() {
        // Hide photo options and camera section
        document.querySelector('.photo-options').classList.add('hidden');
        document.querySelector('.camera-section').classList.add('hidden');
        
        // Show upload section
        document.querySelector('.upload-section').classList.remove('hidden');
    }

    hideUploadSection() {
        // Hide upload section
        document.querySelector('.upload-section').classList.add('hidden');
        
        // Show photo options
        document.querySelector('.photo-options').classList.remove('hidden');
        
        // Clear file input
        document.getElementById('photo-upload').value = '';
        
        // Clear any existing photo preview
        document.getElementById('photo-preview').classList.add('hidden');
        this.currentPhoto = null;
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image file too large. Please select an image under 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Create canvas to resize image if needed
                const canvas = document.getElementById('photo-canvas');
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

                // Show preview
                const preview = document.getElementById('photo-preview');
                preview.innerHTML = `<img src="${this.currentPhoto}" alt="Uploaded rock photo">`;
                preview.classList.remove('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    nuclearRefresh() {
        console.log('NUCLEAR REFRESH: User initiated total app refresh');
        
        if (confirm('This will clear all app caches and reload the page. Continue?')) {
            // Show loading indicator
            const button = document.getElementById('nuclear-refresh');
            const originalText = button.innerHTML;
            button.innerHTML = '⏳ Clearing...';
            button.disabled = true;
            
            // Clear all possible caches and storage
            this.clearAllStorageAndCaches().then(() => {
                // Force version update
                localStorage.setItem('auckland_app_version', 'force-refresh-' + Date.now());
                
                // Send message to service worker for nuclear cache clearing
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'NUCLEAR_REFRESH',
                        timestamp: Date.now()
                    });
                }
                
                // Hard reload after short delay
                setTimeout(() => {
                    window.location.href = window.location.href + '?nuclear=' + Date.now() + '&force=true';
                }, 500);
            });
        }
    }

    async clearAllStorageAndCaches() {
        console.log('NUCLEAR: Clearing all storage and caches');
        
        try {
            // 1. Clear all Cache API caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => {
                    console.log('NUCLEAR: Deleting cache:', name);
                    return caches.delete(name);
                }));
            }
            
            // 2. Clear all localStorage except user data
            const keysToKeep = ['auckland-rock-users', 'auckland-rock-current-user'];
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            // 3. Clear sessionStorage completely
            sessionStorage.clear();
            
            // 4. Clear IndexedDB if present
            if ('indexedDB' in window) {
                try {
                    const databases = await indexedDB.databases();
                    await Promise.all(databases.map(db => {
                        return new Promise((resolve) => {
                            const deleteReq = indexedDB.deleteDatabase(db.name);
                            deleteReq.onsuccess = () => resolve();
                            deleteReq.onerror = () => resolve(); // Continue even if fails
                        });
                    }));
                } catch (e) {
                    console.warn('NUCLEAR: IndexedDB clear failed:', e);
                }
            }
            
            // 5. Force DOM refresh for iOS Safari
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                document.documentElement.style.display = 'none';
                document.documentElement.offsetHeight; // Force reflow
                document.documentElement.style.display = '';
            }
            
            console.log('NUCLEAR: All storage cleared successfully');
        } catch (error) {
            console.error('NUCLEAR: Error clearing storage:', error);
        }
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
        e.preventDefault();
        
        if (!this.pendingRockLocation) {
            alert('No location selected');
            return;
        }

        const name = document.getElementById('rock-name').value.trim();
        const description = document.getElementById('rock-description').value.trim();
        
        if (!name) {
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

        this.addRock(rock);
        this.closeAddRockModal();
        this.toggleAddMode(); // Exit add mode after adding
    }

    addRock(rock) {
        this.rocks.push(rock);
        this.saveRocks();
        this.addRockToMap(rock);
    }

    addRockToMap(rock) {
        const marker = L.marker([rock.lat, rock.lng], {
            icon: L.divIcon({
                className: `rock-marker ${rock.status}`,
                html: `<div class="css-rock ${rock.status}"></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
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
        marker.addTo(this.map);
    }

    displayRocksOnMap() {
        this.rocks.forEach(rock => this.addRockToMap(rock));
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

        container.innerHTML = this.rocks.map(rock => `
            <div class="rock-item">
                <h4>${rock.name}</h4>
                ${rock.description ? `<p>${rock.description}</p>` : ''}
                ${rock.photo ? `<img src="${rock.photo}" class="rock-photo" alt="${rock.name}">` : ''}
                <div class="coordinates">
                    📍 ${rock.lat.toFixed(6)}, ${rock.lng.toFixed(6)}
                </div>
                <div class="coordinates">
                    🕒 ${new Date(rock.timestamp).toLocaleString()}
                </div>
            </div>
        `).join('');
    }

    loadRocks() {
        // Force clean start for team testing - clear any existing data
        localStorage.removeItem('auckland-rocks');
        return [];
    }

    saveRocks() {
        localStorage.setItem('auckland-rocks', JSON.stringify(this.rocks));
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
        // Clear existing markers
        this.map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                this.map.removeLayer(layer);
            }
        });
        // Re-add all markers
        this.displayRocksOnMap();
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

    displayRocksOnMap() {
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
                    <button id="sign-up-btn" class="btn">Sign Up</button>
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
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rockApp = new RockHunterApp();
});