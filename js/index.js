// js/index.js

let indiceDiapositivaActual = 0;
let intervaloCarrusel = null;

// Eventos de muestra iniciales por si aún no existen registros en localStorage
const eventosBaseIniciales = [
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

/**
 * Obtiene los eventos desde localStorage. Si no existen, los inicializa.
 */
function obtenerEventos() {
    const eventosGuardados = localStorage.getItem('eventos');
    if (!eventosGuardados) {
        localStorage.setItem('eventos', JSON.stringify(eventosBaseIniciales));
        return eventosBaseIniciales;
    }
    try {
        const parsed = JSON.parse(eventosGuardados);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : eventosBaseIniciales;
    } catch (e) {
        console.error("Error al leer eventos desde localStorage:", e);
        return eventosBaseIniciales;
    }
}

/**
 * Renderiza exclusivamente la información textual de cada evento en el carrusel
 */
function renderizarCarrusel() {
    const contenedorSlides = document.getElementById('carouselSlides');
    const contenedorDots = document.getElementById('carouselDots');
    
    if (!contenedorSlides) return;

    const listaEventos = obtenerEventos();

    contenedorSlides.innerHTML = "";
    if (contenedorDots) contenedorDots.innerHTML = "";

    listaEventos.forEach((evento, idx) => {
        const estaAgotado = (evento.aforo ?? 0) <= 0;

        // Crear contenedor de texto del evento
        const slide = document.createElement('div');
        slide.className = `carousel-slide ${idx === 0 ? 'active' : ''}`;
        slide.style.display = idx === 0 ? 'block' : 'none';
        slide.style.padding = '2rem 3rem 2.5rem 3rem';
        slide.style.textAlign = 'center';

        slide.innerHTML = `
            <h3 style="color: #1a365d; font-size: 1.35rem; margin-top: 0; margin-bottom: 0.8rem;">${evento.titulo || 'Sin título'}</h3>
            
            <div style="font-size: 0.95rem; color: #4a5568; line-height: 1.8; margin-bottom: 1.2rem;">
                <p style="margin: 0;"><strong>📅 Fecha:</strong> ${evento.fecha || 'Por confirmar'}</p>
                <p style="margin: 0;"><strong>⏰ Hora:</strong> ${evento.hora || 'Por confirmar'}</p>
                <p style="margin: 0;"><strong>📍 Lugar:</strong> ${evento.lugar || 'Instalaciones del plantel'}</p>
                <p style="margin: 0;"><strong>🎟️ Cupos disponibles:</strong> <span style="font-weight: bold; color: ${estaAgotado ? '#e53e3e' : '#2b6cb0'};">${evento.aforo ?? 0}</span></p>
            </div>

            <a href="eventos.html" class="btn-reservar">
                ${estaAgotado ? 'Ver detalles' : 'Reservar Ticket ahora &rarr;'}
            </a>
        `;

        contenedorSlides.appendChild(slide);

        // Crear punto indicador inferior
        if (contenedorDots) {
            const dot = document.createElement('button');
            dot.type = "button";
            dot.className = `dot ${idx === 0 ? 'active' : ''}`;
            dot.setAttribute('aria-label', `Ir al evento ${idx + 1}`);
            dot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; border: none; background: ${idx === 0 ? '#2b6cb0' : '#cbd5e0'}; cursor: pointer; transition: background 0.3s;`;
            
            dot.onclick = () => mostrarDiapositiva(idx);
            contenedorDots.appendChild(dot);
        }
    });

    iniciarAutoplay(listaEventos.length);
}

/**
 * Alterna entre los eventos según el índice seleccionado
 */
function mostrarDiapositiva(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dots .dot');

    if (slides.length === 0) return;

    if (index >= slides.length) indiceDiapositivaActual = 0;
    else if (index < 0) indiceDiapositivaActual = slides.length - 1;
    else indiceDiapositivaActual = index;

    slides.forEach((slide, i) => {
        slide.style.display = i === indiceDiapositivaActual ? 'block' : 'none';
    });

    dots.forEach((dot, i) => {
        dot.style.background = i === indiceDiapositivaActual ? '#2b6cb0' : '#cbd5e0';
    });
}

/**
 * Rotación automática cada 5 segundos
 */
function iniciarAutoplay(totalSlides) {
    if (intervaloCarrusel) clearInterval(intervaloCarrusel);
    if (totalSlides <= 1) return;

    intervaloCarrusel = setInterval(() => {
        mostrarDiapositiva(indiceDiapositivaActual + 1);
    }, 5000);
}

// Inicialización de controles al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    renderizarCarrusel();

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            mostrarDiapositiva(indiceDiapositivaActual - 1);
            iniciarAutoplay(document.querySelectorAll('.carousel-slide').length);
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            mostrarDiapositiva(indiceDiapositivaActual + 1);
            iniciarAutoplay(document.querySelectorAll('.carousel-slide').length);
        });
    }
});
