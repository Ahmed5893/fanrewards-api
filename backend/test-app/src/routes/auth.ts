import { FastifyInstance } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

const RegisterBodySchema = Type.Object({

  email : Type.String({format : 'email'}),
  password : Type.String({minLength : 8}),
  displayName : Type.String({minLength : 3, maxLength : 100}),

});
const LoginBodySchema = Type.Object({

  email : Type.String({format : 'email'}),
  password : Type.String({minLength : 1}),

});
const RefreshBodySchema = Type.Object({

    refreshToken: Type.String({ minLength: 1 }),
});
const LogoutBodySchema = Type.Object({
      
  refreshToken: Type.String({ minLength: 1 }),
});

type RegisterBody = Static<typeof RegisterBodySchema>;
type LoginBody = Static<typeof LoginBodySchema>;
type RefreshBody = Static<typeof RefreshBodySchema>;
type LogoutBody = Static<typeof LogoutBodySchema>;

// TODO: Implement auth routes
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/refresh
// POST /api/auth/logout

export default async function authRoutes(fastify: FastifyInstance) {
  void fastify;
  // Register
  // fastify.post('/register', { schema: { body: RegisterBody } }, async (request, reply) => { ... });

  // Login
  // fastify.post('/login', { schema: { body: LoginBody } }, async (request, reply) => { ... });

  // Refresh
  // fastify.post('/refresh', { schema: { body: RefreshBody } }, async (request, reply) => { ... });

  // Logout
  // fastify.post('/logout', { schema: { body: LogoutBody } }, async (request, reply) => { ... });
}
