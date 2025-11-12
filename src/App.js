import React, { useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";
import './App.css'; // import dark theme CSS


const BACKEND_REST_URL = process.env.BACKEND_REST_URL;
const BACKEND_WS_URL = process.env.BACKEND_WS_URL;
//const BACKEND_REST_URL = "http://localhost:8090/api/v1/rooms";
//const BACKEND_WS_URL = "http://localhost:8090/ws";


function App() {
  const [roomId, setRoomId] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(null);
  const [client, setClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  // ✅ Create Room + Auto Join
  const handleCreateRoom = async () => {
    if (!roomId || !username) return alert("Enter Room ID and Username!");

    try {
      await axios.post(`${BACKEND_REST_URL}`, { roomId }, {
        headers: { "Content-Type": "application/json" },
      });

      // After creation, auto-join
      const res = await axios.get(`${BACKEND_REST_URL}/${roomId}/messages`);
      setMessages(res.data.reverse());
      setJoinedRoom(roomId);
      connectWebSocket(roomId);

    } catch (err) {
      if (err.response && err.response.status === 400) {
        alert("Room already exists!");
        
      } else {
        alert("Error creating room");
        console.error(err);
      }
    }
  };

  // ✅ Join Room
  const handleJoinRoom = async () => {
    if (!roomId || !username) return alert("Enter Room ID and Username!");
    try {
      const res = await axios.get(`${BACKEND_REST_URL}/${roomId}/messages`);
      setMessages(res.data.reverse());
      setJoinedRoom(roomId);
      connectWebSocket(roomId);
    } catch (err) {
      alert("Room not found!");
      console.error(err);
    }
  };




  const connectWebSocket = (roomId) => {
    const socket = new SockJS(BACKEND_WS_URL);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
    });

    stompClient.onConnect = () => {
      setClient(stompClient);

      stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
        const body = JSON.parse(message.body);
        setMessages((prev) => [...prev, body]);
      });

      stompClient.publish({
        destination: `/app/addUser/${roomId}`,
        body: JSON.stringify({ sender: username, roomId }),
      });
    };

    stompClient.activate();
  };

  const sendMessage = () => {
    if (!client || !joinedRoom || newMessage.trim() === "") return;

    const messageRequest = { roomId: joinedRoom, sender: username, content: newMessage };

    client.publish({
      destination: `/app/sendMessage/${joinedRoom}`,
      body: JSON.stringify(messageRequest),
    });

    setNewMessage("");
  };

  return (
    <div className="app-container">
      {!joinedRoom ? (
        <div className="join-room" >
          <h2>Chatt App</h2>
          <input type="text" placeholder="Enter Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="text" placeholder="Enter Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <div className="buttons">
            <button className="create-button" onClick={handleCreateRoom}>Create Room</button>
            <button className="join-button" onClick={handleJoinRoom}>Join Room</button>
          </div>
        </div>
      ) : (
        <div className="chat-room">
          <h2>Room ID : <span className="roomid">{joinedRoom} </span></h2>
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender === username ? "message-right" : "message-left"}`}>
                <span><strong>{msg.sender}: </strong>{msg.content}</span>
              </div>
            ))}
          </div>
          <div className="message-input-container">
            <input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
