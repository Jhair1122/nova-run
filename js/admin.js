// =============================================
// APEXKICKS — ADMIN PANEL
// =============================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ——— CONFIGURACIÓN (mismos valores que supabase-client.js) ———
const SUPABASE_URL = "https://tmqpawykchvrfjzxghhu.supabase.co";
const SUPABASE_ANON_KEY = "TU_ANON_KEY_AQUI";
// ——————————————————————————————————————————————————————————

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TALLAS_DISPONIBLES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];

// =============================================
// ESTADO
// =============================================
let productosCache = [];
let mensajesCache = [];
let editandoId = null;       // null = nuevo, uuid = editar
let filtroMensajes = "todos";

// =============================================
// AUTH
// =============================================
async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) mostrarDashboard(session.user.email);
}

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const pass  = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.style.display = "none";

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    errEl.textContent = "Credenciales incorrectas. Verifica tu email y contraseña.";
    errEl.style.display = "block";
    return;
  }
  mostrarDashboard(data.user.email);
});

// Enter en login
document.getElementById("login-password").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await sb.auth.signOut();
  location.reload();
});

function mostrarDashboard(email) {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("dashboard").style.display = "flex";
  document.getElementById("admin-email-label").textContent = email;
  cargarProductos();
  cargarMensajes();
}

// =============================================
// TABS
// =============================================
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// =============================================
// PRODUCTOS — CARGAR
// =============================================
async function cargarProductos() {
  const { data, error } = await sb.from("productos").select("*").order("creado_en", { ascending: false });
  if (error) { console.error(error); return; }

  productosCache = data || [];
  renderTablaProductos(productosCache);
  actualizarStats();
}

function actualizarStats() {
  document.getElementById("stat-total").textContent  = productosCache.length;
  document.getElementById("stat-nuevos").textContent = productosCache.filter(p => p.nuevo).length;
  document.getElementById("stat-ofertas").textContent = productosCache.filter(p => p.precio_antes).length;
}

