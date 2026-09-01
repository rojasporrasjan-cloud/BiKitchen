# Auditoría de pedidos — 24 agosto 2026

Revisión cruzada de tres fuentes: el Excel de Gina (`Tabla para resumenes- Lunes 24
AGOSTO 2DA PARTE.xlsx`), el grupo de WhatsApp **VENTAS LUNES**, y el panel de admin
en producción (`/admin/orders`).

---

## 1. Hallazgo principal — pedidos "Entregado" con entregas pendientes

**33 pedidos** están marcados `delivered` / `cancelled` pero el propio panel muestra
"Próx: <fecha futura>". Al estar en Historial no cuentan en el día ni salen en la hoja
de cocina.

- **27** con entrega pendiente el **lunes 24 ago**
- **5** el **miércoles 26 ago** (Wilner Sequera, Angie Navarro, Kendall Barboza,
  Bryan Ocampo, Rebeca Toval)
- **1** el sábado 29 ago (José Daniel Benavides)

Causa: "Cerrar un día completo" (`cambiarEstadoDelDia` en `src/pages/admin/OrdersView.jsx`)
pasa el pedido ENTERO a `delivered` aunque le queden entregas futuras.

### Los 27 del lunes 24
| Pedido | Cliente | Envíos |
|---|---|---|
| #ORD-Y3BVZRQ0C8 | Mariana Salas Rodríguez | 3 |
| #ORD-VABASWL0MX | Jessica (esposa Gustavo Barahona) | 4 |
| #ORD-VAAUOV58GP | Xiomara Vilchez | 4 |
| #ORD-VAA1X2OH1G | Tatiana Soto | 4 |
| #ORD-VA5QI6QE4O | Dennis Lopez | 4 |
| #ORD-VA4V8RAHPY | Laura Cano (recibe Felix Castellon) | 2 |
| #ORD-V9VAR653GW | Jean Carlos Mora | 2 |
| #ORD-V9UHC23RXI | Gybran Jimenez | 2 |
| #ORD-V94Z6TS33Y | Kendall Barboza | 4 |
| #ORD-V94FMU3LGX | Adriana Gonzalez | 2 |
| #ORD-V3WLG09OYL | Alvaro Rivera Madrigal | 4 |
| #ORD-V3T0M53OM0 | Cesar Quesada Zamora | 2 |
| #ORD-V3O3GGCT7S | Tatiana Jiménez | 2 |
| #ORD-V3K8P2W4NI | Mariana Salas Rodríguez | 2 |
| #ORD-TPAG38DPLL | Edwin perez | 2 |
| #ORD-T6OL7BM56T | Kendall Barboza (CANCELADO) | 4 |
| #ORD-S1ZVV8ZI4T | Silvia Urena | 4 |
| #ORD-S1TM7K7U9Z | Enid Murillo Rivas | 2 |
| #ORD-QUMFMLEG28 | Brayan Diaz Moya | 2 |
| #ORD-Q77NEELRG6 | Maripaz Acevedo Halabi | 2 |
| #ORD-NK4CP9D1FX | Iván Solís Balma | 2 |
| #ORD-JRAC4E6IS2 | Alejandro Rojas Porras (CANCELADO) | 4 |
| #ORD-JFF5NXTDKF | Veronica Solórzano | 4 |
| #ORD-IXZYTDKV8K | Priscilla Montoya | 4 |
| #ORD-I050U5UOTB | Sonia Oreamuno | 4 |
| #ORD-F2ETCCW1SA | Maria Cristina Molina García | 4 |
| #ORD-4OM508I5N5 | Jeremy Taylor | 4 |

---

## 2. Excel vs sistema — los 49 mensuales/quincenales del lunes 24

- **22 activos** en el sistema (importados 22 ago 02:12–02:20 am, `IMPORTADO DE WHATSAPP`)
- **18 en el sistema pero marcados Entregado** (los de la tabla de arriba)
- **7 no existen en ningún lado**: Ricardo Perez, Leo Hesiterkamp, Jimena Bedoya,
  Carolina Laurito, Christian Vargas (×2), Andrea Saborio

## 3. Duplicados

- **Veronica Solórzano**: #ORD-JFF5NXTDKF (Entregado, 4 envíos) + #ORD-3807OFU501 (web, 2 envíos)
- **Mariana Salas**: #ORD-Y3BVZRQ0C8 (3 envíos) + #ORD-V3K8P2W4NI (2 envíos)
- **Kendall Barboza**: #ORD-V94Z6TS33Y + #ORD-T6OL7BM56T (cancelado) + #ORD-XIT67QQ2OC

## 4. WhatsApp VENTAS LUNES (jueves 20 – domingo 23)

29 pedidos leídos. **9 ya en el sistema**, **20 no**:
Rudy Mora, Carolina Acevedo, Jeaustin Matarrita, Carolina Guerrero, Johanny Varela,
Mayela López, Karen Villarreal, Tania Delgado, Claudia Moreno, Linsey Quiros,
Jason Barrantes, Adriana Cubillo, Jazmin Elizondo, Yaret Sandoval, Xiomara Vilchez,
Carolina Laurito, Josef Diermissen, Gybran Jimenez (nuevo del 31),
Marcela Serrano y Adriana Gonzalez (existen con otra fecha/monto).

Bloqueados por falta de datos (sin teléfono/precio/fechas): Xiomara Vilchez,
Carolina Laurito, Jason Barrantes, Adriana Cubillo, Jazmin Elizondo, Gybran Jimenez.

## 5. Discrepancias puntuales

- **Guillermo Vargas**: sistema cobra ₡90.500; WhatsApp dice ₡87.400 con "Envíos REGALÍA".
- **Melanie Quiros**: figura con 6 envíos; en el Excel es un pack normal.
- **Marcela Serrano**: metida con fecha 2026-08-22 (sábado). El mensaje decía "lunes 22",
  que no existe — el 22 fue sábado.
- **Catherine Ordóñez**: el WhatsApp lista "Lunes 01 setiembre", que es martes.
- **Angelo Oviedo Montero** #ORD-7DGQ5ILC4S: pago no completado (abandono/rechazo), entrega 26/8.

## 6. Ciclo de semanas (Excel Lunes 17 → Lunes 24)

Semanas que no avanzaron: **Gabriel Blanco** (2→2), **Mariana Salas** (2→2),
**Melanie Quiros** (2→2), **Ever Arroyo** (4→4), **Alberto Ortega** (4→4).

Se cayeron de la lista: Joel Salazar (60265380), Silvia Irene Peralta (72546348),
Kendall Barboza (89711899), Beatriz Gonzalez (83093108).

Se cocinan sin estar en la lista: Nicole Peña (Sin Carbos G17),
Kendall Barboza (Regular G8), Monserrat Morales y Beatriz Gonzalez (Personalizado).

## 7. Excel — dos hojas "Bajo en calorías"

La buena para el lunes 24 es **`Bajo en calorías   `** (con espacios al final, 25 platos):
sus platos coinciden con el menú del 18 al 24. La otra (`Bajo en calorías`, 27 platos)
tiene el menú de otra semana. Lo mismo pasa con `Sin Carbos  ` y `Regular  `.
