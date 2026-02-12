// auth-module.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCibZPg1QZKtY7g3FHrl5AeZoSFI3xeid0",
    authDomain: "requests-ffdd6.firebaseapp.com",
    projectId: "requests-ffdd6",
    storageBucket: "requests-ffdd6.firebasestorage.app",
    messagingSenderId: "316405880275",
    appId: "1:316405880275:web:f4b271583e903ac639cb26"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper functions
function updateElement(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

function updateElements(selector, text) {
    document.querySelectorAll(selector).forEach(element => {
        element.textContent = text;
    });
}

// ✅ Role-based dashboard navigation
window.goToDashboard = function() {
    const role = sessionStorage.getItem('userRole');
    
    console.log('🚀 Dashboard clicked - Role:', role);
    
    if (!role) {
        console.warn('⚠️ No role found, redirecting to default');
        window.location.href = 'all-requests-d.html';
        return;
    }
    
    const roleLower = role.toLowerCase();
    
    if (roleLower === 'director') {
        console.log('👑 Redirecting to Director Dashboard');
        window.location.href = 'director-dashboard.html';
    } else if (roleLower === 'admin') {
        console.log('🛠️ Redirecting to Admin Dashboard');
        window.location.href = 'admin-dashboard.html';
    } else {
        console.log('📝 Redirecting to Default Dashboard');
        window.location.href = 'all-requests-d.html';
    }
};

// ✅ Setup user data real-time listener
function setupUserDataListener(userEmail) {
    const userDocRef = doc(db, "Users", userEmail);

    return onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            const userName = userData.name || 'User';
            const userEmail = userData.email || auth.currentUser?.email || '';
            const userRole = userData.role || 'User';

            console.log('📝 User data updated:', { userName, userEmail, userRole });

            // Update dropdown header
            updateElement('adminName', userName);
            updateElement('adminEmail', userEmail);
            updateElement('userRole', userRole);

            // Update all user name displays
            updateElements('.user-name-display', userName);
            updateElements('.dropdown-user-name', userName);
            updateElements('.user-email-display', userEmail);

            // Update session storage
            sessionStorage.setItem('userName', userName);
            sessionStorage.setItem('userEmail', userEmail);
            sessionStorage.setItem('userRole', userRole);
        }
    }, (error) => {
        console.error('Error listening to user data:', error);
    });
}

// ✅ FASTER Protected page authentication
export function protectPage() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Checking authentication...');

        // ✅ IMMEDIATELY show cached data from sessionStorage
        const cachedEmail = sessionStorage.getItem('userEmail');
        const cachedName = sessionStorage.getItem('userName');
        const cachedRole = sessionStorage.getItem('userRole');
        const isAuthenticated = sessionStorage.getItem('isAuthenticated');

        // ✅ Update UI immediately with cached data (no waiting!)
        if (cachedName) updateElement('adminName', cachedName);
        if (cachedEmail) updateElement('adminEmail', cachedEmail);
        if (cachedRole) updateElement('userRole', cachedRole);

        // Check if authenticated
        if (isAuthenticated !== 'true' || !cachedEmail) {
            console.log('❌ Not authenticated - redirecting to login');
            sessionStorage.clear();
            localStorage.clear();
            window.location.replace('login.html');
            reject(new Error('Not authenticated'));
            return;
        }

        // ✅ Verify with Firebase Auth (but don't block the page)
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('✅ Authenticated as:', user.email);

                // ✅ Setup real-time listener (for future updates only)
                setupUserDataListener(user.email);

                resolve({ user, auth, db });
            } else {
                console.log('❌ Firebase auth failed - redirecting to login');
                sessionStorage.clear();
                localStorage.clear();
                window.location.replace('login.html');
                reject(new Error('Not authenticated'));
            }
        });
    });
}

// Global logout function
export async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            console.log('🚪 Logging out...');
            sessionStorage.clear();
            localStorage.clear();
            await signOut(auth);
            console.log('✅ Logged out successfully');
            window.location.replace('login.html');
        } catch (error) {
            console.error('Logout error:', error);
            sessionStorage.clear();
            localStorage.clear();
            window.location.replace('login.html');
        }
    }
}

// Export auth and db
export { auth, db };