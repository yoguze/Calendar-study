import dotenv from "dotenv";
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config({ path: ".env.development" });
}
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true}));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "default_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// DB初期化
const dbPromise = open({ filename: "events.db", driver: sqlite3.Database });
(async () => {
  const db = await dbPromise;
  await db.run("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, title TEXT, start TEXT, end TEXT, userId TEXT)");
})();

// Passport シリアライズ
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Google OAuth戦略
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  (accessToken, refreshToken, profile, done) => done(null, profile)
));

// Googleログイン開始
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// コールバック
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => res.redirect(process.env.CLIENT_URL)
);

// ログアウト
app.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect(process.env.CLIENT_URL); // ← フロントのトップへ戻す
  });
});

// ユーザー情報API
app.get("/api/user", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

// ユーザーごとのイベント取得
app.get("/api/events", async (req, res) => {
  if (!req.user) return res.json([]);
  const db = await dbPromise;
  const events = await db.all("SELECT * FROM events WHERE userId = ?", [req.user.id]);
  res.json(events);
});

// イベント追加
app.post("/api/events", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "ログインが必要です" });

  const { title, start, end } = req.body;
  const db = await dbPromise;
  const result = await db.run(
    "INSERT INTO events (title, start, end, userId) VALUES (?, ?, ?, ?)",
    [title, start, end, req.user.id]
  );
  res.json({ id: result.lastID, title, start, end, userId: req.user.id });
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 5000}`);
  console.log("SESSION_SECRET:", process.env.SESSION_SECRET);
});
