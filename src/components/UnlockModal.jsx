import { useEffect, useState } from "react";

export default function UnlockModal({ onUnlock, onReset , isSetup = false }) {
  const [masterPassword, setMasterPassword] = useState("");

  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(null);

  const [lockedTime, setLockedTime] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  const [loading, setLoading] = useState(false);

  const [showReset, setShowReset] = useState(false);

  /* ===================== HANDLE SUBMIT ===================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!masterPassword.trim()) {
      setError("Enter master password");
      return;
    }

    if (isLocked) return;

    try {
      setLoading(true);

      // Reset UI
      setError("");
      setRemaining(null);

      const result = await onUnlock(masterPassword);

      /* ✅ SUCCESS */
      if (result?.success) {
        return;
      }

      /* 🔒 LOCKED */
      if (result?.locked) {
        setIsLocked(true);
        setError(result.message);

        if (result.minutes !== undefined) {
          setLockedTime({
            minutes: result.minutes,
            seconds: result.seconds,
          });
        }

        setMasterPassword("");
        return;
      }

      /* ❌ WRONG PASSWORD */
      if (result?.remaining !== undefined) {
        setRemaining(result.remaining);
        setError(result.message);
        setMasterPassword("");
        return;
      }

      setError("Verification failed");
    } catch (err) {
      console.error("Unlock error:", err);
      setError("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ===================== COUNTDOWN ===================== */

  useEffect(() => {
    if (!lockedTime) return;

    const timer = setInterval(() => {
      setLockedTime((prev) => {
        if (!prev) return null;

        if (prev.seconds > 0) {
          return {
            ...prev,
            seconds: prev.seconds - 1,
          };
        }

        if (prev.minutes > 0) {
          return {
            minutes: prev.minutes - 1,
            seconds: 59,
          };
        }

        // Unlock when time finishes
        setIsLocked(false);
        setError("");
        return null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockedTime]);

  /* ===================== UI ===================== */

  return (
    <>
      {/* RESET MODAL */}
      {showReset ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-80 shadow-xl">
            <h3 className="font-bold text-lg text-center mb-3">
              ⚠️ Reset Vault
            </h3>

            <p className="text-sm text-gray-700 mb-4 text-center">
              This will permanently delete all saved passwords. This action
              cannot be undone.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowReset(false)}
                className="w-1/2 bg-gray-400 text-white py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  await onReset();
                  setMasterPassword("");
                  setError("");
                  setRemaining(null);
                  setLockedTime(null);
                  setShowReset(false);
                  setIsLocked(false);
                }}
                className="w-1/2 bg-red-600 text-white py-2 rounded"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* UNLOCK MODAL */
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl w-80 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-4 text-center">
              {isSetup ? "🆕 Set Master Password" : "🔐 Unlock Vault"}
            </h2>

            {/* Error */}
            {error && (
              <p className="text-red-600 text-sm mb-2 text-center">{error}</p>
            )}

            {/* Attempts */}
            {remaining !== null && !isLocked && (
              <p className="text-yellow-600 text-xs mb-2 text-center">
                Attempts left: {remaining}
              </p>
            )}

            {/* Timer */}
            {lockedTime && (
              <p className="text-orange-500 text-xs mb-2 text-center">
                Try again in {lockedTime.minutes}m {lockedTime.seconds}s
              </p>
            )}

            {/* Input */}
            <input
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder={
                isSetup ? "Create Master Password" : "Enter Master Password"
              }
              className="border p-2 w-full rounded mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
              disabled={loading || isLocked}
            />

            {/* Button */}
            <button
              type="submit"
              disabled={loading || isLocked}
              className={`w-full py-2 rounded font-medium transition ${
                isLocked
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {loading ? "Checking..." : isLocked ? "Locked" : "Unlock"}
            </button>

            {/* Reset Link */}
            <p
              onClick={() => setShowReset(true)}
              className="mt-3 text-xs text-center text-blue-600 cursor-pointer hover:underline"
            >
              {!isSetup && <span>Forgot master password?</span>}
            </p>
          </form>
        </div>
      )}
    </>
  );
}
