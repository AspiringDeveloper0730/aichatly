import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AiChatly";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const logoUrl = new URL("../../public/logo.png", import.meta.url);
  const logoData = await fetch(logoUrl).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b12",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <img
            width={220}
            height={220}
            src={`data:image/png;base64,${Buffer.from(logoData).toString("base64")}`}
            alt="AiChatly Logo"
            style={{ borderRadius: 24 }}
          />
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "white",
              letterSpacing: -1,
            }}
          >
            AiChatly
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#c7c8d1",
            }}
          >
            Create your AI character. Chat. Share.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

