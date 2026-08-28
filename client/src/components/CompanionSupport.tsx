/**
 * Design: „Ruhiger Wegweiser“ — kompakte Hilfen mit Papiermaterial,
 * tiefem Petrol und klaren, großen mobilen Aufklappzielen.
 */
import { Check, ShieldCheck, Wifi } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type CompanionSupportProps = { hotspotImage: string };

const faqs = [
  {
    question: "Brauche ich im Außendienst Internet?",
    answer: "Nur die erste Installation benötigt Internet, damit Homebrew, Node.js, mkcert und die benötigten lokalen Abhängigkeiten eingerichtet werden. Die Companion-Dateien sind bereits im macOS-Paket enthalten. Danach können Laptop und Mobilgerät über den eigenen Laptop-/Mac-Hotspot oder einen privaten Reiserouter lokal miteinander verbunden werden.",
  },
  {
    question: "macOS meldet, dass der Companion-Installer nicht geöffnet wurde – was nun?",
    answer: "Diese Gatekeeper-Meldung hält heruntergeladene .command-Dateien vorsorglich an. Deaktiviere die macOS-Sicherheit nicht und nutze keine Terminal-Umgehung. Lade das ZIP nur über den SignLocal-Download, prüfe den exakten Dateinamen und öffne die entpackte Datei im Finder mit gedrückter Control-Taste über „Öffnen“. Bestätige den folgenden Dialog nur, wenn Name und Quelle stimmen; damit gibst du bewusst nur diese eine Datei frei und Gatekeeper bleibt aktiv.",
  },
  {
    question: "Bleiben PDF und Unterschrift wirklich lokal?",
    answer: "Ja. Das PDF bleibt auf dem Computer. Das Mobilgerät sendet ausschließlich die gezeichnete Unterschrift über die lokale verschlüsselte Verbindung zurück. Es wird keine PDF und keine Unterschrift an einen Cloud-Dienst hochgeladen.",
  },
  {
    question: "Kann ein iPad im Büro für mehrere Unterschriften bereitstehen?",
    answer: "Ja. Bereite das Büro-Signaturpad einmal per QR-Code vor und lasse die lokale Pad-Seite sichtbar und entsperrt. Bei „Unterschrift am Büro-Pad anfordern“ erscheint die Aufforderung direkt auf diesem Gerät. Nach Codevergleich, Signatur und „Fertig ✓“ ist es wieder bereit. Eine Fernöffnung aus dem Hintergrund oder Cloud-Benachrichtigung gibt es bewusst nicht.",
  },
  {
    question: "Darf ich ein Gäste- oder öffentliches WLAN verwenden?",
    answer: "Nein. Verwende nur einen eigenen Laptop-/Mac-Hotspot oder einen privaten Reiserouter. Öffentliche und Gäste-Netze sind bewusst ausgeschlossen, weil dort andere Personen im selben Netzwerk sein können.",
  },
  {
    question: "Was mache ich nach einem Wechsel des WLANs oder Hotspots?",
    answer: "Starte den lokalen Companion über den Desktop-Eintrag erneut. Er erkennt die aktuelle private Adresse und erstellt das lokale Zertifikat dafür neu. Prüfe anschließend die Zertifikatseinrichtung auf dem Mobilgerät, bevor du den QR-Code scannst.",
  },
];

