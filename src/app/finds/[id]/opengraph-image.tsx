import { ImageResponse } from "next/og";
import { getCompletedFind, fulfillLabel } from "@/lib/finds/queries";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Finders Keepers completed find";

const BG = "#15141b";
const CARD = "#1d1c24";
const FG = "#f5f4f7";
const MUTED = "#9b99a8";
const ACCENT = "#f5d24a";

/** Static stylised snapshot of a find — used for link previews and download. */
export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const find = await getCompletedFind(id);
  const yen = (n: number) => "¥" + n.toLocaleString("en-US");

  if (!find) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: BG,
            color: FG,
            fontSize: 52,
            fontWeight: 700,
          }}
        >
          Finders Keepers
        </div>
      ),
      size,
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            display: "flex",
            background:
              "linear-gradient(90deg,#ef4444,#f5d24a,#4ade80,#38bdf8,#a855f7,#ef4444)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(55% 55% at 78% 12%, rgba(245,210,74,0.12), transparent 60%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            padding: 64,
            gap: 56,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 416,
              height: 416,
              borderRadius: 28,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
              flexShrink: 0,
              background: CARD,
            }}
          >
            {find.imageUrl ? (
              <img
                src={find.imageUrl}
                width={416}
                height={416}
                alt=""
                style={{ width: 416, height: 416, objectFit: "cover" }}
              />
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: ACCENT,
                fontSize: 20,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 9,
                  height: 9,
                  borderRadius: 9,
                  background: "#4ade80",
                }}
              />
              Completed find
            </div>

            <div
              style={{
                display: "flex",
                color: FG,
                fontSize: 50,
                fontWeight: 700,
                lineHeight: 1.05,
                marginTop: 16,
              }}
            >
              {find.title}
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
              <div
                style={{
                  display: "flex",
                  color: MUTED,
                  fontSize: 18,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                Fulfilled in
              </div>
              <div
                style={{
                  display: "flex",
                  color: FG,
                  fontSize: 76,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {fulfillLabel(find.fulfillMs)}
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "14px 22px",
                  borderRadius: 16,
                  background: CARD,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: MUTED,
                    fontSize: 15,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                  }}
                >
                  Condition
                </div>
                <div style={{ display: "flex", color: FG, fontSize: 26, fontWeight: 600 }}>
                  {find.condition}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "14px 22px",
                  borderRadius: 16,
                  background: CARD,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: MUTED,
                    fontSize: 15,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                  }}
                >
                  Total · escrow
                </div>
                <div style={{ display: "flex", color: ACCENT, fontSize: 26, fontWeight: 700 }}>
                  {yen(find.totalJpy)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 64px 48px",
          }}
        >
          <div style={{ display: "flex", color: FG, fontSize: 24, fontWeight: 700 }}>
            Finders Keepers
          </div>
          <div style={{ display: "flex", color: MUTED, fontSize: 18 }}>
            Concierge sourcing from Japan · held in escrow
          </div>
        </div>
      </div>
    ),
    size,
  );
}
