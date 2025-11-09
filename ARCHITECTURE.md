# SyncCanvas - Overview of Its Architecture 

In this document, we will describe how the real-time collaborative drawing system operates in a simple and easy way. 


## 1. System Components 

**Client (Browser)** - Manages drawing to the canvas and sending updates to the server. 
**Server (Node.js + Socket.io)** - Receives the drawing data and broadcasts it to all connected users. 
Between the client and server, we can use ***WebSockets***, which allow for real-time two-way communication. 


## 2. How Real-Time Drawing Works 

1. A user draws an element on the canvas. 
2. The browser collects the stroke's points. 
3. The browser sends the stroke's points to the server using the socket.emit() function. 
4. The server broadcasts the stroke to all connected users. 
5. Each user's canvas instantly updates the drawing. 
User draws → Browser sends stroke → Server → Broadcast to all → Everyone's canvas updates 


## 3. Cursor Indicators 

Each user has a cursor in a color unique to that user. 
The browser is continuously sending the cursor position to the server via the function: 
socket.emit("cursor", { x, y }) 
Other clients draw the cursor position to the screen. 


## 4. Undo & Clear Logic 

- The server holds a list of all strokes that have been made. 
- **Undo** will remove the last stroke made on the server. 
- **Clear** will remove all strokes. 
- After undo or clear, the server sends the updated stroke list to each connected user, ensuring all users see the same drawing state. 

This guarantees that **everyone see’s the same drawing state.**


## 5. How to Avoid Conflict

Even if 2 users draw at the same time:
- Every drawing is stored by storing it as a **stroke
- Every time the user draws, the canvas is re-drawn with the collection of strokes
- No two strokes can overwrite each other

## 6. Future Potential Improvements

- Add user login & usernames
- Save drawings permanently in a database
- Add chat or collaboration notes
