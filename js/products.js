import { db, collection, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, query, where } from "./firebase-config.js";
import { auth } from "./auth.js";

// Select the products container
const productsContainer = document.querySelector(".products-container");

// Add variables for search and filter elements
let allProducts = []; // To store all products for filtering
let currentFilters = {
    search: '',
    minPrice: 0,
    maxPrice: Infinity,
    stockStatus: 'all' // 'all', 'inStock', 'outOfStock'
};

// Function to fetch products from Firestore
async function fetchProducts() {
    try {
        console.log("🔄 Fetching products from database...");
        const querySnapshot = await getDocs(collection(db, "products"));
        allProducts = []; // Reset products array
        productsContainer.innerHTML = ""; // Clear previous products

        querySnapshot.forEach((doc) => {
            const product = { id: doc.id, ...doc.data() };
            allProducts.push(product);
        });

        applyFiltersAndRender(); // Render with current filters
        setupFilterListeners();

    } catch (error) {
        console.error("❌ Error fetching products:", error);
        productsContainer.innerHTML = `
            <div class="error-message">
                <p>Sorry, we couldn't load the products. Please try again later.</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

// Function to apply filters and render products
function applyFiltersAndRender() {
    productsContainer.innerHTML = ""; // Ensure container is cleared at the start
    
    const filteredProducts = allProducts.filter(product => {
        const searchTerm = currentFilters.search.toLowerCase();
        const matchesSearch = 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm));

        const matchesPrice = 
            product.price >= currentFilters.minPrice && 
            product.price <= currentFilters.maxPrice;

        const matchesStock = 
            currentFilters.stockStatus === 'all' ||
            (currentFilters.stockStatus === 'inStock' && product.stock > 0) ||
            (currentFilters.stockStatus === 'outOfStock' && product.stock === 0);

        return product.stock_status === "visible" && 
               matchesSearch && 
               matchesPrice && 
               matchesStock;
    });

    if (filteredProducts.length === 0) {
        productsContainer.innerHTML = '<p>No products match your search criteria.</p>';
        return;
    }

    filteredProducts.forEach(product => {
        renderProduct(product);
    });

    console.log("✅ Finished rendering products, attaching event listeners...");
    attachAddToCartEvent();
}

// Function to render a single product
function renderProduct(product) {
    let imageUrl = validateImageUrl(product.img_url) ? product.img_url : "images/default.jpg";

    let savingsHTML = "";
    if (product.original_price && product.original_price > product.price) {
        const savings = product.original_price - product.price;
        savingsHTML = `<div class="savings">You'll save ₹${savings}</div>`;
    }

    let badgeHTML = "";
    if (product.is_new) {
        badgeHTML = `<div class="product-badge badge-new">New Launch</div>`;
    } else if (product.is_bestseller) {
        badgeHTML = `<div class="product-badge badge-bestseller">Bestseller</div>`;
    } else if (product.is_viral) {
        badgeHTML = `<div class="product-badge badge-viral">Viral Product</div>`;
    } else if (product.is_legacy) {
        badgeHTML = `<div class="product-badge badge-legacy">Legacy Product ✨</div>`;
    } else if (product.stock && product.stock < 10 && product.stock > 0) {
        badgeHTML = `<div class="product-badge badge-limited">Only ${product.stock} left</div>`;
    } else if (product.stock === 0) {
        badgeHTML = `<div class="product-badge badge-out-of-stock">Out of Stock</div>`;
    }

    const ratingHTML = product.rating ? `
        <div class="rating-container">
            <div class="rating">
                <span class="rating-star">★</span>${product.rating.toFixed(1)}
            </div>
            <span class="rating-count">${product.rating_count || 0} Ratings</span>
        </div>
    ` : '';

    const originalPriceHTML = product.original_price ? 
        `<span class="current-price">₹${product.original_price}</span>` : '';

    const stockHTML = product.stock !== undefined ? `
        <div class="stock-info">
            Available: ${product.stock} ${product.stock === 0 ? "(Out of Stock)" : ""}
        </div>
    ` : '';

    const addToCartDisabled = product.stock === 0 ? 'disabled' : '';

    let productHTML = `
        <div class="product-card" data-product-id="${product.id}">
            ${badgeHTML}
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}" 
                     onerror="this.onerror=null; this.src='images/default.jpg';">
                <div class="splash-overlay"></div>
                ${stockHTML}
            </div>
            ${ratingHTML}
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="cart-item-description">${product.description || ''}</p>
                <div class="price-container">
                    <span class="current-price">₹${product.price}</span>
                    ${originalPriceHTML}
                    <button class="add-to-cart" data-id="${product.id}" ${addToCartDisabled}>
                        Add to Cart
                    </button>
                </div>
                ${savingsHTML}
            </div>
        </div>
    `;
    
    productsContainer.innerHTML += productHTML;
    console.log(`Rendered product: ${product.name} with stock: ${product.stock}`);
}

