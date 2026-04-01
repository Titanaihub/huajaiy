import LineProvider from "next-auth/providers/line";

/** ตั้งเมื่อ LINE Console ใช้ path อื่น (เช่น /auth/line/callback) — ค่า default ให้ NextAuth จัด /api/auth/callback/line */
function lineOAuthRedirectUri() {
  const explicit = String(process.env.LINE_OAUTH_REDIRECT_URI || "").trim();
  return explicit || undefined;
}

function buildProviders() {
  const list = [];

  if (process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET) {
    const lineRedirectUri = lineOAuthRedirectUri();
    /**
     * ใช้ provider จาก next-auth (OIDC + id_token + HS256) แทน OAuth2 แบบกำหนดเอง —
     * ลดโอกาสแลก code กับ LINE ไม่ผ่านเมื่อเปิด scope openid
     */
    list.push(
      LineProvider({
        clientId: process.env.LINE_CHANNEL_ID,
        clientSecret: process.env.LINE_CHANNEL_SECRET,
        ...(lineRedirectUri
          ? {
              authorization: {
                params: { redirect_uri: lineRedirectUri }
              }
            }
          : {})
      })
    );
  }

  // TikTok Login Kit ใช้รูปแบบ OAuth ที่ต่างจากมาตรฐาน — เปิดใช้เมื่อพร้อมตั้งค่าใน TikTok Developers แล้วค่อยเพิ่ม provider แยก
  // อ้างอิง: https://developers.tiktok.com/doc/login-kit-web/

  return list;
}

const authSecret =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";

export const authOptions = {
  providers: buildProviders(),
  /** รองรับ proxy (Render/Vercel) เมื่อโฮสต์จริงไม่ตรง NEXTAUTH_URL ตัวเดียว */
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60
  },
  secret: authSecret,
  debug: process.env.NEXTAUTH_DEBUG === "1",
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
      }
      if (
        !token.provider &&
        token.sub &&
        /^U[A-Za-z0-9._-]{4,128}$/.test(String(token.sub))
      ) {
        token.provider = "line";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.provider = token.provider;
      }
      return session;
    }
  },
  pages: {
    /** ต้องเป็นหน้าที่แลก JWT สมาชิกได้ — ห้ามใช้ /auth เพราะจะวนกลับมาโดยไม่เข้าระบบสมาชิก */
    signIn: "/login/line"
  }
};
