document.addEventListener("DOMContentLoaded", () => {

  /* ---------- 1. UTILIDADES ---------- */

  // Formatea números como pesos colombianos: 28000 -> "$28.000"
  const formatoCOP = new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0
  });
  const pesos = (valor) => formatoCOP.format(valor);

  // Precio de venta actual (los datos ya traen el precio con oferta aplicada)
  const precioFinal = (p) => p.precio;

  // ¿Está en oferta? -> tiene un precio anterior mayor al actual
  const enOferta = (p) => p.precioAntes !== null && p.precioAntes > p.precio;

  // Porcentaje de descuento calculado a partir de los dos precios reales
  const porcentajeDescuento = (p) => Math.round((1 - p.precio / p.precioAntes) * 100);

  // Busca un producto por id
  const buscarProducto = (id) => PRODUCTOS.find((p) => p.id === Number(id));

  // Constantes de negocio
  const ENVIO = 8000;
  const MINIMO_ENVIO_GRATIS = 150000;
  const IVA = 0.19;
  const CUPONES = {
    MOE10:       { tipo: "porcentaje", valor: 10, texto: "10% de descuento aplicado" },
    ENVIOGRATIS: { tipo: "envio",                 texto: "Envío gratis aplicado" }
  };

  // Lectura/escritura segura en localStorage (puede fallar en modo privado)
  const guardar = (clave, valor) => {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin persistencia */ }
  };
  const leer = (clave, defecto) => {
    try { return JSON.parse(localStorage.getItem(clave)) ?? defecto; } catch (e) { return defecto; }
  };

  // Muestra un toast de Bootstrap creado dinámicamente
  function mostrarToast(mensaje, tipo = "success") {
    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-bg-${tipo} border-0`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${mensaje}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
      </div>`;
    document.getElementById("contenedorToasts").appendChild(toast);
    const instancia = new bootstrap.Toast(toast, { delay: 2500 });
    instancia.show();
    toast.addEventListener("hidden.bs.toast", () => toast.remove()); // limpia el DOM
  }

  // Crea una alerta de Bootstrap dentro de un contenedor
  function mostrarAlerta(contenedor, mensaje, tipo) {
    contenedor.innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
      </div>`;
  }

  // Atributos de imagen según FOTOS_LOCALES (ver productos.js)
  const atributosImagen = (p) => FOTOS_LOCALES
    ? `src="${p.img}" data-remoto="${p.imgUrl}"`
    : `src="${p.imgUrl}"`;

  // Si una imagen falla: 1) intenta la URL remota, 2) usa la imagen de respaldo.
  // Se escucha en fase de captura porque el evento "error" de <img> no burbujea.
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (img.tagName !== "IMG") return;
    if (img.dataset.remoto && !img.dataset.intentoRemoto) {
      img.dataset.intentoRemoto = "1";
      img.src = img.dataset.remoto;
    } else if (!img.src.endsWith(IMG_RESPALDO)) {
      img.src = IMG_RESPALDO;
    }
  }, true);

  /* ---------- 2. VERIFICACIÓN DE EDAD ---------- */

  const modalEdad = new bootstrap.Modal("#modalEdad");
  const formEdad = document.getElementById("formEdad");
  const alertaEdad = document.getElementById("alertaEdad");

  // Calcula la edad exacta a partir de la fecha de nacimiento
  function calcularEdad(fechaTexto) {
    const nacimiento = new Date(fechaTexto + "T00:00:00");
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    // Si aún no ha cumplido años este año, restamos uno
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  }

  if (leer("moe_mayor", false) !== true) {
    document.body.classList.add("bloqueado");
    modalEdad.show();
  }

  formEdad.addEventListener("submit", (evento) => {
    evento.preventDefault();               // evita recargar la página
    const valor = document.getElementById("fechaNacimiento").value;

    if (!valor || new Date(valor) > new Date()) {
      mostrarAlerta(alertaEdad, "Ingresa una fecha de nacimiento válida.", "warning");
      return;
    }
    const edad = calcularEdad(valor);
    if (edad >= 18) {
      guardar("moe_mayor", true);
      document.body.classList.remove("bloqueado");
      modalEdad.hide();
      mostrarToast("¡Bienvenido a La Taberna de Moe!", "dark");
    } else {
      mostrarAlerta(alertaEdad,
        `<i class="bi bi-x-octagon me-1"></i>Tienes ${edad} años. Lo sentimos, el acceso es solo para mayores de 18.`,
        "danger");
    }
  });

  /* ---------- 3. CATÁLOGO ---------- */

  const grid = document.getElementById("gridProductos");
  const gridPromos = document.getElementById("gridPromos");
  const sinResultados = document.getElementById("sinResultados");
  const contadorResultados = document.getElementById("contadorResultados");
  const contenedorFiltros = document.getElementById("filtrosCategoria");
  const buscador = document.getElementById("buscador");
  const orden = document.getElementById("orden");
  const precioMax = document.getElementById("precioMax");
  const precioMaxTexto = document.getElementById("precioMaxTexto");
  const soloPromos = document.getElementById("soloPromos");

  // Estado actual de los filtros
  const PRECIO_MAX = 210000;
  const filtros = { categoria: "todas", texto: "", orden: "relevancia", max: PRECIO_MAX, promos: false };

  // Genera los botones de categoría a partir del arreglo CATEGORIAS
  CATEGORIAS.forEach((cat) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn btn-sm btn-categoria" + (cat.id === "todas" ? " active" : "");
    boton.dataset.categoria = cat.id;
    boton.setAttribute("aria-pressed", cat.id === "todas");
    boton.textContent = cat.nombre;
    contenedorFiltros.appendChild(boton);
  });

  // Plantilla HTML de una tarjeta (card de Bootstrap)
  function crearTarjeta(p) {
    const col = document.createElement("div");
    col.className = "col aparecer";
    col.innerHTML = `
      <article class="card card-producto h-100">
        <div class="img-wrap">
          ${enOferta(p) ? `<span class="badge badge-promo">-${porcentajeDescuento(p)}%</span>` : ""}
          <img ${atributosImagen(p)} class="card-img-top" alt="${p.nombre}" loading="lazy" data-ver-producto="${p.id}">
          <button class="btn btn-tinta btn-agregar" data-agregar="${p.id}" aria-label="Agregar ${p.nombre} al carrito">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
          </button>
        </div>
        <div class="card-body">
          <p class="marca-producto mb-1">${nombreCategoria(p.categoria)} · ${p.volumen}</p>
          <h3 class="card-title">
            <a href="#" class="text-reset text-decoration-none" data-ver-producto="${p.id}">${p.nombre}</a>
          </h3>
          <div>
            <span class="precio">${pesos(p.precio)}</span>
            ${enOferta(p) ? `<span class="precio-antes ms-1">${pesos(p.precioAntes)}</span>` : ""}
          </div>
        </div>
      </article>`;
    return col;
  }

  // Posición de la categoría en el arreglo CATEGORIAS (para ordenar)
  const ordenCategoria = (p) => CATEGORIAS.findIndex((c) => c.id === p.categoria);

  function nombreCategoria(id) {
    return CATEGORIAS.find((c) => c.id === id)?.nombre ?? id;
  }

  // Aplica filtros + orden y vuelve a dibujar la rejilla
  function renderCatalogo() {
    const texto = filtros.texto.trim().toLowerCase();

    let lista = PRODUCTOS.filter((p) =>
      (filtros.categoria === "todas" || p.categoria === filtros.categoria) &&
      (texto === "" || p.nombre.toLowerCase().includes(texto) || p.descripcion.toLowerCase().includes(texto)) &&
      precioFinal(p) <= filtros.max &&
      (!filtros.promos || enOferta(p))
    );

    // Ordenamiento (se copia el arreglo para no alterar el original)
    lista = [...lista].sort((a, b) => {
      switch (filtros.orden) {
        case "precio-asc":  return precioFinal(a) - precioFinal(b);
        case "precio-desc": return precioFinal(b) - precioFinal(a);
        case "nombre":      return a.nombre.localeCompare(b.nombre, "es");
        default:            // destacados primero, luego agrupados por categoría
          return (b.destacado - a.destacado) || ordenCategoria(a) - ordenCategoria(b) || a.id - b.id;
      }
    });

    grid.innerHTML = "";
    lista.forEach((p) => grid.appendChild(crearTarjeta(p)));
    sinResultados.classList.toggle("d-none", lista.length > 0);
    contadorResultados.textContent = `${lista.length} de ${PRODUCTOS.length} productos`;
  }

  // Sección de promociones: solo productos con descuento
  PRODUCTOS.filter(enOferta).forEach((p) => gridPromos.appendChild(crearTarjeta(p)));

  // Eventos de los filtros
  contenedorFiltros.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-categoria]");
    if (!boton) return;
    contenedorFiltros.querySelectorAll("button").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    boton.classList.add("active");
    boton.setAttribute("aria-pressed", "true");
    filtros.categoria = boton.dataset.categoria;
    renderCatalogo();
  });
  buscador.addEventListener("input", () => { filtros.texto = buscador.value; renderCatalogo(); });
  orden.addEventListener("change", () => { filtros.orden = orden.value; renderCatalogo(); });
  precioMax.addEventListener("input", () => {
    filtros.max = Number(precioMax.value);
    precioMaxTexto.textContent = pesos(filtros.max);
    renderCatalogo();
  });
  soloPromos.addEventListener("change", () => { filtros.promos = soloPromos.checked; renderCatalogo(); });

  document.getElementById("limpiarFiltros").addEventListener("click", () => {
    Object.assign(filtros, { categoria: "todas", texto: "", orden: "relevancia", max: PRECIO_MAX, promos: false });
    buscador.value = ""; orden.value = "relevancia"; precioMax.value = PRECIO_MAX; soloPromos.checked = false;
    precioMaxTexto.textContent = pesos(PRECIO_MAX);
    contenedorFiltros.querySelector('[data-categoria="todas"]').click(); // reutiliza el evento
  });

  /* ---------- 4. MODAL DE DETALLE ---------- */

  const modalProducto = new bootstrap.Modal("#modalProducto");
  const mpCantidad = document.getElementById("mpCantidad");
  let productoAbierto = null;

  function abrirDetalle(id) {
    const p = buscarProducto(id);
    if (!p) return;
    productoAbierto = p;
    document.getElementById("tituloProducto").textContent = p.nombre;
    const img = document.getElementById("mpImagen");
    delete img.dataset.intentoRemoto;          // reinicia el intento de respaldo
    if (FOTOS_LOCALES) { img.dataset.remoto = p.imgUrl; img.src = p.img; }
    else { delete img.dataset.remoto; img.src = p.imgUrl; }
    img.alt = p.nombre;
    document.getElementById("mpCategoria").textContent = nombreCategoria(p.categoria);
    document.getElementById("mpDescripcion").textContent = p.descripcion;
    document.getElementById("mpFicha").innerHTML = `
      <li class="mb-1"><span class="text-secondary">Marca / fabricante:</span> ${p.marca}</li>
      <li class="mb-1"><span class="text-secondary">Presentación:</span> ${p.volumen}</li>
      <li class="mb-1"><span class="text-secondary">Grado alcohólico:</span> ${p.grado}% vol.</li>
      ${enOferta(p) ? `<li class="text-danger">Ahorras ${pesos(p.precioAntes - p.precio)} (-${porcentajeDescuento(p)}%)</li>` : ""}`;
    document.getElementById("mpPrecio").innerHTML =
      `<span class="precio fs-2">${pesos(p.precio)}</span>` +
      (enOferta(p) ? `<span class="precio-antes ms-2">${pesos(p.precioAntes)}</span>` : "");
    mpCantidad.value = 1;
    modalProducto.show();
  }

  document.getElementById("mpAgregar").addEventListener("click", () => {
    const cantidad = Math.max(1, parseInt(mpCantidad.value, 10) || 1);
    agregarAlCarrito(productoAbierto.id, cantidad);
    modalProducto.hide();
  });

  // Delegación de eventos: un solo listener para todos los botones
  // "Detalle" y "Agregar", aunque las tarjetas se creen después.
  document.addEventListener("click", (e) => {
    const ver = e.target.closest("[data-ver-producto]");
    const agregar = e.target.closest("[data-agregar]");
    if (ver) { e.preventDefault(); abrirDetalle(ver.dataset.verProducto); }
    if (agregar) agregarAlCarrito(agregar.dataset.agregar, 1);
  });

  /* ---------- 5. CARRITO ---------- */

  // El carrito es un arreglo de { id, cantidad } guardado en localStorage
  let carrito = leer("moe_carrito", []);
  let cupon = leer("moe_cupon", null);

  const listaCarrito = document.getElementById("listaCarrito");
  const carritoVacio = document.getElementById("carritoVacio");
  const resumenCarrito = document.getElementById("resumenCarrito");
  const contadorCarrito = document.getElementById("contadorCarrito");
  const mensajeCupon = document.getElementById("mensajeCupon");

  function agregarAlCarrito(id, cantidad = 1) {
    id = Number(id);
    const item = carrito.find((i) => i.id === id);
    if (item) item.cantidad += cantidad;
    else carrito.push({ id, cantidad });
    actualizarCarrito();
    mostrarToast(`<i class="bi bi-check2 me-1"></i>${buscarProducto(id).nombre} agregado (${cantidad})`, "dark");
  }

  function cambiarCantidad(id, delta) {
    const item = carrito.find((i) => i.id === id);
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) quitarDelCarrito(id);
    else actualizarCarrito();
  }

  function quitarDelCarrito(id) {
    carrito = carrito.filter((i) => i.id !== id);
    actualizarCarrito();
  }

  // Cálculo de totales: función pura, fácil de explicar y probar
  function calcularTotales() {
    const subtotal = carrito.reduce((suma, i) => suma + precioFinal(buscarProducto(i.id)) * i.cantidad, 0);
    const descuento = cupon && CUPONES[cupon].tipo === "porcentaje"
      ? Math.round(subtotal * CUPONES[cupon].valor / 100) : 0;
    const base = subtotal - descuento;
    const envioGratis = cupon === "ENVIOGRATIS" || base >= MINIMO_ENVIO_GRATIS;
    const envio = subtotal === 0 || envioGratis ? 0 : ENVIO;
    const total = base + envio;
    const iva = Math.round(total - total / (1 + IVA)); // IVA ya incluido en los precios
    const unidades = carrito.reduce((suma, i) => suma + i.cantidad, 0);
    return { subtotal, descuento, envio, total, iva, unidades, base };
  }

  // Redibuja la lista del carrito, el resumen y el contador del navbar
  function actualizarCarrito() {
    guardar("moe_carrito", carrito);
    const t = calcularTotales();

    contadorCarrito.textContent = t.unidades;
    carritoVacio.classList.toggle("d-none", carrito.length > 0);
    resumenCarrito.classList.toggle("d-none", carrito.length === 0);

    listaCarrito.innerHTML = carrito.map((i) => {
      const p = buscarProducto(i.id);
      return `
        <li class="item-carrito d-flex gap-2 align-items-center">
          <img ${atributosImagen(p)} alt="">
          <div class="flex-grow-1">
            <div class="small fw-bold">${p.nombre}</div>
            <div class="small text-secondary">${pesos(precioFinal(p))} c/u</div>
            <div class="d-flex align-items-center gap-1 mt-1">
              <button class="btn btn-borde btn-cantidad" data-restar="${p.id}" aria-label="Restar una unidad de ${p.nombre}">−</button>
              <span class="cantidad-item" aria-label="Cantidad">${i.cantidad}</span>
              <button class="btn btn-borde btn-cantidad" data-sumar="${p.id}" aria-label="Sumar una unidad de ${p.nombre}">+</button>
            </div>
          </div>
          <div class="text-end">
            <div class="fw-bold">${pesos(precioFinal(p) * i.cantidad)}</div>
            <button class="btn btn-link p-0 small" data-quitar="${p.id}" aria-label="Quitar ${p.nombre}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </li>`;
    }).join("");

    document.getElementById("rSubtotal").textContent = pesos(t.subtotal);
    document.getElementById("rDescuento").textContent = "-" + pesos(t.descuento);
    document.getElementById("rEnvio").textContent = t.envio === 0 ? "Gratis" : pesos(t.envio);
    document.getElementById("rIva").textContent = pesos(t.iva);
    document.getElementById("rTotal").textContent = pesos(t.total);

    const falta = MINIMO_ENVIO_GRATIS - t.base;
    document.getElementById("faltaEnvio").textContent =
      t.envio > 0 ? `Te faltan ${pesos(falta)} para envío gratis.` : "";

    mensajeCupon.innerHTML = cupon
      ? `<span class="text-success"><i class="bi bi-check2"></i> ${cupon}: ${CUPONES[cupon].texto}</span>
         <button class="btn btn-link btn-sm p-0 ms-1" id="quitarCupon">quitar</button>` : "";
  }

  // Botones +, −, quitar (delegación dentro de la lista)
  listaCarrito.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.sumar)  cambiarCantidad(Number(b.dataset.sumar), 1);
    if (b.dataset.restar) cambiarCantidad(Number(b.dataset.restar), -1);
    if (b.dataset.quitar) quitarDelCarrito(Number(b.dataset.quitar));
  });

  // Cupones
  document.getElementById("formCupon").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("inputCupon");
    const codigo = input.value.trim().toUpperCase();
    if (CUPONES[codigo]) {
      cupon = codigo;
      guardar("moe_cupon", cupon);
      input.value = "";
      actualizarCarrito();
    } else {
      mensajeCupon.innerHTML = `<span class="text-danger"><i class="bi bi-x"></i> Cupón no válido.</span>`;
    }
  });
  mensajeCupon.addEventListener("click", (e) => {
    if (e.target.id === "quitarCupon") { cupon = null; guardar("moe_cupon", null); actualizarCarrito(); }
  });

  document.getElementById("btnVaciar").addEventListener("click", () => {
    carrito = [];
    actualizarCarrito();
    mostrarToast("Carrito vaciado", "dark");
  });

  /* ---------- 6. PEDIDO SIMULADO ---------- */

  const offcanvasCarrito = bootstrap.Offcanvas.getOrCreateInstance("#carrito");
  const modalPedido = new bootstrap.Modal("#modalPedido");
  const formPedido = document.getElementById("formPedido");

  document.getElementById("btnFinalizar").addEventListener("click", () => {
    document.getElementById("pTotal").textContent = pesos(calcularTotales().total);
    offcanvasCarrito.hide();
    modalPedido.show();
  });

  formPedido.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!formPedido.checkValidity()) {          // validación HTML5 nativa
      formPedido.classList.add("was-validated"); // activa estilos de Bootstrap
      return;
    }
    const t = calcularTotales();
    const numero = "MOE-" + Date.now().toString().slice(-6);
    const nombre = document.getElementById("pNombre").value.trim();

    modalPedido.hide();
    mostrarAlerta(document.getElementById("alertaGlobal"),
      `<h3 class="h5 alert-heading"><i class="bi bi-bag-check me-1"></i>¡Pedido ${numero} confirmado!</h3>
       <p class="mb-1">Gracias, ${nombre}. ${t.unidades} producto(s) por un total de <strong>${pesos(t.total)}</strong>.</p>
       <p class="small mb-0">Pedido simulado con fines académicos: no se realizó ningún cobro.</p>`,
      "success");

    // Reiniciar todo
    carrito = []; cupon = null; guardar("moe_cupon", null);
    actualizarCarrito();
    formPedido.reset();
    formPedido.classList.remove("was-validated");
  });

  /* ---------- 7. FORMULARIO DE CONTACTO ---------- */

  const formContacto = document.getElementById("formContacto");
  const cMensaje = document.getElementById("cMensaje");
  const contadorMensaje = document.getElementById("contadorMensaje");

  cMensaje.addEventListener("input", () => {
    contadorMensaje.textContent = `${cMensaje.value.length}/300`;
  });

  formContacto.addEventListener("submit", (e) => {
    e.preventDefault();
    // Validación personalizada adicional: el nombre no puede tener números
    const nombre = document.getElementById("cNombre");
    nombre.setCustomValidity(/\d/.test(nombre.value) ? "El nombre no debe contener números" : "");

    if (!formContacto.checkValidity()) {
      formContacto.classList.add("was-validated");
      formContacto.querySelector(":invalid")?.focus();  // lleva el foco al primer error
      return;
    }
    mostrarAlerta(document.getElementById("alertaContacto"),
      `<i class="bi bi-envelope-check me-1"></i>Gracias, <strong>${nombre.value.trim()}</strong>. Moe responderá tu mensaje pronto (envío simulado).`,
      "success");
    formContacto.reset();
    formContacto.classList.remove("was-validated");
    contadorMensaje.textContent = "0/300";
  });

  /* ---------- 8. EXTRAS ---------- */

  // Cuenta regresiva hasta el último segundo del mes actual
  function actualizarCuenta() {
    const ahora = new Date();
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
    let s = Math.max(0, Math.floor((fin - ahora) / 1000));
    const dos = (n) => String(n).padStart(2, "0");
    document.getElementById("cdDias").textContent  = dos(Math.floor(s / 86400)); s %= 86400;
    document.getElementById("cdHoras").textContent = dos(Math.floor(s / 3600));  s %= 3600;
    document.getElementById("cdMin").textContent   = dos(Math.floor(s / 60));
    document.getElementById("cdSeg").textContent   = dos(s % 60);
  }
  actualizarCuenta();
  setInterval(actualizarCuenta, 1000);

  // Botón "volver arriba" visible después de bajar 600 px
  const btnArriba = document.getElementById("btnArriba");
  window.addEventListener("scroll", () => btnArriba.classList.toggle("visible", window.scrollY > 600));
  btnArriba.addEventListener("click", () => window.scrollTo({ top: 0 }));

  // Cerrar el menú móvil al elegir un enlace
  const menu = document.getElementById("menu");
  menu.querySelectorAll(".nav-link").forEach((enlace) =>
    enlace.addEventListener("click", () => bootstrap.Collapse.getInstance(menu)?.hide())
  );

  // Primer dibujado
  renderCatalogo();
  actualizarCarrito();
});
