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
    const comprobante = document.getElementById('comprobanteQR');
    const tarjeta = document.getElementById('tarjetaComprobante');
    if (!comprobante || !tarjeta || typeof QRCode === 'undefined') return;

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

    comprobante.hidden = false;
}

function formatearFechaEvento(fecha) {
    if (!fecha) return 'Por definir';
    const fechaLocal = new Date(`${fecha}T00:00:00`);
    return Number.isNaN(fechaLocal.getTime())
        ? fecha
        : fechaLocal.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
}

function limpiarComprobanteQR() {
    const comprobante = document.getElementById('comprobanteQR');
    const tarjeta = document.getElementById('tarjetaComprobante');
    if (tarjeta) tarjeta.replaceChildren();
    if (comprobante) comprobante.hidden = true;
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

    try {
        if (boton) {
            boton.disabled = true;
            boton.textContent = 'Generando comprobante...';
        }

        const canvas = await html2canvas(tarjeta, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true
        });
        const enlace = document.createElement('a');
        enlace.download = `Comprobante_${ticketId}.png`;
        enlace.href = canvas.toDataURL('image/png');
        enlace.click();
    } catch (error) {
        console.error('No se pudo descargar el comprobante:', error);
        alert('Ocurrió un error al generar la imagen del comprobante.');
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = 'Descargar comprobante PNG';
        }
    }
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
    const botonDescargar = document.getElementById('btnDescargarComprobante');

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
    const formReserva = document.getElementById('formReserva');

    // Cerrar el modal al hacer clic fuera del contenido del formulario
    if (modalReserva) {
        window.addEventListener('click', (e) => {
            if (e.target === modalReserva) {
                cerrarModal();
            }
        });
    }

    // Cerrar el modal presionado la tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalReserva && modalReserva.style.display === 'flex') {
            cerrarModal();
        }
    });

    if (!formReserva) return;

    formReserva.addEventListener('submit', procesarReservaFormulario);
    if (botonDescargar) botonDescargar.addEventListener('click', descargarComprobanteQR);
});
