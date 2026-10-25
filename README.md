# bolsillo

Dashboard personal de finanzas construido con Next.js App Router, React, TypeScript y Recharts. Las gráficas usan barras interactivas para flujo de caja y distribución de gastos, con una estética oscura inspirada en la captura de referencia.

## Requisitos

- Node.js 20.9 o posterior.
- Una cuenta Wallet Premium y un token REST personal.

## Configuración local

1. Genera tu token REST en Wallet → Settings.
2. Copia .env.example como .env.local y agrega el token:

WALLET_API_TOKEN=tu_token_personal
WALLET_BASE_CURRENCY=COP

3. Instala dependencias y levanta Next.js:

npm install
npm run dev

4. Abre http://localhost:3000.

.env.local está excluido de Git. El token solo se usa en el servidor; el navegador consulta el Route Handler /api/dashboard, que hace lecturas GET a la API oficial. No hay escrituras a Wallet. Sin token, la interfaz ofrece una vista de muestra identificada como tal.

Los totales y gráficas agregan solo la moneda base configurada. Las cuentas y movimientos en otras monedas se muestran en su moneda original para evitar sumar valores incompatibles. Si acabas de crear el primer token, Wallet puede responder con estado de sincronización inicial; vuelve a actualizar cuando termine.

## Scripts

- npm run dev: servidor local.
- npm run build: compilación de producción.
- npm start: servidor de producción tras compilar.
- npm run lint: ESLint.

## Vercel

El proyecto incluye vercel.json y .vercelignore; Vercel detecta Next.js y ejecuta npm install y npm run build.

Para publicar una preview desde Git:

1. Asegúrate de que el código esté en una rama de GitHub.
2. En Vercel, crea/importa el proyecto bolsillo-wallet-dashboard dentro del equipo Alexis' projects y selecciona el repositorio Walletbakers.
3. Deja el Framework Preset en Next.js y despliega una preview.

Por seguridad, no configures WALLET_API_TOKEN en Vercel mientras la app no tenga autenticación o la protección de despliegue activa. Sin esa protección, la ruta /api/dashboard permite consultar los datos que el token entregue. La preview actual debe usar datos de muestra.
