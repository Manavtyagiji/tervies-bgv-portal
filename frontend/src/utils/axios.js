import axios from "axios";

const instance = axios.create({
  baseURL: "",  // ← change from "/api" to ""
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("adminToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default instance;