import { useAuth0 } from "@auth0/auth0-react";

const Login = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            <span className="text-green-500">&lt;</span>
            Pass
            <span className="text-green-500">OP/&gt;</span>
          </h1>

          <p className="text-gray-400 text-sm mt-2">Secure Password Manager</p>
        </div>

        {/* Login Button */}
        <button
          onClick={() => loginWithRedirect()}
          className="w-full flex items-center justify-center gap-3
                 px-6 py-3 rounded-lg font-semibold text-white
                 bg-gradient-to-r from-green-500 to-green-700
                 hover:from-green-600 hover:to-green-800
                 shadow-md hover:shadow-lg
                 transition-all duration-200"
        >
          
          <img
            src="/icons/OIP.jpg"
            alt="Google"
            className="w-5 h-5 bg-white rounded-full p-0.5"
          />
          Sign in with Google
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;
