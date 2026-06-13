// =============================================
// APEXKICKS — TIENDA PÚBLICA
// Catálogo dinámico + "Mi Pedido" + checkout vía WhatsApp/Yape
// =============================================

import { supabase } from "./supabase-client.js";

// =============================================
// ⚙️ CONFIGURACIÓN — EDITA ESTOS DATOS
// =============================================
const WHATSAPP_NUMERO = "51900907810"; // código de país + número, sin + ni espacios
const YAPE_NUMERO = "900 907 810";     // número que se muestra al cliente
const YAPE_NOMBRE = "Jhair Urbina";    // nombre del titular de Yape

// =============================================
// ESTADO
// =============================================
let productosCache = [];
let pedido = JSON.parse(localStorage.getItem("pedido")) || [];
let filtroActivo = "Todos";

// =============================================
// CARGAR PRODUCTOS DESDE SUPABASE
// =============================================
async function cargarProductos() {
  const grid = document.getElementById("catalogo-grid");
  if (!grid) return;

  grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1">Cargando catálogo…</p>`;

  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error || !data) {
    grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1">No se pudo cargar el catálogo. Intenta más tarde.</p>`;
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
    grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1">No hay productos en esta categoría.</p>`;
    return;
  }

  lista.forEach((p, index) => {
    const tallas = (p.tallas && p.tallas.length > 0) ? p.tallas : [];
    const sinStock = tallas.length === 0;

    const card = document.createElement("article");
    card.className = `product-card ${index === 0 && filtroActivo === "Todos" ? "featured" : ""}`;
    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${p.imagen}" alt="${escHtml(p.nombre)}" loading="lazy" />
        ${p.nuevo ? '<span class="badge badge-new">NUEVO</span>' : ""}
        ${p.precio_antes ? '<span class="badge badge-sale">OFERTA</span>' : ""}
      </div>
      <div class="product-info">
        <span class="product-cat">${escHtml(p.categoria)}</span>
        <h3 class="product-name">${escHtml(p.nombre)}</h3>
        <p class="product-desc">${escHtml(p.descripcion)}</p>
        <div class="product-price">
          <span class="price-current">S/ ${Number(p.precio).toFixed(2)}</span>
          ${p.precio_antes ? `<span class="price-before">S/ ${Number(p.precio_antes).toFixed(2)}</span>` : ""}
        </div>
        <div class="product-options">
          <select class="talla-select" ${sinStock ? "disabled" : ""}>
            ${sinStock
              ? '<option>Sin tallas</option>'
              : tallas.map(t => `<option value="${t}">Talla ${t}</option>`).join("")}
          </select>
          <button class="btn-add" ${sinStock ? "disabled" : ""}>
            ${sinStock ? "Agotado" : "Agregar"}
          </button>
        </div>
      </div>
    `;

    if (!sinStock) {
      const select = card.querySelector(".talla-select");
      const btn = card.querySelector(".btn-add");
      btn.addEventListener("click", () => {
        agregarAlPedido(p.id, parseInt(select.value));
      });
    }

    grid.appendChild(card);
  });

  initTilt3D();
  initRevealOnScroll();
}

// =============================================
// FILTROS (construidos dinámicamente)
// =============================================
function initFiltros() {
  const container = document.querySelector(".filters");
  if (!container) return;

  const categorias = ["Todos", ...new Set(productosCache.map(p => p.categoria))];

  container.innerHTML = categorias.map(c =>
    `<button class="filter-btn ${c === "Todos" ? "active" : ""}" data-filter="${escHtml(c)}">${escHtml(c)}</button>`
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
// EFECTO 3D TILT EN TARJETAS
// =============================================
function initTilt3D() {
  const cards = document.querySelectorAll(".product-card");
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotateY = ((x - cx) / cx) * 5;
      const rotateX = -((y - cy) / cy) * 5;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

// =============================================
// REVEAL AL HACER SCROLL
// =============================================
function initRevealOnScroll() {
  const targets = document.querySelectorAll(".product-card, .feature-item");
  if (!("IntersectionObserver" in window)) {
    targets.forEach(t => t.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

  targets.forEach(t => observer.observe(t));
}

// =============================================
// PEDIDO (carrito sin pago online)
// =============================================
function agregarAlPedido(productoId, talla) {
  const producto = productosCache.find(p => p.id === productoId);
  if (!producto) return;

  const existe = pedido.find(item => item.id === productoId && item.talla === talla);
  if (existe) {
    existe.cantidad += 1;
  } else {
    pedido.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      imagen: producto.imagen,
      talla,
      cantidad: 1,
    });
  }

  guardarPedido();
  actualizarContadorPedido();
  mostrarToast(`${producto.nombre} (talla ${talla}) agregado a tu pedido`);

  const panel = document.getElementById("cart-panel");
  if (!panel.classList.contains("open")) {
    toggleCarrito();
  } else {
    renderPedidoPanel();
  }
}

window.agregarAlPedido = agregarAlPedido;

function guardarPedido() {
  localStorage.setItem("pedido", JSON.stringify(pedido));
}

function actualizarContadorPedido() {
  const total = pedido.reduce((sum, item) => sum + item.cantidad, 0);
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

window.toggleCarrito = function () {
  const panel = document.getElementById("cart-panel");
  const overlay = document.getElementById("cart-overlay");
  panel.classList.toggle("open");
  overlay.classList.toggle("open");
  renderPedidoPanel();
};

function renderPedidoPanel() {
  const lista = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  const btnIniciar = document.getElementById("btn-iniciar-pedido");
  if (!lista) return;

  if (pedido.length === 0) {
    lista.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-icon">🛍️</span>
        <span>Tu pedido está vacío.<br/>Agrega zapatillas desde el catálogo.</span>
      </div>`;
    totalEl.textContent = "S/ 0.00";
    if (btnIniciar) btnIniciar.disabled = true;
    return;
  }

  if (btnIniciar) btnIniciar.disabled = false;

  lista.innerHTML = pedido.map((item, index) => `
    <div class="cart-item">
      <img src="${item.imagen}" alt="${escHtml(item.nombre)}" />
      <div class="cart-item-info">
        <div class="cart-item-top">
          <span class="cart-item-name">${escHtml(item.nombre)}</span>
          <button class="cart-item-remove" data-index="${index}" title="Quitar">×</button>
        </div>
        <span class="cart-item-talla">Talla ${item.talla}</span>
        <div class="cart-item-bottom">
          <span class="cart-item-price">S/ ${(item.precio * item.cantidad).toFixed(2)}</span>
          <div class="qty-stepper">
            <button class="qty-btn" data-action="dec" data-index="${index}">−</button>
            <span class="qty-value">${item.cantidad}</span>
            <button class="qty-btn" data-action="inc" data-index="${index}">+</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");

  lista.querySelectorAll(".cart-item-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.index);
      pedido.splice(i, 1);
      guardarPedido();
      actualizarContadorPedido();
      renderPedidoPanel();
    });
  });

  lista.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.index);
      const action = btn.dataset.action;
      if (action === "inc") {
        pedido[i].cantidad += 1;
      } else {
        pedido[i].cantidad -= 1;
        if (pedido[i].cantidad <= 0) pedido.splice(i, 1);
      }
      guardarPedido();
      actualizarContadorPedido();
      renderPedidoPanel();
    });
  });

  const total = pedido.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  totalEl.textContent = `S/ ${total.toFixed(2)}`;
}

// =============================================
// CHECKOUT — DATOS DE ENVÍO
// =============================================
const checkoutOverlay = document.getElementById("checkout-overlay");
const confirmOverlay = document.getElementById("confirm-overlay");

document.getElementById("btn-iniciar-pedido")?.addEventListener("click", () => {
  if (pedido.length === 0) return;
  renderResumenPedido();
  checkoutOverlay.classList.add("open");
});

document.getElementById("checkout-close")?.addEventListener("click", () => {
  checkoutOverlay.classList.remove("open");
});

document.getElementById("checkout-cancelar")?.addEventListener("click", () => {
  checkoutOverlay.classList.remove("open");
});

function renderResumenPedido() {
  const cont = document.getElementById("order-summary");
  const total = pedido.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  cont.innerHTML = pedido.map(item => `
    <div class="order-summary-item">
      <span>${escHtml(item.nombre)} · Talla ${item.talla} × ${item.cantidad}</span>
      <span>S/ ${(item.precio * item.cantidad).toFixed(2)}</span>
    </div>
  `).join("") + `
    <div class="order-summary-total">
      <span>Total</span>
      <span>S/ ${total.toFixed(2)}</span>
    </div>
  `;
}

// =============================================
// ENVIAR PEDIDO → SUPABASE + WHATSAPP
// =============================================
document.getElementById("checkout-enviar")?.addEventListener("click", async () => {
  const errEl = document.getElementById("checkout-error");
  errEl.style.display = "none";

  const nombre = document.getElementById("ck-nombre").value.trim();
  const telefono = document.getElementById("ck-telefono").value.trim();
  const direccion = document.getElementById("ck-direccion").value.trim();
  const referencia = document.getElementById("ck-referencia").value.trim();

  if (!nombre || !telefono || !direccion) {
    errEl.textContent = "Completa tu nombre, teléfono y dirección de entrega.";
    errEl.style.display = "block";
    return;
  }

  const total = pedido.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const itemsPedido = [...pedido];

  const btn = document.getElementById("checkout-enviar");
  btn.disabled = true;
  btn.textContent = "Enviando...";

  const { data, error } = await supabase
    .from("pedidos")
    .insert([{
      cliente_nombre: nombre,
      cliente_telefono: telefono,
      cliente_direccion: direccion,
      cliente_referencia: referencia,
      items: itemsPedido,
      total,
      metodo_pago: "Yape",
      estado: "pendiente",
      creado_en: new Date().toISOString(),
    }])
    .select()
    .single();

  btn.disabled = false;
  btn.textContent = "Continuar →";

  if (error || !data) {
    errEl.textContent = "No se pudo registrar el pedido. Intenta de nuevo.";
    errEl.style.display = "block";
    console.error(error);
    return;
  }

  const codigo = data.id.slice(0, 8).toUpperCase();

  mostrarConfirmacion(codigo, {
    nombre, telefono, direccion, referencia, total, items: itemsPedido,
  });

  // Limpiar pedido y cerrar checkout
  pedido = [];
  guardarPedido();
  actualizarContadorPedido();
  renderPedidoPanel();
  checkoutOverlay.classList.remove("open");

  const panel = document.getElementById("cart-panel");
  const overlay = document.getElementById("cart-overlay");
  panel.classList.remove("open");
  overlay.classList.remove("open");
});

function mostrarConfirmacion(codigo, cliente) {
  document.getElementById("confirm-code").textContent = `#${codigo}`;
  document.getElementById("confirm-code-inline").textContent = `#${codigo}`;
  document.getElementById("confirm-total").textContent = `S/ ${cliente.total.toFixed(2)}`;
  document.getElementById("yape-numero").textContent = YAPE_NUMERO;
  document.getElementById("yape-nombre").textContent = `A nombre de: ${YAPE_NOMBRE}`;

  const itemsTexto = cliente.items
    .map((item, i) => `${i + 1}. ${item.nombre} · Talla ${item.talla} · x${item.cantidad} · S/ ${(item.precio * item.cantidad).toFixed(2)}`)
    .join("\n");

  const mensaje =
`🛍️ *NUEVO PEDIDO #${codigo} — APEXKICKS*

👤 Cliente: ${cliente.nombre}
📞 Teléfono: ${cliente.telefono}
📍 Dirección: ${cliente.direccion}${cliente.referencia ? `\n📝 Referencia: ${cliente.referencia}` : ""}

🧾 *Productos:*
${itemsTexto}

💰 *Total: S/ ${cliente.total.toFixed(2)}*

💳 *Pago por Yape*
Voy a yapear a ${YAPE_NUMERO} (${YAPE_NOMBRE}) y enviaré la captura de mi pago aquí mismo, indicando el código *#${codigo}*.`;

  const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
  document.getElementById("btn-whatsapp").href = url;

  confirmOverlay.classList.add("open");

  // Intentar abrir WhatsApp automáticamente (puede ser bloqueado por el navegador)
  window.open(url, "_blank");
}

document.getElementById("confirm-close")?.addEventListener("click", () => {
  confirmOverlay.classList.remove("open");
});

// =============================================
// UTILIDADES
// =============================================
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  actualizarContadorPedido();
  document.getElementById("cart-overlay")?.addEventListener("click", toggleCarrito);
});
