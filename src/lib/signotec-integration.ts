/**
 * Signotec Pad Integration
 * 
 * Diese Datei enthält die Integration für Signotec Unterschriften-Pads.
 * Signotec bietet verschiedene APIs:
 * - Signotec Browser Plugin (ActiveX für IE, NPAPI für andere Browser)
 * - Signotec Web API (über lokalen Service)
 * - Signotec JavaScript SDK
 */

// Typen für Signotec Pad
export interface SignotecPad {
  isAvailable: boolean;
  capture: () => Promise<SignotecSignature>;
  clear: () => void;
}

export interface SignotecSignature {
  imageData: string; // Base64 encoded PNG
  timestamp: Date;
  width: number;
  height: number;
}

/**
 * Prüft, ob ein Signotec Pad verfügbar ist (asynchron)
 * 
 * Hinweis: STPadServer läuft oft auf Port 49494, aber verwendet möglicherweise
 * kein HTTP-Protokoll. Die Erkennung basiert daher hauptsächlich auf:
 * - Browser-Plugins
 * - JavaScript-APIs
 * - Geräte-Erkennung über Windows-APIs (nur im Backend möglich)
 */
export async function checkSignotecPadAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  console.log('Prüfe Signotec Pad Verfügbarkeit...');

  // Methode 1: Prüfe auf STPadServerLib (offizielle JavaScript-Bibliothek)
  // @ts-ignore
  const STPadServerLib = window.STPadServerLib;
  // @ts-ignore
  const STPadServerLibDefault = window.STPadServerLibDefault;
  // @ts-ignore
  const STPadServerLibApi = window.STPadServerLibApi;
  
  if (STPadServerLib || STPadServerLibDefault || STPadServerLibApi) {
    console.log('STPadServerLib gefunden!', {
      STPadServerLib: !!STPadServerLib,
      STPadServerLibDefault: !!STPadServerLibDefault,
      STPadServerLibApi: !!STPadServerLibApi
    });
    
    // Wenn die Bibliothek vorhanden ist, geben wir true zurück
    // Die tatsächliche Verbindung wird beim Erfassen der Signatur hergestellt
    // Dies ermöglicht es, den Tab anzuzeigen, auch wenn STPadServer noch nicht läuft
    return true;
  }

  // Methode 2: Prüfe auf Signotec Browser Plugin (Legacy)
  try {
    // ActiveX für Internet Explorer (Legacy)
    // @ts-ignore
    const signotec = new ActiveXObject('Signotec.SignaturePad');
    if (signotec) {
      console.log('Signotec ActiveX Plugin gefunden');
      return true;
    }
  } catch (e) {
    // ActiveX nicht verfügbar (normal in modernen Browsern)
  }

  // NPAPI Plugin für andere Browser (Legacy)
  // @ts-ignore
  if (navigator.plugins && navigator.plugins['Signotec Signature Pad']) {
    console.log('Signotec NPAPI Plugin gefunden');
    return true;
  }

  // Prüfe auf andere globale Signotec-Objekte
  // @ts-ignore
  if (window.Signotec || window.signotec || (window as any).SignotecPlugin) {
    console.log('Signotec JavaScript API gefunden');
    return true;
  }

  // Methode 3: Prüfe auf Signotec Web API (lokaler Service) - asynchron
  // Prüfe verschiedene Ports und Endpoints
  // STPadServer verwendet oft Port 49494
  const ports = [49494, 8080, 8081, 8082, 5000, 9000];
  const endpoints = ['/signotec/status', '/api/status', '/status', '/', '/api', '/signotec'];
  
  for (const port of ports) {
    for (const endpoint of endpoints) {
      try {
        // Verwende Promise.race für Timeout (kompatibler als AbortSignal.timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 500);
        
        const response = await fetch(`http://localhost:${port}${endpoint}`, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok || response.status === 404 || response.status === 405) {
          // Server antwortet, auch wenn Endpoint nicht existiert
          console.log(`Signotec API gefunden auf Port ${port}${endpoint}`);
          return true;
        }
      } catch (e) {
        // Port nicht erreichbar oder Timeout, weiter zum nächsten
        // Ignoriere Fehler still
      }
    }
  }

  // Methode 4: Prüfe auf Custom Event API
  // @ts-ignore
  if (window.signotecCapture) {
    console.log('Signotec Custom Event API gefunden');
    return true;
  }

  console.log('Signotec Pad nicht erkannt');
  return false;
}

/**
 * Erfasst eine Signatur vom Signotec Pad
 */
