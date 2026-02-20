import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Navbar = ({ onChangeMaster }) => {
  const { user, isAuthenticated, logout } = useAuth0();

  return (
    <nav className="bg-slate-800 text-white">
      <div className="mycontainer  min-w-full flex flex-col sm:flex-row sm:justify-between sm:items-center px-4 sm:px-5 py-3 sm:py-4 min-h-[56px]">
        <div className="logo font-bold text-white text-xl sm:text-2xl mb-2 sm:mb-0">
          <span className="text-green-500">&lt;</span>
          <span className="ps">Pass</span>
          <span className="text-green-500">OP/&gt;</span>
        </div>

        {/* Right Section */}
        <div className="flex flex-col sm:flex-row sm:items-center w-full sm:w-auto gap-2 sm:gap-4">
          <div className="flex  items-center justify-center sm:justify-start gap-3 sm:gap-4 sm:ml-auto">
            {isAuthenticated && user && (
              <span className="text-xs sm:text-sm md:text-base font-semibold bg-gradient-to-r from-gray-300 to-green-300 bg-clip-text text-transparent text-center">
                Welcome, {user?.name?.split("@")[0]}
              </span>
            )}

    
            <a
              href="https://github.com/AshutoshBunkar"
              target="_blank"
              rel="noopener noreferrer"
              className="  ring-teal-600 inline-flex items-center bg-green-700 text-white rounded-full ring-2 hover:bg-green-800 transition text-xs sm:text-sm"
            >
              <img
                className="invert w-6 sm:w-7 p-1"
                src="/icons/github.svg"
                alt="GitHub"
              />

              <span className="font-bold px-2 ">GitHub</span>
            </a>
              
          </div>

            <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 sm:ml-auto"> 
          <button
            onClick={onChangeMaster}
            className="px-2 py-1 inline-flex bg-blue-800 items-center text-white rounded-full ring-2 ring-blue-600 hover:bg-blue-900 transition text-xs sm:text-sm"
          >
            Change Master 
          </button>
          </div>

          {/* Logout */}
          {isAuthenticated && user && (
            <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 sm:ml-auto">
            <button
              onClick={() =>
                logout({
                  logoutParams: {
                    returnTo: window.location.origin,
                  },
                })
              }
              className=" w-20 sm:w-auto sm:ml-full  px-3 py-1 rounded-full
                     text-xs sm:text-sm font-medium text-white ring-2 ring-red-500
                     bg-gradient-to-r from-red-600 to-red-800
                     hover:from-red-700 hover:to-red-900
                     shadow-md hover:shadow-lg
                     transition-all duration-200"
            >
              Logout
            </button>
              </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
