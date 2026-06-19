import type { Metadata } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import { metadataBaseUrl } from "@/lib/metadata-base";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});


const shareTitle = "Finders Keepers — sourced from Japan, held in escrow";
const shareDescription =
  "Tell us what you want from Japan. We source it, send proof, and ship on approval. Funds held in escrow until transit.";

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = await metadataBaseUrl();

  return {
    metadataBase,
    title: shareTitle,
    description: shareDescription,
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      type: "website",
      siteName: "Finders Keepers",
      images: [
        {
          url: "/brand/og-share.png",
          width: 1200,
          height: 630,
          alt: "Finders Keepers — tell us what you want from Japan, we hunt it down",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDescription,
      images: ["/brand/og-share.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
