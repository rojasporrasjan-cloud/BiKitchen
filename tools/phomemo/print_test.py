"""
Prueba mínima de impresión en la Phomemo M110.

Objetivo único: comprobar que podemos mandar una etiqueta desde nuestro propio
código, sin la app Print Master. No es todavía el servicio de impresión de
BiKitchen: es el experimento que decide si ese servicio es viable.

Uso:
    python print_test.py --scan       # solo busca la impresora, no imprime
    python print_test.py --preview    # guarda un PNG de lo que se imprimiría
    python print_test.py              # busca, conecta e IMPRIME una etiqueta

Ajustes útiles si la etiqueta sale corrida o muy clara:
    --x-offset 72      # mueve el contenido a la izquierda/derecha (en puntos)
    --density 15       # 1..15, más alto = más oscuro
    --address XX:XX..  # conectar directo a una MAC, sin escanear

Protocolo (reverse-engineering de la comunidad, ver README.md):
    cabezal 384 puntos = 48 bytes por línea, 203 dpi
    velocidad   1b 4e 0d <v>
    densidad    1b 4e 04 <v>
    tipo medio  1f 11 0a        (etiqueta con separación)
    ráster      1d 76 30 00 <anchoBytes LE16> <líneas LE16> <datos>
    cierre      1f f0 05 00 1f f0 03 00
    BLE: servicio ff00, escritura ff02, notificación ff03, bloques de 128 bytes
"""

import argparse
import asyncio
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Falta Pillow. Instalá las dependencias:\n    pip install -r requirements.txt")

try:
    from bleak import BleakClient, BleakScanner
except ImportError:
    sys.exit("Falta bleak. Instalá las dependencias:\n    pip install -r requirements.txt")


# ---------------------------------------------------------------- protocolo

SERVICE_UUID = "0000ff00-0000-1000-8000-00805f9b34fb"
WRITE_CHAR_UUID = "0000ff02-0000-1000-8000-00805f9b34fb"
NOTIFY_CHAR_UUID = "0000ff03-0000-1000-8000-00805f9b34fb"

HEAD_DOTS = 384          # ancho físico del cabezal de la M110
HEAD_BYTES = HEAD_DOTS // 8
CHUNK_SIZE = 128
CHUNK_DELAY = 0.02

DPI = 203
LABEL_W_MM = 30
LABEL_H_MM = 20


def mm_to_dots(mm):
    return round(mm / 25.4 * DPI)


LABEL_W = mm_to_dots(LABEL_W_MM)   # 240
LABEL_H = mm_to_dots(LABEL_H_MM)   # 160


def cmd_init():
    """ESC @ — reinicia la impresora. Va antes que cualquier otra cosa."""
    return bytes([0x1B, 0x40])


def cmd_speed(value):
    return bytes([0x1B, 0x4E, 0x0D, value])


def cmd_density(value):
    return bytes([0x1B, 0x4E, 0x04, value])


def cmd_media_labels():
    # 0x0a = etiquetas con separación (las nuestras). 0x0b sería papel continuo.
    return bytes([0x1F, 0x11, 0x0A])


def cmd_raster_header(width_bytes, lines):
    return bytes([
        0x1D, 0x76, 0x30, 0x00,
        width_bytes & 0xFF, (width_bytes >> 8) & 0xFF,
        lines & 0xFF, (lines >> 8) & 0xFF,
    ])


def cmd_footer():
    return bytes([0x1F, 0xF0, 0x05, 0x00, 0x1F, 0xF0, 0x03, 0x00])


# ------------------------------------------------------------------ dibujo

def load_font(size, bold=False):
    """Arial de Windows; si no está, la fuente que traiga Pillow."""
    for name in (["arialbd.ttf", "arial.ttf"] if bold else ["arial.ttf"]):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size)
    except TypeError:
        return ImageFont.load_default()


