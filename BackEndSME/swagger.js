import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User API Documentation',
      version: '1.0.0',
      description: 'Express API with Swagger for managing users',
    },
    servers: [
      {
        url: 'http://localhost:8000', // Đổi port nếu cần
      },
    ],
  },
  apis: ['./routes/*.js'],
}

const swaggerSpec = swaggerJSDoc(options)

export { swaggerUi, swaggerSpec }
