# Master Planning · Frontend

React + TypeScript (Vite) para horarios, registro de horas y nómina.

Los datos viven en PostgreSQL a través de la API del backend (`Master-Planning-Backend`).

## Arrancar

```bash
# 1. API (ver ../Master-Planning-Backend/README.md)
cd ../Master-Planning-Backend && npm install && npm run db:up && npm run db:migrate && npm run db:seed && npm run dev

# 2. Frontend
cd ../Master-Planning-Frontend && npm install && npm run dev
```

En desarrollo Vite redirige `/api` a `http://localhost:3000` (`vite.config.ts`). En producción, define `VITE_API_URL` al hacer el build (ver `.env.example`).

```bash
npm test   # Vitest
```

## Qué funciona

- **Login**: encargado (`admin`) o empleada (usuario + PIN asignado en Equipo).
- **Portal empleada** (`/portal`): horario publicado y estimación/histórico de pago (solo lectura).
- **Horario · Semana**: cuadrícula, drag & drop de turnos, plantillas, avisos, publicar/borrador, CSV/PDF.
- **Horario · Día**: línea de tiempo 06:00–21:00 con ajuste de duración.
- **Registro de horas**: prellenado, edición en línea, confirmación por fila o día.
- **Nómina**: cálculo con recargos, histórico y marcar como pagado.
- **Inicio / Equipo / Ajustes**: indicadores, CRUD de empleadas (con acceso portal), plantillas, reglas y tema.

## Estructura

```
src/
  lib/auth.tsx      Sesión JWT
  lib/types.ts      Modelo de datos
  lib/api.ts        Cliente HTTP
  lib/sync.ts       Diff de estado → POST /api/sync
  lib/rules.ts      Cobertura, avisos e importes
  lib/theme.ts      Tokens claro/oscuro
  lib/time.ts       Minutos ↔ HH:MM, euros, fechas
  store.tsx         Estado global sincronizado con la API
  components/       UI compartida
  pages/            Login, Portal, Inicio, Horario…
```

## Convenciones

- Horas: `fecha` (YYYY-MM-DD) + minutos desde las 00:00 (`400` = 06:40).
- Dinero: céntimos enteros (`1000` = 10,00 €).
- Semana empieza en lunes; formato 24 h; idioma `es`.
