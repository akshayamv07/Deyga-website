// import { db, collection, getDocs, query, where, orderBy } from "./firebase-config.js";
 
// // 🚀 Fetch Orders from Firestore
// async function fetchOrders(startDate, endDate) {
//     let q = query(collection(db, "orders"), orderBy("date", "desc"));
//     if (startDate && endDate) {
//         q = query(q, where("date", ">=", new Date(startDate)), where("date", "<=", new Date(endDate)));
//     }
//     const snapshot = await getDocs(q);
//     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
// }
 
// // 🚀 Fetch Inventory
// async function fetchInventory() {
//     const snapshot = await getDocs(collection(db, "products"));
//     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
// }
 
// // 📊 Generate Sales Chart
// async function generateSalesChart() {
//     let salesData = await fetchOrders();
   
//     let labels = salesData.map(order => order.date.toDate().toLocaleDateString());
//     let amounts = salesData.map(order => order.totalAmount);
 
//     let ctx = document.getElementById("salesChart").getContext("2d");
//     new Chart(ctx, {
//         type: "bar",
//         data: {
//             labels: labels,
//             datasets: [{
//                 label: "Sales Amount",
//                 data: amounts,
//                 backgroundColor: "rgba(54, 162, 235, 0.6)",
//             }]
//         }
//     });
// }
 
// // 📊 Generate Inventory Chart
// async function generateInventoryChart() {
//     let inventoryData = await fetchInventory();
   
//     let labels = inventoryData.map(item => item.name);
//     let stocks = inventoryData.map(item => item.stock);
 
//     let ctx = document.getElementById("inventoryChart").getContext("2d");
//     new Chart(ctx, {
//         type: "pie",
//         data: {
//             labels: labels,
//             datasets: [{
//                 label: "Stock Levels",
//                 data: stocks,
//                 backgroundColor: ["red", "blue", "green", "orange", "purple"],
//             }]
//         }
//     });
// }
 
// // 📌 Attach functions to `window` for button clicks
// window.generateSalesChart = generateSalesChart;
// window.generateInventoryChart = generateInventoryChart;
 
 
// // 🚀 Run charts on load
// generateSalesChart();
// generateInventoryChart();
 
 
 
import { db, collection, getDocs, query, where, orderBy } from "./firebase-config.js";
 
// 🚀 Fetch Orders from Firestore
async function fetchOrders(startDate, endDate) {
    let q = query(collection(db, "orders"), orderBy("date", "desc"));
    if (startDate && endDate) {
        q = query(q, where("date", ">=", new Date(startDate)), where("date", "<=", new Date(endDate)));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
 
// 🚀 Fetch Inventory
async function fetchInventory() {
    const snapshot = await getDocs(collection(db, "products"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
 
// 📊 Generate Customer Report Chart (Orders by Payment Method)
async function generateCustomerReport() {
    let startDate = document.getElementById("customer-start").value;
    let endDate = document.getElementById("customer-end").value;
   
    let orders = await fetchOrders(startDate, endDate);
   
    let paymentMethods = {};
    orders.forEach(order => {
        paymentMethods[order.paymentMethod] = (paymentMethods[order.paymentMethod] || 0) + 1;
    });
 
    let labels = Object.keys(paymentMethods);
    let data = Object.values(paymentMethods);
 
    if (labels.length === 0) {
        alert("No customer data available for selected dates.");
        return;
    }
 
    renderPieChart("customerChart", labels, data, "Orders by Payment Method");
}
 
// 📊 Generate Sales Chart (Bar Chart)
// async function generateSalesChart() {
//     let salesData = await fetchOrders();
   
//     let labels = salesData.map(order => order.date.toDate().toLocaleDateString());
//     let amounts = salesData.map(order => order.totalAmount);
 
//     let ctx = document.getElementById("salesChart").getContext("2d");
//     new Chart(ctx, {
//         type: "bar",
//         data: {
//             labels: labels,
//             datasets: [{
//                 label: "Sales Amount",
//                 data: amounts,
//                 backgroundColor: "rgba(54, 162, 235, 0.6)",
//             }]
//         }
//     });
// }
 
// 📊 Generate Sales Chart (Bar Chart) with Grouped Dates
async function generateSalesChart() {
    let salesData = await fetchOrders();
 
    // ✅ Step 1: Group sales by date
    let salesByDate = {};
 
    salesData.forEach(order => {
        let dateKey = order.date.toDate().toLocaleDateString(); // Convert to readable date format
       
        if (!salesByDate[dateKey]) {
            salesByDate[dateKey] = 0; // Initialize date
        }
        salesByDate[dateKey] += order.totalAmount; // Sum sales for that date
    });
 
    // ✅ Step 2: Extract grouped labels and values
    let labels = Object.keys(salesByDate);  // Unique dates
    let amounts = Object.values(salesByDate); // Summed sales per date
 
    // ✅ Step 3: Get the chart context
    let ctx = document.getElementById("salesChart").getContext("2d");
 
    // ✅ Step 4: Destroy the existing chart correctly
    if (window.salesChart instanceof Chart) {
        window.salesChart.destroy();  // Destroy only if it's a Chart instance
    }
 
    // ✅ Step 5: Create the new grouped bar chart
    window.salesChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Sales Amount",
                data: amounts,
                backgroundColor: "rgba(54, 162, 235, 0.6)",
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "top" }
            }
        }
    });
}
 
 
 
// 📊 Generate Inventory Chart (Pie Chart)
async function generateInventoryChart() {
    let inventoryData = await fetchInventory();
   
    let labels = inventoryData.map(item => item.name);
    let stocks = inventoryData.map(item => item.stock);
 
    let ctx = document.getElementById("inventoryChart").getContext("2d");
    new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                label: "Stock Levels",
                data: stocks,
                backgroundColor: ["red", "blue", "green", "orange", "purple"],
            }]
        }
    });
}
 
// // 📌 Render Pie Chart Function
// function renderPieChart(canvasId, labels, data, title) {
//     let ctx = document.getElementById(canvasId).getContext("2d");
 
//     // Destroy existing chart before creating a new one
//     if (window[canvasId]) {
//         window[canvasId].destroy();
//     }
 
//     window[canvasId] = new Chart(ctx, {
//         type: "pie",
//         data: {
//             labels: labels,
//             datasets: [{
//                 label: title,
//                 data: data,
//                 backgroundColor: ["#ffcc00", "#ff5722", "#4caf50", "#2196f3", "#9c27b0"],
//                 borderWidth: 1
//             }]
//         },
//         options: {
//             responsive: true,
//             plugins: {
//                 legend: { position: "bottom" }
//             }
//         }
//     });
// }
 
 
// 📌 Render Pie Chart Function (Fixed)
function renderPieChart(canvasId, labels, data, title) {
    let ctx = document.getElementById(canvasId).getContext("2d");
 
    // ✅ Ensure the canvasId is stored in a global chart registry
    if (window.charts && window.charts[canvasId]) {
        window.charts[canvasId].destroy(); // ✅ Properly destroy the existing chart
    }
 
    // ✅ Initialize global charts object if not already created
    if (!window.charts) {
        window.charts = {};
    }
 
    // ✅ Create and store the new chart instance
    window.charts[canvasId] = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: ["#ffcc00", "#ff5722", "#4caf50", "#2196f3", "#9c27b0"],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });
}
 
 
// 📌 Attach functions to `window` for button clicks
window.generateCustomerReport = generateCustomerReport;
window.generateSalesChart = generateSalesChart;
window.generateInventoryChart = generateInventoryChart;
 
// 🚀 Run charts on load
generateCustomerReport();
generateSalesChart();
generateInventoryChart();
 