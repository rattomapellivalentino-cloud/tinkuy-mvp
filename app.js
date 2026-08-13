import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDneTN4o-E8GaXm5mtAmXGhjcDaaXuU7ug",
    authDomain: "tinkuy-61501.firebaseapp.com",
    projectId: "tinkuy-61501",
    storageBucket: "tinkuy-61501.firebasestorage.app",
    messagingSenderId: "113402782339",
    appId: "1:113402782339:web:655fa71a9b18f5ac3571b6",
    measurementId: "G-7K149PMLBZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const map = L.map('mapa-fondo', { zoomControl: false }).setView([-12.065, -75.204], 10);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 20, attribution: '© OpenStreetMap © CARTO' }).addTo(map);

window.addEventListener('resize', () => { map.invalidateSize(); });
setTimeout(() => { map.invalidateSize(); }, 100);
setTimeout(() => { map.invalidateSize(); }, 800);

const puntosOficiales = [
    { coords: [-11.916, -75.316], id_lugar: "vivero_amor", title: "Vivero Amor Nativas", description: "Ubicado en Concepción, este vivero produce plantas de Quinuales y tiene el objetivo de aprender a propagar diversas especies nativas de la zona para proyectos de reforestación.", image: "imagenes/img1.jpg" },
    { coords: [-11.420, -75.690], id_lugar: "ruta_andino", title: "Ruta Andino Selvatica", description: "Una ruta de trekking que atraviesa la puna húmeda y los bosques de neblina en la zona de La Unión-Huasahuasi, ideal para conectar con la biodiversidad.", image: "imagenes/img2.jpg" },
    { coords: [-11.950, -75.250], id_lugar: "ilish", title: "Ilish Pichacoto & Rumiwasi", description: "En Saño, Huancayo, esta es la primera área de conservación de Junín administrada por la comunidad. Incluye zonas arqueológicas, camping y promueve la agricultura regenerativa.", image: "imagenes/img3.jpg" }
];

puntosOficiales.forEach(punto => {
    L.marker(punto.coords).addTo(map).on('click', () => { abrirDetalle(punto); });
});

window.buscarLugar = async function () {
    const input = document.getElementById('input-busqueda').value;
    if (!input) return;
    try {
        const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${input}, Junin, Peru`);
        const datos = await respuesta.json();
        if (datos.length > 0) {
            const lat = parseFloat(datos[0].lat); const lon = parseFloat(datos[0].lon);
            const nombreLugar = datos[0].display_name.split(',')[0];
            map.flyTo([lat, lon], 14);
            L.marker([lat, lon]).addTo(map).bindPopup(`<b>${nombreLugar}</b>`).openPopup();
            document.getElementById('lugar').value = nombreLugar;
            document.getElementById('sugerencias-busqueda').classList.add('vista-oculta');
        } else {
            if(window.showToast) window.showToast("No encontramos ese lugar.");
        }
    } catch (error) { console.error("Error buscando:", error); }
};

let timeoutBusqueda;
const inputBusqueda = document.getElementById('input-busqueda');
const sugerenciasContainer = document.getElementById('sugerencias-busqueda');

inputBusqueda.addEventListener('input', () => {
    clearTimeout(timeoutBusqueda);
    const query = inputBusqueda.value.trim();
    if (query.length < 3) {
        sugerenciasContainer.classList.add('vista-oculta');
        return;
    }
    
    timeoutBusqueda = setTimeout(async () => {
        try {
            const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}, Junin, Peru&limit=5`);
            const datos = await respuesta.json();
            
            sugerenciasContainer.innerHTML = '';
            if (datos.length > 0) {
                datos.forEach(lugar => {
                    const item = document.createElement('div');
                    item.className = 'sugerencia-item';
                    const nombreCorto = lugar.display_name.split(',')[0];
                    item.innerText = lugar.display_name;
                    item.onclick = () => {
                        inputBusqueda.value = nombreCorto;
                        sugerenciasContainer.classList.add('vista-oculta');
                        const lat = parseFloat(lugar.lat); 
                        const lon = parseFloat(lugar.lon);
                        map.flyTo([lat, lon], 14);
                        L.marker([lat, lon]).addTo(map).bindPopup(`<b>${nombreCorto}</b>`).openPopup();
                        document.getElementById('lugar').value = nombreCorto;
                    };
                    sugerenciasContainer.appendChild(item);
                });
            } else {
                sugerenciasContainer.innerHTML = '<div class="sugerencia-item">No hay sugerencias</div>';
            }
            sugerenciasContainer.classList.remove('vista-oculta');
        } catch (e) {
            console.error("Error cargando sugerencias", e);
        }
    }, 500);
});

