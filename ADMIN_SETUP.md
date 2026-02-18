# Configuración de Usuario Administrador - BiKitchen

## Pasos para crear un usuario administrador

### 1. Crear usuario en Firebase Authentication

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona el proyecto `bikitchen-app`
3. Ve a **Authentication** > **Users**
4. Haz clic en **Add user**
5. Ingresa el email y contraseña del administrador
6. Copia el **User UID** que se genera

### 2. Crear documento en Firestore

1. Ve a **Firestore Database**
2. Crea una colección llamada `users` (si no existe)
3. Crea un documento con el **User UID** como ID del documento
4. Agrega los siguientes campos:
   ```
   {
     "email": "admin@bikitchen.com",
     "role": "admin",
     "name": "Administrador",
     "createdAt": [timestamp actual]
   }
   ```

### 3. Acceder al panel de administración

1. Ve a `/admin/login`
2. Ingresa las credenciales del usuario creado
3. Si el rol es `admin`, tendrás acceso al panel

## Notas importantes

- Solo los usuarios con `role: "admin"` en Firestore pueden acceder al panel de administración
- El botón "Admin" en el navbar solo aparece para usuarios autenticados con rol de admin
- Para agregar más administradores, repite los pasos 1 y 2

## Estructura de la colección `users`

```javascript
users/
  {userId}/
    email: string
    role: "admin" | "user"
    name: string
    createdAt: timestamp
```
