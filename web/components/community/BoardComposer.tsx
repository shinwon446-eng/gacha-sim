"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useModal } from "@/lib/useModal";
import { validateDraft, type BoardDraft, type BoardPost } from "@/lib/board";
export const CATEGORY_LABELS = { general: "자유", question: "질문", tips: "정보·팁", notice: "공지사항" };
export function BoardComposer({ userId, editing, canPublishNotice, busy, error, onClose, onSave }: {
  userId: string; editing?: BoardPost; canPublishNotice: boolean; busy: boolean; error: string;
  onClose: () => void; onSave: (draft: BoardDraft) => Promise<boolean>;
}) {
  const key = `voila.board-draft.${userId}.${editing?.id ?? "new"}`;
  const [draft, setDraft] = useState<BoardDraft>(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(key) ?? "null"); if (saved && typeof saved.title === "string" && typeof saved.body === "string" && Object.keys(CATEGORY_LABELS).includes(saved.category)) return { ...saved, pinned: saved.pinned === true }; } catch { /* The form is still usable when draft storage is unavailable. */ }
    return { title: editing?.title ?? "", body: editing?.body ?? "", category: editing?.category ?? "general", pinned: editing?.pinned ?? false };
  });
  const [draftStatus, setDraftStatus] = useState("");
  const [validation, setValidation] = useState("");
  const [discard, setDiscard] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const saved = useRef(false);
  const close = () => { if (!busy) onClose(); };
  useModal(true, close, panel);
  useEffect(() => {
    if (saved.current) return;
    try { sessionStorage.setItem(key, JSON.stringify(draft)); setDraftStatus("작성 중인 내용이 임시 저장되었습니다."); }
    catch { setDraftStatus("임시 저장 공간이 부족합니다. 닫기 전에 내용을 복사해 주세요."); }
  }, [key, draft]);
  return <div className="fixed inset-0 z-[120] overflow-y-auto bg-obsidian/85 px-3 py-6 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && close()}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="board-composer-title" tabIndex={-1} className="relative mx-auto max-w-2xl rounded-2xl border border-hairline bg-surface p-6 outline-none md:p-8">
      <button className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center" aria-label="글쓰기 닫기" onClick={close} disabled={busy}><X className="h-5 w-5" /></button>
      <p className="workspace-eyebrow">VOILA COMMUNITY</p><h2 id="board-composer-title" className="mt-3 text-2xl text-white">{editing ? "게시글 수정" : "새 이야기 쓰기"}</h2>
      <p className="mt-3 text-sm leading-6 text-secondary">궁금한 점과 발견한 정보, 일상의 이야기를 나눠보세요. 개인정보와 지갑 주소는 공개하지 마세요.</p>
      <form className="mt-6 grid gap-5" onSubmit={async e => {
        e.preventDefault(); if (busy) return;
        try { validateDraft(draft, { id: userId, name: "", canPublishNotice }); } catch { setValidation("제목은 2~100자, 본문은 5~10,000자로 입력해 주세요. 공지사항은 운영자만 작성할 수 있습니다."); return; }
        setValidation(""); if (await onSave(draft)) { saved.current = true; try { sessionStorage.removeItem(key); } catch {} }
      }}>
        <label className="text-sm text-secondary">분류<select className="workspace-select mt-2 w-full" value={draft.category} disabled={busy} onChange={e => setDraft({ ...draft, category: e.target.value as BoardDraft["category"], pinned: false })}>{Object.entries(CATEGORY_LABELS).filter(([k]) => k !== "notice" || canPublishNotice).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
        {draft.category === "notice" && canPublishNotice && <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.pinned} disabled={busy} onChange={e => setDraft({ ...draft, pinned: e.target.checked })} />목록 상단에 고정</label>}
        <label className="text-sm text-secondary">제목<input autoComplete="off" required minLength={2} maxLength={100} value={draft.title} disabled={busy} onChange={e => setDraft({ ...draft, title: e.target.value })} className="mt-2 w-full rounded-xl border border-hairline bg-obsidian p-3 text-white" /><span className="mt-1 block text-right text-xs text-muted">{draft.title.length} / 100</span></label>
        <label className="text-sm text-secondary">본문<textarea required minLength={5} maxLength={10000} rows={10} value={draft.body} disabled={busy} onChange={e => setDraft({ ...draft, body: e.target.value })} className="mt-2 w-full rounded-xl border border-hairline bg-obsidian p-4 leading-7 text-white" /><span className="mt-1 block text-right text-xs text-muted">{draft.body.length.toLocaleString()} / 10,000</span></label>
        <p className="text-xs text-muted" role="status">{draftStatus}</p>
        {(error || validation) && <p role="alert" className="text-sm text-[#f3ad9e]">{error || validation}</p>}
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="workspace-button primary">{busy ? "저장 중…" : editing ? "수정 완료" : "게시하기"}</button><button type="button" disabled={busy} onClick={close} className="workspace-button">닫기</button><button type="button" disabled={busy} className="workspace-text-link ml-auto" onClick={() => setDiscard(true)}>임시 글 삭제</button></div>
        {discard && <div className="rounded-xl border border-hairline p-4"><p className="text-sm">작성 중인 내용을 삭제하고 닫을까요?</p><div className="mt-3 flex gap-3"><button type="button" className="workspace-button" onClick={() => setDiscard(false)}>계속 작성</button><button type="button" className="workspace-button" onClick={() => { try { sessionStorage.removeItem(key); saved.current = true; onClose(); } catch { setDraftStatus("임시 글을 삭제하지 못했습니다. 다시 시도해 주세요."); } }}>삭제하고 닫기</button></div></div>}
      </form>
    </div>
  </div>;
}
