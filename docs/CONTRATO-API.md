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

## Presupuestos

| Método y ruta | Autenticación | Entrada | Respuesta |
|---|---|---|---|
| `GET /budgets/:id` | Bearer | `id` del presupuesto en la ruta. | `200` con `{ "budget": { ... } }`. |
| `POST /budgets/:id/approve` | Bearer | `id` en la ruta, sin cuerpo. | `200` con el presupuesto actualizado a `approved`. |
| `POST /budgets/:id/reject` | Bearer | `id` en la ruta, sin cuerpo. | `200` con el presupuesto actualizado a `rejected`. |

Los tres endpoints devuelven `404` si el presupuesto no existe, es interno (`draft`) o pertenece a otro cliente. Las decisiones se aceptan únicamente desde `sent`. Un `422` incluye el motivo en `error.details`. Un proyecto solo puede tener un presupuesto aprobado.

Ejemplo de respuesta `200` de `GET /budgets/20` antes de decidir:

```json
{
  "budget": {
    "id": 20,
    "version": 2,
    "status": "sent",
    "sent_at": "2026-10-24T12:00:00Z",
    "approved_at": null,
    "notes": null,
    "total": "4800000.00",
    "signed_document_url": null,
    "project": { "id": 12, "name": "Sitio institucional" },
    "estimated_hours": "3.50",
    "modules": [
      { "name": "Diseño", "items": [{ "description": "Sistema visual", "estimated_hours": "3.50" }] }
    ]
  }
}
```

`total` y `estimated_hours` son strings decimales. Las fechas usan el formato ISO 8601 o `null`. `notes` y `signed_document_url` también pueden ser `null`. La API entrega las tareas facturables agrupadas por módulo, con horas estimadas. La aprobación rellena `approved_at`; el rechazo deja ese campo en `null`.

Ejemplo de error `422` al intentar decidir un presupuesto que ya cambió de estado:

```json
{
  "error": {
    "status": 422,
    "message": "No se pudo registrar la decisión.",
    "details": ["Sólo se puede aprobar o rechazar un presupuesto enviado."]
  }
}
```

## Estado de cuenta

`GET /account` requiere Bearer y no recibe parámetros. Devuelve `200` con `{ "account": { ... } }` para el cliente autenticado, o `401` si el token falta o ya no es válido.

- `client` contiene `id`, `business_name` y `tax_id`.
- `debt` es la suma de los saldos impagos, como string decimal en ARS. `overdue_charges` cuenta las cuotas con estado `overdue`.
- `unpaid_charges` lista cuotas con saldo, ordenadas por `due_on` de menor a mayor. Cada cuota expone `id`, `period` (`YYYY-MM`), `due_on` (`YYYY-MM-DD`), `status`, `amount`, `paid_amount`, `balance` y `days_overdue`. Los importes son strings decimales. La API solo informa días de atraso para cuotas con estado `overdue`.
- `recent_payments` lista hasta cinco pagos, del más reciente al más antiguo según `paid_on`. Cada pago incluye `id`, `paid_on`, `amount`, `payment_method` (`transfer`, `cash`, `check`), `status` (`pending_review`, `confirmed`, `rejected`), `notes`, `created_at` y `receipt`. El comprobante puede ser `null` o incluir `filename`, `content_type`, `byte_size` y `url`. Los pagos en revisión todavía no se imputan al saldo.

Respuesta `200` de ejemplo:

```json
{
  "account": {
    "client": { "id": 21, "business_name": "Cliente de demo", "tax_id": "30-12345678-0" },
    "debt": "100000.00",
    "overdue_charges": 1,
    "unpaid_charges": [
      { "id": 12, "period": "2026-10", "due_on": "2026-10-21", "status": "overdue", "amount": "100000.00", "paid_amount": "0.00", "balance": "100000.00", "days_overdue": 29 }
    ],
    "recent_payments": [
      { "id": 5, "paid_on": "2026-11-14", "amount": "40000.00", "payment_method": "transfer", "status": "pending_review", "notes": null, "created_at": "2026-11-14T12:00:00Z", "receipt": null }
    ]
  }
}
```

Si el cliente no tiene cuotas impagas, `debt` es `"0.00"` y `unpaid_charges` está vacío. `recent_payments` puede tener datos en ese caso.

## Informar pago

`POST /payments` requiere Bearer. Recibe los campos al nivel raíz en JSON o `multipart/form-data`. El portal usa multipart si hay un comprobante y JSON si no lo hay. El navegador genera el encabezado `Content-Type` con el límite entre partes del formulario multipart.

| Campo | Tipo y validación |
|---|---|
| `amount` | Obligatorio. String decimal en ARS, mayor que cero y con hasta dos decimales. El portal admite coma o punto y envía punto como separador. |
| `paid_on` | Obligatorio. Fecha en formato `YYYY-MM-DD`. |
| `payment_method` | Obligatorio. `transfer`, `cash` o `check`. |
| `notes` | String opcional. |
| `receipt` | Archivo opcional en multipart. PDF, JPG o PNG de hasta 5 MB. Rails verifica el tipo de archivo. |

Ejemplo de solicitud JSON:

```json
{ "amount": "15000.50", "paid_on": "2026-11-19", "payment_method": "transfer" }
```

Respuesta `201` de ejemplo:

```json
{
  "payment": {
    "id": 39, "amount": "15000.50", "paid_on": "2026-11-19", "payment_method": "transfer",
    "status": "pending_review", "notes": null, "created_at": "2026-11-19T11:00:00Z", "receipt": null
  }
}
```

Un pago informado queda en `pending_review`. El saldo no cambia hasta que un administrador lo confirma, momento en que Rails aplica el pago a las cuotas impagas más antiguas. Si se adjuntó un archivo, `receipt` devuelve sus metadatos y la URL de descarga, igual que en `GET /account`.

Un token ausente o inválido da `401`. Ejemplo de validación `422` para un adjunto de tipo incorrecto:

```json
{ "error": { "status": 422, "message": "No se pudo guardar.", "details": ["Comprobante debe ser PDF, JPG o PNG"] } }
```

## Errores

Rails devuelve un objeto `error` con `status` (número), `message` (texto) y `details` (lista de mensajes, opcional). Ejemplo de `404`:

```json
{ "error": { "status": 404, "message": "Recurso no encontrado." } }
```
