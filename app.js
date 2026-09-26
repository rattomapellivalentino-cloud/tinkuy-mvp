import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, arrayUnion, getDoc, setDoc, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js";

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
const auth = getAuth(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let isUserAdmin = false;

// Configuración Auth
onAuthStateChanged(auth, async (user) => {
    const pDesconectado = document.getElementById('perfil-desconectado');
    const pConectado = document.getElementById('perfil-conectado');
    const badgeAdmin = document.getElementById('badge-admin');
    const seccionAdminEvento = document.getElementById('seccion-admin-evento');

    if (user) {
        currentUser = user;
        if (pDesconectado) pDesconectado.classList.add('vista-oculta');
        if (pConectado) pConectado.classList.remove('vista-oculta');

        document.getElementById('perfil-nombre').innerText = user.displayName;
        document.getElementById('perfil-email').innerText = user.email;
        if (user.photoURL) document.getElementById('perfil-foto').src = user.photoURL;

        try {
            await setDoc(doc(db, "usuarios", user.uid), {
                nombre: user.displayName,
                email: user.email,
                foto: user.photoURL || ""
            }, { merge: true });
        } catch (e) { console.error("Error guardando usuario:", e); }

        if (typeof cargarContactos === 'function') cargarContactos();
        if (typeof cargarChatsRecientes === 'function') cargarChatsRecientes();

        try {
            if (user.email) {
                const adminDoc = await getDoc(doc(db, "admins", user.email));
                if (adminDoc.exists()) {
                    isUserAdmin = true;
                    if (badgeAdmin) badgeAdmin.classList.remove('vista-oculta');
                    if (seccionAdminEvento) seccionAdminEvento.classList.remove('vista-oculta');
                } else {
                    isUserAdmin = false;
                    if (badgeAdmin) badgeAdmin.classList.add('vista-oculta');
                    if (seccionAdminEvento) seccionAdminEvento.classList.add('vista-oculta');
                }
            }
        } catch (e) {
            console.error("Error verificando admin", e);
            isUserAdmin = false;
        }
    } else {
        currentUser = null;
        isUserAdmin = false;
        if (pDesconectado) pDesconectado.classList.remove('vista-oculta');
        if (pConectado) pConectado.classList.add('vista-oculta');
        if (badgeAdmin) badgeAdmin.classList.add('vista-oculta');
        if (seccionAdminEvento) seccionAdminEvento.classList.add('vista-oculta');
    }
});

const btnLoginGoogle = document.getElementById('btn-login-google');
if (btnLoginGoogle) {
    btnLoginGoogle.addEventListener('click', async () => {
        try {
            if (window.location.protocol === 'file:') {
                alert("ERROR: Estás abriendo el archivo localmente. Usa Live Server o Vercel.");
                return;
            }
            await signInWithPopup(auth, provider);
        } catch (e) { alert("Error al iniciar sesión: " + e.message); }
    });
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) { btnLogout.addEventListener('click', () => { signOut(auth); }); }

const map = L.map('mapa-fondo', { zoomControl: false }).setView([-12.065, -75.204], 10);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 20, attribution: '© OpenStreetMap © CARTO' }).addTo(map);

function compressImage(file, maxWidth = 1000) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

window.addEventListener('resize', () => { map.invalidateSize(); });
setTimeout(() => { map.invalidateSize(); }, 100);
setTimeout(() => { map.invalidateSize(); }, 800);

