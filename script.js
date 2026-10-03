/*
============================================================
SCRIPT.JS
Sistema: Despliegue IT - Control Corporativo
------------------------------------------------------------
Responsabilidades principales:
- Administrar los registros de equipos.
- Persistir datos usando localStorage.
- Validar Hostname, MAC, Serial e Ingeniero.
- Controlar estados de despliegue.
- Administrar el modo administrador.
- Filtrar registros por fecha y búsqueda.
- Generar estadísticas y gráficas con Chart.js.
- Manejar modo claro / oscuro.
============================================================
*/

// ============================================================
// VARIABLES GLOBALES Y CONFIGURACIÓN INICIAL
// ============================================================

let registrosIT = JSON.parse(localStorage.getItem('datosIT')) || [];
        const baseHostname = "BOGM00";
        let numeroConsecutivo = 715450;
        let instanciaGraficaEstados = null;
        let instanciaGraficaModelos = null;
        let callbackAlerta = null;
        let esModoAdmin = false;

        const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        // ============================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// Se ejecuta cuando el navegador termina de cargar la página.
// ============================================================

window.onload = () => {
            aplicarPreferenciaTema();
            inicializarFiltrosFechas();
            actualizarConsecutivoUI();
            setInterval(actualizarRelojBogota, 1000);
            setInterval(renderizarTabla, 10000);
            actualizarRelojBogota();
            validarFormularioCompleto();
            renderizarTabla();
            actualizarMonitoreoYGrafica();
        };

        // ============================================================
// TEMA VISUAL
// Permite alternar entre modo claro y oscuro.
// ============================================================

