import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
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
        if(pDesconectado) pDesconectado.classList.add('vista-oculta');
        if(pConectado) pConectado.classList.remove('vista-oculta');
        
        document.getElementById('perfil-nombre').innerText = user.displayName;
        document.getElementById('perfil-email').innerText = user.email;
        if(user.photoURL) document.getElementById('perfil-foto').src = user.photoURL;
        
        // Guardar en usuarios
        try {
            await setDoc(doc(db, "usuarios", user.uid), {
                nombre: user.displayName,
                email: user.email,
                foto: user.photoURL || ""
            }, { merge: true });
        } catch(e) { console.error("Error guardando usuario:", e); }

        // Cargar chats
        if(typeof cargarContactos === 'function') cargarContactos();
        if(typeof cargarChatsRecientes === 'function') cargarChatsRecientes();
        
        // Verificar si es admin (por correo)
        try {
            if(user.email) {
                const adminDoc = await getDoc(doc(db, "admins", user.email));
                if (adminDoc.exists()) {
                    isUserAdmin = true;
                    if(badgeAdmin) badgeAdmin.classList.remove('vista-oculta');
                    if(seccionAdminEvento) seccionAdminEvento.classList.remove('vista-oculta');
                } else {
                    isUserAdmin = false;
                    if(badgeAdmin) badgeAdmin.classList.add('vista-oculta');
                    if(seccionAdminEvento) seccionAdminEvento.classList.add('vista-oculta');
                }
            }
        } catch(e) {
            console.error("Error verificando admin", e);
            isUserAdmin = false;
        }
    } else {
        currentUser = null;
        isUserAdmin = false;
        if(pDesconectado) pDesconectado.classList.remove('vista-oculta');
        if(pConectado) pConectado.classList.add('vista-oculta');
        if(badgeAdmin) badgeAdmin.classList.add('vista-oculta');
        if(seccionAdminEvento) seccionAdminEvento.classList.add('vista-oculta');
    }
});

const btnLoginGoogle = document.getElementById('btn-login-google');
if(btnLoginGoogle) {
    btnLoginGoogle.addEventListener('click', async () => {
        try {
            if(window.location.protocol === 'file:') {
                alert("ERROR: Estás abriendo el archivo localmente (file://). Firebase Auth no funciona sin un servidor web. Usa Live Server en VSCode o súbelo a Vercel.");
                return;
            }
            await signInWithPopup(auth, provider);
        } catch(e) {
            console.error("Error login:", e);
            let msg = e.message;
            if(e.code === 'auth/unauthorized-domain') msg = "Debes agregar el dominio en Firebase Auth > Authorized Domains.";
            alert("Error al iniciar sesión: " + msg);
        }
    });
}

const btnLogout = document.getElementById('btn-logout');
if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth);
    });
}

const map = L.map('mapa-fondo', { zoomControl: false }).setView([-12.065, -75.204], 10);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 20, attribution: '© OpenStreetMap © CARTO' }).addTo(map);

