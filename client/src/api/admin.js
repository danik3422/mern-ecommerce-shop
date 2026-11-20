import { http } from './client'

/** Admin API. Placeholder module — extended by the admin workstream. */
export const fetchAdminStats = () => http.get('/admin/stats').then((r) => r.data)
