# Guía para la sustentación (5–7 minutos)

## Guion sugerido
| Tiempo | Qué mostrar |
|---|---|
| 0:00–0:45 | Presentar el negocio (ficha), el repositorio y abrir el enlace de GitHub Pages. |
| 0:45–1:45 | Responsive: abrir DevTools (F12 → ícono de dispositivo) y cambiar entre celular, tableta y computador. Señalar el navbar colapsado y el catálogo pasando de 4 a 1 columna. |
| 1:45–2:30 | Componentes Bootstrap: carrusel, cards, acordeón, modales, offcanvas, toasts, alertas. |
| 2:30–5:00 | **Demostración de la lógica JS**: verificación de edad, filtros, carrito, cupones, totales, pedido. Abrir `app.js` y explicar las funciones clave (abajo). |
| 5:00–6:00 | Formulario de contacto: enviar vacío (errores), nombre con números (validación propia) y envío correcto. |
| 6:00–7:00 | Accesibilidad, README y cierre. |

---

## Clases Bootstrap clave y qué hacen
| Clase | Dónde | Para qué |
|---|---|---|
| `container`, `row`, `col-*` | Todo el sitio | Grid de 12 columnas |
| `row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4` | Catálogo | Número de tarjetas por fila según el ancho |
| `g-4` | Filas | Espacio (gutter) entre columnas |
| `navbar navbar-expand-lg sticky-top` | Menú | Menú que colapsa en < 992 px y queda fijo arriba |
| `collapse navbar-collapse` + `navbar-toggler` | Menú | Botón hamburguesa |
| `carousel slide carousel-fade` | Inicio | Carrusel con transición de desvanecido |
| `card`, `card-body`, `card-footer`, `h-100` | Productos | Tarjetas de igual altura |
| `modal`, `modal-dialog-centered`, `data-bs-backdrop="static"` | Edad / detalle / pedido | Ventanas emergentes; la de edad no se puede cerrar con clic fuera |
| `offcanvas offcanvas-end` | Carrito | Panel lateral derecho |
| `accordion` | Nosotros | Preguntas frecuentes |
| `needs-validation`, `was-validated`, `invalid-feedback` | Formularios | Estilos de validación |
| `alert`, `toast`, `badge` | Mensajes | Retroalimentación al usuario |
| `d-none`, `d-md-inline`, `d-flex`, `gap-2` | Varios | Mostrar/ocultar y alinear con utilidades |
| `data-bs-spy="scroll"` | `<body>` | ScrollSpy: resalta el enlace de la sección visible |

**Personalización:** `styles.css` se carga después de Bootstrap y sobrescribe variables (`--bs-body-bg`, `--bs-border-radius`, `--bs-accordion-*`). Se crearon las clases propias `.btn-tinta` (botón negro) y `.btn-borde` (botón blanco con borde) redefiniendo las variables del botón, y `.btn-categoria` para los filtros tipo *chip*. El diseño minimalista se logra con una sola tipografía, un solo color de acento y bordes finos.

---

## Lógica en JavaScript — qué explicar
**Datos (`productos.js`)**: arreglo `PRODUCTOS` de objetos `{ id, nombre, marca, categoria, precio, precioAntes, volumen, grado, ... }` con productos y precios reales de tiendas colombianas. Separar datos de lógica permite agregar productos o actualizar precios sin tocar el HTML.

**Ofertas**: `enOferta(p)` devuelve `true` si `precioAntes` existe y es mayor que `precio`; `porcentajeDescuento(p)` calcula `1 − precio / precioAntes` para la etiqueta roja (ej.: Old Parr $144.200 → $115.360 = −20%).

**1. Verificación de edad** — `calcularEdad(fecha)`: resta años y corrige si aún no ha cumplido años este año. Si `edad >= 18` guarda `moe_mayor` en `localStorage`, quita la clase `bloqueado` del `<body>` y cierra el modal.

**2. Render del catálogo** — `renderCatalogo()`:
1. `filter()` aplica categoría, texto, precio máximo y promociones según el objeto `filtros`.
2. `sort()` ordena una **copia** del arreglo (`[...lista]`).
3. Limpia `grid.innerHTML` y agrega cada tarjeta con `crearTarjeta(p)` (usa `document.createElement` + plantillas literales).
4. Muestra la alerta “sin resultados” si la lista queda vacía.

**3. Eventos** — `input` en el buscador y el rango, `change` en el select y el switch, `click` en los botones de categoría. Cada evento actualiza `filtros` y vuelve a llamar `renderCatalogo()`.

**Delegación de eventos**: un solo `document.addEventListener("click")` detecta `[data-agregar]` y `[data-ver-producto]` con `closest()`. Funciona aunque las tarjetas se creen después de cargar la página.

**4. Carrito** — arreglo `carrito = [{ id, cantidad }]`:
- `agregarAlCarrito(id, cant)`: si existe suma la cantidad, si no hace `push`.
- `cambiarCantidad(id, ±1)`: si llega a 0 llama `quitarDelCarrito`.
- `quitarDelCarrito(id)`: usa `filter` para eliminarlo.
- `calcularTotales()`: con `reduce` calcula subtotal y unidades; aplica cupón, envío e IVA incluido.
- `actualizarCarrito()`: guarda en `localStorage`, redibuja la lista y escribe los totales en el DOM.

**Ejemplo de cálculo para explicar en vivo:**
2 × Club Colombia Dorada x6 ($19.300) + 1 × Ron Juan de la Cruz 5 Años ($65.300)
→ Subtotal $103.900 → MOE10 −$10.390 → base $93.510 → envío $8.000 → **Total $101.510** (IVA incluido $16.207).

**5. Formularios** — `checkValidity()` usa la validación HTML5 (`required`, `pattern="3[0-9]{9}"`, `minlength`, `type="email"`). Si falla se agrega `was-validated` para que Bootstrap pinte los errores. En contacto hay una **validación propia** con `setCustomValidity()`: el nombre no puede tener números.

**6. Extras** — cuenta regresiva con `setInterval` cada segundo, toasts creados dinámicamente con `new bootstrap.Toast()`, botón “volver arriba” con el evento `scroll`.

---

## Preguntas probables y respuestas cortas
- **¿Por qué `localStorage`?** Para que el carrito no se pierda al recargar la página.
- **¿Por qué `preventDefault()` en los formularios?** Para evitar que el navegador recargue la página y manejar el envío con JS.
- **¿Qué pasa si escribo un cupón inválido?** Se muestra “Cupón no válido” y no cambia el total.
- **¿Cómo agregarías un producto nuevo?** Añadiendo un objeto al arreglo `PRODUCTOS`; el catálogo se genera solo.
- **¿De dónde salen los precios y las fotos?** Las fotos, de Dislicores (tienda en Shopify); los precios, de Almacenes Éxito y Dislicores (noviembre de 2026). Están en `docs/fuentes-precios.md`.
- **¿Cómo se manejan las fotos que no cargan?** Un solo listener de `error` en fase de captura (`addEventListener("error", ..., true)`, porque ese evento no burbujea) prueba primero la foto de la tienda y, si tampoco carga, pone `sin-foto.svg`.
- **¿Qué hace `Intl.NumberFormat`?** Da formato de pesos colombianos ($ 25.200).
