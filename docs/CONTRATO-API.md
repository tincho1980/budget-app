# Contrato de la API del portal

Esta guía cubre las operaciones que ya consume el frontend. La [documentación de Rails](https://github.com/tincho1980/budget-api/blob/develop/README.md#api-v1) describe el resto de la API y enlaza la colección de Postman.

En desarrollo, el navegador usa `/api/v1` a través del proxy de Vite y Rails escucha en `http://localhost:3000`. En producción, `VITE_API_URL` contiene la URL HTTPS de Render seguida de `/api/v1`. Las solicitudes protegidas llevan `Authorization: Bearer <token>` y las que envían JSON llevan `Content-Type: application/json`.

## Sesión

| Método y ruta | Autenticación | Entrada | Respuesta |
|---|---|---|---|
| `POST /login` | Pública, solo admite usuarios con rol cliente | `email_address` y `password`, ambos strings obligatorios. | `201` con `token`, `token_type: "Bearer"`, `user` y `client`. |
| `DELETE /logout` | Bearer | Sin parámetros ni cuerpo. | `204` sin cuerpo. El token enviado deja de ser válido. |

Ejemplo de `POST /login` con los datos de demo locales:

```json
{ "email_address": "portal@clubsocial.com.ar", "password": "password" }
```

Respuesta `201` de ejemplo:

```json
{
  "token": "<token>",
  "token_type": "Bearer",
  "user": { "id": 35, "name": "Usuario de demo", "email_address": "portal@clubsocial.com.ar" },
  "client": { "id": 21, "business_name": "Club Social" }
}
```

El login devuelve `401` con el mensaje «Email o contraseña incorrectos.» ante un usuario o una contraseña inválidos y `429` al superar el límite de intentos. El logout devuelve `401` ante un token ausente o inválido.

## Proyectos

| Método y ruta | Autenticación | Entrada | Respuesta |
|---|---|---|---|
| `GET /projects` | Bearer | Sin parámetros. | `200` con `{ "projects": [...] }`. Un cliente sin proyectos recibe un array vacío. |
| `GET /projects/:id` | Bearer | `id` del proyecto en la ruta. | `200` con `{ "project": { ... } }`, incluido el array `budgets` de versiones visibles. Devuelve `404` si el proyecto no existe o pertenece a otro cliente. |

Cada proyecto incluye `id` numérico, `name`, `description`, `status`, `started_on`, `closed_on` y `current_budget`. La descripción puede ser `null`. Las fechas usan `YYYY-MM-DD` o `null`. Los estados posibles son `survey`, `in_progress`, `delivered` y `closed`.

`current_budget` es la versión visible más reciente y puede ser `null`. Incluye `id`, `version`, `status`, `total` y `pending_approval` (booleano). Cada entrada de `budgets` tiene los mismos campos salvo `pending_approval`. Los estados visibles son `sent`, `approved` y `rejected`. `total` es un string decimal con dos decimales, en ARS.

Respuesta `200` de ejemplo para `GET /projects/12`:

```json
{
  "project": {
    "id": 12,
    "name": "Sitio institucional",
    "description": "Rediseño del sitio del club",
    "status": "in_progress",
    "started_on": "2026-03-12",
    "closed_on": null,
    "current_budget": { "id": 20, "version": 2, "status": "sent", "total": "4800000.00", "pending_approval": true },
    "budgets": [
      { "id": 19, "version": 1, "status": "rejected", "total": "4400000.00" },
      { "id": 20, "version": 2, "status": "sent", "total": "4800000.00" }
    ]
  }
}
```

## Errores

Rails devuelve un objeto `error` con `status` (número), `message` (texto) y `details` (lista de mensajes, opcional). Ejemplo de `404`:

```json
{ "error": { "status": 404, "message": "Recurso no encontrado." } }
```
