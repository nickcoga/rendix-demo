# Rendix — Demo Móvil de Gestión de Viáticos y Rendición de Gastos

Aplicación móvil desarrollada en **React Native con Expo (SDK 58) y TypeScript** para la digitalización y rendición de viáticos y comprobantes de pago (facturas, boletas y tickets) orientada a técnicos peruanos en viaje de trabajo y a las áreas de contabilidad/administración.

---

## 1. Características Principales

* **Identidad Visual Corporativa:** Diseñado con la identidad de Rendix (Azul Marino `#001F3F` y acento Cian Eléctrico `#00E5FF`), tarjetas limpias, tipografía de alto contraste y ergonomía táctil para técnicos en campo.
* **Ciclo Completo de Rendición:**
  1. Creación de viaje (técnico, destino, motivo, fechas y adelanto entregado en PEN).
  2. Captura de comprobantes con cámara o galería con guardado privado inmutable.
  3. Extracción asistida con **Google Gemini (3.8 Flash)** a través de una función serverless en Vercel.
  4. Revisión y edición obligatoria por el técnico antes de guardar con badges de origen (*"Detectado por IA — revisar"*, *"No detectado"*, *"Editado manualmente"*).
  5. Modo manual inmediato y fluido si no hay conexión o si se agota el tiempo de espera.
  6. Resumen y balance económico en tiempo real (Adelanto, Gastado, Saldo a Devolver o Excedente a Reembolsar).
  7. Exportación y compartición de reporte en **PDF** (con membrete, tabla contable y anexos fotográficos).
  8. Exportación y compartición de reporte en **Excel** (`.xlsx` multi-hoja: *Resumen* y *Detalle de Gastos*).
* **Persistencia 100% Local:**
  * SQLite relacional mediante `expo-sqlite` (`rendix.db`).
  * Almacenamiento seguro de fotografías mediante la API moderna orientada a objetos de `expo-file-system` (`Paths.document/receipts/`).
  * Reconciliador automático de fotografías huérfanas al iniciar la app con periodo de gracia de 15 minutos.

---

## 2. Arquitectura de Seguridad (Cero Secretos en el APK)

```
[ Teléfono Android / iOS ]
        │
        │ 1. POST /api/extract (Base64 JPEG < 3.5 MB)
        │    Timeout cliente: 10s con AbortController
        ▼
[ Backend Serverless Vercel (api/extract.js) ]
        │
        │ 2. Inyecta GEMINI_API_KEY desde variables de entorno
        │    Timeout proveedor: 8.5s con HTTP 504 / 502
        ▼
[ Google Gemini (gemini-3.8-flash) ]
        │
        ▼ 3. Retorna JSON estructurado (RUC, serie, número, base, IGV, total)
[ Formulario de Revisión Humana en Rendix App ]
```

* La `GEMINI_API_KEY` reside **únicamente en Vercel** como variable de entorno secreta.
* El APK móvil no contiene la clave, ni en el código, ni en variables `EXPO_PUBLIC_*`.
* El backend no depende de un proceso persistente ni de infraestructura externa costosa.

---

## 3. Instrucciones de Ejecución

### Requisitos Previos
* Node.js `>= 22.13.x` (verificado en `v22.22.2`).
* Teléfono Android con **Expo Go** instalado (desde Google Play) o emulador de Android.

### Instalación de dependencias
```bash
npm install
```

### Iniciar la aplicación Expo
```bash
npx expo start
```
* Escanea el código QR desde la aplicación **Expo Go** en tu teléfono Android (o presiona `a` para emulador Android).

### Ejecutar el Proxy de IA localmente (Opcional)
Si deseas probar la extracción con Gemini localmente antes de desplegar en Vercel:
```bash
# Define tu clave temporal para el proxy local
$env:GEMINI_API_KEY="AIzaSy..." # En PowerShell
npm run proxy
```
* El servidor responderá en `http://localhost:3000/api/extract`.
* En la aplicación móvil ve a **Configuración** y coloca la URL de tu máquina (ej. `http://192.168.1.XX:3000/api/extract` o un túnel ngrok/cloudflare).

---

## 4. Despliegue del Backend en Vercel

1. Sube este repositorio a tu cuenta de **GitHub**.
2. Ingresa a [Vercel](https://vercel.com) y selecciona **Add New... > Project**.
3. Importa el repositorio `rendix-demo`.
4. En **Settings > Environment Variables**, agrega:
   * `GEMINI_API_KEY`: Tu clave de Google AI Studio / Google Cloud.
5. Presiona **Deploy**. Vercel desplegará automáticamente la función serverless en `https://tu-proyecto.vercel.app/api/extract`.
6. En la aplicación móvil, abre el icono de engranaje (**Configuración**) e introduce la URL generada por Vercel.

---

## 5. Generación del APK de Demostración (EAS Build)

El proyecto incluye la configuración lista en `app.json` y `eas.json` (perfil `preview`) para compilar un archivo `.apk` descargable directamente a cualquier teléfono Android sin pasar por Play Store:

```bash
# 1. Iniciar sesión en Expo (gratuito)
npx eas login

# 2. Configurar el proyecto en EAS
npx eas project:init

# 3. Compilar el APK instalable
npx eas build -p android --profile preview
```
Al finalizar la compilación en los servidores de EAS, se generará un enlace y código QR para descargar el archivo `.apk` e instalarlo en cualquier teléfono Android.

---

## 6. Verificación de Criterios de Aceptación

| Prueba | Acción | Resultado Esperado |
| :---: | :--- | :--- |
| **TC-01** | Crear nueva rendición con adelanto de S/ 1,500.00 | La rendición se crea, aparece en el historial y el saldo disponible es S/ 1,500.00. |
| **TC-02** | Fotografiar comprobante y extraer con Gemini | Gemini lee RUC, serie, número y total. Los campos muestran el badge *"Detectado por IA — revisar"*. Se guarda y el saldo se descuenta. |
| **TC-03** | Modo manual / Timeout (<10s) | Si no hay internet o el proxy está inactivo, el cliente aborta a los 10s y abre el formulario conservando la foto para llenarlo a mano. |
| **TC-04** | Comprobantes sin RUC ni IGV (Tickets/Peajes) | Se guardan con normalidad sin obligar a registrar RUC ni IGV. |
| **TC-05** | Edición de campos | Al corregir un campo, su etiqueta cambia a *"Editado manualmente"*. |
| **TC-06** | Integridad y Huérfanos | Al borrar un comprobante, su archivo físico desaparece de disco. Al reiniciar la app, se limpian archivos huérfanos con más de 15 minutos. |
| **TC-07** | Persistencia tras reinicio | Cerrar forzadamente la app o reiniciar el teléfono; todos los viajes, gastos y fotografías cargan sin errores. |
| **TC-08** | Exportar PDF | Genera un PDF formal con balance, tabla de comprobantes y fotos anexas legibles, abriendo el diálogo de compartir de Android. |
| **TC-09** | Exportar Excel | Genera un archivo `.xlsx` con hojas *"Resumen"* y *"Detalle_Gastos"* con formato numérico contable. |
| **TC-10** | Configuración EAS | `eas.json` listo para compilar el APK Android para la presentación. |