const puntosOficiales = [
    { coords: [-11.916, -75.316], id_lugar: "vivero_amor", title: "Vivero Amor Nativas", description: "Ubicado en Concepción, este vivero produce plantas de Quinuales y tiene el objetivo de aprender a propagar diversas especies nativas de la zona.", image: "imagenes/img1.jpg" },
    { coords: [-11.420, -75.690], id_lugar: "ruta_andino", title: "Ruta Andino Selvatica", description: "Una ruta de trekking que atraviesa la puna húmeda y los bosques de neblina en la zona de La Unión-Huasahuasi.", image: "imagenes/img2.jpg" },
    { coords: [-11.950, -75.250], id_lugar: "ilish", title: "Ilish Pichacoto & Rumiwasi", description: "En Saño, Huancayo, esta es la primera área de conservación de Junín administrada por la comunidad.", image: "imagenes/img3.jpg" }
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
            if (window.showToast) window.showToast("No encontramos ese lugar.");
        }
    } catch (error) { console.error(error); }
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
                        map.flyTo([parseFloat(lugar.lat), parseFloat(lugar.lon)], 14);
                        L.marker([parseFloat(lugar.lat), parseFloat(lugar.lon)]).addTo(map).bindPopup(`<b>${nombreCorto}</b>`).openPopup();
                        document.getElementById('lugar').value = nombreCorto;
                    };
                    sugerenciasContainer.appendChild(item);
                });
            } else {
                sugerenciasContainer.innerHTML = '<div class="sugerencia-item">No hay sugerencias</div>';
            }
            sugerenciasContainer.classList.remove('vista-oculta');
        } catch (e) { console.error(e); }
    }, 500);
});

document.addEventListener('click', (e) => {
    if (sugerenciasContainer && !e.target.closest('.buscador-mapa')) {
        sugerenciasContainer.classList.add('vista-oculta');
    }
});

// ==========================================
// MODALES TIPO POP-UP (NUEVA LÓGICA FIGMA)
// ==========================================
const modalNuevaPublicacion = document.getElementById('modal-nueva-publicacion');
const btnNuevaPublicacion = document.getElementById('btn-nueva-publicacion');
const btnCerrarModalPublicacion = document.getElementById('btn-cerrar-modal-publicacion');
const btnQuickPost = document.getElementById('btn-quick-post');

if (btnNuevaPublicacion) { btnNuevaPublicacion.addEventListener('click', () => modalNuevaPublicacion.classList.add('activo')); }
if (btnQuickPost) { btnQuickPost.addEventListener('click', () => modalNuevaPublicacion.classList.add('activo')); }
if (btnCerrarModalPublicacion) { btnCerrarModalPublicacion.addEventListener('click', () => modalNuevaPublicacion.classList.remove('activo')); }

const btnOpenChats = document.getElementById('btn-open-chats');
const panelChats = document.getElementById('social-chats-panel');
const btnCloseChats = document.getElementById('btn-close-chats');
const btnAddFriend = document.getElementById('btn-add-friend');

if (btnOpenChats && panelChats) { btnOpenChats.addEventListener('click', () => panelChats.classList.add('activo')); btnCloseChats.addEventListener('click', () => panelChats.classList.remove('activo')); }
if (btnAddFriend && panelChats) { btnAddFriend.addEventListener('click', () => panelChats.classList.add('activo')); }

const btnCloseChatActivo = document.getElementById('btn-close-chat-activo');
const panelChatActivo = document.getElementById('chat-activo-panel');

if (btnCloseChatActivo && panelChatActivo) {
    btnCloseChatActivo.addEventListener('click', () => { panelChatActivo.style.transform = "translateX(100%)"; });
}

const botonPublicar = document.getElementById('btn-publicar');
botonPublicar.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo').value; const lugar = document.getElementById('lugar').value; const descripcion = document.getElementById('descripcion').value;
    if (titulo === "" || lugar === "" || descripcion === "") { alert("Completa los datos."); return; }
    botonPublicar.innerText = "Subiendo...";

    try {
        let fotoUrl = "";
        const inputFoto = document.getElementById('foto-muro');
        if (inputFoto && inputFoto.files && inputFoto.files[0]) {
            botonPublicar.innerText = "Procesando foto...";
            const dataUrl = await compressImage(inputFoto.files[0]);
            const storageRef = ref(storage, `publicaciones/${Date.now()}_${inputFoto.files[0].name}`);
            botonPublicar.innerText = "Subiendo foto...";
            await uploadString(storageRef, dataUrl, 'data_url');
            fotoUrl = await getDownloadURL(storageRef);
        }

        botonPublicar.innerText = "Guardando...";
        await addDoc(collection(db, "publicaciones"), {
            titulo: titulo, lugar: lugar, descripcion: descripcion, fecha: new Date(), salida_aprobada: false, comentarios: [], fotoUrl: fotoUrl, autor: currentUser ? currentUser.displayName : "Comunidad"
        });
        document.getElementById('titulo').value = ""; document.getElementById('lugar').value = ""; document.getElementById('descripcion').value = "";
        if (inputFoto) inputFoto.value = "";
        botonPublicar.innerText = "Publicar en Raíz";
        modalNuevaPublicacion.classList.remove('activo');
        cargarPublicaciones();
    } catch (error) { console.error(error); alert("Error."); botonPublicar.innerText = "Publicar en Raíz"; }
});

