import { cn } from "../../lib/utils"

const Badge = ({ className, variant = "default", ...props }) => {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
    success: "border-transparent bg-success-green/20 text-success-green hover:bg-success-green/30",
    warning: "border-transparent bg-warning-yellow/20 text-warning-yellow hover:bg-warning-yellow/30",
    danger: "border-transparent bg-danger-red/20 text-danger-red hover:bg-danger-red/30",
    action: "border-transparent bg-action-blue/20 text-action-blue hover:bg-action-blue/30",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
