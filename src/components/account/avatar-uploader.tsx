"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { saveAvatarAction } from "@/app/(app)/account/actions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 3 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function AvatarUploader({
  userId,
  avatarUrl,
  initial,
}: {
  userId: string;
  avatarUrl: string | null;
  initial: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!ACCEPT.includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be 3 MB or smaller.");
      return;
    }
    setBusy(true);
    const path = `${userId}/avatar-${Date.now()}.${EXT[file.type]}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      setBusy(false);
      console.error("[avatar upload]", upErr);
      setError("Upload failed. Please try again.");
      return;
    }
    const fd = new FormData();
    fd.set("avatarUrl", path);
    startTransition(async () => {
      await saveAvatarAction(fd);
      setBusy(false);
    });
  }

  function onRemove() {
    setError(null);
    const fd = new FormData();
    fd.set("avatarUrl", "");
    startTransition(() => saveAvatarAction(fd));
  }

  const working = busy || pending;

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-16">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt="Your profile picture" />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={working}
            onClick={() => inputRef.current?.click()}
            className="gap-1.5"
          >
            {working ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {avatarUrl ? "Replace" : "Upload"}
          </Button>
          {avatarUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={working}
              onClick={onRemove}
              className="gap-1.5 text-muted-foreground"
            >
              <Trash2 className="size-4" /> Remove
            </Button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT.join(",")}
            className="hidden"
            onChange={onPick}
          />
        </div>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            JPG, PNG, or WebP · up to 3 MB.
          </p>
        )}
      </div>
    </div>
  );
}
