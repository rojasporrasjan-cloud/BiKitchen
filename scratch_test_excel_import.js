const openpyxl = require('child_process');
const { buildKitchenSheetData, buildPackingSheetData, mapPedidosFromLegacy } = require('./src/utils/logisticsUtils.js');

// Script para verificar cómo se leen y generan las Hojas de Producción y Empaque
const { execSync } = require('child_process');

const pyScript = `
import openpyxl, json

file_path = r"C:\\Users\\rojas\\Downloads\\menu 19 agosto personalizado\\MENU PERSONALIZADO ENTREGA 19 AGOSTO.xlsx"
wb = openpyxl.load_workbook(file_path)
ws = wb['Hoja1']

clients = []
current_client = None

for row in ws.iter_rows(values_only=True):
    if not any(row): continue
    cleaned = [str(c).strip() if c is not None else "" for c in row]
    header = cleaned[0]
    
    if "," in header and ("ZAPOTE" in header or "Belen" in header or "Sta Ana" in header or "Romhroser" in header or "Escazu" in header or "Tibas" in header):
        parts = [p.strip() for p in header.split(",")]
        current_client = {
            "cliente": parts[0],
            "zona": parts[1],
            "items": [],
            "observaciones": ""
        }
        clients.append(current_client)
    elif current_client and cleaned[0].startswith("Plato"):
        item_name = cleaned[1]
        cantidad = 1
        if len(cleaned) > 3 and "PLATOS" in cleaned[3]:
            try:
                cantidad = int(cleaned[3].split()[0])
            except: pass
        current_client["items"].append({
            "nombre": item_name,
            "cantidad": cantidad,
            "proteinas": [item_name]
        })
    elif current_client and ("NOLACTEOS" in cleaned[0] or "Bajo" in cleaned[0] or "SOLO" in cleaned[0] or "two pack" in cleaned[0].lower()):
        current_client["observaciones"] += (" " + cleaned[0]).trim()

print(json.dumps(clients, indent=2))
`;

console.log("Generando prueba empírica de importación...");
