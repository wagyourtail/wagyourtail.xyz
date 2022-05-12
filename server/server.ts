import express from 'express';

const app = express();

app.use('/api', express.static('api', {
  setHeaders: function(res, path) {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Headers", "Content-Type,X-Requested-With");
      res.set("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
      res.type("application/json");
  }
}));

app.use('/', express.static('../dist/website-angular-recode'));


app.listen(3000, () => { console.log('Server started on port 3000'); });
