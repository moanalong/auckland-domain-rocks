class RockHunterApp {
    constructor() {
        this.map = null;
        this.rocks = this.loadRocks();
        this.isAddingMode = false;
        this.currentPhoto = null;
        this.stream = null;
        this.pendingRockLocation = null;

        this.initMap();
        this.initEventListeners();
        this.displayRocksOnMap();
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
            photo: this.currentPhoto,
            timestamp: new Date().toISOString()
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
                className: 'rock-marker',
                html: '<img src="painted-rock.svg" alt="painted rock" style="width: 100%; height: 100%;">',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            })
        });

        let popupContent = `<div><h4>${rock.name}</h4>`;
        if (rock.description) {
            popupContent += `<p>${rock.description}</p>`;
        }
        if (rock.photo) {
            popupContent += `<img src="${rock.photo}" class="popup-photo" alt="${rock.name}">`;
        }
        popupContent += `<p><small>Added: ${new Date(rock.timestamp).toLocaleDateString()}</small></p></div>`;

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
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RockHunterApp();
});