// player/static/player/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");

    // --- Constants & Variables ---
    // The Django backend URL for the search API
    const DJANGO_SEARCH_API_URL = '/api/search/'; // Matches player/urls.py

    let currentTrack = null; // { card: element, playButton: element, data: object }
    let currentAudioPreviewUrl = null;
    let isPlaying = false;
    let lastVolume = 0.7; // Keep track of volume before mute

    // --- DOM Elements ---
    const searchInput = document.getElementById('searchInput');
    const searchResultsGrid = document.getElementById('search-results-grid');
    const searchResultsHeader = document.getElementById('search-results-header');
    const heroSection = document.getElementById('hero-section');
    const recentlyPlayedSection = document.getElementById('recently-played-section');
    const madeForYouSection = document.getElementById('made-for-you-section');
    const musicGridContainer = document.getElementById('music-grid-container'); // Parent for observing additions

    const audioPlayer = document.getElementById('audioPlayer');
    const mainPlayPauseBtn = document.getElementById('main-play-pause-btn');
    const mainPlayPauseIcon = mainPlayPauseBtn.querySelector('i');
    const playerCover = document.getElementById('player-cover');
    const playerTitle = document.getElementById('player-title');
    const playerArtist = document.getElementById('player-artist');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const progressBar = document.getElementById('progress-bar');
    const progress = document.getElementById('progress');
    const volumeBar = document.getElementById('volume-bar');
    const volumeProgress = document.getElementById('volume-progress');
    const volumeIcon = document.getElementById('volume-icon');
    const playerHeartIcon = document.querySelector('.now-playing-bar .heart-icon');

    // --- API Function (Calls Django Backend) ---
    async function searchDeezer(query) {
        const url = `${DJANGO_SEARCH_API_URL}?q=${encodeURIComponent(query)}`;
        console.log("Frontend Request URL:", url);

        try {
            const response = await fetch(url);
            console.log("Internal API Response Status:", response.status);

            if (!response.ok) {
                let errorData = { error: `Server returned status ${response.status}` };
                try {
                    errorData = await response.json(); // Try parsing error details
                } catch (e) { console.warn("Could not parse error response as JSON."); }
                console.error(`Internal API Error! Status: ${response.status}`, errorData);
                alert(`Search failed: ${errorData.error || 'Unknown server error'}`);
                return null;
            }

            const result = await response.json();
            console.log("Internal API Response Data:", result);

            // Expect Django view to return { data: [...] } or { error: '...' }
            if (result && Array.isArray(result.data)) {
                return result.data; // Success, return the tracks array
            } else if (result && result.error) {
                console.error("Server returned an error message:", result.error);
                alert(`Search error from server: ${result.error}`);
                return null;
            } else {
                console.warn("Internal API response format unexpected or no data found:", result);
                alert("Received unexpected data format from server.");
                return [];
            }
        } catch (error) {
            console.error('Network error during internal API call:', error);
            alert('Network error connecting to the search service. Please check your connection or if the server is running.');
            return null;
        }
    }

    // --- UI Update Functions ---
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function updatePlayerUI(trackData) {
        console.log("Updating player UI with track:", trackData);
        if (!trackData || !trackData.title_short || !trackData.artist?.name) {
            console.log("Resetting player UI to default.");
            playerCover.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
            playerCover.alt = 'Album cover';
            playerTitle.textContent = 'No song selected';
            playerArtist.textContent = '...';
            currentTimeEl.textContent = '0:00';
            durationEl.textContent = '0:00';
            progress.style.width = '0%';
            updatePlayPauseButton(false);
            playerHeartIcon.classList.remove('liked');
            playerHeartIcon.title = "Save to Your Library";
            currentAudioPreviewUrl = null;
            return;
        }

        const coverUrl = trackData.album?.cover_medium || trackData.album?.cover_small || trackData.album?.cover || '';
        console.log("Setting player cover to:", coverUrl);
        playerCover.src = coverUrl || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        playerCover.onerror = () => {
            console.warn("Failed to load player cover image:", coverUrl);
            playerCover.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
            playerCover.onerror = null;
        };
        playerCover.alt = `${trackData.title_short} Cover`;
        playerTitle.textContent = trackData.title_short;
        playerArtist.textContent = trackData.artist.name;

        const audioDuration = audioPlayer.duration;
        const trackDuration = trackData.duration || 30; // Default preview length is 30s
        console.log(`Audio duration: ${audioDuration}, Track duration data: ${trackDuration}`);

        // Use actual audio duration if available and valid, otherwise fallback
        if (audioDuration && isFinite(audioDuration) && audioDuration > 0) {
            durationEl.textContent = formatTime(audioDuration);
        } else {
             // Use track data duration (often 30s for Deezer previews) or default
            durationEl.textContent = formatTime(trackDuration);
        }

        currentAudioPreviewUrl = trackData.preview;
        playerHeartIcon.classList.remove('liked'); // Reset like status on new track
        playerHeartIcon.title = "Save to Your Library";
        console.log("Player UI updated.");
    }

    function updatePlayPauseButton(playing) {
        console.log(`Updating play/pause button state to: ${playing ? 'Playing' : 'Paused'}`);
        isPlaying = playing;
        if (playing) {
            mainPlayPauseIcon.classList.replace('fa-play', 'fa-pause');
            mainPlayPauseBtn.title = "Pause";
            // Update the specific card's button that is playing
            if (currentTrack?.card && currentTrack?.playButton) {
                currentTrack.card.classList.add('playing');
                currentTrack.playButton.classList.add('playing');
                currentTrack.playButton.title = "Pause Preview";
            }
        } else {
            mainPlayPauseIcon.classList.replace('fa-pause', 'fa-play');
            mainPlayPauseBtn.title = "Play";
            // Clear playing state from *all* cards when pausing globally
            document.querySelectorAll('.music-card.playing').forEach(card => card.classList.remove('playing'));
            document.querySelectorAll('.play-button.playing').forEach(btn => {
                btn.classList.remove('playing');
                btn.title = "Play Preview";
                // Ensure the icon is reset to play if it was the one being paused
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-play'; // Reset icon directly
            });
        }
    }

    function displayResults(tracks) {
        console.log("Displaying search results:", tracks);
        if (heroSection) heroSection.style.display = 'none';
        if (recentlyPlayedSection) recentlyPlayedSection.style.display = 'none';
        if (madeForYouSection) madeForYouSection.style.display = 'none';

        searchResultsHeader.style.display = 'flex';
        searchResultsGrid.style.display = 'grid';
        searchResultsGrid.innerHTML = ''; // Clear previous results or messages

        if (!tracks || tracks.length === 0) {
            console.log("No search results to display.");
            searchResultsGrid.innerHTML = '<p class="grid-message">No results found.</p>';
            return;
        }

        tracks.forEach(track => {
            const title = track?.title_short || track?.title;
            const artistName = track?.artist?.name;
            const coverUrl = track?.album?.cover_medium || track?.album?.cover_small || track?.album?.cover;
            const previewUrl = track?.preview;

            // Only render card if essential playback data is present
            if (!title || !artistName || !coverUrl || !previewUrl) {
                console.warn("Skipping search result due to missing essential data (title, artist, cover, or preview):", track);
                return; // Skip this track
            }

            const card = document.createElement('div');
            card.className = 'music-card';
            // Store essential data directly on the element for easy access
            card.dataset.trackId = track.id;
            // Store the full track data as JSON string - useful for updatePlayerUI
            card.dataset.trackData = JSON.stringify(track);
            card.dataset.previewUrl = previewUrl; // Store preview URL separately

            card.innerHTML = `
                <img src="${coverUrl}" alt="${title} Cover" class="music-cover" loading="lazy" onerror="this.onerror=null; this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';">
                <h3 class="music-title">${title}</h3>
                <p class="music-artist">${artistName}</p>
                <button class="play-button" title="Play Preview">
                    <i class="fas fa-play"></i>
                </button>
            `;

            attachListenersToCard(card); // Pass the card element itself
            searchResultsGrid.appendChild(card);
        });
        console.log("Finished displaying search results.");
    }

    // Generalized function to attach listeners to a card element
    function attachListenersToCard(cardElement) {
        const playButton = cardElement.querySelector('.play-button');
        const previewUrl = cardElement.dataset.previewUrl;
        let trackData = null;

        try {
            // Parse the track data stored on the element
            trackData = JSON.parse(cardElement.dataset.trackData);
        } catch (e) {
            console.error("Error parsing track data for card:", cardElement, e);
            if (playButton) {
                playButton.disabled = true;
                playButton.title = "Error loading data";
            }
            cardElement.style.cursor = 'default';
            return; // Don't attach listeners if data is bad
        }

        if (!playButton) {
            console.warn("Could not find play button for card:", cardElement);
            return;
        }

        // Check if playable (has preview URL and essential parsed data)
        if (previewUrl && trackData?.title_short && trackData?.artist?.name) {
            playButton.disabled = false;
            playButton.title = "Play Preview";
            cardElement.style.cursor = 'pointer';

            playButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click event from firing simultaneously
                console.log("Play button clicked", trackData);
                handlePlayButtonClick(cardElement, playButton, trackData);
            });

            // Add listener to the whole card for easier clicking
            cardElement.addEventListener('click', () => {
                console.log("Card clicked", trackData);
                // Simulate play button click
                handlePlayButtonClick(cardElement, playButton, trackData);
            });

        } else {
            // Handle non-playable item
            console.log("Disabling play button for item without preview or full data:", trackData?.title_short || 'Unknown');
            playButton.disabled = true;
            playButton.title = "Preview not available";
            cardElement.style.cursor = 'default';
            // No event listeners needed for non-playable card
        }
    }

    function handlePlayButtonClick(cardElement, buttonElement, trackData) {
        console.log("Handling play button click for:", trackData.title_short);
        const previewUrl = trackData.preview; // Get preview URL from parsed data

        if (!previewUrl) {
            console.warn("No preview URL available for:", trackData.title_short);
            alert('No preview available for this track.');
            return;
        }
        console.log("Preview URL:", previewUrl);

        // If clicking the same track that's currently playing
        if (currentTrack?.card === cardElement && isPlaying) {
            console.log("Pausing current track");
            audioPlayer.pause();
        }
        // If clicking the same track that's paused AND it's the loaded source
        else if (currentTrack?.card === cardElement && !isPlaying && audioPlayer.currentSrc === previewUrl) {
             console.log("Resuming current track");
             audioPlayer.play().catch(e => console.error("Error resuming playback:", e));
        }
        // If clicking a new track, or the same card but audio src is different/unset
        else {
            console.log("Playing new track:", trackData.title_short);
            if (isPlaying) {
                console.log("Pausing previous track before playing new one");
                audioPlayer.pause(); // Pause first if something else is playing
            }

            // Update the current track reference *before* updating UI/audio
            currentTrack = { card: cardElement, playButton: buttonElement, data: trackData };
            currentAudioPreviewUrl = previewUrl;

            updatePlayerUI(trackData); // Update player bar info

            console.log("Setting audio source to:", previewUrl);
            audioPlayer.src = previewUrl;
            audioPlayer.load(); // Important: reset audio element state for new source

            // Attempt to play
            const playPromise = audioPlayer.play();

            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    console.log("Playback started successfully for:", trackData.title_short);
                    // UI update (buttons, card state) happens via 'play' event listener
                }).catch(error => {
                    console.error("Error starting playback for:", trackData.title_short, error);
                    let userMessage = `Could not play "${trackData.title_short}".`;
                    if (error.name === 'NotAllowedError') {
                        userMessage += ' Browser blocked autoplay. Try clicking the main play button.';
                    } else if (error.name === 'NotSupportedError') {
                        userMessage += ' The audio format might not be supported by your browser.';
                    } else {
                        userMessage += ' Check the console for details.';
                    }
                    alert(userMessage);
                    // Reset states if play fails immediately
                    updatePlayPauseButton(false);
                    // Consider resetting player UI if it failed completely
                    // updatePlayerUI(null);
                    // currentTrack = null;
                    // currentAudioPreviewUrl = null;
                });
            }
        }
    }

    // Function to attach listeners to initially present static cards
    function attachStaticCardListeners() {
        console.log("Attaching listeners to static cards...");
        document.querySelectorAll('#recently-played-grid .music-card, #made-for-you-grid .music-card').forEach(card => {
             // Static cards already have data attributes, so just call the general attach function
             attachListenersToCard(card);
        });
        console.log("Finished attaching static card listeners.");
    }


    // --- Event Listeners ---

    // Search Input Listener
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && searchInput.value.trim() !== '') {
                const query = searchInput.value.trim();
                console.log("Search initiated for:", query);

                // Show loading state in results grid
                searchResultsGrid.innerHTML = '<p class="grid-message">Searching...</p>';
                if (heroSection) heroSection.style.display = 'none';
                if (recentlyPlayedSection) recentlyPlayedSection.style.display = 'none';
                if (madeForYouSection) madeForYouSection.style.display = 'none';
                searchResultsHeader.style.display = 'flex';
                searchResultsGrid.style.display = 'grid'; // Ensure grid is visible

                searchDeezer(query).then(tracks => {
                    // displayResults handles empty/null tracks and attaching listeners
                    displayResults(tracks);
                }).catch(error => {
                    // Catch errors from the searchDeezer promise itself (though it tries to handle internally)
                    console.error("Error processing search results:", error);
                    searchResultsGrid.innerHTML = '<p class="grid-message">Error loading results. Please try again.</p>';
                });
            }
        });
         // Optional: Add listener for search icon click?
         const searchIcon = searchInput.previousElementSibling; // Get the <i> tag
         if (searchIcon && searchIcon.classList.contains('fa-search')) {
             searchIcon.addEventListener('click', () => {
                 if (searchInput.value.trim() !== '') {
                     // Simulate Enter key press
                     searchInput.dispatchEvent(new KeyboardEvent('keypress', { 'key': 'Enter' }));
                 }
             });
             searchIcon.style.cursor = 'pointer'; // Indicate clickable icon
         }
    }

    // Initial setup for static cards
    attachStaticCardListeners();

    // Audio Player Listeners
    audioPlayer.addEventListener('play', () => {
        console.log("Audio player event: play");
        updatePlayPauseButton(true);
    });

    audioPlayer.addEventListener('pause', () => {
        console.log("Audio player event: pause");
        updatePlayPauseButton(false);
    });

    audioPlayer.addEventListener('ended', () => {
        console.log("Audio player event: ended");
        updatePlayPauseButton(false);
        progress.style.width = '0%';
        currentTimeEl.textContent = formatTime(0);
        // Potential TODO: Implement next track logic here
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        console.log("Audio player event: loadedmetadata - Duration:", audioPlayer.duration);
        if (isFinite(audioPlayer.duration) && audioPlayer.duration > 0) {
            durationEl.textContent = formatTime(audioPlayer.duration);
        } else {
            // Fallback if duration is invalid (common with streams or errors)
            // Use the duration from track data if available (usually 30s for previews)
            durationEl.textContent = formatTime(currentTrack?.data?.duration || 30);
            console.warn("loadedmetadata: Invalid or zero duration from audio element, using track data fallback.");
        }
        // Reset time/progress on new metadata load
        currentTimeEl.textContent = formatTime(0);
        progress.style.width = '0%';
    });

    audioPlayer.addEventListener('timeupdate', () => {
        // Update progress only if duration is valid and positive
        if (audioPlayer.duration && isFinite(audioPlayer.duration) && audioPlayer.duration > 0 && audioPlayer.currentTime >= 0) {
            const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progress.style.width = `${percentage}%`;
            currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        } else {
             // Handle cases where duration might be 0 or invalid temporarily
             // Avoid division by zero or NaN percentages
             progress.style.width = '0%';
             currentTimeEl.textContent = formatTime(0);
        }
    });

    audioPlayer.addEventListener('error', (e) => {
        console.error("Audio Player Error Event:", audioPlayer.error, e);
        let errorMsg = "An error occurred playing the audio.";
        if (audioPlayer.error) {
            switch (audioPlayer.error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMsg = 'Playback aborted.'; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMsg = 'Network error loading audio.'; break;
                case MediaError.MEDIA_ERR_DECODE: errorMsg = 'Audio decoding error (file might be corrupt/unsupported).'; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = 'Audio format not supported by your browser.'; break;
                default: errorMsg = `An unknown audio error occurred (Code: ${audioPlayer.error.code}).`;
            }
        }
        alert(errorMsg);
        updatePlayPauseButton(false); // Ensure UI reflects stopped state
        // Reset player only if the error occurred for the currently intended track
        if (currentAudioPreviewUrl && audioPlayer.src === currentAudioPreviewUrl) {
            updatePlayerUI(null); // Clear player bar info
            currentTrack = null;
            currentAudioPreviewUrl = null;
        }
    });

     // Add 'waiting' and 'stalled' listeners for better debugging of playback issues
     audioPlayer.addEventListener('waiting', () => console.log("Audio player event: waiting (buffering)"));
     audioPlayer.addEventListener('stalled', () => console.log("Audio player event: stalled (browser trying to fetch data, but not receiving)"));
     audioPlayer.addEventListener('canplay', () => console.log("Audio player event: canplay (enough data to start playing)"));

    // Main Play/Pause Button Listener (Player Bar)
    mainPlayPauseBtn.addEventListener('click', () => {
        console.log("Main play/pause button clicked.");
        // Check if there's a track selected (currentTrack exists)
        if (currentAudioPreviewUrl && audioPlayer.currentSrc === currentAudioPreviewUrl) {
            if (audioPlayer.paused) {
                console.log("Main button: Resuming current track.");
                audioPlayer.play().catch(e => {
                    console.error("Main play button: Error resuming audio:", e);
                    alert("Could not resume the track.");
                });
            } else {
                console.log("Main button: Pausing current track.");
                audioPlayer.pause();
            }
        } else if (currentAudioPreviewUrl) {
            // A track is selected, but not loaded or source mismatch
             console.log("Main button: Loading and playing selected track.");
             // Ensure src is set correctly and try playing
             if (audioPlayer.src !== currentAudioPreviewUrl) {
                 audioPlayer.src = currentAudioPreviewUrl;
                 audioPlayer.load();
             }
             audioPlayer.play().catch(e => {
                    console.error("Main play button: Error playing potentially unloaded audio:", e);
                    alert("Could not play the selected track.");
             });
        } else {
            console.log("Main play/pause button: No track loaded.");
            alert("Please select a track to play first.");
        }
    });

    // Progress Bar Interaction
    progressBar.addEventListener('click', function(e) {
        console.log("Progress bar clicked.");
        if (!audioPlayer.duration || !isFinite(audioPlayer.duration) || audioPlayer.duration <= 0 || !audioPlayer.seekable || audioPlayer.seekable.length === 0) {
            console.warn("Cannot seek: No duration, invalid duration, or not seekable.");
            return;
        }
        const rect = this.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const seekPercent = Math.max(0, Math.min(1, offsetX / this.offsetWidth));
        const seekTime = seekPercent * audioPlayer.duration;

        console.log(`Seeking to ${seekTime.toFixed(2)}s (${(seekPercent * 100).toFixed(1)}%)`);

        // Check seekable range (typically 0 to duration for static files/previews)
        try {
            const seekableStart = audioPlayer.seekable.start(0); // Usually 0
            const seekableEnd = audioPlayer.seekable.end(0);   // Usually duration
            if (seekTime >= seekableStart && seekTime <= seekableEnd) {
                audioPlayer.currentTime = seekTime;
                // Update UI immediately for responsiveness
                progress.style.width = `${seekPercent * 100}%`;
                currentTimeEl.textContent = formatTime(seekTime);
            } else {
                console.warn(`Seek time ${seekTime} is outside seekable range (${seekableStart} - ${seekableEnd})`);
                // Optionally clamp to seekable range if needed, but usually previews are fully seekable.
                // audioPlayer.currentTime = Math.max(seekableStart, Math.min(seekableEnd, seekTime));
            }
        } catch (err) {
            console.error("Error accessing seekable ranges, attempting seek anyway:", err);
            // Fallback: Try seeking anyway, browser might handle it
            audioPlayer.currentTime = seekTime;
            progress.style.width = `${seekPercent * 100}%`;
            currentTimeEl.textContent = formatTime(seekTime);
        }
    });

    // Function to set volume and update UI
    function setVolume(percent) {
        percent = Math.max(0, Math.min(1, percent)); // Clamp between 0 and 1
        console.log(`Setting volume to ${percent.toFixed(2)}`);
        audioPlayer.volume = percent;
        volumeProgress.style.width = `${percent * 100}%`;
        audioPlayer.muted = (percent === 0); // Mute if volume is set to 0

        // Update icon based on volume level and muted state
        if (audioPlayer.muted || percent === 0) {
            volumeIcon.className = 'fas fa-volume-mute volume-icon';
            volumeIcon.title = "Unmute";
        } else if (percent < 0.5) {
            volumeIcon.className = 'fas fa-volume-down volume-icon';
            volumeIcon.title = "Mute";
        } else {
            volumeIcon.className = 'fas fa-volume-up volume-icon';
            volumeIcon.title = "Mute";
        }
        // Store the last non-zero volume for unmuting
        if (percent > 0.001) { // Use a small threshold to avoid storing 0
            lastVolume = percent;
        }
    }

    // Volume Bar Interaction
    volumeBar.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, offsetX / this.offsetWidth));
        setVolume(percent);
    });

    // Volume Icon Click (Mute/Unmute)
    volumeIcon.addEventListener('click', function() {
        console.log("Volume icon clicked. Current volume:", audioPlayer.volume, "Muted:", audioPlayer.muted);
        if (audioPlayer.muted || audioPlayer.volume === 0) {
            // Unmute: restore to last known volume or a default
            console.log("Unmuting. Restoring volume to:", lastVolume);
            setVolume(lastVolume > 0.01 ? lastVolume : 0.7); // Restore or default if last was zero/tiny
        } else {
            // Mute: set volume to 0
            console.log("Muting.");
            setVolume(0);
        }
    });

    // Player Heart Icon Toggle
    playerHeartIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        if (currentTrack && currentTrack.data) {
            this.classList.toggle('liked');
            const isLiked = this.classList.contains('liked');
            this.title = isLiked ? "Remove from Your Library" : "Save to Your Library";
            console.log(`Track "${currentTrack.data.title_short}" ${isLiked ? 'liked' : 'unliked'}`);
            // TODO: Add API call to backend to save/remove like status
        } else {
            console.log("Cannot like/unlike: No track loaded in the player.");
            // Optional: Provide user feedback (e.g., subtle shake animation)
        }
    });

    // Set initial volume display based on the audio player's default volume
    setVolume(audioPlayer.volume);

    console.log("Initial script setup complete.");

});