// Función para comprimir imagen antes de subirla
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

                if (width > maxWidth) {
                    height = Math.round(height * maxWidth / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Retornar en formato Data URL con compresión jpg 0.7
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

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
// Lógica del modal Nueva Publicación (Social)
const modalNuevaPublicacion = document.getElementById('modal-nueva-publicacion');
const btnNuevaPublicacion = document.getElementById('btn-nueva-publicacion');
const btnCerrarModalPublicacion = document.getElementById('btn-cerrar-modal-publicacion');

if (btnNuevaPublicacion) {
    btnNuevaPublicacion.addEventListener('click', () => {
        modalNuevaPublicacion.classList.remove('vista-oculta');
    });
}
if (btnCerrarModalPublicacion) {
    btnCerrarModalPublicacion.addEventListener('click', () => {
        modalNuevaPublicacion.classList.add('vista-oculta');
    });
}

// Lógica para paneles del Social (Bottom Sheets / Laterales)
const btnOpenChats = document.getElementById('btn-open-chats');
const panelChats = document.getElementById('social-chats-panel');
const btnCloseChats = document.getElementById('btn-close-chats');

if (btnOpenChats && panelChats) {
    btnOpenChats.addEventListener('click', () => panelChats.classList.add('activo'));
    btnCloseChats.addEventListener('click', () => panelChats.classList.remove('activo'));
}

const btnCloseChatActivo = document.getElementById('btn-close-chat-activo');
const panelChatActivo = document.getElementById('chat-activo-panel');

if (btnCloseChatActivo && panelChatActivo) {
    btnCloseChatActivo.addEventListener('click', () => {
        panelChatActivo.style.transform = "translateX(100%)";
    });
}

// Muro y Firebase (Se mantiene igual que antes, resumido para no alargar)
const botonPublicar = document.getElementById('btn-publicar');
botonPublicar.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo').value; const lugar = document.getElementById('lugar').value; const descripcion = document.getElementById('descripcion').value;
    if (titulo === "" || lugar === "" || descripcion === "") { alert("Completa los datos."); return; }
    botonPublicar.innerText = "Subiendo...";
    
    try {
        let fotoUrl = "";
        const inputFoto = document.getElementById('foto-muro');
        if(inputFoto && inputFoto.files && inputFoto.files[0]) {
            if(window.location.protocol === 'file:') {
                alert("Advertencia: Las imágenes no se subirán localmente (file://). Por favor usa Live Server o Vercel.");
                return;
            }
            botonPublicar.innerText = "Procesando foto...";
            const dataUrl = await compressImage(inputFoto.files[0]);
            const fileName = `publicaciones/${Date.now()}_${inputFoto.files[0].name}`;
            const storageRef = ref(storage, fileName);
            botonPublicar.innerText = "Subiendo foto...";
            await uploadString(storageRef, dataUrl, 'data_url');
            fotoUrl = await getDownloadURL(storageRef);
        }

        botonPublicar.innerText = "Guardando...";
        await addDoc(collection(db, "publicaciones"), { 
            titulo: titulo, 
            lugar: lugar, 
            descripcion: descripcion, 
            fecha: new Date(), 
            salida_aprobada: false, 
            comentarios: [],
            fotoUrl: fotoUrl,
            autor: currentUser ? currentUser.displayName : "Comunidad"
        });
        document.getElementById('titulo').value = ""; document.getElementById('lugar').value = ""; document.getElementById('descripcion').value = ""; 
        if(inputFoto) inputFoto.value = "";
        botonPublicar.innerText = "Publicar en Raíz"; 
        modalNuevaPublicacion.classList.add('vista-oculta');
        cargarPublicaciones();
    } catch (error) { console.error(error); alert("Error."); botonPublicar.innerText = "Publicar en Raíz"; }
});

const contenedorMuro = document.getElementById('social-feed-content');

