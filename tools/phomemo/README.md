# Prueba de impresión — Phomemo M110

Experimento para comprobar si podemos imprimir etiquetas desde nuestro propio
código, sin la app Print Master. **Todavía no es parte del sistema de BiKitchen**:
la pantalla `/admin/impresion` sigue funcionando en modo simulación y no depende
de esto.

Impresora: Phomemo M110 (FCC ID 2ASRB-M1105) · etiquetas 30 × 20 mm · 203 dpi.

## Instalación

Ya está hecho en la máquina de Jan (Python 3.12 + bleak 3.0.2 + Pillow 12.2).
En otra computadora:

```bash
pip install -r requirements.txt
```

## Uso

```bash
python print_test.py --preview
```
Guarda `preview.png` con la etiqueta que se imprimiría. No usa Bluetooth.

```bash
python print_test.py --scan
```
Lista los dispositivos Bluetooth LE cercanos y dice si ve la impresora. No imprime.

```bash
python print_test.py
```
Busca, conecta e imprime **una** etiqueta.

### Ajustes cuando la etiqueta sale mal

| Problema | Probar |
|---|---|
| Sale corrida a un lado | `--x-offset 40` (en puntos; 8 puntos ≈ 1 mm) |
| Sale muy clara | `--density 15` (ya es el máximo) o `--speed 1` (más lento, más nítido) |
| Sale muy oscura o manchada | `--density 8` |
| No la encuentra al escanear | `--address XX:XX:XX:XX:XX:XX` con la MAC |
| El contenido no cae en la etiqueta | `--full-width` manda los 384 puntos del cabezal |

Otras opciones: `--tipo`, `--plato`, `--vence` para cambiar el texto.

## Protocolo

No hay documentación oficial. Los bytes salen del reverse-engineering de la
comunidad, verificados contra dos proyectos independientes:

- [vivier/phomemo-tools](https://github.com/vivier/phomemo-tools) — driver CUPS,
  sniffing del tráfico Bluetooth de la app Android
- [mkuhlmann/pyphomemo](https://github.com/mkuhlmann/pyphomemo) — específico para M110

```
Cabezal:  384 puntos = 48 bytes por línea, 203 dpi
Etiqueta: 30 × 20 mm = 240 × 160 puntos

Velocidad    1b 4e 0d <1..5>
Densidad     1b 4e 04 <1..15>
Tipo medio   1f 11 0a              (0x0a = etiqueta con separación)
Ráster       1d 76 30 00 <anchoBytes LE16> <líneas LE16> <datos>
Cierre       1f f0 05 00 1f f0 03 00

Bit en 1 = quemar. MSB = punto más a la izquierda.
(Pillow usa 0 para negro, por eso el rasterizador invierte.)

BLE: servicio ff00, escritura ff02, notificación ff03
     bloques de 128 bytes con 20 ms entre bloques
```

## Lo que este experimento NO prueba

El script informa cuántos bytes aceptó la impresora, no si el papel salió bien.
La M110 no reporta el resultado de la impresión por BLE, así que **la única
verificación real es mirar la etiqueta física**.

## Si funciona

El siguiente paso es convertir esto en un servicio local pequeño
(`POST /print` en localhost) y escribir `PhomemoM110PrinterAdapter` en
`src/services/printing/`, respetando la interfaz que ya existe en
`PrinterAdapter.js`. La cola, el cálculo de cantidades y la pantalla no
necesitan cambios.
