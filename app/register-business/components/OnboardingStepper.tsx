"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
    id: number
    label: string
}

interface OnboardingStepperProps {
    currentStep: number
    steps: Step[]
    onStepClick?: (stepId: number) => void
}

export function OnboardingStepper({ currentStep, steps, onStepClick }: OnboardingStepperProps) {
    return (
        <div className="w-full max-w-4xl mx-auto mb-12">
            <div className="relative flex items-center justify-between">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full" />
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#ccff00] -z-10 transition-all duration-500 rounded-full"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step) => {
                    const isCompleted = currentStep > step.id
                    const isCurrent = currentStep === step.id
                    const isClickable = step.id < currentStep

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 bg-background p-2 rounded-full">
                            <button
                                onClick={() => isClickable && onStepClick?.(step.id)}
                                disabled={!isClickable}
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 font-bold text-sm",
                                    isClickable ? "cursor-pointer hover:bg-muted/20" : "cursor-default",
                                    isCompleted
                                        ? "bg-[#ccff00] border-[#ccff00] text-black"
                                        : isCurrent
                                            ? "border-[#ccff00] text-[#ccff00] bg-black"
                                            : "border-muted text-muted-foreground bg-background"
                                )}
                            >
                                {isCompleted ? <Check className="w-5 h-5" /> : step.id}
                            </button>
                            <span
                                className={cn(
                                    "text-xs font-medium uppercase tracking-wider absolute -bottom-8 whitespace-nowrap transition-colors duration-300",
                                    isCurrent ? "text-[#ccff00]" : "text-muted-foreground"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
