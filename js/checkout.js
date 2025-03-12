import { auth } from "./auth.js";
import { db, doc, setDoc, serverTimestamp, collection, getDocs, addDoc, updateDoc, deleteDoc, getDoc, query, where } from "./firebase-config.js";

// DOM Elements
const orderItemsList = document.getElementById("order-items");
const totalAmountSpan = document.getElementById("total-amount");
const finalAmountSpan = document.getElementById("final-amount");
const userCreditsSpan = document.getElementById("user-credits");
const customerEmailSpan = document.getElementById("customer-email");
const orderDateSpan = document.getElementById("order-date");
const useCreditsCheckbox = document.getElementById("use-credits");
const paymentMethodSelect = document.getElementById("payment-method");
const checkoutBtn = document.getElementById("checkout-btn");

// User & Cart Data
let userData = { email: "", userId: "", credits: 0 };
let cartItems = [];
let totalAmount = 0;
let finalAmount = 0;
let orderId = "";

// Listen for Authentication & Fetch Cart
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}, UID: ${user.uid}`);
        customerEmailSpan.textContent = user.email;
        orderDateSpan.textContent = new Date().toLocaleDateString();
        userData.email = user.email.toLowerCase();
        userData.userId = user.uid; // Store userId for filtering

        await fetchUserCredits();
        await fetchCartItems();
    } else {
        console.log("❌ User not logged in, redirecting...");
        alert("Please log in to proceed with checkout.");
        window.location.href = "login.html";
    }
});

// Fetch User Credits
async function fetchUserCredits() {
    try {
        console.log("🔄 Fetching user credits...");
        const userRef = doc(db, "users", userData.email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            userData.credits = userSnap.data().credits || 0;
            console.log(`✅ User Credits: ${userData.credits}`);
        } else {
            console.warn("⚠️ User not found in Firestore. Creating new user document...");
            await setDoc(userRef, {
                email: userData.email,
                credits: 0,
                createdAt: serverTimestamp()
            });
            userData.credits = 0;
        }

        userCreditsSpan.textContent = userData.credits;
    } catch (error) {
        console.error("❌ Error fetching user credits:", error);
        userCreditsSpan.textContent = "0"; // Fallback to 0
    }
}

// Fetch Cart Items
async function fetchCartItems() {
    try {
        console.log("🔄 Fetching cart items for user...");
        // First try filtering by userId
        const cartQuery = query(
            collection(db, "cart"),
            where("userId", "==", userData.userId)
        );
        const cartSnapshot = await getDocs(cartQuery);
        console.log(`🔍 Found ${cartSnapshot.size} cart items with userId: ${userData.userId}`);

        orderItemsList.innerHTML = "";
        cartItems = [];
        totalAmount = 0;

        let matchingItemsCount = 0;

        for (const docSnapshot of cartSnapshot.docs) {
            const cartItem = docSnapshot.data();
            console.log(`🔎 Cart item: ${docSnapshot.id}, userId: ${cartItem.userId}, userEmail: ${cartItem.userEmail}`);

            // Optional: Fallback to userEmail if userId doesn't match (for debugging)
            if (cartItem.userId !== userData.userId) {
                console.log(`⏩ Skipped item for userId: ${cartItem.userId} (expected: ${userData.userId})`);
                continue;
            }

            const productRef = doc(db, "products", cartItem.productId);
            const productSnap = await getDoc(productRef);

            if (!productSnap.exists()) {
                console.warn(`⚠️ Product not found: ${cartItem.productId}`);
                continue;
            }

            const product = productSnap.data();
            if (product.stock_status !== "visible") {
                console.warn(`⚠️ Product not visible: ${cartItem.productId}`);
                continue;
            }

            const itemTotal = cartItem.quantity * product.price;
            totalAmount += itemTotal;

            cartItems.push({
                id: cartItem.productId,
                name: product.name,
                quantity: cartItem.quantity,
                price: product.price,
                total: itemTotal,
                credit: product.credit || 0,
                stock: product.stock
            });

            const listItem = document.createElement("li");
            listItem.textContent = `${product.name} - ${cartItem.quantity} x ₹${product.price} = ₹${itemTotal}`;
            orderItemsList.appendChild(listItem);

            matchingItemsCount++;
        }

        if (matchingItemsCount === 0) {
            console.log("⚠️ No matching cart items found for this user.");
            // Fallback to userEmail if userId fails
            await fetchCartItemsByEmail();
        } else {
            totalAmountSpan.textContent = totalAmount.toFixed(2);
            updateFinalAmount();
            console.log(`✅ Fetched ${cartItems.length} cart items, total: ₹${totalAmount}`);
        }

    } catch (error) {
        console.error("❌ Error fetching cart items:", error);
        orderItemsList.innerHTML = "<li>Error loading cart items. Please try again.</li>";
    }
}

// Fallback: Fetch cart items by userEmail
async function fetchCartItemsByEmail() {
    try {
        console.log("🔄 Fallback: Fetching cart items by userEmail...");
        const cartSnapshot = await getDocs(collection(db, "cart"));
        console.log(`🔍 Found ${cartSnapshot.size} total cart items in Firestore`);

        orderItemsList.innerHTML = "";
        cartItems = [];
        totalAmount = 0;

        let matchingItemsCount = 0;

        for (const docSnapshot of cartSnapshot.docs) {
            const cartItem = docSnapshot.data();
            const cartEmail = cartItem.userEmail ? cartItem.userEmail.toLowerCase() : null;

            console.log(`🔎 Checking cart item: ${docSnapshot.id}, userEmail: ${cartEmail}`);

            if (cartEmail !== userData.email) {
                console.log(`⏩ Skipped item for ${cartEmail} (expected: ${userData.email})`);
                continue;
            }

            const productRef = doc(db, "products", cartItem.productId);
            const productSnap = await getDoc(productRef);

            if (!productSnap.exists()) {
                console.warn(`⚠️ Product not found: ${cartItem.productId}`);
                continue;
            }

            const product = productSnap.data();
            if (product.stock_status !== "visible") {
                console.warn(`⚠️ Product not visible: ${cartItem.productId}`);
                continue;
            }

            const itemTotal = cartItem.quantity * product.price;
            totalAmount += itemTotal;

            cartItems.push({
                id: cartItem.productId,
                name: product.name,
                quantity: cartItem.quantity,
                price: product.price,
                total: itemTotal,
                credit: product.credit || 0,
                stock: product.stock
            });

            const listItem = document.createElement("li");
            listItem.textContent = `${product.name} - ${cartItem.quantity} x ₹${product.price} = ₹${itemTotal}`;
            orderItemsList.appendChild(listItem);

            matchingItemsCount++;
        }

        if (matchingItemsCount === 0) {
            console.log("⚠️ No matching cart items found for this user (by email).");
            orderItemsList.innerHTML = "<li>No items in cart. <a href='products.html'>Continue Shopping</a></li>";
        } else {
            totalAmountSpan.textContent = totalAmount.toFixed(2);
            updateFinalAmount();
            console.log(`✅ Fetched ${cartItems.length} cart items by email, total: ₹${totalAmount}`);
        }

    } catch (error) {
        console.error("❌ Error fetching cart items by email:", error);
        orderItemsList.innerHTML = "<li>Error loading cart items. Please try again.</li>";
    }
}

// Calculate Final Amount After Applying Credits
useCreditsCheckbox.addEventListener("change", () => {
    updateFinalAmount();
});

function updateFinalAmount() {
    finalAmount = totalAmount;
    if (useCreditsCheckbox.checked) {
        finalAmount -= userData.credits;
        if (finalAmount < 0) finalAmount = 0;
    }
    finalAmountSpan.textContent = finalAmount.toFixed(2);
    console.log(`🔧 Updated final amount: ₹${finalAmount}`);
}

// Confirm Order & Store in Firestore
checkoutBtn.addEventListener("click", async () => {
    console.log("🛒 Checkout button clicked...");
    if (cartItems.length === 0) {
        console.log("⚠️ Cart is empty");
        alert("Your cart is empty!");
        return;
    }

    const paymentMethod = paymentMethodSelect.value;
    orderId = `ORDER-${Date.now()}`;

    try {
        let earnedCredits = 0;
        for (let item of cartItems) {
            const productRef = doc(db, "products", item.id);
            const productSnap = await getDoc(productRef);
            const currentStock = productSnap.data().stock || 0;
            let newStock = currentStock - item.quantity;

            if (newStock < 0) {
                console.log(`⚠️ Insufficient stock for ${item.name}, current: ${currentStock}`);
                alert(`Not enough stock for ${item.name}.`);
                return;
            }

            await updateDoc(productRef, { stock: newStock });
            console.log(`📉 Stock Updated: ${item.name} -> ${newStock} remaining`);
            earnedCredits += (item.credit || 0) * item.quantity;
        }

        let creditsUsed = useCreditsCheckbox.checked ? Math.min(userData.credits, totalAmount) : 0;
        let remainingCredits = userData.credits - creditsUsed + earnedCredits;

        await updateDoc(doc(db, "users", userData.email), { credits: remainingCredits });

        const orderData = {
            orderId,
            userEmail: userData.email,
            userId: userData.userId,
            items: cartItems,
            totalAmount,
            finalAmount,
            creditsUsed,
            creditsEarned: earnedCredits,
            paymentMethod,
            date: serverTimestamp(),
        };

        await addDoc(collection(db, "orders"), orderData);

        const cartSnapshot = await getDocs(collection(db, "cart"));
        for (const docSnapshot of cartSnapshot.docs) {
            const cartItem = docSnapshot.data();
            if (cartItem.userId === userData.userId || (cartItem.userEmail && cartItem.userEmail.toLowerCase() === userData.email)) {
                await deleteDoc(doc(db, "cart", docSnapshot.id));
            }
        }

        console.log(`✅ Order placed successfully: ${orderId}`);
        generateInvoice(orderData);
        alert("✅ Order placed successfully!");
        window.location.href = "index.html";

    } catch (error) {
        console.error("❌ Error processing order:", error);
        alert(`Error processing order: ${error.message}`);
    }
});

// Generate Downloadable Invoice
function generateInvoice(orderData) {
    let invoiceContent = `
    DEYGA STORE - ORDER INVOICE
    ------------------------------------------
    Order ID: ${orderData.orderId}
    Date: ${new Date().toLocaleDateString()}
    Customer: ${orderData.userEmail}
    ------------------------------------------
    ITEMS:
    `;

    orderData.items.forEach((item) => {
        invoiceContent += `${item.name} - ${item.quantity} x ₹${item.price} = ₹${item.total}\n`;
    });

    invoiceContent += `
    ------------------------------------------
    Total Amount: ₹${orderData.totalAmount.toFixed(2)}
    Credits Used: ₹${orderData.creditsUsed.toFixed(2)}
    Credits Earned: ₹${orderData.creditsEarned.toFixed(2)}
    Final Amount: ₹${orderData.finalAmount.toFixed(2)}
    Payment Method: ${orderData.paymentMethod.toUpperCase()}
    ------------------------------------------
    Contact: support@deygastore.com
    Website: www.deygastore.com
    Thank you for shopping with Deyga Store!
    ------------------------------------------
    `;

    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${orderData.orderId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