def fit_text(draw, text, max_width, max_lines, max_size, min_size, bold=False):
    """
    Achica y parte el texto hasta que quepa. Misma estrategia que la vista
    previa del panel (labelRenderer.js), para que lo que se ve sea lo que sale.
    """
    text = (text or "").strip()
    if not text:
        return [], load_font(min_size, bold)

    for size in range(max_size, min_size - 1, -1):
        font = load_font(size, bold)
        words, lines, current = text.split(), [], ""
        for word in words:
            trial = f"{current} {word}".strip()
            if draw.textlength(trial, font=font) <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        if len(lines) <= max_lines and all(draw.textlength(l, font=font) <= max_width for l in lines):
            return lines, font

    # No cabe ni al mínimo: recortar con puntos suspensivos.
    font = load_font(min_size, bold)
    clipped = text
    while clipped and draw.textlength(clipped + "…", font=font) > max_width:
        clipped = clipped[:-1]
    return [clipped + "…"], font


def render_label(tipo, plato, vence, marca="BIKITCHEN FOOD"):
    """Devuelve la etiqueta 30x20mm como imagen 1-bit (blanco = papel)."""
    img = Image.new("1", (LABEL_W, LABEL_H), 1)
    draw = ImageDraw.Draw(img)
    pad = 8
    usable = LABEL_W - pad * 2
    y = pad

    def center(lines, font, y):
        for line in lines:
            w = draw.textlength(line, font=font)
            draw.text(((LABEL_W - w) / 2, y), line, font=font, fill=0)
            y += font.size + 2
        return y

    lines, font = fit_text(draw, marca, usable, 1, 20, 11, bold=True)
    y = center(lines, font, y)

    y += 3
    draw.rectangle([pad, y, LABEL_W - pad, y + 1], fill=0)
    y += 8

    lines, font = fit_text(draw, tipo, usable, 1, 20, 11)
    y = center(lines, font, y)

    y += 4
    lines, font = fit_text(draw, plato, usable, 2, 30, 13, bold=True)
    center(lines, font, y)

    if vence:
        lines, font = fit_text(draw, f"Vence {vence}", usable, 1, 20, 11)
        w = draw.textlength(lines[0], font=font)
        draw.text(((LABEL_W - w) / 2, LABEL_H - pad - font.size), lines[0], font=font, fill=0)

    return img


def image_to_raster(img, x_offset, width_bytes):
    """
    Imagen 1-bit → bytes para el cabezal.

    Bit en 1 = quemar. Pillow usa 0 para negro, así que se invierte.
    MSB = punto más a la izquierda.
    """
    width_dots = width_bytes * 8
    canvas = Image.new("1", (width_dots, img.height), 1)
    canvas.paste(img, (x_offset, 0))
    pixels = canvas.load()

    data = bytearray()
    for y in range(canvas.height):
        for byte_index in range(width_bytes):
            byte = 0
            for bit in range(8):
                x = byte_index * 8 + bit
                if pixels[x, y] == 0:          # negro en la imagen
                    byte |= 0x80 >> bit        # → bit encendido para la impresora
            data.append(byte)
    return bytes(data)


# ------------------------------------------------------------------- BLE

