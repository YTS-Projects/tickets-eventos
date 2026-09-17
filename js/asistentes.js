// js/asistentes.js

// Obtener la lista de eventos
function obtenerEventos() {
    const almacenados = localStorage.getItem('eventos');
    return almacenados ? JSON.parse(almacenados) : [];
}

// Obtener todas las reservas registradas
function obtenerReservas() {
    const almacenadas = localStorage.getItem('reservas');
    return almacenadas ? JSON.parse(almacenadas) : [];
}

// Renderizar tarjetas de eventos en la pantalla principal de asistentes
function renderizarTarjetasAsistentes() {
    const grid = document.getElementById('eventosAsistentesGrid');
    if (!grid) return;

    const eventos = obtenerEventos();
    const reservas = obtenerReservas();

    if (eventos.length === 0) {
        grid.innerHTML = '<p class="texto-sin-datos" style="grid-column: 1/-1; text-align: center;">No hay eventos creados actualmente.</p>';
        return;
    }

    const imagenPorDefecto = 'img/logo.jpg';

    grid.innerHTML = eventos.map(evento => {
        // Calcular número de personas/tickets reservados para este evento
        const reservasDelEvento = reservas.filter(r => 
            String(r.eventoId) === String(evento.id) || r.eventoTitulo === evento.titulo
        );

        const totalTicketsReservados = reservasDelEvento.reduce((sum, r) => sum + (parseInt(r.cantidad, 10) || parseInt(r.tickets, 10) || 1), 0);

        return `
            <div class="card-evento">
                <h3>${evento.titulo || 'Sin título'}</h3>

                <div class="card-body">
                    <div class="card-img-container">
                        <img src="${evento.imagen && evento.imagen.trim() !== '' ? evento.imagen : imagenPorDefecto}" alt="${evento.titulo}">
                    </div>
                    <div class="card-info">
                        <p><span>Fecha:</span> ${evento.fecha || 'N/A'}</p>
                        <p><span>Hora:</span> ${evento.hora || 'N/A'}</p>
                        <p><span>Lugar:</span> ${evento.lugar || 'N/A'}</p>
                        <p><span>Registrados:</span> <strong class="texto-destacado">${reservasDelEvento.length} reserva(s)</strong> (${totalTicketsReservados} tickets)</p>
                    </div>
                </div>

                <div class="card-footer">
                    <!-- Se remueve cualquier style="background-color:..." inline para heredar 100% las propiedades del CSS -->
                    <button class="btn-reservar" onclick="abrirModalAsistentes('${evento.id}', '${evento.titulo.replace(/'/g, "\\'")}')">
                        📋 Ver Registrados
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Abrir la ventana modal y filtrar la lista de personas para ese evento
function abrirModalAsistentes(eventoId, eventoTitulo) {
    const modal = document.getElementById('modalAsistentes');
    const modalTitulo = document.getElementById('modalTituloEvento');
    const resumen = document.getElementById('resumenEvento');
    const tablaBody = document.getElementById('tablaAsistentesBody');

    if (!modal || !tablaBody) return;

    const reservas = obtenerReservas();

    // Filtrar reservas que pertenezcan a este evento
    const asistentesFiltrados = reservas.filter(r => 
        String(r.eventoId) === String(eventoId) || r.eventoTitulo === eventoTitulo
    );

    // Actualizar título y resumen
    if (modalTitulo) modalTitulo.innerText = `Asistentes: ${eventoTitulo}`;
    
    const totalTickets = asistentesFiltrados.reduce((sum, r) => sum + (parseInt(r.cantidad, 10) || parseInt(r.tickets, 10) || 1), 0);
    
    if (resumen) {
        resumen.innerHTML = `Total de registros: <span class="texto-destacado">${asistentesFiltrados.length}</span> | Total Entradas / Tickets: <span class="texto-destacado">${totalTickets}</span>`;
    }

    // Dibujar la tabla
    if (asistentesFiltrados.length === 0) {
        tablaBody.innerHTML = `
            <tr>
                <td colspan="6" class="texto-sin-datos" style="text-align: center; padding: 1.5rem;">
                    No hay personas registradas para este evento aún.
                </td>
            </tr>
        `;
    } else {
        tablaBody.innerHTML = asistentesFiltrados.map((asistente, index) => `
            <tr>
                <td style="padding: 0.6rem;">${index + 1}</td>
                <td style="padding: 0.6rem; font-weight: bold;">${asistente.nombreCompleto || asistente.nombre || 'N/A'}</td>
                <td style="padding: 0.6rem;">${asistente.identificacion || 'S/I'}</td>
                <td style="padding: 0.6rem;">${asistente.correo || 'S/N'}</td>
                <td style="padding: 0.6rem; text-align: center;" class="texto-destacado">${asistente.cantidad || asistente.tickets || 1}</td>
                <td style="padding: 0.6rem; font-size: 0.85rem;" class="texto-suave">${asistente.fechaReserva || 'N/A'}</td>
            </tr>
        `).join('');
    }

    modal.style.display = 'flex';
}

// Cerrar la ventana modal
function cerrarModalAsistentes() {
    const modal = document.getElementById('modalAsistentes');
    if (modal) modal.style.display = 'none';
}

// Inicializar la vista al cargar el documento
document.addEventListener('DOMContentLoaded', renderizarTarjetasAsistentes);
