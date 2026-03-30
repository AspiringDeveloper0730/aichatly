"use client";

import Error from "next/error";

export default function GlobalError() {
  return (
    <html>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3259084940575407"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Error statusCode={undefined as any} />
      </body>
    </html>
  );
}
