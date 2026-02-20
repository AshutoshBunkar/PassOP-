import React from "react";

const Footer = () => {
  return (
    <footer className="bg-slate-800 text-slate-200 w-full border-t border-slate-700">
      <div className="flex flex-col items-center justify-center py-6 gap-2 text-sm">
        
        <div className="logo font-bold text-2xl">
          <span className="text-green-500">&lt;</span>
          <span>Pass</span>
          <span className="text-green-500">OP/&gt;</span>
        </div>

        
        <p className="text-slate-400">Simple • Secure • Demo</p>

        
        <div className="flex items-center">
          <span>Built by Ashutosh</span>
        </div>

        
        <p className="text-slate-500 text-xs">
          © {new Date().getFullYear()} All rights reserved
        </p>
      </div>
    </footer>
  );
};

export default Footer;
