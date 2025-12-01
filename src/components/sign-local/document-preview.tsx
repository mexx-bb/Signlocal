"use client";

import { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

type DocumentPreviewProps = {
    file: File;
};

export function DocumentPreview({ file }: DocumentPreviewProps) {
    const [html, setHtml] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    if (isLoading) {
        return (
            <div className="space-y-4 p-4 border rounded-md max-h-96 overflow-hidden">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/6" />
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
        <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md max-h-96 overflow-y-auto bg-white dark:bg-card">
            <style jsx global>{`
                .prose table { width: 100%; }
                .prose th, .prose td { border: 1px solid hsl(var(--border)); padding: 0.5rem; }
                .prose th { font-weight: bold; }
            `}</style>
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}
