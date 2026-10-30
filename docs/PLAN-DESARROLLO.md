# budget-app — Plan de desarrollo

Front-end del TP N.º 2 de Programación IV · UTN
Consume la API de `adavra-sales` (Rails 8, repo separado en `~/proyectos/budget`)

**Modalidad:** individual · **Entrega:** a partir del 11 de noviembre

---

## 1. Alcance

Portal del cliente de Adavra: el usuario final se autentica contra la API de Rails, consulta sus proyectos, aprueba o rechaza presupuestos, ve su estado de cuenta e informa pagos con comprobante.

El back-office de Rails **no se toca**: sigue siendo la interfaz administrativa. Son dos contextos separados, como en el TP 1.

Al ser trabajo individual, el punto 6 del enunciado —documentación completa del contrato de la API— **no es obligatorio**. Se reemplaza por una sección de endpoints en el README, que el punto 9.1 sí pide.

### Las seis pantallas

| Pantalla | Ruta | Endpoint principal |
|---|---|---|
| Login | `/login` | `POST /api/v1/login` |
| Mis proyectos | `/` | `GET /api/v1/projects` |
| Proyecto — detalle | `/projects/:id` | `GET /api/v1/projects/:id` |
| Presupuesto | `/budgets/:id` | `GET /api/v1/budgets/:id` + `approve` / `reject` |
| Estado de cuenta | `/account` | `GET /api/v1/account` |
| Informar pago | `/payments/new` | `POST /api/v1/payments` |

---

## 2. Stack y decisiones

| Decisión | Elección | Por qué |
|---|---|---|
| Base | React + Vite + TypeScript | Build rápido, sin SSR que no aporta en un portal 100% autenticado |
| Estilos | Tailwind CSS v4 | Vía `@tailwindcss/vite`, sin `tailwind.config.js` |
| Estado del servidor | **TanStack Query** | `isPending`, `isError`, `data` vacía y reintento salen de fábrica. El punto 4.5 exige exactamente esos estados en cada pantalla |
| Ruteo | React Router | Rutas protegidas por token |
| Tests | Vitest + Testing Library + MSW | Vitest viene con Vite; MSW simula la API, que el punto 5.2 permite |
| Token | `localStorage` | Simple y suficiente. Documentar en el README que es vulnerable a XSS y que en producción iría en cookie `httpOnly` |
| Formularios | React Hook Form + Zod | Opcional. Si el tiempo aprieta, validación a mano: son tres formularios |

### Estructura de carpetas

```
src/
├── api/
│   ├── client.ts          fetch con baseURL, token, parseo de errores
│   ├── auth.ts
│   ├── projects.ts
│   ├── budgets.ts
│   └── payments.ts
├── components/
│   ├── ui/                Button · Input · Card · Badge · Money · Spinner
│   └── states/            Loading · Empty · ErrorState   ← el punto 4.5 vive acá
├── hooks/
│   └── useAuth.ts
├── pages/
│   ├── Login.tsx
│   ├── Projects.tsx
│   ├── ProjectDetail.tsx
│   ├── Budget.tsx
│   ├── Account.tsx
│   └── ReportPayment.tsx
├── routes/
│   ├── AppRoutes.tsx
│   └── ProtectedRoute.tsx
├── lib/
│   └── format.ts          moneda ARS, fechas es-AR
└── main.tsx
```

Los tres componentes de `states/` se escriben **una vez** y se reutilizan en las seis pantallas. Es lo que hace que los cuatro estados exigidos salgan parejos sin repetir código.

---

## 3. Cronograma

| Etapa | Contenido | Fecha | Repo |
|---|---|---|---|
| **0** | Ajustes de la API y CORS | 31 oct | adavra-sales |
| **1** | Scaffold y cimientos | 1 nov | budget-app |
| **2** | Login integrado contra la API real | 2 nov | ambos |
| **3** | Flujos completos | 3–6 nov | budget-app |
| **4** | Estados de UX y accesibilidad | 7 nov | budget-app |
| **5** | Tests | 8 nov | ambos |
| **6** | Calidad y README | 9 nov | ambos |
| **7** | Deploy y colchón | 10 nov | ambos |

**Regla de supervivencia:** si algo se atrasa, se cae el deploy primero y el refinamiento visual después. Nunca los cuatro estados de UX ni los tests: están explícitos en los criterios de evaluación.

---

## 4. Etapa 0 — Ajustes de la API *(repo adavra-sales)*

Antes de escribir una línea de React. Si se saltea, la Etapa 3 se cae.

- [ ] Inventariar lo que existe: `bin/rails routes | grep api`
- [ ] Probar cada endpoint con `curl` y guardar la respuesta real
- [ ] **CORS** — el bloqueante número uno. El front corre en `localhost:5173` y Rails en `localhost:3000`:

```ruby
# Gemfile
gem "rack-cors"
```

```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")
    resource "/api/*",
      headers: :any,
      methods: [:get, :post, :patch, :put, :delete, :options]
  end
end
```

Nunca `origins "*"` en una API con token: Brakeman lo marca y tiene razón.

- [ ] **Formato de errores estable.** El punto 4.5 exige mostrar en cada campo el error que devuelve la API, así que tiene que venir mapeado por atributo:

```json
{ "errors": { "amount": ["debe ser mayor que cero"], "paid_on": ["no puede estar en blanco"] } }
```

- [ ] **Comprobante por multipart.** Verificar con `curl` que `POST /api/v1/payments` acepta `multipart/form-data` con el archivo adjunto:

