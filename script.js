// 🔐 IMPORTS
import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },
    locale: "es",
    selectable: true,
    navLinks: true,
    nowIndicator: true,
    editable: false,
    height: "auto",
    slotMinTime: "08:00:00",
    slotMaxTime: "22:00:00",
    slotDuration: "01:00:00",
    slotLabelFormat: {
      hour: "2-digit",
      minute: "2-digit",
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
    }
  });
  calendar.render();

  const btnAbrirForm = document.getElementById("btnReservarAhora");
  const form = document.getElementById("formReservaPopup");
  const btnOxxo = document.getElementById("btnOxxo");
  const btnMP = document.getElementById("btnMP");

  if (btnAbrirForm && form) {
    btnAbrirForm.addEventListener("click", () => {
      form.style.display = "block";
    });
  }

  if (btnOxxo)
    btnOxxo.addEventListener("click", () => procesarReserva("OXXO"));
  if (btnMP)
    btnMP.addEventListener("click", () => procesarReserva("MercadoPago"));

  async function procesarReserva(metodoPago) {
    const fecha = document.getElementById("fecha").value;
    const hora = document.getElementById("hora").value;
    const titulo = document.getElementById("titulo").value;
    const acepta = document.getElementById("aceptaPrivacidad").checked;

    if (!acepta) return alert("Debés aceptar el aviso de privacidad.");
    if (!fecha || !hora || !titulo) return alert("Completá todos los campos.");

    const start = `${fecha}T${hora}:00`;
    const endHour = parseInt(hora.split(":")[0]) + 1;
    const end = `${fecha}T${String(endHour).padStart(2, "0")}:00:00`;

    const reservasExistentes = await obtenerReservasDesdeFirebase();
    const yaReservado = reservasExistentes.some((r) => r.start === start);
    if (yaReservado) return alert("Ese horario ya está reservado.");

    await addDoc(collection(db, "reservas"), {
      title: titulo,
      start: start,
      end: end,
      color: "#4caf50"
    });

    form.innerHTML = `
      <h3>Reserva pendiente</h3>
      <p>Tu horario fue apartado. Para confirmarla, pagá mediante <strong>${metodoPago}</strong>.</p>
      ${
        metodoPago === "OXXO"
          ? `<p>Te enviaremos los datos de pago por WhatsApp. Luego enviá el comprobante.</p>`
          : `<a href="https://www.mercadopago.com.ar/checkout" target="_blank" class="btn-verde">Pagar por MercadoPago</a>`
      }
      <p>Una vez abonado, envianos el comprobante por WhatsApp para confirmar tu lugar.</p>
      <button onclick="location.reload()">Cancelar</button>
    `;
  }

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

  const btnLogout = document.getElementById("btnLogout");
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      btnLogout.style.display = "inline-block";
      document.getElementById("adminReservas").style.display = "block";
      document.getElementById("bloqueoManual").style.display = "block";

      const tablaBody = document.querySelector("#tablaReservas tbody");
      tablaBody.innerHTML = "";

      const reservas = await getDocs(collection(db, "reservas"));
      reservas.forEach((docSnap) => {
        const reserva = docSnap.data();
        const fila = document.createElement("tr");

        fila.innerHTML = `
          <td>${reserva.title}</td>
          <td>${reserva.start}</td>
          <td>${reserva.end}</td>
          <td>
            <button onclick="editarReserva('${docSnap.id}', '${reserva.title}', '${reserva.start}', '${reserva.end}')">✏️</button>
            <button onclick="eliminarReserva('${docSnap.id}')">🗑️</button>
          </td>
        `;
        tablaBody.appendChild(fila);
      });
    } else {
      btnLogout.style.display = "none";
    }

    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        signOut(auth).then(() => location.reload());
      });
    }
  });
});

// 🔁 FUNCIONES FIRESTORE
async function obtenerReservasDesdeFirebase() {
  const snapshot = await getDocs(collection(db, "reservas"));
  const reservas = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    reservas.push({
      id: doc.id,
      title: data.title,
      start: data.start,
      end: data.end,
      backgroundColor: data.color || "#2196f3",
      borderColor: data.color || "#2196f3"
    });
  });
  return reservas;
}

window.eliminarReserva = async function (id) {
  if (confirm("¿Eliminar esta reserva?")) {
    await deleteDoc(doc(db, "reservas", id));
    alert("Reserva eliminada.");
    location.reload();
  }
};

window.editarReserva = async function (id, title, start, end) {
  const nuevoTitulo = prompt("Editar título de la reserva:", title);
  if (nuevoTitulo) {
    await updateDoc(doc(db, "reservas", id), { title: nuevoTitulo });
    alert("Reserva actualizada.");
    location.reload();
  }
};

window.bloquearHorario = async function () {
  const datetime = document.getElementById("bloqueoFechaHora").value;
  if (!datetime) return alert("Seleccioná un horario.");

  const endHour = parseInt(datetime.split("T")[1].split(":")[0]) + 1;
  const end = `${datetime.split("T")[0]}T${String(endHour).padStart(2, "0")}:00:00`;

  await addDoc(collection(db, "reservas"), {
    title: "Bloqueado",
    start: datetime,
    end: end,
    color: "#f44336"
  });

  alert("Horario bloqueado correctamente.");
  location.reload();
};
