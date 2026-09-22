// js/admin.js

const CODIGO_CORRECTO = "1234";

// Variables globales de control de estado administrativo
let accionPendiente = null; // 'agregar', 'editar', 'eliminar'
let eventoTemporal = null;
let idEliminarTemporal = null;

// Eventos predeterminados iniciales
const eventosInicialesAdmin = [
    {
        id: "ev_inicial_1",
        titulo: "Ceremonia de Juramento a la Bandera",
        fecha: "2026-09-26",
        hora: "08:30 AM",
        lugar: "Patio Principal de la Institución",
        aforo: 150,
        imagen: "img/bandera.jpg"
    },
    {
        id: "ev_inicial_2",
        titulo: "Feria de Ciencias y Tecnología",
        fecha: "2026-10-15",
        hora: "10:00 AM",
        lugar: "Auditorio Institucional",
        aforo: 80,
        imagen: "img/tech.jpg"
    }
];

/**
 * Obtiene los eventos de localStorage o carga los predeterminados si está vacío.
 */
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

/**
 * Renderiza la lista de eventos aperturados en el panel de administración.
 */
function renderizarListaAdmin() {
    const contenedor = document.getElementById('listaEventosAdmin');
    if (!contenedor) return;

    const eventos = obtenerEventos();

    if (eventos.length === 0) {
        contenedor.innerHTML = '<p class="sin-eventos-msg text-center">No hay eventos creados actualmente.</p>';
        return;
    }

    contenedor.innerHTML = eventos.map(evento => {
        const tituloEscapado = (evento.titulo || '').replace(/'/g, "\\'");
        return `
            <div class="admin-event-item">
                <div class="admin-event-item-info">
                    <strong>${evento.titulo || 'Sin título'}</strong>
                    <span>📅 ${evento.fecha || 'Sin fecha'} | ⏰ ${evento.hora || 'Sin hora'} | 🎟️ Cupos: <strong>${evento.aforo ?? 0}</strong></span>
                </div>
                <div class="admin-event-item-actions">
                    <button class="btn-editar" onclick="cargarEventoEnFormulario('${evento.id}')" title="Editar evento">
                        ✏️ Editar
                    </button>
                    <button class="btn-eliminar" onclick="solicitarEliminacion('${evento.id}')" title="Eliminar evento">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Carga los datos de un evento en el formulario para su posterior edición.
 */
function cargarEventoEnFormulario(id) {
    const eventos = obtenerEventos();
    const evento = eventos.find(e => String(e.id) === String(id));
    if (!evento) return;

    document.getElementById('editEventoId').value = evento.id;
    document.getElementById('tituloEvento').value = evento.titulo || '';
    document.getElementById('fechaEvento').value = evento.fecha || '';
    document.getElementById('horaEvento').value = evento.hora || '';
    document.getElementById('lugarEvento').value = evento.lugar || '';
    document.getElementById('aforoEvento').value = evento.aforo || '';

    // Cambiar títulos y visibilidad de botones
    const titleElem = document.getElementById('formAdminTitle');
    const btnGuardar = document.getElementById('btnGuardarEvento');
    const btnCancelar = document.getElementById('btnCancelarEdicion');

    if (titleElem) titleElem.innerText = 'Editar Evento';
    if (btnGuardar) btnGuardar.innerText = 'Actualizar Evento';
    if (btnCancelar) btnCancelar.style.display = 'block';

    // Desplazar la vista al formulario
    document.getElementById('formAgregarEvento').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Cancela el modo edición y restablece el formulario a su estado original.
 */
function cancelarEdicionEvento() {
    const formAgregar = document.getElementById('formAgregarEvento');
    if (formAgregar) formAgregar.reset();

    document.getElementById('editEventoId').value = '';

    const titleElem = document.getElementById('formAdminTitle');
    const btnGuardar = document.getElementById('btnGuardarEvento');
    const btnCancelar = document.getElementById('btnCancelarEdicion');

    if (titleElem) titleElem.innerText = 'Agregar Nuevo Evento';
    if (btnGuardar) btnGuardar.innerText = 'Agregar Evento';
    if (btnCancelar) btnCancelar.style.display = 'none';
}

// --- MANEJO DE ENVÍO DEL FORMULARIO DE EVENTOS ---
const formAgregar = document.getElementById('formAgregarEvento');
if (formAgregar) {
    formAgregar.addEventListener('submit', function (e) {
        e.preventDefault();

        const editId = document.getElementById('editEventoId').value;
        const fileInput = document.getElementById('imagenEvento');
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;

        const esEdicion = Boolean(editId);
        let eventos = obtenerEventos();
        let imagenActual = 'img/logo.jpg';

        if (esEdicion) {
            const eventoExistente = eventos.find(item => String(item.id) === String(editId));
            if (eventoExistente && eventoExistente.imagen) {
                imagenActual = eventoExistente.imagen;
            }
        }

        const datosEvento = {
            id: esEdicion ? (isNaN(editId) ? editId : Number(editId)) : Date.now(),
            titulo: document.getElementById('tituloEvento').value.trim(),
            fecha: document.getElementById('fechaEvento').value,
            hora: document.getElementById('horaEvento').value.trim(),
            lugar: document.getElementById('lugarEvento').value.trim(),
            aforo: parseInt(document.getElementById('aforoEvento').value, 10),
            imagen: imagenActual
        };

        const procesarEnvio = () => {
            eventoTemporal = datosEvento;
            accionPendiente = esEdicion ? 'editar' : 'agregar';
            const mensaje = esEdicion 
                ? "Ingresa el código PIN para guardar los cambios en el evento." 
                : "Ingresa el código PIN para publicar el nuevo evento.";
            abrirModalAuth(mensaje);
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                datosEvento.imagen = e.target.result;
                procesarEnvio();
            };
            reader.readAsDataURL(file);
        } else {
            procesarEnvio();
        }
    });
}

/**
 * Inicia el proceso de solicitud de eliminación de un evento.
 */
function solicitarEliminacion(id) {
    idEliminarTemporal = id;
    accionPendiente = 'eliminar';
    abrirModalAuth("Ingresa el código PIN para confirmar la eliminación del evento.");
}

/**
 * Abre el modal de autenticación PIN y ajusta la accesibilidad.
 */
function abrirModalAuth(mensaje) {
    const modalMensaje = document.getElementById('modalMensajeAccion');
    const modalAuth = document.getElementById('modalAuth');
    const inputCodigo = document.getElementById('codigoAdmin');

    if (modalMensaje) modalMensaje.innerText = mensaje;
    if (modalAuth) {
        modalAuth.style.display = 'flex';
        modalAuth.setAttribute('aria-hidden', 'false');
    }
    if (inputCodigo) {
        inputCodigo.value = '';
        inputCodigo.focus();
    }
}

/**
 * Cierra el modal de autenticación PIN y restablece su estado.
 */
function cerrarModalAuth() {
    const modalAuth = document.getElementById('modalAuth');
    if (modalAuth) {
        modalAuth.style.display = 'none';
        modalAuth.setAttribute('aria-hidden', 'true');
    }
    accionPendiente = null;
    eventoTemporal = null;
    idEliminarTemporal = null;
}

// --- VALIDACIÓN DE CÓDIGO PIN Y EJECUCIÓN DE ACCIONES ---
const formAuth = document.getElementById('formAuth');
if (formAuth) {
    formAuth.addEventListener('submit', function (e) {
        e.preventDefault();

        const codigoIngresado = document.getElementById('codigoAdmin').value.trim();

        if (codigoIngresado === CODIGO_CORRECTO) {
            let eventos = obtenerEventos();

            if (accionPendiente === 'agregar') {
                eventos.unshift(eventoTemporal);
                localStorage.setItem('eventos', JSON.stringify(eventos));
                alert('¡Evento publicado exitosamente!');
                cancelarEdicionEvento();

            } else if (accionPendiente === 'editar') {
                eventos = eventos.map(ev => 
                    String(ev.id) === String(eventoTemporal.id) ? eventoTemporal : ev
                );
                localStorage.setItem('eventos', JSON.stringify(eventos));
                alert('¡Evento actualizado exitosamente!');
                cancelarEdicionEvento();

            } else if (accionPendiente === 'eliminar') {
                eventos = eventos.filter(e => String(e.id) !== String(idEliminarTemporal));
                localStorage.setItem('eventos', JSON.stringify(eventos));
                alert('¡Evento eliminado correctamente!');
            }

            cerrarModalAuth();
            renderizarListaAdmin();
        } else {
            alert('Código PIN incorrecto. Inténtalo de nuevo.');
            const inputCodigo = document.getElementById('codigoAdmin');
            if (inputCodigo) {
                inputCodigo.value = '';
                inputCodigo.focus();
            }
        }
    });
}

// Inicialización de escuchadores globales y renderizado inicial
document.addEventListener('DOMContentLoaded', () => {
    renderizarListaAdmin();

    const modalAuth = document.getElementById('modalAuth');

    // Clic fuera del modal para cerrar
    if (modalAuth) {
        window.addEventListener('click', (e) => {
            if (e.target === modalAuth) {
                cerrarModalAuth();
            }
        });
    }

    // Tecla Escape para cerrar modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalAuth && modalAuth.style.display === 'flex') {
            cerrarModalAuth();
        }
    });
});
