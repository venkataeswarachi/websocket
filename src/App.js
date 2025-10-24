import React, { useState, useEffect } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const BACKEND_URL = "https://chat-application-5jrt.onrender.com/ws"; // change to your backend

function App() {
  const [client, setClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    return () => {
      if (client) client.deactivate();
    };
  }, [client]);

  const connect = () => {
    if (!username) return alert("Enter your name");

    const socket = new SockJS(BACKEND_URL);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        setConnected(true);
        stompClient.subscribe("/topic/public", (msg) => {
          const body = JSON.parse(msg.body);
          setMessages((prev) => [...prev, body]);
        });
        stompClient.publish("/app/addUser", JSON.stringify({ sender: username, type: "JOIN" }));
      },
    });

    stompClient.activate();
    setClient(stompClient);
  };

  const disconnect = () => {
    if (client) client.deactivate();
    setConnected(false);
    setClient(null);
  };

  const sendMessage = () => {
    if (!messageInput || !client) return;
    client.publish(
      "/app/sendMessage",
      JSON.stringify({ sender: username, content: messageInput, type: "CHAT" })
    );
    setMessageInput("");
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      {!connected && (
        <div>
          <input
            type="text"
            placeholder="Enter name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={connect}>Connect</button>
        </div>
      )}
      {connected && (
        <div>
          <button onClick={disconnect}>Disconnect</button>
          <div style={{ border: "1px solid #ccc", height: "300px", overflowY: "scroll", marginTop: "10px", padding: "5px" }}>
            {messages.map((msg, idx) => (
              <div key={idx}>
                {msg.type === "JOIN" ? <em>{msg.sender} joined</em> : <b>{msg.sender}:</b>} {msg.content}
              </div>
            ))}
          </div>
          <input
            type="text"
            placeholder="Type message"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </div>
  );
}

export default App;
