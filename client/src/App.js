import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./Calendar.css";

function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/user", { credentials: "include" })
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(err => console.error("Fetch error:", err));
  }, []);

  useEffect(() => {
    if (user) {
      fetch("http://localhost:5000/api/events", { credentials: "include" })
        .then(res => res.json())
        .then(data => setEvents(data));
    }
  }, [user]);

  const handleDateClick = (info) => {
    if (!user) {
      alert("ログインが必要です");
      return;
    }
    const title = prompt("予定タイトルを入力してください:");
    if (title) {
      fetch("http://localhost:5000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, start: info.dateStr, end: info.dateStr })
      })
        .then(res => res.json())
        .then(newEvent => setEvents([...events, newEvent]));
    }
  };

  return (
    <div>
      {user ? (
        <div>
          <p>ログイン中: {user.displayName}</p>
          <button onClick={() => {
            fetch("http://localhost:5000/logout", { credentials: "include" })// フロントのトップへ
              .then(() => window.location.href = "/"); }}>ログアウト</button>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            dateClick={handleDateClick}/>
        </div>
      ) : (
        <a href="http://localhost:5000/auth/google">Googleでログイン</a>
      )}
    </div>
  );
}

export default App;