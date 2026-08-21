import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, getDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUÍ", 
    authDomain: "TU_PROJECT_ID.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};


const DOCUMENT_COLLECTION = 'descargas';
const DOCUMENT_STORAGE_FOLDER = 'documentos_oficiales';

const SOCIAL_COLLECTION = 'social-cards';
const SOCIAL_STORAGE_FOLDER = 'social'; 
const VIDEO_CONFIG_COLLECTION = 'configuracion'; 
const VIDEO_CONFIG_DOC_ID = 'video-principal'; 


let db, storage, auth;

async function authenticateUser() {
    try {
        if (typeof auth.currentUser === 'undefined' || auth.currentUser === null) {
            await signInAnonymously(auth);
        }
        console.log("Autenticación anónima exitosa.");
    } catch (error) {
        console.error("Error en la autenticación anónima de Firebase:", error);
    }
}

async function initFirebaseAndRun() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app);
        auth = getAuth(app); 

        await authenticateUser();

        const mainDocumentId = window.MAIN_DOCUMENT_ID;
        if (mainDocumentId) {
            updateDownloadLink(mainDocumentId);
        } else {
            console.warn("window.MAIN_DOCUMENT_ID no está definido.");
        }
        
        
        loadSocialMediaCards(); 

        
        updateVideoFrame(); 

        
        listenForContactForm();

    } catch (error) {
        console.error("Error fatal en la inicialización de Firebase:", error);
    }
}



function getCollectionRef(collectionName) {
    return collection(db, collectionName);
}


