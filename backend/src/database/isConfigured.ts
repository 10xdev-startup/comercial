/** True when the backend can talk to Supabase (service-role). */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env['SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY'])
}
