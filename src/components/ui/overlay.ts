/**
 * Estilo compartido de las capas modales del sistema.
 *
 * Todas las ventanas flotantes (diálogos y paneles laterales) usan la misma
 * capa: el listado de fondo debe seguir viéndose. Antes cada modal definía su
 * propio fondo y unos quedaban casi opacos.
 */
export const OVERLAY_CLASS =
  'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0';
