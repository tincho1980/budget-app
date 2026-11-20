# Adavra · Portal del cliente

Trabajo Práctico N.º 2 de Programación IV (UTN), modalidad individual. El portal permite consultar proyectos, revisar y decidir presupuestos, consultar el estado de cuenta e informar pagos. El back-office administrativo sigue en Rails.

- Frontend: [tincho1980/budget-app en `develop`](https://github.com/tincho1980/budget-app/tree/develop), con React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7 y TanStack Query 5.
- Backend del TP1: [tincho1980/budget-api en `develop`](https://github.com/tincho1980/budget-api/tree/develop), desarrollado por `tincho1980` con Ruby on Rails 8.1 y PostgreSQL.
- [Contrato de la API](docs/CONTRATO-API.md) · [Pendientes de publicación](docs/PENDIENTES.md).

## Ejecutar en local

Usá Node.js **22.20.0** y pnpm **11.4.0** para el frontend. Wrangler **4.164.0** se instala con el resto de las dependencias. Rails requiere Ruby **3.4.10**, Bundler y PostgreSQL **14 o posterior**. En Windows, ejecutá Rails en WSL y el frontend en PowerShell. En Linux o macOS podés usar dos terminales en el mismo entorno.

### 1. Rails

En la carpeta de la API, usá una rama que contenga el portal, como `develop`. En Ubuntu puede hacer falta `libpq-dev`. Con PostgreSQL iniciado y configurado según el [README de Rails](https://github.com/tincho1980/budget-api/blob/develop/README.md):

```sh
bundle install
bin/rails db:prepare
bin/dev
```

`db:prepare` crea las bases y carga los datos de demo en una instalación nueva. `bin/dev` levanta Rails, los estilos del back-office y la cola de jobs. Para probar solo el portal también podés levantar Rails con `bin/rails server -b 127.0.0.1 -p 3000`. La comprobación de salud está en `http://127.0.0.1:3000/up`.

### 2. Frontend

En la carpeta de este repositorio:

```sh
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --strictPort
```

Abrí `http://127.0.0.1:5173`. En local, el frontend usa `/api/v1` y Vite lo reenvía a Rails en el puerto 3000. Si querés configurar otra URL, usá [.env.example](.env.example) como base para `.env`.

### 3. Datos de demo

Las siguientes cuentas pertenecen a los datos de ejemplo de **desarrollo** y usan la clave `password`.

| Cuenta | Para probar |
|---|---|
| `portal@clubsocial.com.ar` | Proyecto con un presupuesto enviado para decidir. |
| `portal@ferreteriael.com.ar` | Cuotas vencidas, historial e informe de pago con comprobante. |
| `portal@estudiocontable.com.ar` | Una cuota con saldo parcial. |
| `portal@panaderiala.com.ar` | Cuenta sin cuotas impagas. |
| `admin@adavra.com` | Back-office en `http://127.0.0.1:3000/admin`; puede confirmar pagos. |

Para la demo, probá primero un login inválido. Después ingresá como Club Social, aprobá un presupuesto y recargá para comprobar que el estado persiste. Si ese presupuesto ya fue decidido, enviá uno de otro proyecto desde el back-office. Con la cuenta de la ferretería, informá un pago y verificá que queda **En revisión** sin descontarse todavía de la deuda.

## Pruebas y calidad

Frontend:

```sh
pnpm test
pnpm run lint
pnpm run build
```

Backend, desde `budget-api`:

```sh
bin/rails test
bin/rubocop
bin/brakeman
```

Rails verifica el token Bearer y el acceso a los datos de cada cliente. El frontend guarda el token en `localStorage` para conservar la sesión al recargar. Como JavaScript puede leer ese almacenamiento, una versión de producción debería evaluar una sesión con cookie `HttpOnly` y los cambios de seguridad correspondientes en Rails.

## Publicar

### API en Render con Neon

El backend está publicado en [Render](https://adavra-sales.onrender.com/up). La URL base de la API es `https://adavra-sales.onrender.com/api/v1`.

Si necesitás recrear el servicio, seguí el [Blueprint y la guía de Render del backend](https://github.com/tincho1980/budget-api/blob/develop/README.md#deploy-en-render). El Blueprint usa dos conexiones directas a Neon (`DATABASE_URL` y `QUEUE_DATABASE_URL`) y un bucket compatible con S3 para Active Storage. Si cargás datos de demo en el entorno publicado, configurá allí una `SEED_PASSWORD` propia.

Rails autoriza por CORS el origen del portal de Cloudflare, configurado en Render con `FRONTEND_ORIGIN=https://budget-app.miramallo.workers.dev`. El [comando de prueba](docs/PENDIENTES.md#api-en-render) permite verificar que la API sigue aceptando ese origen.

### Frontend en Cloudflare

El portal está publicado en [Cloudflare](https://budget-app.miramallo.workers.dev/login).

[`wrangler.jsonc`](wrangler.jsonc) sirve `dist` con Workers Static Assets en [modo SPA](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/). Esto permite abrir o recargar rutas como `/account` y `/budgets/63` directamente. `VITE_API_URL` va en el entorno de **compilación** y debe apuntar a la URL HTTPS de Render terminada en `/api/v1`. Es una URL pública; guardá los secretos del backend en Render.

Para publicar desde PowerShell:

```powershell
$env:VITE_API_URL = 'https://adavra-sales.onrender.com/api/v1'
pnpm run deploy:check
pnpm exec wrangler login
pnpm run deploy
```

En Bash, usá `export VITE_API_URL='https://adavra-sales.onrender.com/api/v1'` en lugar de la primera línea. `deploy:check` comprueba el empaquetado local y `deploy` publica la versión.

Si preferís [Workers Builds desde GitHub](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), conectá este repo y seleccioná la rama que contiene el portal. Configurá `pnpm run build:cloudflare` como comando de build, `pnpm exec wrangler deploy` como comando de deploy y `VITE_API_URL` en las variables del build.

Para validar la entrega, verificá el login desde Cloudflare, la apertura directa de una ruta privada, la persistencia de una decisión sobre un presupuesto y el envío y descarga de un comprobante.
