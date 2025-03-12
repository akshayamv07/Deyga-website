import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "./firebase-config.js";
import { auth } from "./auth.js";

// DOM Elements
const addProductForm = document.getElementById("add-product-form");
const productList = document.getElementById("product-list");
const logoutBtn = document.getElementById("logout-btn");

// Global variables
let products = [];

// Initialize admin page
document.addEventListener("DOMContentLoaded", () => {
    console.log("🛠️ Initializing admin page...");

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log(`✅ Admin logged in: ${user.uid}`);
            await fetchProducts();
        } else {
            console.log("⚠️ Admin not logged in. Redirecting to login page...");
            window.location.href = "login.html";
        }
    });

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                console.log("✅ Admin logged out successfully");
                window.location.href = "login.html";
            } catch (error) {
                console.error("❌ Error logging out:", error);
                showErrorToast("Error logging out. Please try again.");
            }
        });
    }
});

// Fetch products from Firestore
async function fetchProducts() {
    try {
        console.log("🔄 Fetching products for admin...");
        const querySnapshot = await getDocs(collection(db, "products"));
        products = [];
        productList.innerHTML = "";

        querySnapshot.forEach((doc) => {
            const product = { id: doc.id, ...doc.data() };
            products.push(product);
            renderProduct(product);
        });

        if (products.length === 0) {
            productList.innerHTML = '<p class="no-products">No products found.</p>';
        }
    } catch (error) {
        console.error("❌ Error fetching products:", error);
        productList.innerHTML = '<p class="error-message">Error loading products. Please try again later.</p>';
    }
}

// Render a single product in the edit section
function renderProduct(product) {
    const productDiv = document.createElement("div");
    productDiv.className = "product-item";
    productDiv.setAttribute("data-product-id", product.id);

    productDiv.innerHTML = `
        <div class="product-info">
            <h3>${product.name}</h3>
            <p>Price: ₹${product.price.toFixed(2)}</p>
            <p>Stock: ${product.stock}</p>
            <p>Visible: ${product.stock_status === "visible" ? "Yes" : "No"}</p>
        </div>
        <div class="product-actions">
            <button class="edit-btn" data-id="${product.id}">Edit</button>
            <button class="delete-btn" data-id="${product.id}">Delete</button>
        </div>
    `;

    productList.appendChild(productDiv);

    // Attach event listeners for edit and delete buttons
    productDiv.querySelector(".edit-btn").addEventListener("click", () => openEditForm(product));
    productDiv.querySelector(".delete-btn").addEventListener("click", () => deleteProduct(product.id));
}

// Handle form submission for adding a new product
addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const productData = {
        category: document.getElementById("category").value.trim(),
        description: document.getElementById("description").value.trim(),
        img_url: document.getElementById("img_url").value.trim(),
        name: document.getElementById("name").value.trim(),
        price: parseFloat(document.getElementById("price").value),
        stock: parseInt(document.getElementById("stock").value, 10),
        stock_status: document.getElementById("stock_status").value
    };

    if (!productData.category || !productData.name || !productData.price || !productData.stock || !productData.img_url) {
        showErrorToast("Please fill all required fields.");
        return;
    }

    // Validate price and stock
    if (isNaN(productData.price) || productData.price <= 0) {
        showErrorToast("Price must be a positive number.");
        return;
    }
    if (isNaN(productData.stock) || productData.stock < 0) {
        showErrorToast("Stock quantity must be a non-negative number.");
        return;
    }

    try {
        console.log("➕ Adding new product:", productData);
        await addDoc(collection(db, "products"), productData);
        showSuccessToast("Product added successfully!");
        addProductForm.reset();
        await fetchProducts();
    } catch (error) {
        console.error("❌ Error adding product:", error);
        showErrorToast("Failed to add product. Please try again.");
    }
});

// Open edit form for a product
function openEditForm(product) {
    const formHTML = `
        <div class="edit-form">
            <h3>Edit Product: ${product.name}</h3>
            <form id="edit-product-form-${product.id}">
                <div class="form-group">
                    <label for="edit-category-${product.id}">Category</label>
                    <input type="text" id="edit-category-${product.id}" name="category" value="${product.category || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-description-${product.id}">Description</label>
                    <textarea id="edit-description-${product.id}" name="description" rows="4">${product.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit-img_url-${product.id}">Image URL</label>
                    <input type="url" id="edit-img_url-${product.id}" name="img_url" value="${product.img_url || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-name-${product.id}">Product Name</label>
                    <input type="text" id="edit-name-${product.id}" name="name" value="${product.name}" required>
                </div>
                <div class="form-group">
                    <label for="edit-price-${product.id}">Price (₹)</label>
                    <input type="number" id="edit-price-${product.id}" name="price" value="${product.price}" min="0" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="edit-stock-${product.id}">Stock Quantity</label>
                    <input type="number" id="edit-stock-${product.id}" name="stock" value="${product.stock}" min="0" required>
                </div>
                <div class="form-group">
                    <label for="edit-stock_status-${product.id}">Visible</label>
                    <select id="edit-stock_status-${product.id}" name="stock_status">
                        <option value="visible" ${product.stock_status === "visible" ? "selected" : ""}>Yes</option>
                        <option value="hidden" ${product.stock_status === "hidden" ? "selected" : ""}>No</option>
                    </select>
                </div>
                <button type="submit" class="admin-btn">Update Product</button>
                <button type="button" class="cancel-btn">Cancel</button>
            </form>
        </div>
    `;

    const productDiv = document.querySelector(`.product-item[data-product-id="${product.id}"]`);
    productDiv.innerHTML = formHTML;

    // Attach event listeners for the edit form
    const editForm = document.getElementById(`edit-product-form-${product.id}`);
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await updateProduct(product.id);
    });

    productDiv.querySelector(".cancel-btn").addEventListener("click", () => {
        fetchProducts();
    });
}

// Update a product in Firestore
async function updateProduct(productId) {
    const productData = {
        category: document.getElementById(`edit-category-${productId}`).value.trim(),
        description: document.getElementById(`edit-description-${productId}`).value.trim(),
        img_url: document.getElementById(`edit-img_url-${productId}`).value.trim(),
        name: document.getElementById(`edit-name-${productId}`).value.trim(),
        price: parseFloat(document.getElementById(`edit-price-${productId}`).value),
        stock: parseInt(document.getElementById(`edit-stock-${productId}`).value, 10),
        stock_status: document.getElementById(`edit-stock_status-${productId}`).value
    };

    try {
        console.log(`🔄 Updating product ${productId}:`, productData);
        await updateDoc(doc(db, "products", productId), productData);
        showSuccessToast("Product updated successfully!");
        await fetchProducts();
    } catch (error) {
        console.error("❌ Error updating product:", error);
        showErrorToast("Failed to update product. Please try again.");
    }
}

// Delete a product from Firestore
async function deleteProduct(productId) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        console.log(`🗑️ Deleting product ${productId}`);
        await deleteDoc(doc(db, "products", productId));
        showSuccessToast("Product deleted successfully!");
        await fetchProducts();
    } catch (error) {
        console.error("❌ Error deleting product:", error);
        showErrorToast("Failed to delete product. Please try again.");
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