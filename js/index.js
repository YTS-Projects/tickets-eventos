// js/index.js

// Eventos predeterminados por si no hay datos en localStorage
const eventosDefectoIndex = [
    {
        id: "ev_inicial_1",
        titulo: "Ceremonia de Juramento a la Bandera",
        fecha: "2026-09-26",
        hora: "08:30 AM",
        lugar: "Patio Principal de la Institución",
        aforo: 150
    },
    {
        id: "ev_inicial_2",
        titulo: "Feria de Ciencias y Tecnología",
        fecha: "2026-10-15",
        hora: "10:00 AM",
        lugar: "Auditorio Institucional",
        aforo: 80
    }
];

let indiceActual = 0;
let intervaloCarrusel = null;

/**
 * Obtiene la lista de eventos guardados en localStorage.
 */
function obtenerEventosIndex() {
    const almacenados = localStorage.getItem('eventos');
    if (!almacenados) {
        localStorage.setItem('eventos', JSON.stringify(eventosDefectoIndex));
        return eventosDefectoIndex;
    }
    try {
        const parsed = JSON.parse(almacenados);
        return Array.isArray(parsed) ? parsed : eventosDefectoIndex;
    } catch (e) {
        console.error("Error al obtener eventos de localStorage:", e);
        return eventosDefectoIndex;
    }
}

/**
 * Renderiza las diapositivas del carrusel en formato de tarjeta de texto individual.
 */
function renderizarCarruselTexto() {
    const container = document.getElementById('carouselSlides');
    const dotsContainer = document.getElementById('carouselDots');
    
    if (!container) return;

    const eventos = obtenerEventosIndex();

    if (eventos.length === 0) {
        container.innerHTML = `
            <div class="slide-texto active">
                <div class="slide-info-card">
                    <p>No hay eventos disponibles en este momento.</p>
                </div>
            </div>
        `;
        if (dotsContainer) dotsContainer.innerHTML = '';
        return;
    }

    // Generar las tarjetas ocultas por defecto excepto la primera (index === 0)
    container.innerHTML = eventos.map((evento, index) => `
        <div class="slide-texto ${index === 0 ? 'active' : ''}" data-index="${index}">
            <div class="slide-info-card">
                <span class="badge-destacado">Evento Destacado</span>
                <h3 class="slide-titulo">${evento.titulo || 'Sin título'}</h3>
                
                <div class="slide-detalles">
                    <p>📅 <span>Fecha:</span> ${evento.fecha || 'Por definir'}</p>
                    <p>⏰ <span>Hora:</span> ${evento.hora || 'Por definir'}</p>
                    <p>📍 <span>Lugar:</span> ${evento.lugar || 'Por definir'}</p>
                    <p>🎟️ <span>Cupos Disponibles:</span> <strong>${evento.aforo ?? 0}</strong></p>
                </div>

                <div class="slide-acciones">
                    <a href="eventos.html" class="btn-reservar">
                        🎟️ Reservar Entradas
                    </a>
                </div>
            </div>
        </div>
    `).join('');

    // Generar los puntos indicadores inferiores
    if (dotsContainer) {
        dotsContainer.innerHTML = eventos.map((_, index) => `
            <span class="dot ${index === 0 ? 'active' : ''}" onclick="irADiapositiva(${index})"></span>
        `).join('');
    }

    iniciarAutoPlay(eventos.length);
}

/**
 * Muestra únicamente la tarjeta activa según su índice.
 */
function mostrarDiapositiva(index) {
    const slides = document.querySelectorAll('.slide-texto');
    const dots = document.querySelectorAll('.dot');
    
    if (slides.length === 0) return;

    if (index >= slides.length) indiceActual = 0;
    else if (index < 0) indiceActual = slides.length - 1;
    else indiceActual = index;

    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === indiceActual);
    });

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === indiceActual);
    });
}

function siguienteDiapositiva() {
    mostrarDiapositiva(indiceActual + 1);
}

function anteriorDiapositiva() {
    mostrarDiapositiva(indiceActual - 1);
}

function irADiapositiva(index) {
    mostrarDiapositiva(index);
    reiniciarAutoPlay();
}

/**
 * Control del reproductor automático.
 */
function iniciarAutoPlay(totalSlides) {
    if (totalSlides <= 1) return;
    clearInterval(intervaloCarrusel);
    intervaloCarrusel = setInterval(siguienteDiapositiva, 5000);
}

function reiniciarAutoPlay() {
    const eventos = obtenerEventosIndex();
    iniciarAutoPlay(eventos.length);
}

// Inicialización de escuchadores al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    renderizarCarruselTexto();

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            anteriorDiapositiva();
            reiniciarAutoPlay();
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            siguienteDiapositiva();
            reiniciarAutoPlay();
        });
    }
});
