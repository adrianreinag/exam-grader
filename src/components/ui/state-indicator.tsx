import * as React from "react"
import { cn } from "@/lib/utils"

export interface StateIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  state: "DRAFT" | "PUBLISHED" | "EVALUATED" | "UNGRADED" | "GRADED_DRAFT" | "GRADED_FINAL"
}

const dotColors = {
  DRAFT: "bg-amber-500",
  PUBLISHED: "bg-teal-500",
  EVALUATED: "bg-indigo-500",
  UNGRADED: "bg-neutral-400",
  GRADED_DRAFT: "bg-blue-500",
  GRADED_FINAL: "bg-green-500"
}

function StateIndicator({ state, className, ...props }: StateIndicatorProps) {
  const dotColorClass = dotColors[state] || dotColors.DRAFT
  
  return (
    <span 
      className={cn(
        "inline-flex items-center text-gray-700 text-xs font-medium",
        className
      )} 
      {...props} 
    >
      <span className={cn("mr-1.5 h-2 w-2 rounded-full", dotColorClass)} />
      {props.children}
    </span>
  )
}

export { StateIndicator }
