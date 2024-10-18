# Chatbot Service API

Este proyecto es una API creada con [NestJS](https://nestjs.com/) que utiliza la API de OpenAI para procesar consultas de chatbot y realizar funciones personalizadas como la búsqueda de productos y la conversión de divisas. El servicio maneja la interacción con OpenAI para generar respuestas de chatbot y ejecuta funciones adicionales según sea necesario, como buscar productos en un archivo CSV o convertir divisas usando una API externa.

## Características

- **Procesamiento de consultas**: Usa la API de OpenAI para generar respuestas a consultas de usuario.
- **Búsqueda de productos**: Busca productos en un archivo CSV según el nombre del producto y otras características (precio).
- **Conversión de divisas**: Convierte montos entre diferentes monedas utilizando una API de tasas de cambio externas.
- **Gestión de errores**: Manejo avanzado de errores para diferentes escenarios, como el agotamiento de la cuota de la API, errores de autenticación o respuestas no válidas.

## Requisitos

- Node.js (v16 o superior)
- NestJS CLI
- Claves API para los servicios:
  - [OpenAI](https://openai.com/)
  - [Exchange Rates API](https://exchangeratesapi.io/)

### Variables de entorno

El proyecto requiere las siguientes variables de entorno configuradas en un archivo `.env` en la raíz del proyecto:

```bash
OPENAI_API_KEY=tu_openai_api_key
OPENAI_ORGANIZATION_ID=tu_organizacion_openai (opcional)
EXCHANGE_API_KEY=tu_exchange_api_key
```

## Instalación

1. Clona este repositorio:

   ```bash
   git clone https://github.com/julians83/chatbot-api.git
   ```

2. Navega al directorio del proyecto:

   ```bash
   cd tu-repositorio
   ```

3. Instala las dependencias:

   ```bash
   npm install
   ```

4. Crea un archivo `.env` con tus claves de API siguiendo el formato anterior.

## Uso

### Ejecutar la aplicación en desarrollo

```bash
npm run start:dev
```

La aplicación estará disponible en `http://localhost:3000`.

### Endpoints principales

#### Procesar consulta de chatbot

**POST** `/chatbot`

Este endpoint procesa una consulta de usuario, utilizando la API de OpenAI para generar respuestas y ejecutar funciones adicionales, como la búsqueda de productos y la conversión de divisas.

- **Request Body**:
  - `query`: (string) La consulta del usuario.

**Ejemplo**:

```json
{
  "query": "I am looking for a phone"
}
```

- **Response**:
  - `response`: (string) Respuesta generada por el chatbot, incluyendo la información solicitada (productos encontrados, conversiones de divisas, etc.).


## Estructura del Proyecto

- `src/chatbot/chatbot.service.ts`: Lógica principal de la API de chatbot, que incluye la interacción con OpenAI y funciones personalizadas.
- `src/csv/csv.service.ts`: Lógica para la búsqueda de productos en archivos CSV.
- `src/dto/`: Define los Data Transfer Objects (DTO) utilizados para las solicitudes y respuestas.
- `src/interfaces/`: Define las interfaces utilizadas, como la conversión de divisas.
