const express = require('express');
const app = express();
const fs = require('fs');
const hsts = require('hsts')
const path = require('path')

const API_URL = process.env.CONTROLPANEL_API_URL;

app.use(hsts({
  maxAge: 31536000,
  includeSubDomains: true
}))
app.use(express.json())

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).send("Invalid JSON")
  }
  next(err);
});

// Define a GET route that accepts a namespace and application parameter
app.get('/:namespace/:application', (req, res) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "script-src 'self'");
  const { namespace, application } = req.params;
  var filePath = '', configFilePath = ''
  if (!namespace.match(/^[a-zA-Z0-9-]+$/) || !application.match(/^[a-zA-Z0-9-]+$/)) {
    console.warn(`Bad path provided for decoys config file: ${filePath}, ${configFilePath}`);
  } else {
    filePath = path.resolve(`/data/cad-${namespace}-${application}.json`);
    configFilePath = path.resolve(`/data/config-${namespace}-${application}.json`);
  }
  const defaultFilePath = `/data/cad-default.json`;
  const defaultConfigFilePath = `/data/config-default.json`;
  
  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      if (namespace != 'unknown' && application != 'unknown') addApplication(namespace, application);
      // If the file does not exist, try to return the default config file
      fs.access(defaultFilePath, fs.constants.F_OK, (err) => {
        if (err) {
          // If the default file does not exist, return an empty JSON object
          res.json({});
        } else {
          // If the file exists, read its contents and return as JSON object
          fs.readFile(defaultFilePath, 'utf8', (err, decoys) => {
            if (err) {
              console.warn("Default decoy config file is missing !");
              return res.json([]);
            }
            if(!decoys) return res.json([])
            var decoysJson;
            try {
              decoysJson = JSON.parse(decoys);
            } catch(e){
              console.error("File cad-default.json is not a valid json");
              return res.json([]);
            }
            // Check if the file exists
            fs.access(configFilePath, fs.constants.F_OK, err => {
              if(err) {
                fs.access(defaultConfigFilePath, fs.constants.F_OK, err => {
                  if (err) { return res.json({ decoy: decoysJson }) }
                  fs.readFile(defaultConfigFilePath, 'utf8', (err, config) => {
                    if(err) return res.json({ decoy: decoysJson });
                    if (config) {
                      try {
                        const configJson = JSON.parse(config);
                        return res.json({ decoy: decoysJson, config: configJson });
                      } catch(e){
                        console.error("File config-default.json is not a valid json");
                        return res.json([]);
                      }
                    }
                    return res.json({ decoy: decoysJson })
                  })
                })
              } else {
                fs.readFile(configFilePath, 'utf8', (err, config) => {
                  if(err) return res.json({ decoy: decoysJson });
                  if (config) {
                    try{
                      const configJson = JSON.parse(config);
                      return res.json({ decoy: decoysJson, config: configJson });
                    } catch(e){
                      console.error(`File config-${namespace}-${application}.json is not a valid json`);
                      return res.json([]);
                    }
                  }
                  return res.json({ decoy: decoysJson })
                })
              }
            })
          });
        }
      });
    } else {
      // If the file exists, read its contents and return as JSON object
      fs.readFile(filePath, 'utf8', (err, decoys) => {
        if (err) {
          console.warn("Decoy config file is missing !");
          return res.json([]);
        }
        if(!decoys) return res.json([])
        var decoysJson;
        try{
          decoysJson = JSON.parse(decoys);
        } catch(e){
          console.error(`File cad-${namespace}-${application}.json is not a valid json`);
          return res.json([]);
        }
        // Check if the file exists
        fs.access(configFilePath, fs.constants.F_OK, err => {
          if(err) {
            if (namespace != 'unknown' && application != 'unknown') addApplication(namespace, application);
            fs.access(defaultConfigFilePath, fs.constants.F_OK, err => {
              if (err) { return res.json({ decoy: decoysJson }) }
              fs.readFile(defaultConfigFilePath, 'utf8', (err, config) => {
                if(err) return res.json({ decoy: decoysJson });
                if (config) {
                  try{
                    const configJson = JSON.parse(config);
                    return res.json({ decoy: decoysJson, config: configJson });
                  } catch(e){
                    console.log("File config-default.json is not a valid json");
                    return res.json([]);
                  }
                }
                return res.json({ decoy: decoysJson })
              })
            })
          } else {
            fs.readFile(configFilePath, 'utf8', (err, config) => {
              if(err) return res.json({ decoy: decoysJson });
              if (config) {
                try{
                  const configJson = JSON.parse(config);
                  return res.json({ decoy: decoysJson, config: configJson });
                } catch(e){
                  console.error(`File config-${namespace}-${application}.json is not a valid json`);
                  return res.json([]);
                }
              }
              return res.json({ decoy: decoysJson })
            })
          }
        })
      });
    }
  });
});

