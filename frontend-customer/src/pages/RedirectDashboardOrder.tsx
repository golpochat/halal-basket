import { Navigate, useParams } from 'react-router-dom';

/** Legacy `/orders/:id` → `/customer/orders/:id` */
export function RedirectDashboardOrder() {
  const { id } = useParams();
  return <Navigate to={`/customer/orders/${id}`} replace />;
}