async def find_printer(address=None, timeout=12.0):
    if address:
        print(f"Buscando la impresora en {address} …")
        device = await BleakScanner.find_device_by_address(address, timeout=timeout)
        if not device:
            raise RuntimeError(f"No apareció ningún dispositivo BLE en {address}")
        return device

    print(f"Escaneando Bluetooth LE durante {timeout:.0f} segundos …")
    devices = await BleakScanner.discover(timeout=timeout, return_adv=True)
    if not devices:
        raise RuntimeError("No se vio ningún dispositivo BLE. ¿Está encendido el Bluetooth?")

    print(f"\nDispositivos encontrados ({len(devices)}):")
    candidatos = []
    for d, adv in devices.values():
        uuids = [u.lower() for u in (adv.service_uuids or [])]
        marca = ""
        # Ojo: la M110 ANUNCIA af30, no ff00. El ff00 (donde se imprime) solo
        # aparece una vez conectada, así que buscarlo en el anuncio no sirve.
        if any(u.startswith("0000af30") or u.startswith("0000ff00") for u in uuids):
            marca = "  ← servicio de impresora Phomemo"
            candidatos.append(d)
        elif "m110" in (d.name or "").lower() or "phomemo" in (d.name or "").lower():
            marca = "  ← nombre de Phomemo"
            candidatos.append(d)
        print(f"   {d.address}   {d.name or '(sin nombre)'}{marca}")
        if uuids:
            print(f"      servicios anunciados: {', '.join(uuids)}")

    if candidatos:
        d = candidatos[0]
        print(f"\nImpresora detectada: {d.name} ({d.address})")
        return d

    raise RuntimeError(
        "\nNinguno de esos dispositivos parece la impresora.\n"
        "Encendé la impresora (led azul) y volvé a intentar. Si sabés su MAC,\n"
        "usá:  python print_test.py --address XX:XX:XX:XX:XX:XX"
    )


async def dump_device(device):
    """
    Lista TODO lo que expone la impresora: servicios, características y qué
    permite hacer con cada una. Sirve para saber a dónde hay que escribir de
    verdad, en vez de suponerlo.
    """
    print(f"\nConectando a {device.address} para inspeccionarla …")
    async with BleakClient(device, timeout=25.0) as client:
        print(f"Conectado: {client.is_connected}\n")
        for service in client.services:
            print(f"SERVICIO {service.uuid}")
            if service.description:
                print(f"   {service.description}")
            for c in service.characteristics:
                props = ",".join(c.properties)
                print(f"   CARACTERÍSTICA {c.uuid}   [{props}]")
                if "read" in c.properties:
                    try:
                        valor = await client.read_gatt_char(c)
                        print(f"      valor: {valor.hex(' ')}  {valor!r}")
                    except Exception as e:
                        print(f"      (no se pudo leer: {e})")
            print()


async def send_label(device, raster, width_bytes, lines, speed, density):
    print(f"\nConectando a {device.address} …")
    async with BleakClient(device, timeout=25.0) as client:
        if not client.is_connected:
            raise RuntimeError("No se logró conectar")
        print("Conectado.")

        char = None
        for service in client.services:
            for c in service.characteristics:
                if c.uuid.lower() == WRITE_CHAR_UUID:
                    char = c
        if char is None:
            disponibles = [c.uuid for s in client.services for c in s.characteristics]
            raise RuntimeError(
                "La impresora no expone la característica de escritura esperada "
                f"({WRITE_CHAR_UUID}).\nCaracterísticas vistas: {disponibles}"
            )

        # Escuchar lo que la impresora responda. No es decorativo: si le falta
        # papel, tiene la tapa abierta o la batería baja, es acá donde lo dice.
        recibido = []

        def on_notify(_sender, data):
            recibido.append(data)
            print(f"   ← la impresora responde: {data.hex(' ')}")

        try:
            await client.start_notify(NOTIFY_CHAR_UUID, on_notify)
            print("Escuchando respuestas de la impresora.")
        except Exception as e:
            print(f"(no se pudo escuchar el canal de estado: {e})")

        # write-without-response cuando la impresora lo permite: es más rápido
        # y es lo que hace la app original.
        with_response = "write-without-response" not in char.properties
        print(f"Modo de escritura: {'confirmada' if with_response else 'sin confirmación'}")

        async def write(data):
            await client.write_gatt_char(char, data, response=with_response)

        print("Enviando configuración …")
        await write(cmd_init());         await asyncio.sleep(0.03)
        await write(cmd_speed(speed));   await asyncio.sleep(0.03)
        await write(cmd_density(density)); await asyncio.sleep(0.03)
        await write(cmd_media_labels()); await asyncio.sleep(0.03)

        print(f"Enviando imagen ({width_bytes} bytes × {lines} líneas = {len(raster)} bytes) …")
        await write(cmd_raster_header(width_bytes, lines))

        enviados = 0
        for i in range(0, len(raster), CHUNK_SIZE):
            await write(raster[i:i + CHUNK_SIZE])
            enviados += len(raster[i:i + CHUNK_SIZE])
            await asyncio.sleep(CHUNK_DELAY)
            if enviados % (CHUNK_SIZE * 10) == 0:
                print(f"   {enviados}/{len(raster)} bytes")

        await asyncio.sleep(0.30)
        await write(cmd_footer())
        await asyncio.sleep(0.50)

        await asyncio.sleep(1.0)  # dar tiempo a que conteste

        print(f"\nSe enviaron {enviados} bytes y la impresora los aceptó sin error.")
        if recibido:
            print(f"La impresora respondió {len(recibido)} vez/veces (ver arriba).")
        else:
            print("La impresora no respondió nada por el canal de estado.")
        print("IMPORTANTE: esto confirma que se envió, no que el papel salió bien.")
        print("Mirá la impresora y decime qué pasó realmente.")


