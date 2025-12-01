"use client";

import * as React from "react";
import { useState, type ChangeEvent, type DragEvent } from "react";
import { UploadCloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FileUploaderProps = {
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function FileUploader({ onFileChange }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const syntheticEvent = {
        target: { files: e.dataTransfer.files },
      } as unknown as ChangeEvent<HTMLInputElement>;
      onFileChange(syntheticEvent);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card
        className={cn("transition-all", isDragging ? "border-primary" : "")}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        aria-label="File Uploader"
      >
        <CardHeader>
          <CardTitle className="font-headline text-center">
            Start a new Signing Process
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg h-64 cursor-pointer hover:border-primary/80 transition-colors">
            <UploadCloud
              className={cn(
                "w-16 h-16 text-muted-foreground transition-colors",
                isDragging && "text-primary"
              )}
            />
            <p className="mt-4 text-lg font-semibold">
              Drag & drop your .docx file here
            </p>
            <p className="text-muted-foreground">or click to select a file</p>
            <Input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={onFileChange}
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