function toggleModoOscuro() {
            document.body.classList.toggle('dark-theme');
            const esModoOscuro = document.body.classList.contains('dark-theme');
            
            localStorage.setItem('themeIT', esModoOscuro ? 'dark' : 'light');
            actualizarBotonTema(esModoOscuro);
            actualizarMonitoreoYGrafica();
        }

        function aplicarPreferenciaTema() {
            const temaGuardado = localStorage.getItem('themeIT');
            const prefiereOscuro = temaGuardado === 'dark';
            
            if (prefiereOscuro) {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
            actualizarBotonTema(prefiereOscuro);
        }

        function actualizarBotonTema(esOscuro) {
            document.getElementById('themeToggleText').textContent = esOscuro ? "Modo Claro" : "Modo Oscuro";
            document.getElementById('themeToggleIcon').textContent = esOscuro ? "☀️" : "🌙";
        }

        function convertirAMayusculas(input) {
            const posSeleccion = input.selectionStart;
            input.value = input.value.toUpperCase();
            input.setSelectionRange(posSeleccion, posSeleccion);
        }

        function meFormatHora(d) {
            return d.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
        }

        function obtenerClaseEstadoCSS(estado) {
            switch(estado) {
                case 'Funcionó': return 'estado-funciono';
                case 'Falló': return 'estado-fallo';
                case 'Se descartó': return 'estado-descarto';
                case 'Pendiente': return 'estado-pendiente';
                default: return '';
            }
        }

        // ============================================================
// RELOJ DE BOGOTÁ
// Usa la zona horaria America/Bogota independientemente del PC.
// ============================================================

function actualizarRelojBogota() {
            const opciones = { 
                timeZone: 'America/Bogota', 
                weekday: 'long',
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit', 
                hour12: false 
            };
            const fechaBogota = new Intl.DateTimeFormat('es-CO', opciones).format(new Date());
            document.getElementById('relojBogota').textContent = `📅 ${fechaBogota}`;
        }

        function cambiarVista(vista) {
            document.querySelectorAll('.vista').forEach(el => el.classList.remove('activa'));
            document.getElementById(`vista-${vista}`).classList.add('activa');
        }

        // ============================================================
// MODO ADMINISTRADOR
// Controla autenticación, edición y eliminación de registros.
// IMPORTANTE: una contraseña en JavaScript del navegador NO es
// segura para producción. Para seguridad real debe validarse
// desde un backend.
// ============================================================

function solicitarAccesoAdmin() {
            if (esModoAdmin) {
                mostrarAlertaPersonalizada("YA SE ENCUENTRA EN MODO ADMINISTRADOR.");
                return;
            }
            document.getElementById('inputAdminPassword').value = '';
            document.getElementById('modalAdminAuth').classList.add('activa');
            setTimeout(() => document.getElementById('inputAdminPassword').focus(), 100);
        }

        function cerrarModalAdminAuth() {
            document.getElementById('modalAdminAuth').classList.remove('activa');
        }

        function verificarPasswordAdmin() {
            const pass = document.getElementById('inputAdminPassword').value;
            if (pass === "NN") {
                esModoAdmin = true;
                cerrarModalAdminAuth();
                document.getElementById('btnSalirAdmin').style.display = 'block';
                document.getElementById('thAccionesAdmin').style.display = 'table-cell';
                renderizarTabla();
                mostrarAlertaPersonalizada("MÓDULO ADMINISTRADOR ACTIVADO.<br><br>Ahora puede modificar todos los campos y eliminar registros.");
            } else {
                alert("CONTRASEÑA INCORRECTA. ACCESO DENEGADO.");
                document.getElementById('inputAdminPassword').value = '';
            }
        }

        function desactivarModoAdmin() {
            esModoAdmin = false;
            document.getElementById('btnSalirAdmin').style.display = 'none';
            document.getElementById('thAccionesAdmin').style.display = 'none';
            renderizarTabla();
            mostrarAlertaPersonalizada("MODO ADMINISTRADOR DESACTIVADO.");
        }

        function abrirModalEditarAdmin(idRegistro) {
            if (!esModoAdmin) return;
            const reg = registrosIT.find(r => r.id === idRegistro);
            if (!reg) return;

            document.getElementById('editRegId').value = reg.id;
            document.getElementById('editHostname').value = reg.hostname;
            document.getElementById('editMac').value = reg.mac;
            document.getElementById('editSerial').value = reg.serial || '';
            document.getElementById('editModelo').value = reg.modelo;
            document.getElementById('editIngeniero').value = reg.ingeniero || '';
            document.getElementById('editCaso').value = reg.caso || '';
            document.getElementById('editEstado').value = reg.estado;

            document.getElementById('modalAdminEdit').classList.add('activa');
        }

        function cerrarModalAdminEdit() {
            document.getElementById('modalAdminEdit').classList.remove('activa');
        }

        function guardarEdicionAdmin() {
            const id = parseInt(document.getElementById('editRegId').value);
            const index = registrosIT.findIndex(r => r.id === id);
            if (index === -1) return;

            const host = document.getElementById('editHostname').value.trim().toUpperCase();
            const mac = document.getElementById('editMac').value.trim().toUpperCase();
            const serial = document.getElementById('editSerial').value.trim().toUpperCase();
            const modelo = document.getElementById('editModelo').value;
            const ingeniero = document.getElementById('editIngeniero').value.trim().toUpperCase();
            const caso = document.getElementById('editCaso').value.trim().toUpperCase() || 'SIN CASO';
            const nuevoEstado = document.getElementById('editEstado').value;

            const regexHostname = /^BOGM00\d{6}$/;
            const regexMac = /^([0-9A-FA-F]{2}:){5}[0-9A-FA-F]{2}$/;

            if (!regexHostname.test(host)) {
                alert("FORMATO DE HOSTNAME INVÁLIDO (EJ: BOGM00715452).");
                return;
            }
            if (!regexMac.test(mac)) {
                alert("FORMATO DE MAC INVÁLIDO (EJ: 00:1A:2B:3C:4D:5E).");
                return;
            }
            if (serial.length !== 10) {
                alert("EL SERIAL DEBE TENER EXACTAMENTE 10 DÍGITOS.");
                return;
            }

            registrosIT[index].hostname = host;
            registrosIT[index].mac = mac;
            registrosIT[index].serial = serial;
            registrosIT[index].modelo = modelo;
            registrosIT[index].ingeniero = ingeniero;
            registrosIT[index].caso = caso;
            registrosIT[index].estado = nuevoEstado;
            registrosIT[index].estadoConfirmado = (nuevoEstado !== 'Pendiente');

            guardarDatos();
            cerrarModalAdminEdit();
            renderizarTabla();
            actualizarMonitoreoYGrafica();
        }

        function mostrarBotonOK(idRegistro) {
            const btn = document.getElementById(`btn-ok-${idRegistro}`);
            if (btn) btn.style.display = 'inline-block';
        }

        function cambiarEstadoUsuario(idRegistro, nuevoEstado) {
            const index = registrosIT.findIndex(r => r.id === idRegistro);
            if (index === -1) return;

            const reg = registrosIT[index];

            if (esModoAdmin) {
                registrosIT[index].estado = nuevoEstado;
                registrosIT[index].estadoConfirmado = (nuevoEstado !== 'Pendiente');

                guardarDatos();
                renderizarTabla();
                actualizarMonitoreoYGrafica();
                return;
            }

            const tiempoTranscurridoMs = new Date() - new Date(reg.fechaISO);
            const minutosTranscurridos = tiempoTranscurridoMs / (1000 * 60);

            if (minutosTranscurridos < 3) {
                mostrarAlertaPersonalizada("EL ESTADO NO SE PUEDE MODIFICAR MIENTRAS ESTÉ EN PENDIENTE HASTA CUMPLIR LOS 3 MINUTOS.");
                renderizarTabla();
                return;
            }

            const selectEl = document.getElementById(`select-${idRegistro}`);
            const estadoSeleccionado = selectEl ? selectEl.value : nuevoEstado;

            const ahora = new Date();
            const timestampStr = ahora.toLocaleDateString('es-CO') + " " + meFormatHora(ahora);

            if (!registrosIT[index].historialObservaciones) registrosIT[index].historialObservaciones = [];

            registrosIT[index].historialObservaciones.unshift({
                fecha: timestampStr,
                texto: `CAMBIO DE ESTADO A: "${estadoSeleccionado.toUpperCase()}". CASO: ${reg.caso || 'SIN CASO'}`
            });

            registrosIT[index].estado = estadoSeleccionado;
            registrosIT[index].estadoConfirmado = (estadoSeleccionado !== 'Pendiente');
            registrosIT[index].asignadoPorUsuario = true;

            guardarDatos();
            renderizarTabla();
            actualizarMonitoreoYGrafica();
        }

        function agregarCasoRapido(idRegistro) {
            mostrarAlertaPersonalizada(
                "INGRESE EL NÚMERO DE CASO PARA ESTE EQUIPO:",
                function(nuevoCaso) {
                    if (!nuevoCaso || nuevoCaso.trim() === '') {
                        alert("DEBE INGRESAR UN NÚMERO DE CASO VÁLIDO.");
                        return;
                    }
                    const index = registrosIT.findIndex(r => r.id === idRegistro);
                    if (index === -1) return;

                    const casoLimpio = nuevoCaso.trim().toUpperCase();
                    const ahora = new Date();
                    const timestampStr = ahora.toLocaleDateString('es-CO') + " " + meFormatHora(ahora);

                    registrosIT[index].caso = casoLimpio;

                    if (!esModoAdmin) {
                        if (!registrosIT[index].historialObservaciones) registrosIT[index].historialObservaciones = [];
                        registrosIT[index].historialObservaciones.unshift({
                            fecha: timestampStr,
                            texto: `CASO ASIGNADO: "${casoLimpio}".`
                        });
                    }

                    guardarDatos();
                    renderizarTabla();
                },
                true
            );
        }

        function eliminarRegistroIndividual(idRegistro) {
            if (!esModoAdmin) return;
            const reg = registrosIT.find(r => r.id === idRegistro);
            if (reg) {
                if (confirm(`¿Está seguro de que desea eliminar el registro del Hostname "${reg.hostname}"? Esta acción es irreversible.`)) {
                    registrosIT = registrosIT.filter(r => r.id !== idRegistro);
                    guardarDatos();
                    renderizarTabla();
                    actualizarMonitoreoYGrafica();
                }
            }
        }

        // ============================================================
// FILTROS DE FECHA
// Inicializa y sincroniza mes/año entre las distintas vistas.
// ============================================================

function inicializarFiltrosFechas() {
            const fechaActual = new Date();
            const mesActual = fechaActual.getMonth();
            const anoActual = fechaActual.getFullYear();

            let opcionesMeses = nombresMeses.map((mes, index) => `<option value="${index}">${mes}</option>`).join('');
            document.getElementById('filtroMesHistorico').innerHTML = opcionesMeses;
            document.getElementById('filtroMesMonitoreo').innerHTML = opcionesMeses;
            document.getElementById('filtroMesGrafica').innerHTML = opcionesMeses;
            
            document.getElementById('filtroMesHistorico').value = mesActual;
            document.getElementById('filtroMesMonitoreo').value = mesActual;
            document.getElementById('filtroMesGrafica').value = mesActual;

            let opcionesAnos = "";
            for(let i = 2024; i <= anoActual + 1; i++){
                opcionesAnos += `<option value="${i}">${i}</option>`;
            }
            document.getElementById('filtroAnoHistorico').innerHTML = opcionesAnos;
            document.getElementById('filtroAnoMonitoreo').innerHTML = opcionesAnos;
            document.getElementById('filtroAnoGrafica').innerHTML = opcionesAnos;

            document.getElementById('filtroAnoHistorico').value = anoActual;
            document.getElementById('filtroAnoMonitoreo').value = anoActual;
            document.getElementById('filtroAnoGrafica').value = anoActual;
        }

        function sincronizarFiltros(origen) {
            let mesVal, anoVal;
            if(origen === 'grafica') {
                mesVal = document.getElementById('filtroMesGrafica').value;
                anoVal = document.getElementById('filtroAnoGrafica').value;
                document.getElementById('filtroMesMonitoreo').value = mesVal;
                document.getElementById('filtroAnoMonitoreo').value = anoVal;
            } else {
                mesVal = document.getElementById('filtroMesMonitoreo').value;
                anoVal = document.getElementById('filtroAnoMonitoreo').value;
                document.getElementById('filtroMesGrafica').value = mesVal;
                document.getElementById('filtroAnoGrafica').value = anoVal;
            }
            actualizarMonitoreoYGrafica();
        }

        function obtenerDatosFiltradosMonitoreo() {
            const mesSeleccionado = parseInt(document.getElementById('filtroMesMonitoreo').value);
            const anoSeleccionado = parseInt(document.getElementById('filtroAnoMonitoreo').value);

            return registrosIT.filter(reg => {
                const fechaReg = new Date(reg.fechaISO);
                const estadoValido = reg.estadoConfirmado && (reg.estado === 'Funcionó' || reg.estado === 'Falló' || reg.estado === 'Se descartó');
                return estadoValido && fechaReg.getMonth() === mesSeleccionado && fechaReg.getFullYear() === anoSeleccionado;
            });
        }

        // ============================================================
// VALIDACIÓN DEL FORMULARIO
// Verifica formatos antes de habilitar el registro.
// ============================================================

function validarFormularioCompleto() {
            const host = document.getElementById('inHostname');
            const mac = document.getElementById('inMac');
            const serial = document.getElementById('inSerial');
            const ingeniero = document.getElementById('inIngeniero');
            const btnRegistrar = document.getElementById('btnRegistrar');

            const regexHostname = /^BOGM00\d{6}$/;
            const regexMac = /^([0-9A-FA-F]{2}:){5}[0-9A-FA-F]{2}$/;

            let esHostValido = regexHostname.test(host.value.trim());
            let esMacValida = regexMac.test(mac.value.trim());
            let esSerialValido = serial.value.trim().length === 10;
            let esIngenieroValido = ingeniero.value.trim() !== "";

            marcarCampo(host, esHostValido);
            marcarCampo(mac, esMacValida);
            marcarCampo(serial, esSerialValido);
            marcarCampo(ingeniero, esIngenieroValido);

            if (esHostValido && esMacValida && esSerialValido && esIngenieroValido) {
                btnRegistrar.disabled = false;
            } else {
                btnRegistrar.disabled = true;
            }
        }

        function marcarCampo(input, esValido) {
            if (esValido) {
                input.classList.remove('input-error');
                input.classList.add('input-valido');
            } else {
                input.classList.remove('input-valido');
                input.classList.add('input-error');
            }
        }

        // ============================================================
// REGISTRO DE EQUIPOS
// Crea un nuevo registro y lo almacena localmente.
// ============================================================

function registrarEquipo() {
            const host = document.getElementById('inHostname').value.trim().toUpperCase();
            const mac = document.getElementById('inMac').value.trim().toUpperCase();
            const serial = document.getElementById('inSerial').value.trim().toUpperCase();
            const modelo = document.getElementById('inModelo').value;
            const ingeniero = document.getElementById('inIngeniero').value.trim().toUpperCase();
            const caso = document.getElementById('inCaso').value.trim().toUpperCase();

            const hostExistente = registrosIT.find(r => r.hostname === host);
            if (hostExistente) {
                mostrarAlertaPersonalizada(`EL HOSTNAME <strong>${host}</strong> YA FUE UTILIZADO.<br><br>INGRESE UN HOSTNAME DIFERENTE.`);
                return;
            }

            const ahora = new Date();
            const timestampStr = ahora.toLocaleDateString('es-CO') + " " + meFormatHora(ahora);

            let historialInicial = [];
            if (caso && caso !== 'SIN CASO' && caso.trim() !== '') {
                historialInicial.push({
                    fecha: timestampStr,
                    texto: `CASO ASIGNADO: "${caso}".`
                });
            }

            const nuevoRegistro = { 
                id: Date.now(), 
                fechaISO: ahora.toISOString(),
                hostname: host, 
                mac: mac, 
                serial: serial,
                modelo: modelo, 
                estado: 'Pendiente', 
                estadoConfirmado: false,
                asignadoPorUsuario: false,
                ingeniero: ingeniero, 
                caso: caso || 'SIN CASO',
                historialObservaciones: historialInicial
            };

            registrosIT.push(nuevoRegistro);
            guardarDatos();

            const registrosAnterioresMac = registrosIT.filter(r => r.mac === mac && r.id !== nuevoRegistro.id);
            if (registrosAnterioresMac.length > 0) {
                const hostnamesAnteriores = registrosAnterioresMac.map(r => r.hostname).join(', ');
                mostrarAlertaPersonalizada(`RE-IMAGEN DETECTADA:<br><br>ESTA MAC ESTUVO ASIGNADA ANTERIORMENTE A:<br><strong>${hostnamesAnteriores}</strong><br><br>VERIFIQUE FÍSICAMENTE EL EQUIPO.`);
            } else {
                limpiarFormulario();
            }

            renderizarTabla();
            actualizarMonitoreoYGrafica();
        }

        // ============================================================
// RENDERIZADO DE LA TABLA
// Construye dinámicamente las filas según filtros y permisos.
// ============================================================

function renderizarTabla() {
            const tbody = document.getElementById('tablaRegistros');
            tbody.innerHTML = ''; 

            const mesFiltro = parseInt(document.getElementById('filtroMesHistorico').value);
            const anoFiltro = parseInt(document.getElementById('filtroAnoHistorico').value);
            const busqueda = document.getElementById('inBuscar').value.trim().toUpperCase();

            const registrosFiltrados = registrosIT.filter(reg => {
                const fechaReg = new Date(reg.fechaISO);
                
                if (busqueda !== "") {
                    return (
                        (reg.hostname && reg.hostname.toUpperCase().includes(busqueda)) ||
                        (reg.mac && reg.mac.toUpperCase().includes(busqueda)) ||
                        (reg.serial && reg.serial.toUpperCase().includes(busqueda)) ||
                        (reg.ingeniero && reg.ingeniero.toUpperCase().includes(busqueda)) ||
                        (reg.caso && reg.caso.toUpperCase().includes(busqueda))
                    );
                }

                return fechaReg.getMonth() === mesFiltro && fechaReg.getFullYear() === anoFiltro;
            });
            
            const ahora = new Date();

            [...registrosFiltrados].reverse().forEach(reg => {
                const fechaRegistro = new Date(reg.fechaISO);
                const fechaCorta = fechaRegistro.toLocaleDateString('es-CO');
                
                const diferenciaTiempoMs = meFormatHora ? (ahora - fechaRegistro) : 0;
                const diasTranscurridos = Math.floor(diferenciaTiempoMs / (1000 * 60 * 60 * 24));
                const minutosTranscurridos = diferenciaTiempoMs / (1000 * 60);
                const tieneCaso = reg.caso && reg.caso !== 'SIN CASO' && reg.caso.trim() !== '';
                
                let alertaHTML = '';
                if (tieneCaso) {
                    alertaHTML = `<span class="alerta-ok">✅ CASO ASIGNADO</span>`;
                } else if (diasTranscurridos >= 3) {
                    alertaHTML = `<span class="alerta-vencida">🚨 ALERTA: CASO VENCIDO (+3 DÍAS)</span>`;
                } else {
                    const diasRestantes = 3 - diasTranscurridos;
                    alertaHTML = `<span class="alerta-pendiente">⚠️ FALTA CASO (${diasRestantes} DÍA(S) REST.)</span>`;
                }

                let casoHTML = reg.caso || 'SIN CASO';
                if (!tieneCaso) {
                    casoHTML += ` <button class="btn-add-caso" onclick="agregarCasoRapido(${reg.id})">+ Agregar Caso</button>`;
                }

                let controlEstadoHTML = '';
                
                if (minutosTranscurridos < 3 && !esModoAdmin) {
                    const minRestantes = Math.ceil(3 - minutosTranscurridos);
                    controlEstadoHTML = `
                        <div>
                            <span class="chip-estado chip-pendiente"><span class="led-pulse led-blue"></span>Pendiente</span>
                            <span class="timer-info">🔒 Desbloqueo en ${minRestantes} min</span>
                        </div>`;
                } else {
                    const claseEstadoActual = obtenerClaseEstadoCSS(reg.estado);
                    const estaDeshabilitado = reg.asignadoPorUsuario && !esModoAdmin;

                    controlEstadoHTML = `
                        <div style="display:flex; align-items:center;">
                            <select id="select-${reg.id}" class="select-estado-usuario ${claseEstadoActual}" ${estaDeshabilitado ? 'disabled' : ''} onchange="${esModoAdmin ? `cambiarEstadoUsuario(${reg.id}, this.value)` : `mostrarBotonOK(${reg.id})`}">
                                <option value="Pendiente" ${reg.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="Funcionó" ${reg.estado === 'Funcionó' ? 'selected' : ''}>Funcionó</option>
                                <option value="Falló" ${reg.estado === 'Falló' ? 'selected' : ''}>Falló</option>
                                <option value="Se descartó" ${reg.estado === 'Se descartó' ? 'selected' : ''}>Se descartó</option>
                            </select>
                            ${(!estaDeshabilitado && !esModoAdmin) ? `<button id="btn-ok-${reg.id}" class="btn-ok-estado" style="display:none;" onclick="cambiarEstadoUsuario(${reg.id})">OK</button>` : ''}
                        </div>`;
                }

                let historialHTML = `<div class="timeline-box">`;
                if (reg.historialObservaciones && reg.historialObservaciones.length > 0) {
                    reg.historialObservaciones.forEach(item => {
                        historialHTML += `
                            <div class="timeline-item">
                                <span class="timeline-fecha">${item.fecha}</span>
                                <span class="timeline-texto">${item.texto}</span>
                            </div>`;
                    });
                } else {
                    historialHTML += `<span style="color:#aaa; font-size:11px;">SIN OBSERVACIONES DE CAMBIO</span>`;
                }
                historialHTML += `</div>`;

                const celdaAccionesAdmin = esModoAdmin 
                    ? `<td>
                        <button class="btn-edit-admin" onclick="abrirModalEditarAdmin(${reg.id})" title="Modificar todo el registro">
                            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button class="btn-delete-row" onclick="eliminarRegistroIndividual(${reg.id})" title="Eliminar registro">
                            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                      </td>` 
                    : '';

                const fila = document.createElement('tr');
                fila.id = `fila-${reg.id}`;
                fila.innerHTML = `
                    <td>${fechaCorta}</td>
                    <td><strong>${reg.hostname}</strong></td>
                    <td>${reg.mac}</td>
                    <td><strong>${reg.serial || '-'}</strong></td>
                    <td>${reg.modelo}</td>
                    <td>${reg.ingeniero || '-'}</td>
                    <td>${casoHTML}</td>
                    <td>${alertaHTML}</td>
                    <td>${controlEstadoHTML}</td>
                    <td>${historialHTML}</td>
                    ${celdaAccionesAdmin}
                `;
                tbody.appendChild(fila);
            });
        }

        function exportarCSV() {
            if(registrosIT.length === 0) {
                alert("NO HAY REGISTROS PARA EXPORTAR.");
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "FECHA,HOSTNAME,MAC,SERIAL,MODELO,INGENIERO,CASO,ESTADO,HISTORIAL_INTERACCIONES\n";

            registrosIT.forEach(r => {
                const fecha = new Date(r.fechaISO).toLocaleDateString('es-CO');
                const historial = r.historialObservaciones ? r.historialObservaciones.map(h => `[${h.fecha}] ${h.texto}`).join(' | ') : '';
                
                const linea = [
                    `"${fecha}"`,
                    `"${r.hostname}"`,
                    `"${r.mac}"`,
                    `"${r.serial || ''}"`,
                    `"${r.modelo}"`,
                    `"${r.ingeniero || ''}"`,
                    `"${r.caso || ''}"`,
                    `"${r.estado.toUpperCase()}"`,
                    `"${historial.replace(/"/g, '""')}"`
                ].join(",");

                csvContent += linea + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Reporte_Despliegues_IT_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function animarContador(elementoId, valorFinal) {
            const el = document.getElementById(elementoId);
            const valorInicial = parseInt(el.textContent) || 0;
            if (valorInicial === valorFinal) return;
            
            let inicio = null;
            const duracion = 800;

            function paso(timestamp) {
                if (!inicio) inicio = timestamp;
                const progreso = Math.min((timestamp - inicio) / duracion, 1);
                const valorActual = Math.floor(progreso * (valorFinal - valorInicial) + valorInicial);
                el.textContent = valorActual;
                if (progreso < 1) {
                    window.requestAnimationFrame(paso);
                }
            }
            window.requestAnimationFrame(paso);
        }

        // ============================================================
// MONITOREO Y GRÁFICAS
// Calcula métricas y actualiza las visualizaciones Chart.js.
// ============================================================

function actualizarMonitoreoYGrafica() {
            const datosDelMes = obtenerDatosFiltradosMonitoreo();

            let funcionaron = datosDelMes.filter(r => r.estado === 'Funcionó').length;
            let fallaron = datosDelMes.filter(r => r.estado === 'Falló').length;
            let descartados = datosDelMes.filter(r => r.estado === 'Se descartó').length;

            animarContador('countFunciono', funcionaron);
            animarContador('countFallo', fallaron);
            animarContador('countDescarto', descartados);

            const totalCompletados = funcionaron + fallaron + descartados;
            const porcentajeExito = totalCompletados > 0 ? Math.round((funcionaron / totalCompletados) * 100) : 0;
            
            document.getElementById('healthPercent').textContent = `${porcentajeExito}% Exitoso`;
            document.getElementById('healthFill').style.width = `${porcentajeExito}%`;

            const mesSeleccionado = parseInt(document.getElementById('filtroMesMonitoreo').value);
            const anoSeleccionado = parseInt(document.getElementById('filtroAnoMonitoreo').value);
            const datosHistoricosMes = registrosIT.filter(reg => {
                const fechaReg = new Date(reg.fechaISO);
                return fechaReg.getMonth() === mesSeleccionado && fechaReg.getFullYear() === anoSeleccionado && reg.estadoConfirmado;
            });

            const modelos = ['HP G8', 'HP G9', 'HP G11'];
            
            let funcPorModelo = modelos.map(mod => datosHistoricosMes.filter(r => r.modelo === mod && r.estado === 'Funcionó').length);
            let falloPorModelo = modelos.map(mod => datosHistoricosMes.filter(r => r.modelo === mod && r.estado === 'Falló').length);
            let descPorModelo = modelos.map(mod => datosHistoricosMes.filter(r => r.modelo === mod && r.estado === 'Se descartó').length);

            dibujarGraficas(funcionaron, fallaron, descartados, funcPorModelo, falloPorModelo, descPorModelo);
        }

        function dibujarGraficas(funcionaron, fallaron, descartados, funcPorModelo, falloPorModelo, descPorModelo) {
            const esOscuro = document.body.classList.contains('dark-theme');
            const colorTextoGrafica = esOscuro ? '#e0e0e0' : '#666666';

            const ctxEstados = document.getElementById('miGraficaEstados').getContext('2d');
            if (instanciaGraficaEstados) instanciaGraficaEstados.destroy();

            instanciaGraficaEstados = new Chart(ctxEstados, {
                type: 'doughnut',
                data: {
                    labels: ['Funcionó', 'Falló', 'Se descartó'],
                    datasets: [{
                        data: [funcionaron, fallaron, descartados],
                        backgroundColor: ['#00965e', '#dc3545', '#6c757d'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { 
                            position: 'bottom',
                            labels: { color: colorTextoGrafica }
                        } 
                    }
                }
            });

            const ctxModelos = document.getElementById('miGraficaModelos').getContext('2d');
            if (instanciaGraficaModelos) instanciaGraficaModelos.destroy();

            instanciaGraficaModelos = new Chart(ctxModelos, {
                type: 'bar',
                data: {
                    labels: ['HP G8', 'HP G9', 'HP G11'],
                    datasets: [
                        { label: 'Funcionó', data: funcPorModelo, backgroundColor: '#00965e', borderWidth: 1 },
                        { label: 'Falló', data: falloPorModelo, backgroundColor: '#dc3545', borderWidth: 1 },
                        { label: 'Se descartó', data: descPorModelo, backgroundColor: '#6c757d', borderWidth: 1 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { 
                            position: 'bottom',
                            labels: { color: colorTextoGrafica }
                        } 
                    },
                    scales: { 
                        x: { 
                            stacked: false,
                            ticks: { color: colorTextoGrafica },
                            grid: { color: esOscuro ? '#333333' : '#dee2e6' }
                        }, 
                        y: { 
                            beginAtZero: true, 
                            ticks: { stepSize: 1, color: colorTextoGrafica },
                            grid: { color: esOscuro ? '#333333' : '#dee2e6' }
                        } 
                    }
                }
            });
        }

        // ============================================================
// PERSISTENCIA LOCAL
// Guarda los registros en localStorage del navegador.
// ============================================================

function guardarDatos() {
            localStorage.setItem('datosIT', JSON.stringify(registrosIT));
        }

        function actualizarConsecutivoUI() {
            if (registrosIT.length > 0) {
                const hostsValidos = registrosIT.map(r => r.hostname).filter(h => h.startsWith(baseHostname));
                if (hostsValidos.length > 0) {
                    const numeros = hostsValidos.map(h => parseInt(h.replace(baseHostname, ''))).filter(n => !isNaN(n));
                    if (numeros.length > 0) {
                        const maxNumero = Math.max(...numeros);
                        numeroConsecutivo = maxNumero + 1;
                    }
                }
            }
            document.getElementById('inHostname').value = baseHostname + numeroConsecutivo;
        }

        function limpiarFormulario() {
            document.getElementById('inMac').value = '';
            document.getElementById('inSerial').value = '';
            document.getElementById('inIngeniero').value = '';
            document.getElementById('inCaso').value = '';
            actualizarConsecutivoUI();
            validarFormularioCompleto();
            document.getElementById('inMac').focus();
        }

        // ============================================================
// ALERTAS PERSONALIZADAS
// Modal reutilizable para mensajes y captura de datos.
// ============================================================

function mostrarAlertaPersonalizada(mensajeHtml, callback, pedirInput = false) {
            document.getElementById('customAlertMessage').innerHTML = mensajeHtml;
            const inputObs = document.getElementById('customInputObs');
            if (pedirInput) {
                inputObs.value = '';
                inputObs.style.display = 'block';
                setTimeout(() => inputObs.focus(), 100);
            } else {
                inputObs.style.display = 'none';
            }
            document.getElementById('customAlert').classList.add('activa');
            callbackAlerta = callback || null;
        }

        function cerrarAlertaPersonalizada() {
            const inputObs = document.getElementById('customInputObs');
            const valorInput = inputObs.value;
            document.getElementById('customAlert').classList.remove('activa');
            if(callbackAlerta) {
                callbackAlerta(valorInput);
                callbackAlerta = null;
            }
        }