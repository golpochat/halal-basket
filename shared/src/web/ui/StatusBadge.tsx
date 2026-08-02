import { Badge } from './Badge';
import {
  formatFulfillmentStatus,
  fulfillmentStatusTone,
} from '../fulfillment-labels';

type StatusBadgeProps = {
  status: string;
  className?: string;
};

/** Fulfillment status chip with shared tone + label. */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={className}>
      <Badge tone={fulfillmentStatusTone(status)}>
        {formatFulfillmentStatus(status)}
      </Badge>
    </span>
  );
}
