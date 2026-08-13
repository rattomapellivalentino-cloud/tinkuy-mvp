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

// MAPA CON PROVEEDOR PROFESIONAL (CartoDB) PARA EVITAR BLOQUEOS
const map = L.map('mapa-fondo', { zoomControl: false }).setView([-12.065, -75.204], 10);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '© OpenStreetMap © CARTO'
}).addTo(map);

// FORZAR A LEAFLET A DIBUJAR EL MAPA EN PC SÍ O SÍ
window.addEventListener('resize', () => {
    map.invalidateSize();
});
// Hacemos un doble chequeo de tamaño para asegurar que cargue
setTimeout(() => { map.invalidateSize(); }, 100);
setTimeout(() => { map.invalidateSize(); }, 1000);

// --- DATOS DE PUNTOS OFICIALES ---
// Estructuramos los datos para poder usarlos en los marcadores y el panel de detalle
const puntosOficiales = [
    {
        coords: [-11.916, -75.316],
        title: "Vivero Amor Nativas",
        description: "Ubicado en Concepción, este vivero produce plantas de Quinuales y tiene el objetivo de aprender a propagar diversas especies nativas de la zona para proyectos de reforestación.",
        image: "imagenes/img1.jpg" // Reemplaza con la imagen correcta
    },
    {
        coords: [-11.420, -75.690],
        title: "Ruta Andino Selvatica",
        description: "Una ruta de trekking que atraviesa la puna húmeda y los bosques de neblina en la zona de La Unión-Huasahuasi, ideal para conectar con la biodiversidad.",
        image: "imagenes/img2.jpg" // Reemplaza con la imagen correcta
    },
    {
        coords: [-11.950, -75.250],
        title: "Ilish Pichacoto & Rumiwasi",
        description: "En Saño, Huancayo, esta es la primera área de conservación de Junín administrada por la comunidad. Incluye zonas arqueológicas, camping y promueve la agricultura regenerativa.",
        image: "imagenes/img3.jpg" // Reemplaza con la imagen correcta
    },
    // ... puedes agregar el resto de puntos aquí
];

// Pines Oficiales Raíz
puntosOficiales.forEach(punto => {
    L.marker(punto.coords)
        .addTo(map)
        .on('click', () => {
            abrirDetalle(punto);
        });
});
// Marcadores restantes (sin datos completos, abrirán el panel con info limitada)
// L.marker([-11.666, -75.933]).addTo(map).bindPopup("<b>Proyecto Villasol</b><br>Yauli");
// L.marker([-12.061, -75.320]).addTo(map).bindPopup("<b>Ñahuinpuquio</b><br>Chupaca");
// L.marker([-11.980, -75.280]).addTo(map).bindPopup("<b>Wasi Kamaq</b><br>San Jerónimo, Huancayo");

