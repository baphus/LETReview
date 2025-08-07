
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { ScrollArea } from "./scroll-area"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
        Day: ({ date, displayMonth }) => {
            const isQotdCompleted = props.modifiers?.qotd_completed?.some(d => 
                d.getFullYear() === date.getFullYear() &&
                d.getMonth() === date.getMonth() &&
                d.getDate() === date.getDate()
            );

            // Default Day component rendering logic from react-day-picker
            const { day,
                selected,
                range_start,
                range_end,
                range_middle,
                hidden,
                outside,
                disabled,
                today
            } = DayPicker.useDayRender(date, displayMonth, props.numberOfMonths || 1);

            const buttonRef = React.useRef<HTMLButtonElement>(null);
            React.useEffect(() => {
                if (day.active) {
                    buttonRef.current?.focus();
                }
            }, [day.active]);

            if (hidden) return <></>;

            const classNames = [
                cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal"),
                disabled && "opacity-50 text-muted-foreground",
                today && !selected && "bg-accent text-accent-foreground",
                selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                props.modifiersClassNames?.streak && props.modifiers?.streak?.some(d => d.getTime() === date.getTime()) && props.modifiersClassNames.streak,
            ];

            return (
                <div className="relative h-9 w-9">
                     <button
                        {...day.buttonProps}
                        ref={buttonRef}
                        type="button"
                        className={cn(classNames)}
                    >
                        {date.getDate()}
                    </button>
                    {isQotdCompleted && <span className="absolute top-0 right-0 text-xs select-none pointer-events-none">✅</span>}
                </div>
            );
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

    