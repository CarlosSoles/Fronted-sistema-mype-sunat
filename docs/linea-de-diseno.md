# Línea de Diseño y Tokens del Frontend (TA-23)

**Proyecto:** SYNC-SUNAT — Frontend Web

**Stack visual oficial:** Tailwind CSS v4 + shadcn/ui

**Fuente de tokens:** [`src/index.css`](../src/index.css)

Los componentes reutilizables de `src/components/ui/` consumen los tokens del tema. Las páginas no deben definir CSS, estilos inline ni clases visuales propias; consulta la [norma TA-23](../specs/Plan.md#33-regla-de-una-única-fuente-de-ui-normativa-ta-23).

## Tipografía

La fuente global es **Geist Variable**, importada con `@fontsource-variable/geist` y expuesta como `--font-sans` en `@theme inline`.

| Clase Tailwind | Uso recomendado |
|---|---|
| `text-xs` | Metadatos, badges y texto auxiliar |
| `text-sm` | Texto de controles, tablas y descripciones |
| `text-base` | Texto de lectura |
| `text-lg` | Títulos de tarjetas y diálogos |
| `text-xl` / `text-2xl` | Métricas y títulos de página |

Pesos disponibles: `font-normal`, `font-medium`, `font-semibold` y `font-bold`.

## Colores semánticos

Los valores se declaran en `:root` para tema claro y `.dark` para tema oscuro. Tailwind los expone como utilidades, por ejemplo `bg-background`, `text-foreground`, `bg-card` y `ring-ring`.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Fondo de la aplicación |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texto principal |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Superficies elevadas |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` | Acción primaria |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Acción secundaria |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Texto de apoyo |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Error o acción destructiva |
| `--border` / `--input` | `oklch(0.922 0 0)` | alpha blanco de 10% / 15% | Bordes y controles |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` | Indicador de foco |

Los componentes `Alert` y `Badge` ofrecen variantes semánticas `default`, `info`, `success`, `warning` y `destructive` cuando corresponde.

## Espaciado

Utilizar la escala modular de Tailwind, basada en incrementos de `0.25rem` (4 px): `gap-1`/`p-1` (4 px), `gap-2`/`p-2` (8 px), `gap-3`/`p-3` (12 px), `gap-4`/`p-4` (16 px) y `gap-6`/`p-6` (24 px). Preferir los componentes de composición de `@/components/ui` en lugar de definir espaciado en cada pantalla.

## Radios

El token base es `--radius: 0.625rem` (10 px). En `@theme inline` se derivan `--radius-sm` (0.6 × base), `--radius-md` (0.8 × base), `--radius-lg` (base) y `--radius-xl` a `--radius-4xl`. Las píldoras usan radio completo.

## Cinco estados interactivos

La biblioteca debe mantener los siguientes estados coherentes. El soporte de clases se comprueba en los componentes y con las pruebas unitarias; el contraste debe medirse con los colores renderizados antes de declarar conformidad WCAG.

1. **Normal:** superficie y texto con tokens semánticos (`bg-*`, `text-*`, `border-*`).
2. **Hover:** realimentación visual con variantes `hover:*` del componente.
3. **Focus:** foco de teclado visible, por ejemplo `focus-visible:ring-3 focus-visible:ring-ring/50`.
4. **Disabled:** control desactivado y no interactivo, por ejemplo `disabled:pointer-events-none disabled:opacity-50`.
5. **Error:** comunicar error con `aria-invalid`, borde/anillo destructivo y mensaje asociado mediante `aria-describedby` o `FormMessage`.

Esta especificación describe el sistema visual; una auditoría Lighthouse sobre el sitio publicado y una evaluación WCAG requieren pruebas sobre la versión desplegada.
