export type PdfShareResult = "shared" | "cancelled" | "unavailable";

type ShareCapableNavigator = Pick<Navigator, "share" | "canShare">;

export async function sharePdfWithDevice(pdf: Blob, name: string, deviceNavigator: ShareCapableNavigator | undefined = typeof navigator === "undefined" ? undefined : navigator): Promise<PdfShareResult> {
  if (!deviceNavigator?.share) return "unavailable";
  const file = new File([pdf], name, { type: "application/pdf" });
  const data = { files: [file], title: name, text: "Signiertes PDF aus Signlocal" };
  try {
    if (deviceNavigator.canShare && !deviceNavigator.canShare(data)) return "unavailable";
    await deviceNavigator.share(data);
    return "shared";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "unavailable";
  }
}
