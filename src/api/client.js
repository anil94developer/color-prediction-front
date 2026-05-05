import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").trim();

const api = axios.create({
  baseURL: apiBaseUrl,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem("token", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("token");
  }
}

const saved = localStorage.getItem("token");
if (saved) setAuthToken(saved);

export default api;
