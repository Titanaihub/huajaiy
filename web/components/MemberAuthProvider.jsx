"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { deriveCapabilitiesForRole, hasCapability } from "../lib/capabilities";
import {
  apiLogin,
  apiMe,
  apiPatchProfile,
  apiRegister,
  clearMemberToken,
  getMemberToken,
  IMPERSONATION_RETURN_TOKEN_KEY,
  setMemberToken
} from "../lib/memberApi";

const MemberAuthContext = createContext(null);

export function useMemberAuth() {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) {
    throw new Error("useMemberAuth must be used within MemberAuthProvider");
  }
  return ctx;
}

export default function MemberAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonation, setImpersonation] = useState(null);

  const refresh = useCallback(async () => {
    const token = getMemberToken();
    if (!token) {
      setUser(null);
      setCapabilities(null);
      setImpersonation(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiMe(token);
      setUser(data.user);
      setCapabilities(
        Array.isArray(data.capabilities) && data.capabilities.length
          ? data.capabilities
          : deriveCapabilitiesForRole(data.user?.role)
      );
      const imp = data.impersonation;
      setImpersonation(
        imp && imp.active ? { adminUsername: imp.adminUsername || null } : null
      );
    } catch {
      clearMemberToken();
      setUser(null);
      setCapabilities(null);
      setImpersonation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username, password) => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(IMPERSONATION_RETURN_TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
    const data = await apiLogin({ username, password });
    setMemberToken(data.token);
    setUser(data.user);
    setCapabilities(
      Array.isArray(data.capabilities) && data.capabilities.length
        ? data.capabilities
        : deriveCapabilitiesForRole(data.user?.role)
    );
    setImpersonation(null);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(IMPERSONATION_RETURN_TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
    const data = await apiRegister(payload);
    setMemberToken(data.token);
    setUser(data.user);
    setCapabilities(
      Array.isArray(data.capabilities) && data.capabilities.length
        ? data.capabilities
        : deriveCapabilitiesForRole(data.user?.role)
    );
    setImpersonation(null);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearMemberToken();
    setUser(null);
    setCapabilities(null);
    setImpersonation(null);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(IMPERSONATION_RETURN_TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const exitImpersonation = useCallback(() => {
    if (typeof window === "undefined") return;
    let back = null;
    try {
      back = window.sessionStorage.getItem(IMPERSONATION_RETURN_TOKEN_KEY);
    } catch {
      back = null;
    }
    if (back) {
      try {
        window.sessionStorage.removeItem(IMPERSONATION_RETURN_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      setMemberToken(back);
      setImpersonation(null);
      window.location.assign("/admin");
      return;
    }
    clearMemberToken();
    setUser(null);
    setImpersonation(null);
    window.location.assign("/hui/login?next=/admin");
  }, []);

  const patchProfile = useCallback(async (payload) => {
    const token = getMemberToken();
    if (!token) {
      throw new Error("ไม่ได้เข้าสู่ระบบ");
    }
    const data = await apiPatchProfile(token, payload);
    setUser(data.user);
    setCapabilities(
      Array.isArray(data.capabilities) && data.capabilities.length
        ? data.capabilities
        : deriveCapabilitiesForRole(data.user?.role)
    );
    return data;
  }, []);

  /** อัปเดต user จาก response API (เช่น แลกรหัสห้อง) โดยไม่ต้องรอ GET /me */
  const applyUser = useCallback((next) => {
    if (next && typeof next === "object") {
      setUser(next);
      setCapabilities(deriveCapabilitiesForRole(next.role));
    }
  }, []);

  const can = useCallback(
    (capability) => {
      const caps =
        capabilities ?? deriveCapabilitiesForRole(user?.role);
      return hasCapability(caps, capability);
    },
    [capabilities, user]
  );

  const value = useMemo(
    () => ({
      user,
      capabilities,
      can,
      loading,
      impersonation,
      login,
      register,
      logout,
      exitImpersonation,
      refresh,
      patchProfile,
      applyUser
    }),
    [
      user,
      capabilities,
      can,
      loading,
      impersonation,
      login,
      register,
      logout,
      exitImpersonation,
      refresh,
      patchProfile,
      applyUser
    ]
  );

  return (
    <MemberAuthContext.Provider value={value}>
      {children}
    </MemberAuthContext.Provider>
  );
}
