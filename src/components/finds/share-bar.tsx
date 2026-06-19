"use client";

import { useState } from "react";
import { Share2, Link2, Download, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function XLogo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.656l-5.214-6.817-5.966 6.817H1.683l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

/**
 * Share controls for a completed-find page. Uses the native share sheet where
 * available, with copy-link, X, and download-image fallbacks. The downloadable
 * image is the same statically generated card used for link previews.
 */
export function ShareBar({
  title,
  downloadUrl,
}: {
  title: string;
  downloadUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareText = `Found it: ${title} — sourced from Japan by Finders Keepers.`;

  const url = () =>
    typeof window === "undefined" ? "" : window.location.href;

  const nativeShare = async () => {
    const u = url();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Finders Keepers", text: shareText, url: u });
      } catch {
        /* user dismissed — no-op */
      }
    } else {
      await copyLink();
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const xHref = () =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url())}`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <button
        type="button"
        onClick={nativeShare}
        className={cn(buttonVariants({ size: "sm" }), "h-10 gap-2 px-4")}
      >
        <Share2 className="size-4" />
        Share
      </button>
      <button
        type="button"
        onClick={copyLink}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-10 gap-2 border-border/80 bg-transparent px-4 hover:bg-secondary",
        )}
      >
        {copied ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
        Copy link
      </button>
      <a
        href={xHref()}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-10 gap-2 border-border/80 bg-transparent px-4 hover:bg-secondary",
        )}
      >
        <XLogo />
        Post
      </a>
      <a
        href={downloadUrl}
        download={`finders-keepers-find.png`}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-10 gap-2 border-border/80 bg-transparent px-4 hover:bg-secondary",
        )}
      >
        <Download className="size-4" />
        Download
      </a>
    </div>
  );
}
