# BHBC Media Roster - Update Notes

## Summary of fixes applied

### auth-service
- `auth-service/src/index.js`
  - Fixed port fallback from `process.env.PORT || PORT` to `process.env.PORT || 4001`.
  - Ensures the service starts reliably even when `PORT` is not provided.

### roster-core-service
- `roster-core-service/src/routes/memberRoutes.js`
  - Added `requireAuth` middleware to:
    - `POST /members`
    - `GET /members/:id`
    - `PUT /members/:id`
  - Corrected route path for `PUT /members/:id` (added missing leading slash).
  - This secures member endpoints and avoids unintended public access.

### notification-service
- `notification-service/src/app.js`
  - Fixed `/health` route to return JSON via `res.json(...)` instead of malformed `res.status({...})`.
  - Makes the health endpoint valid and usable by deployment checks.

## Why these changes matter
- `PORT` fallback bug would prevent `auth-service` from starting in local or deployed environments without an explicit `PORT`.
- Member routes in `roster-core-service` were partially unprotected, which could expose internal data or allow unauthorized changes.
- The `/health` route in `notification-service` was returning a broken response format and could fail monitoring or deployment readiness checks.

## Recommended next steps
1. Run each service locally and verify health endpoints:
   - `http://localhost:4001/health` for auth-service
   - `http://localhost:4002/health` for roster-core-service
   - `http://localhost:4003/health` for notification-service
2. Confirm environment variable config in each service:
   - `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `RESEND_API_KEY`, `DATABASE_URL`, `NOTIFICATION_SERVICE_URL`
3. Test key API flows manually:
   - Auth register/login with `auth-service`
   - Create member and fetch member list with `roster-core-service`
   - Trigger roster publish and check notification logging with `notification-service`
4. Deploy the services after local validation.

## Notes for continued work
- Keep `auth-service` and `roster-core-service` separate to maintain the microservice architecture.
- Use local `.env` files for development only and avoid committing secrets.
- Once local service behavior is confirmed, deploy each service with the same env vars in Render.

## File status
- `auth-service/src/index.js` - updated
- `roster-core-service/src/routes/memberRoutes.js` - updated
- `notification-service/src/app.js` - updated

---

If you want, I can also add a short checklist to this document for the exact deployment steps on Render and Vercel.