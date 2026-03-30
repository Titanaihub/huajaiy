"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  apiLogin,
  apiMe,
  apiPatchProfile,
  apiRegister,
  clearMemberToken,
  getMemberToken,
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
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getMemberToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiMe(token);
      setUser(data.user);
    } catch {
      clearMemberToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin({ username, password });
    setMemberToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await apiRegister(payload);
    setMemberToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearMemberToken();
    setUser(null);
  }, []);

  const patchProfile = useCallback(async (payload) => {
    const token = getMemberToken();
    if (!token) {
      throw new Error("ไม่ได้เข้าสู่ระบบ");
    }
    const data = await apiPatchProfile(token, payload);
    setUser(data.user);
    return data;
  }, []);

  /** อัปเดต user จาก response API (เช่น แลกรหัสห้อง) โดยไม่ต้องรอ GET /me */
  const applyUser = useCallback((next) => {
    if (next && typeof next === "object") setUser(next);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refresh,
      patchProfile,
      applyUser
    }),
    [user, loading, login, register, logout, refresh, patchProfile, applyUser]
  );

  return (
    <MemberAuthContext.Provider value={value}>
      {children}
    </MemberAuthContext.Provider>
  );
}
