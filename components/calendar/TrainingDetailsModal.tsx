import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TrainingSession } from "@/types"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { Clock, User, Users, Calendar as CalendarIcon, Info } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { cn } from "@/lib/utils"

// Helper components since not exported
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

interface TrainingDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    training: TrainingSession | null
    onConfirm: () => void
    actionLabel: string
    isProcessing?: boolean
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function TrainingDetailsModal({
    isOpen,
    onClose,
    training,
    onConfirm,
    actionLabel,
    isProcessing = false,
    variant = "default"
}: TrainingDetailsModalProps) {
    const { language } = useLanguage()
    const locale = language === 'es' ? es : enUS

    if (!training) return null

    const getTrainingColor = (type: string) => {
        switch (type) {
            case 'Yoga': return 'bg-blue-50 text-blue-900 border-blue-200'
            case 'Functional': return 'bg-orange-50 text-orange-900 border-orange-200'
            case 'Hyrox': return 'bg-yellow-50 text-yellow-900 border-yellow-200'
            case 'Crossfit': return 'bg-orange-50 text-orange-900 border-orange-200'
            default: return 'bg-indigo-50 text-indigo-900 border-indigo-200'
        }
    }

    const isFull = (training.participant_count || 0) >= (training.capacity || 20)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card ring-1 ring-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                        {training.title}
                        <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full border border-current font-medium uppercase",
                            training.type === 'Yoga' && "text-blue-500 border-blue-500/30 bg-blue-500/10",
                            training.type === 'Functional' && "text-orange-500 border-orange-500/30 bg-orange-500/10",
                            training.type === 'Hyrox' && "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
                            training.type === 'Crossfit' && "text-orange-500 border-orange-500/30 bg-orange-500/10",
                            !['Yoga', 'Functional', 'Hyrox', 'Crossfit'].includes(training.type) && "text-indigo-500 border-indigo-500/30 bg-indigo-500/10"
                        )}>
                            {training.type}
                        </span>
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {format(new Date(training.start_time), "EEEE, d MMMM yyyy", { locale })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {language === 'es' ? 'Hora' : 'Time'}
                            </span>
                            <span className="font-semibold text-foreground">
                                {format(new Date(training.start_time), "h:mm a")}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <User className="w-3 h-3" /> {language === 'es' ? 'Instructor' : 'Instructor'}
                            </span>
                            <span className="font-semibold text-foreground">
                                {training.instructor || "Coach"}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg col-span-2 border border-border">
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <Users className="w-3 h-3" /> {language === 'es' ? 'Disponibilidad' : 'Availability'}
                            </span>
                            <div className="flex justify-between items-center">
                                <span className={cn("font-semibold", isFull ? "text-destructive" : "text-foreground")}>
                                    {training.participant_count || 0} / {training.capacity || 20} {language === 'es' ? 'cupos' : 'spots'}
                                </span>
                                {isFull && (
                                    <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                                        {language === 'es' ? 'AGOTADO' : 'FULL'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col gap-2 sm:gap-0 sm:flex-row">
                    <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                        {language === 'es' ? 'Cerrar' : 'Close'}
                    </Button>
                    <Button onClick={onConfirm} disabled={isProcessing || (variant !== 'destructive' && isFull)} variant={variant} className={cn(
                        (variant !== 'destructive' && isFull) && "opacity-50 cursor-not-allowed",
                        variant === 'default' && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}>
                        {isProcessing ? (language === 'es' ? 'Procesando...' : 'Processing...') : actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
