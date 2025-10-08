import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";

const connectToSocket = () => {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            console.warn("Token não encontrado, socket não será inicializado");
            return null;
        }

        // Tenta fazer o parse do token
        let parsedToken;
        try {
            parsedToken = JSON.parse(token);
        } catch (err) {
            console.error("Token inválido no localStorage");
            return null;
        }

        // Permite conexão mesmo com token expirado (será renovado no connect_error)
        try {
            const tokenData = JSON.parse(atob(parsedToken.split('.')[1]));
            if (tokenData.exp * 1000 < Date.now()) {
                console.warn("Token expirado, tentará renovar durante a conexão...");
            }
        } catch (err) {
            console.warn("Erro ao verificar expiração do token, tentando conectar mesmo assim");
        }

        const socket = openSocket(getBackendUrl(), {
            transports: ["websocket"],
            query: {
                token: parsedToken
            },
            reconnection: true,
            reconnectionDelay: 5000,
            reconnectionAttempts: 5,
            forceNew: false,
            timeout: 10000
        });

        socket.on("connect", () => {
            console.log("Socket conectado com sucesso");
        });

        socket.on("connect_error", async (error) => {
            console.error("Erro na conexão do socket:", error.message);
            
            if (error.message.includes("jwt expired") || 
                error.message.includes("invalid token") || 
                error.message.includes("jwt malformed")) {
                console.warn("Token expirado, tentando renovar...");
                
                try {
                    // Tenta renovar o token
                    const refreshToken = localStorage.getItem("refreshToken");
                    if (refreshToken) {
                        const response = await fetch(`${getBackendUrl()}/auth/refresh_token`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ refreshToken })
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            localStorage.setItem("token", JSON.stringify(data.token));
                            console.log("Token renovado com sucesso");
                            
                            // Reconecta o socket com o novo token
                            socket.disconnect();
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        } else {
                            throw new Error("Falha ao renovar token");
                        }
                    } else {
                        throw new Error("RefreshToken não encontrado");
                    }
                } catch (err) {
                    console.error("Erro ao renovar token:", err);
                    localStorage.removeItem("token");
                    localStorage.removeItem("refreshToken");
                    window.location.href = "/login";
                }
            }
        });

        socket.on("disconnect", (reason) => {
            console.log("Socket desconectado:", reason);
            if (reason === "io server disconnect" || 
                reason === "forced close" || 
                reason === "ping timeout") {
                socket.disconnect();
            }
        });

        return socket;
    } catch (err) {
        console.error("Erro ao conectar socket:", err);
        return null;
    }
};

export default connectToSocket;