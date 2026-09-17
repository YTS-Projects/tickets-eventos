// js/eventos.js

// Datos iniciales de prueba si LocalStorage está vacío
const eventosIniciales = [
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

// Cargar eventos guardados o usar los por defecto
function obtenerEventos() {
    const almacenados = localStorage.getItem('eventos');
    if (!almacenados) {
        localStorage.setItem('eventos', JSON.stringify(eventosIniciales));
        return eventosIniciales;
    }
    try {
        const parsed = JSON.parse(almacenados);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : eventosIniciales;
    } catch (e) {
        console.error("Error al parsear eventos desde localStorage:", e);
        return eventosIniciales;
    }
}

// Mostrar tarjetas en el grid con la estructura de imagen y datos
function renderizarEventos() {
    const grid = document.getElementById('eventosGrid');
    if (!grid) return;

    const eventos = obtenerEventos();

    if (eventos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No hay eventos disponibles en este momento.</p>';
        return;
    }

    const imagenPorDefecto = 'img/logo.jpg';

    grid.innerHTML = eventos.map(evento => {
        const estaAgotado = (evento.aforo ?? 0) <= 0;

        return `
            <div class="card-evento" onclick="abrirModal('${evento.id}')">
                <!-- Título del evento -->
                <h3>${evento.titulo || 'Sin título'}</h3>

                <!-- Contenedor central: Imagen + Info -->
                <div class="card-body">
                    <div class="card-img-container">
                        <img src="${evento.imagen && evento.imagen.trim() !== '' ? evento.imagen : imagenPorDefecto}" alt="${evento.titulo}">
                    </div>
                    <div class="card-info">
                        <p><span>Fecha:</span> ${evento.fecha || 'Por confirmar'}</p>
                        <p><span>Hora:</span> ${evento.hora || 'Por confirmar'}</p>
                        <p><span>Lugar:</span> ${evento.lugar || 'Instalaciones'}</p>
                        <p><span>Cupos:</span> <strong style="color: ${estaAgotado ? '#e53e3e' : '#2b6cb0'};">${evento.aforo ?? 0}</strong></p>
                    </div>
                </div>

                <!-- Botón de reserva -->
                <div class="card-footer">
                    <button class="btn-reservar" ${estaAgotado ? 'disabled style="background:#cbd5e0; cursor:not-allowed;"' : ''}>
                        ${estaAgotado ? 'Agotado' : 'Reservar Ticket'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Abrir Modal de reserva
function abrirModal(id) {
    const eventos = obtenerEventos();
    // Comparación flexible (String/Number) para compatibilidad con IDs numéricos o string
    const evento = eventos.find(e => String(e.id) === String(id));

    if (evento && evento.aforo > 0) {
        const inputId = document.getElementById('eventoId');
        const modalTitulo = document.getElementById('modalTituloEvento');
        const modalReserva = document.getElementById('modalReserva');

        if (inputId) inputId.value = evento.id;
        if (modalTitulo) modalTitulo.innerText = `Reservar para: ${evento.titulo}`;
        if (modalReserva) modalReserva.style.display = 'flex';
    } else {
        alert('Lo sentimos, este evento ya no tiene cupos disponibles.');
    }
}

// Cerrar Modal
function cerrarModal() {
    const modalReserva = document.getElementById('modalReserva');
    const formReserva = document.getElementById('formReserva');

    if (modalReserva) modalReserva.style.display = 'none';
    if (formReserva) formReserva.reset();
}

// Procesar el formulario de reserva y registrar en localStorage para asistentes.html
document.addEventListener('DOMContentLoaded', () => {
    renderizarEventos();

    const formReserva = document.getElementById('formReserva');
    if (!formReserva) return;

    formReserva.addEventListener('submit', function (e) {
        e.preventDefault();

        const id = document.getElementById('eventoId').value;
        const cantidadInput = document.getElementById('cantidadTickets') || document.getElementById('cantidadReserva');
        const nombreInput = document.getElementById('nombreReserva') || document.getElementById('nombreCompleto');
        const cedulaInput = document.getElementById('identificacionReserva') || document.getElementById('cedulaReserva');
        const correoInput = document.getElementById('correoReserva');

        const cantidad = parseInt(cantidadInput ? cantidadInput.value : 1, 10);
        const nombre = nombreInput ? nombreInput.value.trim() : 'Sin nombre';
        const identificacion = cedulaInput ? cedulaInput.value.trim() : 'S/I';
        const correo = correoInput ? correoInput.value.trim() : 'S/N';

        let eventos = obtenerEventos();
        let eventoIndex = eventos.findIndex(e => String(e.id) === String(id));

        if (eventoIndex !== -1) {
            const eventoSeleccionado = eventos[eventoIndex];

            if (eventoSeleccionado.aforo >= cantidad) {
                // 1. Descontar aforo
                eventos[eventoIndex].aforo -= cantidad;
                localStorage.setItem('eventos', JSON.stringify(eventos));

                // 2. Guardar registro estructurado para la tabla de asistentes.html
                const reservas = JSON.parse(localStorage.getItem('reservas')) || [];
                const nuevaReserva = {
                    id: "res_" + Date.now(),
                    eventoId: eventoSeleccionado.id,
                    eventoTitulo: eventoSeleccionado.titulo,
                    nombreCompleto: nombre,
                    identificacion: identificacion,
                    correo: correo,
                    cantidad: cantidad,
                    fechaReserva: new Date().toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' })
                };

                reservas.push(nuevaReserva);
                localStorage.setItem('reservas', JSON.stringify(reservas));

                // 3. Confirmación y limpieza
                alert(`¡Reserva exitosa, ${nombre}!\nHas reservado ${cantidad} ticket(s) para "${eventoSeleccionado.titulo}".`);
                cerrarModal();
                renderizarEventos();
            } else {
                alert('No hay suficientes cupos disponibles para completar la solicitud.');
            }
        } else {
            alert('El evento seleccionado no existe.');
        }
    });
});
