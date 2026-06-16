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
    const tallasObj = (p.tallas && typeof p.tallas === "object") ? p.tallas : {};
    const disponibles = Object.entries(tallasObj)
      .map(([talla, stock]) => [parseInt(talla), Number(stock)])
      .filter(([, stock]) => stock > 0)
      .sort((a, b) => a[0] - b[0]);
    const sinStock = disponibles.length === 0;

    const card = document.createElement("article");
    card.className = `product-card ${index === 0 && filtroActivo === "Todos" ? "featured" : ""}`;
    card.dataset.productoId = p.id;
    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${p.imagen}" alt="${escHtml(p.nombre)}" loading="lazy" />
        ${p.nuevo ? '<span class="badge badge-new">NUEVO</span>' : ""}
        ${p.precio_antes ? '<span class="badge badge-sale">OFERTA</span>' : ""}
        ${sinStock ? '<span class="badge badge-sale" style="background:var(--gray-2)">AGOTADO</span>' : ""}
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
              ? '<option>Sin stock</option>'
              : disponibles.map(([t, stock]) => `<option value="${t}" data-stock="${stock}">Talla ${t}</option>`).join("")}
          </select>
          <button class="btn-add" ${sinStock ? "disabled" : ""}>
            ${sinStock ? "Agotado" : "Agregar"}
          </button>
        </div>
        <div class="stock-info"></div>
      </div>
    `;

    if (!sinStock) {
      const select = card.querySelector(".talla-select");
      const btn = card.querySelector(".btn-add");
      const stockInfo = card.querySelector(".stock-info");

      const actualizarStockInfo = () => {
        const stock = parseInt(select.selectedOptions[0]?.dataset.stock || "0");
        stockInfo.className = "stock-info";
        if (stock <= 2) {
          stockInfo.textContent = `¡Solo ${stock} unidad${stock === 1 ? "" : "es"} disponible${stock === 1 ? "" : "s"}!`;
          stockInfo.classList.add("low");
        } else {
          stockInfo.textContent = `${stock} unidades disponibles`;
        }
      };
      actualizarStockInfo();
      select.addEventListener("change", actualizarStockInfo);

      btn.addEventListener("click", () => {
        agregarAlPedido(p.id, parseInt(select.value));
      });
    } else {
      card.querySelector(".stock-info").textContent = "Vuelve a revisar pronto, este modelo está agotado.";
      card.querySelector(".stock-info").classList.add("out");
    }

    grid.appendChild(card);
  });

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
// Tilt 3D eliminado — solo hover de sombra/color via CSS

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

  const stockDisponible = Number(producto.tallas?.[String(talla)] || 0);
  if (stockDisponible <= 0) {
    mostrarToast("Esa talla ya no tiene stock disponible");
    renderCatalogo(filtroActivo === "Todos" ? productosCache : productosCache.filter(p => p.categoria === filtroActivo));
    return;
  }

  const existe = pedido.find(item => item.id === productoId && item.talla === talla);
  const cantidadEnPedido = existe ? existe.cantidad : 0;

  if (cantidadEnPedido + 1 > stockDisponible) {
    mostrarToast(`Solo quedan ${stockDisponible} unidad(es) de esta talla`);
    return;
  }

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
        const producto = productosCache.find(p => p.id === pedido[i].id);
        const stockDisponible = Number(producto?.tallas?.[String(pedido[i].talla)] || 0);
        if (pedido[i].cantidad + 1 > stockDisponible) {
          mostrarToast(`Solo quedan ${stockDisponible} unidad(es) de esta talla`);
          return;
        }
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

  const { data: pedidoId, error } = await supabase.rpc("crear_pedido", {
    p_cliente_nombre: nombre,
    p_cliente_telefono: telefono,
    p_cliente_direccion: direccion,
    p_cliente_referencia: referencia,
    p_items: itemsPedido,
    p_total: total,
  });

  btn.disabled = false;
  btn.textContent = "Continuar →";

  if (error || !pedidoId) {
    if (error && error.message && error.message.includes("SIN_STOCK")) {
      errEl.textContent = "Una de las tallas seleccionadas ya no tiene stock disponible (alguien más la reservó). Por favor revisa tu pedido y elige otra talla o cantidad.";
    } else {
      errEl.textContent = "No se pudo registrar el pedido. Intenta de nuevo.";
    }
    errEl.style.display = "block";
    console.error(error);
    // Refrescar catálogo por si el stock cambió
    cargarProductos();
    return;
  }

  const codigo = pedidoId.slice(0, 8).toUpperCase();

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

  const DIVIDER = "\u2500".repeat(24); // línea divisoria ─────────────────────

  const itemsTexto = cliente.items
    .map((item, i) =>
      `${i + 1}. ${item.nombre}\n` +
      `    Talla ${item.talla}  x${item.cantidad}  —  S/ ${(item.precio * item.cantidad).toFixed(2)}`
    )
    .join("\n");

  const mensaje =
`*PEDIDO #${codigo}*
_NOVARUN_
${DIVIDER}
*Cliente:* ${cliente.nombre}
*Teléfono:* ${cliente.telefono}
*Dirección:* ${cliente.direccion}${cliente.referencia ? `\n*Referencia:* ${cliente.referencia}` : ""}
${DIVIDER}
*Productos*
${itemsTexto}
${DIVIDER}
*TOTAL: S/ ${cliente.total.toFixed(2)}*
${DIVIDER}
*Pago por Yape*
Enviaré S/ ${cliente.total.toFixed(2)} a *${YAPE_NUMERO}* (${YAPE_NOMBRE}).
Adjuntaré la captura del pago en este chat indicando el código *#${codigo}*.
${DIVIDER}
*Envío:* Coordinamos por Shalom u otra agencia a mi destino.`;

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
// MENÚ HAMBURGUESA (móvil)
// =============================================
function initHamburger() {
  const hamburger = document.getElementById("hamburger");
  const navMobile = document.getElementById("nav-mobile");
  if (!hamburger || !navMobile) return;

  const mq = window.matchMedia("(max-width: 768px)");

  const toggleVisibility = (e) => {
    hamburger.style.display = e.matches ? "flex" : "none";
    if (!e.matches) {
      hamburger.classList.remove("open");
      navMobile.classList.remove("open");
    }
  };

  mq.addEventListener("change", toggleVisibility);
  toggleVisibility(mq);

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("open");
    navMobile.classList.toggle("open");
  });

  // Cierra el menú al hacer clic en un enlace
  navMobile.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("open");
      navMobile.classList.remove("open");
    });
  });
}

// =============================================
// ZAPATILLA HERO — INTERACCIÓN 3D
// =============================================
function initSneaker3D() {
  const scene   = document.getElementById("sneaker-scene");
  const wrapper = document.getElementById("sneaker-wrapper");
  const light   = wrapper?.querySelector(".sneaker-light");
  if (!scene || !wrapper) return;

  const MAX_ROT  = 14;   // grados máximos de rotación
  const LIFT     = 12;   // px de elevación al hover
  let animFrame  = null;
  let targetRX   = 0, targetRY = 0;
  let currentRX  = 0, currentRY = 0;
  let isHovering = false;

  // Lerp suavizado
  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    currentRX = lerp(currentRX, targetRX, 0.10);
    currentRY = lerp(currentRY, targetRY, 0.10);

    wrapper.style.animation = "none";
    wrapper.style.transform =
      `translateY(${isHovering ? -LIFT : 0}px) ` +
      `rotateX(${currentRX}deg) rotateY(${currentRY}deg)`;

    animFrame = requestAnimationFrame(tick);
  }

// Función común: calcula rotación + destello a partir de coords de puntero
  function actualizarDesdePuntero(clientX, clientY) {
    const rect = scene.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width  - 0.5; // -0.5 a 0.5
    const ny = (clientY - rect.top)  / rect.height - 0.5;

    targetRY =  nx * MAX_ROT * 2;
    targetRX = -ny * MAX_ROT;

    if (light) {
      const lx = Math.round((nx + 0.5) * 100);
      const ly = Math.round((ny + 0.5) * 100);
      light.style.background =
        `radial-gradient(circle at ${lx}% ${ly}%, rgba(255,255,255,0.22) 0%, transparent 55%)`;
    }
  }

  function resetTilt() {
    isHovering = false;
    targetRX = 0;
    targetRY = 0;
    setTimeout(() => {
      if (!isHovering) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
        wrapper.style.animation = "";
        wrapper.style.transform = "";
        if (light) light.style.background = "";
      }
    }, 800);
  }

  // Mouse en escritorio
  scene.addEventListener("mousemove", (e) => {
    isHovering = true;
    if (!animFrame) tick();
    actualizarDesdePuntero(e.clientX, e.clientY);
  });

  scene.addEventListener("mouseenter", () => {
    isHovering = true;
    if (!animFrame) tick();
  });

  scene.addEventListener("mouseleave", resetTilt);

  // Toque/arrastre en móvil (sin giroscopio)
  scene.addEventListener("touchstart", (e) => {
    isHovering = true;
    if (!animFrame) tick();
    const t = e.touches[0];
    if (t) actualizarDesdePuntero(t.clientX, t.clientY);
  }, { passive: true });

  scene.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    if (t) actualizarDesdePuntero(t.clientX, t.clientY);
  }, { passive: true });

  scene.addEventListener("touchend", resetTilt);
  scene.addEventListener("touchcancel", resetTilt);

  // Inicia el loop idle
  tick();
}

// =============================================
// TIEMPO REAL — stock/productos cambian sin recargar
// =============================================
function initRealtime() {
  supabase
    .channel("productos-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "productos" }, (payload) => {
      if (payload.eventType === "DELETE") {
        productosCache = productosCache.filter(p => p.id !== payload.old.id);
      } else {
        const idx = productosCache.findIndex(p => p.id === payload.new.id);
        if (idx >= 0) {
          productosCache[idx] = payload.new;
        } else {
          productosCache.unshift(payload.new);
        }
      }

      const filtrados = filtroActivo === "Todos"
        ? productosCache
        : productosCache.filter(p => p.categoria === filtroActivo);
      renderCatalogo(filtrados);
    })
    .subscribe();
}

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  actualizarContadorPedido();
  initHamburger();
  initSneaker3D();
  initRealtime();
  document.getElementById("cart-overlay")?.addEventListener("click", toggleCarrito);
});
