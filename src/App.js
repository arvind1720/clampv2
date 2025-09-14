import React, { useState, useEffect } from "react";
import {
  Power,
  Gauge,
  Activity,
  Layers,
  LogIn,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
} from "firebase/database";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

// 🔹 Firebase Config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const App = () => {
  // Auth state
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Clamp data
  const [deviceData, setDeviceData] = useState({
    __connected: "disconnected",
    current_now: "0.000",
    mode: "measurement",
    unit: "0.000",
  });

  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [status, setStatus] = useState("Disconnected");

  // Simulate state
  const [simulating, setSimulating] = useState(false);

  // Firebase init
  useEffect(() => {
    let app, database, authService;
    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
      database = getDatabase(app);
      authService = getAuth(app);
      setDb(database);
      setAuth(authService);

      // Listen for auth
      onAuthStateChanged(authService, (currentUser) => {
        setUser(currentUser);
      });
    } catch (e) {
      console.error("Firebase init error:", e);
    }
  }, []);

  // Listen to clamp data
  useEffect(() => {
    if (db && user) {
      const dataRef = ref(db, "/");
      onValue(
        dataRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setDeviceData({
              __connected: data.__connected || "disconnected",
              current_now: parseFloat(data.current_now || 0).toFixed(3),
              mode: data.mode || "measurement",
              unit: parseFloat(data.unit || 0).toFixed(3),
            });
            setStatus("Connected");
          }
        },
        (error) => {
          console.error("DB read error:", error);
          setStatus("Disconnected");
        }
      );
    }
  }, [db, user]);

  // 🔹 Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!auth) return;
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoginError("Login failed. Check email & password.");
      console.error("Login error:", error);
    }
  };

  // 🔹 Logout
  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // 🔹 Toggle mode
  const toggleMode = async () => {
    if (!db) return;
    const newMode =
      deviceData.mode === "measurement" ? "monitoring" : "measurement";
    try {
      await set(ref(db, "mode"), newMode);
    } catch (error) {
      console.error("Failed to toggle mode:", error);
    }
  };

  // 🔹 Start simulation
  const startSimulation = () => {
    if (!db) return;
    setSimulating(true);
    set(ref(db, "current_now"), "0.0711");
    setTimeout(() => {
      set(ref(db, "current_now"), "0.072");
    }, 1000);
  };

  // 🔹 Stop simulation
  const stopSimulation = () => {
    if (!db) return;
    setSimulating(false);
    set(ref(db, "current_now"), "0.000");
  };

  // 🔹 If not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
        <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <LogIn className="mr-2 text-indigo-600" />
            Clamp Login
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            {loginError && (
              <p className="text-sm text-red-500">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 🔹 Main dashboard
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 w-full max-w-3xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-4 mb-6 space-y-3 sm:space-y-0">
          <h1 className="text-2xl font-bold flex items-center">
            <Power className="mr-2 text-indigo-600" /> Clamp Monitor
          </h1>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-600">User: {user.email}</span>
            <span
              className={`px-3 py-1 rounded-full ${
                status === "Connected"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {status}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <LogOut size={18} className="mr-1" /> Logout
            </button>
          </div>
        </div>

        {/* Data Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 bg-gray-50 rounded-xl flex flex-col items-center">
            <Gauge className="text-indigo-600 mb-2" size={32} />
            <p className="text-sm text-gray-500">Current (A)</p>
            <p className="text-3xl font-bold">{deviceData.current_now}</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl flex flex-col items-center">
            <Layers className="text-indigo-600 mb-2" size={32} />
            <p className="text-sm text-gray-500">Unit (kWh)</p>
            <p className="text-3xl font-bold">{deviceData.unit}</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl flex flex-col items-center">
            <Activity className="text-indigo-600 mb-2" size={32} />
            <p className="text-sm text-gray-500">Mode</p>
            <p className="text-xl font-semibold">{deviceData.mode}</p>
            <button
              onClick={toggleMode}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <RefreshCw size={16} className="mr-2" />
              Toggle Mode
            </button>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl flex flex-col items-center">
            <Power className="text-indigo-600 mb-2" size={32} />
            <p className="text-sm text-gray-500">Connection</p>
            <p className="text-xl font-semibold">{deviceData.__connected}</p>
          </div>
        </div>

        {/* Simulate Buttons */}
        <div className="flex flex-col items-center mt-6 space-y-3">
          {!simulating ? (
            <button
              onClick={startSimulation}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition"
            >
              ▶ Start Simulation
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow hover:bg-red-700 transition"
            >
              ⏹ Stop Simulation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