// Ocultar sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
    if (sugerenciasContainer && !e.target.closest('.buscador-mapa')) {
        sugerenciasContainer.classList.add('vista-oculta');
    }
});


// Muro y Firebase (Se mantiene igual que antes, resumido para no alargar)
const botonPublicar = document.getElementById('btn-publicar');
botonPublicar.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo').value; const lugar = document.getElementById('lugar').value; const descripcion = document.getElementById('descripcion').value;
    if (titulo === "" || lugar === "" || descripcion === "") { alert("Completa los datos."); return; }
    botonPublicar.innerText = "Subiendo...";
    try {
        await addDoc(collection(db, "publicaciones"), { titulo: titulo, lugar: lugar, descripcion: descripcion, fecha: new Date(), salida_aprobada: false, comentarios: [] });
        document.getElementById('titulo').value = ""; document.getElementById('lugar').value = ""; document.getElementById('descripcion').value = ""; botonPublicar.innerText = "Publicar en Raíz"; cargarPublicaciones();
    } catch (error) { alert("Error."); botonPublicar.innerText = "Publicar"; }
});

const contenedorMuro = document.getElementById('muro-publicaciones');
async function cargarPublicaciones() {
    try {
        const consulta = query(collection(db, "publicaciones"));
        const querySnapshot = await getDocs(consulta);
        if (querySnapshot.empty) { contenedorMuro.innerHTML = "<p>Aún no hay actividades.</p>"; return; }
        let publicacionesHTML = "";
        querySnapshot.forEach((documento) => {
            const data = documento.data(); const docId = documento.id;
            let comentariosHTML = "";
            if (data.comentarios && data.comentarios.length > 0) { data.comentarios.forEach(com => { comentariosHTML += `<div class="comentario-box">${com}</div>`; }); }
            publicacionesHTML += `
                <div class="post-card">
                    <h3>${data.titulo}</h3><p>${data.lugar}</p><p>${data.descripcion}</p>
                    <span class="etiqueta" style="background: ${data.salida_aprobada ? 'var(--leaf)' : '#eee'};"> ${data.salida_aprobada ? 'Verificado' : 'Pendiente'} </span>
                    <div class="comentarios-seccion">
                        <div class="comentarios-lista">${comentariosHTML}</div>
                        <div class="input-comentario-row">
                            <input type="text" class="input-comentario" placeholder="Añadir comentario...">
                            <button class="btn-enviar-comentario" data-docid="${docId}">Enviar</button>
                        </div>
                    </div>
                </div>`;
        });
        contenedorMuro.innerHTML = publicacionesHTML;
    } catch (error) { contenedorMuro.innerHTML = "<p>Error de conexión.</p>"; }
}

contenedorMuro.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-enviar-comentario')) {
        const boton = e.target; const idDocumento = boton.dataset.docid; const input = boton.previousElementSibling; const texto = input.value;
        if (texto.trim() === "") return;
        boton.disabled = true; boton.innerText = "...";
        try {
            await updateDoc(doc(db, "publicaciones", idDocumento), { comentarios: arrayUnion(texto) });
            const lista = boton.closest('.comentarios-seccion').querySelector('.comentarios-lista');
            lista.innerHTML += `<div class="comentario-box">${texto}</div>`;
            input.value = ""; boton.disabled = false; boton.innerText = "Enviar";
        } catch (e) { alert("Error"); boton.disabled = false; boton.innerText = "Enviar"; }
    }
});
cargarPublicaciones();

const swiper = new Swiper('.mySwiper', { pagination: { el: ".swiper-pagination", dynamicBullets: true }, loop: true });

// -----------------------------------------------------
// LÓGICA DEL PANEL DE DETALLES Y BOTÓN ATRÁS
// -----------------------------------------------------
const panelDetalle = document.getElementById('panel-detalle');
let lugarActualId = "";

function abrirDetalle(data) {
    document.getElementById('detalle-titulo').textContent = data.title;
    document.getElementById('detalle-descripcion').textContent = data.description;
    document.getElementById('detalle-img').querySelector('img').src = data.image;
    lugarActualId = data.id_lugar;

    panelDetalle.scrollTop = 0;
    panelDetalle.classList.add('activo');

    // Agregamos el estado al historial para el botón "Atrás" del mouse/celular
    history.pushState({ panelAbierto: true }, "");
}

// Escuchamos el evento de retroceso del navegador (Mouse o Celular)
window.addEventListener('popstate', (e) => {
    panelDetalle.classList.remove('activo');
});

