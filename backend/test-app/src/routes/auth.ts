import { FastifyInstance } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { AuthService } from '../services/AuthService';

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



export default async function authRoutes(fastify: FastifyInstance) {
 const authService = new AuthService(fastify.db);

 //Register route
 fastify.post<{Body : RegisterBody}>(
  '/register',
  {
    schema : {
      body : RegisterBodySchema,
    }

  },
  async (request,reply)=>{
    try {
        const result = await authService.register(request.body);
                return reply.status(201).send({
                data: result,
        });

    } catch (error) {
              if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
                 return reply.status(409).send({
                error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: 'A user with this email already exists',
            },
                 })
              }
        request.log.error({ error }, 'Registration failed');
                return reply.status(500).send({
               error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Something went wrong',
          },

                })      
    }
  }
 )

 //Login route
 fastify.post<{Body : LoginBody}> (
'/login',
{
    schema : {
      body : LoginBodySchema,
    }

  },
  async(request,reply)=>{

    try {
          const result = await authService.login(request.body);
          return reply.status(200).send({
          data: result,
        });
      
    } catch (error) {
          if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
          return reply.status(401).send({
                        error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          })
              }
         request.log.error({ error }, 'Login failed');
          return reply.status(500).send({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Something went wrong',
          },
        });
    }
  }
)
  
}
