import { useEffect, useRef, useState, useCallback } from 'react';
import openSocket from '../services/socket-io';

let globalSocket = null;
let isConnecting = false;

export const useSocket = () => {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const initializeSocket = useCallback(() => {
        if (isConnecting || (globalSocket && globalSocket.connected)) {
            return;
        }

        isConnecting = true;
        
        try {
            console.log('Inicializando novo socket...');
            globalSocket = openSocket();
            
            if (globalSocket) {
                globalSocket.on('connect', () => {
                    console.log('Socket conectado com sucesso');
                    setConnected(true);
                    isConnecting = false;
                    
                    // Limpar timeout de reconexão se existir
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                        reconnectTimeoutRef.current = null;
                    }
                });

                globalSocket.on('disconnect', (reason) => {
                    console.log('Socket desconectado:', reason);
                    setConnected(false);
                    isConnecting = false;
                    
                    // Se a desconexão não foi intencional, tenta reconectar
                    if (reason !== 'io client disconnect') {
                        reconnectTimeoutRef.current = setTimeout(() => {
                            console.log('Tentando reconectar...');
                            globalSocket = null;
                            initializeSocket();
                        }, 3000);
                    }
                });

                globalSocket.on('connect_error', (error) => {
                    console.error('Erro de conexão no socket:', error);
                    setConnected(false);
                    isConnecting = false;
                    
                    // Tentar reconectar após erro
                    reconnectTimeoutRef.current = setTimeout(() => {
                        globalSocket = null;
                        initializeSocket();
                    }, 5000);
                });

                globalSocket.on('error', (error) => {
                    console.error('Erro no socket:', error);
                    if (error.message?.includes('insufficient resources')) {
                        globalSocket.disconnect();
                        setTimeout(() => {
                            globalSocket = null;
                            socketRef.current = null;
                        }, 5000);
                    }
                });

                // Adicionar listener para debug de eventos
                globalSocket.onAny((eventName, ...args) => {
                    console.log(`Evento socket recebido: ${eventName}`, args);
                });
            }
        } catch (err) {
            console.error("Erro ao inicializar socket:", err);
            globalSocket = null;
            isConnecting = false;
        }
    }, []);

    useEffect(() => {
        initializeSocket();
        socketRef.current = globalSocket;

        return () => {
            // Limpar timeout ao desmontar
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            socketRef.current = null;
        };
    }, [initializeSocket]);

    const getSocket = () => {
        return socketRef.current;
    };

    return {
        socket: getSocket(),
        connected,
        // Função utilitária para emitir eventos com tratamento de erro
        emit: (event, data) => {
            try {
                const socket = getSocket();
                if (socket && socket.connected) {
                    socket.emit(event, data);
                    return true;
                }
                return false;
            } catch (err) {
                console.error(`Erro ao emitir evento ${event}:`, err);
                return false;
            }
        },
        // Função utilitária para ouvir eventos com tratamento de erro
        on: (event, callback) => {
            try {
                const socket = getSocket();
                if (socket) {
                    socket.on(event, callback);
                    return true;
                }
                return false;
            } catch (err) {
                console.error(`Erro ao adicionar listener para ${event}:`, err);
                return false;
            }
        },
        // Função utilitária para remover listeners com tratamento de erro
        off: (event, callback) => {
            try {
                const socket = getSocket();
                if (socket) {
                    socket.off(event, callback);
                    return true;
                }
                return false;
            } catch (err) {
                console.error(`Erro ao remover listener para ${event}:`, err);
                return false;
            }
        }
    };
};
