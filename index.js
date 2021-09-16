const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs');
const { exec } = require("child_process");
const app = express()
const port = 3000
const domain = "rtmp://149.56.20.83:1935"

const nginx_config = `
  application %APP_NAME% {
    live on;
    record %RECORD%;

    %LIST_URL%
  }
`;

app.use(bodyParser.json({ type: 'application/json' }))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/register', (req, res) => {
  let { streamId, broadcast } = req.body;
  if ( !streamId || !broadcast ) return res.send({error: "invalid_input"});
  if ( broadcast.length==1 ) return res.send({url: broadcast[0]});

  let list_url = broadcast.map(url => {
    url = url.replace('live-api-s.facebook.com:443', 'localhost:19350').replace('rtmps://', 'rtmp://')
    return `push ${url};`
  }).join("\n")
  let config = nginx_config.replace(/%APP_NAME%/ig, streamId)
                  .replace(/%RECORD%/ig, 'off')
                  .replace(/%LIST_URL%/ig, list_url);
  fs.writeFileSync(`./nginx-rtmp/${streamId}.conf`, config)
  exec("/usr/local/nginx/sbin/nginx -s reload", (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  })

  res.send({
    url: `${domain}/${streamId}/live`,
    stream_url: `${domain}/${streamId}/`,
    stream_key: "live"
  })
})

function cleanUp() {
  // delete all confid file after 8 hours
	exec("find ./nginx-rtmp/ -daystart -maxdepth 1 -mmin +480 -type f -name '*.conf' -exec rm -f {} \\;", (error, stdout, stderr) => {})
}

setInterval(cleanUp, 30 * 60 * 1000) // 30 mins

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