const contenedorMuro = document.getElementById('social-feed-content');

function formatRelativeTime(date) {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} h`;
    return `${Math.floor(hrs / 24)} d`;
}

async function cargarPublicaciones() {
    if (!contenedorMuro) return;
    try {
        const qs = await getDocs(query(collection(db, "publicaciones")));
        if (qs.empty) { contenedorMuro.innerHTML = "<p style='text-align:center; color:var(--leaf); margin-top:20px;'>Aún no hay publicaciones.</p>"; return; }

        const posts = [];
        qs.forEach((doc) => posts.push({ id: doc.id, ...doc.data() }));
        posts.sort((a, b) => (b.fecha?.toMillis ? b.fecha.toMillis() : 0) - (a.fecha?.toMillis ? a.fecha.toMillis() : 0));

        let html = "";
        posts.forEach((data) => {
            let autor = data.autor || "Usuario";
            let inicial = autor.charAt(0).toUpperCase();
            let tiempo = formatRelativeTime(data.fecha);

            html += `
                <div class="post-card-dark">
                    <div class="post-card-dark-header">
                        <div class="post-avatar" style="display:flex; align-items:center; justify-content:center; color:var(--forest); font-weight:bold;">${inicial}</div>
                        <div class="post-meta">
                            <span class="post-name-time"><span class="post-name">${autor}</span><span class="post-time">${tiempo}</span></span>
                        </div>
                    </div>
                    <div class="post-text-dark">
                        <strong>${data.titulo}</strong><br>
                        <span style="font-size: 12px; opacity: 0.8; color: var(--leaf);"><i data-lucide="map-pin" style="width:12px; height:12px; display:inline-block; margin-right:3px; vertical-align:middle;"></i>${data.lugar}</span><br>
                        ${data.descripcion}
                    </div>
                    ${data.fotoUrl ? `<img src="${data.fotoUrl}" class="post-img-dark">` : ''}
                    <div class="post-actions-dark">
                        <i data-lucide="heart"></i><i data-lucide="message-circle" class="btn-open-comments" data-docid="${data.id}"></i><i data-lucide="bookmark"></i><i data-lucide="send"></i>
                    </div>
                </div>`;
        });
        contenedorMuro.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    } catch (error) { console.error(error); }
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
// LÓGICA DE DETALLES Y ANIMACIONES
// -----------------------------------------------------
const panelDetalle = document.getElementById('panel-detalle');
let lugarActualId = "";
let currentSnap = "hidden";
let startY = 0;

function setSnap(snap) {
    currentSnap = snap;
    panelDetalle.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
    if (snap === "hidden") panelDetalle.style.transform = "translateY(100%)";
    else if (snap === "peek") panelDetalle.style.transform = "translateY(65%)";
    else if (snap === "mid") panelDetalle.style.transform = "translateY(30%)";
    else if (snap === "full") panelDetalle.style.transform = "translateY(0%)";
}

function abrirDetalle(data) {
    document.getElementById('detalle-titulo').textContent = data.title;
    document.getElementById('detalle-descripcion').textContent = data.description;
    document.getElementById('detalle-img').querySelector('img').src = data.image;
    lugarActualId = data.id_lugar;
    panelDetalle.scrollTop = 0;
    setSnap("peek");
    history.pushState({ panelAbierto: true }, "");
}

window.addEventListener('popstate', (e) => { setSnap("hidden"); });
document.getElementById('btn-volver').addEventListener('click', () => { history.back(); });

document.getElementById('btn-comentar-lugar').addEventListener('click', () => {
    const input = document.getElementById('input-comentario-lugar');
    const caja = document.getElementById('comentarios-lugar-oficial');
    if (input.value.trim() !== "") {
        if (caja.querySelector('p')) caja.innerHTML = "";
        caja.innerHTML += `<div class="comentario-box">${input.value}</div>`;
        input.value = "";
    }
});

const navBtns = document.querySelectorAll('.nav-btn, .nav-item');
const vistas = document.querySelectorAll('#main-content > div');

navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        navBtns.forEach(b => b.classList.remove('active'));
        const targetId = btn.dataset.target;
        document.querySelectorAll(`[data-target="${targetId}"]`).forEach(b => {
            b.classList.add('active');
            if (b.classList.contains('nav-item')) {
                const navItems = Array.from(document.querySelectorAll('.nav-item'));
                const indicator = document.querySelector('.nav-indicator');
                if (indicator) indicator.style.transform = `translateX(${navItems.indexOf(b) * 100}%)`;
            }
        });

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

window.showToast = function (message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3000);
};

// ==========================================
// MODAL AGREGAR LUGAR (NUEVO ESTILO POP-UP)
// ==========================================
const btnAbrirModal = document.getElementById('btn-abrir-modal-lugar');
const btnCerrarModal = document.getElementById('btn-cerrar-modal-lugar');
const modalLugar = document.getElementById('modal-agregar-lugar');
const btnGuardarLugar = document.getElementById('btn-guardar-lugar');

if (btnAbrirModal) { btnAbrirModal.addEventListener('click', () => modalLugar.classList.add('activo')); }
if (btnCerrarModal) {
    btnCerrarModal.addEventListener('click', () => {
        modalLugar.classList.remove('activo');
        document.getElementById('nuevo-lugar-titulo').value = '';
        document.getElementById('nuevo-lugar-desc').value = '';
    });
}

if (btnGuardarLugar) {
    btnGuardarLugar.addEventListener('click', async () => {
        const titulo = document.getElementById('nuevo-lugar-titulo').value.trim();
        const desc = document.getElementById('nuevo-lugar-desc').value.trim();
        if (!titulo || !desc) { showToast("Por favor, completa el título y la descripción."); return; }

        btnGuardarLugar.innerText = "Guardando...";
        const center = map.getCenter();

        try {
            let fotoUrl = "";
            const inputFoto = document.getElementById('foto-lugar');
            if (inputFoto && inputFoto.files && inputFoto.files[0]) {
                btnGuardarLugar.innerText = "Procesando foto...";
                const dataUrl = await compressImage(inputFoto.files[0]);
                const storageRef = ref(storage, `lugares/${Date.now()}_${inputFoto.files[0].name}`);
                btnGuardarLugar.innerText = "Subiendo foto...";
                await uploadString(storageRef, dataUrl, 'data_url');
                fotoUrl = await getDownloadURL(storageRef);
            }

            btnGuardarLugar.innerText = "Guardando lugar...";
            await addDoc(collection(db, "lugares_comunidad"), {
                titulo: titulo, descripcion: desc, coords: [center.lat, center.lng], fotoUrl: fotoUrl, fecha: new Date()
            });
            showToast("¡Lugar agregado con éxito!");
            modalLugar.classList.remove('activo');
            document.getElementById('nuevo-lugar-titulo').value = ''; document.getElementById('nuevo-lugar-desc').value = '';
            if (inputFoto) inputFoto.value = '';
            btnGuardarLugar.innerText = "Guardar Lugar";

            let popupContent = `<b>${titulo}</b><br>${desc}`;
            if (fotoUrl) popupContent += `<br><img src="${fotoUrl}" style="width:100%; max-height:150px; object-fit:cover; margin-top:10px; border-radius:5px;">`;
            L.marker([center.lat, center.lng]).addTo(map).bindPopup(popupContent).openPopup();
        } catch (e) { console.error(e); showToast("Error al guardar el lugar."); btnGuardarLugar.innerText = "Guardar Lugar"; }
    });
}

async function cargarLugaresComunidad() {
    try {
        const qs = await getDocs(query(collection(db, "lugares_comunidad")));
        qs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.coords) L.marker(data.coords).addTo(map).bindPopup(`<b>${data.titulo}</b><br>${data.descripcion}`);
        });
    } catch (e) { console.error(e); }
}
cargarLugaresComunidad();

// ==========================================
// MODAL DE EVENTOS Y CALENDARIO
// ==========================================
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
            if (data.fecha_str) {
                if (!eventosGuardados[data.fecha_str]) eventosGuardados[data.fecha_str] = [];
                eventosGuardados[data.fecha_str].push(data);
            }
        });
        renderCalendario();
    } catch (e) { console.error(e); }
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
        const cell = document.createElement('div'); cell.className = 'dia-calendario vacio'; calendarioGrid.appendChild(cell);
    }

    for (let day = 1; day <= diasEnMes; day++) {
        const cell = document.createElement('div');
        cell.className = 'dia-calendario'; cell.innerText = day;
        const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (eventosGuardados[fechaStr] && eventosGuardados[fechaStr].length > 0) cell.classList.add('tiene-evento');

        cell.addEventListener('click', () => abrirModalEvento(fechaStr));
        calendarioGrid.appendChild(cell);
    }
}

const btnMesAnt = document.getElementById('btn-mes-anterior');
const btnMesSig = document.getElementById('btn-mes-siguiente');

if (btnMesAnt) btnMesAnt.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendario(); });
if (btnMesSig) btnMesSig.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendario(); });

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

    modalEvento.classList.add('activo');
}

if (btnCerrarEvento) btnCerrarEvento.addEventListener('click', () => modalEvento.classList.remove('activo'));

if (btnGuardarEvento) {
    btnGuardarEvento.addEventListener('click', async () => {
        if (!isUserAdmin) { if (window.showToast) showToast("No tienes permisos para crear eventos."); return; }
        const tit = document.getElementById('nuevo-evento-titulo').value.trim();
        const desc = document.getElementById('nuevo-evento-desc').value.trim();
        if (!tit || !desc) { showToast("Llena los datos."); return; }

        btnGuardarEvento.innerText = "Guardando...";
        try {
            await addDoc(collection(db, "eventos_comunidad"), { fecha_str: fechaSeleccionadaParaEvento, titulo: tit, descripcion: desc, timestamp: new Date() });
            showToast("Evento creado.");
            document.getElementById('nuevo-evento-titulo').value = ''; document.getElementById('nuevo-evento-desc').value = '';
            btnGuardarEvento.innerText = "Guardar";
            modalEvento.classList.remove('activo');
            cargarEventosMes();
        } catch (e) { console.error(e); showToast("Error al guardar."); btnGuardarEvento.innerText = "Guardar"; }
    });
}

const btnPublicarForo = document.getElementById('btn-publicar-foro');
const listaForo = document.getElementById('lista-temas-foro');

async function cargarForo() {
    try {
        const qs = await getDocs(query(collection(db, "foro_comunidad")));
        if (qs.empty) { if (listaForo) listaForo.innerHTML = '<p>No hay temas aún. Sé el primero.</p>'; return; }
        let html = '';
        qs.forEach(docSnap => {
            const data = docSnap.data();
            html += `<div class="post-card"><h3>${data.titulo}</h3><p>${data.descripcion}</p><div style="font-size: 11px; color: #888; margin-top:10px;">Comunidad Raíz</div></div>`;
        });
        if (listaForo) listaForo.innerHTML = html;
    } catch (e) { console.error(e); }
}

if (btnPublicarForo) {
    btnPublicarForo.addEventListener('click', async () => {
        const tit = document.getElementById('foro-titulo').value.trim();
        const desc = document.getElementById('foro-desc').value.trim();
        if (!tit || !desc) { showToast("Llena los datos."); return; }

        btnPublicarForo.innerText = "Creando...";
        try {
            await addDoc(collection(db, "foro_comunidad"), { titulo: tit, descripcion: desc, timestamp: new Date() });
            showToast("Tema creado.");
            document.getElementById('foro-titulo').value = ''; document.getElementById('foro-desc').value = '';
            btnPublicarForo.innerText = "Crear Tema"; cargarForo();
        } catch (e) { console.error(e); showToast("Error."); btnPublicarForo.innerText = "Crear Tema"; }
    });
}

cargarEventosMes();
cargarForo();

// Chat en tiempo real omitido por límite de texto, mantener tu código original de chat 1a1 al final de este archivo.