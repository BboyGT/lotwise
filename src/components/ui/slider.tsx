"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full",
          "data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2",
          "bg-black/60 border border-white/10",
          "shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
        )}
      >
        {/* Tick marks on the track for visual texture */}
        <div className="absolute inset-0 flex items-center justify-between px-1 opacity-40 pointer-events-none">
          {Array.from({ length: 21 }).map((_, i) => (
            <div
              key={i}
              className="w-px bg-white/20"
              style={{ height: i % 5 === 0 ? "60%" : "30%" }}
            />
          ))}
        </div>
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute rounded-full",
            "data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
            "bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300",
            "shadow-[0_0_8px_rgba(255,184,0,0.5)]"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(
            "relative block shrink-0 rounded-full",
            "size-5 cursor-grab active:cursor-grabbing",
            "bg-gradient-to-b from-amber-300 to-amber-500",
            "border-2 border-amber-200/80",
            "shadow-[0_0_0_4px_rgba(255,184,0,0.15),0_0_12px_rgba(255,184,0,0.6)]",
            "transition-[box-shadow,transform] duration-150",
            "hover:shadow-[0_0_0_6px_rgba(255,184,0,0.2),0_0_16px_rgba(255,184,0,0.8)]",
            "hover:scale-110",
            "focus-visible:outline-none focus-visible:shadow-[0_0_0_6px_rgba(255,184,0,0.3),0_0_16px_rgba(255,184,0,0.9)]",
            "active:scale-95",
            "disabled:pointer-events-none disabled:opacity-50",
            // Inner dot for "forge spark" feel
            "after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2",
            "after:h-1.5 after:w-1.5 after:rounded-full after:bg-amber-100",
            "after:shadow-[0_0_4px_rgba(255,255,255,0.8)]"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
