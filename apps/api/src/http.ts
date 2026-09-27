import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { Role } from '@impactmesh/shared-types'
import { z } from 'zod'
import { env } from './config/env'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const rank: Record<Role, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 }

export function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

export function readBody<T>(schema: z.ZodType<T>, body: unknown) {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join(' '))
  }
  return parsed.data
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return next(new HttpError(401, 'Sign in required'))
  try {
    const payload = jwt.verify(token, env.sessionSecret) as {
      sub: string
      role: Role
      orgId: string
      name: string
      email: string
    }
    req.user = {
      id: payload.sub,
      role: payload.role,
      organizationId: payload.orgId,
      name: payload.name,
      email: payload.email,
    }
    next()
  } catch {
    next(new HttpError(401, 'Sign in required'))
  }
}

export function requireRole(min: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Sign in required'))
    if (rank[req.user.role] < rank[min]) return next(new HttpError(403, 'You do not have permission for this action'))
    next()
  }
}

export function signUser(user: { id: string; role: Role; organizationId: string; name: string; email: string }) {
  return jwt.sign(
    { sub: user.id, role: user.role, orgId: user.organizationId, name: user.name, email: user.email },
    env.sessionSecret,
    { expiresIn: '12h' },
  )
}
