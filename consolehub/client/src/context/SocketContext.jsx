import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ token, children }) {
    const [socket, setSocket] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        if (!token) return;
        const s = io(window.location.origin, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });
        ref.current = s;
        setSocket(s);
        return () => { s.disconnect(); ref.current = null; };
    }, [token]);

    return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
    return useContext(SocketContext);
}
