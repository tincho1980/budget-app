# Pendientes de integración y publicación

## API en Render

- [ ] **Habilitar CORS para el portal.** Limitarlo a `/api/v1`. Configurar en Render el origen HTTPS exacto de Cloudflare con `FRONTEND_ORIGIN`, sin ruta ni barra final. Permitir `GET`, `POST`, `DELETE` y `OPTIONS`, con los encabezados `Authorization` y `Content-Type`.
- [ ] Verificar que el preflight del origen habilitado funciona sin token y que un origen ajeno no recibe permiso. Desde el portal publicado, comprobar login JSON, una consulta con Bearer y un informe de pago con comprobante multipart.
- [x] Publicar Rails en Render y comprobar [el endpoint de salud](https://adavra-sales.onrender.com/up).
- [ ] Verificar que el bucket de Active Storage conserva los comprobantes y permite descargarlos después de reiniciar el servicio.

## Frontend en Cloudflare

- [x] Preparar el build para Cloudflare y configurar Workers Static Assets en modo SPA.
- [ ] Publicar el `dist` con la [guía del README](../README.md#frontend-en-cloudflare). Verificar la recarga y el acceso directo a rutas como `/account`.
- [ ] Configurar `VITE_API_URL=https://adavra-sales.onrender.com/api/v1` en el build de Cloudflare.
- [ ] Repetir la demo en el entorno publicado: login, aprobación de presupuesto con recarga, un caso de error y carga de comprobante.

## Contrato y entrega

- [x] Documentar las operaciones que usa el portal en el [contrato de la API](CONTRATO-API.md).
- [x] Documentar instalación, datos de demo, pruebas y pasos de publicación en el [README](../README.md).
- [ ] Agregar al README la URL pública definitiva del frontend. La URL de la API ya está documentada.
