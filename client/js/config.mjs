// Endereço do servidor do jogo. Em produção o build troca PRODUCTION_SERVER pelo endereço do Render.
const PRODUCTION_SERVER = "https://labirinto-online.onrender.com";
const params = new URLSearchParams(location.search);
const local = ["localhost", "127.0.0.1"].includes(location.hostname) || location.hostname.endsWith(".local");
const httpBase = (params.get("servidor") || (local ? location.origin : PRODUCTION_SERVER)).replace(/\/$/, "");

export const SERVER_HTTP = httpBase;
export const SERVER_WS = `${httpBase.replace(/^http/, "ws")}/ws`;
export const CLIENT_VERSION = "2.0.0";
