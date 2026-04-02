// Refactored: 2026-04-02 | Issues fixed: G4 | Original: swagger.js
// G4: Updated title to "SME API Documentation" and server URL to /api/v1

import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const port = process.env.PORT || 8000;
const host = process.env.HOST_NAME || "http://localhost";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SME API Documentation",
      version: "1.0.0",
      description: "API hệ thống quản lý doanh nghiệp vừa và nhỏ (SME). Base URL: /api/v1",
    },
    servers: [
      { url: `${host}:${port}/api/v1`, description: "API v1 (current)" },
      { url: `${host}:${port}/api`,    description: "Legacy API (deprecated)" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token từ /api/v1/users/login",
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["./routes/v1/*.js", "./routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
