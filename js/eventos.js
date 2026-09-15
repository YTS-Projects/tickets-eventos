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
    return JSON.parse(almacenados);
}

// Mostrar tarjetas en el grid con la nueva estructura de imagen (1/3)
function renderizarEventos() {
    const grid = document.getElementById('eventosGrid');
    const eventos = obtenerEventos();

    if (eventos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No hay eventos disponibles en este momento.</p>';
        return;
    }

    const imagenPorDefecto = 'img/logo.jpg';

    grid.innerHTML = eventos.map(evento => `
        <div class="card-evento" onclick="abrirModal(${evento.id})">
            <!-- Título arriba sin alteraciones -->
            <h3>${evento.titulo}</h3>

            <!-- Contenedor central: Imagen (1/3) + Info (2/3) -->
            <div class="card-body">
                <div class="card-img-container">
                    <img src="${evento.imagen && evento.imagen.trim() !== '' ? evento.imagen : imagenPorDefecto}" alt="${evento.titulo}">
                </div>
                <div class="card-info">
                    <p><span>Fecha:</span> ${evento.fecha}</p>
                    <p><span>Hora:</span> ${evento.hora}</p>
                    <p><span>Lugar:</span> ${evento.lugar}</p>
                    <p><span>Cupos:</span> ${evento.aforo}</p>
                </div>
            </div>

            <!-- Botón de reserva inferior intacto -->
            <div class="card-footer">
                <button class="btn-reservar">Reservar</button>
            </div>
        </div>
    `).join('');
}

// Abrir Modal de reserva
function abrirModal(id) {
    const eventos = obtenerEventos();
    const evento = eventos.find(e => e.id === id);

    if (evento && evento.aforo > 0) {
        document.getElementById('eventoId').value = evento.id;
        document.getElementById('modalTituloEvento').innerText = `Reservar para: ${evento.titulo}`;
        document.getElementById('modalReserva').style.display = 'flex';
    } else {
        alert('Lo sentimos, este evento ya no tiene cupos disponibles.');
    }
}

// Cerrar Modal
function cerrarModal() {
    document.getElementById('modalReserva').style.display = 'none';
    document.getElementById('formReserva').reset();
}

// Procesar el formulario de reserva
document.getElementById('formReserva').addEventListener('submit', function (e) {
    e.preventDefault();

    const id = parseInt(document.getElementById('eventoId').value);
    const cantidad = parseInt(document.getElementById('cantidadTickets').value);
    const nombre = document.getElementById('nombreReserva').value;

    let eventos = obtenerEventos();
    let eventoIndex = eventos.findIndex(e => e.id === id);

    if (eventoIndex !== -1) {
        if (eventos[eventoIndex].aforo >= cantidad) {
            // Descontar aforo
            eventos[eventoIndex].aforo -= cantidad;
            localStorage.setItem('eventos', JSON.stringify(eventos));

            // Guardar registro de la reserva
            const reservas = JSON.parse(localStorage.getItem('reservas')) || [];
            reservas.push({
                evento: eventos[eventoIndex].titulo,
                nombre: nombre,
                tickets: cantidad,
                fechaReserva: new Date().toLocaleDateString()
            });
            localStorage.setItem('reservas', JSON.stringify(reservas));

            alert(`¡Reserva exitosa, ${nombre}! Haz reservado ${cantidad} ticket(s).`);
            cerrarModal();
            renderizarEventos();
        } else {
            alert('No hay suficientes cupos disponibles para completar la solicitud.');
        }
    }
});

// Inicializar la vista
document.addEventListener('DOMContentLoaded', renderizarEventos);