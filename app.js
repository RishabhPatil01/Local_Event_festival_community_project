// Your Web App's Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyACMajr_BPT2h91YkBs0DEn-S3-RlCm-A4",
  authDomain: "local-events-hub-7b3fd.firebaseapp.com",
  projectId: "local-events-hub-7b3fd",
  storageBucket: "local-events-hub-7b3fd.firebasestorage.app",
  messagingSenderId: "907435058599",
  appId: "1:907435058599:web:f9e114c1cd9ddfe6834282",
  measurementId: "G-PRERC2QD3Y"
};

// Initialize Firebase App, Firestore Database, and Auth
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Fallback images based on event categories
const DEFAULT_IMAGES = {
  Festival: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop',
  Community: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop',
  Music: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop',
  Food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop',
  Sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop',
  Cultural: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop',
  Other: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop'
};

/* ===================================================
   PUBLIC VIEW LOGIC (index.html)
   =================================================== */
function initPublicView() {
  const eventsList = document.getElementById('events-list');
  if (!eventsList) return;

  const searchInput = document.getElementById('search');
  const categorySelect = document.getElementById('category');
  const locationSelect = document.getElementById('location');
  const countBadge = document.getElementById('event-count');
  const noEventsBox = document.getElementById('no-events');

  let allEvents = [];

  // Helper to get saved user RSVPs from LocalStorage
  function getSavedRSVPs() {
    return JSON.parse(localStorage.getItem('rsvped_events') || '[]');
  }

  // Real-time Firestore Listener
  db.collection('events').orderBy('date', 'asc').onSnapshot((snapshot) => {
    allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    populateLocations(allEvents);
    renderEvents();
  }, (error) => {
    console.error("Firestore Read Error:", error);
  });

  function populateLocations(events) {
    if (!locationSelect) return;
    const locations = [...new Set(events.map(e => e.location).filter(Boolean))];
    const currentVal = locationSelect.value;
    locationSelect.innerHTML = '<option value="">All Locations</option>';
    locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc;
      opt.textContent = loc;
      locationSelect.appendChild(opt);
    });
    locationSelect.value = currentVal;
  }

  function renderEvents() {
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const cat = categorySelect ? categorySelect.value : '';
    const loc = locationSelect ? locationSelect.value : '';
    const savedRSVPs = getSavedRSVPs();

    const filtered = allEvents.filter(ev => {
      const matchesSearch = !query || 
        (ev.title && ev.title.toLowerCase().includes(query)) || 
        (ev.description && ev.description.toLowerCase().includes(query)) ||
        (ev.location && ev.location.toLowerCase().includes(query));
      
      const matchesCat = !cat || ev.category === cat;
      const matchesLoc = !loc || ev.location === loc;

      return matchesSearch && matchesCat && matchesLoc;
    });

    if (countBadge) countBadge.textContent = filtered.length;
    eventsList.innerHTML = '';

    if (filtered.length === 0) {
      if (noEventsBox) noEventsBox.classList.remove('hidden');
    } else {
      if (noEventsBox) noEventsBox.classList.add('hidden');
      filtered.forEach(ev => {
        const category = ev.category || 'Other';
        const imgUrl = (ev.imageUrl && ev.imageUrl.trim() !== '') ? ev.imageUrl : (DEFAULT_IMAGES[category] || DEFAULT_IMAGES.Other);
        
        // Check if user already clicked interested for this event
        const isRSVPed = savedRSVPs.includes(ev.id);

        // Generate Google Maps Search Link
        const mapUrl = ev.location 
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}` 
          : '#';

        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
          <div class="event-image-container">
            <img src="${imgUrl}" alt="${ev.title}" class="event-image" onerror="this.src='${DEFAULT_IMAGES.Other}'">
            <span class="event-tag tag-${category.toLowerCase()}">${category}</span>
          </div>
          <div class="event-card-body">
            <h4 class="event-title">${ev.title}</h4>
            <div class="event-info">
              <div>🗓️ ${ev.date || 'TBA'} ${ev.time ? '· ' + ev.time : ''}</div>
              <div>
                📍 ${ev.location ? `<a href="${mapUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-weight: 600; text-decoration: underline;">${ev.location} ↗</a>` : 'Location details inside'}
              </div>
            </div>
            <p class="event-desc">${ev.description || 'No additional details provided.'}</p>
            <button 
              id="rsvp-btn-${ev.id}" 
              class="btn ${isRSVPed ? 'btn-success' : 'btn-secondary'}" 
              ${isRSVPed ? 'disabled' : ''} 
              onclick="incrementRSVP('${ev.id}', ${ev.rsvpCount || 0})" 
              style="width: 100%; margin-top: auto;"
            >
              ${isRSVPed ? 'Interested ✓' : '⭐ Interested'} (${ev.rsvpCount || 0})
            </button>
          </div>
        `;
        eventsList.appendChild(card);
      });
    }
  }

  // RSVP Counter Function (Limited to 1 click per user)
  window.incrementRSVP = function(id, currentCount) {
    const savedRSVPs = getSavedRSVPs();
    if (savedRSVPs.includes(id)) return;

    savedRSVPs.push(id);
    localStorage.setItem('rsvped_events', JSON.stringify(savedRSVPs));

    const btn = document.getElementById(`rsvp-btn-${id}`);
    if (btn) {
      btn.disabled = true;
      btn.className = 'btn btn-success';
      btn.innerHTML = `Interested ✓ (${currentCount + 1})`;
    }

    db.collection('events').doc(id).update({
      rsvpCount: firebase.firestore.FieldValue.increment(1)
    }).catch(err => console.error("Error updating RSVP:", err));
  };

  [searchInput, categorySelect, locationSelect].forEach(el => {
    if (el) el.addEventListener('input', renderEvents);
  });
}

