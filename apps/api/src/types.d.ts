import type { Role } from '@impactmesh/shared-types'

declare global {
  namespace Express {
    interface Request {
      rawBody?: string
      requestId?: string
      user?: {
        id: string
        role: Role
        organizationId: string
        name: string
        email: string
      }
    }
  }
}

export {}
