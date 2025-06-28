import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import axios from "axios";

const firebaseConfig = {
  apiKey: "AIzaSyAm6TyhvUhqHGGGK21CyzOixaHXDzn81L8",
  authDomain: "antrogpt.firebaseapp.com",
  projectId: "antrogpt",
  storageBucket: "antrogpt.firebasestorage.app",
  messagingSenderId: "242178756417",
  appId: "1:242178756417:web:d6302c54b0fc67105fdbc0",
  measurementId: "G-N5MDEP9BTD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const q = query(
          collection(db, "messages"),
          where("uid", "==", currentUser.uid),
          orderBy("timestamp")
        );
        const querySnapshot = await getDocs(q);
        const messages = querySnapshot.docs.map((doc) => doc.data().message);
        setChat(messages);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  const saveMessage = async (msg) => {
    await addDoc(collection(db, "messages"), {
      uid: user.uid,
      message: msg,
      timestamp: new Date(),
    });
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    const userMessage = { role: "user", content: message };
    setChat((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);
    await saveMessage(userMessage);

    try {
      const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "mistralai/mixtral-8x7b",
          messages: [...chat, userMessage],
        },
        {
          headers: {
            Authorization: `Bearer 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`,
            "HTTP-Referer": "http://localhost",
            "X-Title": "Ask-Me-Anything MVP",
          },
        }
      );
      const reply = res.data.choices[0].message;
      setChat((prev) => [...prev, reply]);
      await saveMessage(reply);
    } catch (error) {
      console.error("Error fetching AI response:", error);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111827" }}>
        <button onClick={login} style={{ padding: "12px 24px", backgroundColor: "#2563eb", borderRadius: "6px", color: "#fff" }}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "16px", backgroundColor: "#111827" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
        <h1>Ask-Me-Anything Chatbot</h1>
        <button onClick={logout} style={{ color: "#f87171" }}>Logout</button>
      </div>
      <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {chat.map((c, i) => (
          <div key={i} style={{ padding: "12px", borderRadius: "6px", margin: "8px 0", backgroundColor: c.role === "user" ? "#1d4ed8" : "#047857" }}>
            <strong>{c.role === "user" ? "You" : "AI"}:</strong> {c.content}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "16px", display: "flex" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask anything..."
          style={{ flex: 1, padding: "12px", borderRadius: "6px 0 0 6px", border: "1px solid #374151", backgroundColor: "#1f2937", color: "white" }}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{ padding: "12px", backgroundColor: "#2563eb", borderRadius: "0 6px 6px 0", color: "#fff" }}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}