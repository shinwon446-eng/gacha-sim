"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Trash2 } from "lucide-react";
import { AccountError, ProfileError } from "@/lib/account";
import { AVATAR_MAX_FILE_BYTES, validAvatarData } from "@/lib/profilePolicy";
import { useAuthStore, type AuthUser } from "@/stores/authStore";
import { ProfileAvatar } from "./ProfileAvatar";

export function AvatarSettings({ user }: { user: AuthUser }) {
  const t = useTranslations("profileSettings");
  const a = useTranslations("account");
  const [pending, setPending] = useState<string | null>();
  const [image, setImage] = useState<HTMLImageElement>();
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const task = useRef(0);
  useEffect(() => () => { task.current++; }, []);
  useEffect(() => {
    if (!image) return;
    const size = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const canvas = document.createElement("canvas"); canvas.width = 384; canvas.height = 384;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setError(t("errors.avatar_invalid")); return; }
    ctx.fillStyle = "#17191b"; ctx.fillRect(0, 0, 384, 384);
    ctx.drawImage(image, (image.naturalWidth, size) * x / 100, (image.naturalHeight, size) * y / 100, size, size, 0, 0, 384, 384);
    setPending(canvas.toDataURL("image/jpeg", 0.85));
  }, [image, zoom, x, y, t]);
  const select = async (file?: File) => {
    if (!file) return;
    const token = ++task.current;
    setError(""); setSaved(false); setLoading(true); setPending(undefined); setImage(undefined);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > AVATAR_MAX_FILE_BYTES || !file.size) { setError(t("imageFormat")); setLoading(false); return; }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 40_000_000) throw new Error("dimensions");
      if (task.current !== token) return;
      setZoom(1); setX(50); setY(50); setImage(img);
    } catch { if (task.current === token) setError(t("errors.avatar_invalid")); }
    finally { URL.revokeObjectURL(url); if (task.current === token) setLoading(false); }
  };
  const cancel = () => { task.current++; setPending(undefined); setImage(undefined); setLoading(false); setError(""); };
  const save = async () => {
    if (busy || pending === undefined || (pending !== null && !validAvatarData(pending))) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      if (!await useAuthStore.getState().updateAvatar(pending)) throw new AccountError("credentials");
      setPending(undefined); setImage(undefined); setSaved(true);
    } catch (cause) { setError(cause instanceof ProfileError ? t(`errors.${cause.reason}`) : a(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
    <h3 className="text-lg font-semibold text-white">{t("avatarTitle")}</h3><p className="mt-2 text-sm leading-6 text-secondary">{t("avatarIntro")}</p>
    <div className="mt-6 flex flex-wrap items-center gap-5"><ProfileAvatar src={pending !== undefined ? pending : user.avatarUrl} name={t("avatarPreview")} className="h-24 w-24" /><div><label className="workspace-button relative cursor-pointer"><Camera className="h-4 w-4" />{t("chooseImage")}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("chooseImage")} disabled={busy || loading} onChange={e => { void select(e.target.files?.[0]); e.target.value = ""; }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label><p className="mt-2 text-xs leading-6 text-muted">{t("imageFormat")}</p></div></div>
    {image && <fieldset className="mt-5 grid max-w-lg gap-4" disabled={busy}><legend className="mb-3 text-sm font-semibold text-white">{t("cropTitle")}</legend>{[{ key: "zoom", value: zoom, set: setZoom, min: 1, max: 3, step: 0.05 }, { key: "horizontal", value: x, set: setX, min: 0, max: 100, step: 1 }, { key: "vertical", value: y, set: setY, min: 0, max: 100, step: 1 }].map(control => <label key={control.key} className="grid gap-2 text-sm text-secondary">{t(control.key)}<input type="range" value={control.value} min={control.min} max={control.max} step={control.step} onChange={e => control.set(Number(e.target.value))} className="h-6 w-full accent-[#d5bd87]" /></label>)}</fieldset>}
    {pending === null && <p className="mt-4 text-sm text-secondary">{t("removeImageConfirm")}</p>}
    {loading && <p role="status" className="mt-3 text-sm text-secondary">{t("processingImage")}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}{saved && <p role="status" className="mt-3 text-sm text-emerald-300">{t("avatarSaved")}</p>}
    <div className="mt-5 flex flex-wrap gap-3">{pending !== undefined ? <><button onClick={() => void save()} disabled={busy || loading} className="workspace-button primary disabled:opacity-40">{busy ? a("processing") : t("saveImage")}</button><button onClick={cancel} disabled={busy} className="workspace-button">{t("cancel")}</button></> : user.avatarUrl && <button disabled={busy || loading} onClick={() => { setPending(null); setImage(undefined); setSaved(false); setError(""); }} className="workspace-text-link"><Trash2 className="h-4 w-4" />{t("removeImage")}</button>}</div>
  </section>;
}
