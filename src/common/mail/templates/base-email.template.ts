export function renderEmailTemplate(bodyHtml: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#0d1b2a">
      ${bodyHtml}
    </div>
  `;
}

export function emailButton(url: string, label: string): string {
  return `
    <p style="margin:24px 0">
      <a href="${url}" style="background:#123a63;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">${label}</a>
    </p>
  `;
}
