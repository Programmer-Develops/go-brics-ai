import "./globals.css";

export const metadata = {
  title: "GO-BRICS AI Operational Assistant",
  description: "Internal AI tool built for Task T15 to automate Track A and Track B workflows.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}