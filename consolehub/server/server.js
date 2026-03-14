const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const forumRoutes = require('./routes/forum');
const repairRoutes = require('./routes/repair');
const listingRoutes = require('./routes/listings');
const dmRoutes = require('./routes/dm');
const notifRoutes = require('./routes/notifications');
const Message = require('./models/Message');
const DirectMessage = require('./models/DirectMessage');
const Notification = require('./models/Notification');
const { JWT_SECRET } = require('./middleware/auth');
const User = require('./models/User');
const Listing = require('./models/Listing');
const { sendListingDMEmail } = require('./services/email');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ─── MongoDB ────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cnote';
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));

// ─── REST Routes ────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/repair', repairRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/notifications', notifRoutes);

// Chat message history
app.get('/api/messages/:roomId', async (req, res) => {
    try {
        const roomId = String(req.params.roomId).slice(0, 50);
        const msgs = await Message.find({ roomId }).sort({ createdAt: -1 }).limit(60).lean();
        res.json(msgs.reverse());
    } catch (err) {
        console.error('Messages fetch:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── Socket.io ──────────────────────────────────────────
const onlineUsers = new Map();   // socketId → { userId, username, roomId }
const typingUsers = new Map();

function usersInRoom(roomId) {
    const set = new Set();
    for (const d of onlineUsers.values()) if (d.roomId === roomId) set.add(d.username);
    return [...set];
}
function typingInRoom(roomId) {
    const set = new Set();
    for (const d of typingUsers.values()) if (d.roomId === roomId) set.add(d.username);
    return [...set];
}

// Authenticate socket connections
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id;
        socket.username = decoded.username;
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    // Join a chat room
    socket.on('join-room', (roomId) => {
        const prev = socket.currentRoom;
        if (prev) {
            socket.leave(prev);
            typingUsers.delete(socket.id);
            io.to(prev).emit('typing', typingInRoom(prev));
            onlineUsers.delete(socket.id);
            io.to(prev).emit('online-users', usersInRoom(prev));
        }
        socket.currentRoom = roomId;
        socket.join(roomId);
        onlineUsers.set(socket.id, { userId: socket.userId, username: socket.username, roomId });
        io.to(roomId).emit('online-users', usersInRoom(roomId));
    });

    // Chat message
    socket.on('chat-message', async ({ roomId, content }) => {
        if (!content?.trim() || !roomId) return;
        try {
            const msg = await Message.create({
                roomId: String(roomId).slice(0, 50),
                senderId: socket.userId,
                username: socket.username,
                content: String(content).slice(0, 2000),
            });
            io.to(roomId).emit('chat-message', msg);
            typingUsers.delete(socket.id);
            io.to(roomId).emit('typing', typingInRoom(roomId));
        } catch (err) {
            console.error('Chat save:', err);
        }
    });

    // Typing
    socket.on('typing', ({ roomId, isTyping }) => {
        if (isTyping) typingUsers.set(socket.id, { username: socket.username, roomId });
        else typingUsers.delete(socket.id);
        io.to(roomId).emit('typing', typingInRoom(roomId));
    });

    // DM
    socket.on('dm', async ({ receiverId, content, listingRef }) => {
        if (!content?.trim() || !receiverId) return;
        try {
            const dm = await DirectMessage.create({
                senderId: socket.userId,
                receiverId,
                content: String(content).slice(0, 2000),
                listingRef: listingRef || null,
            });
            const populated = await DirectMessage.findById(dm._id).populate('listingRef', 'title price images').lean();
            // Send to receiver's personal room
            io.to(`user:${receiverId}`).emit('dm', populated);
            // Echo back to sender
            socket.emit('dm', populated);
            // Notification
            const notif = await Notification.create({
                userId: receiverId,
                type: 'new_dm',
                message: `Mesaj nou de la ${socket.username}`,
                link: `dm:${socket.userId}`,
            });
            io.to(`user:${receiverId}`).emit('notification', notif);

            // Email on first DM in a conversation about a listing
            if (listingRef) {
                const previousDM = await DirectMessage.findOne({
                    senderId: socket.userId, receiverId, _id: { $ne: dm._id },
                }).lean();
                if (!previousDM) {
                    const [receiver, listing] = await Promise.all([
                        User.findById(receiverId).select('email username').lean(),
                        Listing.findById(listingRef).select('title price').lean(),
                    ]);
                    if (receiver?.email && listing) {
                        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
                        sendListingDMEmail({
                            toEmail: receiver.email,
                            ownerName: receiver.username,
                            buyerName: socket.username,
                            listingTitle: listing.title,
                            listingPrice: listing.price,
                            messageContent: String(content).slice(0, 500),
                            conversationLink: `${baseUrl}/?dm=${socket.userId}`,
                        }).catch(err => console.error('DM email error:', err));
                    }
                }
            }
        } catch (err) {
            console.error('DM save:', err);
        }
    });

    // Join personal notification room
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', () => {
        const room = socket.currentRoom;
        onlineUsers.delete(socket.id);
        typingUsers.delete(socket.id);
        if (room) {
            io.to(room).emit('online-users', usersInRoom(room));
            io.to(room).emit('typing', typingInRoom(room));
        }
    });
});

// Make io accessible in routes
app.set('io', io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`CNote server on port ${PORT}`));
