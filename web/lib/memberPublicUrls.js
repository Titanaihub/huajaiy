/**
 * URL สาธารณะของเพจสมาชิก — `/{username}` (ไม่มี prefix /u/)
 * @param {string} username
 */
export function publicMemberPath(username) {
  const u = String(username || "").trim().toLowerCase();
  if (!u) return "/";
  return `/${encodeURIComponent(u)}`;
}

/**
 * URL โพสต์เดี่ยวสำหรับแชร์ — `/{username}/post/{postId}`
 * @param {string} username
 * @param {string} postId
 */
export function publicMemberPostPath(username, postId) {
  const u = String(username || "").trim().toLowerCase();
  const id = String(postId || "").trim();
  if (!u || !id) return publicMemberPath(username);
  return `/${encodeURIComponent(u)}/post/${encodeURIComponent(id)}`;
}
