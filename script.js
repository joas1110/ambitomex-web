// 🔐 IMPORTS
import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', function () {
  // 🗓️ CALENDARIO
  const calendarEl = document.getElementById('calendar');

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    locale: 'es',
    selectable: true,
    navLinks: true,
    nowIndicator: true,
    editable: false,
    height: 'auto',
    slotMinTime: '08:00:00',
    slotMaxTime: '22:00:00',
    slotDuration: '01:00:00',
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    events: async (fetchInfo, successCallback, failureCallback) => {
      try {
        const eventos = await obtenerReservasDesdeFirebase();
        successCallback(eventos);
      } catch (error) {
        console.error("Error cargando eventos:", error);
        failureCallback(error);
      }
    },
    dayCellDidMount: function (info) {
      const fecha = info.date.toISOString().split('T')[0];
      const ocupado = ['2025-07-04', '2025-07-11', '2025-07-18'];

      const icono = document.createElement('span');
      icono.classList.add('estado');
      icono.innerHTML = ocupado.includes(fecha) ? '' : '';
      icono.classList.add(ocupado.includes(fecha) ? 'ocupado' : 'disponible');
      info.el.appendChild(icono);
    }
  });

  calendar.render();

  // 📅 FORMULARIO DE RESERVA
  const btnAbrirForm = document.getElementById("btnReservarAhora");
  const form = document.getElementById("formReservaPopup");
  const btnReservar = document.getElementById("btnReservar");

  if (btnAbrirForm && form && btnReservar) {
    btnAbrirForm.addEventListener("click", () => {
      form.style.display = "block";
    });

    btnReservar.addEventListener("click", async () => {
      const fecha = document.getElementById("fecha").value;
      const hora = document.getElementById("hora").value;
      const titulo = document.getElementById("titulo").value;

      if (!fecha || !hora || !titulo) {
        alert("⚠️ Completá todos los campos.");
        return;
      }

      const start = `${fecha}T${hora}:00`;
      const endHour = parseInt(hora.split(':')[0]) + 1;
      const end = `${fecha}T${String(endHour).padStart(2, '0')}:00:00`;

      const reservasExistentes = await obtenerReservasDesdeFirebase();
      const yaReservado = reservasExistentes.some((res) => res.start === start);

      if (yaReservado) {
        alert("❌ Ese horario ya está reservado. Elegí otro.");
        return;
      }

      // 🔽 MOSTRAR PAGO
      form.innerHTML = `
        <h3>Reserva pendiente de pago</h3>
        <p>Tu horario está disponible. Para confirmar tu reserva, realizá el pago 👇</p>
        <a href="https://www.mercadopago.com.ar/checkout" target="_blank" class="btn-verde">Pagar por MercadoPago</a>
        <p>Una vez realizado el pago, envianos el comprobante por WhatsApp o Instagram y confirmaremos tu reserva manualmente.</p>
        <button onclick="location.reload()">Cancelar</button>
      `;
    });
  } // ← ESTA llave era la que te faltaba
  

  // 🔐 LOGIN
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("✅ Sesión iniciada correctamente");
        location.reload();
      } catch (error) {
        alert("❌ Error: " + error.message);
      }
    });
  }

  // 🔓 LOGOUT + ADMIN
  const btnLogout = document.getElementById("btnLogout");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      btnLogout.style.display = "inline-block";

      const adminSection = document.getElementById("adminReservas");
      adminSection.style.display = "block";

      const tablaBody = document.querySelector("#tablaReservas tbody");
      tablaBody.innerHTML = "";

      obtenerReservasDesdeFirebase().then((reservas) => {
        reservas.forEach((reserva) => {
          const fila = document.createElement("tr");

          const celdaTitulo = document.createElement("td");
          celdaTitulo.textContent = reserva.title;

          const celdaInicio = document.createElement("td");
          celdaInicio.textContent = reserva.start;

          const celdaFin = document.createElement("td");
          celdaFin.textContent = reserva.end;

          fila.appendChild(celdaTitulo);
          fila.appendChild(celdaInicio);
          fila.appendChild(celdaFin);

          tablaBody.appendChild(fila);
        });
      });

    } else {
      btnLogout.style.display = "none";
    }

    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        signOut(auth)
          .then(() => {
            alert("🔒 Sesión cerrada correctamente");
            location.reload();
          })
          .catch((error) => {
            console.error("Error al cerrar sesión:", error);
            alert("❌ Error al cerrar sesión");
          });
      });
    }
  });

  // 🎞️ CARRUSEL
  let slideIndex = 0;
  const slides = document.querySelectorAll(".carrusel-slide");
  const prevBtn = document.querySelector(".carrusel-nav.prev");
  const nextBtn = document.querySelector(".carrusel-nav.next");

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === index);
    });
  }

  if (slides.length > 0) {
    showSlide(slideIndex);

    if (prevBtn && nextBtn) {
      prevBtn.addEventListener("click", () => {
        slideIndex = (slideIndex - 1 + slides.length) % slides.length;
        showSlide(slideIndex);
      });

      nextBtn.addEventListener("click", () => {
        slideIndex = (slideIndex + 1) % slides.length;
        showSlide(slideIndex);
      });

      setInterval(() => {
        slideIndex = (slideIndex + 1) % slides.length;
        showSlide(slideIndex);
      }, 5000);
    }
  }
});

// 🔁 FUNCIONES FIRESTORE
async function obtenerReservasDesdeFirebase() {
  const snapshot = await getDocs(collection(db, "reservas"));
  const reservas = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    reservas.push({
      title: data.title,
      start: data.start,
      end: data.end,
      backgroundColor: data.color || "#2196f3",
      borderColor: data.color || "#2196f3"
    });
  });

  return reservas;
}

function mostrarFormularioReserva() {
  const popup = document.getElementById('formReservaPopup');
  if (popup) popup.style.display = 'block';
}
