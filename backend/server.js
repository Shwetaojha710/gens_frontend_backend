const express = require('express');
const { readdirSync } = require('fs');
const app = express();
const cookieParser = require('cookie-parser');
require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const port = process.env.SERVER_PORT || 9000;
const sequelize = require("./app/connection/connection"); 
const DeviceLocationLog = require('./app/models/device_location_logs');
const salarydoc = require('./app/models/salarydoc');
const interview_round = require('./app/models/interview_round');
const round_type = require('./app/models/round_type');
require('./app/models/index');

// const skills = require('./app/models/skills');
// const job_requirement = require('./app/models/job_requirement');

// const documentType = require('./app/models/documentType');
// documentType
// const DeviceLocationLog = require('./app/models/device_location_logs');

// sequelize.sync({ alter: true })
//   .then(() => {
//     console.log('All tables altered successfully');
//   })
//   .catch((error) => {
//     console.error(' Error altering tables:', error);
//   });

// app.use(express.json({ limit: '100mb' }));
// app.use(express.urlencoded({ limit: '100mb', extended: true }));
// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use(cors({
  origin: (origin, callback) => callback(null, origin || true),
  credentials: true
}));



app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));


app.use(express.static("upload"));
app.use('/upload', express.static(path.join(__dirname, 'upload')));


app.use((req, res, next) => {
  console.log('Incoming Content-Length:', req.headers['content-length']);
  next();
});


readdirSync('./app/routes').forEach((route) => {
  app.use('/api', require('./app/routes/' + route));
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/download/:file", (req, res) => {
  const fileName = req.params.file;
  const filePath = path.join(__dirname, "uploads/pdfs", fileName);

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Download error:", err);
      res.status(404).send("File not found");
    }
  });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
