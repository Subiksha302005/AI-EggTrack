require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const flocksRouter = require('./routes/flocks');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/flocks', flocksRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`EggTrack server running at http://localhost:${PORT}`);
});