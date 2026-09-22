// js/eventos.js

// Datos iniciales de prueba si LocalStorage está vacío
const eventosIniciales = [
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

const API_URL = 'https://script.google.com/macros/s/AKfycbw4cn3p2Q6pltmQyI1c2sUisT_aitE7DeFWi8FIV-Vu73fCrcoEGQsQAMGZJUS_9cCB/exec';
let urlVistaPreviaComprobante = null;

/**
 * Carga eventos guardados desde LocalStorage o inicializa los valores por defecto.
 */
function obtenerEventos() {
    const almacenados = localStorage.getItem('eventos');
    if (!almacenados) { 
        localStorage.setItem('eventos', JSON.stringify(eventosIniciales));
        return eventosIniciales;
    }
    try {
        const parsed = JSON.parse(almacenados);
        return Array.isArray(parsed) ? parsed : eventosIniciales;
    } catch (e) {
        console.error("Error al parsear eventos desde localStorage:", e);
        return eventosIniciales;
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

    let destinoMovil = null;
    try {
        if (boton) {
            boton.disabled = true;
            boton.textContent = 'Generando comprobante...';
        }

        // El tab se abre de forma síncrona durante el toque. Así iOS/Android no
        // lo bloquean cuando html2canvas termina de generar la imagen.
        destinoMovil = esDispositivoMovil() ? abrirDestinoGuardadoMovil() : null;

        // La carga de imágenes data: del QR puede no emitir load en algunos
        // móviles. Nunca se bloquea la generación indefinidamente por ello.
        await esperarImagenesComprobante(tarjeta, 2500);
        const nombreArchivo = `Comprobante_${ticketId}.png`;
        const canvas = await generarCanvasComprobante(tarjeta, 15000);

        if (esDispositivoMovil()) {
            // toDataURL es síncrono y no depende de Blob, File ni navigator.share.
            // Es la ruta más compatible con Safari iOS y Chrome Android: la pestaña
            // que se abrió durante el toque recibe inmediatamente un PNG guardable.
            const imagenBase64 = canvas.toDataURL('image/png');
            if (destinoMovil) {
                mostrarImagenEnDestinoMovil(destinoMovil, imagenBase64, nombreArchivo);
            } else {
                mostrarVistaPreviaComprobanteDesdeDataUrl(imagenBase64, nombreArchivo);
            }
            return;
        }

        const imagen = await convertirCanvasABlob(canvas);
        const urlTemporal = URL.createObjectURL(imagen);
        const enlace = document.createElement('a');
        enlace.download = nombreArchivo;
        enlace.href = urlTemporal;
        enlace.style.display = 'none';
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        window.setTimeout(() => URL.revokeObjectURL(urlTemporal), 60000);
    } catch (error) {
        console.error('No se pudo descargar el comprobante:', error);
        if (destinoMovil && !destinoMovil.closed) {
            mostrarErrorEnDestinoMovil(destinoMovil);
        }
        alert('Ocurrió un error al generar la imagen del comprobante.');
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = 'Descargar comprobante PNG';
        }
    }
}

/** Abre una pestaña vacía durante el gesto del usuario para evitar bloqueos móviles. */
function abrirDestinoGuardadoMovil() {
    const destino = window.open('', '_blank');
    if (!destino) return null;

    destino.document.title = 'Generando comprobante';
    destino.document.body.textContent = 'Generando tu comprobante…';
    return destino;
}

/** Muestra un PNG base64 en una pestaña autorizada para guardarlo con pulsación prolongada. */
function mostrarImagenEnDestinoMovil(destino, imagenBase64, nombreArchivo) {
    if (!destino || destino.closed || !imagenBase64) return;

    const documento = destino.document;
    documento.open();
    documento.title = nombreArchivo;
    const estilo = documento.createElement('style');
    estilo.textContent = 'body{margin:0;padding:20px;background:#f7fafc;color:#1a365d;font:16px Arial;text-align:center}img{display:block;max-width:100%;height:auto;margin:16px auto}p{line-height:1.4}.guardar{display:inline-block;padding:12px 16px;background:#1a4c80;color:white;border-radius:6px;text-decoration:none;font-weight:bold}';
    const mensaje = documento.createElement('p');
    mensaje.textContent = 'Mantén presionada la imagen y elige “Guardar imagen” o “Guardar en Fotos”. Si tu navegador lo permite, usa también el botón Guardar PNG.';
    const imagen = documento.createElement('img');
    imagen.src = imagenBase64;
    imagen.alt = 'Comprobante de reserva';
    const enlaceGuardar = documento.createElement('a');
    enlaceGuardar.className = 'guardar';
    enlaceGuardar.href = imagenBase64;
    enlaceGuardar.download = nombreArchivo;
    enlaceGuardar.textContent = 'Guardar PNG';
    documento.head.appendChild(estilo);
    documento.body.replaceChildren(mensaje, imagen, enlaceGuardar);
    documento.close();
}

function mostrarVistaPreviaComprobanteDesdeDataUrl(imagenBase64, nombreArchivo) {
    const modal = document.getElementById('modalImagenComprobante');
    const imagen = document.getElementById('imagenComprobanteGenerada');
    const enlace = document.getElementById('enlaceAbrirImagen');
    if (!modal || !imagen || !enlace) return;

    imagen.src = imagenBase64;
    enlace.href = imagenBase64;
    enlace.download = nombreArchivo;
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
}

function convertirCanvasABlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(imagen => {
            if (imagen) resolve(imagen);
            else reject(new Error('No se pudo convertir el comprobante a PNG.'));
        }, 'image/png');
    });
}

function mostrarErrorEnDestinoMovil(destino) {
    const documento = destino.document;
    documento.open();
    documento.title = 'No se pudo generar el comprobante';
    documento.body.textContent = 'No se pudo generar la imagen. Regresa a la página e inténtalo nuevamente.';
    documento.close();
}

function generarCanvasComprobante(tarjeta, tiempoMaximo) {
    return Promise.race([
        html2canvas(tarjeta, {
            backgroundColor: '#ffffff',
            // En teléfono una escala 1 reduce el consumo de memoria y evita que
            // la generación quede bloqueada; la tarjeta sigue siendo legible.
            scale: esDispositivoMovil() ? 1 : 2,
            useCORS: true
        }),
        new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error('La generación del comprobante tardó demasiado.')), tiempoMaximo);
        })
    ]);
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
