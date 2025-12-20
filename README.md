# SignLocal

SignLocal ist eine Offline-Anwendung zum digitalen Signieren von Dokumenten direkt auf Ihrem Computer. Sie können `.docx`- und `.pdf`-Dateien laden, Signaturfelder platzieren und das Endergebnis als signiertes PDF-Dokument exportieren. Da die Anwendung lokal läuft, verbleiben Ihre Dokumente stets auf Ihrem Rechner und werden nicht auf externe Server hochgeladen.

## Merkmale

*   **Lokale Verarbeitung**: Alle Dokumente werden lokal in Ihrem Browser verarbeitet. Es findet kein Upload auf Server statt.
*   **DOCX & PDF Unterstützung**: Laden Sie Word-Dokumente (`.docx`) oder PDF-Dateien (`.pdf`).
*   **Digitale Signaturen**: Platzieren Sie ein oder mehrere Signaturfelder. Sie können Ihre Signatur zeichnen, hochladen, einen Platzhalter verwenden oder ein Signotec-Pad nutzen.
*   **PDF-Export**: Speichern Sie das signierte Dokument als neue PDF-Datei.
*   **Druckfunktion**: Drucken Sie das signierte Dokument direkt aus der Anwendung.
*   **PWA-fähig**: Installieren Sie SignLocal als Desktop-Anwendung für einen schnellen Zugriff.

## Installation und lokaler Betrieb

Um SignLocal auf Ihrem Computer auszuführen, befolgen Sie bitte diese Schritte.

### Voraussetzungen

Stellen Sie sicher, dass auf Ihrem System [Node.js](https://nodejs.org/) (Version 18.x oder neuer) installiert ist.

### Schritte

1.  **Repository klonen**
    Öffnen Sie ein Terminal oder eine Kommandozeile und klonen Sie das Repository von GitHub:
    ```bash
    git clone https://github.com/mexx-bb/Signlocal.git
    cd Signlocal
    ```

2.  **Abhängigkeiten installieren**
    Installieren Sie die für den Betrieb notwendigen Pakete. Der `--production`-Flag sorgt dafür, dass nur die für die Ausführung notwendigen Pakete installiert werden.
    ```bash
    npm install --production
    ```

3.  **Anwendung bauen**
    Dieser Schritt kompiliert die Anwendung für die Produktion.
    ```bash
    npm run build
    ```

4.  **Anwendung starten**
    Starten Sie den lokalen Server:
    ```bash
    npm run start
    ```

5.  **Anwendung im Browser öffnen**
    Öffnen Sie Ihren Webbrowser und navigieren Sie zu der folgenden Adresse:
    [http://localhost:3000](http://localhost:3000)

Die Anwendung läuft nun vollständig offline auf Ihrem Computer. Sie können sie jederzeit verwenden, ohne eine Internetverbindung zu benötigen.