// Botón de cerrar explícito en la pantalla
document.getElementById('btn-volver').addEventListener('click', () => {
    history.back(); // Esto dispara el popstate de arriba
});

// Lógica para enviar comentario en el lugar (Visual por ahora, para conectarlo a DB luego)
document.getElementById('btn-comentar-lugar').addEventListener('click', () => {
    const input = document.getElementById('input-comentario-lugar');
    const caja = document.getElementById('comentarios-lugar-oficial');
    if (input.value.trim() !== "") {
        if (caja.querySelector('p')) caja.innerHTML = ""; // Quitar mensaje "No hay comentarios"
        caja.innerHTML += `<div class="comentario-box">${input.value}</div>`;
        input.value = "";
    }
});


// -----------------------------------------------------
// SISTEMA DE NAVEGACIÓN (CAMBIAR ENTRE MAPA, CHAT Y PERFIL)
// -----------------------------------------------------
const navBtns = document.querySelectorAll('.nav-btn, .nav-item');
const vistas = document.querySelectorAll('#main-content > div');

navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();

        // Actualizar colores de botones (Limpiar y asignar active)
        navBtns.forEach(b => b.classList.remove('active'));
        // Si clickeo en celular, activo ese. Si en PC, activo ese.
        const targetId = btn.dataset.target;
        document.querySelectorAll(`[data-target="${targetId}"]`).forEach(b => b.classList.add('active'));

        // Mostrar la vista correcta
        vistas.forEach(vista => {
            if (vista.id === targetId) {
                vista.classList.remove('vista-oculta');
                vista.classList.add('vista-activa');
            } else {
                vista.classList.remove('vista-activa');
                vista.classList.add('vista-oculta');
            }
        });
    });
});

// -----------------------------------------------------
// LÓGICA DE REDIMENSIONAMIENTO (DRAG / RESIZE)
// -----------------------------------------------------
document.querySelectorAll('.sheet-container').forEach(sheet => {
    const dragMobile = sheet.querySelector('.drag-indicator');
    const dragDesktop = sheet.querySelector('.drag-indicator-desktop');

    if (dragMobile) {
        let startY, startMarginTop;
        const onTouchMove = (e) => {
            const currentY = e.touches ? e.touches[0].clientY : e.clientY;
            const deltaY = currentY - startY;
            let newMarginTop = startMarginTop + deltaY;
            if (newMarginTop < 50) newMarginTop = 50;
            if (newMarginTop > window.innerHeight - 100) newMarginTop = window.innerHeight - 100;
            document.documentElement.style.setProperty('--sheet-margin-top', `${newMarginTop}px`);
        };
        const onTouchEnd = () => {
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('mousemove', onTouchMove);
            document.removeEventListener('mouseup', onTouchEnd);
            sheet.style.transition = ''; // restore CSS transition
            setTimeout(() => map.invalidateSize(), 300);
        };
        const onTouchStart = (e) => {
            startY = e.touches ? e.touches[0].clientY : e.clientY;
            startMarginTop = parseInt(window.getComputedStyle(sheet).marginTop) || (window.innerHeight * 0.6);
            sheet.style.transition = 'none'; // disable transition during drag
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
            document.addEventListener('mousemove', onTouchMove);
            document.addEventListener('mouseup', onTouchEnd);
        };
        dragMobile.addEventListener('touchstart', onTouchStart);
        dragMobile.addEventListener('mousedown', onTouchStart);
    }

    if (dragDesktop) {
        let startX, startWidth;
        const onMouseMove = (e) => {
            const currentX = e.clientX;
            const deltaX = startX - currentX;
            let newWidth = startWidth + deltaX;
            if (newWidth < 300) newWidth = 300;
            if (newWidth > window.innerWidth - 300) newWidth = window.innerWidth - 300;
            document.documentElement.style.setProperty('--sheet-width', `${newWidth}px`);
            map.invalidateSize();
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        dragDesktop.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startWidth = sheet.offsetWidth;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
});

// -----------------------------------------------------
// LÓGICA DE UI ADICIONAL (Toast, FAB, Modal)
// -----------------------------------------------------

window.showToast = function(message) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        if(toast.parentElement) toast.remove();
    }, 3000);
};

// Interceptar clics en botones sin función real (Chat, Amigos, Perfil)
document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.tagName === 'BUTTON' && !t.id && !t.classList.contains('nav-item') && !t.classList.contains('nav-btn') && !t.classList.contains('btn-enviar-comentario') && !t.classList.contains('swiper-button-next') && !t.classList.contains('swiper-button-prev') && !t.closest('.buscador-mapa')) {
        const text = t.innerText.trim();
        if (["Añadir", "Chatear", "Subir", "Enviar", "Editar Perfil"].includes(text)) {
            e.preventDefault();
            showToast("Función '" + text + "' en desarrollo.");
        }
    }
});

