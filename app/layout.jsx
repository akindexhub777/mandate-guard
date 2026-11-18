import "./globals.css";

export const metadata = {
  title: "Mandate Guard · GenLayer × MetaMask × Internet Court",
  description:
    "GenLayer validators check every purchase of an AI agent against its natural-language mandate and decide: continue, warn, constrain, revoke or escalate.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
