/**
 * Saves a signed file under `fileName` (QA-B-15: a cross-origin link saved as "file.pdf").
 * Fetches the bytes and saves them through a blob link; when the storage does not allow that
 * (no CORS), it opens the link instead — the API's `downloadUrl` already asks for an attachment.
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