# ------------------------------------------------------------------ main

async def main():
    ap = argparse.ArgumentParser(description="Prueba de impresión Phomemo M110")
    ap.add_argument("--scan", action="store_true", help="solo listar dispositivos BLE")
    ap.add_argument("--dump", action="store_true",
                    help="conectar y listar todo lo que expone la impresora, sin imprimir")
    ap.add_argument("--preview", action="store_true", help="guardar PNG sin imprimir")
    ap.add_argument("--address", help="MAC de la impresora, para saltarse el escaneo")
    ap.add_argument("--tipo", default="Regular")
    ap.add_argument("--plato", default="Fajitas de pollo")
    ap.add_argument("--vence", default="23 enero")
    ap.add_argument("--density", type=int, default=15, help="1..15 (default 15)")
    ap.add_argument("--speed", type=int, default=3, help="1..5 (default 3)")
    ap.add_argument("--x-offset", type=int, default=None,
                    help="posición horizontal en puntos (default: centrado en el cabezal)")
    ap.add_argument("--label-width", action="store_true",
                    help="mandar solo los 240 puntos de la etiqueta en vez de la línea completa "
                         "(la M110 normalmente NO imprime así; solo para diagnóstico)")
    args = ap.parse_args()

    if args.scan or args.dump:
        try:
            device = await find_printer(args.address)
            if args.dump:
                await dump_device(device)
        except Exception as e:
            print(f"\n{type(e).__name__}: {e}")
        return

    img = render_label(args.tipo, args.plato, args.vence)

    if args.preview:
        salida = "preview.png"
        img.resize((LABEL_W * 3, LABEL_H * 3), Image.NEAREST).save(salida)
        print(f"Vista previa guardada en {salida} ({LABEL_W}×{LABEL_H} puntos, escalada ×3)")
        return

    # La M110 espera SIEMPRE la línea completa del cabezal (48 bytes) con la
    # etiqueta centrada. Con un ancho menor acepta los datos y no imprime nada.
    if args.label_width:
        width_bytes = LABEL_W // 8
        x_offset = args.x_offset if args.x_offset is not None else 0
    else:
        width_bytes = HEAD_BYTES
        x_offset = args.x_offset if args.x_offset is not None else (HEAD_DOTS - LABEL_W) // 2

    raster = image_to_raster(img, x_offset, width_bytes)

    print(f"Etiqueta: {LABEL_W_MM}×{LABEL_H_MM} mm → {LABEL_W}×{LABEL_H} puntos a {DPI} dpi")
    print(f"Se envían {width_bytes} bytes por línea, contenido desde el punto {x_offset}")

    try:
        device = await find_printer(args.address)
        await send_label(device, raster, width_bytes, LABEL_H, args.speed, args.density)
    except Exception as e:
        print(f"\nFALLÓ: {type(e).__name__}: {e}")
        print("\nNo se imprimió nada. Decime este mensaje completo y seguimos desde ahí.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
