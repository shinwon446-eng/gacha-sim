// Canvas / WebGL 기반 브라우저 fingerprint — 게스트 무료체험 어뷰징 방지용 세션 식별자.
// 개인 식별이 아닌 중복 수령 차단 목적이며, 해시만 서버로 전송한다.

export async function getFingerprint(): Promise<string> {
  try {
    const parts: string[] = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      String(new Date().getTimezoneOffset()),
      String(navigator.hardwareConcurrency ?? 0),
    ];

    // Canvas 렌더링 지문
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "16px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, 120, 30);
      ctx.fillStyle = "#069";
      ctx.fillText("GACHAFLIX🎰fp", 2, 2);
      ctx.strokeStyle = "rgba(102,204,0,0.7)";
      ctx.beginPath();
      ctx.arc(60, 30, 20, 0, Math.PI * 2);
      ctx.stroke();
      parts.push(canvas.toDataURL());
    }

    // WebGL 벤더/렌더러 지문
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        parts.push(
          String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)),
          String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)),
        );
      }
    }

    const data = new TextEncoder().encode(parts.join("|"));
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "fp-unavailable";
  }
}
