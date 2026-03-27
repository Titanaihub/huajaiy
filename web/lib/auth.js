import FacebookProvider from "next-auth/providers/facebook";

function buildProviders() {
  const list = [];

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    list.push(
      FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET
      })
    );
  }

  if (process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET) {
    list.push({
      id: "line",
      name: "LINE",
      type: "oauth",
      checks: ["state"],
      authorization: {
        url: "https://access.line.me/oauth2/v2.1/authorize",
        params: {
          scope: "profile openid",
          response_type: "code"
        }
      },
      token: "https://api.line.me/oauth2/v2.1/token",
      userinfo: {
        url: "https://api.line.me/v2/profile",
        async request({ tokens }) {
          const res = await fetch("https://api.line.me/v2/profile", {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
          });
          return res.json();
        }
      },
      clientId: process.env.LINE_CHANNEL_ID,
      clientSecret: process.env.LINE_CHANNEL_SECRET,
      profile(profile) {
        return {
          id: profile.userId,
          name: profile.displayName,
          email: null,
          image: profile.pictureUrl
        };
      }
    });
  }

  // TikTok Login Kit ใช้รูปแบบ OAuth ที่ต่างจากมาตรฐาน — เปิดใช้เมื่อพร้อมตั้งค่าใน TikTok Developers แล้วค่อยเพิ่ม provider แยก
  // อ้างอิง: https://developers.tiktok.com/doc/login-kit-web/

  return list;
}

const authSecret =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";

export const authOptions = {
  providers: buildProviders(),
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
    signIn: "/"
  }
};
