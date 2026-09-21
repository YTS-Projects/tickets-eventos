const API_URL = 'https://script.google.com/macros/s/AKfycbw4cn3p2Q6pltmQyI1c2sUisT_aitE7DeFWi8FIV-Vu73fCrcoEGQsQAMGZJUS_9cCB/exec';

/**
 * Consulta y registra en la nube el uso de un ticket único.
 * Puede invocarse desde un escáner QR o con un código escrito manualmente.
 */
async function validarTicketEnNube(ticketId) {
    const resultado = document.getElementById('resultadoValidacion');
    if (!resultado) return;

    resultado.replaceChildren();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'validarTicket', ticketId })
        });

        if (!response.ok) {
            throw new Error('No se pudo conectar con el servidor.');
        }

        const datos = await response.json();
        const mensaje = document.createElement('div');
        mensaje.className = 'alerta-validacion';

        if (datos.status === 'PERMITIDO') {
            mensaje.classList.add('permitido');
            const nombre = datos.nombreCompleto || datos.nombre || datos.asistente || 'Asistente';
            const evento = datos.evento || datos.eventoTitulo || 'Evento registrado';
            mensaje.textContent = `✓ Ingreso permitido: ${nombre} — Evento: ${evento}`;
        } else if (datos.status === 'DENEGADO') {
            mensaje.classList.add('denegado');
            mensaje.textContent = '✗ Ingreso denegado: este ticket ya fue utilizado.';
        } else if (datos.status === 'NO_ENCONTRADO') {
            mensaje.classList.add('no-encontrado');
            mensaje.textContent = '⚠ Ticket inválido o no encontrado.';
        } else {
            mensaje.classList.add('no-encontrado');
            mensaje.textContent = datos.message || 'No fue posible validar el ticket.';
        }

        resultado.appendChild(mensaje);
    } catch (error) {
        console.error('Error al validar ticket:', error);
        const mensaje = document.createElement('div');
        mensaje.className = 'alerta-validacion denegado';
        mensaje.textContent = error.message || 'Error de conexión con el servidor.';
        resultado.appendChild(mensaje);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formValidarTicket');
    const inputTicket = document.getElementById('ticketIdInput');

    if (!formulario || !inputTicket) return;

    formulario.addEventListener('submit', async (event) => {
        event.preventDefault();
        const ticketId = inputTicket.value.trim();
        if (!ticketId) return;

        await validarTicketEnNube(ticketId);
        inputTicket.select();
    });
});
