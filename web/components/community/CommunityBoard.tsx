"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Megaphone, Pencil, Search, Pin, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CommunityNavigation } from "./CommunityNavigation";
import { BoardComposer, CATEGORY_LABELS } from "./BoardComposer";
import { useAuthStore } from "@/stores/authStore";
import { AccountError } from "@/lib/account";
import { BoardError, selectBoardPosts, type BoardCommand, type BoardPost, type BoardSnapshot } from "@/lib/board";
import { BOARD_STORAGE_KEY, loadBoard, submitBoardCommand } from "@/lib/boardApi";

function errorMessage(error: unknown) {
  if (error instanceof AccountError) return error.code === "credentials" ? "로그인 상태를 확인한 후 다시 시도해 주세요." : error.code === "conflict" ? "다른 창에서 수정된 글입니다. 새로고침 후 다시 시도해 주세요." : "요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  const messages: Record<string, string> = { login: "로그인 후 이용해 주세요.", forbidden: "이 작업을 수행할 권한이 없습니다.", not_found: "삭제되었거나 찾을 수 없는 글입니다.", conflict: "다른 창에서 수정된 글입니다. 새로고침 후 내용을 확인해 주세요.", comment_length: "댓글은 1~1,000자로 입력해 주세요.", comment_limit: "이 글은 댓글 수 제한에 도달했습니다.", invalid_response: "게시판 데이터를 불러오지 못했습니다. 다시 시도해 주세요." };
  return error instanceof BoardError ? messages[error.message] ?? "입력한 내용을 확인해 주세요." : "저장 공간 또는 연결 상태를 확인한 후 다시 시도해 주세요.";
}
export function CommunityBoard() {
  const locale = useLocale();
  const params = useSearchParams();
  const user = useAuthStore(s => s.user);
  const [snapshot, setSnapshot] = useState<BoardSnapshot>({ posts: [], canPublishNotice: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [category, setCategory] = useState(params.get("category") === "notice" ? "notice" : "all");
  const [query, setQuery] = useState(""); const [mine, setMine] = useState(false); const [sort, setSort] = useState("newest");
  const [shown, setShown] = useState(15);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("post"));
  const [composer, setComposer] = useState<{ ownerId: string; editing?: BoardPost } | null>(null);
  const [busy, setBusy] = useState(false); const lock = useRef(false); const generation = useRef(0);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [comment, setComment] = useState(""); const [editComment, setEditComment] = useState<string | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const selected = snapshot.posts.find(p => p.id === selectedId);
  const visible = useMemo(() => selectBoardPosts(snapshot.posts, { category, query, mine, userId: user?.id, sort }), [snapshot.posts, category, query, mine, user?.id, sort]);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try { const data = await loadBoard(); if (request === generation.current) { setSnapshot(data); setError(""); } }
    catch (e) { if (request === generation.current) setError(errorMessage(e)); }
    finally { if (request === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    setComposer(current => current?.ownerId === user?.id ? current : null); setComment(""); setEditComment(null); setConfirm(null); setSnapshot(s => ({ ...s, canPublishNotice: false }));
    void refresh();
    const storage = (event: StorageEvent) => { if (event.key === BOARD_STORAGE_KEY || event.key === null) void refresh(); };
    const focus = () => { if (!lock.current) void refresh(); };
    window.addEventListener("storage", storage); window.addEventListener("focus", focus);
    return () => { generation.current++; window.removeEventListener("storage", storage); window.removeEventListener("focus", focus); };
  }, [refresh, user?.id]);
  useEffect(() => { setCategory(params.get("category") === "notice" ? "notice" : "all"); setSelectedId(params.get("post")); }, [params]);
  useEffect(() => { setShown(15); }, [category, query, mine, sort]);
  useEffect(() => { setComment(""); setEditComment(null); setConfirm(null); if (selectedId) detailHeading.current?.focus(); }, [selectedId]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(""), 5000); return () => clearTimeout(timer); } }, [toast]);
  const select = (id: string | null) => {
    setSelectedId(id); setError("");
    const url = new URL(window.location.href); if (id) url.searchParams.set("post", id); else url.searchParams.delete("post");
    window.history.pushState(null, "", url);
  };
  const requireLogin = () => { if (user) return true; useAuthStore.getState().openAuthModal("login"); return false; };
  const mutate = async (command: BoardCommand) => {
    if (lock.current || !requireLogin()) return false;
    lock.current = true; setBusy(true); setError(""); const actorId = user?.id; const request = ++generation.current;
    try {
      const result = await submitBoardCommand(command);
      if (useAuthStore.getState().user?.id !== actorId) return false;
      if (request === generation.current) setSnapshot(result); else void refresh();
      setToast(command.type === "delete" || command.type === "deleteComment" ? "삭제되었습니다." : "저장되었습니다."); setConfirm(null); return true;
    } catch (e) { setError(errorMessage(e)); return false; }
    finally { lock.current = false; setBusy(false); setLoading(false); }
  };
  const date = (value: string) => new Date(value).toLocaleString(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const manageable = selected && user && (selected.authorId === user.id || snapshot.canPublishNotice) && (selected.category !== "notice" || snapshot.canPublishNotice);
  return <main className="min-h-screen bg-canvas"><SiteHeader /><section className="page-shell workspace-shell">
    <header className="workspace-heading"><div><p className="workspace-eyebrow">VOILA COMMUNITY</p><h1>{category === "notice" ? "공지사항" : "자유게시판"}</h1><p className="workspace-description">경험을 나누고, 함께 답을 찾아가는 공간. 상품 보유 여부와 관계없이 참여하세요.</p></div><button className="workspace-button primary" onClick={() => { if (requireLogin()) { setError(""); setComposer({ ownerId: user!.id }); } }}><Pencil className="h-4 w-4" />글쓰기</button></header>
    <CommunityNavigation active={category === "notice" ? "notice" : "board"} />
    {error && !composer && <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-hairline p-4 text-sm text-[#f3ad9e]">{error}<button className="workspace-button" onClick={() => void refresh()}>다시 불러오기</button></div>}
    {selectedId ? selected ? <article className="mx-auto max-w-4xl">
      <button className="workspace-text-link mb-6" onClick={() => select(null)}><ArrowLeft className="h-4 w-4" />목록으로</button>
      <div className="rounded-2xl border border-hairline bg-surface p-5 md:p-8"><p className="workspace-eyebrow">{selected.pinned && "상단 고정 · "}{CATEGORY_LABELS[selected.category]}</p><h2 ref={detailHeading} tabIndex={-1} className="mt-4 break-words text-2xl font-medium leading-snug text-white outline-none md:text-3xl">{selected.title}</h2><p className="mt-4 text-xs text-muted">{selected.authorName} · {date(selected.createdAt)}{selected.updatedAt && " · 수정됨"}</p><p className="my-8 whitespace-pre-wrap break-words text-sm leading-8 text-secondary">{selected.body}</p>
        <div className="flex flex-wrap gap-4 border-t border-hairline pt-5"><button className="workspace-text-link" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setToast("게시글 링크가 복사되었습니다."); } catch { setError("주소 표시줄의 링크를 복사해 주세요."); } }}>링크 복사</button>{manageable && <><button className="workspace-text-link" disabled={busy} onClick={() => { setError(""); setComposer({ ownerId: user!.id, editing: selected }); }}>수정</button><button className="workspace-text-link" disabled={busy} onClick={() => setConfirm("post")}>삭제</button></>}</div>
        {confirm === "post" && <div className="mt-4 rounded-xl border border-hairline p-4"><p className="text-sm">게시글과 댓글이 모두 삭제됩니다. 삭제할까요?</p><div className="mt-3 flex gap-3"><button disabled={busy} className="workspace-button" onClick={async () => { if (await mutate({ type: "delete", id: selected.id, revision: selected.revision })) select(null); }}>삭제 확인</button><button disabled={busy} className="workspace-button" onClick={() => setConfirm(null)}>취소</button></div></div>}
      </div>
      <section className="mt-8" aria-label="댓글"><h3 className="mb-5 text-lg text-white">댓글 <span className="text-gold-champagne">{selected.comments.length}</span></h3>
        {selected.comments.length === 0 && <p className="mb-6 text-sm text-muted">첫 댓글로 이야기를 이어가세요.</p>}
        <ul className="divide-y divide-hairline">{selected.comments.map(c => <li key={c.id} className="py-5"><div className="flex flex-wrap items-center gap-3 text-xs"><span className="font-medium text-secondary">{c.authorName}</span><time className="text-muted" dateTime={c.createdAt}>{date(c.createdAt)}{c.updatedAt && " · 수정됨"}</time></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-secondary">{c.body}</p>{user && (c.authorId === user.id || snapshot.canPublishNotice) && <div className="mt-3 flex gap-4"><button className="workspace-text-link" disabled={busy} onClick={() => { setEditComment(c.id); setComment(c.body); }}>댓글 수정</button><button className="workspace-text-link" disabled={busy} onClick={() => setConfirm(c.id)}>댓글 삭제</button></div>}{confirm === c.id && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span>댓글을 삭제할까요?</span><button className="workspace-button" disabled={busy} onClick={() => void mutate({ type: "deleteComment", id: selected.id, commentId: c.id, revision: selected.revision })}>삭제 확인</button><button className="workspace-button" disabled={busy} onClick={() => setConfirm(null)}>취소</button></div>}</li>)}</ul>
        <form className="mt-6 rounded-xl border border-hairline p-4" onSubmit={async e => { e.preventDefault(); if (await mutate(editComment ? { type: "editComment", id: selected.id, commentId: editComment, body: comment, revision: selected.revision } : { type: "comment", id: selected.id, body: comment })) { setComment(""); setEditComment(null); } }}><label className="text-sm text-secondary">{editComment ? "댓글 수정" : "댓글 작성"}<textarea disabled={busy} required maxLength={1000} rows={3} value={comment} onChange={e => setComment(e.target.value)} className="mt-2 w-full rounded-lg border border-hairline bg-obsidian p-3 text-white" placeholder={user ? "서로를 존중하는 댓글을 남겨주세요." : "로그인 후 댓글을 남길 수 있습니다."} /></label><div className="mt-3 flex flex-wrap items-center gap-3"><span className="mr-auto text-xs text-muted">{comment.length} / 1,000</span>{editComment && <button type="button" className="workspace-button" onClick={() => { setEditComment(null); setComment(""); }}>수정 취소</button>}{user ? <button disabled={busy || !comment.trim()} className="workspace-button primary">{busy ? "저장 중…" : editComment ? "댓글 수정 완료" : "댓글 등록"}</button> : <button type="button" className="workspace-button primary" onClick={requireLogin}>로그인</button>}</div></form>
      </section>
    </article> : <div className="workspace-empty" role="status"><p>{loading ? "게시글을 불러오는 중…" : "삭제되었거나 찾을 수 없는 게시글입니다."}</p><button className="workspace-button" onClick={() => select(null)}>목록으로</button></div> : <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]"><div className="min-w-0">
      <div className="workspace-toolbar"><label className="workspace-search"><Search className="h-4 w-4 shrink-0" /><input aria-label="게시글 검색" placeholder="제목, 내용, 작성자 검색" value={query} onChange={e => setQuery(e.target.value)} /></label><select className="workspace-select" aria-label="게시글 정렬" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">최신순</option><option value="oldest">오래된순</option><option value="discussed">댓글 많은순</option></select><button className="workspace-button" disabled={loading || busy} aria-label="게시판 새로고침" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" /></button></div>
      <div className="mb-5 flex flex-wrap gap-2">{[["all", "전체"], ...Object.entries(CATEGORY_LABELS)].map(([k, label]) => <button key={k} aria-pressed={category === k} className={`rounded-full border px-4 py-2 text-xs ${category === k ? "border-gold-champagne text-gold-champagne" : "border-hairline text-muted"}`} onClick={() => setCategory(k)}>{label}</button>)}<button aria-pressed={mine} className={`rounded-full border px-4 py-2 text-xs ${mine ? "border-gold-champagne text-gold-champagne" : "border-hairline text-muted"}`} onClick={() => { if (requireLogin()) setMine(!mine); }}>내 글</button></div>
      <p className="mb-4 text-xs text-muted" role="status">{loading ? "불러오는 중…" : `${visible.length.toLocaleString()}개의 이야기`}</p>
      {!loading && !visible.length ? <div className="workspace-empty"><MessageSquare className="mx-auto mb-4 h-8 w-8 text-muted" /><h2>{query || mine ? "검색 결과가 없습니다" : category === "notice" ? "등록된 공지사항이 없습니다" : "첫 이야기를 기다리고 있어요"}</h2><p>{query || mine ? "검색어 또는 분류를 변경해 보세요." : category === "notice" ? "운영 소식과 주요 안내를 이곳에서 확인할 수 있습니다." : "질문도, 작은 발견도 좋아요. 자유롭게 글을 남겨보세요."}</p>{(query || mine || category !== "all") && <button className="workspace-button" onClick={() => { setQuery(""); setMine(false); setCategory("all"); }}>전체 글 보기</button>}</div> : <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface">{visible.slice(0, shown).map(p => <li key={p.id}><button className="w-full p-5 text-left transition hover:bg-elevation md:p-6" onClick={() => select(p.id)}><div className="flex items-center gap-2 text-xs text-gold-champagne">{p.pinned && <Pin className="h-3 w-3" />}{CATEGORY_LABELS[p.category]}{p.authorId === user?.id && <span className="text-muted">· 내 글</span>}</div><h2 className="mt-3 break-words text-base font-medium text-white">{p.title}</h2><p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-muted">{p.body}</p><div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted"><span>{p.authorName}</span><time dateTime={p.createdAt}>{date(p.createdAt)}</time><span className="ml-auto flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{p.comments.length}</span></div></button></li>)}</ul>}
      {shown < visible.length && <button className="workspace-button mx-auto mt-6" onClick={() => setShown(n => n + 15)}>더 보기 ({visible.length - shown})</button>}
    </div><aside className="h-fit rounded-2xl border border-hairline bg-surface p-6"><Megaphone className="mb-4 h-6 w-6 text-gold-champagne" /><h2 className="text-lg text-white">함께 만드는 커뮤니티</h2><p className="mt-3 text-sm leading-7 text-muted">자유게시판은 모든 회원에게 열려 있습니다. 상품 후기는 100 USDT 이상 당첨 상품으로 작성할 수 있습니다.</p><div className="mt-5 border-t border-hairline pt-5 text-sm leading-7 text-secondary">서로를 존중해 주세요.<br />개인정보·거래 정보는 올리지 마세요.<br />광고·도배·사칭은 제한됩니다.</div><button className="workspace-text-link mt-5" onClick={() => { setCategory("notice"); setQuery(""); setMine(false); }}>공지사항 확인 →</button></aside></div>}
  </section>{composer && user && composer.ownerId === user.id && <BoardComposer key={`${user.id}:${composer.editing?.id ?? "new"}`} userId={user.id} editing={composer.editing} canPublishNotice={snapshot.canPublishNotice} busy={busy} error={error} onClose={() => setComposer(null)} onSave={async draft => { const ok = await mutate(composer.editing ? { type: "edit", id: composer.editing.id, revision: composer.editing.revision, draft } : { type: "create", draft }); if (ok) { setComposer(null); if (!composer.editing) { setCategory(draft.category); setMine(false); setQuery(""); setSort("newest"); select(null); } } return ok; }} />}{toast && <div className="workspace-toast" role="status">{toast}</div>}</main>;
}
