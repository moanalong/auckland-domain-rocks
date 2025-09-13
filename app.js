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

        this.initMap();
        this.initEventListeners();
        this.displayRocksOnMap();
        this.updateStats();
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
        this.resetCameraState();
        this.currentPhoto = null;
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
            foundNotes: ''
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
        const stored = localStorage.getItem('auckland-rocks');
        return stored ? JSON.parse(stored) : [];
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
            rock.foundBy = finderName || 'Anonymous';
            rock.foundTimestamp = new Date().toISOString();
            rock.foundPhoto = foundPhoto;
            rock.foundNotes = foundNotes;

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
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rockApp = new RockHunterApp();
});