import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Harvest API",
        version: "1.0.0",
        description:
          "REST API for the Harvest Mobile App - connecting farmers with consumers\n\n" +
          "## User Roles\n\n" +
          "The API supports three user types:\n\n" +
          "- **CONSUMER**: Regular buyers who can browse products, place orders, and interact with farmers\n" +
          "- **PRODUCER**: Farmers/sellers who can list products, manage inventory, and fulfill orders\n" +
          "- **ADMIN**: System administrators with full access to manage users, products, and platform operations\n\n" +
          "When registering, you can specify the `user_type` field. If not specified, it defaults to CONSUMER.",
      },
      servers: [
        {
          url: "https://harvest-backend-amber.vercel.app",
          description: "Production server",
        },
        {
          url: "http://localhost:3000",
          description: "Development server",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Enter your JWT token",
          },
        },
        schemas: {
          RegisterRequest: {
            type: "object",
            required: ["email", "password", "name"],
            properties: {
              email: {
                type: "string",
                format: "email",
                example: "user@example.com",
                description: "User's email address",
              },
              password: {
                type: "string",
                minLength: 8,
                example: "securepassword123",
                description: "Password (minimum 8 characters)",
              },
              name: {
                type: "string",
                example: "John Doe",
                description: "User's full name",
              },
              phone_number: {
                type: "string",
                example: "+6281234567890",
                description: "User's phone number (optional)",
              },
              user_type: {
                type: "string",
                enum: ["CONSUMER", "PRODUCER", "ADMIN"],
                default: "CONSUMER",
                example: "CONSUMER",
                description:
                  "Account type:\n" +
                  "- CONSUMER: Regular buyer\n" +
                  "- PRODUCER: Farmer/seller\n" +
                  "- ADMIN: System administrator",
              },
            },
          },
          LoginRequest: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: {
                type: "string",
                format: "email",
                example: "user@example.com",
                description: "User's email address",
              },
              password: {
                type: "string",
                example: "securepassword123",
                description: "User's password",
              },
            },
          },
          User: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              name: { type: "string" },
              phone_number: { type: "string", nullable: true },
              avatar_url: { type: "string", nullable: true },
              user_type: {
                type: "string",
                enum: ["CONSUMER", "PRODUCER", "ADMIN"],
              },
              is_verified: { type: "boolean" },
              created_at: { type: "string", format: "date-time" },
              updated_at: { type: "string", format: "date-time" },
            },
          },
          AuthResponse: {
            type: "object",
            properties: {
              status: { type: "string", example: "success" },
              data: {
                type: "object",
                properties: {
                  user: { $ref: "#/components/schemas/User" },
                  access_token: { type: "string" },
                  refresh_token: { type: "string" },
                  token_type: { type: "string", example: "Bearer" },
                  expires_in: { type: "integer", example: 3600 },
                },
              },
            },
          },
          Province: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
            },
          },
          City: {
            type: "object",
            properties: {
              id: { type: "integer" },
              provinceId: { type: "integer" },
              name: { type: "string" },
            },
          },
          District: {
            type: "object",
            properties: {
              id: { type: "integer" },
              cityId: { type: "integer" },
              name: { type: "string" },
            },
          },
          Error: {
            type: "object",
            properties: {
              status: { type: "string", example: "error" },
              message: { type: "string" },
            },
          },
        },
      },
      security: [],
    },
  });
  return spec;
};
