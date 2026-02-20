import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";

import Manager from "../components/Manager";
import UnlockModal from "../components/UnlockModal";

import { deriveKey } from "../utils/crypto";

import ChangeMasterModal from "../components/ChangeMasterModal";

import Navbar from "../components/Navbar";

const Dashboard = () => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();

  const [vaultKey, setVaultKey] = useState(null);

  const [userSalt, setUserSalt] = useState(null);

  const [masterExists, setMasterExists] = useState(null); // null = loading

  const [showChange, setShowChange] = useState(false);

  // ---------------- Load User Salt ----------------
  useEffect(() => {
    const loadSalt = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });

        const res = await fetch("/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        setUserSalt(data.salt);
      } catch (err) {
        console.error("Salt load error:", err);
      }
    };

    loadSalt();
  }, [isAuthenticated, user]);

  // ---------------- Check Master Status ----------------
  useEffect(() => {
    const checkMaster = async () => {
      if (!isAuthenticated) return;

      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });

        const res = await fetch("/api/master/status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        setMasterExists(data.exists);
      } catch (err) {
        console.error("Master status error:", err);
      }
    };

    checkMaster();
  }, [isAuthenticated]);

  // ---------------- Set Master (First Time) ----------------
  const handleSetMaster = async (password) => {
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });

      const res = await fetch("/api/master/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          masterPassword: password,
        }),
      });

      const data = await res.json();

      if (!data.success) return false;

      setMasterExists(true);

      // auto unlock after setup
      const key = deriveKey(password, userSalt);
      setVaultKey(key);

      return { success: true };
    } catch (err) {
      console.error("Set master error:", err);
      return { success: false };
    }
  };

  // ---------------- Reset Master Password ----------------
  const handleChangeMaster = async (oldPass, newPass) => {
    try {
      const token = await getAccessTokenSilently();

      const res = await fetch("/api/master/change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: oldPass,
          newPassword: newPass,
        }),
      });

      const data = await res.json();

      if (!data.success) return data;

      // Re-derive vault key
      const newKey = deriveKey(newPass, userSalt);
      setVaultKey(newKey);

      return data;
    } catch (err) {
      return {
        success: false,
        message: "Network error",
      };
    }
  };

  // ---------------- Unlock ----------------
  const handleUnlock = async (password) => {
    if (!password || !userSalt) return null;

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });

      const res = await fetch("/api/master/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          masterPassword: password,
        }),
      });

      const data = await res.json();

      /* ❌ FAILED / LOCKED */
      if (!res.ok || !data.success) {
        return data; // 👈 pass to UnlockModal
      }

      /* ✅ SUCCESS */
      const key = deriveKey(password, userSalt);

      setVaultKey(key);

      return {
        success: true,
      };
    } catch (err) {
      console.error("Unlock error:", err);

      return {
        success: false,
        message: "Network error",
      };
    }
  };

  // ---------------- Auto Lock ----------------
  useEffect(() => {
    if (!vaultKey) return;

    const timer = setTimeout(
      () => {
        setVaultKey(null);
      },
      30 * 60 * 1000,
    ); // 30 min

    return () => clearTimeout(timer);
  }, [vaultKey]);

  if (!isAuthenticated) return null;

  if (masterExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg animate-pulse">Loading...</p>
      </div>
    );
  }

  const handleResetVault = async () => {
    try {
      const token = await getAccessTokenSilently();

      const res = await fetch("/api/master/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!data.success) return false;

      /* 🔄 Force setup mode */
      setVaultKey(null);
      setMasterExists(false);

      return true;
    } catch (err) {
      console.error("Reset error:", err);
      return false;
    }
  };

  return (
    <>
      {showChange && (
        <ChangeMasterModal
          onClose={() => setShowChange(false)}
          onChange={handleChangeMaster}
        />
      )}
      {/* First time setup */}
      {!masterExists && (
        <UnlockModal onUnlock={handleSetMaster} isSetup={true} />
      )}

      {/* Normal unlock */}
      {masterExists && !vaultKey && (
        <UnlockModal
          onUnlock={handleUnlock}
          onReset={handleResetVault}
          isSetup={false}
        />
      )}

      {/* Vault */}
      {vaultKey && (
        <>
          {" "}
          <Navbar onChangeMaster={() => setShowChange(true)} />
          <div
            className="min-h-screen bg-green-50 
    bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),
    linear-gradient(to_bottom,#8080800a_1px,transparent_1px)]
    bg-[size:14px_24px]"
          >
            <Manager vaultKey={vaultKey} />
          </div>
        </>
      )}
    </>
  );
};

export default Dashboard;
