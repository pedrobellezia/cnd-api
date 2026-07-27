import axios from "axios";

export const deepseekClient = axios.create({
  baseURL: "https://api.deepseek.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 60_000,
});
