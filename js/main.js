// =============================================
// CATÁLOGO DE PRODUCTOS
// =============================================

const productos = [
  {
    id: 1,
    nombre: "APEX RUN PRO",
    categoria: "Running",
    precio: 189.99,
    precioAntes: 230.0,
    descripcion: "Amortiguación reactiva para máximo rendimiento en pista.",
    color: "Negro / Naranja",
    tallas: [38, 39, 40, 41, 42, 43, 44],
    imagen: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    destacado: true,
    nuevo: false,
  },
  {
    id: 2,
    nombre: "URBAN STRIDE",
    categoria: "Casual",
    precio: 129.99,
    precioAntes: null,
    descripcion: "Estilo minimal para el día a día urbano.",
    color: "Blanco / Gris",
    tallas: [37, 38, 39, 40, 41, 42],
    imagen: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80",
    destacado: false,
    nuevo: true,
  },
  {
    id: 3,
    nombre: "COURT ELITE",
    categoria: "Basketball",
    precio: 219.99,
    precioAntes: 260.0,
    descripcion: "Soporte de tobillo y tracción total en cancha.",
    color: "Negro / Blanco",
    tallas: [40, 41, 42, 43, 44, 45],
    imagen: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80",
    destacado: false,
    nuevo: false,
  },
  {
    id: 4,
    nombre: "TRAIL GHOST",
    categoria: "Trail",
    precio: 159.99,
    precioAntes: null,
    descripcion: "Agarre extremo para terrenos difíciles.",
    color: "Verde / Marrón",
    tallas: [38, 39, 40, 41, 42, 43],
    imagen: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80",
    destacado: false,
    nuevo: true,
  },
  {
    id: 5,
    nombre: "NEON FLASH",
    categoria: "Running",
    precio: 175.0,
    precioAntes: 210.0,
    descripcion: "Velocidad y visibilidad. Para corredores nocturnos.",
    color: "Amarillo Neón",
    tallas: [39, 40, 41, 42, 43],
    imagen: "https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?w=600&q=80",
    destacado: false,
    nuevo: false,
  },
];

let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let filtroActivo = "Todos";

// =============================================
// RENDER DEL CATÁLOGO
// =============================================

function renderCatalogo(lista) {
  const grid = document.getElementById("catalogo-grid");
  if (!grid) return;

  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `<p class="empty-state">No hay productos en esta categoría.</p>`;
    return;
  }

  lista.forEach((p, index) => {
    const card = document.createElement("article");
    card.className = `product-card ${index === 0 && filtroActivo === "Todos" ? "featured" : ""}`;
    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${p.imagen}" alt="${p.nombre}" loading="lazy" />
        ${p.nuevo ? '<span class="badge badge-new">NUEVO</span>' : ""}
        ${p.precioAntes ? '<span class="badge badge-sale">OFERTA</span>' : ""}
      </div>
      <div class="product-info">
        <span class="product-cat">${p.categoria}</span>
        <h3 class="product-name">${p.nombre}</h3>
        <p class="product-desc">${p.descripcion}</p>
        <div class="product-price">
          <span class="price-current">S/ ${p.precio.toFixed(2)}</span>
          ${p.precioAntes ? `<span class="price-before">S/ ${p.precioAntes.toFixed(2)}</span>` : ""}
        </div>
        <button class="btn-add" onclick="agregarAlCarrito(${p.id})">
          Agregar al carrito
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// =============================================
// FILTROS
// =============================================

function initFiltros() {
  const btns = document.querySelectorAll(".filter-btn");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filtroActivo = btn.dataset.filter;

      const filtrados =
        filtroActivo === "Todos"
          ? productos
          : productos.filter((p) => p.categoria === filtroActivo);
      renderCatalogo(filtrados);
    });
  });
}

// =============================================
// CARRITO
// =============================================

function agregarAlCarrito(id) {
  const producto = productos.find((p) => p.id === id);
  if (!producto) return;

  const existe = carrito.find((item) => item.id === id);
  if (existe) {
    existe.cantidad += 1;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }

  guardarCarrito();
  actualizarContadorCarrito();
  mostrarToast(`${producto.nombre} agregado al carrito`);
}

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

function toggleCarrito() {
  const panel = document.getElementById("cart-panel");
  panel.classList.toggle("open");
  renderCarritoPanel();
}

function renderCarritoPanel() {
  const lista = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!lista) return;

  if (carrito.length === 0) {
    lista.innerHTML = `<p class="cart-empty">Tu carrito está vacío.</p>`;
    totalEl.textContent = "S/ 0.00";
    return;
  }

  lista.innerHTML = carrito
    .map(
      (item) => `
    <div class="cart-item">
      <img src="${item.imagen}" alt="${item.nombre}" />
      <div class="cart-item-info">
        <span class="cart-item-name">${item.nombre}</span>
        <span class="cart-item-price">S/ ${item.precio.toFixed(2)} × ${item.cantidad}</span>
      </div>
      <button class="cart-item-remove" onclick="eliminarDelCarrito(${item.id})">×</button>
    </div>
  `
    )
    .join("");

  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  totalEl.textContent = `S/ ${total.toFixed(2)}`;
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter((item) => item.id !== id);
  guardarCarrito();
  actualizarContadorCarrito();
  renderCarritoPanel();
}

// =============================================
// INIT
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  renderCatalogo(productos);
  initFiltros();
  actualizarContadorCarrito();

  document.getElementById("cart-overlay")?.addEventListener("click", toggleCarrito);
});