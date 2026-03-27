import "./globals.css";

export const metadata = {
  title: "HUAJAIY Mini Upload",
  description: "Fast lightweight uploader for LINE/FB mini app use"
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
