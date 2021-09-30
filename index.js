const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs');
const { exec } = require("child_process");
const basicAuth = require('express-basic-auth')
const app = express()
const port = 3000
const domain = process.env.PUBLIC_DOMAIN || ""

if ( process.env.USER && process.env.PASSWORD ) {
  let users = {};
  users[process.env.USER] = process.env.PASSWORD;
  app.use(basicAuth({ users }))
}
app.use(express.static('recorded'))

const nginx_config = `
  application %APP_NAME% {
    live on;
    record %RECORD%;
    record_path /app/recorded;
    record_unique on;
    record_append on;

    %LIST_URL%
  }
`;

function reloadNginx() {
  return new Promise((resolve, reject) => {
    exec("/usr/local/nginx/sbin/nginx -s reload", (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return;
      }
      if (stderr) {
        reject(stderr)
        return;
      }
      resolve();
    })
  });
}

app.use(bodyParser.json({ type: 'application/json' }))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/register', (req, res) => {
  let { streamId, broadcast } = req.body;
  if ( !streamId || !broadcast ) return res.send({error: "invalid_input"});
  if ( !record && broadcast.length==1 ) return res.send({url: broadcast[0]});

  let list_url = broadcast.map(url => {
    url = url.replace('live-api-s.facebook.com:443', 'localhost:19350').replace('rtmps://', 'rtmp://')
    return `push ${url};`
  }).join("\n")
  streamId = streamId.replace(/\//g, '').replace(/\./g, '');
  let record = req.body.record ? 'all' : 'off';
  let config = nginx_config.replace(/%APP_NAME%/ig, streamId)
                  .replace(/%RECORD%/ig, record)
                  .replace(/%LIST_URL%/ig, list_url);
  let configFile = `./nginx-rtmp/${streamId}.conf`;
  fs.writeFileSync(configFile, config)
  return reloadNginx().then(_ => {
    console.log('reloadNginx ok')
    return res.send({
      url: `${domain}/${streamId}/live`,
      stream_url: `${domain}/${streamId}/`,
      stream_key: streamId
    })
  }).catch(e => {
    console.log('reloadNginx error, remove file ', configFile, e)
    fs.unlink(configFile, (e) => {})
    return res.send({error: "config file error"})
  })
})

app.get('/remove', (req, res) => {
  if ( !req.query.id ) return res.send({ error: "invalid_input" });
  let streamId = req.query.id.replace(/\//g, '').replace(/\./g, '');
  fs.unlink(`./nginx-rtmp/${streamId}.conf`, (e) => {})
  reloadNginx()
  res.send({
    status: "success"
  })
})

app.get('/record', (req, res) => {
  if ( !req.query.id ) return res.send({ error: "invalid_input" });
  let streamId = req.query.id.replace(/\./, '');
  if ( fs.existsSync(`./recorded/${streamId}.flv`) ) {
    return res.send({ url: `https://recorded.gostudio.co/${streamId}.flv` })
  }
  return res.send({error: "file_not_found"})
})

function cleanUp() {
  // delete all config file older than 24 hours
  let deltaTime = parseInt(process.env.MAX_DURATION || 24) * 60
  exec(`find ./nginx-rtmp/ -daystart -maxdepth 1 -mmin +${deltaTime} -type f -name '*.conf' -exec rm -f {} \\;`, (error, stdout, stderr) => {})
}

setInterval(cleanUp, 30 * 60 * 1000) // 30 mins

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
