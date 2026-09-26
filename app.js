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

// --- PANTALLA DE BIENVENIDA ---
document.getElementById('btn-explorar').addEventListener('click', () => {
    document.getElementById('pantalla-bienvenida').style.display = 'none';
});

// --- INICIALIZACIÓN DEL MAPA ---
const map = L.map('mapa-fondo', { zoomControl: false }).setView([-12.065, -75.204], 10);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20, attribution: '© OpenStreetMap © CARTO'
}).addTo(map);
setTimeout(() => { map.invalidateSize(); }, 500);

const puntosOficiales = [
    { coords: [-11.916, -75.316], title: "Vivero Amor Nativas", description: "Ubicado en Concepción, produce plantas de Quinuales.", image: "imagenes/img1.jpg" },
    { coords: [-11.420, -75.690], title: "Ruta Andina", description: "Ruta de trekking por la puna húmeda.", image: "imagenes/img2.jpg" }
];

puntosOficiales.forEach(punto => {
    L.marker(punto.coords).addTo(map).on('click', () => {
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
            L.marker([lat, lon]).addTo(map).bindPopup(`<b>${datos[0].display_name.split(',')[0]}</b>`).openPopup();
        }
    } catch (error) { console.error(error); }
};

// --- CONTROL DE VENTANAS (HUD a Modal Central) ---
const ventanaCentral = document.getElementById('ventana-central');
const btnCerrarVentana = document.getElementById('btn-cerrar-ventana');
const triggers = document.querySelectorAll('.nav-trigger');
const vistasInternas = document.querySelectorAll('.vista-interna');

// Abrir vista desde los íconos superiores
triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
        const targetId = trigger.dataset.target;

        // Ocultar la ventana de lugar si estuviera abierta
        document.getElementById('ventana-lugar').classList.add('vista-oculta');

        // Mostrar la ventana central
        ventanaCentral.classList.remove('vista-oculta');

        // Cambiar la vista interna (Comunidad, Social, Perfil)
        vistasInternas.forEach(vista => {
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

// Cerrar ventana central
btnCerrarVentana.addEventListener('click', () => {
    ventanaCentral.classList.add('vista-oculta');
});

// --- VENTANA DE LUGAR ESPECÍFICO ---
const ventanaLugar = document.getElementById('ventana-lugar');
document.getElementById('btn-cerrar-lugar').addEventListener('click', () => {
    ventanaLugar.classList.add('vista-oculta');
});

function abrirVentanaLugar(data) {
    ventanaCentral.classList.add('vista-oculta'); // Ocultar la otra ventana para no solapar
    document.getElementById('detalle-titulo').innerText = data.title;
    document.getElementById('detalle-descripcion').innerText = data.description;

    // Si tienes imágenes reales en la carpeta, se cargarán aquí.
    document.getElementById('detalle-img').src = data.image;

    ventanaLugar.classList.remove('vista-oculta');
}

// --- LÓGICA DEL BOTÓN PUBLICAR (Conecta con Modal) ---
const modalPub = document.getElementById('modal-nueva-publicacion');
document.getElementById('btn-nueva-publicacion').addEventListener('click', () => modalPub.classList.remove('vista-oculta'));
document.getElementById('btn-quick-post').addEventListener('click', () => modalPub.classList.remove('vista-oculta'));
document.getElementById('btn-cerrar-modal-publicacion').addEventListener('click', () => modalPub.classList.add('vista-oculta'));

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
        document.getElementById('descripcion').value = "";
        modalPub.classList.add('vista-oculta');
        document.getElementById('btn-publicar').innerText = "Publicar en Raíz";
        cargarPublicaciones();
    } catch (e) { console.error(e); }
});

async function cargarPublicaciones() {
    const feedComunidad = document.getElementById('feed-comunidad');
    try {
        const qs = await getDocs(query(collection(db, "publicaciones")));
        let html = '<div class="etiqueta-top">ACTIVIDADES RECIENTES</div>';
        qs.forEach((docSnap) => {
            const data = docSnap.data();
            html += `
                <div class="tarjeta-feed">
                    <div style="color: white; font-weight: bold; font-size: 18px; margin-bottom: 10px;">${data.titulo}</div>
                    <div style="color: var(--leaf); margin-bottom: 15px;">📍 ${data.lugar}</div>
                    <div class="linea-placeholder"></div>
                    <div class="foto-placeholder">${data.descripcion}</div>
                </div>
            `;
        });
        feedComunidad.innerHTML = html;
    } catch (e) { console.error(e); }
}
cargarPublicaciones();