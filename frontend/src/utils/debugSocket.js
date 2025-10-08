// Debug helper para rastrear problemas com Socket.IO
export const debugSocket = {
    logMessage: (message, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[SOCKET DEBUG ${timestamp}] ${message}`, data);
    },
    
    logMessageFlow: (stage, ticketId, messageData = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[MESSAGE FLOW ${timestamp}] ${stage} - Ticket: ${ticketId}`, messageData);
    },
    
    logSocketState: (socket) => {
        if (socket) {
            console.log('[SOCKET STATE]', {
                connected: socket.connected,
                id: socket.id,
                rooms: Array.from(socket.rooms || [])
            });
        } else {
            console.log('[SOCKET STATE] Socket is null/undefined');
        }
    }
};

export default debugSocket;