// FAB Agregar Lugar y Modal
const btnAbrirModal = document.getElementById('btn-abrir-modal-lugar');
const btnCerrarModal = document.getElementById('btn-cerrar-modal-lugar');
const modalLugar = document.getElementById('modal-agregar-lugar');
const btnGuardarLugar = document.getElementById('btn-guardar-lugar');

if (btnAbrirModal) {
    btnAbrirModal.addEventListener('click', () => {
        modalLugar.classList.remove('vista-oculta');
    });
}

if (btnCerrarModal) {
    btnCerrarModal.addEventListener('click', () => {
        modalLugar.classList.add('vista-oculta');
        document.getElementById('nuevo-lugar-titulo').value = '';
        document.getElementById('nuevo-lugar-desc').value = '';
    });
}

if (btnGuardarLugar) {
    btnGuardarLugar.addEventListener('click', async () => {
        const titulo = document.getElementById('nuevo-lugar-titulo').value.trim();
        const desc = document.getElementById('nuevo-lugar-desc').value.trim();
        
        if(!titulo || !desc) {
            showToast("Por favor, completa el título y la descripción.");
            return;
        }
        
        btnGuardarLugar.innerText = "Guardando...";
        const center = map.getCenter();
        
        try {
            await addDoc(collection(db, "lugares_comunidad"), {
                titulo: titulo,
                descripcion: desc,
                coords: [center.lat, center.lng],
                fecha: new Date()
            });
            showToast("¡Lugar agregado con éxito!");
            modalLugar.classList.add('vista-oculta');
            document.getElementById('nuevo-lugar-titulo').value = '';
            document.getElementById('nuevo-lugar-desc').value = '';
            btnGuardarLugar.innerText = "Guardar Lugar";
            
            // Añadir el pin de inmediato
            L.marker([center.lat, center.lng]).addTo(map)
             .bindPopup(`<b>${titulo}</b><br>${desc}`).openPopup();
             
        } catch(e) {
            console.error(e);
            showToast("Error al guardar el lugar.");
            btnGuardarLugar.innerText = "Guardar Lugar";
        }
    });
}

// Cargar lugares guardados por la comunidad
async function cargarLugaresComunidad() {
    try {
        const consulta = query(collection(db, "lugares_comunidad"));
        const qs = await getDocs(consulta);
        qs.forEach((docSnap) => {
            const data = docSnap.data();
            if(data.coords) {
                L.marker(data.coords).addTo(map).bindPopup(`<b>${data.titulo}</b><br>${data.descripcion}`);
            }
        });
    } catch(e) {
        console.error("Error cargando lugares comunidad", e);
    }
}
cargarLugaresComunidad();


// -----------------------------------------------------
// LÓGICA DEL CALENDARIO
// -----------------------------------------------------
const mesAñoActual = document.getElementById('mes-año-actual');
const calendarioGrid = document.getElementById('calendario-grid');
let currentDate = new Date(); 
let eventosGuardados = {}; 

async function cargarEventosMes() {
    try {
        const qs = await getDocs(query(collection(db, "eventos_comunidad")));
        eventosGuardados = {};
        qs.forEach(docSnap => {
            const data = docSnap.data();
            if(data.fecha_str) {
                if(!eventosGuardados[data.fecha_str]) eventosGuardados[data.fecha_str] = [];
                eventosGuardados[data.fecha_str].push(data);
            }
        });
        renderCalendario();
    } catch(e) {
        console.error("Error cargando eventos", e);
    }
}

