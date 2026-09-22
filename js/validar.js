const API_URL = 'https://script.google.com/macros/s/AKfycbw4cn3p2Q6pltmQyI1c2sUisT_aitE7DeFWi8FIV-Vu73fCrcoEGQsQAMGZJUS_9cCB/exec';
let lectorQr = null;
let escanerActivo = false;
let validacionEnProceso = false;
let inicioEscanerEnProceso = false;
let detencionEscanerEnProceso = false;

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
            // Sin cabecera application/json para evitar una petición CORS OPTIONS.
            // Apps Script recibe el texto JSON mediante e.postData.contents.
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
            const cantidad = Number(datos.cantidad) || 1;
            const estado = document.createElement('strong');
            estado.className = 'estado-verificado';
            estado.textContent = 'VERIFICADO';
            const detalle = document.createElement('span');
            detalle.textContent = `${nombre} — ${evento} — ${cantidad} pase${cantidad === 1 ? '' : 's'}`;
            mensaje.append(estado, detalle);
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
        return datos;
    } catch (error) {
        console.error('Error al validar ticket:', error);
        const mensaje = document.createElement('div');
        mensaje.className = 'alerta-validacion denegado';
        mensaje.textContent = error.message || 'Error de conexión con el servidor.';
        resultado.appendChild(mensaje);
        return null;
    }
}

function actualizarEstadoEscaner(mensaje) {
    const estado = document.getElementById('estadoEscaner');
    if (estado) estado.textContent = mensaje;
}

function actualizarBotonesEscaner({ activo = false, mostrarInicio = true, mostrarOtro = false } = {}) {
    const iniciar = document.getElementById('btnIniciarEscaner');
    const detener = document.getElementById('btnDetenerEscaner');
    const otro = document.getElementById('btnEscanearOtro');
    if (iniciar) iniciar.hidden = !mostrarInicio;
    if (detener) detener.hidden = !activo;
    if (otro) otro.hidden = !mostrarOtro;
}

/**
 * Procesa una lectura única: apaga la cámara, valida el ticket y espera una orden
 * explícita para volver a abrir el lector.
 */
async function alDetectarQr(ticketId) {
    if (validacionEnProceso || !ticketId) return;

    // Se bloquea antes de detener la cámara: algunos dispositivos pueden emitir
    // más de un callback mientras el lector se está cerrando.
    validacionEnProceso = true;

    const inputTicket = document.getElementById('ticketIdInput');
    if (inputTicket) inputTicket.value = ticketId.trim();

    await detenerEscanerQr({ mostrarInicio: false });
    actualizarEstadoEscaner('Código detectado. Validando ticket...');
    await procesarValidacion(ticketId.trim(), true);
    actualizarEstadoEscaner('Lectura finalizada. Usa el botón para escanear otro ticket.');
    actualizarBotonesEscaner({ mostrarInicio: false, mostrarOtro: true });
}

/**
 * Centraliza la validación manual y por cámara para evitar solicitudes duplicadas.
 */
async function procesarValidacion(ticketId, yaBloqueada = false) {
    if (!ticketId || (!yaBloqueada && validacionEnProceso)) return;
    if (!yaBloqueada) validacionEnProceso = true;

    try {
        return await validarTicketEnNube(ticketId);
    } finally {
        validacionEnProceso = false;
    }
}

/**
 * Solicita la cámara tras una acción explícita del usuario e inicia html5-qrcode.
 */
async function iniciarEscanerQr() {
    if (escanerActivo || inicioEscanerEnProceso) return;

    if (typeof Html5Qrcode === 'undefined') {
        actualizarEstadoEscaner('No se cargó la librería del escáner QR.');
        return;
    }

    inicioEscanerEnProceso = true;
    const botonIniciar = document.getElementById('btnIniciarEscaner');
    actualizarBotonesEscaner({ mostrarInicio: false });
    if (botonIniciar) botonIniciar.disabled = true;
    actualizarEstadoEscaner('Solicitando acceso a la cámara...');

    try {
        lectorQr = new Html5Qrcode('qrReader');
        await lectorQr.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            alDetectarQr,
            () => {}
        );
        escanerActivo = true;
        actualizarBotonesEscaner({ activo: true, mostrarInicio: false });
        actualizarEstadoEscaner('Cámara activa. Coloca el código QR dentro del recuadro.');
    } catch (error) {
        console.error('No se pudo iniciar el escáner:', error);
        lectorQr = null;
        const visor = document.getElementById('qrReader');
        if (visor) visor.replaceChildren();
        actualizarBotonesEscaner({ mostrarInicio: true });
        actualizarEstadoEscaner('No se pudo acceder a la cámara. Revisa los permisos e inténtalo otra vez.');
    } finally {
        inicioEscanerEnProceso = false;
        if (botonIniciar) botonIniciar.disabled = false;
    }
}

async function detenerEscanerQr(opciones = {}) {
    if (!lectorQr || !escanerActivo || detencionEscanerEnProceso) return;
    detencionEscanerEnProceso = true;
    const lectorActual = lectorQr;

    try {
        await lectorActual.stop();
    } catch (error) {
        console.error('No se pudo detener el escáner:', error);
    } finally {
        // clear() elimina el visor aun si el navegador reportó un problema al detener el stream.
        try {
            await lectorActual.clear();
        } catch (error) {
            console.warn('No se pudo limpiar completamente el visor del escáner:', error);
        }
        lectorQr = null;
        escanerActivo = false;
        detencionEscanerEnProceso = false;
        actualizarBotonesEscaner(opciones);
        actualizarEstadoEscaner('Cámara apagada.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formValidarTicket');
    const inputTicket = document.getElementById('ticketIdInput');

    if (!formulario || !inputTicket) return;

    const botonIniciar = document.getElementById('btnIniciarEscaner');
    const botonDetener = document.getElementById('btnDetenerEscaner');
    const botonEscanearOtro = document.getElementById('btnEscanearOtro');
    actualizarBotonesEscaner();
    if (botonIniciar) botonIniciar.addEventListener('click', iniciarEscanerQr);
    if (botonDetener) botonDetener.addEventListener('click', () => detenerEscanerQr());
    if (botonEscanearOtro) botonEscanearOtro.addEventListener('click', iniciarEscanerQr);

    formulario.addEventListener('submit', async (event) => {
        event.preventDefault();
        const ticketId = inputTicket.value.trim();
        if (!ticketId) return;

        await procesarValidacion(ticketId);
        inputTicket.select();
    });

    window.addEventListener('beforeunload', () => {
        if (lectorQr && escanerActivo) lectorQr.stop().catch(() => {});
    });
});
