const express = require("express");
const http = require("http");
const cors = require("cors");
const logger = require("morgan");
const path = require("path");
const { Server: SocketServer } = require("socket.io");
const chatsRouter = require("./routes/chat.routes");
const botsRouter = require("./routes/bot.routes");
const leadsRouter = require("./routes/leads.routes");
const contactRouter = require("./routes/contact.routes");
const messageFlowRouter = require("./routes/messageFlow.routes");
const botMessageFlowRouter = require("./routes/botMessageFlow.routes");
const whatsappConversationRouter = require("./routes/whatsappConversation.routes");
const expressIP = require("express-ip");
const fs = require("fs");
const app = express();
const rfs = require("rotating-file-stream");
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((o) =>
  o.trim()
);
const WHATSAPP_BOTS_API_URL = process.env.WHATSAPP_BOTS_API_URL;
const axios = require("axios");

app.use(expressIP().getIpInfoMiddleware);
app.set("trust proxy", true);

const server = http.createServer(app);
const port = process.env.PORT || 5000;

const io = new SocketServer(server, {
  path: "/hair-questionary/api/socket.io",
  cors: {
    origin: allowedOrigins,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 3 * 60 * 1000, // 3 minutos de recuperación
    skipMiddlewares: true,
  },
  pingInterval: 30000, // Envía un ping cada 30 segundos
  pingTimeout: 180000, // Espera hasta 60 segundos antes de desconectar
  reconnectionAttempts: Infinity, // Intentar reconectar indefinidamente
  reconnectionDelay: 1000, // 1 segundo para el primer intento
  reconnectionDelayMax: 5000, // Hasta 5 segundos para los siguientes intentos
  randomizationFactor: 0.5, // Para diversificar los intentos
});