function renderTablaProductos(lista) {
  const tbody = document.getElementById("tbody-productos");
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No hay productos. Crea el primero.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => `
    <tr>
      <td>
        ${p.imagen
          ? `<img src="${escHtml(p.imagen)}" class="thumb" alt="${escHtml(p.nombre)}" onerror="this.style.display='none'" />`
          : `<div class="thumb-placeholder">👟</div>`}
      </td>
      <td><strong>${escHtml(p.nombre)}</strong></td>
      <td>${escHtml(p.categoria)}</td>
      <td>S/ ${Number(p.precio).toFixed(2)}</td>
      <td>${p.precio_antes ? `S/ ${Number(p.precio_antes).toFixed(2)}` : "—"}</td>
      <td style="font-size:0.75rem; color:var(--gray-1)">${(p.tallas || []).join(", ") || "—"}</td>
      <td>
        ${p.nuevo      ? '<span class="tag tag-new">Nuevo</span>' : ""}
        ${p.precio_antes ? '<span class="tag tag-sale">Oferta</span>' : ""}
        ${p.destacado  ? '<span class="tag tag-featured">Dest.</span>' : ""}
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-icon" onclick="abrirEditar('${p.id}')">✏️ Editar</button>
          <button class="btn btn-icon danger" onclick="confirmarEliminar('${p.id}', '${escHtml(p.nombre)}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// Búsqueda en tiempo real
document.getElementById("search-productos").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  const filtrados = productosCache.filter(p =>
    p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)
  );
  renderTablaProductos(filtrados);
});

// =============================================
// PRODUCTOS — MODAL NUEVO / EDITAR
// =============================================

// Generar chips de tallas
function renderTallas(seleccionadas = []) {
  const grid = document.getElementById("tallas-grid");
  grid.innerHTML = TALLAS_DISPONIBLES.map(t => `
    <div class="talla-chip ${seleccionadas.includes(t) ? "selected" : ""}" data-talla="${t}">${t}</div>
  `).join("");

  grid.querySelectorAll(".talla-chip").forEach(chip => {
    chip.addEventListener("click", () => chip.classList.toggle("selected"));
  });
}

function getTallasSeleccionadas() {
  return [...document.querySelectorAll(".talla-chip.selected")]
    .map(c => parseInt(c.dataset.talla));
}

// Subida de imagen a Supabase Storage
const BUCKET_NAME = "productos"; // nombre del bucket en Supabase Storage

document.getElementById("f-imagen-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const status = document.getElementById("upload-status");
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    status.textContent = "La imagen no debe superar 5MB.";
    status.className = "upload-status error";
    e.target.value = "";
    return;
  }

  status.textContent = "Subiendo imagen…";
  status.className = "upload-status loading";

  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await sb.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    status.textContent = "Error al subir: " + uploadError.message;
    status.className = "upload-status error";
    e.target.value = "";
    return;
  }

  const { data: urlData } = sb.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;

  document.getElementById("f-imagen").value = publicUrl;
  document.getElementById("img-preview").src = publicUrl;
  document.getElementById("img-preview-wrap").style.display = "block";

  status.textContent = "✓ Imagen subida correctamente";
  status.className = "upload-status success";
});

function abrirNuevo() {
  editandoId = null;
  document.getElementById("modal-title").textContent = "Nuevo producto";
  document.getElementById("f-nombre").value = "";
  document.getElementById("f-categoria").value = "";
  document.getElementById("f-color").value = "";
  document.getElementById("f-precio").value = "";
  document.getElementById("f-precio-antes").value = "";
  document.getElementById("f-descripcion").value = "";
  document.getElementById("f-imagen").value = "";
  document.getElementById("f-imagen-file").value = "";
  document.getElementById("upload-status").textContent = "";
  document.getElementById("upload-status").className = "upload-status";
  document.getElementById("f-nuevo").checked = false;
  document.getElementById("f-destacado").checked = false;
  document.getElementById("img-preview-wrap").style.display = "none";
  document.getElementById("modal-error").style.display = "none";
  renderTallas([]);
  document.getElementById("modal-overlay").style.display = "flex";
}

window.abrirEditar = function(id) {
  const p = productosCache.find(x => x.id === id);
  if (!p) return;
  editandoId = id;
  document.getElementById("modal-title").textContent = "Editar producto";
  document.getElementById("f-nombre").value = p.nombre || "";
  document.getElementById("f-categoria").value = p.categoria || "";
  document.getElementById("f-color").value = p.color || "";
  document.getElementById("f-precio").value = p.precio || "";
  document.getElementById("f-precio-antes").value = p.precio_antes || "";
  document.getElementById("f-descripcion").value = p.descripcion || "";
  document.getElementById("f-imagen").value = p.imagen || "";
  document.getElementById("f-imagen-file").value = "";
  document.getElementById("upload-status").textContent = p.imagen ? "Imagen actual cargada" : "";
  document.getElementById("upload-status").className = "upload-status";
  document.getElementById("f-nuevo").checked = !!p.nuevo;
  document.getElementById("f-destacado").checked = !!p.destacado;
  document.getElementById("modal-error").style.display = "none";

  const wrap = document.getElementById("img-preview-wrap");
  if (p.imagen) {
    document.getElementById("img-preview").src = p.imagen;
    wrap.style.display = "block";
  } else {
    wrap.style.display = "none";
  }

  renderTallas(p.tallas || []);
  document.getElementById("modal-overlay").style.display = "flex";
};

document.getElementById("btn-nuevo-producto").addEventListener("click", abrirNuevo);

function cerrarModal() {
  document.getElementById("modal-overlay").style.display = "none";
}
document.getElementById("modal-close").addEventListener("click", cerrarModal);
document.getElementById("btn-cancelar-modal").addEventListener("click", cerrarModal);

document.getElementById("btn-guardar-producto").addEventListener("click", async () => {
  const errEl = document.getElementById("modal-error");
  errEl.style.display = "none";

  const nombre     = document.getElementById("f-nombre").value.trim();
  const categoria  = document.getElementById("f-categoria").value;
  const color      = document.getElementById("f-color").value.trim();
  const precio     = parseFloat(document.getElementById("f-precio").value);
  const precioAnt  = document.getElementById("f-precio-antes").value;
  const descripcion = document.getElementById("f-descripcion").value.trim();
  const imagen     = document.getElementById("f-imagen").value.trim();
  const nuevo      = document.getElementById("f-nuevo").checked;
  const destacado  = document.getElementById("f-destacado").checked;
  const tallas     = getTallasSeleccionadas();

  if (!nombre || !categoria || isNaN(precio) || precio <= 0 || !descripcion || !imagen) {
    errEl.textContent = "Completa los campos obligatorios: nombre, categoría, precio, descripción e imagen.";
    errEl.style.display = "block";
    return;
  }

  const payload = {
    nombre,
    categoria,
    color,
    precio,
    precio_antes: precioAnt ? parseFloat(precioAnt) : null,
    descripcion,
    imagen,
    tallas,
    nuevo,
    destacado,
  };

  let error;
  if (editandoId) {
    ({ error } = await sb.from("productos").update(payload).eq("id", editandoId));
  } else {
    ({ error } = await sb.from("productos").insert([{ ...payload, creado_en: new Date().toISOString() }]));
  }

  if (error) {
    errEl.textContent = "Error al guardar: " + error.message;
    errEl.style.display = "block";
    return;
  }

  cerrarModal();
  cargarProductos();
});

// =============================================
// PRODUCTOS — ELIMINAR
// =============================================
let pendingDeleteId = null;

window.confirmarEliminar = function(id, nombre) {
  pendingDeleteId = id;
  document.getElementById("confirm-text").textContent =
    `¿Eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`;
  document.getElementById("confirm-overlay").style.display = "flex";
};

document.getElementById("confirm-no").addEventListener("click", () => {
  document.getElementById("confirm-overlay").style.display = "none";
  pendingDeleteId = null;
});

document.getElementById("confirm-yes").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  const { error } = await sb.from("productos").delete().eq("id", pendingDeleteId);
  if (!error) {
    document.getElementById("confirm-overlay").style.display = "none";
    pendingDeleteId = null;
    cargarProductos();
  }
});

// =============================================
// MENSAJES — CARGAR
// =============================================
async function cargarMensajes() {
  const { data, error } = await sb.from("mensajes").select("*").order("creado_en", { ascending: false });
  if (error) { console.error(error); return; }

  mensajesCache = data || [];
  actualizarBadgeMensajes();
  renderTablaMensajes();
}

function actualizarBadgeMensajes() {
  const noLeidos = mensajesCache.filter(m => !m.leido).length;
  const badge = document.getElementById("badge-mensajes");
  badge.textContent = noLeidos;
  badge.style.display = noLeidos > 0 ? "inline-block" : "none";
}

function renderTablaMensajes() {
  let lista = mensajesCache;
  if (filtroMensajes === "no-leidos") lista = lista.filter(m => !m.leido);
  if (filtroMensajes === "leidos")    lista = lista.filter(m => m.leido);

  const q = document.getElementById("search-mensajes").value.toLowerCase();
  if (q) lista = lista.filter(m =>
    m.nombre.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  );

  const tbody = document.getElementById("tbody-mensajes");
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No hay mensajes en esta categoría.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(m => `
    <tr class="${m.leido ? "" : "tr-no-leido"}">
      <td>
        <span class="${m.leido ? "badge-leido" : "badge-no-leido"}" title="${m.leido ? "Leído" : "No leído"}"></span>
      </td>
      <td>${escHtml(m.nombre)}</td>
      <td style="color:var(--gray-1)">${escHtml(m.email)}</td>
      <td>${escHtml(m.asunto)}</td>
      <td style="color:var(--gray-1); white-space:nowrap">${formatFecha(m.creado_en)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-icon" onclick="abrirMensaje('${m.id}')">👁️ Ver</button>
          ${!m.leido ? `<button class="btn btn-icon" onclick="marcarLeido('${m.id}')">✓ Leído</button>` : ""}
          <button class="btn btn-icon danger" onclick="eliminarMensaje('${m.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// Filtros de mensajes
document.querySelectorAll(".filter-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filtroMensajes = btn.dataset.filter;
    renderTablaMensajes();
  });
});

