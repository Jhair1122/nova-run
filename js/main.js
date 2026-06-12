// =============================================
// APEXKICKS — TIENDA PÚBLICA
// Los productos se cargan desde Supabase
// =============================================

import { supabase } from "./supabase-client.js";

let productosCache = [];
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let filtroActivo = "Todos";

// =============================================
// CARGAR PRODUCTOS DESDE SUPABASE
// =============================================
async function cargarProductos() {
  const grid = document.getElementById("catalogo-grid");
  if (!grid) return;

  grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1;padding:3rem;text-align:center;color:var(--gray-1)">Cargando catálogo…</p>`;

  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error || !data) {
    grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1;padding:3rem;text-align:center;color:var(--gray-1)">No se pudo cargar el catálogo. Intenta más tarde.</p>`;
    return;
  }

  productosCache = data;
  renderCatalogo(productosCache);
  initFiltros();
}

// =============================================
// RENDER DEL CATÁLOGO
// =============================================
function renderCatalogo(lista) {
  const grid = document.getElementById("catalogo-grid");
  if (!grid) return;

  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1;padding:3rem;text-align:center;color:var(--gray-1)">No hay productos en esta categoría.</p>`;
    return;
  }

  lista.forEach((p, index) => {
    const card = document.createElement("article");
    card.className = `product-card ${index === 0 && filtroActivo === "Todos" ? "featured" : ""}`;
    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${p.imagen}" alt="${p.nombre}" loading="lazy" />
        ${p.nuevo ? '<span class="badge badge-new">NUEVO</span>' : ""}
        ${p.precio_antes ? '<span class="badge badge-sale">OFERTA</span>' : ""}
      </div>
      <div class="product-info">
        <span class="product-cat">${p.categoria}</span>
        <h3 class="product-name">${p.nombre}</h3>
        <p class="product-desc">${p.descripcion}</p>
        <div class="product-price">
          <span class="price-current">S/ ${Number(p.precio).toFixed(2)}</span>
          ${p.precio_antes ? `<span class="price-before">S/ ${Number(p.precio_antes).toFixed(2)}</span>` : ""}
        </div>
        <button class="btn-add" onclick="agregarAlCarrito('${p.id}')">
          Agregar al carrito
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// =============================================
// FILTROS (construidos dinámicamente)
// =============================================
function initFiltros() {
  const container = document.querySelector(".filters");
  if (!container) return;

  const categorias = ["Todos", ...new Set(productosCache.map(p => p.categoria))];

  container.innerHTML = categorias.map(c =>
    `<button class="filter-btn ${c === "Todos" ? "active" : ""}" data-filter="${c}">${c}</button>`
  ).join("");

  container.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filtroActivo = btn.dataset.filter;
      const filtrados = filtroActivo === "Todos"
        ? productosCache
        : productosCache.filter(p => p.categoria === filtroActivo);
      renderCatalogo(filtrados);
    });
  });
}

// =============================================
// CARRITO
// =============================================
function agregarAlCarrito(id) {
  const producto = productosCache.find(p => p.id === id);
  if (!producto) return;

  const existe = carrito.find(item => item.id === id);
  if (existe) {
    existe.cantidad += 1;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }

  guardarCarrito();
  actualizarContadorCarrito();
  mostrarToast(`${producto.nombre} agregado al carrito`);
}

// Exponer globalmente para onclick en HTML generado dinámicamente
window.agregarAlCarrito = agregarAlCarrito;

function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function actualizarContadorCarrito() {
  const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const contador = document.getElementById("cart-count");
  if (contador) {
    contador.textContent = total;
    contador.style.display = total > 0 ? "flex" : "none";
  }
}

function mostrarToast(mensaje) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = mensaje;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 2500);
}

window.toggleCarrito = function() {
  const panel = document.getElementById("cart-panel");
  const overlay = document.getElementById("cart-overlay");
  panel.classList.toggle("open");
  overlay.classList.toggle("open");
  renderCarritoPanel();
};

function renderCarritoPanel() {
  const lista  = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!lista) return;

  if (carrito.length === 0) {
    lista.innerHTML = `<p class="cart-empty">Tu carrito está vacío.</p>`;
    totalEl.textContent = "S/ 0.00";
    return;
  }

  lista.innerHTML = carrito.map(item => `
    <div class="cart-item">
      <img src="${item.imagen}" alt="${item.nombre}" />
      <div class="cart-item-info">
        <span class="cart-item-name">${item.nombre}</span>
        <span class="cart-item-price">S/ ${Number(item.precio).toFixed(2)} × ${item.cantidad}</span>
      </div>
      <button class="cart-item-remove" onclick="eliminarDelCarrito('${item.id}')">×</button>
    </div>
  `).join("");

  const total = carrito.reduce((sum, item) => sum + Number(item.precio) * item.cantidad, 0);
  totalEl.textContent = `S/ ${total.toFixed(2)}`;
}

window.eliminarDelCarrito = function(id) {
  carrito = carrito.filter(item => item.id !== id);
  guardarCarrito();
  actualizarContadorCarrito();
  renderCarritoPanel();
};

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  actualizarContadorCarrito();
  document.getElementById("cart-overlay")?.addEventListener("click", toggleCarrito);
});
