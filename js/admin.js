// js/admin.js

const CODIGO_CORRECTO = "1234";

// Variables para controlar la acción que se autoriza ('agregar' o 'eliminar')
let accionPendiente = null; 
let eventoTemporal = null;
let idEliminarTemporal = null;

// Eventos de prueba iniciales por si LocalStorage está vacío
const eventosInicialesAdmin = [
    {
        id: 1,
        titulo: "Ceremonia de Juramento a la Bandera",
        fecha: "2026-09-26",
        hora: "08:30 AM",
        lugar: "Patio Principal de la Institución",
        aforo: 150,
        imagen: "img/logo.jpg"
    },
    {
        id: 2,
        titulo: "Feria de Ciencias y Tecnología",
        fecha: "2026-10-15",
        hora: "10:00 AM",
        lugar: "Auditorio Institucional",
        aforo: 80,
        imagen: "img/logo.jpg"
    }
];

// Cargar la lista de eventos guardados o cargar los por defecto
function obtenerEventos() {
    const almacenados = localStorage.getItem('eventos');
    if (!almacenados) {
        localStorage.setItem('eventos', JSON.stringify(eventosInicialesAdmin));
        return eventosInicialesAdmin;
    }
    try {
        const parsed = JSON.parse(almacenados);
        return Array.isArray(parsed) ? parsed : eventosInicialesAdmin;
    } catch (e) {
        console.error("Error al obtener eventos de localStorage:", e);
        return eventosInicialesAdmin;
    }
}

// Mostrar los eventos aperturados en el panel usando clases CSS limpias
function renderizarListaAdmin() {
    const contenedor = document.getElementById('listaEventosAdmin');
    if (!contenedor) return;

    const eventos = obtenerEventos();

    if (eventos.length === 0) {
        contenedor.innerHTML = '<p class="sin-eventos-msg">No hay eventos creados actualmente.</p>';
        return;
    }

    contenedor.innerHTML = eventos.map(evento => `
        <div class="admin-event-item">
            <div class="admin-event-item-info">
                <strong>${evento.titulo || 'Sin título'}</strong>
                <span>📅 ${evento.fecha || 'Sin fecha'} | ⏰ ${evento.hora || 'Sin hora'} | 🎟️ Cupos: <strong>${evento.aforo ?? 0}</strong></span>
            </div>
            <button class="btn-eliminar" onclick="solicitarEliminacion('${evento.id}')">
                Eliminar
            </button>
        </div>
    `).join('');
}

// --- ACCIÓN: AGREGAR EVENTO ---
const formAgregar = document.getElementById('formAgregarEvento');
if (formAgregar) {
    formAgregar.addEventListener('submit', function (e) {
        e.preventDefault();

        const fileInput = document.getElementById('imagenEvento');
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;

        // Datos base del evento
        const datosEvento = {
            id: Date.now(), // Genera un ID único basado en timestamp
            titulo: document.getElementById('tituloEvento').value.trim(),
            fecha: document.getElementById('fechaEvento').value,
            hora: document.getElementById('horaEvento').value.trim(),
            lugar: document.getElementById('lugarEvento').value.trim(),
            aforo: parseInt(document.getElementById('aforoEvento').value, 10),
            imagen: 'img/logo.jpg' // Imagen por defecto
        };

        // Si seleccionó un archivo local, lo convertimos a Base64
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                datosEvento.imagen = e.target.result; // Imagen convertida
                eventoTemporal = datosEvento;
                accionPendiente = 'agregar';
                abrirModalAuth("Ingresa el código PIN para agregar el evento.");
            };
            reader.readAsDataURL(file);
        } else {
            // Si no subió imagen, se procede directamente
            eventoTemporal = datosEvento;
            accionPendiente = 'agregar';
            abrirModalAuth("Ingresa el código PIN para agregar el evento.");
        }
    });
}

// --- ACCIÓN: ELIMINAR EVENTO ---
function solicitarEliminacion(id) {
    idEliminarTemporal = id;
    accionPendiente = 'eliminar';
    abrirModalAuth("Ingresa el código PIN para eliminar este evento.");
}

// Abrir modal de autenticación
function abrirModalAuth(mensaje) {
    const modalMensaje = document.getElementById('modalMensajeAccion');
    const modalAuth = document.getElementById('modalAuth');
    const inputCodigo = document.getElementById('codigoAdmin');

    if (modalMensaje) modalMensaje.innerText = mensaje;
    if (modalAuth) modalAuth.style.display = 'flex';
    if (inputCodigo) {
        inputCodigo.value = '';
        inputCodigo.focus();
    }
}

// Cerrar modal
function cerrarModalAuth() {
    const modalAuth = document.getElementById('modalAuth');
    if (modalAuth) modalAuth.style.display = 'none';
    accionPendiente = null;
    eventoTemporal = null;
    idEliminarTemporal = null;
}

// VALIDAR CÓDIGO PIN
const formAuth = document.getElementById('formAuth');
if (formAuth) {
    formAuth.addEventListener('submit', function (e) {
        e.preventDefault();

        const codigoIngresado = document.getElementById('codigoAdmin').value.trim();

        if (codigoIngresado === CODIGO_CORRECTO) {
            let eventos = obtenerEventos();

            if (accionPendiente === 'agregar') {
                eventos.unshift(eventoTemporal); // Agregar al inicio de la lista
                localStorage.setItem('eventos', JSON.stringify(eventos));
                alert('¡Evento publicado exitosamente!');
                if (formAgregar) formAgregar.reset();
            } else if (accionPendiente === 'eliminar') {
                // Comparación flexible (String) para soportar IDs tanto numéricos como string
                eventos = eventos.filter(e => String(e.id) !== String(idEliminarTemporal));
                localStorage.setItem('eventos', JSON.stringify(eventos));
                alert('¡Evento eliminado correctamente!');
            }

            cerrarModalAuth();
            renderizarListaAdmin(); // Actualiza la lista en tiempo real
        } else {
            alert('Código Inválido');
            const inputCodigo = document.getElementById('codigoAdmin');
            if (inputCodigo) {
                inputCodigo.value = '';
                inputCodigo.focus();
            }
        }
    });
}

// Inicializar la vista al cargar la página
document.addEventListener('DOMContentLoaded', renderizarListaAdmin);
