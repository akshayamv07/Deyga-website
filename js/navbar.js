import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const userSection = document.getElementById("user-section"); 
const userInfo = document.getElementById("user-info");

const updateUserProfile = async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : { name: "Customer", email: user.email };

        userSection.innerHTML = `
            <div class="user-profile">
                <img src="images/user.png" alt="User" class="profile-img">
                <span>${userData.name}</span>
                <button id="logout-btn">Logout</button>
            </div>
        `;

        userInfo.innerHTML = `<p>Welcome, ${userData.name} (${userData.email})</p>`;

        document.getElementById("logout-btn").addEventListener("click", async () => {
            await signOut(auth);
            location.reload();
        });
    } else {
        userSection.innerHTML = `<a href="login.html" id="login-link">Login</a>`;
        userInfo.innerHTML = "";
    }
};

// Check login status on page load
onAuthStateChanged(auth, (user) => {
    updateUserProfile(user);
});
