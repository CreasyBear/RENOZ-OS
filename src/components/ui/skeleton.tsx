import { cn } from "~/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-accent rounded-md",
        // Custom pulse animation - 1.5s feels more responsive than default 2s
        "animate-pulse [animation-duration:1.5s]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