function formatRelativeTime(date) {
    if(!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if(mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if(hrs < 24) return `${hrs} h`;
    return `${Math.floor(hrs / 24)} d`;
}

async function cargarPublicaciones() {
    if(!contenedorMuro) return;
    try {
        const consulta = query(collection(db, "publicaciones"));
        const querySnapshot = await getDocs(consulta);
        if (querySnapshot.empty) { contenedorMuro.innerHTML = "<p style='text-align:center; color:var(--leaf); margin-top:20px;'>Aún no hay publicaciones.</p>"; return; }
        
        // Convert to array to sort by fecha if needed, but since it's just a mockup structure:
        const posts = [];
        querySnapshot.forEach((doc) => posts.push({id: doc.id, ...doc.data()}));
        posts.sort((a,b) => (b.fecha?.toMillis ? b.fecha.toMillis() : 0) - (a.fecha?.toMillis ? a.fecha.toMillis() : 0));

        let publicacionesHTML = "";
        posts.forEach((data) => {
            let autor = data.autor || "Usuario";
            let inicial = autor.charAt(0).toUpperCase();
            let tiempo = formatRelativeTime(data.fecha);

            publicacionesHTML += `
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
                        <i data-lucide="heart"></i>
                        <i data-lucide="message-circle" class="btn-open-comments" data-docid="${data.id}"></i>
                        <i data-lucide="bookmark"></i>
                        <i data-lucide="send"></i>
                    </div>
                </div>`;
        });
        contenedorMuro.innerHTML = publicacionesHTML;
        if(window.lucide) window.lucide.createIcons();
    } catch (error) { 
        console.error(error);
        contenedorMuro.innerHTML = "<p style='text-align:center; color:var(--leaf); margin-top:20px;'>Error de conexión.</p>"; 
    }
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
// LÓGICA DEL PANEL DE DETALLES Y BOTÓN ATRÁS (BOTTOM SHEET)
// -----------------------------------------------------
const panelDetalle = document.getElementById('panel-detalle');
let lugarActualId = "";
let currentSnap = "hidden";
let startY = 0;

function setSnap(snap) {
    currentSnap = snap;
    panelDetalle.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
    if(snap === "hidden") panelDetalle.style.transform = "translateY(100%)";
    else if(snap === "peek") panelDetalle.style.transform = "translateY(65%)";
    else if(snap === "mid") panelDetalle.style.transform = "translateY(30%)";
    else if(snap === "full") panelDetalle.style.transform = "translateY(0%)";
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

// Swipe gestures for bottom sheet
panelDetalle.addEventListener('touchstart', (e) => {
    if(panelDetalle.scrollTop > 0 && currentSnap === "full") return;
    startY = e.touches[0].clientY;
    panelDetalle.style.transition = 'none';
}, {passive: true});

panelDetalle.addEventListener('touchmove', (e) => {
    if(panelDetalle.scrollTop > 0 && currentSnap === "full") return;
    const deltaY = e.touches[0].clientY - startY;
    let baseOffset = 0;
    if(currentSnap === "peek") baseOffset = 65;
    else if(currentSnap === "mid") baseOffset = 30;
    else if(currentSnap === "full") baseOffset = 0;
    
    const pxOffset = (baseOffset / 100) * window.innerHeight + deltaY;
    if(pxOffset < 0) return;
    panelDetalle.style.transform = `translateY(${pxOffset}px)`;
}, {passive: false});

panelDetalle.addEventListener('touchend', (e) => {
    if(panelDetalle.scrollTop > 0 && currentSnap === "full") return;
    const deltaY = e.changedTouches[0].clientY - startY;
    
    if(Math.abs(deltaY) < 30) { setSnap(currentSnap); return; }
    
    if(deltaY < 0) { // Swipe UP
        if(currentSnap === "peek") setSnap("mid");
        else setSnap("full");
    } else { // Swipe DOWN
        if(currentSnap === "full") setSnap("mid");
        else if(currentSnap === "mid") setSnap("peek");
        else { setSnap("hidden"); history.back(); }
    }
});

window.addEventListener('popstate', (e) => {
    setSnap("hidden");
});

document.getElementById('btn-volver').addEventListener('click', () => {
    history.back();
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
        document.querySelectorAll(`[data-target="${targetId}"]`).forEach(b => {
            b.classList.add('active');
            if(b.classList.contains('nav-item')) {
                const navItems = Array.from(document.querySelectorAll('.nav-item'));
                const index = navItems.indexOf(b);
                const indicator = document.querySelector('.nav-indicator');
                if(indicator) {
                    indicator.style.transform = `translateX(${index * 100}%)`;
                }
            }
        });

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
            let fotoUrl = "";
            const inputFoto = document.getElementById('foto-lugar');
            if(inputFoto && inputFoto.files && inputFoto.files[0]) {
                if(window.location.protocol === 'file:') {
                    alert("Advertencia: Las imágenes no se subirán localmente (file://). Por favor usa Live Server o Vercel.");
                    return;
                }
                btnGuardarLugar.innerText = "Procesando foto...";
                const dataUrl = await compressImage(inputFoto.files[0]);
                const fileName = `lugares/${Date.now()}_${inputFoto.files[0].name}`;
                const storageRef = ref(storage, fileName);
                btnGuardarLugar.innerText = "Subiendo foto...";
                await uploadString(storageRef, dataUrl, 'data_url');
                fotoUrl = await getDownloadURL(storageRef);
            }

            btnGuardarLugar.innerText = "Guardando lugar...";
            await addDoc(collection(db, "lugares_comunidad"), {
                titulo: titulo,
                descripcion: desc,
                coords: [center.lat, center.lng],
                fotoUrl: fotoUrl,
                fecha: new Date()
            });
            showToast("¡Lugar agregado con éxito!");
            modalLugar.classList.add('vista-oculta');
            document.getElementById('nuevo-lugar-titulo').value = '';
            document.getElementById('nuevo-lugar-desc').value = '';
            if(inputFoto) inputFoto.value = '';
            btnGuardarLugar.innerText = "Guardar Lugar";
            
            // Añadir el pin de inmediato
            let popupContent = `<b>${titulo}</b><br>${desc}`;
            if(fotoUrl) {
                popupContent += `<br><img src="${fotoUrl}" style="width:100%; max-height:150px; object-fit:cover; margin-top:10px; border-radius:5px;">`;
            }
            L.marker([center.lat, center.lng]).addTo(map)
             .bindPopup(popupContent).openPopup();
             
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
        if(!isUserAdmin) {
            if(window.showToast) showToast("No tienes permisos para crear eventos.");
            return;
        }
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

// =========================================================================
// LÓGICA DE CHATS 1a1 (FIREBASE)
// =========================================================================

let chatActivoUnsubscribe = null;
let currentChatId = null;

// Referencias UI
const chatsContactosList = document.getElementById('chats-contactos-list');
const chatsRecientesList = document.getElementById('chats-recientes-list');
const chatMensajesArea = document.getElementById('chat-mensajes');
const chatActivoNombre = document.getElementById('chat-activo-nombre');
const btnEnviarMensaje = document.getElementById('btn-enviar-mensaje');
const chatInputText = document.getElementById('chat-input-text');

async function cargarContactos() {
    if (!currentUser || !chatsContactosList) return;
    try {
        const q = query(collection(db, "usuarios"));
        const snapshot = await getDocs(q);
        let html = "";
        snapshot.forEach(doc => {
            if (doc.id === currentUser.uid) return; // No mostrar a uno mismo
            const data = doc.data();
            const initial = (data.nombre || "U").charAt(0).toUpperCase();
            html += `
            <div class="chat-item-dark" onclick="iniciarChat('${doc.id}', '${data.nombre || 'Usuario'}')">
                <div class="post-avatar" style="display:flex; align-items:center; justify-content:center; color:var(--forest); font-weight:bold; cursor:pointer;">${initial}</div>
                <div class="chat-item-info" style="cursor:pointer;">
                    <div class="chat-item-name">${data.nombre || 'Usuario'}</div>
                    <div class="chat-item-msg">Toca para chatear</div>
                </div>
            </div>`;
        });
        if (html === "") html = "<p style='color:var(--leaf); font-size:13px;'>No hay otros usuarios.</p>";
        chatsContactosList.innerHTML = html;
    } catch(e) {
        console.error("Error cargando contactos:", e);
    }
}

async function cargarChatsRecientes() {
    if (!currentUser || !chatsRecientesList) return;
    try {
        const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid), orderBy("lastTimestamp", "desc"));
        // Usar onSnapshot para actualizaciones en tiempo real de recientes
        onSnapshot(q, (snapshot) => {
            let html = "";
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const otherUserId = data.participants.find(id => id !== currentUser.uid);
                const otherUserName = data.participantNames ? (data.participantNames[otherUserId] || "Usuario") : "Usuario";
                const initial = otherUserName.charAt(0).toUpperCase();
                let timeStr = formatRelativeTime(data.lastTimestamp);
                
                html += `
                <div class="chat-item-dark" onclick="iniciarChat('${otherUserId}', '${otherUserName}')">
                    <div class="post-avatar" style="display:flex; align-items:center; justify-content:center; color:var(--forest); font-weight:bold; cursor:pointer;">${initial}</div>
                    <div class="chat-item-info" style="cursor:pointer;">
                        <div style="display:flex; justify-content:space-between;">
                            <div class="chat-item-name">${otherUserName}</div>
                            <div class="chat-item-time">${timeStr}</div>
                        </div>
                        <div class="chat-item-msg">${data.lastMessage || ''}</div>
                    </div>
                </div>`;
            });
            if (html === "") html = "<p style='color:var(--leaf); font-size:13px;'>Aún no tienes chats recientes.</p>";
            chatsRecientesList.innerHTML = html;
        });
    } catch(e) {
        console.error("Error cargando chats recientes:", e);
    }
}

window.iniciarChat = async function(otherUserId, otherUserName) {
    if (!currentUser) { alert("Inicia sesión primero"); return; }
    
    // Generar ID de chat consistente
    const chatId = currentUser.uid < otherUserId ? `${currentUser.uid}_${otherUserId}` : `${otherUserId}_${currentUser.uid}`;
    currentChatId = chatId;
    
    chatActivoNombre.innerText = otherUserName;
    const panelChatActivo = document.getElementById('chat-activo-panel');
    if(panelChatActivo) panelChatActivo.style.transform = "translateX(0)";
    
    // Asegurar que el documento del chat exista
    const chatRef = doc(db, "chats", chatId);
    try {
        const chatDoc = await getDoc(chatRef);
        if (!chatDoc.exists()) {
            await setDoc(chatRef, {
                participants: [currentUser.uid, otherUserId],
                participantNames: {
                    [currentUser.uid]: currentUser.displayName || "Usuario",
                    [otherUserId]: otherUserName
                },
                lastMessage: "",
                lastTimestamp: new Date()
            });
        }
    } catch(e) { console.error("Error inicializando chat:", e); }
    
    // Escuchar mensajes
    if (chatActivoUnsubscribe) chatActivoUnsubscribe();
    
    const mensajesRef = collection(db, `chats/${chatId}/mensajes`);
    const q = query(mensajesRef, orderBy("timestamp", "asc"));
    
    chatActivoUnsubscribe = onSnapshot(q, (snapshot) => {
        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const isMe = data.senderId === currentUser.uid;
            
            html += `
            <div style="display:flex; justify-content: ${isMe ? 'flex-end' : 'flex-start'}; margin-bottom: 10px;">
                <div style="background: ${isMe ? 'var(--leaf)' : 'rgba(255,255,255,0.1)'}; 
                            color: ${isMe ? 'var(--forest)' : 'var(--leaf)'}; 
                            padding: 10px 15px; border-radius: 20px; max-width: 80%; font-size: 14px;">
                    ${data.text}
                </div>
            </div>`;
        });
        chatMensajesArea.innerHTML = html;
        chatMensajesArea.scrollTop = chatMensajesArea.scrollHeight;
    });
};

if (btnEnviarMensaje) {
    btnEnviarMensaje.addEventListener('click', enviarMensajeActivo);
    if(chatInputText) {
        chatInputText.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') enviarMensajeActivo();
        });
    }
}

async function enviarMensajeActivo() {
    const text = chatInputText.value.trim();
    if (!text || !currentChatId || !currentUser) return;
    
    chatInputText.value = "";
    
    try {
        // Añadir mensaje a subcoleccion
        await addDoc(collection(db, `chats/${currentChatId}/mensajes`), {
            senderId: currentUser.uid,
            text: text,
            timestamp: new Date()
        });
        
        // Actualizar último mensaje en el doc del chat
        await updateDoc(doc(db, "chats", currentChatId), {
            lastMessage: text,
            lastTimestamp: new Date()
        });
    } catch(e) {
        console.error("Error enviando mensaje:", e);
        alert("Error enviando mensaje");
    }
}
