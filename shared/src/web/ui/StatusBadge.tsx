import { Badge } from './Badge';
import {
  formatFulfillmentStatus,
  fulfillmentStatusTone,
} from '../fulfillment-labels';

type StatusBadgeProps = {
  status: string;
  className?: string;
  /** UI language code (defaults to document lang / English). */
  lang?: string;
};

/** Fulfillment status chip with shared tone + label. */
export function StatusBadge({
  status,
  className = '',
  lang,
}: StatusBadgeProps) {
  return (
    <span className={className}>
      <Badge tone={fulfillmentStatusTone(status)}>
        {formatFulfillmentStatus(status, lang)}
      </Badge>
    </span>
  );
}