app.post('/:namespace/:application', (req, res) => {
  if (req.headers['content-type'] != 'application/json') return res.status(400).send("Invalid JSON");
  const { namespace, application } = req.params;
  const body = JSON.stringify(req.body)
  try {
    const parsedBody = JSON.parse(body);
    const newDecoys = parsedBody.decoys;
    const newConfig = parsedBody.config;
    var filePath = '', configFilePath = ''
    if (!namespace.match(/^[a-zA-Z0-9-]+$/) || !application.match(/^[a-zA-Z0-9-]+$/)) {
      console.warn(`Bad path provided for decoys config file: ${filePath}, ${configFilePath}`);
    } else {
      filePath = path.resolve(`/data/cad-${namespace}-${application}.json`);
      configFilePath = path.resolve(`/data/config-${namespace}-${application}.json`);
    }
    const defaultFilePath = `/data/cad-default.json`;
    const defaultConfigFilePath = `/data/config-default.json`;
    
    if (newDecoys){
      fs.access(filePath, fs.constants.F_OK, err => {
        if (err) {
          fs.access(defaultFilePath, fs.constants.F_OK, err => {
            if (err) return res.send("Cannot update decoy config");
            fs.writeFileSync(defaultFilePath, JSON.stringify(newDecoys));
          })
        } else {
          fs.writeFileSync(filePath, JSON.stringify(newDecoys));
        }
      })
    }
    if (newConfig) {
      fs.access(configFilePath, fs.constants.F_OK, err => {
        if (err) {
          fs.access(defaultConfigFilePath, fs.constants.F_OK, err => {
            if (err) return res.send("Cannot update config");
            fs.writeFileSync(defaultConfigFilePath, JSON.stringify(newConfig))
          })
        } else {
          fs.writeFileSync(configFilePath, JSON.stringify(newConfig))
        }
      })
    }
    return res.send("Config updated");
  } catch (err) {
    return res.status(400).send("Invalid JSON");
  }
});

