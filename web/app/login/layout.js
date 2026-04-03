import Providers from "../providers";

/** NextAuth useSession / signIn LINE ต้องมี SessionProvider — เดิมมีแค่ใต้ /auth */
export default function LoginLayout({ children }) {
  return <Providers>{children}</Providers>;
}
