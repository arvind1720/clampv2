import React, { useState, useEffect } from "react";
import { Power, Gauge, Activity, Layers, LogIn, LogOut, RefreshCw } from "lucide-react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

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
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [deviceData, setDeviceData] = useState({
    __connected: "disconnected",
    current_now: "0.000",
    mode: "measurement",
    unit: "0.000",
  });

  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [status, setStatus] = useState("Disconnected");

  // Initialize Firebase
  useEffect(() => {
    let app, database, authService;
    try {
      if (!getApps().length) app = initializeApp(firebaseConfig);
      else app = getApp();
      database = getDatabase(app);
      authService = getAuth(app);
      setDb(database);
      setAuth(authService);

      onAuthStateChanged(authService, (currentUser) => setUser(currentUser));
    } catch (e) {
      console.error("Firebase init error:", e);
    }
  }, []);

  // Listen to Firebase data
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
              unit: parseFloat(data.unit || 0).toFixed(4),
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

  // Login & Logout handlers
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
  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Toggle mode
  const toggleMode = async () => {
    if (!db) return;
    const newMode = deviceData.mode === "measurement" ? "monitoring" : "measurement";
    try {
      await set(ref(db, "mode"), newMode);
    } catch (error) {
      console.error("Failed to toggle mode:", error);
    }
  };

  // Simulate On / Off buttons
  const simulateOn = async () => {
    if (!db) return;
    try {
      await set(ref(db, "current_now"), "0.0711");
      await set(ref(db, "unit"), "0.0720");
      await set(ref(db, "mode"), "monitoring");
    } catch (error) {
      console.error("Simulate On failed:", error);
    }
  };
  const simulateOff = async () => {
    if (!db) return;
    try {
      await set(ref(db, "current_now"), "0.000");
      await set(ref(db, "unit"), "0.0000");
    } catch (error) {
      console.error("Simulate Off failed:", error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <LogIn className="mr-2 text-indigo-600" /> Clamp Login
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
            {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-3xl">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <Power className="mr-2 text-indigo-600" /> Clamp Monitor
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Logged in as {user.email}</span>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                status === "Connected" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {status}
            </span>
            <button onClick={handleLogout} className="flex items-center text-gray-600 hover:text-gray-800">
              <LogOut size={18} className="mr-1" /> Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
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
              <RefreshCw size={16} className="mr-2" /> Toggle Mode
            </button>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl flex flex-col items-center">
            <Power className="text-indigo-600 mb-2" size={32} />
            <p className="text-sm text-gray-500">Connection</p>
            <p className="text-xl font-semibold">{deviceData.__connected}</p>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-2">
          <button
            onClick={simulateOn}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Simulate On
          </button>
          <button
            onClick={simulateOff}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Simulate Off
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
