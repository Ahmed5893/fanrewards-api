// Implement auth middleware
// Protect routes by verifying the JWT from the Authorization header
// Attach the authenticated user to the request
import { FastifyReply, FastifyRequest } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../config';

interface AccessTokenPayload extends JwtPayload {
  userId: string;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing authorization header',
      },
    });
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization header',
      },
    });
  }

  try {
    const payload = jwt.verify(
      token,
      config.jwt.accessSecret,
    ) as AccessTokenPayload;

    request.user = {
      userId: payload.userId,
    };
  } catch {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }
}