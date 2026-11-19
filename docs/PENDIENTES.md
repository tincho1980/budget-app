# Pendientes de integración y publicación

## API en Render

- [ ] **Habilitar CORS para el portal.** Limitarlo a `/api/v1`. Configurar en Render el origen HTTPS exacto de Cloudflare con `FRONTEND_ORIGIN`, sin ruta ni barra final. Permitir `GET`, `POST`, `DELETE` y `OPTIONS`, con los encabezados `Authorization` y `Content-Type`.
- [ ] Verificar que el preflight del origen habilitado funciona sin token y que un origen ajeno no recibe permiso. Desde el portal publicado, comprobar login JSON, una consulta con Bearer y un informe de pago con comprobante multipart.
- [ ] Publicar la rama de Rails que incluya la API del portal y la configuración de Render. Completar las variables del Blueprint para Rails, las conexiones de PostgreSQL en Neon y el bucket de Active Storage (R2 u otro compatible con S3).
- [ ] Comprobar `/up`, el acceso con usuarios de demo y la descarga de un comprobante después de reiniciar el servicio.

## Frontend en Cloudflare

- [ ] Publicar el `dist` de Vite con Cloudflare Workers Static Assets en modo SPA. Verificar que funcionan la recarga y el acceso directo a rutas como `/account`.
- [ ] Configurar `VITE_API_URL` en el build con la URL HTTPS de Render, terminada en `/api/v1`. El proxy de Vite se usa solo en desarrollo y apunta a Rails en `127.0.0.1:3000`.
- [ ] Repetir la demo en el entorno publicado: login, aprobación de presupuesto con recarga, un caso de error y carga de comprobante.

## Contrato y entrega

- [ ] Completar el contrato de los endpoints a medida que se conectan. Registrar métodos, rutas, autenticación, campos, estados HTTP y ejemplos reales de éxito y error. Reutilizar el README y la colección de Postman de [`budget-api`](https://github.com/tincho1980/budget-api/blob/develop/README.md#api-v1).
- [ ] Documentar en el README del frontend cómo levantar ambos proyectos, usar los datos de demo, ejecutar las pruebas y acceder al deploy. Mantener las variables de ejemplo sin secretos.