// Setup filter event listeners
function setupFilterListeners() {
    const searchInput = document.querySelector('#search-input');
    const minPriceInput = document.querySelector('#min-price');
    const maxPriceInput = document.querySelector('#max-price');
    const stockFilter = document.querySelector('#stock-filter');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentFilters.search = e.target.value;
            applyFiltersAndRender();
        });
    }

    if (minPriceInput) {
        minPriceInput.addEventListener('change', (e) => {
            currentFilters.minPrice = parseFloat(e.target.value) || 0;
            applyFiltersAndRender();
        });
    }

    if (maxPriceInput) {
        maxPriceInput.addEventListener('change', (e) => {
            currentFilters.maxPrice = parseFloat(e.target.value) || Infinity;
            applyFiltersAndRender();
        });
    }

    if (stockFilter) {
        stockFilter.addEventListener('change', (e) => {
            currentFilters.stockStatus = e.target.value;
            applyFiltersAndRender();
        });
    }
}

// Function to validate image URL
function validateImageUrl(url) {
    return url && url.startsWith("http") && !url.includes("google.com/url");
}

// Function to attach "Add to Cart" event listeners
function attachAddToCartEvent() {
    console.log("🔍 Attaching Add to Cart event listeners...");
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    console.log(`Found ${addToCartButtons.length} Add to Cart buttons`);

    addToCartButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("📌 Clicked Add to Cart button with data-id:", button.getAttribute('data-id'));

            const productId = button.getAttribute('data-id');
            const product = allProducts.find(p => p.id === productId);

            if (!product) {
                console.error("❌ Product not found for ID:", productId);
                showErrorToast('Product data unavailable.');
                return;
            }

            console.log("📊 Product found:", product);

            if (product.stock === undefined || product.stock <= 0) {
                console.warn("⚠️ Product out of stock:", product.name);
                showErrorToast('This product is out of stock.');
                return;
            }

            // Check authentication
            auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    console.warn("⚠️ User not authenticated. Redirecting to login...");
                    showErrorToast('Please log in to add items to your cart.');
                    window.location.href = "login.html"; // Redirect to login
                    return;
                }

                try {
                    // Check if the item already exists in the cart
                    const cartQuery = query(
                        collection(db, "cart"),
                        where("userId", "==", user.uid),
                        where("productId", "==", productId)
                    );
                    const cartSnapshot = await getDocs(cartQuery);

                    if (!cartSnapshot.empty) {
                        // Item exists, update quantity
                        const cartDoc = cartSnapshot.docs[0];
                        const currentQuantity = cartDoc.data().quantity;
                        await updateDoc(doc(db, "cart", cartDoc.id), {
                            quantity: currentQuantity + 1
                        });
                        console.log("🔧 Updated quantity for existing cart item:", cartDoc.id);
                    } else {
                        // Add new item to cart
                        const cartRef = collection(db, "cart");
                        const cartDoc = await addDoc(cartRef, {
                            userId: user.uid,
                            productId: productId,
                            quantity: 1,
                            timestamp: serverTimestamp()
                        });
                        console.log("➕ Added item to cart in Firestore with ID:", cartDoc.id);
                    }

                    // Update stock
                    await updateStock(productId, product.stock - 1);
                    console.log("🔄 Stock updated in Firestore");

                    // Refresh products
                    fetchProducts();
                    showSuccessToast(`${product.name} added to cart!`);
                } catch (error) {
                    console.error("❌ Error adding item to cart:", error);
                    showErrorToast('Failed to add item to cart. Please try again.');
                }
            });
        });
    });
}

// Function to update stock in Firestore
async function updateStock(productId, newStock) {
    try {
        const productRef = doc(db, "products", productId);
        await updateDoc(productRef, { stock: newStock });
        console.log(`✅ Stock updated for product ${productId} to ${newStock}`);
    } catch (error) {
        console.error("❌ Error updating stock:", error);
        throw error;
    }
}

// Toast functions
function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Initialize
document.addEventListener("DOMContentLoaded", fetchProducts);

// Export functions (if needed elsewhere)
export { fetchProducts, attachAddToCartEvent, updateStock };