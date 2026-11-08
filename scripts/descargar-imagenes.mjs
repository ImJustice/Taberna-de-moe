/* =========================================================
   Descarga las fotos de los productos desde DISLICORES y las
   GUARDA en el proyecto (img/productos/<slug>.png o .jpg), para que el
   sitio no dependa de que la tienda siga mostrando sus imágenes.

   Uso (Node.js 18 o superior), desde la carpeta del proyecto:
       node scripts/descargar-imagenes.mjs            -> descarga las que faltan
       node scripts/descargar-imagenes.mjs --todas    -> vuelve a descargar todas

   Dislicores usa Shopify, que ofrece direcciones públicas y estables:
     1. /products/<handle>.js     -> datos del producto con su foto ACTUAL
     2. /search/suggest.json?q=   -> búsqueda por nombre (si el handle cambió)
     3. URL de la foto guardada en el catálogo (último recurso)
   Las fotos se sirven desde cdn.shopify.com. Andina y Cola y Pola no
   se venden en Dislicores: para ellas solo se intenta la URL guardada.
   ========================================================= */
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = path.join(RAIZ, "img", "productos");
const LISTA = path.join(RAIZ, "scripts", "productos-imagenes.json");
const TODAS = process.argv.includes("--todas");
const TIENDA = process.env.URL_TIENDA ?? "https://dislicores.com";   // se puede cambiar para pruebas
const ANCHO = 800;                                                  // ancho de la foto descargada (px)

const CABECERAS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "es-CO,es;q=0.9",
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch con tiempo límite y reintentos (espera 1 s, 2 s, 4 s)
async function pedir(url, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      const control = new AbortController();
      const reloj = setTimeout(() => control.abort(), 20000);
      const r = await fetch(url, { headers: CABECERAS, signal: control.signal });
      clearTimeout(reloj);
      if (r.ok) return r;
      if (r.status === 404) return null;            // no existe: no se reintenta
    } catch { /* error de red: se reintenta */ }
    await esperar(1000 * 2 ** i);
  }
  return null;
}

async function json(url) {
  const r = await pedir(url);
  if (!r) return null;
  try { return await r.json(); } catch { return null; }
}

// ¿Los primeros bytes son de una imagen JPG, PNG o WEBP?
function esImagen(buf) {
  if (buf.length < 2000) return false;
  const jpg = buf[0] === 0xff && buf[1] === 0xd8;
  const png = buf[0] === 0x89 && buf[1] === 0x50;
  const webp = buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP";
  return jpg || png || webp;
}

// Shopify a veces devuelve URLs que empiezan por "//": se completan con https:
const completa = (u) => (u?.startsWith("//") ? "https:" + u : u);

// Variantes: tamaño reducido (Shopify acepta ?width=) y original
function variantes(url) {
  const limpia = url.split("?")[0];
  return limpia.includes("cdn.shopify.com") || limpia.includes("/cdn/shop/")
    ? [`${limpia}?width=${ANCHO}`, limpia]
    : [limpia];
}

// Fuentes de URL, en orden de preferencia
async function* fuentes(prod) {
  if (prod.dislicores) {
    const p = await json(`${TIENDA}/products/${prod.dislicores}.js`);
    yield ["Dislicores (producto)", completa(p?.featured_image ?? p?.images?.[0])];
    const q = encodeURIComponent(prod.busqueda);
    const s = await json(`${TIENDA}/search/suggest.json?q=${q}&resources[type]=product&resources[limit]=1`);
    yield ["Dislicores (búsqueda)", completa(s?.resources?.results?.products?.[0]?.image)];
  }
  yield ["URL guardada", prod.urlConocida];
}

async function descargar(prod) {
  const archivo = path.join(RAIZ, prod.archivo);
  if (!TODAS) {
    try { if ((await stat(archivo)).size > 2000) return { estado: "ya existía" }; } catch { /* no existe */ }
  }
  for await (const [origen, url] of fuentes(prod)) {
    if (!url) continue;
    for (const u of variantes(url)) {
      const r = await pedir(u, 2);
      if (!r) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (esImagen(buf)) {
        await writeFile(archivo, buf);
        return { estado: "OK", origen, kb: Math.round(buf.length / 1024) };
      }
    }
  }
  return { estado: "FALLO" };
}

const productos = JSON.parse(await readFile(LISTA, "utf8"));
await mkdir(DESTINO, { recursive: true });
const fallos = [];
for (const prod of productos) {
  const res = await descargar(prod);
  const extra = res.origen ? ` (${res.origen}, ${res.kb} KB)` : "";
  console.log(`${res.estado.padEnd(10)} ${prod.slug}${extra}`);
  if (res.estado === "FALLO") fallos.push(prod.slug);
  await esperar(300);
}
console.log(`\nListo: ${productos.length - fallos.length} de ${productos.length} fotos en img/productos/`);
if (fallos.length) {
  console.log("Sin foto:", fallos.join(", "));
  console.log(`Puedes guardar a mano una imagen con el nombre que indica scripts/productos-imagenes.json.`);
  process.exitCode = 1;
}
