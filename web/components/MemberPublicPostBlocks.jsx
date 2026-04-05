"use client";

export function PostBodyBlocks({ blocks, expanded, className }) {
  const list = Array.isArray(blocks) ? blocks : [];
  const wrapCls = expanded ? "space-y-3" : "space-y-2 max-h-[7.5rem] overflow-hidden";
  return (
    <div className={`text-sm leading-relaxed text-gray-700 ${wrapCls} ${className || ""}`}>
      {list.map((b, i) => {
        const t = String(b?.type || "").toLowerCase();
        if (t === "paragraph") {
          return (
            <p key={i} className="whitespace-pre-wrap break-words">
              {String(b.text ?? "")}
            </p>
          );
        }
        if (t === "image") {
          const url = String(b.url || "").trim();
          if (!/^https:\/\//i.test(url)) return null;
          return (
            <div key={i} className="overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="max-h-64 w-full object-contain" />
            </div>
          );
        }
        if (t === "link") {
          const url = String(b.url || "").trim();
          const label = String(b.label || url || "ลิงก์").trim();
          if (!/^https:\/\//i.test(url)) return null;
          return (
            <p key={i}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-rose-700 underline decoration-rose-400/50 hover:text-rose-900"
              >
                {label}
              </a>
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}

export function needsExpand(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  let len = 0;
  for (const b of list) {
    const t = String(b?.type || "").toLowerCase();
    if (t === "paragraph") len += String(b.text || "").length;
    if (t === "image" || t === "link") len += 80;
  }
  return len > 220 || list.some((b) => String(b?.type || "").toLowerCase() === "image");
}
