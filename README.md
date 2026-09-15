# 🏪 Validador de Transferencias para PYMEs (Itaú / SIPAP Paraguay)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24+-green.svg)](https://nodejs.org/)
[![Clean Architecture](https://img.shields.io/badge/Architecture-Clean%20%2F%20Hexagonal-orange.svg)](#arquitectura)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests Passing](https://img.shields.io/badge/tests-100%25%20passing-brightgreen.svg)](#pruebas)

Sistema open-source en **TypeScript** diseñado para resolver el clásico cuello de botella en cajas de comercios y puntos de venta (kioskos, almacenes, cafeterías): **verificar transferencias bancarias en tiempo real sin requerir que la dueña revise su celular personal ni compartir contraseñas bancarias o de correo con los empleados.**

---

## 🚀 Problema vs Solución

| El Problema Habitual | Nuestra Solución |
|---|---|
| ❌ La dueña vive esclava del celular esperando que los empleados le pregunten si entró el pago. | ✅ Los empleados verifican en 2 segundos desde una pantalla web en la caja. |
| ❌ Riesgo de seguridad si le entregan la clave del correo a los empleados. | ✅ **Zero-Credentials:** Los empleados jamás tocan el Gmail ni ven transferencias personales. |
| ❌ **Estafa del Comprobante Duplicado:** Clientes que reutilizan la misma captura de pantalla en compras distintas. | ✅ **Anti-Replay Guard:** Cada transferencia se bloquea al cobrarse. Si la vuelven a presentar, salta una alerta roja. |
| ❌ Clientes esperando 1 minuto en la fila. | ✅ Respuesta en **15 milisegundos** gracias a SQLite nativo en memoria/disco. |

---

## 🏛️ Arquitectura

El proyecto sigue los principios de **Clean Architecture (Puertos y Adaptadores)**:

```
src/
├── domain/                      # Reglas de negocio e invariantes
│   ├── entities/                # Transfer Entity con lógica de estado y bloqueo
│   └── ports/                   # Contratos (ITransferRepository, IBankParser)
├── infrastructure/              # Implementaciones tecnológicas
│   ├── database/                # SQLite nativo (node:sqlite)
│   └── parsers/                 # Factoría y Parsers bancarios (Itaú, expandible a otros)
├── application/                 # Casos de uso
│   ├── use-cases/               # IngestEmail, VerifyTransfer, ClaimTransfer
│   └── dto/                     # Data Transfer Objects y contratos de entrada/salida
├── presentation/                # Controladores y Middlewares HTTP
│   ├── controllers/             # TransferController
│   └── middlewares/             # WebhookAuth, RateLimiter, Helmet
└── public/                      # UI de Punto de Venta (Vanilla HTML/CSS/JS + Web Audio)
```

---

## 🔄 Flujo del Sistema

```
[ Cliente paga por Ueno/GNB ]
               │
               ▼
[ Itaú acredita y manda mail ]
               │
               ▼ (Menos de 60 segundos)
[ Google Apps Script en Gmail ] ──(POST Seguro)──▶ [ API en TypeScript ]
                                                            │
                                                     (SQLite Nativo)
                                                            │
                                                            ▼
[ Cajero tipea Monto + Apellido ] ◀──────▶ [ Pantalla Web de Caja ]
```

---

## 🛠️ Instalación y Puesta en Marcha Local

### Requisitos
- **Node.js v22 o v24+** (utiliza `node:sqlite` nativo).
- Git.

### Pasos
```bash
# 1. Clonar el repositorio
git clone https://github.com/fugc123/validador-transferencias-pymes.git
cd validador-transferencias-pymes

# 2. Instalar dependencias
npm install

# 3. Compilar TypeScript
npm run build

# 4. Iniciar en modo desarrollo
npm run dev

# 5. O iniciar en modo producción
npm start
```

Abrir en el navegador: **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con suites de pruebas unitarias y de integración E2E con **Jest** y **Supertest**:

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar solo unitarias
npm run test:unit

# Ejecutar solo E2E
npm run test:e2e
```

---

## ☁️ Guía de Despliegue Económico o Gratuito

No necesitás pagar servidores dedicados ni comprar dominios. Este proyecto puede vivir en:

### Opción 1: Render (100% Gratis con SSL)
1. Conecta tu repositorio de GitHub en [Render.com](https://render.com/).
2. Crea un nuevo **Web Service**.
3. Configuración:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Render te entregará una URL HTTPS pública (ej: `https://validador-kiosko.onrender.com`).

### Opción 2: Railway o Fly.io
- Despliegue con 1 clic con volumen persistente para la base de datos SQLite.

---

## 📧 Conexión con Gmail (Dueña)

1. Abrir [Google Apps Script](https://script.google.com/) con la cuenta de Gmail receptora.
2. Crear un **Nuevo proyecto** y pegar el contenido de [`google-apps-script/code.gs`](google-apps-script/code.gs).
3. Cambiar `WEBHOOK_URL` por la URL de tu servidor desplegado.
4. Ir a **Activadores (ícono de reloj)** → **Añadir activador**:
   - Función: `procesarCorreosItau`
   - Evento: `Según tiempo`
   - Tipo: `Temporizador por minutos`
   - Intervalo: `Cada 1 minuto`
5. Guardar y autorizar permisos.

---

## 🛡️ Seguridad

- **Zero-Knowledge Query:** La pantalla de caja no lista transferencias abiertas. Solo busca coincidencias de montos ingresados en el momento.
- **OWASP Hardening:** Implementa cabeceras seguras con `Helmet` y limitador de tasa de peticiones con `express-rate-limit`.
- **Autenticación Webhook:** Endpoint de ingestión protegido por token secreto configurable vía variable de entorno `WEBHOOK_SECRET`.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT** - podés usarlo libremente para tu negocio o adaptarlo para tus clientes.