/* ===================================================
   ADMIN VIEW LOGIC (admin.html)
   =================================================== */
function initAdmin() {
  const loginSection = document.getElementById('login-section');
  const adminContent = document.getElementById('admin-content');
  if (!loginSection || !adminContent) return;

  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('admin-email');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const addForm = document.getElementById('add-event-form');
  const formSuccess = document.getElementById('form-success');

  // Monitor Authentication State
  auth.onAuthStateChanged((user) => {
    if (user) {
      loginSection.classList.add('hidden');
      adminContent.classList.remove('hidden');
      loadAdminList();
    } else {
      loginSection.classList.remove('hidden');
      adminContent.classList.add('hidden');
    }
  });

  // Handle Admin Login
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');

    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
      .catch((err) => {
        loginError.textContent = err.message || 'Failed to sign in. Check email and password.';
        loginError.classList.remove('hidden');
      });
  });

  // Handle Sign Out
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => auth.signOut());
  }

  // Add Event
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newEvent = {
      title: document.getElementById('title').value.trim(),
      category: document.getElementById('category').value,
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      location: document.getElementById('location').value.trim(),
      imageUrl: document.getElementById('image-url').value.trim(),
      description: document.getElementById('description').value.trim(),
      rsvpCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('events').add(newEvent)
      .then(() => {
        addForm.reset();
        if (formSuccess) {
          formSuccess.classList.remove('hidden');
          setTimeout(() => formSuccess.classList.add('hidden'), 3000);
        }
      })
      .catch((err) => {
        alert("Error adding event: " + err.message);
      });
  });

  function loadAdminList() {
    db.collection('events').orderBy('date', 'asc').onSnapshot((snapshot) => {
      const list = document.getElementById('admin-events-list');
      if (!list) return;
      list.innerHTML = '';

      if (snapshot.empty) {
        list.innerHTML = '<p class="hint-text">No events created yet.</p>';
        return;
      }

      snapshot.forEach(doc => {
        const ev = doc.data();
        const item = document.createElement('div');
        item.className = 'admin-event-item';
        item.innerHTML = `
          <div class="admin-event-info">
            <strong>${ev.title}</strong>
            <span>📍 ${ev.location} · 📅 ${ev.date} · ⭐ ${ev.rsvpCount || 0} interested</span>
          </div>
          <button class="btn btn-danger" onclick="deleteEvent('${doc.id}')">Delete</button>
        `;
        list.appendChild(item);
      });
    });
  }

  window.deleteEvent = function(id) {
    if (confirm('Are you sure you want to delete this event?')) {
      db.collection('events').doc(id).delete()
        .catch(err => alert("Failed to delete: " + err.message));
    }
  };
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initPublicView();
  initAdmin();
});