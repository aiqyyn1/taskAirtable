const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const port = 8000;
app.use(express.urlencoded({ extended: true }));
app.set('views', './template.ejs')
app.set('view engine', 'ejs')
const reportRouter = require('./router');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/blanks', reportRouter);
app.listen(port, () => console.log(`Port listen in  ${port}`));