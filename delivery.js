import { db } from "./firebase-config.js";
import {
  collection, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const ordersGrid = document.getElementById("ordersGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const refreshBtn = document.getElementById("refreshBtn");

let orders = [];

const statusText = {
  ready: "جاهز للتوصيل",
  out_for_delivery: "جاري التوصيل",
  delivered: "تم التسليم"
};

function normalizeOrder(id, data) {
  const rawStatus = data.status || data.orderStatus || "new";
  let status = rawStatus;
  if (rawStatus === "ready_for_delivery" || rawStatus === "prepared") status = "ready";
  if (rawStatus === "delivering" || rawStatus === "on_delivery") status = "out_for_delivery";
  if (rawStatus === "completed") status = "delivered";

  return {
    id,
    ...data,
    status,
    table: data.tableNumber ?? data.table ?? "-",
    customer: data.customerName ?? data.customer ?? "زبون",
    phone: data.phone ?? data.customerPhone ?? "",
    total: Number(data.total ?? data.totalPrice ?? 0),
    items: Array.isArray(data.items) ? data.items : []
  };
}

function formatMoney(value) {
  return `${Number(value).toLocaleString("ar-IQ")} د.ع`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleString("ar-IQ");
  } catch {
    return "—";
  }
}

function render() {
  const search = searchInput.value.trim().toLowerCase();
  const filter = filterStatus.value;

  const visible = orders.filter(o => {
    const matchesStatus = filter === "all" || o.status === filter;
    const haystack = `${o.id} ${o.table} ${o.customer} ${o.phone}`.toLowerCase();
    return matchesStatus && haystack.includes(search);
  });

  ordersGrid.innerHTML = "";
  emptyState.classList.toggle("hidden", visible.length !== 0);

  for (const order of visible) {
    const card = document.createElement("article");
    card.className = "order-card";

    const itemsHtml = order.items.length
      ? order.items.map(item => `
          <div class="item">
            <span>${escapeHtml(item.name ?? "وجبة")} × ${Number(item.quantity ?? 1)}</span>
            <span>${formatMoney(Number(item.price ?? 0) * Number(item.quantity ?? 1))}</span>
          </div>`).join("")
      : `<div class="item"><span>تفاصيل الوجبات غير متوفرة</span></div>`;

    let actions = "";
    if (order.status === "ready") {
      actions = `<button class="primary" data-action="start" data-id="${order.id}">استلام الطلب وبدء التوصيل</button>`;
    } else if (order.status === "out_for_delivery") {
      actions = `<button class="success" data-action="deliver" data-id="${order.id}">تم التسليم</button>`;
    } else {
      actions = `<button class="secondary" disabled>تم التسليم ✓</button>`;
    }

    card.innerHTML = `
      <div class="order-head">
        <div>
          <div class="order-id">طلب #${escapeHtml(order.id.slice(-6).toUpperCase())}</div>
          <small>${formatDate(order.createdAt)}</small>
        </div>
        <span class="badge ${order.status}">${statusText[order.status] ?? order.status}</span>
      </div>
      <div class="info">
        <div>👤 الزبون: ${escapeHtml(String(order.customer))}</div>
        <div>🪑 الطاولة: ${escapeHtml(String(order.table))}</div>
        ${order.phone ? `<div>📞 الهاتف: ${escapeHtml(String(order.phone))}</div>` : ""}
        <div>💰 الإجمالي: <b>${formatMoney(order.total)}</b></div>
      </div>
      <div class="items">${itemsHtml}</div>
      <div class="actions">${actions}</div>
    `;

    ordersGrid.appendChild(card);
  }

  document.getElementById("readyCount").textContent =
    orders.filter(o => o.status === "ready").length;
  document.getElementById("deliveryCount").textContent =
    orders.filter(o => o.status === "out_for_delivery").length;
  document.getElementById("deliveredCount").textContent =
    orders.filter(o => o.status === "delivered").length;
}

async function changeStatus(id, status) {
  try {
    await updateDoc(doc(db, "orders", id), {
      status,
      updatedAt: serverTimestamp(),
      ...(status === "out_for_delivery" ? { deliveryStartedAt: serverTimestamp() } : {}),
      ...(status === "delivered" ? { deliveredAt: serverTimestamp() } : {})
    });
    showToast(status === "delivered" ? "تم تسجيل التسليم بنجاح" : "تم استلام الطلب وبدء التوصيل");
  } catch (error) {
    console.error(error);
    showToast("حدث خطأ أثناء تحديث حالة الطلب");
  }
}

ordersGrid.addEventListener("click", e => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "start") changeStatus(id, "out_for_delivery");
  if (action === "deliver") changeStatus(id, "delivered");
});

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

searchInput.addEventListener("input", render);
filterStatus.addEventListener("change", render);
refreshBtn.addEventListener("click", () => location.reload());

const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
onSnapshot(ordersQuery, snapshot => {
  orders = snapshot.docs
    .map(d => normalizeOrder(d.id, d.data()))
    .filter(o => ["ready", "out_for_delivery", "delivered"].includes(o.status));
  render();
}, error => {
  console.error(error);
  showToast("تعذر الاتصال بقاعدة البيانات");
});
