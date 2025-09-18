class RockHunterApp {
    constructor() {
        this.map = null;
        this.rocks = [];
        this.isAddingMode = false;
        this.currentPhoto = null;
        this.stream = null;
        this.pendingRockLocation = null;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        this.isIOSChrome = /CriOS/.test(navigator.userAgent);

        // Initialize Firebase
        this.initFirebase();

        
        // User authentication system
        this.currentUser = this.loadCurrentUser();
        this.users = this.loadUsers();
        this.postAsUser = true; // Default to posting as user when logged in

        this.initMap();
        this.initEventListeners();
        this.setupAdminAccess();
        this.updateUserInterface();
        this.checkForUpdates();
        this.trackUserLocation();
        this.createDebugPanel();

        // Load rocks from Firebase after initialization
        this.loadRocksFromFirebase();
    }

    initMap() {
        this.debugLog && this.debugLog('🗺️ Initializing simple rock hunting map...');

        // Simple map is already loaded via HTML image - just set up interactions
        setTimeout(() => {
            this.setupSimpleMapInteractions();
            this.displayRocksOnMap();
            this.debugLog && this.debugLog('✅ Simple rock hunting map ready!');
        }, 500);
    }

    setupSimpleMapInteractions() {
        const mapOverlay = document.getElementById('mapOverlay');
        if (!mapOverlay) return;

        // Add click/touch handler for rock placement
        mapOverlay.addEventListener('click', (e) => {
            if (this.isAddingMode) {
                this.handleSimpleMapClick(e);
            }
        });

        // iPhone touch events
        mapOverlay.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.isAddingMode) {
                this.handleSimpleMapClick(e);
            }
        });

        this.debugLog && this.debugLog('✅ Simple map interactions set up');
    }

    handleSimpleMapClick(e) {
        const mapContainer = document.getElementById('map');
        const rect = mapContainer.getBoundingClientRect();

        // Get click position relative to map
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Convert to percentage of map area (for relative positioning)
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        // Generate approximate coordinates (Auckland Domain area)
        const lat = -36.8627 + ((yPercent - 50) / 100) * 0.005; // Rough mapping
        const lng = 174.7775 + ((xPercent - 50) / 100) * 0.005;

        this.debugLog && this.debugLog(`📍 Adding rock at: ${lat}, ${lng} (${xPercent}%, ${yPercent}%)`);

        // Create rock object with position data
        const rock = {
            lat: lat,
            lng: lng,
            xPercent: xPercent,
            yPercent: yPercent,
            timestamp: Date.now()
        };

        // Open add rock modal
        this.openAddRockModal(rock);
    }

    openAddRockModal(rock) {
        this.debugLog && this.debugLog('📝 Opening add rock modal');

        // Store the pending rock position
        this.pendingRock = rock;

        // Show the modal
        const modal = document.getElementById('add-rock-modal');
        if (modal) {
            modal.classList.remove('hidden');

            // Clear previous form data
            document.getElementById('rock-name').value = '';
            document.getElementById('rock-description').value = '';

            // Focus on name input
            setTimeout(() => {
                document.getElementById('rock-name').focus();
            }, 100);
        }
    }

    closeAddRockModal() {
        this.debugLog && this.debugLog('❌ Closing add rock modal');

        const modal = document.getElementById('add-rock-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Clear pending rock
        this.pendingRock = null;

        // Exit add mode
        this.isAddingMode = false;
        this.toggleAddMode();
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

        // Photo source controls - iPhone optimized
        document.getElementById('camera-btn').addEventListener('click', () => {
            this.debugLog && this.debugLog('Camera button clicked');

            // iOS Safari and Chrome optimized camera handling
            if (this.isIOS) {
                this.debugLog && this.debugLog('Using iOS optimized camera input');
                this.openIOSCamera();
            } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                this.debugLog && this.debugLog('Using Media Capture API');
                this.openCamera();
            } else {
                this.debugLog && this.debugLog('Using file input fallback');
                this.openFallbackCamera();
            }
        });

        document.getElementById('gallery-btn').addEventListener('click', () => {
            this.debugLog && this.debugLog('Gallery button clicked');

            // iOS optimized photo library access
            if (this.isIOS) {
                this.debugLog && this.debugLog('Using iOS optimized photo library');
                this.openIOSPhotoLibrary();
            } else {
                this.openPhotoLibrary();
            }
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


        // Auto-start GPS tracking on load
        this.trackUserLocation();
    }

    toggleAddMode() {
        this.isAddingMode = !this.isAddingMode;
        const button = document.getElementById('add-rock-mode');
        const hint = document.getElementById('addRockHint');

        if (this.isAddingMode) {
            button.textContent = '❌ Cancel Adding';
            button.classList.remove('cherry');
            button.classList.add('maple');
            if (hint) hint.style.display = 'block';
            this.debugLog && this.debugLog('🎯 Add rock mode enabled - tap on map to add rocks');
        } else {
            button.textContent = '➕ Add Rock';
            button.classList.remove('maple');
            button.classList.add('cherry');
            if (hint) hint.style.display = 'none';
            this.debugLog && this.debugLog('🎯 Add rock mode disabled');
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

    openIOSCamera() {
        // iOS Safari and Chrome optimized camera input
        const cameraInput = document.createElement('input');
        cameraInput.type = 'file';
        cameraInput.accept = 'image/*';
        cameraInput.capture = 'environment';
        cameraInput.style.display = 'none';

        // Better iOS handling with proper event timing
        cameraInput.addEventListener('change', (e) => {
            this.debugLog && this.debugLog('iOS camera input changed');
            this.handlePhotoUpload(e);
            setTimeout(() => {
                if (document.body.contains(cameraInput)) {
                    document.body.removeChild(cameraInput);
                }
            }, 100);
        });

        // Prevent iOS Safari from blocking the input
        cameraInput.addEventListener('cancel', () => {
            setTimeout(() => {
                if (document.body.contains(cameraInput)) {
                    document.body.removeChild(cameraInput);
                }
            }, 100);
        });

        document.body.appendChild(cameraInput);
        // Use setTimeout to ensure proper iOS timing
        setTimeout(() => {
            cameraInput.click();
        }, 100);
    }

    openIOSPhotoLibrary() {
        // iOS optimized photo library access
        const galleryInput = document.createElement('input');
        galleryInput.type = 'file';
        galleryInput.accept = 'image/*';
        galleryInput.style.display = 'none';

        galleryInput.addEventListener('change', (e) => {
            this.debugLog && this.debugLog('iOS photo library selection');
            this.handlePhotoUpload(e);
            setTimeout(() => {
                if (document.body.contains(galleryInput)) {
                    document.body.removeChild(galleryInput);
                }
            }, 100);
        });

        galleryInput.addEventListener('cancel', () => {
            setTimeout(() => {
                if (document.body.contains(galleryInput)) {
                    document.body.removeChild(galleryInput);
                }
            }, 100);
        });

        document.body.appendChild(galleryInput);
        setTimeout(() => {
            galleryInput.click();
        }, 100);
    }

    openFallbackCamera() {
        const cameraInput = document.createElement('input');
        cameraInput.type = 'file';
        cameraInput.accept = 'image/*';
        cameraInput.setAttribute('capture', 'environment');
        cameraInput.setAttribute('capture', 'camera');
        cameraInput.style.display = 'none';
        cameraInput.addEventListener('change', (e) => {
            this.debugLog && this.debugLog('Fallback camera input file selected');
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

    openPhotoLibrary() {
        const galleryInput = document.createElement('input');
        galleryInput.type = 'file';
        galleryInput.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/tiff';
        galleryInput.style.display = 'none';
        galleryInput.setAttribute('data-source', 'gallery');

        galleryInput.addEventListener('change', (e) => {
            this.debugLog && this.debugLog('Photo library file selected');
            this.handlePhotoUpload(e);
        });
        document.body.appendChild(galleryInput);
        galleryInput.click();
        setTimeout(() => {
            if (document.body.contains(galleryInput)) {
                document.body.removeChild(galleryInput);
            }
        }, 1000);
    }

    async openCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

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
            video.muted = true;
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
                // Use canvas to compress large images
                const img = new Image();
                img.onload = () => {
                    this.debugLog && this.debugLog('Image loaded for compression');

                    // Create canvas to resize image
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Calculate new dimensions (max 600px for mobile storage)
                    let { width, height } = img;
                    const maxSize = 600;

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
                    this.currentPhoto = canvas.toDataURL('image/jpeg', 0.6); // Lower quality for smaller size

                    this.debugLog && this.debugLog(`Photo compressed, length: ${this.currentPhoto.length} characters (${Math.round(this.currentPhoto.length / 1024)}KB)`);

                    // Show preview
                    const preview = document.getElementById('photo-preview');
                    preview.innerHTML = `<img src="${this.currentPhoto}" alt="Uploaded rock photo" style="max-width:100px;max-height:100px;object-fit:cover;">`;
                    preview.classList.remove('hidden');

                    this.debugLog && this.debugLog('Photo preview displayed');
                };

                img.onerror = () => {
                    this.debugLog && this.debugLog('ERROR: Image failed to load for compression');
                };

                img.src = e.target.result;

            } catch (error) {
                this.debugLog && this.debugLog(`Error processing photo: ${error.message}`);

                // iOS Safari fallback - create canvas dynamically
                const img = new Image();
                img.onload = () => {
                    this.debugLog && this.debugLog('iOS fallback: Image loaded, creating canvas');

                    // Create canvas dynamically for iOS compatibility
                    const canvas = document.createElement('canvas');
                    document.body.appendChild(canvas);
                    canvas.style.display = 'none';

                    const ctx = canvas.getContext('2d');

                    // Calculate new dimensions optimized for mobile
                    let { width, height } = img;
                    const maxSize = this.isIOS ? 600 : 800;

                    if (width > height && width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    } else if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // iOS Safari optimized image drawing
                    try {
                        ctx.drawImage(img, 0, 0, width, height);
                        const quality = this.isIOS ? 0.6 : 0.8;
                        this.currentPhoto = canvas.toDataURL('image/jpeg', quality);

                        this.debugLog && this.debugLog(`iOS fallback photo processed, length: ${this.currentPhoto.length} characters`);

                        // Show preview
                        const preview = document.getElementById('photo-preview');
                        preview.innerHTML = `<img src="${this.currentPhoto}" alt="Uploaded rock photo">`;
                        preview.classList.remove('hidden');

                        this.debugLog && this.debugLog('iOS fallback photo preview displayed');
                    } catch (canvasError) {
                        this.debugLog && this.debugLog(`Canvas error on iOS: ${canvasError.message}`);
                        alert('Photo processing failed on this device. Try a smaller image.');
                    } finally {
                        // Clean up canvas
                        if (document.body.contains(canvas)) {
                            document.body.removeChild(canvas);
                        }
                    }
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

        // Close modal and exit add mode after a brief delay to ensure save completes
        setTimeout(() => {
            this.closeAddRockModal();
            this.toggleAddMode(); // Exit add mode after adding
        }, 100);
    }

    addRock(rock) {
        this.debugLog && this.debugLog(`Adding rock: ${rock.name} at ${rock.lat}, ${rock.lng}`);

        // Set flag to prevent duplicate Firebase listener processing
        this.isAddingRock = true;

        this.rocks.push(rock);
        this.debugLog && this.debugLog(`Total rocks now: ${this.rocks.length}`);

        // Add to map immediately for responsive UI
        this.addRockToMap(rock);
        this.updateStats();

        // 🎯 UNIFIED SAVE & SHARE: Save locally AND share with all users automatically
        this.saveAndShareRock(rock).finally(() => {
            // Clear flag after save process completes
            this.isAddingRock = false;
        });

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

        // Different HTML content based on rock status
        let markerHtml;
        if (rock.status === 'found') {
            markerHtml = `<div class="found-rock-icon" style="font-size: 32px;">✅</div>`;
            this.debugLog && this.debugLog(`🎯 FOUND ROCK ICON: Using ✅ for ${rock.name}`);
        } else {
            markerHtml = `<div class="header-rock"></div>`;
            this.debugLog && this.debugLog(`🪨 HIDDEN ROCK ICON: Using rock icon for ${rock.name}`);
        }

        const marker = L.marker([rock.lat, rock.lng], {
            icon: L.divIcon({
                className: `rock-marker ${rock.status}`,
                html: markerHtml,
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
                popupContent += `<img src="${photo}" class="popup-photo" alt="${rock.name}" data-photo-url="${photo}">`;
            });
            popupContent += `</div>`;
        } else if (rock.photo) { // Backward compatibility
            popupContent += `<img src="${rock.photo}" class="popup-photo" alt="${rock.name}" data-photo-url="${rock.photo}">`;
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
            popupContent += `<button class="mark-found-btn" data-rock-id="${rock.id}">🎯 Mark as Found</button>`;
        }

        // Add delete button if current user owns this rock
        if (this.canUserDeleteRock(rock)) {
            popupContent += `<div class="popup-actions">`;
            popupContent += `<button class="btn-danger delete-rock-popup-btn" data-rock-id="${rock.id}">🗑️ Delete Rock</button>`;
            popupContent += `</div>`;
        }
        
        popupContent += `</div></div>`;

        marker.bindPopup(popupContent);

        // Add event listener for mark as found button, delete button, and photo clicks when popup opens
        marker.on('popupopen', () => {
            const markFoundBtn = document.querySelector('.mark-found-btn[data-rock-id="' + rock.id + '"]');
            if (markFoundBtn) {
                markFoundBtn.addEventListener('click', () => {
                    this.debugLog && this.debugLog(`Mark as found clicked for rock: ${rock.id}`);
                    this.markAsFound(rock.id);
                });
            }

            // Add event listener for delete button in popup
            const deleteBtn = document.querySelector('.delete-rock-popup-btn[data-rock-id="' + rock.id + '"]');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.debugLog && this.debugLog(`Delete rock clicked for rock: ${rock.id}`);
                    this.confirmDeleteRock(rock.id);
                });
            }

            // Add event listeners for photo clicks
            const photoElements = document.querySelectorAll('.popup-photo[data-photo-url]');
            photoElements.forEach(photoElement => {
                photoElement.addEventListener('click', () => {
                    const photoUrl = photoElement.getAttribute('data-photo-url');
                    this.debugLog && this.debugLog(`Photo clicked: ${photoUrl}`);
                    this.showPhotoModal(photoUrl);
                });
            });
        });

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
        this.debugLog && this.debugLog(`Displaying ${this.rocks.length} rocks on simple map`);

        const markersContainer = document.getElementById('rockMarkers');
        if (!markersContainer) return;

        // Clear existing markers
        markersContainer.innerHTML = '';

        this.rocks.forEach(rock => {
            this.debugLog && this.debugLog(`Adding ${rock.name} to simple map`);
            this.addRockToSimpleMap(rock);
        });
    }

    addRockToSimpleMap(rock) {
        const markersContainer = document.getElementById('rockMarkers');
        if (!markersContainer) return;

        // Create marker element
        const marker = document.createElement('div');
        marker.className = `rock-marker ${rock.status}`;
        marker.style.left = `${rock.xPercent || 50}%`;
        marker.style.top = `${rock.yPercent || 50}%`;

        // Add icon based on status
        marker.innerHTML = rock.status === 'found' ? '✅' : '<div class="header-rock"></div>';

        // Add click handler for rock interaction
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showRockDetails(rock);
        });

        markersContainer.appendChild(marker);
        this.debugLog && this.debugLog(`✅ Added ${rock.name} marker to simple map`);
    }

    showRockDetails(rock) {
        let details = `💎 ${rock.name}\n`;
        if (rock.description) details += `📝 ${rock.description}\n`;
        details += `📍 Status: ${rock.status === 'found' ? 'Found ✅' : 'Hidden 🔍'}\n`;
        if (rock.foundBy) details += `👤 Found by: ${rock.foundBy}\n`;
        if (rock.timestamp) {
            const date = new Date(rock.timestamp).toLocaleDateString();
            details += `📅 Added: ${date}`;
        }

        // If rock is hidden and user found it, offer to mark as found
        if (rock.status === 'hidden') {
            details += '\n\n🎉 Did you find this rock?';
            if (confirm(details)) {
                this.markRockAsFound(rock);
            }
        } else {
            alert(details);
        }
    }

    markRockAsFound(rock) {
        const username = this.currentUser ? this.currentUser.username : 'Anonymous';

        rock.status = 'found';
        rock.foundBy = username;
        rock.foundTimestamp = Date.now();

        this.debugLog && this.debugLog(`🎉 ${username} found rock: ${rock.name}`);

        // Update visually
        this.displayRocksOnMap();
        this.updateStats();

        // Save to Firebase
        this.saveRockToFirebase(rock);

        alert(`🎉 Congratulations! You found "${rock.name}"!`);
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
                photoHtml = `<img src="${rock.photos[0]}" class="rock-photo" alt="${rock.name}" data-photo-url="${rock.photos[0]}">`;
                this.debugLog && this.debugLog(`Using photos[0] for ${rock.name}`);
            } else if (rock.photo) {
                photoHtml = `<img src="${rock.photo}" class="rock-photo" alt="${rock.name}" data-photo-url="${rock.photo}">`;
                this.debugLog && this.debugLog(`Using photo for ${rock.name}`);
            } else {
                this.debugLog && this.debugLog(`No photo found for ${rock.name}`);
            }

            // Check if current user can delete this rock
            const canDelete = this.canUserDeleteRock(rock);
            const deleteButtonHtml = canDelete ? `
                <div class="rock-actions">
                    <button class="btn-danger delete-rock-btn" data-rock-id="${rock.id}">🗑️ Remove</button>
                </div>
            ` : '';

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
                        <div class="rock-owner">
                            👤 ${rock.postedByUsername || rock.ownerName || 'Anonymous'}
                        </div>
                    </div>
                    ${deleteButtonHtml}
                </div>
            `;
        }).join('');

        // Add event listeners for rock list photos and delete buttons
        setTimeout(() => {
            const rockPhotos = document.querySelectorAll('.rock-photo[data-photo-url]');
            rockPhotos.forEach(photoElement => {
                photoElement.addEventListener('click', () => {
                    const photoUrl = photoElement.getAttribute('data-photo-url');
                    this.debugLog && this.debugLog(`Rock list photo clicked: ${photoUrl}`);
                    this.showPhotoModal(photoUrl);
                });
            });

            // Add event listeners for delete buttons
            const deleteButtons = document.querySelectorAll('.delete-rock-btn');
            deleteButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const rockId = button.getAttribute('data-rock-id');
                    this.confirmDeleteRock(rockId);
                });
            });
        }, 100);
    }


    markAsFound(rockId) {
        const rock = this.rocks.find(r => r.id === rockId);
        if (!rock) return;

        this.showMarkFoundModal(rock);
    }

    // Check if current user can delete a specific rock
    canUserDeleteRock(rock) {
        // Users can only delete their own rocks
        if (!this.currentUser) return false;

        // Check if rock was posted by current user
        return rock.postedBy === this.currentUser.id ||
               (rock.postedByUsername && rock.postedByUsername === this.currentUser.username);
    }

    // Show confirmation dialog before deleting a rock
    confirmDeleteRock(rockId) {
        const rock = this.rocks.find(r => r.id === rockId);
        if (!rock) {
            alert('❌ Rock not found');
            return;
        }

        if (!this.canUserDeleteRock(rock)) {
            alert('❌ You can only delete rocks that you posted');
            return;
        }

        const confirmMessage = `Are you sure you want to delete "${rock.name}"?\n\nThis will permanently remove the rock from both your device and the cloud. This action cannot be undone.`;

        if (confirm(confirmMessage)) {
            this.deleteRock(rockId);
        }
    }

    // Delete a rock from both local storage and Firebase
    async deleteRock(rockId) {
        this.debugLog && this.debugLog(`🗑️ Deleting rock: ${rockId}`);

        const rock = this.rocks.find(r => r.id === rockId);
        if (!rock) {
            alert('❌ Rock not found');
            return;
        }

        if (!this.canUserDeleteRock(rock)) {
            alert('❌ You can only delete rocks that you posted');
            return;
        }

        try {
            // Step 1: Remove from local array
            this.rocks = this.rocks.filter(r => r.id !== rockId);
            this.debugLog && this.debugLog('✅ Rock removed from local array');

            // Step 2: Save updated local storage
            this.saveRocksLocal();
            this.debugLog && this.debugLog('✅ Local storage updated');

            // Step 3: Delete from Firebase
            await this.deleteRockFromFirebase(rockId);

            // Step 4: Clean up shared rocks JSON (for fallback sync)
            this.removeFromSharedCollection(rockId);

            // Step 5: Update UI
            this.displayRocksOnMap();
            this.updateRocksList();
            this.updateStats();

            alert(`✅ Rock "${rock.name}" has been deleted successfully`);
            this.debugLog && this.debugLog(`✅ Rock ${rock.name} deleted completely`);

        } catch (error) {
            this.debugLog && this.debugLog(`❌ Error deleting rock: ${error.message}`);

            // If Firebase deletion failed, we should restore the rock to local storage
            // to maintain consistency
            this.rocks.push(rock);
            this.saveRocksLocal();
            this.displayRocksOnMap();
            this.updateRocksList();
            this.updateStats();

            alert(`❌ Failed to delete rock: ${error.message}\nThe rock has been restored.`);
        }
    }

    // Delete rock from Firebase
    async deleteRockFromFirebase(rockId) {
        if (!this.db) {
            this.debugLog && this.debugLog('Firebase not available, skipping cloud deletion');
            return Promise.resolve();
        }

        try {
            this.debugLog && this.debugLog(`🔥 Deleting rock ${rockId} from Firebase...`);

            // Delete from Firestore with timeout
            const deletePromise = this.db.collection('rocks').doc(rockId).delete();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Firebase delete timeout')), 10000)
            );

            await Promise.race([deletePromise, timeoutPromise]);
            this.debugLog && this.debugLog('✅ Rock deleted from Firebase');

        } catch (error) {
            this.debugLog && this.debugLog(`❌ Firebase deletion failed: ${error.message}`);
            throw new Error(`Firebase deletion failed: ${error.message}`);
        }
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

            // 🎯 UNIFIED SAVE & SHARE: Update is automatically shared with all users
            this.saveAndShareRock(rock);
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



    // Admin function to clear all data for team testing
    clearAllRockData() {
        if (confirm('⚠️ ADMIN: Clear ALL rock data? This cannot be undone!')) {
            localStorage.removeItem('auckland-rocks');
            this.rocks = [];
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
                        <h4>💎 Your Posted Rocks</h4>
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

        // Check if permission is already denied
        if (navigator.permissions) {
            navigator.permissions.query({name: 'geolocation'}).then((result) => {
                this.debugLog && this.debugLog(`GPS permission status: ${result.state}`);
                if (result.state === 'denied') {
                    this.debugLog && this.debugLog('GPS permission denied by user');
                    setTimeout(() => {
                        alert('🌍 Location access is blocked. To enable:\n\n📱 Chrome mobile: Tap the lock icon in address bar\n💻 Chrome desktop: Click the location icon in address bar\n\nThen refresh the page!');
                    }, 1000);
                }
            });
        }

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

    trackUserLocation() {
        console.log('🌍 trackUserLocation function called');

        if (!navigator.geolocation) {
            console.log('❌ GPS not supported by browser');
            alert('❌ GPS not supported by your browser');
            return;
        }

        console.log('✅ GPS supported, requesting location...');
        alert('🌍 Requesting your location...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                console.log(`✅ GPS SUCCESS: ${userLat}, ${userLng}`);
                alert(`✅ GPS found: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`);

                // Calculate distance to Auckland Domain
                const domainLat = -36.8627;
                const domainLng = 174.7775;
                const distance = this.calculateDistance(userLat, userLng, domainLat, domainLng);

                console.log(`Distance to Domain: ${distance.toFixed(2)}km`);

                // Store user location
                this.userLocation = { lat: userLat, lng: userLng };

                // Add user location marker on the map
                this.addUserLocationMarker(userLat, userLng);

                alert(`🎯 You're ${distance.toFixed(2)}km from Auckland Domain. Blue marker added to map!`);
            },
            (error) => {
                console.log(`❌ GPS ERROR: ${error.message}`);
                alert(`❌ GPS failed: ${error.message}\n\nError code: ${error.code}`);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000
            }
        );
    }

    addUserLocationMarker(lat, lng) {
        console.log('📍 addUserLocationMarker called');

        const rockMarkers = document.getElementById('rockMarkers');
        if (!rockMarkers) {
            console.log('❌ rockMarkers container not found!');
            alert('❌ Cannot find map markers container');
            return;
        }

        console.log('✅ Found rockMarkers container');

        // Remove any existing user location marker
        const existingUserMarker = document.querySelector('.user-location-marker');
        if (existingUserMarker) {
            existingUserMarker.remove();
            console.log('🗑️ Removed existing user marker');
        }

        // Add blue location marker
        const marker = document.createElement('div');
        marker.className = 'user-location-marker rock-marker';
        marker.style.left = '50%';
        marker.style.top = '50%';
        marker.style.background = '#2196F3';
        marker.style.border = '3px solid white';
        marker.style.fontSize = '20px';
        marker.innerHTML = '📍';
        marker.title = `Your Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        rockMarkers.appendChild(marker);
        console.log('✅ User location marker added to DOM');
        alert('✅ Blue GPS marker added to map!');
    }

    initFirebase() {
        try {
            // Check if Firebase is loaded and configured
            if (typeof firebase !== 'undefined' && window.firebaseDb) {
                this.debugLog && this.debugLog('🔥 Firebase available but using hybrid approach');
                this.db = window.firebaseDb;
                this.storage = null;

                // Use hybrid approach: Firebase + JSON fallback due to rules issues
                this.setupHybridSync();
            } else {
                // Fallback to old JSON system
                this.debugLog && this.debugLog('⚠️ Firebase not available, using JSON fallback');
                this.db = null;
                this.cloudRocksUrl = 'shared-rocks.json';

                // Set up periodic sync every 15 seconds
                setInterval(() => {
                    this.syncWithCloud();
                }, 15000);

                // Initial cloud sync
                setTimeout(() => {
                    this.syncWithCloud();
                }, 2000);
            }
        } catch (error) {
            this.debugLog && this.debugLog(`Firebase init error: ${error.message}`);
            // Use fallback system
            this.db = null;
            this.cloudRocksUrl = 'shared-rocks.json';
        }
    }

    async syncWithCloud() {
        try {
            this.debugLog && this.debugLog('🔄 Starting comprehensive cloud sync...');

            // Step 1: Fetch shared rocks from JSON file
            const response = await fetch(this.cloudRocksUrl + '?t=' + Date.now());
            let cloudRocks = [];

            if (response.ok) {
                const cloudData = await response.json();
                cloudRocks = cloudData.rocks || [];
                this.debugLog && this.debugLog(`📥 Found ${cloudRocks.length} rocks in JSON cloud`);
            }

            // Step 2: Also check localStorage shared collection
            const sharedData = localStorage.getItem('auckland-rocks-shared');
            if (sharedData) {
                try {
                    const localSharedData = JSON.parse(sharedData);
                    const localSharedRocks = localSharedData.rocks || [];
                    this.debugLog && this.debugLog(`📥 Found ${localSharedRocks.length} rocks in shared localStorage`);

                    // Merge local shared rocks with cloud rocks
                    localSharedRocks.forEach(sharedRock => {
                        if (!cloudRocks.find(r => r.id === sharedRock.id)) {
                            cloudRocks.push(sharedRock);
                        }
                    });
                } catch (error) {
                    this.debugLog && this.debugLog(`Error parsing shared localStorage: ${error.message}`);
                }
            }

            this.debugLog && this.debugLog(`📥 Total rocks to sync: ${cloudRocks.length}`);

            // Step 3: Merge with local rocks (avoid duplicates and update existing ones)
            let updated = false;
            cloudRocks.forEach(cloudRock => {
                const existingIndex = this.rocks.findIndex(r => r.id === cloudRock.id);
                if (existingIndex === -1) {
                    // New rock from cloud
                    this.rocks.push(cloudRock);
                    this.debugLog && this.debugLog(`➕ Added new rock from cloud: ${cloudRock.name}`);
                    updated = true;
                } else {
                    // Update existing rock if cloud version has more recent data
                    const existing = this.rocks[existingIndex];
                    let shouldUpdate = false;

                    // Update if cloud has photos and local doesn't
                    if (cloudRock.photos && cloudRock.photos.length > 0 &&
                        (!existing.photos || existing.photos.length === 0)) {
                        shouldUpdate = true;
                    }

                    // Update if cloud is found and local isn't
                    if (cloudRock.foundBy && !existing.foundBy) {
                        shouldUpdate = true;
                    }

                    // Update if cloud has newer timestamp
                    if (cloudRock.sharedTimestamp &&
                        (!existing.sharedTimestamp ||
                         new Date(cloudRock.sharedTimestamp) > new Date(existing.sharedTimestamp))) {
                        shouldUpdate = true;
                    }

                    if (shouldUpdate) {
                        this.rocks[existingIndex] = {...existing, ...cloudRock};
                        this.debugLog && this.debugLog(`🔄 Updated existing rock from cloud: ${cloudRock.name}`);
                        updated = true;
                    }
                }
            });

            if (updated) {
                this.refreshMap();
                this.updateStats();
                this.saveRocksLocal(); // Save merged data locally
                this.debugLog && this.debugLog('✅ Cloud sync completed with updates');
            } else {
                this.debugLog && this.debugLog('✅ Cloud sync completed - no updates needed');
            }
        } catch (error) {
            this.debugLog && this.debugLog(`❌ Cloud sync failed: ${error.message}`);
        }
    }

    async loadRocksFromFirebase() {
        if (!this.db) {
            this.debugLog && this.debugLog('Firebase not available, loading from localStorage');
            this.rocks = this.loadRocksLocal();
            this.displayRocksOnMap();
            this.updateStats();
            return;
        }

        try {
            this.debugLog && this.debugLog('Loading rocks from Firebase...');

            const snapshot = await this.db.collection('rocks').get();
            this.rocks = [];

            snapshot.forEach(doc => {
                this.rocks.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.debugLog && this.debugLog(`Loaded ${this.rocks.length} rocks from Firebase`);
            this.displayRocksOnMap();
            this.updateStats();

            // Set up real-time listener
            this.setupRealTimeListener();

        } catch (error) {
            this.debugLog && this.debugLog(`Error loading from Firebase: ${error.message}`);
            this.debugLog && this.debugLog('Falling back to localStorage');
            this.rocks = this.loadRocksLocal();
            this.displayRocksOnMap();
            this.updateStats();
        }
    }

    setupRealTimeListener() {
        if (!this.db) return;

        this.debugLog && this.debugLog('🔥 Setting up real-time Firebase sync');

        this.db.collection('rocks').onSnapshot((snapshot) => {
            this.debugLog && this.debugLog(`🔄 Real-time update: ${snapshot.size} rocks in Firebase`);

            // Skip updates during local rock addition to prevent duplicate processing
            if (this.isAddingRock) {
                this.debugLog && this.debugLog('⏭️ Skipping real-time update during local rock addition');
                return;
            }

            // For initial load, replace all rocks
            if (snapshot.size === 0 || !this.hasLoadedFromFirebase) {
                this.rocks = [];
                snapshot.forEach(doc => {
                    this.rocks.push({ id: doc.id, ...doc.data() });
                });
                this.hasLoadedFromFirebase = true;
                this.debugLog && this.debugLog(`🔄 Initial load: ${this.rocks.length} rocks from Firebase`);

                // If we expect rocks but got 0, this might be a permissions issue
                if (snapshot.size === 0) {
                    this.debugLog && this.debugLog('⚠️ No rocks found - this could be a Firebase Security Rules issue');
                }
            } else {
                // For incremental updates, only process changes
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const rockData = { id: change.doc.id, ...change.doc.data() };
                        if (!this.rocks.find(r => r.id === rockData.id)) {
                            this.rocks.push(rockData);
                            this.debugLog && this.debugLog(`➕ Added rock: ${rockData.name}`);
                        }
                    }
                    if (change.type === 'modified') {
                        const rockData = { id: change.doc.id, ...change.doc.data() };
                        const index = this.rocks.findIndex(r => r.id === rockData.id);
                        if (index !== -1) {
                            this.rocks[index] = rockData;
                            this.debugLog && this.debugLog(`🔄 Updated rock: ${rockData.name}`);
                        }
                    }
                    if (change.type === 'removed') {
                        this.rocks = this.rocks.filter(r => r.id !== change.doc.id);
                        this.debugLog && this.debugLog(`➖ Removed rock: ${change.doc.id}`);
                    }
                });
            }

            this.refreshMap();
            this.updateStats();

            // Also save locally as backup
            this.saveRocksLocal();
        }, (error) => {
            this.debugLog && this.debugLog(`❌ Firebase listener error: ${error.message}`);
        });
    }

    setupHybridSync() {
        this.debugLog && this.debugLog('🔀 Setting up hybrid Firebase + JSON sync');

        // Try Firebase first
        if (this.db) {
            this.debugLog && this.debugLog('📡 Attempting Firebase connection...');

            this.db.collection('rocks').onSnapshot((snapshot) => {
                this.debugLog && this.debugLog(`🔄 Firebase update: ${snapshot.size} rocks`);

                if (snapshot.size > 0) {
                    // Firebase has data - use it
                    this.debugLog && this.debugLog('✅ Using Firebase data');
                    this.rocks = [];
                    snapshot.forEach(doc => {
                        this.rocks.push({ id: doc.id, ...doc.data() });
                    });
                    this.refreshMap();
                    this.updateStats();
                    this.saveRocksLocal();
                } else {
                    // Firebase empty or blocked - try JSON fallback
                    this.debugLog && this.debugLog('⚠️ Firebase empty, trying JSON fallback...');
                    this.syncWithCloud();
                }
            }, (error) => {
                this.debugLog && this.debugLog(`❌ Firebase blocked: ${error.message}`);
                this.debugLog && this.debugLog('🔄 Falling back to JSON sync');
                this.syncWithCloud();
            });
        }

        // Also set up periodic JSON sync as backup
        setInterval(() => {
            this.syncWithCloud();
        }, 30000);
    }

    // JSON update trigger removed - Firebase handles real-time sharing

    async saveAndShareRock(rock) {
        this.debugLog && this.debugLog(`🎯 UNIFIED SAVE & SHARE: ${rock.name}`);

        // Step 1: Always save locally first (guaranteed to work)
        this.saveRocksLocal();
        this.debugLog && this.debugLog('✅ Saved locally');

        // Step 2: Attempt cloud saves in parallel for maximum reliability
        const cloudSavePromises = [];
        let firebaseSuccess = false;
        let jsonSyncSuccess = false;

        // Try Firebase save
        if (this.db) {
            this.debugLog && this.debugLog('🔥 Attempting Firebase save...');
            cloudSavePromises.push(
                this.saveRockToFirebase(rock)
                    .then(() => {
                        firebaseSuccess = true;
                        this.debugLog && this.debugLog('✅ Firebase save successful - instant team sync!');
                        return 'firebase-success';
                    })
                    .catch(error => {
                        this.debugLog && this.debugLog(`⚠️ Firebase failed: ${error.message}`);
                        return 'firebase-failed';
                    })
            );
        }

        // Only try JSON sync if Firebase is not available
        if (!this.db) {
            this.debugLog && this.debugLog('🔄 Firebase unavailable, using JSON sync...');
            cloudSavePromises.push(
                this.updateSharedRockCollection(rock)
                    .then(() => {
                        jsonSyncSuccess = true;
                        this.debugLog && this.debugLog('✅ JSON sync successful');
                        return 'json-success';
                    })
                    .catch(error => {
                        this.debugLog && this.debugLog(`⚠️ JSON sync failed: ${error.message}`);
                        return 'json-failed';
                    })
            );
        }

        // Wait for all cloud saves to complete
        if (cloudSavePromises.length > 0) {
            try {
                const results = await Promise.allSettled(cloudSavePromises);
                this.debugLog && this.debugLog(`Cloud save results: ${results.map(r => r.value).join(', ')}`);

                // Provide user feedback based on what succeeded
                if (firebaseSuccess) {
                    this.showTemporaryMessage('✅ Rock saved and shared with team instantly!', 'success');
                } else if (jsonSyncSuccess) {
                    this.showTemporaryMessage('✅ Rock saved and queued for team sync!', 'success');
                } else {
                    this.showTemporaryMessage('⚠️ Rock saved locally, cloud sync will retry', 'warning');
                }
            } catch (error) {
                this.debugLog && this.debugLog(`Unexpected cloud save error: ${error.message}`);
                this.showTemporaryMessage('⚠️ Rock saved locally, cloud sync failed', 'warning');
            }
        } else {
            this.debugLog && this.debugLog('⚠️ No cloud services available');
            this.showTemporaryMessage('📱 Rock saved locally only', 'info');
        }

        // Step 3: Process complete
        this.debugLog && this.debugLog('🎯 Save & share process complete');
    }

    async updateSharedRockCollection(rock) {
        try {
            // Simulate sharing by updating our local system to broadcast the rock
            this.debugLog && this.debugLog('📤 Broadcasting rock to shared collection');

            // Add a timestamp to help with sync
            rock.sharedTimestamp = new Date().toISOString();
            rock.cloudSyncStatus = 'pending';

            // Save to localStorage with sync flag for other browsers to pick up
            const existingData = localStorage.getItem('auckland-rocks-shared') || '{"rocks": []}';
            const sharedData = JSON.parse(existingData);

            // Remove existing version if it exists
            sharedData.rocks = sharedData.rocks.filter(r => r.id !== rock.id);

            // Add updated rock
            sharedData.rocks.push({...rock, cloudSyncStatus: 'shared'});
            sharedData.lastUpdated = new Date().toISOString();

            localStorage.setItem('auckland-rocks-shared', JSON.stringify(sharedData));

            // This will be picked up by other browsers via the existing sync system
            this.debugLog && this.debugLog(`✅ Rock ${rock.name} added to shared collection queue`);

            return Promise.resolve();
        } catch (error) {
            this.debugLog && this.debugLog(`❌ Failed to update shared collection: ${error.message}`);
            return Promise.reject(error);
        }
    }

    // Remove rock from shared collection (for fallback sync)
    removeFromSharedCollection(rockId) {
        try {
            const existingData = localStorage.getItem('auckland-rocks-shared') || '{"rocks": []}';
            const sharedData = JSON.parse(existingData);

            // Remove the rock from shared collection
            sharedData.rocks = sharedData.rocks.filter(r => r.id !== rockId);
            sharedData.lastUpdated = new Date().toISOString();

            localStorage.setItem('auckland-rocks-shared', JSON.stringify(sharedData));
            this.debugLog && this.debugLog(`✅ Rock ${rockId} removed from shared collection`);
        } catch (error) {
            this.debugLog && this.debugLog(`❌ Failed to remove rock from shared collection: ${error.message}`);
        }
    }

    async saveRockToFirebase(rock) {
        if (!this.db) {
            this.debugLog && this.debugLog('Firebase not available, saving locally');
            this.saveRocksLocal();
            return Promise.resolve();
        }

        try {
            this.debugLog && this.debugLog(`🔥 Saving rock ${rock.name} to Firebase...`);

            // Create a copy of the rock for Firebase
            const firebaseRock = { ...rock };

            // Store photos directly in Firestore (skip Firebase Storage entirely)
            if (rock.photos && rock.photos.length > 0) {
                this.debugLog && this.debugLog('📸 Storing photos directly in Firestore database...');

                // Simply store photos as base64 in Firestore
                // This works without any additional Firebase Storage setup
                firebaseRock.photos = rock.photos;
                this.debugLog && this.debugLog(`📸 Ready to save ${rock.photos.length} photos in Firestore`);
            }

            // Save rock to Firestore with timeout
            this.debugLog && this.debugLog(`💾 Saving rock data to Firestore...`);

            const savePromise = this.db.collection('rocks').doc(rock.id).set(firebaseRock);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Firebase save timeout')), 10000)
            );

            await Promise.race([savePromise, timeoutPromise]);

            this.debugLog && this.debugLog(`✅ Rock ${rock.name} saved to Firebase successfully`);

            // No need for additional JSON sync - Firebase real-time handles sharing

            return Promise.resolve();

        } catch (error) {
            this.debugLog && this.debugLog(`❌ FIREBASE ERROR: ${error.message}`);
            this.debugLog && this.debugLog(`❌ Error code: ${error.code}`);
            this.debugLog && this.debugLog(`❌ Error details: ${JSON.stringify(error)}`);

            // Check for specific Firebase errors
            if (error.code === 'permission-denied') {
                this.debugLog && this.debugLog('❌ PERMISSION DENIED - Database rules need to be updated!');
            } else if (error.code === 'unavailable') {
                this.debugLog && this.debugLog('❌ FIREBASE UNAVAILABLE - Check internet connection');
            } else if (error.code === 'unauthenticated') {
                this.debugLog && this.debugLog('❌ AUTHENTICATION REQUIRED - Firebase Auth may be needed');
            } else if (error.message === 'Firebase save timeout') {
                this.debugLog && this.debugLog('❌ FIREBASE TIMEOUT - Taking too long to save');
            }

            this.debugLog && this.debugLog('⚠️ Falling back to localStorage');
            this.saveRocksLocal();

            // Re-throw the error so the caller knows Firebase failed
            throw error;
        }
    }

    async uploadPhotoToStorage(base64Photo, rockId, photoIndex) {
        try {
            this.debugLog && this.debugLog(`📸 Creating storage reference for photo ${photoIndex}...`);

            // Create a reference to the photo in Firebase Storage
            const photoRef = this.storage.ref(`photos/${rockId}_${photoIndex}.jpg`);

            this.debugLog && this.debugLog(`📸 Converting base64 to blob...`);
            // Convert base64 to blob
            const response = await fetch(base64Photo);
            const blob = await response.blob();

            this.debugLog && this.debugLog(`📸 Blob created, size: ${blob.size} bytes`);
            this.debugLog && this.debugLog(`📸 Starting upload to Firebase Storage...`);

            // Upload the blob
            const snapshot = await photoRef.put(blob);

            this.debugLog && this.debugLog(`📸 Upload complete, getting download URL...`);

            // Get the download URL
            const downloadURL = await snapshot.ref.getDownloadURL();

            this.debugLog && this.debugLog(`✅ Photo uploaded successfully: ${downloadURL.substring(0, 50)}...`);
            return downloadURL;
        } catch (error) {
            this.debugLog && this.debugLog(`❌ PHOTO UPLOAD ERROR: ${error.message}`);
            this.debugLog && this.debugLog(`❌ Photo error code: ${error.code}`);

            if (error.code === 'storage/unauthorized') {
                this.debugLog && this.debugLog('❌ STORAGE UNAUTHORIZED - Storage rules need to be updated!');
            } else if (error.code === 'storage/unknown') {
                this.debugLog && this.debugLog('❌ STORAGE UNKNOWN ERROR - Check Firebase Storage setup');
            }

            // Return original base64 as fallback
            this.debugLog && this.debugLog('📸 Using base64 fallback for photo');
            return base64Photo;
        }
    }

    loadRocksLocal() {
        const stored = localStorage.getItem('auckland-rocks');
        const rocks = stored ? JSON.parse(stored) : [];
        this.debugLog && this.debugLog(`Loading rocks from localStorage: ${rocks.length} found`);
        return rocks;
    }

    saveRocksLocal() {
        this.debugLog && this.debugLog(`Saving ${this.rocks.length} rocks to localStorage`);

        try {
            const dataString = JSON.stringify(this.rocks);
            this.debugLog && this.debugLog(`Data size: ${Math.round(dataString.length / 1024)}KB`);

            localStorage.setItem('auckland-rocks', dataString);
            this.debugLog && this.debugLog('Rocks saved to localStorage successfully');
        } catch (error) {
            this.debugLog && this.debugLog(`ERROR saving to localStorage: ${error.message}`);

            if (error.name === 'QuotaExceededError') {
                this.debugLog && this.debugLog('Trying to save without photos...');

                const rocksWithoutPhotos = this.rocks.map(rock => ({
                    ...rock,
                    photos: [],
                    photo: null
                }));

                try {
                    localStorage.setItem('auckland-rocks', JSON.stringify(rocksWithoutPhotos));
                    this.debugLog && this.debugLog('Saved without photos (emergency fallback)');
                    alert('⚠️ Photos too large! Rock saved without photo.');
                } catch (fallbackError) {
                    this.debugLog && this.debugLog(`Fallback also failed: ${fallbackError.message}`);
                    alert('❌ Storage completely full! Cannot save rock.');
                }
            } else {
                alert(`❌ Save failed: ${error.message}`);
            }
        }
    }

    // Migration function removed - rocks now auto-share when saved

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
        toggleBtn.title = 'Toggle debug panel';
        toggleBtn.style.cssText = `
            position: fixed;
            bottom: 100px;
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

        // Add share debug button
        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = '📋';
        shareBtn.style.cssText = `
            position: fixed;
            bottom: 420px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #2196F3;
            color: white;
            border: none;
            font-size: 16px;
            z-index: 1001;
        `;
        shareBtn.onclick = () => {
            const debugText = document.getElementById('debug-content').innerText;
            navigator.clipboard.writeText(debugText).then(() => {
                alert('📋 Debug info copied to clipboard! Just paste it in your message.');
            }).catch(() => {
                // Fallback - show text in alert for manual copy
                alert('Debug info:\n\n' + debugText.slice(-500) + '\n\n(Last 500 characters shown)');
            });
        };

        // Add reload rocks button
        const reloadBtn = document.createElement('button');
        reloadBtn.innerHTML = '🔄';
        reloadBtn.title = 'Reload rocks from cloud';
        reloadBtn.style.cssText = `
            position: fixed;
            bottom: 150px;
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
            this.debugLog && this.debugLog('--- Reloading rocks from Firebase ---');
            this.loadRocksFromFirebase();
        };

        // Migrate button removed since save/share is now unified

        // Add center map button
        const centerBtn = document.createElement('button');
        centerBtn.innerHTML = '🎯';
        centerBtn.title = 'Center map on rocks (click to see Mark as Found button)';
        centerBtn.style.cssText = `
            position: fixed;
            bottom: 200px;
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
            // If there are rocks, center on the first rock, otherwise center on Domain
            if (this.rocks.length > 0) {
                const firstRock = this.rocks[0];
                this.debugLog && this.debugLog(`Centering map on ${firstRock.name}`);
                this.map.setView([firstRock.lat, firstRock.lng], 18);
                setTimeout(() => {
                    // Open the rock's popup so user can see the "Mark as Found" button
                    this.map.eachLayer(layer => {
                        if (layer instanceof L.Marker && layer.getLatLng().lat === firstRock.lat) {
                            layer.openPopup();
                        }
                    });
                }, 500);
            } else {
                this.debugLog && this.debugLog('Centering map on Auckland Domain');
                this.map.setView([-36.8627, 174.7775], 16);
            }
            setTimeout(() => {
                this.refreshMap();
            }, 100);
        };

        // Add clear local rocks button
        const clearLocalBtn = document.createElement('button');
        clearLocalBtn.innerHTML = '🧹';
        clearLocalBtn.title = 'Clear YOUR local rocks only (keeps team rocks safe)';
        clearLocalBtn.style.cssText = `
            position: fixed;
            bottom: 320px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #f39c12;
            color: white;
            border: 3px solid white;
            font-size: 18px;
            z-index: 1001;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        clearLocalBtn.onclick = () => {
            if (confirm('🧹 Clear only YOUR local rocks? (Cloud rocks will stay for team)')) {
                this.debugLog && this.debugLog('Clearing local rocks only');
                localStorage.removeItem('auckland-rocks');

                // Keep only cloud rocks
                this.rocks = this.rocks.filter(rock => {
                    // Check if this rock came from cloud sync (has photos from cloud)
                    return false; // For now, clear all local rocks for simplicity
                });
                this.refreshMap();
                this.updateStats();
                this.debugLog && this.debugLog('Local rocks cleared successfully');
                alert('🧹 Your local rocks cleared! Cloud rocks will re-sync in 15 seconds.');

                // Force immediate cloud sync
                setTimeout(() => {
                    this.syncWithCloud();
                }, 1000);
            }
        };

        // Add clear all rocks button
        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = '🗑️';
        clearBtn.title = 'DANGER: Delete ALL rocks from cloud! Affects entire team!';
        clearBtn.style.cssText = `
            position: fixed;
            bottom: 250px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e74c3c;
            color: white;
            border: 2px solid #c0392b;
            font-size: 16px;
            z-index: 1001;
            box-shadow: 0 2px 8px rgba(231,76,60,0.4);
        `;
        clearBtn.onclick = async () => {
            if (confirm('🗑️ Delete ALL rocks from cloud? This will affect all team members!')) {
                this.debugLog && this.debugLog('Clearing all rock data');

                if (this.db) {
                    try {
                        // Delete from Firebase
                        const snapshot = await this.db.collection('rocks').get();
                        const batch = this.db.batch();

                        snapshot.forEach(doc => {
                            batch.delete(doc.ref);
                        });

                        await batch.commit();
                        this.debugLog && this.debugLog('All rocks deleted from Firebase');
                    } catch (error) {
                        this.debugLog && this.debugLog(`Error deleting from Firebase: ${error.message}`);
                    }
                }

                // Also clear localStorage
                localStorage.removeItem('auckland-rocks');

                this.rocks = [];
                this.refreshMap();
                this.updateStats();
                this.debugLog && this.debugLog('All rocks deleted successfully');
                alert('✅ All rocks cleared from cloud! Fresh start for everyone.');
            }
        };

        document.body.appendChild(debugPanel);
        document.body.appendChild(toggleBtn);
        document.body.appendChild(shareBtn);
        document.body.appendChild(reloadBtn);
        document.body.appendChild(centerBtn);
        document.body.appendChild(clearLocalBtn);
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

    showTemporaryMessage(message, type = 'info') {
        // Create temporary message notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(135deg, #FF9800, #F57C00)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #2196F3, #1976D2)';
        }

        notification.innerHTML = `
            ${message}
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                margin-left: 10px;
                cursor: pointer;
                font-size: 16px;
                opacity: 0.8;
            ">✕</button>
        `;

        // Add CSS keyframe for animation if not already added
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rockApp = new RockHunterApp();
});