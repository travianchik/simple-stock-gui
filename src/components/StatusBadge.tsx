import { cn } from "@/lib/utils";

type StatusType = "success" | "warning" | "error" | "default" | "primary";

const statusStyles: Record<StatusType, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
};

interface StatusBadgeProps {
  status: StatusType;
  label: string;
}

const StatusBadge = ({ status, label }: StatusBadgeProps) => (
  <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", statusStyles[status])}>
    {label}
  </span>
);

export default StatusBadge;