export async function captureSignotecSignature(): Promise<SignotecSignature | null> {
  if (typeof window === 'undefined') {
    console.log('captureSignotecSignature: window ist undefined (Server-Side Rendering)');
    return null;
  }

  console.log('captureSignotecSignature: Starte Erfassung...');
  console.log('Verfügbare globale Objekte:', {
    STPadServerLib: !!(window as any).STPadServerLib,
    STPadServerLibDefault: !!(window as any).STPadServerLibDefault,
    STPadServerLibApi: !!(window as any).STPadServerLibApi,
    Signotec: !!(window as any).Signotec,
    SignotecPlugin: !!(window as any).SignotecPlugin,
  });

  try {
    // Methode 1: STPadServerLib (offizielle Signotec JavaScript-Bibliothek)
    // WICHTIG: Die API läuft client-seitig im Browser, nicht server-seitig!
    // @ts-ignore
    const STPadServerLib = window.STPadServerLib;
    
    if (!STPadServerLib) {
      throw new Error('STPadServerLib nicht geladen. Stellen Sie sicher, dass /STPadServerLib.js im HTML eingebunden ist.');
    }
    
    // @ts-ignore
    const STPadServerLibDefault = STPadServerLib.STPadServerLibDefault;
    // @ts-ignore
    const STPadServerLibCommons = STPadServerLib.STPadServerLibCommons;
    
    if (!STPadServerLibDefault || !STPadServerLibCommons) {
      throw new Error('STPadServerLibDefault oder STPadServerLibCommons nicht verfügbar. Bitte prüfen Sie die Bibliothek-Version.');
    }
    
    console.log('STPadServerLib gefunden, initialisiere Verbindung...');
    
    // Erstelle WebSocket-Verbindung zu STPadServer
    // WICHTIG: ws://localhost:49494 (nicht wss://, es sei denn SSL-Zertifikat ist installiert)
    const wsUrl = "ws://localhost:49494";
    
    // Prüfe ob bereits eine Verbindung existiert
    // @ts-ignore
    if (!STPadServerLibCommons._stPadServer) {
      console.log('Erstelle WebSocket-Verbindung zu:', wsUrl);
      
      // Erstelle WebSocket-Verbindung und warte auf erfolgreiche Verbindung
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('WebSocket-Verbindung Timeout: STPadServer.exe läuft möglicherweise nicht. Bitte starten Sie STPadServer.exe.'));
          }
        }, 5000); // 5 Sekunden Timeout
        
        // @ts-ignore
        STPadServerLibCommons.createConnection(
          wsUrl,
          () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              console.log('Signotec WebSocket verbunden');
              resolve();
            }
          },
          () => {
            console.log('Signotec WebSocket getrennt');
          },
          (error: any) => {
            console.error('Signotec WebSocket Fehler:', error);
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              reject(new Error(`WebSocket-Verbindung fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}. Stellen Sie sicher, dass STPadServer.exe läuft.`));
            }
          }
        );
      });
    } else {
      // @ts-ignore
      const ws = STPadServerLibCommons._stPadServer;
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('WebSocket-Verbindung bereits aktiv');
      } else {
        console.log('WebSocket existiert, aber nicht verbunden. Warte auf Verbindung...');
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket-Verbindung Timeout'));
          }, 5000);
          
          // @ts-ignore
          const ws = STPadServerLibCommons._stPadServer;
          if (ws) {
            ws.onopen = () => {
              clearTimeout(timeout);
              console.log('WebSocket verbunden');
              resolve();
            };
            ws.onerror = (error: any) => {
              clearTimeout(timeout);
              reject(new Error(`WebSocket-Fehler: ${error?.message || 'Unbekannter Fehler'}`));
            };
          } else {
            clearTimeout(timeout);
            reject(new Error('WebSocket-Objekt nicht gefunden'));
          }
        });
      }
    }
    
    // Suche nach Pads (USB)
    console.log('Suche nach Signotec Pads...');
    // @ts-ignore
    const searchParams = new STPadServerLibDefault.Params.searchForPads();
    searchParams.setPadSubset('USB');
    const pads = await STPadServerLibDefault.searchForPads(searchParams);
    
    if (!pads || !pads.foundPads || pads.foundPads.length === 0) {
      throw new Error('Kein Signotec Pad gefunden. Bitte stellen Sie sicher, dass das Pad angeschlossen ist.');
    }
    
    console.log(`Gefunden: ${pads.foundPads.length} Pad(s)`);
    const padIndex = 0; // Verwende erstes gefundenes Pad
    
    // Öffne Pad
    console.log('Öffne Pad...');
    // @ts-ignore
    const openParams = new STPadServerLibDefault.Params.openPad(padIndex);
    const padInfo = await STPadServerLibDefault.openPad(openParams);
    
    console.log('Pad geöffnet:', padInfo);
    
    // Starte Signatur-Erfassung
    // @ts-ignore
    const signatureParams = new STPadServerLibDefault.Params.startSignature();
    signatureParams.setFieldName('SignLocal Signature');
    signatureParams.setCustomText('Bitte signieren Sie auf dem Pad');
    
    console.log('Starte Signatur-Erfassung...');
    
    // Warte auf Signatur-Bestätigung (wird über Callback empfangen)
    return await new Promise<SignotecSignature>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // @ts-ignore
        const closeParams = new STPadServerLibDefault.Params.closePad(padIndex);
        STPadServerLibDefault.closePad(closeParams).catch(console.error);
        reject(new Error('Timeout: Keine Signatur empfangen (60 Sekunden)'));
      }, 60000); // 60 Sekunden Timeout
      
      // Callback für Signatur-Bestätigung
      // @ts-ignore
      STPadServerLibDefault.handleConfirmSignature = async (message: any) => {
        try {
          clearTimeout(timeout);
          console.log('Signatur bestätigt, hole Bild...');
          
          // Hole Signatur-Bild
          // @ts-ignore
          const imageParams = new STPadServerLibDefault.Params.getSignatureImage();
          // @ts-ignore
          imageParams.setFileType(STPadServerLibDefault.FileType.PNG);
          imageParams.setPenWidth(5);
          const signatureImage = await STPadServerLibDefault.getSignatureImage(imageParams);
          
          console.log('Signatur-Bild erhalten');
          
          // Schließe Pad
          // @ts-ignore
          const closeParams = new STPadServerLibDefault.Params.closePad(padIndex);
          await STPadServerLibDefault.closePad(closeParams);
          
          resolve({
            imageData: `data:image/png;base64,${signatureImage.file}`,
            timestamp: new Date(),
            width: padInfo.padInfo?.displayWidth || 550,
            height: padInfo.padInfo?.displayHeight || 200,
          });
        } catch (error) {
          reject(error);
        }
      };
      
      // Callback für Signatur-Abbruch
      // @ts-ignore
      STPadServerLibDefault.handleCancelSignature = () => {
        clearTimeout(timeout);
        // @ts-ignore
        const closeParams = new STPadServerLibDefault.Params.closePad(padIndex);
        STPadServerLibDefault.closePad(closeParams).catch(console.error);
        reject(new Error('Signatur wurde abgebrochen'));
      };
      
      // Starte Signatur-Erfassung
      STPadServerLibDefault.startSignature(signatureParams)
        .catch((error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
    });

    // Methode 2: Signotec Browser Plugin (Legacy)
    // @ts-ignore
    const signotec = window.Signotec || (window as any).SignotecPlugin;
    
    if (signotec && signotec.CaptureSignature) {
      const result = await new Promise<SignotecSignature>((resolve, reject) => {
        signotec.CaptureSignature(
          (imageData: string, width: number, height: number) => {
            resolve({
              imageData: `data:image/png;base64,${imageData}`,
              timestamp: new Date(),
              width,
              height,
            });
          },
          (error: string) => {
            reject(new Error(error));
          }
        );
      });
      return result;
    }

    // Methode 2: Signotec Web API (lokaler Service)
    // Versuche verschiedene Ports und Endpoints
    // STPadServer verwendet oft Port 49494
    const ports = [49494, 8080, 8081, 8082, 5000, 9000];
    const endpoints = ['/signotec/capture', '/api/capture', '/capture', '/signature/capture', '/signature', '/api/signature'];
    
    for (const port of ports) {
      for (const endpoint of endpoints) {
        try {
          // Verwende Promise.race für Timeout (kompatibler als AbortSignal.timeout)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(`http://localhost:${port}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            return {
              imageData: `data:image/png;base64,${data.imageData}`,
              timestamp: new Date(data.timestamp || Date.now()),
              width: data.width || 550,
              height: data.height || 200,
            };
          }
        } catch (e) {
          // Port/Endpoint nicht verfügbar oder Timeout, weiter zum nächsten
          continue;
        }
      }
    }

    // Methode 3: Fallback - Prüfe auf Custom Event API
    // Manche Signotec Pads senden Events
    return await new Promise<SignotecSignature | null>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      const handler = (event: CustomEvent) => {
        clearTimeout(timeout);
        window.removeEventListener('signotec-signature', handler as EventListener);
        resolve({
          imageData: `data:image/png;base64,${event.detail.imageData}`,
          timestamp: new Date(),
          width: event.detail.width || 550,
          height: event.detail.height || 200,
        });
      };

      window.addEventListener('signotec-signature', handler as EventListener);
      
      // Trigger capture (falls API verfügbar)
      // @ts-ignore
      if (window.signotecCapture) {
        // @ts-ignore
        window.signotecCapture();
      }
    });

    // Wenn wir hier ankommen, wurde keine Methode erfolgreich
    console.warn('captureSignotecSignature: Keine Signotec-API konnte verwendet werden');
    throw new Error('Keine Signotec-API verfügbar. Bitte stellen Sie sicher, dass:\n- Die Signotec Software installiert und gestartet ist\n- Die STPadServerLib.js Datei geladen wurde (falls erforderlich)\n- Das Pad angeschlossen und erkannt ist');
  } catch (error) {
    console.error('Fehler beim Erfassen der Signotec Signatur:', error);
    // Wenn es ein bekannter Fehler ist, werfe ihn weiter
    if (error instanceof Error && error.message.includes('Keine Signotec-API verfügbar')) {
      throw error;
    }
    // Ansonsten gebe null zurück (für Fallback-Verhalten)
    return null;
  }
}

/**
 * Konvertiert Signotec Signatur-Daten in das Format für SignLocal
 */
export function convertSignotecToSignLocal(signotecSignature: SignotecSignature): string {
  // Die Signatur ist bereits im Base64 PNG Format
  return signotecSignature.imageData;
}

