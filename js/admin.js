const CODIGO_CORRECTO = "1234";

// Variables para controlar qué acción se está autorizando ('agregar' o 'eliminar')
let accionPendiente = null; 
let eventoTemporal = null;
let idEliminarTemporal = null;

// Cargar la lista de eventos guardados
function obtenerEventos() {
    const almacenados = localStorage.getItem('eventos');
    return almacenados ? JSON.parse(almacenados) : [];
}

// Mostrar los eventos aperturados en el panel
function renderizarListaAdmin() {
    const contenedor = document.getElementById('listaEventosAdmin');
    const eventos = obtenerEventos();

    if (eventos.length === 0) {
        contenedor.innerHTML = '<p style="text-align: center; color: var(--color-texto-suave);">No hay eventos creados actualmente.</p>';
        return;
    }

    contenedor.innerHTML = eventos.map(evento => `
        <div class="admin-event-item">
            <div class="admin-event-item-info">
                <strong>${evento.titulo}</strong>
                <span>Fecha: ${evento.fecha} | Hora: ${evento.hora} | Cupos: ${evento.aforo}</span>
            </div>
            <button class="btn-eliminar" onclick="solicitarEliminacion(${evento.id})">Eliminar</button>
        </div>
    `).join('');
}

// --- ACCIÓN: AGREGAR EVENTO ---
document.getElementById('formAgregarEvento').addEventListener('submit', function (e) {
    e.preventDefault();

    const fileInput = document.getElementById('imagenEvento');
    const file = fileInput.files[0];

    // Datos base del evento
    const datosEvento = {
        id: Date.now(),
        titulo: document.getElementById('tituloEvento').value.trim(),
        fecha: document.getElementById('fechaEvento').value,
        hora: document.getElementById('horaEvento').value.trim(),
        lugar: document.getElementById('lugarEvento').value.trim(),
        aforo: parseInt(document.getElementById('aforoEvento').value),
        imagen: ''
    };

    // Si seleccionó un archivo local, lo convertimos a Base64
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            datosEvento.imagen = e.target.result; // Imagen convertida a texto Base64
            eventoTemporal = datosEvento;
            accionPendiente = 'agregar';
            abrirModalAuth("Ingresa el código PIN para agregar el evento.");
        };
        reader.readAsDataURL(file);
    } else {
        // Si no subió ninguna imagen, se procede directamente (usará la imagen por defecto)
        eventoTemporal = datosEvento;
        accionPendiente = 'agregar';
        abrirModalAuth("Ingresa el código PIN para agregar el evento.");
    }
});

// --- ACCIÓN: ELIMINAR EVENTO ---
function solicitarEliminacion(id) {
    idEliminarTemporal = id;
    accionPendiente = 'eliminar';
    abrirModalAuth("Ingresa el código PIN para eliminar este evento.");
}

// Abrir modal de autenticación
function abrirModalAuth(mensaje) {
    document.getElementById('modalMensajeAccion').innerText = mensaje;
    document.getElementById('modalAuth').style.display = 'flex';
    document.getElementById('codigoAdmin').value = '';
    document.getElementById('codigoAdmin').focus();
}

// Cerrar modal
function cerrarModalAuth() {
    document.getElementById('modalAuth').style.display = 'none';
    accionPendiente = null;
    eventoTemporal = null;
    idEliminarTemporal = null;
}

// VALIDAR CÓDIGO PIN
document.getElementById('formAuth').addEventListener('submit', function (e) {
    e.preventDefault();

    const codigoIngresado = document.getElementById('codigoAdmin').value.trim();

    if (codigoIngresado === CODIGO_CORRECTO) {
        let eventos = obtenerEventos();

        if (accionPendiente === 'agregar') {
            eventos.push(eventoTemporal);
            localStorage.setItem('eventos', JSON.stringify(eventos));
            alert('¡Evento publicado exitosamente!');
            document.getElementById('formAgregarEvento').reset();
        } else if (accionPendiente === 'eliminar') {
            eventos = eventos.filter(e => e.id !== idEliminarTemporal);
            localStorage.setItem('eventos', JSON.stringify(eventos));
            alert('¡Evento eliminado correctamente!');
        }

        cerrarModalAuth();
        renderizarListaAdmin(); // Actualiza la lista en admin.html inmediatamente
    } else {
        alert('Código Inválido');
        document.getElementById('codigoAdmin').value = '';
        document.getElementById('codigoAdmin').focus();
    }
});

// Inicializar la vista al cargar la página
document.addEventListener('DOMContentLoaded', renderizarListaAdmin);