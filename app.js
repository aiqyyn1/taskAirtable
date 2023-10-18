const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const port = 8000;
app.use(express.urlencoded({ extended: true }));

const reportRouter = require('./src/routes/index');
app.get('/blanks', reportRouter);
app.listen(port, () => console.log(`Port listen in  ${port}`));
