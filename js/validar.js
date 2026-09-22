const API_URL = 'https://script.google.com/macros/s/AKfycbw4cn3p2Q6pltmQyI1c2sUisT_aitE7DeFWi8FIV-Vu73fCrcoEGQsQAMGZJUS_9cCB/exec';
let lectorQr = null;
let escanerActivo = false;
let validacionEnProceso = false;
let inicioEscanerEnProceso = false;

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
            mensaje.textContent = `✓ Ingreso permitido: ${nombre} — Evento: ${evento} (${cantidad} ticket${cantidad === 1 ? '' : 's'})`;
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

function actualizarEstadoEscaner(mensaje) {
    const estado = document.getElementById('estadoEscaner');
    if (estado) estado.textContent = mensaje;
}

function actualizarBotonesEscaner(activo) {
    const iniciar = document.getElementById('btnIniciarEscaner');
    const detener = document.getElementById('btnDetenerEscaner');
    if (iniciar) iniciar.hidden = activo;
    if (detener) detener.hidden = !activo;
}

/**
 * Procesa una lectura única: pausa la cámara, valida el ticket y la reanuda.
 */
async function alDetectarQr(ticketId) {
    if (validacionEnProceso || !ticketId) return;

    const inputTicket = document.getElementById('ticketIdInput');
    if (inputTicket) inputTicket.value = ticketId.trim();

    await procesarValidacion(ticketId.trim(), true);
}

/**
 * Centraliza la validación manual y por cámara para evitar solicitudes duplicadas.
 */
async function procesarValidacion(ticketId, desdeEscaner = false) {
    if (validacionEnProceso || !ticketId) return;
    validacionEnProceso = true;

    try {
        if (desdeEscaner && lectorQr && escanerActivo) {
            try {
                lectorQr.pause(true);
            } catch (error) {
                console.warn('No se pudo pausar el escáner; continuará la validación.', error);
            }
        }
        if (desdeEscaner) actualizarEstadoEscaner('Código detectado. Validando ticket...');
        await validarTicketEnNube(ticketId);
    } finally {
        if (desdeEscaner) {
            // Muestra el resultado antes de volver a buscar otro código.
            window.setTimeout(() => {
                if (lectorQr && escanerActivo) {
                    try {
                        lectorQr.resume();
                        actualizarEstadoEscaner('Cámara activa. Escanea el siguiente ticket.');
                    } catch (error) {
                        console.error('No se pudo reanudar el escáner:', error);
                        actualizarEstadoEscaner('No se pudo reanudar la cámara. Iníciala nuevamente.');
                    }
                }
                validacionEnProceso = false;
            }, 1500);
        } else {
            validacionEnProceso = false;
        }
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
        actualizarBotonesEscaner(true);
        actualizarEstadoEscaner('Cámara activa. Coloca el código QR dentro del recuadro.');
    } catch (error) {
        console.error('No se pudo iniciar el escáner:', error);
        lectorQr = null;
        const visor = document.getElementById('qrReader');
        if (visor) visor.replaceChildren();
        actualizarEstadoEscaner('No se pudo acceder a la cámara. Revisa los permisos e inténtalo otra vez.');
    } finally {
        inicioEscanerEnProceso = false;
        if (botonIniciar) botonIniciar.disabled = false;
    }
}

async function detenerEscanerQr() {
    if (!lectorQr || !escanerActivo) return;

    try {
        await lectorQr.stop();
        lectorQr.clear();
    } catch (error) {
        console.error('No se pudo detener el escáner:', error);
    } finally {
        lectorQr = null;
        escanerActivo = false;
        validacionEnProceso = false;
        actualizarBotonesEscaner(false);
        actualizarEstadoEscaner('Cámara apagada.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formValidarTicket');
    const inputTicket = document.getElementById('ticketIdInput');

    if (!formulario || !inputTicket) return;

    const botonIniciar = document.getElementById('btnIniciarEscaner');
    const botonDetener = document.getElementById('btnDetenerEscaner');
    if (botonIniciar) botonIniciar.addEventListener('click', iniciarEscanerQr);
    if (botonDetener) botonDetener.addEventListener('click', detenerEscanerQr);

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
