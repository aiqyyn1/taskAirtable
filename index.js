const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const port = 8001;
app.use(express.urlencoded({ extended: true }));
app.set('views', './template.ejs')
app.set('view engine', 'ejs')
const reportRouter = require('./router');

app.get('/blanks', reportRouter);
app.listen(port, () => console.log(`Port listen in  ${port}`));