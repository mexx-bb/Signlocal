"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, Eraser } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

type SignaturePadProps = {
  fieldName: string;
  onSave: (signatureDataUrl: string) => void;
};

// A simple hook for handling the signature canvas
const useSignatureCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    return canvas?.getContext("2d") || null;
  };
  
  useEffect(() => {
    const context = getCanvasContext();
    if(context) {
      context.lineCap = "round";
      context.strokeStyle = "#000";
      context.lineWidth = 3;
    }
  }, []);

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = nativeEvent;
    const context = getCanvasContext();
    if (context) {
      context.beginPath();
      context.moveTo(offsetX, offsetY);
      setIsDrawing(true);
    }
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const context = getCanvasContext();
    if (context) {
      context.lineTo(offsetX, offsetY);
      context.stroke();
    }
  };

  const stopDrawing = () => {
    const context = getCanvasContext();
    if (context) {
      context.closePath();
      setIsDrawing(false);
    }
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = getCanvasContext();
    if(canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  const getSignatureData = () => {
    const canvas = canvasRef.current;
    return canvas?.toDataURL("image/png");
  }

  return { canvasRef, startDrawing, draw, stopDrawing, clearCanvas, getSignatureData };
};

export function SignaturePad({ fieldName, onSave }: SignaturePadProps) {
  const [activeTab, setActiveTab] = useState("draw");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { canvasRef, startDrawing, draw, stopDrawing, clearCanvas, getSignatureData } = useSignatureCanvas();
  const signaturePlaceholder = PlaceHolderImages.find(img => img.id === 'signature-placeholder');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };
  
  const handleSave = () => {
     let signatureDataUrl: string | undefined;
     if (activeTab === "draw") {
        signatureDataUrl = getSignatureData();
     } else if (activeTab === 'upload' && uploadedImage) {
        signatureDataUrl = uploadedImage;
     } else if(activeTab === 'placeholder' && signaturePlaceholder) {
        signatureDataUrl = signaturePlaceholder.imageUrl;
     }

     if (signatureDataUrl) {
       onSave(signatureDataUrl);
     }
  }

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="font-headline">
          Provide Signature for {fieldName}
        </DialogTitle>
      </DialogHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="draw">Draw</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="placeholder">Use Placeholder</TabsTrigger>
        </TabsList>
        <TabsContent value="draw">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={550}
              height={200}
              className="bg-muted rounded-md cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
             <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={clearCanvas}>
                <Eraser className="h-5 w-5"/>
                <span className="sr-only">Clear canvas</span>
             </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Draw your signature in the box above.</p>
        </TabsContent>
        <TabsContent value="upload">
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg h-[200px]">
            {uploadedImage ? (
                <Image src={uploadedImage} alt="Uploaded signature preview" width={200} height={100} className="max-h-full object-contain" />
            ) : (
                <>
                    <UploadCloud className="w-12 h-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Upload an image of your signature</p>
                </>
            )}
            <Input type="file" accept="image/*" onChange={handleImageUpload} className="mt-4"/>
          </div>
        </TabsContent>
        <TabsContent value="placeholder">
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg h-[200px] bg-muted">
                {signaturePlaceholder && (
                    <Image src={signaturePlaceholder.imageUrl} alt="Placeholder signature" width={300} height={150} data-ai-hint={signaturePlaceholder.imageHint} />
                )}
                <p className="mt-4 text-sm text-muted-foreground">A placeholder signature will be used.</p>
            </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <DialogClose asChild>
            <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">Save Signature</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
