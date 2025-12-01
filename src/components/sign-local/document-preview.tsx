"use client";

import { useState, useEffect, useRef, useContext } from 'react';
import Image from 'next/image';
import mammoth from 'mammoth';
import { AppContext } from '@/context/SignAppContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, PenSquare, CheckCircle2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { SignatureField } from '@/app/page';

type DragState = {
    fieldId: string;
    offsetX: number;
    offsetY: number;
};

export function DocumentPreview() {
    const context = useContext(AppContext);
    const [html, setHtml] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState<DragState | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);


    if (!context) {
        throw new Error("DocumentPreview must be used within an AppProvider");
    }

    const { file, signatureFields, setSignatureFields, addAuditLog, isPlacing, setIsPlacing } = context;

    useEffect(() => {
        if (!file) return;

        setIsLoading(true);
        setError(null);

        const reader = new FileReader();

        reader.onload = async (event) => {
            if (event.target?.result) {
                try {
                    const arrayBuffer = event.target.result as ArrayBuffer;
                    const result = await mammoth.convertToHtml({ arrayBuffer });
                    setHtml(result.value);
                } catch (e: any) {
                    console.error("Error converting document:", e);
                    setError(e.message || "Failed to render the document.");
                } finally {
                    setIsLoading(false);
                }
            }
        };

        reader.onerror = (e) => {
            console.error("FileReader error:", e);
            setError("Failed to read the file.");
            setIsLoading(false);
        }

        reader.readAsArrayBuffer(file);

    }, [file]);
    
    const handleMouseUp = () => {
        if(dragging) {
            const field = signatureFields.find(f => f.id === dragging.fieldId);
            if(field) {
                addAuditLog(`Moved signature field "${field.name}" to (${field.x.toFixed(1)}%, ${field.y.toFixed(1)}%).`);
            }
        }
        setDragging(null);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragging || !contentRef.current) return;

        const rect = contentRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        setSignatureFields(
            signatureFields.map(f =>
                f.id === dragging.fieldId
                    ? { ...f, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
                    : f
            )
        );
    };


    const handleFieldMouseDown = (e: React.MouseEvent<HTMLDivElement>, field: SignatureField) => {
        if (field.signature) return; // Don't allow moving signed fields
        e.stopPropagation();
        
        const fieldElement = e.currentTarget;
        const rect = fieldElement.getBoundingClientRect();
        const parentRect = contentRef.current!.getBoundingClientRect();

        const offsetX = (e.clientX - rect.left) / parentRect.width * 100;
        const offsetY = (e.clientY - rect.top) / parentRect.height * 100;

        setDragging({ fieldId: field.id, offsetX, offsetY });
    };

    const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPlacing || !contentRef.current) return;
        
        const target = e.target as HTMLElement;
        if (target.closest('[data-signature-field="true"]')) {
            return;
        }

        const rect = contentRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        const newFieldId = `field-${Date.now()}`;
        const newFieldName = `Signature ${signatureFields.length + 1}`
        const newField = {
            id: newFieldId,
            name: newFieldName,
            signature: null,
            x: x,
            y: y,
        };

        setSignatureFields([...signatureFields, newField]);
        setIsPlacing(false); // Deactivate placement mode after placing a field
    };
    
    const handleDeleteField = (e: React.MouseEvent<HTMLButtonElement>, fieldId: string) => {
        e.stopPropagation();
        const field = signatureFields.find(f => f.id === fieldId);
        if(field) {
            setSignatureFields(signatureFields.filter(f => f.id !== fieldId));
            addAuditLog(`Signature field "${field.name}" removed.`);
        }
    }


    if (isLoading) {
        return (
            <div className="space-y-4 p-4 border rounded-md h-[80vh] overflow-hidden">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/6" />
                 <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        )
    }

    if (error) {
        return (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Could not display the document. Please ensure it's a valid .docx file.
                    <p className="text-xs mt-2">{error}</p>
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <TooltipProvider>
            <div 
                ref={previewRef}
                className={cn(
                    "prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md h-[80vh] overflow-y-auto bg-white dark:bg-card"
                )}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    ref={contentRef}
                    className={cn("relative", isPlacing && "cursor-crosshair")}
                    onClick={handlePreviewClick}
                    onMouseMove={handleMouseMove}
                >
                    <style jsx global>{`
                        .prose table { width: 100%; }
                        .prose th, .prose td { border: 1px solid hsl(var(--border)); padding: 0.5rem; }
                        .prose th { font-weight: bold; }
                    `}</style>
                    <div dangerouslySetInnerHTML={{ __html: html }} />

                    {signatureFields.map(field => (
                        <Tooltip key={field.id} delayDuration={100}>
                            <TooltipTrigger asChild>
                                <div
                                    data-signature-field="true"
                                    onMouseDown={(e) => handleFieldMouseDown(e, field)}
                                    className={cn(
                                        "absolute transform -translate-x-1/2 -translate-y-1/2 p-1 group",
                                        !field.signature && "cursor-move",
                                        dragging && dragging.fieldId === field.id && "z-10"
                                    )}
                                    style={{ left: `${field.x}%`, top: `${field.y}%` }}
                                >
                                    {field.signature ? (
                                        <div className='flex items-center gap-2 bg-background/80 p-1 rounded border border-green-500'>
                                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                            <Image
                                                src={field.signature}
                                                alt={`Signature for ${field.name}`}
                                                width={100}
                                                height={50}
                                                className="rounded-sm bg-muted"
                                                data-ai-hint="signature"
                                            />
                                        </div>
                                    ) : (
                                        <div className='relative flex items-center gap-2 bg-background/80 p-2 rounded-lg border-2 border-dashed border-primary'>
                                            <PenSquare className="w-5 h-5 text-primary shrink-0" />
                                            <span className='font-semibold text-sm text-primary'>{field.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute -top-4 -right-4 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => handleDeleteField(e, field.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className='font-semibold'>{field.name}</p>
                                <p className='text-sm text-muted-foreground'>{field.signature ? "Signed" : "Awaiting Signature"}</p>
                                 {!field.signature && <p className='text-xs text-muted-foreground mt-1'>Click and drag to move</p>}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </TooltipProvider>
    );
}