function renderCalendario() {
    if (!calendarioGrid) return;
    calendarioGrid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    mesAñoActual.innerText = `${nombresMeses[month]} ${year}`;
    
    const primerDiaMes = new Date(year, month, 1).getDay();
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < primerDiaMes; i++) {
        const cell = document.createElement('div');
        cell.className = 'dia-calendario vacio';
        calendarioGrid.appendChild(cell);
    }
    
    for (let day = 1; day <= diasEnMes; day++) {
        const cell = document.createElement('div');
        cell.className = 'dia-calendario';
        cell.innerText = day;
        
        const fechaStr = `${year}-${String(month+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (eventosGuardados[fechaStr] && eventosGuardados[fechaStr].length > 0) {
            cell.classList.add('tiene-evento');
        }
        
        cell.addEventListener('click', () => abrirModalEvento(fechaStr));
        calendarioGrid.appendChild(cell);
    }
}

const btnMesAnt = document.getElementById('btn-mes-anterior');
const btnMesSig = document.getElementById('btn-mes-siguiente');

if(btnMesAnt) {
    btnMesAnt.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendario();
    });
}
if(btnMesSig) {
    btnMesSig.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendario();
    });
}

// -----------------------------------------------------
// MODAL DE EVENTOS Y GUARDADO
// -----------------------------------------------------
const modalEvento = document.getElementById('modal-agregar-evento');
const btnCerrarEvento = document.getElementById('btn-cerrar-modal-evento');
const btnGuardarEvento = document.getElementById('btn-guardar-evento');
let fechaSeleccionadaParaEvento = "";

function abrirModalEvento(fechaStr) {
    fechaSeleccionadaParaEvento = fechaStr;
    document.getElementById('evento-fecha-seleccionada').innerText = "Fecha: " + fechaStr;
    
    const listaEventos = document.getElementById('lista-eventos-dia');
    listaEventos.innerHTML = "";
    
    if (eventosGuardados[fechaStr] && eventosGuardados[fechaStr].length > 0) {
        eventosGuardados[fechaStr].forEach(ev => {
            listaEventos.innerHTML += `<div style="background: rgba(224, 255, 194, 0.4); padding: 10px; border-radius: 8px; margin-bottom: 8px;">
                <strong>${ev.titulo}</strong>
                <p style="margin: 5px 0 0 0; font-size: 13px;">${ev.descripcion}</p>
            </div>`;
        });
    } else {
        listaEventos.innerHTML = '<p style="font-size: 13px; color: #888;">No hay eventos aún.</p>';
    }
    
    modalEvento.classList.remove('vista-oculta');
}

if(btnCerrarEvento) {
    btnCerrarEvento.addEventListener('click', () => {
        modalEvento.classList.add('vista-oculta');
    });
}

if(btnGuardarEvento) {
    btnGuardarEvento.addEventListener('click', async () => {
        const tit = document.getElementById('nuevo-evento-titulo').value.trim();
        const desc = document.getElementById('nuevo-evento-desc').value.trim();
        if(!tit || !desc) { showToast("Llena los datos."); return; }
        
        btnGuardarEvento.innerText = "Guardando...";
        try {
            await addDoc(collection(db, "eventos_comunidad"), {
                fecha_str: fechaSeleccionadaParaEvento,
                titulo: tit,
                descripcion: desc,
                timestamp: new Date()
            });
            showToast("Evento creado.");
            document.getElementById('nuevo-evento-titulo').value = '';
            document.getElementById('nuevo-evento-desc').value = '';
            btnGuardarEvento.innerText = "Guardar";
            modalEvento.classList.add('vista-oculta');
            cargarEventosMes();
        } catch(e) {
            console.error(e); showToast("Error al guardar."); btnGuardarEvento.innerText = "Guardar";
        }
    });
}

// -----------------------------------------------------
// LÓGICA DEL FORO
// -----------------------------------------------------
const btnPublicarForo = document.getElementById('btn-publicar-foro');
const listaForo = document.getElementById('lista-temas-foro');

async function cargarForo() {
    try {
        const qs = await getDocs(query(collection(db, "foro_comunidad")));
        if(qs.empty) {
            if(listaForo) listaForo.innerHTML = '<p>No hay temas aún. Sé el primero.</p>';
            return;
        }
        let html = '';
        qs.forEach(docSnap => {
            const data = docSnap.data();
            html += `<div class="post-card">
                <h3>${data.titulo}</h3>
                <p>${data.descripcion}</p>
                <div style="font-size: 11px; color: #888; margin-top:10px;">Comunidad Raíz</div>
            </div>`;
        });
        if(listaForo) listaForo.innerHTML = html;
    } catch (e) { console.error("Error cargando foro", e); }
}

if(btnPublicarForo) {
    btnPublicarForo.addEventListener('click', async () => {
        const tit = document.getElementById('foro-titulo').value.trim();
        const desc = document.getElementById('foro-desc').value.trim();
        if(!tit || !desc) { showToast("Llena los datos."); return; }
        
        btnPublicarForo.innerText = "Creando...";
        try {
            await addDoc(collection(db, "foro_comunidad"), {
                titulo: tit,
                descripcion: desc,
                timestamp: new Date()
            });
            showToast("Tema creado.");
            document.getElementById('foro-titulo').value = '';
            document.getElementById('foro-desc').value = '';
            btnPublicarForo.innerText = "Crear Tema";
            cargarForo();
        } catch(e) {
            console.error(e); showToast("Error."); btnPublicarForo.innerText = "Crear Tema";
        }
    });
}

cargarEventosMes();
cargarForo();