```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -F "payment[amount]=15000" \
  -F "payment[paid_on]=2026-11-01" \
  -F "payment[receipt]=@comprobante.pdf"
```

- [ ] Confirmar que `GET /api/v1/account` devuelve lo que la pantalla necesita: deuda total, cuotas con saldo y estado, historial de pagos
- [ ] Escribir `docs/api.md` en el repo de Rails con los endpoints reales y un ejemplo de request y response por cada uno

---

## 5. Etapa 1 — Scaffold

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom @tanstack/react-query
npm install -D tailwindcss @tailwindcss/vite
npm install -D vitest @testing-library/react @testing-library/jest-dom \
               @testing-library/user-event jsdom msw
```

- [ ] Tailwind v4: plugin en `vite.config.ts` y `@import "tailwindcss";` en el CSS de entrada
- [ ] `.env` con `VITE_API_URL=http://localhost:3000/api/v1` y `.env.example` versionado, sin secretos (punto 9.1)
- [ ] `client.ts`: inyecta `Authorization: Bearer`, parsea el JSON de error al formato acordado, y ante un 401 limpia el token y redirige al login
- [ ] `QueryClientProvider` en `main.tsx`
- [ ] Componentes `Loading`, `Empty` y `ErrorState` — con reintento en el último
- [ ] Layout con navegación y botón de salir

---

## 6. Etapa 2 — Login integrado

El enunciado lo pide temprano (Etapa 3 de su organización sugerida) y tiene razón: es donde aparecen los problemas de integración.

- [ ] Formulario con validación de campos vacíos
- [ ] `POST /api/v1/login` real, guardar token, redirigir
- [ ] `ProtectedRoute` que rebota al login sin token
- [ ] Logout que limpia el token y la caché de Query
- [ ] **Probar los tres caminos:** credenciales válidas, credenciales inválidas (mostrar el error de la API, no uno inventado), y API caída (mensaje razonable, no pantalla en blanco)

Si esto funciona end-to-end, el resto es repetir el patrón.

---

## 7. Etapa 3 — Flujos completos

En orden de dependencia. Cada pantalla con sus cuatro estados desde el principio, no después.

- [ ] **Mis proyectos** — listado, estado de cada uno, aviso de presupuesto pendiente de aprobación
- [ ] **Proyecto detalle** — datos, estado, enlace al presupuesto vigente, documentación adjunta
- [ ] **Presupuesto** — ítems agrupados por módulo, total, y **aprobar / rechazar** con diálogo de confirmación. Es el flujo que persiste información que exige la demostración del punto 9.3
- [ ] **Estado de cuenta** — deuda total, cuotas pendientes, parciales y vencidas con días de atraso, historial de pagos
- [ ] **Informar pago** — monto, selección de cuotas a cubrir, carga del comprobante, aviso de que queda en revisión

Tras cada mutación, invalidar las queries afectadas para que la UI refleje el cambio sin recargar.

---

## 8. Etapa 4 — Estados de UX y accesibilidad

Media jornada que pesa en la nota: está en el punto 4.5 y repetido en los criterios de evaluación.

- [ ] Los cuatro estados en **todas** las pantallas: cargando, vacío, error con reintento, confirmación tras operar
- [ ] Errores de validación mostrados **en el campo que corresponde**
- [ ] Botón deshabilitado mientras la operación está en curso — evita el doble envío que pide el enunciado
- [ ] Navegación completa por teclado; `label` asociado a cada input; foco visible
- [ ] Responsive verificado a 375px de ancho
- [ ] Formato argentino de moneda y fechas en un único lugar (`lib/format.ts`)

---

## 9. Etapa 5 — Tests

**Front** — el mínimo del punto 5.2 son dos:

- [ ] Interacción relevante: el usuario aprueba un presupuesto y la UI refleja el nuevo estado
- [ ] Caso de error: la API devuelve 422 al informar un pago y el formulario muestra el mensaje en el campo

**Back** *(repo adavra-sales)* — punto 5.1:

- [ ] Los tests del TP 1 siguen pasando
- [ ] Tests de los endpoints agregados o modificados en la Etapa 0

---

## 10. Etapa 6 — Calidad y README

- [ ] `npm run build` sin errores ni warnings
- [ ] ESLint limpio
- [ ] `bin/rubocop` y `bin/brakeman` limpios en el repo de Rails
- [ ] **README en los dos repos**, con lo que exige el punto 9.1: temática, modalidad, framework elegido, autor del back-end original, instalación paso a paso de ambas partes, preparación de la base, credenciales de demostración (no reales), comandos de tests y linters, versiones usadas, y las URLs si hay deploy
- [ ] Cada README enlaza al otro

---

## 11. Etapa 7 — Deploy *(opcional, recomendado)*

- [ ] Front en Netlify o Vercel con `VITE_API_URL` apuntando al back publicado
- [ ] Agregar el origen del front a la configuración de CORS
- [ ] Verificar login y un flujo completo en producción

---

## 12. Riesgos

1. **CORS y el formato de errores.** Dos horas en la Etapa 0, o sabotean toda la Etapa 3.
2. **Hacer sólo el camino feliz.** Es la trampa clásica y acá está explícitamente penalizada. Una pantalla con `isPending` pero sin `isError` está a medio hacer.
3. **La carga del comprobante.** `multipart` + Active Storage + token es donde más gente se traba. Probarlo con `curl` antes de escribir el formulario.
4. **Dejar los tests para el final.** Son dos tests y media jornada, pero si quedan para el 10 de noviembre no se hacen.