// -----------------------------------------------------
// LÓGICA DE BÚSQUEDA EN MAPA (API NOMINATIM)
// -----------------------------------------------------
window.buscarLugar = async function() {
    const input = document.getElementById('input-busqueda').value;
    if (!input) return;
    
    try {
        const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${input}, Junin, Peru`);
        const datos = await respuesta.json();
        
        if (datos.length > 0) {
            const lat = parseFloat(datos[0].lat);
            const lon = parseFloat(datos[0].lon);
            const nombreLugar = datos[0].display_name.split(',')[0];
            
            map.flyTo([lat, lon], 14);
            L.marker([lat, lon]).addTo(map).bindPopup(`<b>${nombreLugar}</b>`).openPopup();
            document.getElementById('lugar').value = nombreLugar;
        } else {
            alert("No encontramos ese lugar. Intenta buscar la provincia o ciudad principal.");
        }
    } catch (error) {
        console.error("Error buscando ubicación:", error);
    }
};

// -----------------------------------------------------
// LÓGICA DE PUBLICACIÓN Y MURO
// -----------------------------------------------------
const botonPublicar = document.getElementById('btn-publicar');

botonPublicar.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo').value;
    const lugar = document.getElementById('lugar').value;
    const descripcion = document.getElementById('descripcion').value;

    if (titulo === "" || lugar === "" || descripcion === "") {
        alert("Completa todos los datos para publicar.");
        return; 
    }

    botonPublicar.innerText = "Subiendo...";

    try {
        await addDoc(collection(db, "publicaciones"), {
            titulo: titulo,
            lugar: lugar,
            descripcion: descripcion,
            fecha: new Date(),
            salida_aprobada: false,
            comentarios: [] 
        });

        document.getElementById('titulo').value = "";
        document.getElementById('lugar').value = "";
        document.getElementById('descripcion').value = "";
        botonPublicar.innerText = "Publicar en Raíz";
        cargarPublicaciones();

    } catch (error) {
        console.error("Error: ", error);
        alert("No se pudo conectar.");
        botonPublicar.innerText = "Publicar en Raíz";
    }
});

const contenedorMuro = document.getElementById('muro-publicaciones');

async function cargarPublicaciones() {
    contenedorMuro.innerHTML = "<p style='color: rgba(6, 71, 52, 0.5);'>Actualizando muro...</p>";
    
    try {
        const consulta = query(collection(db, "publicaciones"));
        const querySnapshot = await getDocs(consulta);
        contenedorMuro.innerHTML = ""; 

        if (querySnapshot.empty) {
            contenedorMuro.innerHTML = "<p style='color: rgba(6, 71, 52, 0.5);'>Aún no hay actividades. Sé el primero.</p>";
            return;
        }

        let publicacionesHTML = "";

        querySnapshot.forEach((documento) => {
            const data = documento.data();
            const docId = documento.id;
            
            let comentariosHTML = "";
            if (data.comentarios && data.comentarios.length > 0) {
                data.comentarios.forEach(comentario => {
                    comentariosHTML += `<div class="comentario-box">${comentario}</div>`;
                });
            }

            const tarjeta = `
                <div class="post-card">
                    <h3>${data.titulo}</h3>
                    <p style="font-weight: 600;">📍 ${data.lugar}</p>
                    <p>${data.descripcion}</p>
                    
                    <span class="etiqueta" style="background-color: ${data.salida_aprobada ? 'var(--leaf)' : '#f2f2f7'}; color: var(--forest);">
                        ${data.salida_aprobada ? '✅ Verificado por Raíz' : '⏳ Pendiente de revisión'}
                    </span>

                    <div class="comentarios-seccion" style="margin-top: 10px;">
                        <div class="comentarios-lista">
                            ${comentariosHTML}
                        </div>
                        <div class="input-comentario-row">
                            <input type="text" class="input-comentario" placeholder="Añadir comentario...">
                            <button class="btn-enviar-comentario" data-docid="${docId}">Enviar</button>
                        </div>
                    </div>
                </div>
            `;
            publicacionesHTML += tarjeta;
        });

        contenedorMuro.innerHTML = publicacionesHTML;

    } catch (error) {
        console.error("Error: ", error);
        contenedorMuro.innerHTML = "<p>Hubo un problema de conexión.</p>";
    }
}

async function enviarComentario(idDocumento, textoComentario, boton) {
    boton.disabled = true;
    boton.innerText = "Enviando...";

    if (textoComentario.trim() === "") return;

    try {
        const docRef = doc(db, "publicaciones", idDocumento);
        await updateDoc(docRef, {
            comentarios: arrayUnion(textoComentario)
        });

        // Actualizar la UI sin recargar todo
        const seccionComentarios = boton.closest('.comentarios-seccion');
        const listaComentarios = seccionComentarios.querySelector('.comentarios-lista');
        const nuevoComentarioDiv = document.createElement('div');
        nuevoComentarioDiv.className = 'comentario-box';
        nuevoComentarioDiv.textContent = textoComentario;
        listaComentarios.appendChild(nuevoComentarioDiv);

        // Limpiar input y restaurar botón
        const inputComentario = seccionComentarios.querySelector('.input-comentario');
        inputComentario.value = "";
        boton.disabled = false;
        boton.innerText = "Enviar";

    } catch (error) {
        console.error("Error: ", error);
        alert("No se pudo enviar el comentario.");
        boton.disabled = false;
        boton.innerText = "Enviar";
    }
};

contenedorMuro.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-enviar-comentario')) {
        const boton = e.target;
        const idDocumento = boton.dataset.docid;
        const textoComentario = boton.previousElementSibling.value;
        enviarComentario(idDocumento, textoComentario, boton);
    }
});

// Cargar el muro al iniciar
cargarPublicaciones();

// -----------------------------------------------------
// INTERFAZ Y ANIMACIONES
// -----------------------------------------------------
const btnMenu = document.getElementById('btn-menu');
const menuDesplegable = document.getElementById('menu-desplegable');

if(btnMenu) {
    btnMenu.addEventListener('click', () => {
        menuDesplegable.style.display = menuDesplegable.style.display === 'block' ? 'none' : 'block';
    });
}

const swiper = new Swiper('.mySwiper', {
    pagination: { el: ".swiper-pagination", dynamicBullets: true },
    loop: true, 
});

// --- LÓGICA DEL PANEL DE DETALLE (ANIMACIÓN DE 3 FASES) ---
const panelDetalle = document.getElementById('panel-detalle');
const cerrarDetalle = document.getElementById('cerrar-detalle');

function abrirDetalle(data) {
    // Poblar el panel con la información del lugar
    document.getElementById('detalle-titulo').textContent = data.title;
    document.getElementById('detalle-descripcion').textContent = data.description;
    document.getElementById('detalle-img').querySelector('img').src = data.image;
    
    // Resetear estado y mostrar
    panelDetalle.scrollTop = 0;
    panelDetalle.classList.remove('fase-2', 'fase-3');
    panelDetalle.classList.add('activo');
}

if (cerrarDetalle && panelDetalle) {
    cerrarDetalle.addEventListener('click', () => {
        panelDetalle.classList.remove('activo');
    });

    panelDetalle.addEventListener('scroll', () => {
        const scrollActual = panelDetalle.scrollTop;

        // Las clases se añaden progresivamente al subir
        if (scrollActual > 10) { // Umbral para iniciar la fase 2
            panelDetalle.classList.add('fase-2');
        }
        if (scrollActual > 20) { // Umbral para la fase 3
            panelDetalle.classList.add('fase-3');
        }

        // Las clases se quitan al bajar
        if (scrollActual < 20) {
            panelDetalle.classList.remove('fase-3');
        }
        if (scrollActual < 10) {
            panelDetalle.classList.remove('fase-2');
        }
    });
}

// --- LÓGICA DE NAVEGACIÓN INFERIOR ---
const navItems = document.querySelectorAll('.nav-item');
const pageContainers = document.querySelectorAll('.page-container');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        // Quitar 'active' de todos los items
        navItems.forEach(nav => nav.classList.remove('active'));
        // Añadir 'active' al clickeado
        item.classList.add('active');

        const targetId = item.id.replace('nav-', ''); // 'inicio', 'chat', 'perfil'
        const targetContainerId = `${targetId}-container`;

        // Ocultar todos los contenedores de página
        pageContainers.forEach(container => {
            container.classList.add('hidden');
        });

        // Mostrar el contenedor correcto
        const targetContainer = document.getElementById(targetContainerId);
        if (targetContainer) {
            targetContainer.classList.remove('hidden');
        }
    });
});