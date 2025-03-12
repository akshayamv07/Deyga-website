import { auth } from "./auth.js";
import { db, doc, setDoc, serverTimestamp } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
 
document.getElementById("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
 
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const name = document.getElementById("name").value.trim();
    const phoneNumber = document.getElementById("phoneNumber").value.trim();
 
    if (!email || !password || !name || !phoneNumber) {
        alert("⚠️ Please fill all fields!");
        return;
    }
 
    try {
        // ✅ Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("✅ User registered:", user.email);
 
        // ✅ Generate Customer ID (Random 6-digit number)
        const customerId = Math.floor(100000 + Math.random() * 900000);
 
        // ✅ Store User Data in Firestore using email as document ID
        const userRef = doc(db, "users", email); // Use email as document ID
        await setDoc(userRef, {
            userId: user.uid,
            email: email,
            name: name,
            phoneNumber: phoneNumber,
            credits: 0, // Initial credits set to 0
            customerId: customerId, // Randomly generated customer ID
            timestamp: serverTimestamp()
        });
 
        alert("🎉 Registration successful! You can now log in.");
        window.location.href = "login.html"; // Redirect to login page
 
    } catch (error) {
        console.error("❌ Registration error:", error);
        alert(error.message);
    }
});
 
