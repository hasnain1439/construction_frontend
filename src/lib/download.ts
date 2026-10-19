/**
 * Saves a signed file under `fileName` (QA-B-15: a cross-origin link saved as "file.pdf").
 * Export links are API links on every storage provider (R2-B-03: `/attachments/:id/file/<name>`,
 * streamed by the API with `Content-Disposition` naming the file, CORS allowed for the web app), so
 * the blob save works; if it still fails, opening the link saves it under the same name.
 */
export async function downloadFile(url: string, fileName: string, fetchFn?: typeof fetch): Promise<"saved" | "opened"> {
  try {
    const response = await (fetchFn ?? fetch)(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    return "saved";
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
    return "opened";
  }
}
