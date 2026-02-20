import React from "react";
import { useRef, useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useAuth0 } from "@auth0/auth0-react";
import { encryptPassword, decryptPassword } from "../utils/crypto";

const Manager = ({ vaultKey }) => {
  const ref = useRef();
  const passwordRef = useRef();
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const [form, setform] = useState({ site: "", username: "", password: "" });
  const [passwords, setPasswords] = useState([]);

  const [hideAllRows, setHideAllRows] = useState(true);

  const API_URL = "/api/passwords";

  useEffect(() => {
    const loadPasswords = async () => {
      if (!isAuthenticated || !vaultKey) return;

      try {
        const token = await getAccessTokenSilently();

        const res = await fetch(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Server error");
        }

        const data = await res.json();

        const decrypted = (data.result || []).map((item) => {
          let safePassword = "";

          try {
            safePassword = decryptPassword(item.password, vaultKey) || "";
          } catch {
            safePassword = "";
          }

          return {
            ...item,
            password: safePassword,
          };
        });

        setPasswords(decrypted);
      } catch (err) {
        console.log("Load failed:", err);
      }
    };

    loadPasswords();
  }, [isAuthenticated, vaultKey]);

  if (!vaultKey) {
    return (
      <div className="p-10 text-center text-xl font-bold"> Vault Locked</div>
    );
  }

  const copyText = (text) => {
    toast.success("Copied to Clipboard", {
      position: "top-right",
      autoClose: 3000,
      theme: "dark",
    });

    navigator.clipboard.writeText(text);
  };

  const showPassword = () => {
    if (passwordRef.current.type === "password") {
      passwordRef.current.type = "text";
      ref.current.src = "/icons/eyecross.png";
    } else {
      passwordRef.current.type = "password";
      ref.current.src = "/icons/eye.png";
    }
  };

  const savePassword = async () => {
    if (
      form.site.length > 2 &&
      form.username.length > 1 &&
      form.password.length > 2
    ) {
      try {
        const token = await getAccessTokenSilently();

        const encrypted = encryptPassword(form.password, vaultKey);

        // EDIT MODE
        if (form._id) {
          const res = await fetch(`${API_URL}/${form._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              site: form.site,
              username: form.username,
              password: encrypted,
            }),
          });

          const text = await res.text();

          if (!res.ok) {
            console.error("Update error:", text);
            throw new Error(text);
          }

          const updated = JSON.parse(text);

          // IMPORTANT: decrypt again before putting in state
          const safeUpdated = {
            ...updated.result,
            password: decryptPassword(updated.result.password, vaultKey) || "",
          };

          setPasswords((prev) =>
            prev.map((p) => (p._id === form._id ? safeUpdated : p)),
          );

          toast.success("Password Updated ");
        }

        // ADD MODE
        else {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              site: form.site,
              username: form.username,
              password: encrypted,
            }),
          });

          const text = await res.text();

          if (!res.ok) {
            console.error("Save error:", text);
            throw new Error(text);
          }

          const data = JSON.parse(text);

          const safeNew = {
            ...data.result,
            password: decryptPassword(data.result.password, vaultKey) || "",
          };

          setPasswords((prev) => [...prev, safeNew]);

          toast.success("Password Saved ");
        }

        setform({ site: "", username: "", password: "" });
      } catch (err) {
        console.error(err);
        toast.error("Save failed");
      }
    } else {
      toast.error("Invalid input!");
    }
  };

  // Edit
  const editPassword = (id) => {
    const target = passwords.find((i) => i._id === id);
    if (!target) return;

    setform({
      site: target.site,
      username: target.username,
      password: target.password, // already decrypted
      _id: target._id,
    });
  };

  // Delete
  const deletePassword = async (_id) => {
    if (!confirm("Are you sure?")) return;
    console.log("DELETE URL:", `${API_URL}/${_id}`);

    try {
      const token = await getAccessTokenSilently();

      const res = await fetch(`${API_URL}/${_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error();

      // Remove from UI
      setPasswords((prev) => prev.filter((p) => p._id !== _id));

      toast.success("Password Deleted ", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    } catch {
      toast.error("Delete failed");
    }
  };

  // Form handler
  const handleChange = (e) => {
    setform({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <>
      <ToastContainer theme="dark" />

      <div className="px-3 sm:px-6 md:px-0 md:mycontainer max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center">
          <span className="text-green-700">&lt;</span>
          <span>Pass</span>
          <span className="text-green-700">OP&gt;</span>
        </h1>

        <p className="text-green-900 text-lg text-center">
          Your Own Password Manager
        </p>

        <div className="text-black flex flex-col p-3 sm:p-4 gap-4 items-center w-full">
          <input
            onChange={handleChange}
            value={form.site}
            className="rounded-full border border-green-500 w-full p-4 py-1"
            placeholder="Enter Your URL"
            type="text"
            name="site"
          />

          <div className="flex flex-col md:flex-row w-full gap-4">
            <input
              onChange={handleChange}
              value={form.username}
              className="rounded-full border border-green-500 p-4 py-1 w-full"
              placeholder="Enter Username"
              type="text"
              name="username"
            />

            <div className="relative w-full">
              <input
                ref={passwordRef}
                onChange={handleChange}
                value={form.password}
                className="rounded-full border border-green-500 p-4 py-1 w-full"
                placeholder="Enter Password"
                type="password"
                name="password"
              />

              <span
                className="absolute right-2 top-2 cursor-pointer"
                onClick={showPassword}
              >
                <img
                  className="p-1"
                  width={24}
                  src="/icons/eye.png"
                  alt="eye"
                  ref={ref}
                />
              </span>
            </div>
          </div>

          <button
            onClick={savePassword}
            className="
  bg-green-600 w-fit flex justify-center items-center
  rounded-full px-3 py-1
  text-black
  hover:bg-green-700 hover:text-white
  transition-colors duration-200
"
          >
            <lord-icon
              src="https://cdn.lordicon.com/efxgwrkc.json"
              trigger="hover"
              style={{ width: "25px", height: "20px", paddingRight: "15px" }}
            />
            Add Password
          </button>
        </div>

        <div className="passwords">
          <h2 className="text-xl font-bold py-4 flex items-center  gap-2">
            <img src="/icons/mylock.png" alt="manager" className="w-5 h-5" />
            Your Passwords
          </h2>

          {passwords.length === 0 && (
            <div className="text-gray-500 italic">No passwords to show</div>
          )}

          <button
            onClick={() => setHideAllRows((prev) => !prev)}
            className=" flex items-center gap-2
    px-4 py-1 mb-3 rounded-lg
    bg-green-700 text-black
    hover:bg-green-800 hover:text-white
    transition-all duration-200
  "
          >
            {hideAllRows ? (
              <>
                <img src="/icons/lock.png" alt="manager" className="w-5 h-5" />
                <span> Show Passwords</span>
              </>
            ) : (
              <>
                <img
                  src="/icons/unlock.png"
                  alt="manager"
                  className="w-5 h-5"
                />
                <span> Hide Passwords</span>
              </>
            )}
          </button>

          {passwords.length !== 0 && !hideAllRows && (
            <div className="w-full overflow-x-auto">
              <table className="min-w-[700px] w-full table-auto border border-green-800 rounded-md mb-10">
                <thead className="bg-green-800 text-white">
                  <tr>
                    <th className="p-2">Site</th>
                    <th className="p-2">Username</th>
                    <th className="p-2">Password</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>

                <tbody className="bg-green-100">
                  {passwords.map((item) => (
                    <tr key={item._id}>
                      <td className="py-2 text-center border border-slate-300">
                        <div className="flex justify-center items-center gap-2">
                          <a
                            href={item.site}
                            target="_blank"
                            className="text-blue-600 hover:underline"
                          >
                            {item.site}
                          </a>
                          <div
                            onClick={() => copyText(item.site)}
                            className="cursor-pointer"
                          >
                            <lord-icon
                              src="https://cdn.lordicon.com/iykgtsbt.json"
                              trigger="hover"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-2 text-center border border-slate-300">
                        <div className="flex justify-center items-center gap-2">
                          <span>{item.username}</span>
                          <div
                            onClick={() => copyText(item.username)}
                            className="cursor-pointer"
                          >
                            <lord-icon
                              src="https://cdn.lordicon.com/iykgtsbt.json"
                              trigger="hover"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-2 text-center border border-slate-300">
                        <div className="flex justify-center items-center gap-2">
                          <span>{"*".repeat(item.password.length)}</span>
                          <div
                            onClick={() => copyText(item.password)}
                            className="cursor-pointer"
                          >
                            <lord-icon
                              src="https://cdn.lordicon.com/iykgtsbt.json"
                              trigger="hover"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-2 border border-slate-300">
                        <div className="flex gap-4 justify-center">
                          {/* EDIT */}
                          <span
                            className={
                              item.isBase
                                ? "cursor-not-allowed opacity-40"
                                : "cursor-pointer"
                            }
                            onClick={() => {
                              if (item.isBase) {
                                toast.info("This is demo data (read-only)");
                                return;
                              }

                              editPassword(item._id);
                            }}
                          >
                            <lord-icon
                              src="https://cdn.lordicon.com/gwlusjdu.json"
                              trigger="hover"
                            />
                          </span>

                          {/* DELETE */}
                          <span
                            className={
                              item.isBase
                                ? "cursor-not-allowed opacity-40"
                                : "cursor-pointer"
                            }
                            onClick={() => {
                              if (item.isBase) {
                                toast.info("This is demo data (read-only)");
                                return;
                              }

                              deletePassword(item._id);
                            }}
                          >
                            <lord-icon
                              src="https://cdn.lordicon.com/skkahier.json"
                              trigger="hover"
                            />
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Manager;
