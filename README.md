# Jornada · horarios, horas y nómina de la cafetería

Proyecto React + TypeScript (Vite) generado a partir del diseño validado (fase 1 y 2).
Los datos viven en PostgreSQL a través de la API de [`../jornada-backend`](../jornada-backend) (Node + Express + Sequelize).

## Arrancar

```bash
# 1. API (ver ../jornada-backend/README.md)
cd ../jornada-backend && npm install && npm run db:up && npm run db:migrate && npm run db:seed && npm run dev

# 2. Frontend
cd ../jornada-react && npm install && npm run dev
```

En desarrollo Vite redirige `/api` a `http://localhost:3000` (`vite.config.ts`). En producción, define `VITE_API_URL` al hacer el build (ver `.env.example`).
Para volver a los datos de ejemplo: `npm run db:reset` en el backend.

```bash
npm test   # Vitest
```

## Qué funciona

- **Horario · Semana**: cuadrícula lunes–domingo × empleadas, totales por fila y por día, navegación entre semanas con transición.
  - Arrastrar un turno a otro día/empleada (dnd-kit) · **Alt + arrastrar** duplica · arrastrar plantillas desde el panel.
  - Clic en un turno → editor (horas exactas, turno partido de 2 tramos, eliminar). Clic en «DESCANSO» → nuevo turno.
  - Avisos no bloqueantes calculados en vivo (`src/lib/rules.ts`): franja sin nadie, mínimo de personas, máx. h/día y h/semana, día libre, 2 descansos seguidos.
  - Copiar semana anterior (solo rellena huecos), Publicar / Borrador, Imprimir/PDF, exportar CSV para Excel.
- **Horario · Día**: línea de tiempo 06:00–21:00, **estirar bordes** para cambiar la duración (ajuste a 5 min; Alt al minuto), tira de cobertura.
- **Registro de horas**: prellenado con lo planificado, edición en línea (Tab / Enter confirma), diferencias, notas, confirmar fila o día. Vistas día / semana / mes y filtro por empleada.
- **Nómina**: horas × tarifa + recargos de domingo/festivo, Valentina excluida, comparativa con el mes anterior, marcar como pagado (congela las líneas) e histórico, CSV.
- **Inicio**: indicadores, quién trabaja hoy, barras, coste de 8 semanas, donut y mapa de calor de cobertura.
- **Equipo**: crear, editar (color de una paleta de 10 validada AA), eliminar (borrado lógico) o marcar inactiva.
- **Ajustes**: plantillas, reglas de aviso, recargos, festivos y tema claro/oscuro.
- **Deshacer**: cada cambio muestra un toast con «Deshacer» (Sonner) y también funciona **Ctrl/⌘ + Z**.
- **Móvil**: barra inferior y vista Día en lista en el horario.

## Estructura

```
src/
  lib/types.ts      Modelo (Empleada, Plantilla, Turno, Registro, PeriodoPago, Reglas…)
  lib/api.ts        Cliente HTTP de la API (errores con el detalle del campo)
  lib/sync.ts       Diferencia entre estados → lote para POST /api/sync («Deshacer»)
  lib/rules.ts      Cobertura, avisos, cálculo real-vs-planificado, importes
  lib/theme.ts      Tokens claro/oscuro y paleta de empleadas (fuente única)
  lib/time.ts       Minutos ↔ HH:MM, duraciones, euros, date-fns en español
  store.tsx         Estado global sincronizado con la API: cambios optimistas en cola ordenada,
                    resincronización si algo falla y deshacer contra el servidor
  components/       UI básica, barra lateral, selector de semana, chip, editor de turno
  pages/            Inicio, Horario (+ DayTimeline), Registro, Nómina, Equipo, Ajustes
design-reference/   Los diseños HTML originales (abrir en el navegador)
```

## Convenciones

- Horas: `fecha` (YYYY-MM-DD) + minutos desde las 00:00 (`400` = 06:40). Sin zonas horarias en los datos.
- Dinero: céntimos enteros (`1000` = 10,00 €). Formato con `eur()`.
- Colores de empleada: el contenedor recibe `style={colorVars(color)}` y los hijos usan `bg-c-tint`, `text-c-fg`, `border-c-line`, `bg-c-solid`.
- Semana empieza en lunes; formato 24 h; idioma `es`.

## Pendiente / siguientes pasos

1. ~~**Backend**~~ hecho en `../jornada-backend` (Express + Sequelize + PostgreSQL), con la misma interfaz de `acciones`. Falta la **autenticación** del encargado antes de publicarlo.
2. **shadcn/ui**: los componentes de `components/ui.tsx` son equivalentes ligeros; se pueden cambiar por `Button`, `Dialog`, `Switch`, `Tabs`… de shadcn sin tocar las páginas.
3. **Exportación rica**: ExcelJS (con colores de celda) y `@react-pdf/renderer` para la nómina; `html-to-image` para compartir el horario por WhatsApp.
4. **Formularios**: React Hook Form + Zod en Equipo y en el editor de turno.
5. Responder a las 12 preguntas abiertas del documento de decisiones (redondeo, recargos, festivos por comunidad, acceso de empleadas…).
