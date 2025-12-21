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
import { UploadCloud, Eraser, PenLine, Loader2 } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { checkSignotecPadAvailable, captureSignotecSignature } from "@/lib/signotec-integration";

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

  // State for Signotec Pad integration
  const [signotecStatus, setSignotecStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [signotecImage, setSignotecImage] = useState<string | null>(null);
  const [signotecError, setSignotecError] = useState<string | null>(null);
  const [signotecAvailable, setSignotecAvailable] = useState(false);

  // Prüfe Signotec Pad Verfügbarkeit beim Mount
  useEffect(() => {
    const checkPad = async () => {
      const available = await checkSignotecPadAvailable();
      setSignotecAvailable(available);
    };
    checkPad();
  }, []);


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSignotecCapture = async () => {
    setSignotecStatus('capturing');
    setSignotecError(null);
    setSignotecImage(null);

    try {
      // Prüfe zuerst, ob ein Pad verfügbar ist
      const isAvailable = await checkSignotecPadAvailable();
      console.log('Signotec Pad verfügbar:', isAvailable);
      
      if (!isAvailable) {
        throw new Error('Signotec Pad nicht erkannt. Bitte stellen Sie sicher, dass:\n- Die Signotec Software installiert und gestartet ist\n- Das Signotec Pad per USB angeschlossen ist\n- Die STPadServerLib.js Datei geladen wurde (falls erforderlich)');
      }

      console.log('Starte Signatur-Erfassung...');
      const signature = await captureSignotecSignature();
      console.log('Signatur-Ergebnis:', signature ? 'Erfolgreich' : 'Fehlgeschlagen');
      
      if (signature && signature.imageData) {
        setSignotecImage(signature.imageData);
        setSignotecStatus('success');
      } else {
        throw new Error('Die Signatur konnte nicht erfasst werden. Mögliche Ursachen:\n- Das Pad ist nicht angeschlossen oder nicht erkannt\n- Die Signotec Software läuft nicht\n- Die Verbindung zum Pad konnte nicht hergestellt werden\n- Bitte prüfen Sie die Browser-Konsole (F12) für weitere Details');
      }
    } catch (error) {
      console.error("Fehler bei der Signotec-Integration:", error);
      setSignotecStatus('error');
      if (error instanceof TypeError) {
        setSignotecError("Verbindung zum Signotec-Dienst fehlgeschlagen. Stellen Sie sicher, dass die Signotec Software läuft und das Pad angeschlossen ist.");
      } else if (error instanceof Error) {
        setSignotecError(error.message);
      } else {
        setSignotecError("Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
      }
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
     } else if (activeTab === 'signotec' && signotecImage) {
        signatureDataUrl = signotecImage;
     }

     if (signatureDataUrl) {
       onSave(signatureDataUrl);
     }
  }

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="font-headline">
          Signatur für {fieldName} bereitstellen
        </DialogTitle>
      </DialogHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="draw">Zeichnen</TabsTrigger>
          <TabsTrigger value="upload">Hochladen</TabsTrigger>
          <TabsTrigger value="placeholder">Platzhalter</TabsTrigger>
          <TabsTrigger value="signotec">Signotec Pad</TabsTrigger>
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
                <span className="sr-only">Leinwand leeren</span>
             </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Zeichnen Sie Ihre Signatur in das obige Feld.</p>
        </TabsContent>
        <TabsContent value="upload">
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg h-[200px]">
            {uploadedImage ? (
                <Image src={uploadedImage} alt="Vorschau der hochgeladenen Signatur" width={200} height={100} className="max-h-full object-contain" />
            ) : (
                <>
                    <UploadCloud className="w-12 h-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Laden Sie ein Bild Ihrer Signatur hoch</p>
                </>
            )}
            <Input type="file" accept="image/*" onChange={handleImageUpload} className="mt-4"/>
          </div>
        </TabsContent>
        <TabsContent value="placeholder">
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg h-[200px] bg-muted">
                {signaturePlaceholder && (
                    <Image src={signaturePlaceholder.imageUrl} alt="Platzhalter-Signatur" width={300} height={150} data-ai-hint={signaturePlaceholder.imageHint} />
                )}
                <p className="mt-4 text-sm text-muted-foreground">Es wird eine Platzhalter-Signatur verwendet.</p>
            </div>
        </TabsContent>
        <TabsContent value="signotec">
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg h-[200px] bg-muted">
            {signotecStatus === 'idle' && (
              <div className="text-center">
                  <PenLine className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="mt-2 text-sm text-muted-foreground mb-4">Bereit zur Erfassung der Signatur vom Signotec Pad.</p>
                  <Button onClick={handleSignotecCapture}>Signatur erfassen</Button>
              </div>
            )}
            {signotecStatus === 'capturing' && (
               <div className="text-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                  <p className="mt-4 text-sm font-semibold">Bitte auf dem Signatur-Pad unterschreiben...</p>
              </div>
            )}
             {signotecStatus === 'success' && signotecImage && (
              <div className="flex flex-col items-center gap-4">
                  <Image src={signotecImage} alt="Erfasste Signatur vom Pad" width={300} height={150} className="max-h-[120px] object-contain" />
                  <p className="text-sm text-green-600 font-semibold">Signatur erfolgreich erfasst!</p>
                  <Button onClick={handleSignotecCapture} variant="outline">Erneut erfassen</Button>
              </div>
            )}
            {signotecStatus === 'error' && (
               <div className="w-full">
                  <Alert variant="destructive">
                    <AlertTitle>Fehler bei der Erfassung</AlertTitle>
                    <AlertDescription>
                      {signotecError || 'Die Signatur konnte nicht vom Gerät gelesen werden.'}
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleSignotecCapture} className="mt-4 mx-auto block">Erneut versuchen</Button>
               </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Abbrechen</Button>
        </DialogClose>
        <DialogClose asChild>
            <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">Signatur speichern</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
