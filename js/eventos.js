// js/eventos.js

const API_URL = 'https://script.google.com/macros/s/AKfycbw4cn3p2Q6pltmQyI1c2sUisT_aitE7DeFWi8FIV-Vu73fCrcoEGQsQAMGZJUS_9cCB/exec';
let urlVistaPreviaComprobante = null;
let descargaComprobanteEnProceso = false;

/**
 * Carga eventos guardados desde LocalStorage o inicializa los valores por defecto.
 */
function obtenerEventos() {
    const almacenados = localStorage.getItem('eventos');
    if (!almacenados) { 
        const predeterminados = copiarEventosPredeterminados();
        localStorage.setItem('eventos', JSON.stringify(predeterminados));
        localStorage.setItem('versionEventosPredeterminados', VERSION_EVENTOS_PREDETERMINADOS);
        return predeterminados;
    }
    try {
        const parsed = JSON.parse(almacenados);
        return Array.isArray(parsed) ? actualizarEventosPredeterminados(parsed) : copiarEventosPredeterminados();
    } catch (e) {
        console.error("Error al parsear eventos desde localStorage:", e);
        return copiarEventosPredeterminados();
    }
}

/**
 * Muestra las tarjetas de eventos en la cuadrícula HTML.
 */
function renderizarEventos() {
    const grid = document.getElementById('eventosGrid');
    if (!grid) return;

    const eventos = obtenerEventos();

    if (eventos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; font-size: 1.1rem; color: #4a5568;">No hay eventos disponibles en este momento.</p>';
        return;
    }

    const imagenPorDefecto = 'img/logo.jpg';

    grid.innerHTML = eventos.map(evento => {
        const estaAgotado = (evento.aforo ?? 0) <= 0;

        return `
            <div class="card-evento" onclick="abrirModal('${evento.id}')">
                <!-- Título del evento -->
                <h3>${evento.titulo || 'Sin título'}</h3>

                <!-- Contenedor central: Imagen e Información -->
                <div class="card-body">
                    <div class="card-img-container">
                        <img src="${evento.imagen && evento.imagen.trim() !== '' ? evento.imagen : imagenPorDefecto}" alt="${evento.titulo || 'Evento'}" loading="lazy">
                    </div>
                    <div class="card-info">
                        <p><span>Fecha:</span> ${evento.fecha || 'Por confirmar'}</p>
                        <p><span>Hora:</span> ${evento.hora || 'Por confirmar'}</p>
                        <p><span>Lugar:</span> ${evento.lugar || 'Instalaciones'}</p>
                        <p><span>Cupos:</span> <strong style="color: ${estaAgotado ? '#e53e3e' : '#2b6cb0'};">${evento.aforo ?? 0} libres</strong></p>
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

/**
 * Abre la ventana modal ajustando dinámicamente el límite máximo de tickets según el aforo disponible.
 */
function abrirModal(id) {
    const eventos = obtenerEventos();
    const evento = eventos.find(e => String(e.id) === String(id));

    if (evento && evento.aforo > 0) {
        const inputId = document.getElementById('eventoId');
        const modalTitulo = document.getElementById('modalTituloEvento');
        const modalReserva = document.getElementById('modalReserva');
        const inputCantidad = document.getElementById('cantidadTickets') || document.getElementById('cantidadReserva');

        if (inputId) inputId.value = evento.id;
        if (modalTitulo) modalTitulo.innerText = `Reservar para: ${evento.titulo}`;
        
        // Ajustar el límite máximo del input numérico según el aforo real restante (máximo 5)
        if (inputCantidad) {
            const maxPermitido = Math.min(evento.aforo, 5);
            inputCantidad.max = maxPermitido;
            inputCantidad.value = 1;
        }

        if (modalReserva) {
            const qrContainer = document.getElementById('qrContainer');
            if (qrContainer) qrContainer.innerHTML = '';
            limpiarComprobanteQR();
            modalReserva.style.display = 'flex';
            modalReserva.setAttribute('aria-hidden', 'false');
        }
    } else {
        alert('Lo sentimos, este evento ya no tiene cupos disponibles.');
    }
}

/**
 * Envía la reserva a Google Apps Script y genera un QR único cuando la API la confirma.
 */
async function procesarReservaFormulario(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const botonEnviar = form.querySelector('button[type="submit"]');
    const ticketId = generarTicketId();
    const eventoId = document.getElementById('eventoId').value;
    const evento = obtenerEventos().find(item => String(item.id) === String(eventoId));

    if (!evento) {
        alert('El evento seleccionado no existe o fue removido.');
        return;
    }

    const payload = {
        action: 'crearReserva',
        ticketId,
        eventoId,
        eventoTitulo: evento.titulo || 'Evento sin título',
        nombreCompleto: document.getElementById('nombreReserva').value.trim(),
        identificacion: document.getElementById('cedulaReserva').value.trim(),
        correo: document.getElementById('correoReserva').value.trim(),
        cantidad: Number(document.getElementById('cantidadTickets').value)
    };

    try {
        if (botonEnviar) {
            botonEnviar.disabled = true;
            botonEnviar.textContent = 'Procesando reserva...';
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            // Sin cabecera application/json para evitar una petición CORS OPTIONS.
            // Apps Script recibe el texto JSON mediante e.postData.contents.
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('No se pudo conectar con el servidor.');
        }

        const resultado = await response.json();
        if (!resultado.success) {
            throw new Error(resultado.message || 'No fue posible registrar la reserva.');
        }

        guardarReservaEnCache({
            id: ticketId,
            ticketId,
            eventoId,
            eventoTitulo: payload.eventoTitulo,
            nombreCompleto: payload.nombreCompleto,
            identificacion: payload.identificacion,
            correo: payload.correo,
            cantidad: payload.cantidad,
            fechaReserva: new Date().toLocaleString('es-EC')
        });

        const qrContainer = document.getElementById('qrContainer');
        if (!qrContainer || typeof QRCode === 'undefined') {
            throw new Error('No se pudo cargar la librería para generar el código QR.');
        }

        qrContainer.innerHTML = '<p><strong>Reserva confirmada.</strong><br>Presenta este código QR al ingresar.</p>';
        const qrElemento = document.createElement('div');
        qrContainer.appendChild(qrElemento);

        new QRCode(qrElemento, {
            text: ticketId,
            width: 220,
            height: 220,
            correctLevel: QRCode.CorrectLevel.H
        });

        prepararComprobanteQR(evento, payload.nombreCompleto, ticketId);

        form.reset();
        alert(`Reserva creada correctamente. Tu código de ticket es: ${ticketId}`);
    } catch (error) {
        console.error('Error al crear la reserva:', error);
        alert(error.message || 'Ocurrió un error al procesar la reserva.');
    } finally {
        if (botonEnviar) {
            botonEnviar.disabled = false;
            botonEnviar.textContent = 'Confirmar Reserva';
        }
    }
}

function generarTicketId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return `TE-${window.crypto.randomUUID()}`;
    }
    return `TE-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Diseña un comprobante autocontenido con un segundo QR para poder exportarlo como PNG.
 */
function prepararComprobanteQR(evento, nombreCompleto, ticketId) {
    const acciones = document.getElementById('accionesComprobante');
    const tarjeta = document.getElementById('tarjetaComprobante');
    if (!acciones || !tarjeta || typeof QRCode === 'undefined') return;

    tarjeta.replaceChildren();
    tarjeta.dataset.ticketId = ticketId;

    const encabezado = document.createElement('div');
    encabezado.className = 'comprobante-encabezado';
    const titulo = document.createElement('h4');
    titulo.textContent = evento.titulo || 'Evento institucional';
    const subtitulo = document.createElement('p');
    subtitulo.textContent = 'Comprobante de reserva';
    encabezado.append(titulo, subtitulo);

    const detalles = document.createElement('div');
    detalles.className = 'comprobante-detalles';
    const fecha = document.createElement('p');
    fecha.textContent = `Fecha: ${formatearFechaEvento(evento.fecha)}`;
    const hora = document.createElement('p');
    hora.textContent = `Hora: ${evento.hora || 'Por definir'}`;
    const asistente = document.createElement('p');
    asistente.textContent = `Asistente: ${nombreCompleto}`;
    const codigo = document.createElement('p');
    codigo.className = 'comprobante-codigo';
    codigo.textContent = `Código: ${ticketId}`;
    detalles.append(fecha, hora, asistente, codigo);

    const qr = document.createElement('div');
    qr.className = 'comprobante-qr-imagen';

    tarjeta.append(encabezado, detalles, qr);
    new QRCode(qr, {
        text: ticketId,
        width: 180,
        height: 180,
        correctLevel: QRCode.CorrectLevel.H
    });

    acciones.hidden = false;
}

function formatearFechaEvento(fecha) {
    if (!fecha) return 'Por definir';
    const fechaLocal = new Date(`${fecha}T00:00:00`);
    return Number.isNaN(fechaLocal.getTime())
        ? fecha
        : fechaLocal.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
}

function limpiarComprobanteQR() {
    const acciones = document.getElementById('accionesComprobante');
    const tarjeta = document.getElementById('tarjetaComprobante');
    if (tarjeta) tarjeta.replaceChildren();
    if (acciones) acciones.hidden = true;
    cerrarModalComprobante();
}

function mostrarModalComprobante() {
    const modal = document.getElementById('modalComprobante');
    const tarjeta = document.getElementById('tarjetaComprobante');
    if (!modal || !tarjeta?.dataset.ticketId) return;

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

function cerrarModalComprobante() {
    const modal = document.getElementById('modalComprobante');
    if (!modal) return;

    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
}

function mostrarVistaPreviaComprobante(urlImagen, nombreArchivo) {
    const modal = document.getElementById('modalImagenComprobante');
    const imagen = document.getElementById('imagenComprobanteGenerada');
    const enlace = document.getElementById('enlaceAbrirImagen');
    if (!modal || !imagen || !enlace) return;

    if (urlVistaPreviaComprobante) URL.revokeObjectURL(urlVistaPreviaComprobante);
    urlVistaPreviaComprobante = urlImagen;
    imagen.src = urlImagen;
    enlace.href = urlImagen;
    enlace.download = nombreArchivo;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

function cerrarVistaPreviaComprobante() {
    const modal = document.getElementById('modalImagenComprobante');
    const imagen = document.getElementById('imagenComprobanteGenerada');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
    if (imagen) imagen.removeAttribute('src');
    if (urlVistaPreviaComprobante) {
        URL.revokeObjectURL(urlVistaPreviaComprobante);
        urlVistaPreviaComprobante = null;
    }
}

/**
 * Convierte la tarjeta de reserva confirmada en una imagen PNG descargable.
 */
async function descargarComprobanteQR() {
    const tarjeta = document.getElementById('tarjetaComprobante');
    const boton = document.getElementById('btnDescargarComprobante');
    const ticketId = tarjeta?.dataset.ticketId;

    if (!tarjeta || !ticketId || typeof html2canvas === 'undefined') {
        alert('No se pudo preparar el comprobante para descargar.');
        return;
    }
    if (descargaComprobanteEnProceso) return;

    try {
        descargaComprobanteEnProceso = true;
        if (boton) {
            boton.disabled = true;
            boton.textContent = 'Generando comprobante...';
        }

        // La carga de imágenes data: del QR puede no emitir load en algunos
        // móviles. Nunca se bloquea la generación indefinidamente por ello.
        await esperarImagenesComprobante(tarjeta, 2500);
        const nombreArchivo = `Comprobante_${ticketId}.png`;
        const canvas = await generarCanvasComprobante(tarjeta, 15000);
        const imagen = await convertirCanvasABlob(canvas, 10000);
        const archivo = crearArchivoComprobante(imagen, nombreArchivo);

        // La API de compartir del sistema permite guardar o enviar el archivo
        // en Android/iOS sin depender de las restricciones de a.download.
        const puedeCompartirArchivo = Boolean(
            navigator.share &&
            archivo &&
            navigator.canShare &&
            puedeCompartirArchivos(archivo)
        );

        if (puedeCompartirArchivo) {
            try {
                await navigator.share({
                    title: 'Comprobante de reserva',
                    text: `Comprobante del ticket ${ticketId}`,
                    files: [archivo]
                });
                return;
            } catch (error) {
                // Cancelar es una acción deliberada: no se fuerza una descarga.
                if (error?.name === 'AbortError') return;
                console.warn('No se pudo abrir el selector nativo:', error);
            }
        }

        descargarBlob(imagen, nombreArchivo);
    } catch (error) {
        console.error('No se pudo descargar el comprobante:', error);
        alert('Ocurrió un error al generar la imagen del comprobante.');
    } finally {
        descargaComprobanteEnProceso = false;
        if (boton) {
            boton.disabled = false;
            boton.textContent = 'Descargar comprobante PNG';
        }
    }
}

function convertirCanvasABlob(canvas, tiempoMaximo = 10000) {
    if (typeof canvas.toBlob !== 'function') {
        return Promise.reject(new Error('Este navegador no puede convertir el comprobante a PNG.'));
    }

    return new Promise((resolve, reject) => {
        let finalizado = false;
        const temporizador = window.setTimeout(() => {
            if (!finalizado) {
                finalizado = true;
                reject(new Error('La conversión del comprobante tardó demasiado.'));
            }
        }, tiempoMaximo);

        canvas.toBlob(imagen => {
            if (finalizado) return;
            finalizado = true;
            window.clearTimeout(temporizador);
            if (imagen) resolve(imagen);
            else reject(new Error('No se pudo convertir el comprobante a PNG.'));
        }, 'image/png');
    });
}

function crearArchivoComprobante(blob, nombreArchivo) {
    try {
        return new File([blob], nombreArchivo, { type: 'image/png' });
    } catch (error) {
        // Algunos navegadores antiguos permiten descargar el Blob pero no File.
        console.warn('El navegador no permite preparar el archivo para compartir:', error);
        return null;
    }
}

function puedeCompartirArchivos(archivo) {
    try {
        return navigator.canShare({ files: [archivo] });
    } catch (error) {
        console.warn('El navegador no acepta archivos en la API de compartir:', error);
        return false;
    }
}

function descargarBlob(blob, nombreArchivo) {
    const urlTemporal = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = urlTemporal;
    enlace.download = nombreArchivo;
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    // Se conserva la URL el tiempo suficiente para que navegadores móviles
    // terminen de transferir el archivo antes de liberar la memoria.
    window.setTimeout(() => URL.revokeObjectURL(urlTemporal), 120000);
}

function generarCanvasComprobante(tarjeta, tiempoMaximo) {
    return new Promise((resolve, reject) => {
        const temporizador = window.setTimeout(() => {
            reject(new Error('La generación del comprobante tardó demasiado.'));
        }, tiempoMaximo);

        html2canvas(tarjeta, {
            backgroundColor: '#ffffff',
            // En teléfono una escala 1 reduce el consumo de memoria y evita que
            // la generación quede bloqueada; la tarjeta sigue siendo legible.
            scale: esDispositivoMovil() ? 1 : 2,
            useCORS: true,
            imageTimeout: 5000
        }).then(canvas => {
            window.clearTimeout(temporizador);
            resolve(canvas);
        }).catch(error => {
            window.clearTimeout(temporizador);
            reject(error);
        });
    });
}

function esDispositivoMovil() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Espera a que el QR generado como imagen esté listo antes de capturar la tarjeta. */
function esperarImagenesComprobante(contenedor, tiempoMaximo = 2500) {
    const imagenes = Array.from(contenedor.querySelectorAll('img'));
    const esperaImagenes = Promise.all(imagenes.map(imagen => {
        if (imagen.complete && imagen.naturalWidth > 0) return Promise.resolve();
        return new Promise(resolve => {
            imagen.addEventListener('load', resolve, { once: true });
            imagen.addEventListener('error', resolve, { once: true });
        });
    }));

    return Promise.race([
        esperaImagenes,
        new Promise(resolve => window.setTimeout(resolve, tiempoMaximo))
    ]);
}

/**
 * Conserva una copia local para que la interfaz siga disponible sin conexión.
 * Google Sheets continúa siendo la fuente de verdad para validar los tickets.
 */
function guardarReservaEnCache(reserva) {
    let reservas = [];
    try {
        reservas = JSON.parse(localStorage.getItem('reservas') || '[]');
        if (!Array.isArray(reservas)) reservas = [];
    } catch (error) {
        reservas = [];
    }

    if (!reservas.some(item => item.ticketId === reserva.ticketId)) {
        reservas.push(reserva);
        localStorage.setItem('reservas', JSON.stringify(reservas));
    }

    const eventos = obtenerEventos();
    const indiceEvento = eventos.findIndex(item => String(item.id) === String(reserva.eventoId));
    if (indiceEvento !== -1 && eventos[indiceEvento].aforo >= reserva.cantidad) {
        eventos[indiceEvento].aforo -= reserva.cantidad;
        localStorage.setItem('eventos', JSON.stringify(eventos));
        renderizarEventos();
    }
}

/**
 * Cierra la ventana modal y limpia el formulario.
 */
function cerrarModal() {
    const modalReserva = document.getElementById('modalReserva');
    const formReserva = document.getElementById('formReserva');

    if (modalReserva) {
        modalReserva.style.display = 'none';
        modalReserva.setAttribute('aria-hidden', 'true');
    }
    if (formReserva) {
        formReserva.reset();
    }
}

// Inicialización de eventos del DOM y procesamiento del formulario
document.addEventListener('DOMContentLoaded', () => {
    renderizarEventos();

    const modalReserva = document.getElementById('modalReserva');
    const modalComprobante = document.getElementById('modalComprobante');
    const modalImagenComprobante = document.getElementById('modalImagenComprobante');
    const formReserva = document.getElementById('formReserva');
    const botonMostrarComprobante = document.getElementById('btnMostrarComprobante');
    const botonDescargar = document.getElementById('btnDescargarComprobante');

    // Cerrar el modal al hacer clic fuera del contenido del formulario
    if (modalReserva) {
        window.addEventListener('click', (e) => {
            if (e.target === modalReserva) {
                cerrarModal();
            }
        });
    }

    if (modalComprobante) {
        window.addEventListener('click', (e) => {
            if (e.target === modalComprobante) cerrarModalComprobante();
        });
    }

    if (modalImagenComprobante) {
        window.addEventListener('click', (e) => {
            if (e.target === modalImagenComprobante) cerrarVistaPreviaComprobante();
        });
    }

    // Cerrar el modal presionado la tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalReserva && modalReserva.style.display === 'flex') {
            cerrarModal();
        }
        if (e.key === 'Escape' && modalComprobante && modalComprobante.style.display === 'flex') {
            cerrarModalComprobante();
        }
        if (e.key === 'Escape' && modalImagenComprobante && modalImagenComprobante.style.display === 'flex') {
            cerrarVistaPreviaComprobante();
        }
    });

    if (!formReserva) return;

    formReserva.addEventListener('submit', procesarReservaFormulario);
    if (botonMostrarComprobante) botonMostrarComprobante.addEventListener('click', mostrarModalComprobante);
    if (botonDescargar) botonDescargar.addEventListener('click', descargarComprobanteQR);
});
