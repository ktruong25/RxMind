import { Request, Response, NextFunction } from 'express';
import { query } from '../db';

// HIPAA-required audit middleware. Attach to any route that touches patient data.
export function auditLog(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const resourceId =
      req.params.id || req.params.patientId || req.body?.id || null;

    const patientId =
      resource === 'patients'
        ? (req.params.id ?? req.body?.id ?? null)
        : (req.body?.patient_id ?? req.params.patientId ?? null);

    try {
      await query(
        `INSERT INTO audit_log
          (user_id, clerk_id, action, resource, resource_id, patient_id,
           ip_address, user_agent, request_path, request_method, changes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          req.user?.id ?? null,
          req.user?.clerkId ?? null,
          action,
          resource,
          resourceId,
          patientId,
          req.ip,
          req.headers['user-agent'] ?? null,
          req.path,
          req.method,
          action !== 'read' ? JSON.stringify(req.body) : null,
        ]
      );
    } catch (err) {
      // Never block the request on audit failure — log and continue
      console.error('[audit] failed to write audit log', err);
    }

    next();
  };
}
