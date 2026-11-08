# =========================================================
# Descarga las fotos de los productos desde DISLICORES y las GUARDA
# en el proyecto (img\productos\<slug>.png o .jpg). Misma lógica que
# descargar-imagenes.mjs, para usar en Windows sin Node.js.
#
# Uso, desde la carpeta del proyecto en PowerShell:
#     .\scripts\descargar-imagenes.ps1           -> descarga las que faltan
#     .\scripts\descargar-imagenes.ps1 -Todas    -> vuelve a descargar todas
# Si Windows bloquea el script, ejecuta antes (solo para esa ventana):
#     Set-ExecutionPolicy -Scope Process Bypass
# =========================================================
param([switch]$Todas)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # acelera Invoke-WebRequest en PowerShell 5.1
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Raiz    = Split-Path -Parent $PSScriptRoot
$Destino = Join-Path $Raiz 'img\productos'
$Lista   = Join-Path $Raiz 'scripts\productos-imagenes.json'
$Tienda  = 'https://dislicores.com'
$Ancho   = 800
$Agente  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

New-Item -ItemType Directory -Force -Path $Destino | Out-Null

function Get-Json([string]$Url) {
    for ($i = 0; $i -lt 3; $i++) {
        try { return Invoke-RestMethod -Uri $Url -UserAgent $Agente -TimeoutSec 20 }
        catch {
            if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 404) { return $null }
            Start-Sleep -Seconds ([math]::Pow(2, $i))
        }
    }
    return $null
}

# Shopify a veces devuelve URLs que empiezan por "//"
function Complete-Url([string]$Url) {
    if ($Url -and $Url.StartsWith('//')) { return 'https:' + $Url }
    return $Url
}

# Variantes: tamaño reducido (?width=) y original
function Get-Variantes([string]$Url) {
    $limpia = $Url.Split('?')[0]
    if ($limpia -match 'cdn\.shopify\.com|/cdn/shop/') { return @("$($limpia)?width=$Ancho", $limpia) }
    return @($limpia)
}

function Test-Imagen([string]$Ruta) {
    if (-not (Test-Path $Ruta)) { return $false }
    $b = [IO.File]::ReadAllBytes($Ruta)
    if ($b.Length -lt 2000) { return $false }
    $jpg  = ($b[0] -eq 0xFF -and $b[1] -eq 0xD8)
    $png  = ($b[0] -eq 0x89 -and $b[1] -eq 0x50)
    $webp = ([Text.Encoding]::ASCII.GetString($b, 0, 4) -eq 'RIFF' -and [Text.Encoding]::ASCII.GetString($b, 8, 4) -eq 'WEBP')
    return ($jpg -or $png -or $webp)
}

function Save-Foto($Prod) {
    $archivo = Join-Path $Raiz ($Prod.archivo -replace '/', '\')
    if (-not $Todas -and (Test-Imagen $archivo)) { return 'ya existía' }

    $candidatas = New-Object System.Collections.Generic.List[object]
    if ($Prod.dislicores) {
        $p = Get-Json "$Tienda/products/$($Prod.dislicores).js"
        if ($p) {
            $img = $p.featured_image
            if (-not $img -and $p.images) { $img = $p.images[0] }
            if ($img) { $candidatas.Add(@('Dislicores (producto)', (Complete-Url $img))) }
        }
        $q = [uri]::EscapeDataString($Prod.busqueda)
        $s = Get-Json "$Tienda/search/suggest.json?q=$q&resources[type]=product&resources[limit]=1"
        if ($s -and $s.resources.results.products) {
            $candidatas.Add(@('Dislicores (búsqueda)', (Complete-Url $s.resources.results.products[0].image)))
        }
    }
    if ($Prod.urlConocida) { $candidatas.Add(@('URL guardada', $Prod.urlConocida)) }

    $temp = "$archivo.tmp"
    foreach ($c in $candidatas) {
        foreach ($v in (Get-Variantes $c[1])) {
            for ($i = 0; $i -lt 2; $i++) {
                try {
                    Invoke-WebRequest -Uri $v -UserAgent $Agente -OutFile $temp -UseBasicParsing -TimeoutSec 20
                    if (Test-Imagen $temp) {
                        Move-Item -Force $temp $archivo
                        return "OK ($($c[0]), $([math]::Round((Get-Item $archivo).Length / 1KB)) KB)"
                    }
                    break
                } catch {
                    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 404) { break }
                    Start-Sleep -Seconds ([math]::Pow(2, $i))
                }
            }
        }
    }
    if (Test-Path $temp) { Remove-Item -Force $temp }
    return 'FALLO'
}

$productos = Get-Content -Raw -Encoding UTF8 $Lista | ConvertFrom-Json
$fallos = @()
foreach ($p in $productos) {
    $res = Save-Foto $p
    Write-Host ("{0,-36} {1}" -f $res, $p.slug)
    if ($res -eq 'FALLO') { $fallos += $p.slug }
    Start-Sleep -Milliseconds 300
}
Write-Host ""
Write-Host "Listo: $($productos.Count - $fallos.Count) de $($productos.Count) fotos en img\productos\"
if ($fallos.Count -gt 0) {
    Write-Host "Sin foto: $($fallos -join ', ')"
    Write-Host "Puedes guardar a mano una imagen con el nombre que indica scripts\productos-imagenes.json."
    exit 1
}
