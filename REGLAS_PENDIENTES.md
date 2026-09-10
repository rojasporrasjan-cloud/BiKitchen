# Reglas de Firestore — lo que quedó pendiente de decidir

`firestore.rules` ahora es **igual a lo que corre en producción**, más las dos
colecciones nuevas de la hoja de cocina. Se puede desplegar tal cual sin
sorpresas.

Durante la comparación aparecieron dos diferencias que el archivo del repo traía
desde antes y que **a propósito no se dejaron adentro**, porque cada una cambia
comportamiento de verdad y merece su propia decisión.

---

## 1. Los puntos: el cliente hoy no puede ver su saldo

**Lo que corre:**

```
match /loyalty/{userId} {
  allow read, write: if isOwner(userId) || isAdmin();
}
```

**El problema:** los documentos de fidelidad se guardan **por correo**, no por
uid. En todo el código es `doc(db, 'loyalty', correo)` — `useLoyaltyPoints.js`,
`loyaltySync.js`, `clientService.js`, `PointsAuditView.jsx`.

Pero `isOwner(userId)` compara `request.auth.uid == userId`. El uid es algo como
`k3Jf9x...`, y el userId acá es `cliente@gmail.com`. **Nunca van a ser iguales.**

Resultado: para un cliente normal la regla siempre da falso. Solo los cuatro
correos admin pasan. Es decir, el cliente **no puede leer sus propios BiPuntos ni
canjearlos**; el `onSnapshot` de `useLoyaltyPoints.js` se le cae con
`permission-denied`.

**Lo que traía el repo:** `isEmailOwner(userId) || isAdmin()` — eso sí compara
correo con correo y arregla la lectura.

**Por qué no lo desplegué así:** porque dice `allow read, write`. Con
`isEmailOwner` el cliente también podría **escribir** su propio documento de
puntos, o sea ponerse los puntos que quiera desde la consola del navegador.
Cambiar una cosa arreglaría la pantalla y abriría un hueco.

**Lo que hay que decidir:** el canje sí lo hace el cliente desde el navegador
(`useLoyaltyPoints.js`, el `updateDoc` con `increment(-pointsCost)`), así que no
basta con dejar la escritura solo para admin: se romperían los canjes. Las dos
salidas razonables son:

- **A** — partir la regla y limitar la escritura a que los puntos solo puedan
  bajar y solo se toquen los campos del canje:

  ```
  match /loyalty/{userId} {
    allow read: if isEmailOwner(userId) || isAdmin();
    allow write: if isAdmin();
    allow update: if isEmailOwner(userId)
      && request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['currentPoints','points','totalRedeemed','history','updatedAt'])
      && request.resource.data.currentPoints < resource.data.currentPoints;
  }
  ```

- **B** — dejar lectura al dueño, escritura solo admin, y mover el canje a una
  Netlify Function (igual que el otorgamiento en `nmi-charge`). Más trabajo, pero
  es la única forma de que el saldo no dependa de lo que mande el navegador.

---

## 2. Validar los pedidos al crearlos

**Lo que corre**, en `/pedidos/` y en `/orders/`:

```
allow create: if true;
```

Cualquiera puede crear un pedido con lo que sea. Es lo que permite que un
visitante sin cuenta compre, así que no está mal a propósito — pero tampoco
revisa nada.

**Lo que traía el repo:** exigir que el pedido venga con `cliente`, `correo`,
`telefono`, `items` y `total`; que el total sea un número mayor que cero; que
`items` sea una lista con al menos un elemento; y que el correo tenga más de 4
caracteres.

**Por qué no lo desplegué:** el checkout guarda un borrador antes de cobrar
(`bk_pending_order_id` en `CheckoutSteps.jsx`). Si ese borrador nace sin total, o
con el carrito todavía vacío, la regla lo rechazaría y el cobro se caería **en
producción, con el cliente ahí**. Hay que ver primero con qué campos exactos nace
ese borrador antes de apretar la regla.

Vale la pena hacerlo — es lo que impediría que entren pedidos a medias — pero
probándolo antes, no de una.

---

## Cómo mantener el archivo alineado

Netlify **no** despliega `firestore.rules`. Solo cambia si alguien corre
`firebase deploy --only firestore:rules` o lo pega en la consola de Firebase.

Fue justamente eso lo que hizo que el archivo se desviara: tenía cambios de mayo
y de agosto que nunca se desplegaron, y una advertencia que decía que desplegarlo
podía romper el checkout. **Esa advertencia era falsa** — se apoyaba en suponer
que `allow update: if isAdmin()` de `/pedidos/` no podía estar activo. Sí está
activo, y no rompe nada: `CheckoutSteps.jsx` atrapa el `permission-denied` y crea
un pedido nuevo en vez del borrador.
