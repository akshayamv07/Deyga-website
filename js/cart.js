import { db, collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "./firebase-config.js";
import { auth } from "./auth.js";

// DOM Elements
const cartItemsContainer = document.querySelector("#cart-items-container") || document.createElement("div");
const emptyCartMessage = document.querySelector("#empty-cart-message") || document.createElement("p");
const subtotalElement = document.querySelector("#subtotal");
const checkoutButton = document.querySelector(".checkout-button");

// Global variables
let cartItems = [];
let productDetails = {};
let subtotal = 0;

// Initialize cart page
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🛒 Initializing cart page...");

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log(`✅ User logged in: ${user.uid}`);
            await fetchCartItems(user.uid);
        } else {
            console.log("⚠️ User not logged in. Redirecting to login page...");
            displayEmptyCart("Please log in to view your cart");
            // window.location.href = "login.html"; // Uncomment to redirect
        }
    });
});

// Fetch cart items from Firestore
async function fetchCartItems(userId) {
    try {
        console.log(`🔄 Fetching cart items for user: ${userId}`);

        const cartQuery = query(
            collection(db, "cart"),
            where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(cartQuery);

        if (querySnapshot.empty) {
            displayEmptyCart();
            return;
        }

        cartItems = [];
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            cartItems.push({
                id: doc.id,
                productId: item.productId,
                quantity: item.quantity,
                timestamp: item.timestamp
            });
        });

        await fetchProductDetails();
        renderCartItems();

    } catch (error) {
        console.error("❌ Error fetching cart items:", error);
        displayEmptyCart("Error loading cart items. Please try again later.");
    }
}

// Fetch product details for all cart items
async function fetchProductDetails() {
    try {
        console.log("🔄 Fetching product details for cart items...");

        const productPromises = cartItems.map(async (item) => {
            const productDoc = await getDoc(doc(db, "products", item.productId));
            if (productDoc.exists()) {
                productDetails[item.productId] = productDoc.data();
            } else {
                console.warn(`⚠️ Product not found: ${item.productId}`);
            }
        });

        await Promise.all(productPromises);

    } catch (error) {
        console.error("❌ Error fetching product details:", error);
    }
}

// Render cart items in the DOM
function renderCartItems() {
    if (!cartItemsContainer.parentNode) {
        document.querySelector("main").appendChild(cartItemsContainer);
        cartItemsContainer.id = "cart-items-container";
    }

    cartItemsContainer.innerHTML = "";
    emptyCartMessage.style.display = "none";

    subtotal = 0;

    cartItems.forEach((item) => {
        const product = productDetails[item.productId];

        if (!product) return;

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        const cartItemElement = document.createElement("div");
        cartItemElement.className = "cart-item";
        cartItemElement.setAttribute("data-cart-id", item.id);
        cartItemElement.setAttribute("data-product-id", item.productId);

        cartItemElement.innerHTML = `
            <div class="cart-item-image">
                <img src="${validateImageUrl(product.img_url) ? product.img_url : "images/default.jpg"}" 
                     alt="${product.name}" 
                     onerror="this.onerror=null; this.src='images/default.jpg';">
            </div>
            <div class="cart-item-details">
                <h3 class="cart-item-title">${product.name}</h3>
                <p class="cart-item-price">₹${product.price}</p>
                <div class="cart-item-quantity">
                    <button class="quantity-btn minus" data-cart-id="${item.id}">-</button>
                    <span class="quantity" id="cart-quantity-${item.id}">${item.quantity}</span>
                    <button class="quantity-btn plus" data-cart-id="${item.id}">+</button>
                </div>
            </div>
            <div class="cart-item-total">
                <p>₹${itemTotal.toFixed(2)}</p>
                <button class="remove-item" data-cart-id="${item.id}">
                    <i class="fas fa-trash-alt"></i> Remove
                </button>
            </div>
        `;

        cartItemsContainer.appendChild(cartItemElement);
    });

    updateSubtotal();
    attachCartEvents();
}

