import { supabase } from "./supabase-client.js";

const form = document.getElementById("contact-form");
const submitBtn = document.getElementById("submit-btn");
const feedback = document.getElementById("form-feedback");

function showFeedback(type, message) {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
  feedback.style.display = "block";
  setTimeout(() => {
    feedback.style.display = "none";
  }, 5000);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("email").value.trim();
  const asunto = document.getElementById("asunto").value.trim();
  const mensaje = document.getElementById("mensaje").value.trim();

  if (!nombre || !email || !asunto || !mensaje) {
    showFeedback("error", "Completa todos los campos antes de enviar.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  const { error } = await supabase.from("mensajes").insert([
    {
      nombre,
      email,
      asunto,
      mensaje,
      leido: false,
      creado_en: new Date().toISOString(),
    },
  ]);

  submitBtn.disabled = false;
  submitBtn.textContent = "Enviar mensaje";

  if (error) {
    console.error(error);
    showFeedback("error", "Hubo un error al enviar. Intenta de nuevo.");
  } else {
    showFeedback("success", "¡Mensaje enviado! Te responderemos pronto.");
    form.reset();
  }
});