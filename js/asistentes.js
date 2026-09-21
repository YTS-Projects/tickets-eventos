// js/asistentes.js

const API_URL = 'https://script.google.com/macros/s/AKfycbw4cn3p2Q6pltmQyI1c2sUisT_aitE7DeFWi8FIV-Vu73fCrcoEGQsQAMGZJUS_9cCB/exec';
let reservasActuales = [];

/**
 * Obtiene la lista de eventos desde localStorage.
 */
function obtenerEventos() {
    const almacenados = localStorage.getItem('eventos');
    if (!almacenados) return [];
    try {
        const parsed = JSON.parse(almacenados);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Error al parsear eventos desde localStorage:", e);
        return [];
    }
}

/**
 * Obtiene todas las reservas registradas desde localStorage.
 */
function obtenerReservas() {
    const almacenadas = localStorage.getItem('reservas');
    if (!almacenadas) return [];
    try {
        const parsed = JSON.parse(almacenadas);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Error al parsear reservas desde localStorage:", e);
        return [];
    }
}

/**
 * Carga las reservas oficiales desde Google Sheets y actualiza la caché local.
 */
async function obtenerReservasNube() {
    const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'obtenerReservas' })
    });

    if (!response.ok) {
        throw new Error('No se pudo consultar la lista de asistentes.');
    }

    const datos = await response.json();
    if (!datos.success || !Array.isArray(datos.reservas)) {
        throw new Error(datos.message || 'La API no devolvió reservas válidas.');
    }

    localStorage.setItem('reservas', JSON.stringify(datos.reservas));
    return datos.reservas;
}

/**
 * Renderiza las tarjetas de eventos en la pantalla principal de asistentes.
 */
function renderizarTarjetasAsistentes(reservas = obtenerReservas()) {
    const grid = document.getElementById('eventosAsistentesGrid');
    if (!grid) return;

    const eventos = obtenerEventos();
    reservasActuales = reservas;

    if (eventos.length === 0) {
        grid.innerHTML = '<p class="texto-sin-datos text-center">No hay eventos creados actualmente.</p>';
        return;
    }

    const imagenPorDefecto = 'img/logo.jpg';

    grid.innerHTML = eventos.map(evento => {
        // Filtrar las reservas vinculadas a este evento
        const reservasDelEvento = reservas.filter(r => String(r.eventoId) === String(evento.id));

        // Calcular el total de entradas/tickets reservados
        const totalTicketsReservados = reservasDelEvento.reduce((sum, r) => 
            sum + (parseInt(r.cantidad, 10) || parseInt(r.tickets, 10) || 1), 0
        );

        // Escapar comillas simples para evitar errores sintácticos en onclick
        const tituloEscapado = (evento.titulo || '').replace(/'/g, "\\'");

        return `
            <div class="card-evento">
                <h3>${evento.titulo || 'Sin título'}</h3>

                <div class="card-body">
                    <div class="card-img-container">
                        <img src="${evento.imagen && evento.imagen.trim() !== '' ? evento.imagen : imagenPorDefecto}" alt="${evento.titulo || 'Evento'}" loading="lazy">
                    </div>
                    <div class="card-info">
                        <p><span>Fecha:</span> ${evento.fecha || 'N/A'}</p>
                        <p><span>Hora:</span> ${evento.hora || 'N/A'}</p>
                        <p><span>Lugar:</span> ${evento.lugar || 'N/A'}</p>
                        <p><span>Registrados:</span> <strong class="texto-destacado">${reservasDelEvento.length} reserva(s)</strong> (${totalTicketsReservados} tickets)</p>
                    </div>
                </div>

                <div class="card-footer">
                    <button class="btn-reservar" onclick="abrirModalAsistentes('${evento.id}', '${tituloEscapado}')">
                        📋 Ver Registrados
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Abre la ventana modal y carga la lista de registrados para el evento seleccionado.
 */
function abrirModalAsistentes(eventoId, eventoTitulo) {
    const modal = document.getElementById('modalAsistentes');
    const modalTitulo = document.getElementById('modalTituloEvento');
    const resumen = document.getElementById('resumenEvento');
    const tablaBody = document.getElementById('tablaAsistentesBody');

    if (!modal || !tablaBody) return;

    const reservas = reservasActuales;

    // Filtrar asistentes asignados a este evento
    const asistentesFiltrados = reservas.filter(r => String(r.eventoId) === String(eventoId));

    if (modalTitulo) {
        modalTitulo.innerText = `Asistentes: ${eventoTitulo}`;
    }

    const totalTickets = asistentesFiltrados.reduce((sum, r) => 
        sum + (parseInt(r.cantidad, 10) || parseInt(r.tickets, 10) || 1), 0
    );

    if (resumen) {
        resumen.innerHTML = `Total de registros: <span class="texto-destacado">${asistentesFiltrados.length}</span> | Total Entradas / Tickets: <span class="texto-destacado">${totalTickets}</span>`;
    }

    // Generar las filas de la tabla
    if (asistentesFiltrados.length === 0) {
        tablaBody.innerHTML = `
            <tr>
                <td colspan="6" class="texto-sin-datos text-center">
                    No hay personas registradas para este evento aún.
                </td>
            </tr>
        `;
    } else {
        tablaBody.innerHTML = asistentesFiltrados.map((asistente, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${asistente.nombreCompleto || asistente.nombre || 'N/A'}</strong></td>
                <td>${asistente.identificacion || 'S/I'}</td>
                <td>${asistente.correo || 'S/N'}</td>
                <td class="texto-centro texto-destacado">${asistente.cantidad || asistente.tickets || 1}</td>
                <td class="texto-suave">${asistente.fechaReserva || 'N/A'}</td>
            </tr>
        `).join('');
    }

    // Mostrar modal actualizando atributos de accesibilidad
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

/**
 * Cierra la ventana modal y restablece sus atributos de accesibilidad.
 */
function cerrarModalAsistentes() {
    const modal = document.getElementById('modalAsistentes');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

// Escuchadores de eventos para la inicialización y el control del modal
document.addEventListener('DOMContentLoaded', () => {
    cargarAsistentes();

    const modalAsistentes = document.getElementById('modalAsistentes');

    // Cerrar modal al hacer clic en el fondo oscuro exterior
    if (modalAsistentes) {
        window.addEventListener('click', (e) => {
            if (e.target === modalAsistentes) {
                cerrarModalAsistentes();
            }
        });
    }

    // Cerrar modal al presionar la tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalAsistentes && modalAsistentes.style.display === 'flex') {
            cerrarModalAsistentes();
        }
    });
});

/**
 * Prioriza la hoja de cálculo; si la red no está disponible, muestra la caché local.
 */
async function cargarAsistentes() {
    try {
        const reservas = await obtenerReservasNube();
        renderizarTarjetasAsistentes(reservas);
    } catch (error) {
        console.warn('No se pudo consultar Google Sheets; se usará la caché local.', error);
        renderizarTarjetasAsistentes(obtenerReservas());
    }
}
