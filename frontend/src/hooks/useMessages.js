import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

export const useMessages = (ticketId, dispatch) => {
    const { socket, connected } = useSocket();

    const joinChatBox = useCallback(() => {
        if (socket && connected && ticketId) {
            console.log("Entrando no chat box:", ticketId);
            socket.emit("joinChatBox", ticketId);
        }
    }, [socket, connected, ticketId]);

    useEffect(() => {
        if (!socket || !ticketId) return;

        console.log("Configurando listeners de mensagem para ticket:", ticketId);

        const handleConnect = () => {
            console.log("Socket conectado - entrando no chat:", ticketId);
            joinChatBox();
        };

        const handleMessage = (data) => {
            console.log("Nova mensagem recebida via socket:", data);
            
            if (data.action === "create" && data.message) {
                // Verificar se a mensagem é para este ticket
                const messageTicketId = data.message.ticketId?.toString() || data.message.ticket?.id?.toString();
                console.log("Verificando ticket - atual:", ticketId, "mensagem:", messageTicketId);
                
                if (messageTicketId === ticketId) {
                    console.log("Adicionando mensagem ao chat:", data.message);
                    dispatch({ type: "ADD_MESSAGE", payload: data.message });
                    
                    // Força scroll para baixo após pequeno delay
                    setTimeout(() => {
                        const messagesContainer = document.querySelector('.messages-list-wrapper');
                        if (messagesContainer) {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    }, 100);
                }
            }

            if (data.action === "update" && data.message) {
                const messageTicketId = data.message.ticketId?.toString() || data.message.ticket?.id?.toString();
                if (messageTicketId === ticketId) {
                    console.log("Atualizando mensagem no chat:", data.message);
                    dispatch({ type: "UPDATE_MESSAGE", payload: data.message });
                }
            }
        };

        const handleJoinedChatBox = (data) => {
            console.log("Confirmação de entrada no chat:", data);
        };

        // Adicionar listeners
        socket.on("connect", handleConnect);
        socket.on("appMessage", handleMessage);
        socket.on("joinedChatBox", handleJoinedChatBox);

        // Se já está conectado, entrar no chat imediatamente
        if (connected) {
            joinChatBox();
        }

        return () => {
            console.log("Removendo listeners de mensagem para ticket:", ticketId);
            socket.off("connect", handleConnect);
            socket.off("appMessage", handleMessage);
            socket.off("joinedChatBox", handleJoinedChatBox);
        };
    }, [socket, connected, ticketId, dispatch, joinChatBox]);

    return { socket, connected };
};