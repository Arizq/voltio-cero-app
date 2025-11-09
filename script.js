let dispositivos = [];

const DIAS_DEL_MES = 30;
const IVA = 0.16; 
const LS_PREFIX = 'voltio_cero_';

const TARIFAS_CFE_LIST = {
    '1': {
        descripcion: 'Tarifa 1 (Doméstica Básica)',
        limites: [
            { hasta: 75, costo: 0.963 },
            { hasta: 140, costo: 1.171 },
            { hasta: Infinity, costo: 3.447 }
        ]
    },
    '1A': {
        descripcion: 'Tarifa 1A (Clima Cálido)',
        limites: [
            { hasta: 100, costo: 0.865 },
            { hasta: 180, costo: 1.050 },
            { hasta: Infinity, costo: 2.990 }
        ]
    },
    '1B': {
        descripcion: 'Tarifa 1B (Clima Muy Cálido)',
        limites: [
            { hasta: 150, costo: 0.778 },
            { hasta: 300, costo: 0.998 },
            { hasta: Infinity, costo: 3.200 }
        ]
    },
    '1C': {
        descripcion: 'Tarifa 1C (Clima Caluroso)',
        limites: [
            { hasta: 200, costo: 0.750 },
            { hasta: 400, costo: 0.950 },
            { hasta: Infinity, costo: 3.500 }
        ]
    },
    'DAC': {
        descripcion: 'Tarifa DAC (Alto Consumo)',
        limites: [
            { hasta: Infinity, costo: 6.500 }
        ]
    }
};


const sessionForm = document.getElementById('session-form');
const usernameInput = document.getElementById('username');
const sessionStatus = document.getElementById('session-status');

const listaUsuariosGuardados = document.getElementById('lista-usuarios-guardados');

const form = document.getElementById('dispositivo-form');
const listaDispositivos = document.getElementById('lista-dispositivos');
const tarifaSelect = document.getElementById('tarifa'); 

const totalWhDiaElement = document.getElementById('total-wh-dia');
const costoDiarioElement = document.getElementById('costo-diario');
const totalKwhElement = document.getElementById('total-kwh');
const costoMensualElement = document.getElementById('costo-mensual');
const totalKwhAnualElement = document.getElementById('total-kwh-anual');
const costoAnualElement = document.getElementById('costo-anual');


// --- Lógica de Persistencia y Gestión de Espacios ---

function obtenerEspaciosRegistrados() {
    let espacios = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(LS_PREFIX)) {
            espacios.push(key.substring(LS_PREFIX.length));
        }
    }
    return espacios;
}

function renderizarUsuarios() {
    const espacios = obtenerEspaciosRegistrados();
    listaUsuariosGuardados.innerHTML = '';
    
    if (espacios.length === 0) {
        listaUsuariosGuardados.innerHTML = '<li>No hay espacios guardados localmente.</li>';
        return;
    }

    espacios.forEach(username => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span><strong>${username}</strong></span>
            <div class="user-actions">
                <button class="load-user-btn" data-username="${username}">Cargar</button>
                <button class="delete-user-btn" data-username="${username}">Eliminar</button>
            </div>
        `;
        listaUsuariosGuardados.appendChild(listItem);
    });

    document.querySelectorAll('.load-user-btn').forEach(button => {
        button.addEventListener('click', manejarCargaEspacio);
    });
    document.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', manejarEliminarEspacio);
    });
}

function manejarCargaEspacio(e) {
    const username = e.target.dataset.username;
    usernameInput.value = username;
    cargarDatos();
}

function manejarEliminarEspacio(e) {
    const username = e.target.dataset.username;
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente los datos guardados para "${username}"?`)) {
        localStorage.removeItem(LS_PREFIX + username);
        sessionStatus.textContent = ` Datos de ${username} eliminados.`;
        
        if (usernameInput.value === username) {
            dispositivos = [];
            usernameInput.value = 'EspacioPredeterminado';
        }

        renderizarUsuarios();
        actualizarCalculoTotal();
        renderizarLista();
    }
}


function guardarDatos() {
    const username = usernameInput.value;
    if (!username) return; 

    const datosJSON = JSON.stringify(dispositivos);

    try {
        localStorage.setItem(LS_PREFIX + username, datosJSON);
        sessionStatus.textContent = ` Lista de dispositivos guardada para: ${username}.`;
        renderizarUsuarios();
    } catch (e) {
        sessionStatus.textContent = ` Error al guardar. Almacenamiento lleno o no disponible.`;
        console.error("Error al guardar en localStorage:", e);
    }
}

function cargarDatos() {
    const username = usernameInput.value;
    if (!username) {
        sessionStatus.textContent = "Por favor, ingresa un nombre de espacio para cargar.";
        return;
    }

    const datosGuardados = localStorage.getItem(LS_PREFIX + username);

    if (datosGuardados) {
        dispositivos = JSON.parse(datosGuardados);
        sessionStatus.textContent = ` Dispositivos cargados para: ${username}.`;
    } else {
        dispositivos = [];
        sessionStatus.textContent = ` No se encontraron datos para ${username}. Comienza a añadir dispositivos.`;
    }
    
    actualizarCalculoTotal();
    renderizarLista();
}

