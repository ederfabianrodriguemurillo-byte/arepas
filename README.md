# Arepas Stefania POS

Proyecto listo para usar PostgreSQL en la nube y desplegar la app para varios computadores.

## 1. Dónde poner la `DATABASE_URL`

Edita [`.env`](/C:/Users/ederf/OneDrive/Documentos/New%20project/arepas-pos/.env) o crea tu variable en la plataforma de despliegue:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public"
JWT_SECRET="un-secreto-largo-y-seguro"
NODE_ENV="development"
```

También tienes la plantilla en [.env.example](/C:/Users/ederf/OneDrive/Documentos/New%20project/arepas-pos/.env.example).

Para Neon o Supabase:

- `DATABASE_URL`: conexión usada por la app
- `DIRECT_URL`: conexión directa usada por Prisma para migraciones

## 2. Comandos principales

Instalar dependencias:

```bash
npm install
```

Generar Prisma:

```bash
npm run db:generate
```

Aplicar migraciones en producción:

```bash
npm run db:deploy
```

Ejecutar seed inicial:

```bash
npm run db:seed
```

Levantar en desarrollo:

```bash
npm run dev
```

Si quieres crear migraciones nuevas en desarrollo:

```bash
npm run db:migrate -- --name nombre_del_cambio
```

## 3. Despliegue

Pasos típicos en Vercel o similar:

1. Subir este proyecto al repositorio.
2. Crear una base PostgreSQL en la nube.
3. Configurar `DATABASE_URL` y `JWT_SECRET` en variables de entorno del hosting.
4. Desplegar la app.
5. Ejecutar migraciones:

```bash
npm run db:deploy
```

6. Si es un entorno nuevo, cargar datos iniciales:

```bash
npm run db:seed
```

## 4. Cómo verificar la conexión

Validar Prisma:

```bash
npm run db:check
```

Verificar desde la app:

```text
/api/health/db
```

Respuesta esperada:

```json
{ "ok": true, "database": "reachable" }
```

## 5. Qué ya quedó listo

- Prisma configurado para PostgreSQL
- migración inicial lista para producción
- seed inicial con admin, categorías, productos y configuración
- app preparada para múltiples computadores usando la misma base
- manejo básico de error si falla la conexión

## 6. Usuario inicial

- Correo: `arepasstefania@gmail.com`
- Contraseña inicial: `Arepas2026!`
