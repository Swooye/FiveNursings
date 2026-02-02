import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

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
// 这里的 app 参数至关重要，它能让 functions 自动获取 auth 状态
export const functions = getFunctions(app, 'us-central1');