export function CompanionSupport({ hotspotImage }: CompanionSupportProps) {
  return <section className="paper-card relative mt-8 overflow-hidden rounded-[1.7rem] border border-[#a7b9a6]/55 bg-[#fffdf8] shadow-sm" aria-label="Hilfe für lokale Offline-Nutzung">
    <div aria-hidden="true" className="absolute bottom-0 left-7 top-0 w-px bg-[#155e63]/35 sm:left-9"/>
    <div className="relative border-b border-[#d8d3c9]/70 p-5 pl-12 sm:p-7 sm:pl-16"><div aria-hidden="true" className="absolute left-3.5 top-7 flex items-center sm:left-5"><i className="block h-4 w-6 rotate-[-28deg] rounded-[80%_20%_80%_20%] border-2 border-[#155e63]/80"/><i className="-ml-1 block h-4 w-6 rotate-[28deg] rounded-[20%_80%_20%_80%] border-2 border-[#155e63]/80"/></div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#155e63]">Sicher unterwegs</p><h3 className="display mt-2 text-3xl leading-tight text-[#183234]">Offline nutzen, ohne zu rätseln.</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#506967]">Die Anleitung bleibt kompakt. Öffne genau den Abschnitt, den du gerade brauchst.</p></div>
    <Accordion type="single" collapsible className="relative px-5 pl-12 sm:px-7 sm:pl-16">
      <AccordionItem value="hotspot" className="border-[#d8d3c9]/70"><AccordionTrigger className="py-5 text-base font-bold text-[#183234] hover:no-underline"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-[#a7b9a6]/65 bg-[#eef2e9] text-[#155e63]"><Wifi size={18}/></span>Offline-Hotspot einrichten</span></AccordionTrigger><AccordionContent className="pb-6"><div className="overflow-hidden rounded-2xl border border-[#a7b9a6]/45 bg-[#eef2e9]"><img src={hotspotImage} alt="Mac als lokaler Hotspot, verbunden mit iPhone und iPad" className="h-auto w-full object-cover"/></div><ol className="mt-4 space-y-3"><li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#155e63]/35 bg-[#fffdf8] text-xs font-bold text-[#155e63]">1</span><p className="text-sm leading-6 text-[#506967]"><strong className="text-[#183234]">Eigenen Hotspot einschalten.</strong> Auf Windows „Mobiler Hotspot“, auf dem Mac „Internetfreigabe“ öffnen und ein eigenes Passwort festlegen.</p></li><li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#155e63]/35 bg-[#fffdf8] text-xs font-bold text-[#155e63]">2</span><p className="text-sm leading-6 text-[#506967]"><strong className="text-[#183234]">Mobilgerät verbinden.</strong> iPhone, iPad oder Android mit diesem eigenen Netzwerk verbinden – nie mit Gäste- oder öffentlichem WLAN.</p></li><li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#155e63]/35 bg-[#fffdf8] text-xs font-bold text-[#155e63]">3</span><p className="text-sm leading-6 text-[#506967]"><strong className="text-[#183234]">Companion starten und koppeln.</strong> Desktop-Start öffnen, die lokale Zertifikatseinrichtung durchführen, QR-Code scannen und den sechsstelligen Code auf beiden Geräten vergleichen.</p></li></ol></AccordionContent></AccordionItem>
      <AccordionItem value="certificate" className="border-[#d8d3c9]/70"><AccordionTrigger className="py-5 text-base font-bold text-[#183234] hover:no-underline"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-[#a7b9a6]/65 bg-[#eef2e9] text-[#155e63]"><ShieldCheck size={18}/></span>Browser zeigt eine Zertifikatswarnung</span></AccordionTrigger><AccordionContent className="pb-6"><div className="rounded-2xl border border-[#a7b9a6]/55 bg-[#eef2e9]/65 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#155e63]" size={20}/><div><p className="font-bold text-[#183234]">Nicht auf „Trotzdem fortfahren“ tippen.</p><p className="mt-1 text-sm leading-6 text-[#506967]">Eine Warnung bedeutet, dass die lokale Vertrauenskette noch nicht stimmt. Prüfe zuerst, ob Computer und Mobilgerät im selben eigenen Netzwerk sind, und öffne dann die lokale CA-Einrichtungsseite erneut.</p></div></div></div><ol className="mt-4 space-y-2 text-sm leading-6 text-[#506967]"><li className="flex gap-2"><Check className="mt-1 shrink-0 text-[#155e63]" size={16}/>Den Companion auf dem Computer erneut starten.</li><li className="flex gap-2"><Check className="mt-1 shrink-0 text-[#155e63]" size={16}/>Auf dem Mobilgerät die angezeigte öffentliche CA installieren und den Fingerabdruck mit dem Computer vergleichen.</li><li className="flex gap-2"><Check className="mt-1 shrink-0 text-[#155e63]" size={16}/>Auf iPhone/iPad die volle Vertrauensfreigabe für das Zertifikat aktivieren; erst dann die lokale HTTPS-Adresse öffnen.</li></ol></AccordionContent></AccordionItem>
      <AccordionItem value="faq" className="border-0"><AccordionTrigger className="py-5 text-base font-bold text-[#183234] hover:no-underline"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-[#a7b9a6]/65 bg-[#eef2e9] text-[#155e63]"><span className="text-sm font-black">?</span></span>FAQ für Außendienstmitarbeitende</span></AccordionTrigger><AccordionContent className="pb-6"><Accordion type="single" collapsible className="rounded-2xl border border-[#d8d3c9]/70 bg-white/65 px-4"><>{faqs.map((faq) => <AccordionItem value={faq.question} key={faq.question} className="border-[#d8d3c9]/70"><AccordionTrigger className="py-4 text-sm font-bold text-[#183234] hover:no-underline">{faq.question}</AccordionTrigger><AccordionContent className="pb-4 text-sm leading-6 text-[#506967]">{faq.answer}</AccordionContent></AccordionItem>)}</></Accordion></AccordionContent></AccordionItem>
    </Accordion>
  </section>;
}