document.getElementById("search-mensajes").addEventListener("input", renderTablaMensajes);

// Marcar todos como leídos
document.getElementById("btn-marcar-todos").addEventListener("click", async () => {
  const noLeidos = mensajesCache.filter(m => !m.leido).map(m => m.id);
  if (noLeidos.length === 0) return;
  await sb.from("mensajes").update({ leido: true }).in("id", noLeidos);
  cargarMensajes();
});

window.marcarLeido = async function(id) {
  await sb.from("mensajes").update({ leido: true }).eq("id", id);
  cargarMensajes();
};

window.eliminarMensaje = async function(id) {
  if (!confirm("¿Eliminar este mensaje permanentemente?")) return;
  await sb.from("mensajes").delete().eq("id", id);
  cargarMensajes();
};

// =============================================
// MENSAJES — VER DETALLE
// =============================================
window.abrirMensaje = async function(id) {
  const m = mensajesCache.find(x => x.id === id);
  if (!m) return;

  // Marcar como leído automáticamente
  if (!m.leido) {
    await sb.from("mensajes").update({ leido: true }).eq("id", id);
    m.leido = true;
    actualizarBadgeMensajes();
    renderTablaMensajes();
  }

  document.getElementById("modal-mensaje-body").innerHTML = `
    <div class="msg-meta">
      <div class="msg-field">
        <span class="msg-field-label">De</span>
        <span class="msg-field-val">${escHtml(m.nombre)}</span>
      </div>
      <div class="msg-field">
        <span class="msg-field-label">Email</span>
        <span class="msg-field-val">${escHtml(m.email)}</span>
      </div>
      <div class="msg-field">
        <span class="msg-field-label">Asunto</span>
        <span class="msg-field-val">${escHtml(m.asunto)}</span>
      </div>
      <div class="msg-field">
        <span class="msg-field-label">Fecha</span>
        <span class="msg-field-val">${formatFecha(m.creado_en, true)}</span>
      </div>
    </div>
    <div class="msg-cuerpo">${escHtml(m.mensaje)}</div>
  `;

  document.getElementById("btn-responder-email").href =
    `mailto:${m.email}?subject=Re: ${encodeURIComponent(m.asunto)}`;

  document.getElementById("modal-mensaje-overlay").style.display = "flex";
};

document.getElementById("modal-mensaje-close").addEventListener("click", () => {
  document.getElementById("modal-mensaje-overlay").style.display = "none";
});
document.getElementById("btn-cerrar-mensaje").addEventListener("click", () => {
  document.getElementById("modal-mensaje-overlay").style.display = "none";
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

function formatFecha(iso, larga = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (larga) return d.toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" });
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

// =============================================
// INIT
// =============================================
checkSession();
