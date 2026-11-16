# Ficha del negocio — La Taberna de Moe (Entrega 1)

## Datos generales
| Campo | Detalle |
|---|---|
| Nombre comercial | La Taberna de Moe |
| Tipo de negocio | Distribuidora de bebidas alcohólicas con domicilio (Opción A) |
| Eslogan | «La barra de siempre, ahora en tu puerta» |
| Dirección | Cra. 3 #22-50, Bogotá |
| Correo | pedidos@tabernamoebogota.com |
| Horario | Lunes a sábado 8:00 a. m. – 10:00 p. m. · Domingos 11:00 a. m. – 3:00 a. m. |
| Público objetivo | Adultos mayores de 18 años en Bogotá que compran para reuniones, fiestas y consumo en casa |
| Propuesta de valor | Las marcas más vendidas en Colombia, precios competitivos, compra rápida y envío gratis desde $150.000 |
| Restricción legal | Venta exclusiva a mayores de edad (Ley 124 de 1994); verificación al ingresar y al entregar |

## Catálogo
6 categorías y **34 productos reales** (8 cervezas y refajo, 26 licores) con foto. Fotos de Dislicores; precios de Almacenes Éxito y Dislicores (fuentes en `fuentes-precios.md`).

| Categoría | Productos | Rango de precio (COP) |
|---|---|---|
| Cervezas (8) | Club Colombia Dorada x6 · Club Colombia Roja x6 · Águila Original x6 · Poker x6 · Heineken x6 · Andina Dorada x6 · Cola y Pola x6 · Corona Extra x6 | $13.050 – $22.000 |
| Aguardiente (5) | Aguardiente Antioqueño Tapa Roja · Aguardiente Antioqueño Tapa Azul · Aguardiente Amarillo de Manzanares Sin Azúcar · Aguardiente Antioqueño Verde · Aguardiente Néctar Sin Azúcar | $38.400 – $49.500 |
| Ron (6) | Ron Viejo de Caldas Tradicional · Ron Viejo de Caldas Carta de Oro 8 Años · Ron Viejo de Caldas Juan de la Cruz 5 Años · Ron Medellín Añejo 3 Años · Ron Medellín Extra Añejo 8 Años · Ron Bacardí Carta Blanca Superior | $50.600 – $96.100 |
| Whisky (7) | Old Parr 12 Años · Buchanan's Deluxe 12 Años · Johnnie Walker Black Label 12 Años · Johnnie Walker Red Label · The Glenlivet 12 Años · Jack Daniel's Old No. 7 · Black & White 8 Años | $61.000 – $209.900 |
| Vinos (5) | Gato Negro Cabernet Merlot · La Celia Reserva Cabernet Sauvignon · Santa Carolina Reserva Cabernet Sauvignon · Gato Negro Varietal Malbec · La Celia Reserva Malbec | $52.500 – $75.500 |
| Tequila y vodka (3) | José Cuervo Especial Reposado · Smirnoff Red (tradicional) · Smirnoff Tamarindo Picante | $51.000 – $91.000 |

11 productos tienen oferta real (precio anterior tachado).

## Promociones
- Cupón **MOE10**: 10% sobre el subtotal.
- Cupón **ENVIOGRATIS**: envío gratis.
- Envío gratis automático en pedidos desde $150.000.
- Productos con etiqueta roja rebajados.

## Identidad visual (minimalista, con la paleta del logo)
| Elemento | Decisión |
|---|---|
| Logo | Gato barman brindando con una jarra de cerveza sobre un letrero "La Taberna de Moe · Bogotá" |
| Fondo | Crema `#fdebd0` (el mismo del logo); paneles en `#fff8ec` |
| Texto y botones | Negro `#110d09` (contorno del logo) |
| Acento | Naranja `#ed9715` (círculo del logo): descuentos, cupones y efecto al pasar el mouse |
| Texto secundario | Marrón cálido `#6b5a45` |
| Bordes | `#ead2a8`, 1 px |
| Tipografía | **Inter** (una sola familia; pesos 400–800) |
| Iconos | Bootstrap Icons, usados con moderación |

## Mapa del sitio (página única)
`Inicio` → `Catálogo` → `Promociones` → `Nosotros` → `Contacto`
+ Carrito (offcanvas) · Modal de edad · Modal de producto · Modal de pedido

## Estructura de archivos
`index.html`, `css/styles.css`, `js/productos.js`, `js/app.js`, `img/`, `capturas/`, `docs/`, `README.md`

## Uso del Grid (breakpoints)
| Zona | xs (<576) | sm (≥576) | md (≥768) | lg (≥992) | xl (≥1200) |
|---|---|---|---|---|---|
| Catálogo | 1 columna | 2 | 2 | 3 | 4 |
| Beneficios | 2 | 2 | 4 | 4 | 4 |
| Promos (cupones) | 1 | 1 | 3 | 3 | 3 |
| Nosotros / Contacto | 1 | 1 | 1 | 2 | 2 |
| Navbar | colapsada (hamburguesa) | colapsada | colapsada | expandida | expandida |
