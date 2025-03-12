import { auth, db } from "./firebase-config.js"; // ✅ Correct import
import { 
    onAuthStateChanged, 
    signOut, 
    signInWithEmailAndPassword, 
    setPersistence, 
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const userSection = document.getElementById("user-section");
    const adminPanel = document.getElementById("admin-panel"); // Admin Panel
    const loginForm = document.getElementById("login-form"); // Login Form

    if (!userSection) {
        console.error("❌ Element #user-section not found in HTML!");
        return;
    }

    try {
        // ✅ Set auth persistence so login state is remembered
        await setPersistence(auth, browserLocalPersistence);
        console.log("✅ Auth persistence enabled");
    } catch (error) {
        console.error("❌ Auth persistence error:", error.message);
    }

    // ✅ Function to update UI for logged-in users
    const updateUserProfile = (user) => {
        if (user) {
            userSection.innerHTML = `
                <p>Welcome, ${user.email}</p>
                <button id="logout-btn">Logout</button>
            `;

            document.getElementById("logout-btn").addEventListener("click", async () => {
                await signOut(auth);
                location.reload(); // Refresh UI after logout
            });

            // ✅ If Admin logs in, show Admin Panel
            if (user.email === "akshaya@gmail.com") {
                console.log("✅ Admin logged in!");
                adminPanel.style.display = "block"; // Show admin panel
                loadAdminFunctions(); // Load admin functions (ensure this function exists)
            } 
            
            // else {
            //     adminPanel.style.display = "none"; // Hide admin panel for non-admins
            // }


        } else {
            userSection.innerHTML = `<a href="login.html">Login</a>`;
            adminPanel.style.display = "none"; // Hide admin panel if not logged in
        }
    };

    // ✅ Detect authentication state changes
    onAuthStateChanged(auth, (user) => {
        console.log("🔄 Auth State Changed:", user);
        // updateUserProfile(user);

        if (user) {
            console.log("✅ User logged in:", user.email);
            
            if (user.email === "akshaya@gmail.com") {
                console.log("✅ Admin detected! Redirecting to Admin Page...");
                window.location.href = "admin/admin.html"; // ✅ Redirect to admin page
            } else {
                updateUserProfile(user); // ✅ Update UI for normal users
            }
        } else {
            console.log("❌ No user logged in");
            updateUserProfile(null);
        }
    });

  

    // ✅ Handle Login Form Submission
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault(); // Prevent page reload

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                console.log("✅ User logged in:", email);
                window.location.href = "index.html"; // Redirect after successful login
            } catch (error) {
                console.error("❌ Login failed:", error.message);
                alert("Login failed: " + error.message);
            }
        });
    }
});


export {auth};