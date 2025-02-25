import "./globals.css";

export const metadata = {
  title: "AI Best Friend Chatbot",
  description: "An AI chatbot that provides emotional support",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">{children}</body>
    </html>
  );
}
