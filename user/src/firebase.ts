import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  projectId: "fivenursings-73917017-a0dfd",
  appId: "1:604368704549:web:ecd53bf16de633297d1bcc",
  storageBucket: "fivenursings-73917017-a0dfd.firebasestorage.app",
  apiKey: "AIzaSyA-zbKTmTggmkkb_1uIQ7ZAEOo-vmiQnLc",
  authDomain: "fivenursings-73917017-a0dfd.firebaseapp.com",
  messagingSenderId: "604368704549",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');

// 在本地开发环境下连接到 Firebase Emulator
/*
if (import.meta.env.DEV) {
  // 注意：在云工作站环境下，通常需要指定 host 为当前域名或 0.0.0.0
  // 但对于 Firebase SDK，localhost 通常被其内部处理以连接到 5001
  connectFunctionsEmulator(functions, "localhost", 5001);
}
*/