function getTimestamp() {
  const now = new Date();
  return now.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Mapea códigos de color ANSI a colores CSS
const colorMapping = {
  "\x1b[32m": "green", // Verde
  "\x1b[31m": "#c71010", // Rojo
  "\x1b[33m": "#b9882e", // Naranja
  "\x1b[36m": "#247272", // Cian
};

// Función para convertir códigos ANSI a HTML
function ansiToHtml(logText) {
  // Detecta si hay algún código de color ANSI en el texto
  const match = logText.match(/\x1b\[(3[1-7])m/);

  if (match && colorMapping[match[0]]) {
    // Si hay código ANSI, envuelve el texto en un <span> con el color correspondiente
    const color = colorMapping[match[0]];
    const cleanText = logText.replace(/\x1b\[\d+m/g, "").replace("%s", ""); // Elimina los códigos ANSI del texto
    return `<span style="color: ${color};">${cleanText}</span>`;
  }

  // Si no hay código ANSI, devuelve el texto tal cual
  return logText;
}

let logFileName = "";

function getFormattedDate() {
  return getTimestamp().replace(/[/\s,:]/g, "-");
}

function getLogFileName() {
  logFileName = `${getFormattedDate()}.log`;
  return logFileName;
}

const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

rfs.createStream(() => getLogFileName(), {
  interval: "15d",
  path: logsDir,
  initialRotation: false,
});

function prependLog(message) {
  const logFilePath = path.join(logsDir, logFileName);
  const logData = fs.existsSync(logFilePath)
    ? fs.readFileSync(logFilePath, "utf8")
    : "";
  fs.writeFileSync(logFilePath, `${message}\n${logData}`, "utf8");
}

app.use(logger("dev"));
// app.use(logger("dev", { stream: logStream }));
const originalConsoleLog = console.log;
console.log = (...args) => {
  const timestampedMessage = `[${getTimestamp()}] ${args.join(" ")}`;
  originalConsoleLog(timestampedMessage);
  prependLog(ansiToHtml(timestampedMessage));
  // logStream.write(ansiToHtml(timestampedMessage) + "\n");
};

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// **************************** GOOGLE AUTH ****************************
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONT_BASE_URL,
} = process.env;

// Simula base de datos
const userTokens = {}; // { userId: { access_token, refresh_token } }

app.get("/hair-questionary/api/google/auth/:userId", (req, res) => {
  const { userId } = req.params;

  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ].join(" ");

  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&scope=${encodeURIComponent(
    scopes
  )}&access_type=offline&prompt=consent&state=${userId}`;

  res.redirect(url);
});

app.get("/hair-questionary/api/google/callback", async (req, res) => {
  const { code, state: userId } = req.query;

  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    });

    const { access_token, refresh_token, expires_in } = response.data;

    userTokens[userId] = {
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000,
    };

    console.log(
      `Tokens guardados para el usuario ${userId}:`,
      access_token,
      refresh_token
    );

    res.redirect(`${FRONT_BASE_URL}/google-success?userId=${userId}`);
  } catch (error) {
    console.error(error.response?.data);
    res.status(500).send("Error en la autorización");
  }
});

app.use("/hair-questionary/api/chats", chatsRouter);
app.use("/hair-questionary/api/bots", botsRouter);
app.use("/hair-questionary/api/leads", leadsRouter);
app.use("/hair-questionary/api/contact", contactRouter);
app.use("/hair-questionary/api/message-flow", messageFlowRouter);
app.use("/hair-questionary/api/bot-message-flow", botMessageFlowRouter);
app.use("/hair-questionary/api/whatsapp/conversation", whatsappConversationRouter);

app.get("/hair-questionary/api/logs", (req, res) => {
  fs.readdir(logsDir, (err, files) => {
    if (err) {
      res.status(500).send("Error al leer el directorio de logs.");
      return;
    }

    const logFiles = files.filter((file) => file.endsWith(".log"));

    const selectedLog = req.query.file;
    if (selectedLog && logFiles.includes(selectedLog)) {
      const logPath = path.join(logsDir, selectedLog);
      fs.readFile(logPath, "utf8", (err, data) => {
        if (err) {
          res.status(500).send("Error al cargar el archivo de logs.");
          return;
        }
        res.send(`
          <html>
            <head><title>Logs - ${selectedLog}</title></head>
            <body style="font-family: monospace;">
              <a href="/hair-questionary/api/logs">Volver a la lista</a>
              <h1>Logs - ${selectedLog}</h1>
              <pre>${data}</pre>
            </body>
          </html>
        `);
      });
    } else {
      res.send(`
        <html>
          <head><title>Lista de Logs</title></head>
          <body style="font-family: monospace;">
            <h1>Archivos de Logs Disponibles</h1>
            <ul>
              ${logFiles
                .map(
                  (file) =>
                    `<li><a href="/hair-questionary/api/logs?file=${file}">${file}</a></li>`
                )
                .join("")}
            </ul>
          </body>
        </html>
      `);
    }
  });
});

app.get("/hair-questionary/api/whatsapp-bots", async (req, res) => {
  try {
    const bots = await axios.get(`${WHATSAPP_BOTS_API_URL}/bots`);
    res.json(bots?.data);
  } catch (error) {
    console.error("Error al obtener bots:", error);
    res.status(500).json({ message: error?.message });
  }
});

app.get("/hair-questionary/api/whatsapp-bots/:id", async (req, res) => {
  try {
    const bots = await axios.get(
      `${WHATSAPP_BOTS_API_URL}/bots/` + req?.params?.id
    );
    res.json(bots?.data);
  } catch (error) {
    console.error("Error al obtener bot:", error);
    res.status(500).json({ message: error?.message });
  }
});

app.post("/hair-questionary/api/whatsapp-bots", async (req, res) => {
  try {
    const { body } = req;
    if (!body)
      return res.status(400).json({ message: "No se ha enviado el body" });

    const { userId, ...bodyToSend } = body;
    if (userId && userTokens?.[userId]) {
      const { access_token, refresh_token } = userTokens[userId];
      bodyToSend.googleAccessToken = access_token;
      bodyToSend.googleRefreshToken = refresh_token;
    }
    const bots = await axios.post(`${WHATSAPP_BOTS_API_URL}/bots`, bodyToSend);
    res.status(201).json(bots?.data);
  } catch (error) {
    console.error("Error al crear bot:", error);
    res.status(500).json({ message: error?.message });
  }
});

app.put("/hair-questionary/api/whatsapp-bots/:id", async (req, res) => {
  try {
    const { body } = req;
    if (!body)
      return res.status(400).json({ message: "No se ha enviado el body" });

    const { userId, ...bodyToSend } = body;
    console.log(body);
    if (userId && userTokens?.[userId]) {
      const { access_token, refresh_token } = userTokens[userId];
      console.log("userId", userTokens[userId]);
      console.log("userTokens", access_token);
      bodyToSend.googleAccessToken = access_token;
      bodyToSend.googleRefreshToken = refresh_token;
    }
    const bots = await axios.put(
      `${WHATSAPP_BOTS_API_URL}/bots/${req?.params?.id}`,
      bodyToSend
    );
    res.json(bots?.data);
  } catch (error) {
    console.error("Error al actualizar bot:", error);
    res.status(500).json({ message: error?.message });
  }
});

app.delete("/hair-questionary/api/whatsapp-bots/:id", async (req, res) => {
  try {
    const bots = await axios.delete(
      `${WHATSAPP_BOTS_API_URL}/bots/${req?.params?.id}`
    );
    res.json(bots?.data);
  } catch (error) {
    console.error("Error al eliminar bot:", error);
    res.status(500).json({ message: error?.message });
  }
});

app.use("/hair-questionary/", express.static(path.join(__dirname, "dist")));

app.get("/hair-questionary/api/whatsapp-logs", async (req, res) => {
  try {
    const response = await axios.get(
      `${WHATSAPP_BOTS_API_URL}/logs?${Object.keys(req?.query)
        .map((key) => `${key}=${req?.query[key]}`)
        .join("&")}`,
      {
        responseType: 'text',
      }
    );

    res.send(response.data);
  } catch (error) {
    console.error("Error al obtener logs:", error);
    res.status(500).send("Error al obtener logs.");
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

server.listen(port, () => {
  console.log("listening on port " + port);
});

module.exports = { app, io };
