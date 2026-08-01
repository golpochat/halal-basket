import { Navigate, useParams } from 'react-router-dom';

/** Legacy `/orders/:id` → `/driver/orders/:id` */
export function RedirectOrderDetail() {
  const { id } = useParams();
  return <Navigate to={`/driver/orders/${id}`} replace />;
}
