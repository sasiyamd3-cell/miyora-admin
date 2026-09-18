const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ==============================
   MONGODB
================================ */

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.log("❌ MONGODB_URI is missing");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MIYORA ADMIN MongoDB Connected"))
    .catch(err => console.log("❌ MongoDB Error:", err.message));


/* ==============================
   TELEMETRY MODEL
================================ */

const TelemetrySchema = new mongoose.Schema({
    botName: String,
    botNumber: String,

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

const Telemetry =
    mongoose.models.MiyoraTelemetry ||
    mongoose.model("MiyoraTelemetry", TelemetrySchema);


/* ==============================
   ERROR MODEL
================================ */

const ErrorSchema = new mongoose.Schema({

    command: String,

    message: String,

    stack: String,

    time: {
        type: Date,
        default: Date.now
    }

});

const BotError =
    mongoose.models.MiyoraBotError ||
    mongoose.model("MiyoraBotError", ErrorSchema);


/* ==============================
   ACTIVITY MODEL
================================ */

const ActivitySchema = new mongoose.Schema({

    type: String,

    command: String,

    speed: Number,

    time: {
        type: Date,
        default: Date.now
    }

});

const Activity =
    mongoose.models.MiyoraActivity ||
    mongoose.model("MiyoraActivity", ActivitySchema);


/* ==============================
   LIVE BOT UPDATE
================================ */

app.post("/api/bot/update", async (req, res) => {

    try {

        const data = req.body;

        await Telemetry.create({

            botName: data.botName || "MIYORA MD",

            botNumber: data.botNumber || "Unknown",

            status: "online",

            users: Number(data.users || 0),

            groups: Number(data.groups || 0),

            messages: Number(data.messages || 0),

            speed: Number(data.speed || 0),

            uptime: Number(data.uptime || 0),

            memory: Number(data.memory || 0),

            cpu: Number(data.cpu || 0)

        });

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


/* ==============================
   ERROR RECEIVER
================================ */

app.post("/api/bot/error", async (req, res) => {

    try {

        await BotError.create({

            command: req.body.command || "unknown",

            message: req.body.message || "Unknown error",

            stack: req.body.stack || ""

        });

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


/* ==============================
   ACTIVITY RECEIVER
================================ */

app.post("/api/bot/activity", async (req, res) => {

    try {

        await Activity.create({

            type: req.body.type || "message",

            command: req.body.command || "",

            speed: Number(req.body.speed || 0)

        });

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


/* ==============================
   DASHBOARD
================================ */

app.get("/api/dashboard", async (req, res) => {

    try {

        const latest =
            await Telemetry
                .findOne()
                .sort({ createdAt: -1 });

        const errors =
            await BotError.countDocuments();

        const activities =
            await Activity.countDocuments();

        if (!latest) {

            return res.json({

                botName: "MIYORA MD",

                botNumber: "Waiting...",

                status: "offline",

                users: 0,

                groups: 0,

                messages: 0,

                speed: 0,

                uptime: 0,

                memory: 0,

                cpu: 0,

                errors,

                activities,

                database:
                    mongoose.connection.readyState === 1
                        ? "connected"
                        : "disconnected"

            });

        }


        const age =
            Date.now() -
            new Date(latest.createdAt).getTime();


        const online =
            age < 30000;


        res.json({

            botName:
                latest.botName,

            botNumber:
                latest.botNumber,

            status:
                online
                    ? "online"
                    : "offline",

            users:
                latest.users,

            groups:
                latest.groups,

            messages:
                latest.messages,

            speed:
                latest.speed,

            uptime:
                latest.uptime,

            memory:
                latest.memory,

            cpu:
                latest.cpu,

            errors,

            activities,

            database:
                mongoose.connection.readyState === 1
                    ? "connected"
                    : "disconnected"

        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


/* ==============================
   CHART
================================ */

app.get("/api/chart", async (req, res) => {

    try {

        const from =
            new Date(
                Date.now() -
                24 * 60 * 60 * 1000
            );


        const data =
            await Activity.aggregate([

                {
                    $match: {
                        time: {
                            $gte: from
                        }
                    }
                },

                {
                    $group: {

                        _id: {
                            $dateToString: {
                                format: "%H:%M",
                                date: "$time"
                            }
                        },

                        count: {
                            $sum: 1
                        }

                    }
                },

                {
                    $sort: {
                        "_id": 1
                    }
                }

            ]);


        res.json(data);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


/* ==============================
   ERRORS
================================ */

app.get("/api/errors", async (req, res) => {

    try {

        const data =
            await BotError
                .find()
                .sort({ time: -1 })
                .limit(100);

        res.json(data);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


/* ==============================
   RECENT ACTIVITY
================================ */

app.get("/api/activity", async (req, res) => {

    try {

        const data =
            await Activity
                .find()
                .sort({ time: -1 })
                .limit(50);

        res.json(data);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


/* ==============================
   HEALTH
================================ */

app.get("/api/health", async (req, res) => {

    res.json({

        server: "online",

        database:
            mongoose.connection.readyState === 1
                ? "connected"
                : "disconnected",

        uptime:
            process.uptime(),

        memory:
            process.memoryUsage().rss

    });

});


/* ==============================
   PAGE
================================ */

app.get("*", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


/* ==============================
   START
================================ */

const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`
╔══════════════════════════════╗
║        🌸 MIYORA ADMIN       ║
║                              ║
║  🚀 PORT: ${PORT}             ║
║  📊 LIVE MONITOR             ║
╚══════════════════════════════╝
`);

});
