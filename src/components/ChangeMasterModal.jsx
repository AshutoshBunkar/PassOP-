import { useState } from "react";

export default function ChangeMasterModal({
  onClose,
  onChange,
}) {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!oldPass || !newPass || !confirm) {
      setError("All fields required");
      return;
    }

    if (newPass !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (newPass.length < 6) {
      setError("Password too short");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await onChange(oldPass, newPass);

      if (!res.success) {
        setError(res.message || "Update failed");
        return;
      }

      onClose();

    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl w-80 shadow-xl"
      >

        {error && (
          <p className="text-red-600 text-sm mb-2 text-center">
            {error}
          </p>
        )}

        <input
          type="password"
          placeholder="Old Password"
          value={oldPass}
          onChange={(e) => setOldPass(e.target.value)}
          className="border p-2 w-full rounded mb-2"
        />

        <input
          type="password"
          placeholder="New Password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          className="border p-2 w-full rounded mb-2"
        />

        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="border p-2 w-full rounded mb-4"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 bg-gray-400 text-white py-2 rounded"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-1/2 bg-green-600 text-white py-2 rounded"
          >
            {loading ? "Updating..." : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}