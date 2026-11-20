# Pendientes de integración y publicación

## API en Render

- [x] Configurar `FRONTEND_ORIGIN=https://budget-app.miramallo.workers.dev` en Render.
- [x] Habilitar CORS en la API desplegada. Los preflight del login JSON y del listado de proyectos con Bearer devuelven `200` para Cloudflare. Un origen ajeno no recibe `Access-Control-Allow-Origin`.
- [x] Publicar Rails en Render y comprobar [el endpoint de salud](https://adavra-sales.onrender.com/up).
- [ ] Verificar que el bucket de Active Storage conserva los comprobantes y permite descargarlos después de reiniciar el servicio.

Para volver a comprobar el preflight del login, ejecutá:

```sh
curl -i -X OPTIONS 'https://adavra-sales.onrender.com/api/v1/login' \
  -H 'Origin: https://budget-app.miramallo.workers.dev' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Debe devolver `2xx` y `Access-Control-Allow-Origin: https://budget-app.miramallo.workers.dev`.

## Frontend en Cloudflare

- [x] Preparar el build para Cloudflare y configurar Workers Static Assets en modo SPA.
- [x] Publicar el frontend y comprobar el acceso directo a [la pantalla de login](https://budget-app.miramallo.workers.dev/login).
- [x] Configurar `VITE_API_URL=https://adavra-sales.onrender.com/api/v1` en el build de Cloudflare.
- [x] Verificar que la ruta pública `/account` sirve el HTML de la app.
- [x] Verificar la recarga y el acceso directo a `/account` con una sesión iniciada.
- [x] Repetir la demo en el entorno publicado: login, aprobación de presupuesto con recarga, un caso de error y carga de comprobante.

## Contrato y entrega

- [x] Documentar las operaciones que usa el portal en el [contrato de la API](CONTRATO-API.md).
- [x] Documentar instalación, datos de demo, pruebas y pasos de publicación en el [README](../README.md).
- [x] Registrar las URLs públicas del frontend y de la API en el [README](../README.md#publicar).
