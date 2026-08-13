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

window.buscarLugar = async function() {
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
        } else {
            alert("No encontramos ese lugar.");
        }
    } catch (error) { console.error("Error buscando:", error); }
};

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
        if(texto.trim() === "") return;
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
    if(input.value.trim() !== "") {
        if(caja.querySelector('p')) caja.innerHTML = ""; // Quitar mensaje "No hay comentarios"
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
            if(vista.id === targetId) {
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