# Sistema de diseño — Portal del cliente

Derivado de la identidad de **adavra.com**. Los valores salen de los estilos computados del sitio, no de una aproximación visual.

---

## Paleta

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#09090C` | Fondo de la aplicación |
| `--surface` | `#131419` | Cards, paneles, filas de tabla |
| `--surface-hover` | `#1A1B21` | Hover sobre superficies |
| `--border` | `rgba(255,255,255,0.10)` | Bordes de card y separadores |
| `--border-strong` | `rgba(255,255,255,0.18)` | Bordes de input y foco |
| `--primary` | `#0047AB` | Botón primario, enlaces de acción |
| `--primary-hover` | `#0055CC` | Hover del primario |
| `--accent` | `#2E7FD9` | Texto destacado, iconos activos |
| `--text` | `#FFFFFF` | Títulos y texto principal |
| `--text-muted` | `#C7CBD6` | Texto secundario y labels |
| `--text-subtle` | `#8A8F9C` | Metadatos, placeholders |

### Colores semánticos — estados de cuota

Pensados para leerse sobre fondo oscuro. Fondo translúcido del color, texto en el tono claro.

| Estado | Fondo del badge | Texto |
|---|---|---|
| Pendiente | `rgba(245,158,11,0.15)` | `#FCD34D` |
| Parcial | `rgba(46,127,217,0.15)` | `#7FB3EA` |
| Pagada | `rgba(34,197,94,0.15)` | `#6EE7A0` |
| Vencida | `rgba(239,68,68,0.15)` | `#FCA5A5` |

Los mismos cuatro sirven para el estado del presupuesto: borrador, enviado, aprobado, rechazado.

> **No codificar el estado sólo con color.** Cada badge lleva su texto. Es accesibilidad básica y el punto 4.5 pide controles comprensibles.

---

## Tipografía

**Geist** (y **Geist Mono** para montos y períodos). Es la que usa adavra.com. Está en Google Fonts.

| Rol | Tamaño | Peso | Tracking |
|---|---|---|---|
| Título de pantalla | 32 px | 600 | −0.025em |
| Título de sección | 20 px | 600 | −0.015em |
| Título de card | 16 px | 600 | normal |
| Cuerpo | 14 px | 400 | normal |
| Metadato / label | 13 px | 400 | normal |
| Overline | 12 px | 500 | 0.12em, mayúsculas |

Los montos van en **Geist Mono** con tabular numbers, alineados a la derecha. Una columna de pesos que no alinea se lee mal y es el detalle que distingue una tabla financiera prolija de una improvisada.

---

## Forma y espaciado

- **Radio**: 8 px en botones e inputs · 16 px en cards. Son los valores del sitio.
- **Escala de espaciado**: 4 · 8 · 12 · 16 · 24 · 32 · 48 px.
- **Card**: `padding: 24px`, fondo `--surface`, borde `--border`, radio 16 px.
- **Ancho máximo de contenido**: 1120 px, centrado.

### Botones

| Variante | Fondo | Texto | Borde |
|---|---|---|---|
| Primario | `--primary` | blanco | ninguno |
| Secundario | transparente | blanco | `--border-strong` |
| Peligro | `rgba(239,68,68,0.12)` | `#FCA5A5` | `rgba(239,68,68,0.3)` |
| Fantasma | transparente | `--text-muted` | ninguno |

Todos: radio 8 px, padding `12px 20px`, peso 600.

**Estado ocupado**: opacidad 0.6, cursor `not-allowed`, spinner a la izquierda del texto, y `disabled` real. Es lo que cumple el requisito de evitar envíos repetidos.

---

## Tailwind v4

```css
@import "tailwindcss";

@theme {
  --color-bg: #09090C;
  --color-surface: #131419;
  --color-surface-hover: #1A1B21;
  --color-border-subtle: rgb(255 255 255 / 0.10);
  --color-border-strong: rgb(255 255 255 / 0.18);

  --color-primary: #0047AB;
  --color-primary-hover: #0055CC;
  --color-accent: #2E7FD9;

  --color-text: #FFFFFF;
  --color-text-muted: #C7CBD6;
  --color-text-subtle: #8A8F9C;

  --color-state-pending: #FCD34D;
  --color-state-partial: #7FB3EA;
  --color-state-paid: #6EE7A0;
  --color-state-overdue: #FCA5A5;

  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;

  --radius-control: 8px;
  --radius-card: 16px;
}
```

---

## Decisión pendiente de confirmar: tema oscuro

El portal va en **oscuro**, igual que adavra.com. Es coherente con la marca y es lo que pediste como referencia.

La contra honesta: el estado de cuenta es una tabla de montos, vencimientos y moras, y las tablas financieras tradicionalmente se leen en claro. Con buen contraste el oscuro funciona —Linear, Vercel y Railway lo hacen— pero exige más cuidado en los badges de estado y en la alineación de las cifras, que es justo lo que resuelven las dos secciones de arriba.

Si preferís el portal en claro, se invierten `--bg` y `--surface`, se oscurecen los textos y la paleta de marca se mantiene en el primario y el acento. Es media hora de cambio en los tokens, no un rediseño.