app.get('/blocklist', (req, res) => {
  fs.access("/data/blocklist/blocklist.json", fs.constants.F_OK, err => {
    if (err) {
      fs.writeFileSync("/data/blocklist/blocklist.json", `{"list":[]}`, 'utf8')
      return res.json({list: []})
    }
    const blocklist = JSON.parse(fs.readFileSync("/data/blocklist/blocklist.json", 'utf8'))
    i = 0
    for (const elem of blocklist.list) {
      if (elem.Duration == 'forever') continue
      const unbanDate = new Date(elem.Time * 1000)
      switch (elem.Duration[elem.Duration.length-1]) {
        case 's':
          unbanDate.setSeconds(unbanDate.getSeconds() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
        case 'm':
          unbanDate.setMinutes(unbanDate.getMinutes() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
        case 'h':
          unbanDate.setHours(unbanDate.getHours() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
      }
      if (new Date() >= unbanDate){
        blocklist.list.splice(i, 1)
      }
      i++
    }
    fs.writeFileSync("/data/blocklist/blocklist.json", JSON.stringify(blocklist))
    return res.json(blocklist)
  })
})

app.post('/blocklist', (req, res) => {
  var error;
  fs.access("/data/blocklist/blocklist.json", fs.constants.F_OK, err => {
    if (err) error = err
    const blocklistFile = JSON.parse(fs.readFileSync("/data/blocklist/blocklist.json", 'utf8'))
    blocklistFile.list.push(...req.body.blocklist)
    fs.writeFileSync("/data/blocklist/blocklist.json", JSON.stringify(blocklistFile))
  })
  fs.access("/data/blocklist/throttlelist.json", fs.constants.F_OK, err => {
    if (err) error = err
    const throttlelistFile = JSON.parse(fs.readFileSync("/data/blocklist/throttlelist.json", 'utf8'))
    throttlelistFile.list.push(...req.body.throttle)
    fs.writeFileSync("/data/blocklist/throttlelist.json", JSON.stringify(throttlelistFile))
  })
  if (error) return res.send(error)
  return res.send("Done")
})

app.get('/throttlelist', (req, res) => {
  fs.access("/data/blocklist/throttlelist.json", fs.constants.F_OK, err => {
    if (err) {
      fs.writeFileSync("/data/blocklist/throttlelist.json", `{"list":[]}`, 'utf8')
      return res.json({list: []})
    }
    const throttlelist = JSON.parse(fs.readFileSync("/data/blocklist/throttlelist.json", 'utf8'))
    i = 0
    for (const elem of throttlelist.list) {
      if (elem.Duration == 'forever') continue
      const unbanDate = new Date(elem.Time * 1000)
      switch (elem.Duration[elem.Duration.length-1]) {
        case 's':
          unbanDate.setSeconds(unbanDate.getSeconds() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
        case 'm':
          unbanDate.setMinutes(unbanDate.getMinutes() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
        case 'h':
          unbanDate.setHours(unbanDate.getHours() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
      }
      if (new Date() >= unbanDate){
        throttlelist.list.splice(i, 1)
      }
      i++
    }
    fs.writeFileSync("/data/blocklist/throttlelist.json", JSON.stringify(throttlelist))
    return res.json(throttlelist)
  })
})

app.post('/file', (req, res) => {
  try {
    const { namespace, application } = req.body;
    if (!namespace || !application) return res.send({ status: 'error', message: 'Namespace or application field is missing' });
    var filePath = '', configFilePath = ''
    if (!namespace.match(/^[a-zA-Z0-9-]+$/) || !application.match(/^[a-zA-Z0-9-]+$/)) {
      return res.send({ status: 'error', message: `Bad path provided for decoys config file: ${namespace}, ${application}` });
    } else {
      filePath = path.resolve(`/data/cad-${namespace}-${application}.json`);
      configFilePath = path.resolve(`/data/config-${namespace}-${application}.json`);
    }
    if(!fs.existsSync(filePath)) fs.writeFileSync(filePath, '');
    if(!fs.existsSync(configFilePath)) fs.writeFileSync(configFilePath, '');
    return res.send({ status: 'success', message: 'Files created'});
  } catch(e) {
    return res.status(500).send({ status: 'error', message: "Error when creating the files" });
  }
})

function addApplication(namespace, application) {
  try {
    fetch(`${API_URL}/protected-app`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ namespace, application })})
  } catch(err) {
    console.error("Error when creating the protected app in the api: ", err);
  }
}
// Start the server
app.listen(3000, async () => {
  console.log('Config manager started');
  try {
    if (!fs.existsSync('/data/cad-default.json')) fs.cpSync('/app/cad-default.json', '/data/cad-default.json');
    if (!fs.existsSync('/data/config-default.json')) fs.cpSync('/app/config-default.json', '/data/config-default.json');
  } catch(e){
    console.error(`Could not create default decoy and global config file: ${e}`)
  }
  try {
    if (!fs.existsSync("/data/blocklist")) fs.mkdirSync("/data/blocklist");
    if (!fs.existsSync("/data/blocklist/blocklist.json")) fs.writeFileSync("/data/blocklist/blocklist.json", `{"list":[]}`, 'utf8')
    if (!fs.existsSync("/data/blocklist/throttlelist.json")) fs.writeFileSync("/data/blocklist/throttlelist.json", `{"list":[]}`, 'utf8')
  } catch(e) {
    console.error(`Could not create blacklist files: ${e}`);
  }
  loop = 0
  while (loop < 5) {
    try {
      await fetch(`${API_URL}/configmanager/sync`);
      break;
    } catch(e) {
      loop++;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before retrying
    }
  }
  if (loop == 5) console.log('Cannot connect to api')
});