// Display empty cart message
function displayEmptyCart(message = "Your cart is empty.") {
    emptyCartMessage.textContent = message;
    emptyCartMessage.style.display = "block";

    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = "";
    }

    updateSubtotal(0);

    if (checkoutButton) {
        checkoutButton.disabled = true;
        checkoutButton.classList.add("disabled");
    }
}

// Update subtotal display
function updateSubtotal(value = subtotal) {
    subtotal = value;

    if (subtotalElement) {
        subtotalElement.textContent = `Subtotal: ₹${subtotal.toFixed(2)}`;
    }

    if (checkoutButton) {
        checkoutButton.disabled = subtotal <= 0;
        if (subtotal <= 0) {
            checkoutButton.classList.add("disabled");
        } else {
            checkoutButton.classList.remove("disabled");
        }
    }
}

// Attach event listeners to cart items
function attachCartEvents() {
    document.querySelectorAll(".cart-item .quantity-btn.plus").forEach(button => {
        button.addEventListener("click", async (event) => {
            const cartId = event.target.getAttribute("data-cart-id");
            await updateCartItemQuantity(cartId, 1);
        });
    });

    document.querySelectorAll(".cart-item .quantity-btn.minus").forEach(button => {
        button.addEventListener("click", async (event) => {
            const cartId = event.target.getAttribute("data-cart-id");
            await updateCartItemQuantity(cartId, -1);
        });
    });

    document.querySelectorAll(".cart-item .remove-item").forEach(button => {
        button.addEventListener("click", async (event) => {
            const cartId = event.target.getAttribute("data-cart-id");
            await removeCartItem(cartId);
        });
    });

    if (checkoutButton) {
        console.log("🔧 Attaching checkout button event listener...");
        checkoutButton.removeEventListener("click", handleCheckout);
        checkoutButton.addEventListener("click", handleCheckout);
    }
}

function handleCheckout() {
    console.log("🛒 Checkout button clicked, subtotal:", subtotal);
    if (subtotal > 0) {
        console.log("✅ Navigating to checkout.html");
        window.location.href = "checkout.html";
    } else {
        console.log("⚠️ Subtotal is zero, checkout disabled");
        alert("Your cart is empty. Add items to proceed.");
    }
}

// Update cart item quantity
async function updateCartItemQuantity(cartId, change) {
    try {
        const cartItem = cartItems.find(item => item.id === cartId);
        if (!cartItem) return;

        const newQuantity = cartItem.quantity + change;

        if (newQuantity < 1) {
            await removeCartItem(cartId);
            return;
        }

        await updateDoc(doc(db, "cart", cartId), {
            quantity: newQuantity
        });

        cartItem.quantity = newQuantity;
        const quantityElement = document.querySelector(`#cart-quantity-${cartId}`);
        if (quantityElement) {
            quantityElement.textContent = newQuantity;
        }

        calculateSubtotal();

        console.log(`✅ Cart item quantity updated: ${cartId} -> ${newQuantity}`);

    } catch (error) {
        console.error("❌ Error updating cart item quantity:", error);
        alert("Error updating item quantity. Please try again.");
    }
}

// Remove cart item
async function removeCartItem(cartId) {
    try {
        await deleteDoc(doc(db, "cart", cartId));
        cartItems = cartItems.filter(item => item.id !== cartId);
        const cartItemElement = document.querySelector(`.cart-item[data-cart-id="${cartId}"]`);
        if (cartItemElement) {
            cartItemElement.remove();
        }

        calculateSubtotal();

        if (cartItems.length === 0) {
            displayEmptyCart();
        }

        console.log(`✅ Cart item removed: ${cartId}`);

    } catch (error) {
        console.error("❌ Error removing cart item:", error);
        alert("Error removing item from cart. Please try again.");
    }
}

// Calculate subtotal
function calculateSubtotal() {
    subtotal = 0;

    cartItems.forEach((item) => {
        const product = productDetails[item.productId];
        if (product) {
            subtotal += product.price * item.quantity;
        }
    });

    updateSubtotal();
}

// Validate Image URL helper function
function validateImageUrl(url) {
    return url && url.startsWith("http") && !url.includes("google.com/url");
}

// Export functions for reuse
export { fetchCartItems, updateCartItemQuantity, removeCartItem };