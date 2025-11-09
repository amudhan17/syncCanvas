# SyncCanvas – Real-Time Collaborative Drawing App

SyncCanvas is a collaborative drawing board that is shared in real-time where users can draw simultaneously on the same canvas.  
When one person draws, everyone else sees what they are drawing live. It is easy to use, fast and runs in the browser.


## Live Demo

https://synccanvas.onrender.com/

## Features

- Collaboratively create artwork on the canvas with multiple people simultaneously
- Each user has a uniquely colored **cursor indicator** that is viewable by everyone on the canvas.
- Change brush color, and change brush size.
- Included an **Eraser**, **Undo**, and **Clear Canvas** feature.
- Shows the number of users currently connected.
- Natural smooth drawing without any kind of dot in the line.


## Technology Used

Frontend Drawing - HTML5 Canvas + JavaScript 
Real-Time Communication - Socket.io 
Server Backend - Node.js + Express 
Hosting/Deployment - Render 


## Project Structure

syncCanvas/
├── client/
│ ├── index.html
│ ├── style.css
│ └── main.js
└── server/
└── server.js

## How to Run Locally

Open terminal and run:
1. cd server 
2. npm install
3. npm start

Open your browser and visit: http://localhost:3000

#  How It Functions

- A user makes a drawing and their strokes are sent to the server using Socket.io.
- The server then sends that stroke data to all the other users.
- Therefore, the canvas on each user's screen will update so that all users can see what is going on in real time.
- The server also manages the strokes so that the **Undo** and **Clear** buttons are still in sync with all users.

##  Summary

This project demonstrated
- Real time web communications
- State management of the shared canvas
- Event driven programming
- WebSockets in a real world application

This could be used as a shared drawing board, teaching tool, brainstorming canvas and collaborative art space.