// Manejar el envío del formulario de sesión (cargar/guardar)
sessionForm.addEventListener('submit', function(e) {
    e.preventDefault();
    cargarDatos();
    guardarDatos(); 
});


// --- Lógica de Cálculo y CRUD ---

// Manejar el envío del formulario de dispositivo
form.addEventListener('submit', function(e) {
    e.preventDefault(); 
    
    const nombre = document.getElementById('nombre').value;
    const watts = parseInt(document.getElementById('watts').value);
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const horasDiarias = parseFloat(document.getElementById('horas').value);
    
    const consumoWhDiario = watts * cantidad * horasDiarias;
    const consumoKwhMensual = (consumoWhDiario * DIAS_DEL_MES) / 1000;

    const nuevoDispositivo = {
        nombre: nombre,
        consumoWhDiario: consumoWhDiario,
        consumoKwhMensual: consumoKwhMensual,
    };

    dispositivos.push(nuevoDispositivo);
    
    actualizarCalculoTotal();
    renderizarLista();
    guardarDatos();
    
    document.getElementById('nombre').value = '';
    document.getElementById('watts').value = '';
    document.getElementById('cantidad').value = '1';
    document.getElementById('horas').value = '';
});

// 3. Actualizar cálculo cuando el usuario cambia la tarifa
tarifaSelect.addEventListener('change', actualizarCalculoTotal);


function actualizarCalculoTotal() {
    let totalWhDia = 0;
    let totalKwhMensual = 0; 
    
    dispositivos.forEach(d => {
        totalWhDia += d.consumoWhDiario;
        totalKwhMensual += d.consumoKwhMensual;
    });

    const tarifaSeleccionada = tarifaSelect.value;
    
    const costoBrutoMensual = calcularCostoEscalonado(totalKwhMensual, tarifaSeleccionada);
    const costoTotalMensualMXN = costoBrutoMensual * (1 + IVA);
    
    const costoTotalDiarioMXN = costoTotalMensualMXN / DIAS_DEL_MES;
    const totalKwhAnual = totalKwhMensual * 12;
    const costoTotalAnualMXN = costoTotalMensualMXN * 12;

    
    totalWhDiaElement.textContent = `${totalWhDia.toFixed(0)} Wh`;
    costoDiarioElement.textContent = formatoMoneda(costoTotalDiarioMXN);
    totalKwhElement.textContent = `${totalKwhMensual.toFixed(2)} kWh`;
    costoMensualElement.textContent = formatoMoneda(costoTotalMensualMXN);
    totalKwhAnualElement.textContent = `${totalKwhAnual.toFixed(2)} kWh`;
    costoAnualElement.textContent = formatoMoneda(costoTotalAnualMXN);
}


function calcularCostoEscalonado(kwhTotal, claveTarifa) {
    let costoTotalBruto = 0;
    let kwhRestantes = kwhTotal;
    const limitesTarifa = TARIFAS_CFE_LIST[claveTarifa].limites;
    
    for (let i = 0; i < limitesTarifa.length; i++) {
        const tramo = limitesTarifa[i];
        
        if (tramo.hasta === Infinity) {
            costoTotalBruto += kwhRestantes * tramo.costo;
            break; 
        }

        let limiteTramo;
        if (i === 0) {
            limiteTramo = tramo.hasta;
        } else {
            limiteTramo = tramo.hasta - limitesTarifa[i-1].hasta;
        }

        const kwhEnTramo = Math.min(kwhRestantes, limiteTramo);
        costoTotalBruto += kwhEnTramo * tramo.costo;
        kwhRestantes -= kwhEnTramo;

        if (kwhRestantes <= 0) break;
    }
    
    return costoTotalBruto;
}

function formatoMoneda(cantidad) {
    return cantidad.toLocaleString('es-MX', { 
        style: 'currency', 
        currency: 'MXN',
        minimumFractionDigits: 2 
    });
}

function renderizarLista() {
    listaDispositivos.innerHTML = '';
    
    dispositivos.forEach((dispositivo, index) => {
        const listItem = document.createElement('li');
        
        listItem.innerHTML = `
            <span>
                <strong>${dispositivo.nombre}</strong> 
                (${dispositivo.consumoKwhMensual.toFixed(2)} kWh/mes)
            </span>
            <span>
                ${dispositivo.consumoWhDiario.toFixed(0)} Wh/día
                <button class="delete-btn" data-index="${index}">❌</button>
            </span>
        `;
        
        listaDispositivos.appendChild(listItem);
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', eliminarDispositivo);
    });
}

function eliminarDispositivo(e) {
    const indexParaEliminar = parseInt(e.target.dataset.index);
    
    dispositivos.splice(indexParaEliminar, 1);
    
    actualizarCalculoTotal();
    renderizarLista();
    guardarDatos();
}

window.onload = function() {
    cargarDatos();
    renderizarUsuarios();
}