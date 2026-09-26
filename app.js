import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

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

// --- 1. PANTALLA DE BIENVENIDA ---
document.getElementById('btn-explorar').addEventListener('click', () => {
    const pantalla = document.getElementById('pantalla-bienvenida');
    pantalla.style.opacity = '0';
    pantalla.style.transition = 'opacity 0.5s ease';
    setTimeout(() => { pantalla.classList.replace('vista-activa', 'vista-oculta'); }, 500);
});

// --- 2. INICIALIZACIÓN DEL MAPA ---
const map = L.map('mapa-fondo', { zoomControl: false }).setView([-11.8, -75.3], 9);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20, attribution: '© OpenStreetMap © CARTO'
}).addTo(map);

setTimeout(() => { map.invalidateSize(); }, 800);

// Pines Oficiales Raíz
const puntosOficiales = [
    { coords: [-11.916, -75.316], title: "Vivero Amor Nativas", description: "Ubicado en Concepción, produce plantas de Quinuales y tiene el objetivo de propagar especies nativas para proyectos de reforestación en todo Junín.", image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800" },
    { coords: [-11.420, -75.690], title: "Ruta Andino Selvatica", description: "Espectacular ruta de trekking que atraviesa la puna húmeda y los densos bosques de neblina en la zona de La Unión-Huasahuasi.", image: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800" },
    { coords: [-11.950, -75.250], title: "Ilish Pichacoto & Rumiwasi", description: "En Saño, Huancayo, esta es la primera área de conservación de Junín. Incluye zonas arqueológicas, áreas de camping y promueve la agricultura regenerativa.", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800" }
];

puntosOficiales.forEach(punto => {
    const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: #145938; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #E0FFC2; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });

    L.marker(punto.coords, { icon: customIcon }).addTo(map).on('click', () => {
        abrirVentanaLugar(punto);
    });
});

window.buscarLugar = async function () {
    const input = document.getElementById('input-busqueda').value;
    if (!input) return;
    try {
        const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${input}, Junin, Peru`);
        const datos = await respuesta.json();
        if (datos.length > 0) {
            const lat = parseFloat(datos[0].lat); const lon = parseFloat(datos[0].lon);
            map.flyTo([lat, lon], 14);
            L.marker([lat, lon]).addTo(map).bindPopup(`<b style="color:#145938; font-family:'Outfit';">${datos[0].display_name.split(',')[0]}</b>`).openPopup();
        }
    } catch (error) { console.error(error); }
};

// --- 3. CONTROL DE VENTANAS CENTRALES (HUD) ---
const overlayVentanas = document.getElementById('overlay-ventanas');
const triggers = document.querySelectorAll('.nav-trigger');
const vistasInternas = document.querySelectorAll('.vista-interna');

triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
        const targetId = trigger.dataset.target;

        // Cierra el lugar específico si está abierto
        document.getElementById('overlay-lugar').classList.replace('vista-activa', 'vista-oculta');

        if (targetId === "mapa-puro") {
            overlayVentanas.classList.replace('vista-activa', 'vista-oculta');
            return;
        }

        // Mostrar overlay difuminado
        overlayVentanas.classList.replace('vista-oculta', 'vista-activa');

        // Cambiar vista interna
        vistasInternas.forEach(vista => {
            if (vista.id === targetId) {
                vista.classList.replace('vista-oculta', 'vista-activa');
            } else {
                vista.classList.replace('vista-activa', 'vista-oculta');
            }
        });
    });
});

document.getElementById('btn-cerrar-ventana').addEventListener('click', () => {
    overlayVentanas.classList.replace('vista-activa', 'vista-oculta');
});

// --- 4. VENTANA DE LUGAR ESPECÍFICO ---
const overlayLugar = document.getElementById('overlay-lugar');

document.getElementById('btn-cerrar-lugar').addEventListener('click', () => {
    overlayLugar.classList.replace('vista-activa', 'vista-oculta');
});

function abrirVentanaLugar(data) {
    overlayVentanas.classList.replace('vista-activa', 'vista-oculta'); // Ocultar centro

    document.getElementById('detalle-titulo').innerText = data.title;
    document.getElementById('detalle-descripcion').innerText = data.description;
    document.getElementById('detalle-img').src = data.image;

    overlayLugar.classList.replace('vista-oculta', 'vista-activa');
}

// --- 5. PUBLICACIONES Y FIREBASE ---
const modalPub = document.getElementById('modal-nueva-publicacion');
document.getElementById('btn-nueva-publicacion').addEventListener('click', () => modalPub.classList.replace('vista-oculta', 'vista-activa'));
document.getElementById('btn-cerrar-modal-publicacion').addEventListener('click', () => modalPub.classList.replace('vista-activa', 'vista-oculta'));

document.getElementById('btn-publicar').addEventListener('click', async () => {
    const titulo = document.getElementById('titulo').value;
    const lugar = document.getElementById('lugar').value;
    const descripcion = document.getElementById('descripcion').value;

    if (!titulo || !lugar) { alert("Llena los datos"); return; }

    document.getElementById('btn-publicar').innerText = "Guardando...";
    try {
        await addDoc(collection(db, "publicaciones"), {
            titulo: titulo, lugar: lugar, descripcion: descripcion, fecha: new Date()
        });
        document.getElementById('titulo').value = "";
        document.getElementById('lugar').value = "";
        document.getElementById('descripcion').value = "";
        modalPub.classList.replace('vista-activa', 'vista-oculta');
        document.getElementById('btn-publicar').innerText = "Publicar";
        cargarPublicaciones();
    } catch (e) { console.error(e); }
});

async function cargarPublicaciones() {
    const feedComunidad = document.getElementById('feed-comunidad');
    try {
        const qs = await getDocs(query(collection(db, "publicaciones")));
        let html = '<div class="etiqueta-top">FEED DE ACCIÓN</div>';

        if (qs.empty) {
            html += `<p style="color:white; text-align:center; font-weight:bold; margin-top:20px;">Aún no hay publicaciones. ¡Sé el primero!</p>`;
        }

        qs.forEach((docSnap) => {
            const data = docSnap.data();
            html += `
                <div class="tarjeta-feed">
                    <h3 style="margin-top:0; font-size: 20px;">${data.titulo}</h3>
                    <p style="color: var(--leaf); font-weight: bold; margin-bottom: 15px;">📍 ${data.lugar}</p>
                    <div style="background: rgba(255,255,255,0.2); height: 2px; width: 100%; margin-bottom: 15px;"></div>
                    <p style="font-size: 15px; line-height: 1.5; color: rgba(255,255,255,0.9);">${data.descripcion}</p>
                </div>
            `;
        });
        feedComunidad.innerHTML = html;
    } catch (e) { console.error(e); }
}

// Cargar al inicio
cargarPublicaciones();