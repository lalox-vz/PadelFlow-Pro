"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = ({
    open,
    children,
    onOpenChange,
}: {
    open?: boolean
    children: React.ReactNode
    onOpenChange?: (open: boolean) => void
}) => {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={() => onOpenChange?.(false)}
            />
            <div className="relative z-50">{children}</div>
        </div>
    )
}

const DialogContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
            className
        )}
        {...props}
    >
        {children}
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
        </DialogClose>
    </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = "DialogTitle"

// Helper to close dialog from within content if needed, though mostly handled by overlay/X
const DialogClose = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
    // In a real radix implementation this would integrate with the context. 
    // For this simple version, we assume the parent Dialog handles state or this button's onClick takes care of it if passed.
    // However, since the X button in Content needs to close it, we might typically need context.
    // To keep it simple for this "Quick Fix", I'll just render it. Functional closing depends on the parent passing a handler or Context.
    // Actually, let's make it work: we need a Context.
    const { onOpenChange } = useDialog()
    return (
        <button
            ref={ref}
            className={className}
            onClick={(e) => {
                props.onClick?.(e)
                onOpenChange?.(false)
            }}
            {...props}
        />
    )
})
DialogClose.displayName = "DialogClose"

// Simple Context for the Close button
import { createContext, useContext } from "react"
const DialogContext = createContext<{ onOpenChange?: (open: boolean) => void }>({})
const useDialog = () => useContext(DialogContext)

// Basic Trigger component
const DialogTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, onClick, asChild, ...props }, ref) => {
    const { onOpenChange } = useDialog()

    // Simplification: Always use button. 'asChild' is ignored to avoid dependencies.
    return (
        <button
            ref={ref}
            className={className}
            onClick={(e) => {
                onClick?.(e)
                onOpenChange?.(true)
            }}
            {...props}
        />
    )
})
DialogTrigger.displayName = "DialogTrigger"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn(
            "text-sm text-muted-foreground",
            className
        )}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

// Wrapped Dialog to provide context
const DialogRoot = ({ open, onOpenChange, children }: { open?: boolean, onOpenChange?: (open: boolean) => void, children: React.ReactNode }) => (
    <DialogContext.Provider value={{ onOpenChange }}>
        {open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => onOpenChange?.(false)}
                />
                <div className="relative z-50">{children}</div>
            </div>
        )}
    </DialogContext.Provider>
)

export { DialogRoot as Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogTrigger, DialogFooter }