async function updateVideoFrame() {
    const iframe = document.querySelector('.video-frame iframe');
    if (!iframe) {
        console.error("No se encontró el iframe del video.");
        return;
    }

    try {
        const docRef = doc(getCollectionRef(VIDEO_CONFIG_COLLECTION), VIDEO_CONFIG_DOC_ID);
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const youtubeId = data.youtubeId; 
                
                if (youtubeId) {
                    
                    const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}`;
                    iframe.src = embedUrl;
                    console.log(`[VIDEO] Iframe de video actualizado con ID: ${youtubeId} y configurado para bucle.`);
                } else {
                    console.warn(`[VIDEO] El documento '${VIDEO_CONFIG_DOC_ID}' no contiene el campo 'youtubeId'.`);
                    iframe.src = ''; 
                }
            } else {
                console.warn(`[VIDEO] Documento de configuración de video '${VIDEO_CONFIG_DOC_ID}' no encontrado.`);
                iframe.src = ''; 
                unsubscribe();
            }
        }, (error) => {
            console.error("[VIDEO] Error de Firestore al cargar la configuración del video:", error);
        });

    } catch (error) {
        console.error("[VIDEO] Error al configurar el listener del video:", error);
    }
}


async function loadSocialMediaCards() {
    const cardConfigurations = [
        { docId: 'card1-config', containerId: 'socialCard1Container' },
        { docId: 'card2-config', containerId: 'socialCard2Container' }
    ];

    try {
        const promises = cardConfigurations.map(async (config) => {
            const { docId, containerId } = config;
            const container = document.getElementById(containerId);
            
            if (!container) {
                console.warn(`Contenedor con ID '${containerId}' no encontrado. Saltando.`);
                return;
            }

            const docRef = doc(getCollectionRef(SOCIAL_COLLECTION), docId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                container.innerHTML = `<p class="text-xs text-gray-500">Configuración ${docId} no encontrada.</p>`;
                return;
            }

            const data = docSnap.data();
            const imageFilename = data.imageFilename;
            const linkUrl = data.linkUrl;

            if (!imageFilename || !linkUrl) {
                container.innerHTML = `<p class="text-xs text-gray-500">Configuración incompleta en ${docId}.</p>`;
                return;
            }

            const storageRef = ref(storage, `${SOCIAL_STORAGE_FOLDER}/${imageFilename}`);
            let imageUrl;
            try {
                imageUrl = await getDownloadURL(storageRef);
            } catch (storageError) {
                 console.error(`Error al obtener imagen para ${docId}:`, storageError);
                 container.innerHTML = `<p class="text-xs text-red-500">Error: Imagen '${imageFilename}' no encontrada en Storage.</p>`;
                 return;
            }

            container.innerHTML = ''; 

            const cardLink = document.createElement('a');
            cardLink.href = linkUrl;
            cardLink.target = '_blank'; 
            cardLink.title = `Ver publicación: ${docId}`;
            cardLink.style.display = 'block';
            cardLink.style.width = '100%';
            cardLink.style.height = '100%';

            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = `Publicación de Renovación Estatal (${docId})`;
            img.className = 'w-full h-full object-cover rounded-xl shadow-md'; 
            
            cardLink.appendChild(img);
            container.appendChild(cardLink);

            console.log(`[SOCIAL CARDS] Tarjeta ${docId} cargada exitosamente.`);
        });

        await Promise.all(promises);

    } catch (error) {
        console.error("Error al cargar las tarjetas sociales:", error);
    }
}

async function updateDownloadLink(documentId) {
    const cta1 = document.getElementById('download-link-cta');
    const cta2 = document.getElementById('download-link-cta-2');
    const cta3 = document.getElementById('download-link-cta-3');
    const cta4 = document.getElementById('download-link-cta-4');
    const cta5 = document.getElementById('download-link-cta-5');
    
    // Cargando inicial para los botones que existan en el HTML
    if (cta1) { cta1.textContent = "Cargando..."; cta1.style.pointerEvents = "none"; }
    if (cta2) { cta2.textContent = "Cargando..."; cta2.style.pointerEvents = "none"; }
    if (cta3) { cta3.textContent = "Cargando..."; cta3.style.pointerEvents = "none"; }
    if (cta4) { cta4.textContent = "Cargando..."; cta4.style.pointerEvents = "none"; }
    if (cta5) { cta5.textContent = "Cargando..."; cta5.style.pointerEvents = "none"; }

    try {
        const docRef = doc(db, DOCUMENT_COLLECTION, documentId);

        onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Procesar Botón 1
                if (cta1) {
                    const file1 = data.storageFilename || data.storageFileName;
                    if (file1) {
                        try {
                            const url1 = await getDownloadURL(ref(storage, `${DOCUMENT_STORAGE_FOLDER}/${file1}`));
                            cta1.href = url1;
                            cta1.target = "_blank";
                            cta1.textContent = "¡Descargar!";
                            cta1.style.pointerEvents = "auto";
                        } catch (e) { cta1.textContent = "No disponible"; }
                    }
                }

                // Procesar Botón 2
                if (cta2) {
                    const file2 = data.storageFilename2;
                    if (file2) {
                        try {
                            const url2 = await getDownloadURL(ref(storage, `${DOCUMENT_STORAGE_FOLDER}/${file2}`));
                            cta2.href = url2;
                            cta2.target = "_blank";
                            cta2.textContent = "¡Descargar!";
                            cta2.style.pointerEvents = "auto";
                        } catch (e) { cta2.textContent = "No disponible"; }
                    }
                }

                // Procesar Botón 3
                if (cta3) {
                    const file3 = data.storageFilename3;
                    if (file3) {
                        try {
                            const url3 = await getDownloadURL(ref(storage, `${DOCUMENT_STORAGE_FOLDER}/${file3}`));
                            cta3.href = url3;
                            cta3.target = "_blank";
                            cta3.textContent = "¡Descargar!";
                            cta3.style.pointerEvents = "auto";
                        } catch (e) { cta3.textContent = "No disponible"; }
                    }
                }

                if (cta4) {
                    const file4 = data.storageFilename4;
                    if (file4) {
                        try {
                            const url4 = await getDownloadURL(ref(storage, `${DOCUMENT_STORAGE_FOLDER}/${file4}`));
                            cta4.href = url4;
                            cta4.target = "_blank";
                            cta4.textContent = "¡Descargar!";
                            cta4.style.pointerEvents = "auto";
                        } catch (e) { cta4.textContent = "No disponible"; }
                    }
                }
                 if (cta5) {
                    const file5 = data.storageFilename5;
                    if (file5) {
                        try {
                            const url5 = await getDownloadURL(ref(storage, `${DOCUMENT_STORAGE_FOLDER}/${file5}`));
                            cta5.href = url5;
                            cta5.target = "_blank";
                            cta5.textContent = "¡Descargar!";
                            cta5.style.pointerEvents = "auto";
                        } catch (e) { cta5.textContent = "No disponible"; }
                    }
                }
            }
           
        });
    } catch (e) {
        console.error("Error en enlace de descarga:", e);
    }
}


async function listenForContactForm() {
    const contactForm = document.getElementById('contactForm');
    const messageBox = document.getElementById('form-message-box');
    const submitBtn = document.getElementById('submitBtn');

    if (!contactForm) return; 

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        
        const captchaResponse = grecaptcha.getResponse();
        if (captchaResponse.length === 0) {
            messageBox.style.display = 'block';
            messageBox.style.backgroundColor = '#fee2e2'; // Rojo suave
            messageBox.style.color = '#dc2626';
            messageBox.textContent = "⚠️ Por favor, verifica que no eres un robot.";
            return;
        }

        
        submitBtn.disabled = true;
        submitBtn.textContent = "Enviando...";
        messageBox.style.display = 'none';

        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const comment = document.getElementById('comment').value;

        try {
            
            const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            
            
            await addDoc(collection(db, 'mensajes_contacto'), {
                email: email,
                phone: phone,
                message: comment,
                fecha: new Date(),
                leido: false
            });

            
            messageBox.style.display = 'block';
            messageBox.style.backgroundColor = '#dcfce7'; 
            messageBox.style.color = '#16a34a';
            messageBox.textContent = "¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.";
            
            contactForm.reset();
            grecaptcha.reset(); 

        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            messageBox.style.display = 'block';
            messageBox.style.backgroundColor = '#fee2e2';
            messageBox.style.color = '#dc2626';
            messageBox.textContent = "Hubo un error al enviar el mensaje. Intenta de nuevo.";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Enviar";
        }
    });
}


document.addEventListener('DOMContentLoaded', initFirebaseAndRun);