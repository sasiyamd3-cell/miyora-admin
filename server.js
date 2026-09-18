const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MONGODB DATABASE
// ==========================================
// මෙතන ඔයාගේ MongoDB URI එක paste කරන්න
const MONGODB_URI =
    "mongodb+srv://sasiyamd3_db_user:gJLM5AVLnE8qoa20@cluster0.q0olms4.mongodb.net/ ";

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log("✅ MongoDB Connected Successfully");
    })
    .catch((err) => {
        console.error("❌ MongoDB Connection Failed:");
        console.error(err.message);
    });

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// TELEMETRY MODEL
// ==========================================
const Telemetry = mongoose.model("Telemetry", {
    botName: {
        type: String,
        default: "MIYORA MD"
    },

    botNumber: {
        type: String,
        default: "Unknown"
    },

    status: {
        type: String,
        default: "offline"
    },

    users: {
        type: Number,
        default: 0
    },

    groups: {
        type: Number,
        default: 0
    },

    messages: {
        type: Number,
        default: 0
    },

    speed: {
        type: Number,
        default: 0
    },

    uptime: {
        type: Number,
        default: 0
    },

    memory: {
        type: Number,
        default: 0
    },

    cpu: {
        type: Number,
        default: 0
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ==========================================
// ERROR MODEL
// ==========================================
const BotError = mongoose.model("BotError", {
    command: String,
    message: String,
    stack: String,

    time: {
        type: Date,
        default: Date.now
    }
});

// ==========================================
// ACTIVITY MODEL
// ==========================================
const Activity = mongoose.model("Activity", {
    type: String,
    command: String,
    speed: Number,

    time: {
        type: Date,
        default: Date.now
    }
});

// ==========================================
// BOT UPDATE
// ==========================================
app.post("/api/bot/update", async (req, res) => {
    try {
        const data = await Telemetry.create({
            botName: req.body.botName || "MIYORA MD",
            botNumber: req.body.botNumber || "Unknown",
            status: req.body.status || "online",
            users: Number(req.body.users) || 0,
            groups: Number(req.body.groups) || 0,
            messages: Number(req.body.messages) || 0,
            speed: Number(req.body.speed) || 0,
            uptime: Number(req.body.uptime) || 0,
            memory: Number(req.body.memory) || 0,
            cpu: Number(req.body.cpu) || 0
        });

        res.json({
            success: true,
            message: "Bot statistics saved",
            data
        });

    } catch (error) {
        console.error("BOT UPDATE ERROR:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// BOT ERROR
// ==========================================
app.post("/api/bot/error", async (req, res) => {
    try {
        const error = await BotError.create({
            command: req.body.command || "Unknown",
            message: req.body.message || "Unknown error",
            stack: req.body.stack || ""
        });

        res.json({
            success: true,
            message: "Error saved",
            data: error
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ==========================================
// BOT ACTIVITY
// ==========================================
app.post("/api/bot/activity", async (req, res) => {
    try {
        const activity = await Activity.create({
            type: req.body.type || "command",
            command: req.body.command || "Unknown",
            speed: Number(req.body.speed) || 0
        });

        res.json({
            success: true,
            message: "Activity saved",
            data: activity
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ==========================================
// DASHBOARD DATA
// ==========================================
app.get("/api/dashboard", async (req, res) => {
    try {
        const latest = await Telemetry
            .findOne()
            .sort({ createdAt: -1 });

        const totalRecords =
            await Telemetry.countDocuments();

        const totalErrors =
            await BotError.countDocuments();

        const totalActivities =
            await Activity.countDocuments();

        res.json({
            success: true,

            data: latest,

            totals: {
                records: totalRecords,
                errors: totalErrors,
                activities: totalActivities
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// CHART DATA
// ==========================================
app.get("/api/chart", async (req, res) => {
    try {
        const data = await Telemetry
            .find()
            .sort({ createdAt: -1 })
            .limit(30)
            .select(
                "speed users groups messages memory cpu createdAt"
            );

        res.json({
            success: true,
            data: data.reverse()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// ERRORS
// ==========================================
app.get("/api/errors", async (req, res) => {
    try {
        const errors = await BotError
            .find()
            .sort({ time: -1 })
            .limit(100);

        res.json({
            success: true,
            data: errors
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// ACTIVITY
// ==========================================
app.get("/api/activity", async (req, res) => {
    try {
        const activity = await Activity
            .find()
            .sort({ time: -1 })
            .limit(100);

        res.json({
            success: true,
            data: activity
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get("/api/health", (req, res) => {

    const mongoStatus =
        mongoose.connection.readyState === 1
            ? "CONNECTED"
            : "DISCONNECTED";

    res.json({
        success: true,
        name: "MIYORA MD ADMIN",
        mongodb: mongoStatus,
        uptime: process.uptime(),
        memory:
            Math.round(
                process.memoryUsage().rss / 1024 / 1024
            ) + " MB",
        time: new Date()
    });
});

// ==========================================
// HOME
// ==========================================
app.get("*", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌸 MIYORA MD ADMIN");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 Port      :", PORT);
    console.log("🗄️ MongoDB   : Connecting...");
    console.log("📊 Dashboard : Online");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

});
