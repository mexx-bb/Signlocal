"use client";

import { useState, useEffect, useRef, useContext } from 'react';
import Image from 'next/image';
import mammoth from 'mammoth';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { AppContext } from '@/context/SignAppContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, PenSquare, CheckCircle2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { SignatureField } from '@/app/page';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

type InteractionState = {
    fieldId: string;
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    startWidth?: number;
    startHeight?: number;
};


export function DocumentPreview() {
    const context = useContext(AppContext);
    const [docHtml, setDocHtml] = useState('');
    const [numPages, setNumPages] = useState<number>();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [interaction, setInteraction] = useState<InteractionState | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    if (!context) {
        throw new Error("DocumentPreview must be used within an AppProvider");
    }

    const { file, signatureFields, setSignatureFields, addAuditLog, isPlacing, setIsPlacing } = context;

    useEffect(() => {
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setDocHtml('');
        setNumPages(undefined);

        if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    try {
                        const arrayBuffer = event.target.result as ArrayBuffer;
                        const result = await mammoth.convertToHtml({ arrayBuffer });
                        setDocHtml(result.value);
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
        } else if (file.type === "application/pdf") {
            setIsLoading(false);
        }

    }, [file]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
    }
    
    const handleMouseUp = () => {
        if(interaction) {
            const field = signatureFields.find(f => f.id === interaction.fieldId);
            if(field) {
                let logMessage: string;
                if (interaction.type === 'move') {
                    logMessage = `Moved signature field "${field.name}" to (${field.x.toFixed(1)}%, ${field.y.toFixed(1)}%)`;
                } else {
                     logMessage = `Resized signature field "${field.name}" to ${field.width}x${field.height}px`;
                }
                
                if(field.page) logMessage += ` on page ${field.page}`;
                logMessage += '.';
                addAuditLog(logMessage);
            }
        }
        setInteraction(null);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!interaction || !e.currentTarget) return;

        const parentRect = e.currentTarget.getBoundingClientRect();
        
        setSignatureFields(prevFields => prevFields.map(field => {
            if (field.id !== interaction.fieldId) return field;

            if (interaction.type === 'move') {
                const x = ((e.clientX - parentRect.left) / parentRect.width) * 100;
                const y = ((e.clientY - parentRect.top) / parentRect.height) * 100;
                return { ...field, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
            }

            if (interaction.type === 'resize' && interaction.startWidth && interaction.startHeight) {
                const dx = e.clientX - interaction.startX;
                const dy = e.clientY - interaction.startY;
                const newWidth = Math.max(50, interaction.startWidth + dx);
                const newHeight = Math.max(25, interaction.startHeight + dy);
                return { ...field, width: newWidth, height: newHeight };
            }
            return field;
        }));
    };


    const handleFieldMouseDown = (e: React.MouseEvent<HTMLDivElement>, fieldId: string, type: 'move' | 'resize') => {
        e.stopPropagation();
        const currentField = signatureFields.find(f => f.id === fieldId);
        if (!currentField) return;

        setInteraction({
            fieldId,
            type,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: currentField.width,
            startHeight: currentField.height
        });
    };

    const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>, pageNumber?: number) => {
        if (!isPlacing || !e.currentTarget) return;
        
        const target = e.target as HTMLElement;
        if (target.closest('[data-signature-field="true"]')) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        const newFieldId = `field-${Date.now()}`;
        const newFieldName = `Signature ${signatureFields.length + 1}`
        const newField: SignatureField = {
            id: newFieldId,
            name: newFieldName,
            signature: null,
            x: x,
            y: y,
        };

        if (pageNumber) {
            newField.page = pageNumber;
        }

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

    const renderSignatureFields = (pageNumber?: number) => {
        const fields = signatureFields.filter(f => file?.type === 'application/pdf' ? f.page === pageNumber : true);

        return fields.map(field => (
             <Tooltip key={field.id} delayDuration={100}>
                <TooltipTrigger asChild>
                    <div
                        data-signature-field="true"
                        className={cn(
                            "absolute transform -translate-x-1/2 -translate-y-1/2 p-1 group z-10 print:border-transparent",
                            interaction && interaction.fieldId === field.id && "z-20"
                        )}
                        style={{ left: `${field.x}%`, top: `${field.y}%`, width: field.width, height: field.height }}
                    >
                        {field.signature ? (
                            <div 
                                className='relative w-full h-full flex items-center justify-center p-1 rounded border border-green-500 hover:border-accent cursor-move print:border-none'
                                onMouseDown={(e) => handleFieldMouseDown(e, field.id, 'move')}
                            >
                                <CheckCircle2 className="absolute -top-2 -left-2 w-5 h-5 text-green-500 bg-white rounded-full print:hidden" />
                                <Image
                                    src={field.signature}
                                    alt={`Signature for ${field.name}`}
                                    fill
                                    className="object-contain"
                                    data-ai-hint="signature"
                                />
                                <div 
                                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                    onMouseDown={(e) => handleFieldMouseDown(e, field.id, 'resize')}
                                />
                            </div>
                        ) : (
                             <div 
                                onMouseDown={(e) => handleFieldMouseDown(e, field.id, 'move')}
                                className='relative flex items-center justify-center gap-2 bg-background/80 p-2 rounded-lg border-2 border-dashed border-primary cursor-move print:hidden'
                            >
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
                    {file?.type === 'application/pdf' && <p className='text-sm text-muted-foreground'>Page {field.page}</p>}
                    <p className='text-sm text-muted-foreground'>{field.signature ? "Signed" : "Awaiting Signature"}</p>
                    <p className='text-xs text-muted-foreground mt-1'>{field.signature ? "Drag to move, drag corner to resize" : "Click and drag to move"}</p>
                </TooltipContent>
            </Tooltip>
        ));
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
                    Could not display the document. Please ensure it's a valid file.
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
                    "p-4 border rounded-md h-[80vh] overflow-y-auto bg-white dark:bg-card flex justify-center",
                     file?.type.includes('word') && "prose prose-sm dark:prose-invert max-w-none"
                )}
            >
                {file?.type.includes('word') && (
                     <div
                        className={cn("relative w-full", isPlacing && "cursor-crosshair")}
                        onClick={(e) => handlePreviewClick(e)}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <style jsx global>{`
                            @media print {
                                .prose {
                                    display: block;
                                    overflow: visible;
                                }
                            }
                            .prose table { width: 100%; }
                            .prose th, .prose td { border: 1px solid hsl(var(--border)); padding: 0.5rem; }
                            .prose th { font-weight: bold; }
                        `}</style>
                        <div dangerouslySetInnerHTML={{ __html: docHtml }} />

                        {renderSignatureFields()}
                    </div>
                )}

                {file?.type === 'application/pdf' && (
                     <Document
                        file={file}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={(e) => setError(e.message)}
                        className="space-y-4"
                     >
                        {Array.from(new Array(numPages), (el, index) => (
                           <div
                            key={`page_${index + 1}`}
                            className={cn("relative shadow-lg", isPlacing && "cursor-crosshair")}
                            onClick={(e) => handlePreviewClick(e, index + 1)}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                           >
                            <Page 
                                pageNumber={index + 1}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                            {renderSignatureFields(index + 1)}
                           </div>
                        ))}
                    </Document>
                )}
               
            </div>
        </TooltipProvider>
    );
}
