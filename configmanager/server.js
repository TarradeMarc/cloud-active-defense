const express = require('express');
const app = express();
const fs = require('fs');
const hsts = require('hsts')
const path = require('path')

app.use(hsts({
  maxAge: 31536000,
  includeSubDomains: true
}))
app.use(express.json())

// Define a GET route that accepts a namespace and application parameter
app.get('/:namespace/:application', (req, res) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "script-src 'self'");
  const { namespace, application } = req.params;
  const filePath = path.resolve(path.normalize(`/data/cad-${namespace}-${application}.json`).replace(/^(\.\.(\/|\\|$))+/, ''));
  const defaultFilePath = `/data/cad-default.json`;
  const configFilePath = path.resolve(path.normalize(`/data/config-${namespace}-${application}.json`).replace(/^(\.\.(\/|\\|$))+/, ''));
  const defaultConfigFilePath = `/data/config-default.json`;
  
  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
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
            const decoysJson = JSON.parse(decoys);
            // Check if the file exists
            fs.access(configFilePath, fs.constants.F_OK, err => {
              if(err) {
                fs.access(defaultConfigFilePath, fs.constants.F_OK, err => {
                  if (err) { return res.json({ decoy: decoysJson }) }
                  fs.readFile(defaultConfigFilePath, 'utf8', (err, config) => {
                    if(err) return res.json({ decoy: decoysJson });
                    if (config) {
                      const configJson = JSON.parse(config);
                      return res.json({ decoy: decoysJson, config: configJson });
                    }
                    return res.json({ decoy: decoysJson })
                  })
                })
              } else {
                fs.readFile(configFilePath, 'utf8', (err, config) => {
                  if(err) return res.json({ decoy: decoysJson });
                  if (config) {
                    const configJson = JSON.parse(config);
                    return res.json({ decoy: decoysJson, config: configJson });
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
        const decoysJson = JSON.parse(decoys);
        // Check if the file exists
        fs.access(configFilePath, fs.constants.F_OK, err => {
          if(err) {
            fs.access(defaultConfigFilePath, fs.constants.F_OK, err => {
              if (err) { return res.json({ decoy: decoysJson }) }
              fs.readFile(defaultConfigFilePath, 'utf8', (err, config) => {
                if(err) return res.json({ decoy: decoysJson });
                if (config) {
                  const configJson = JSON.parse(config);
                  return res.json({ decoy: decoysJson, config: configJson });
                }
                return res.json({ decoy: decoysJson })
              })
            })
          } else {
            fs.readFile(configFilePath, 'utf8', (err, config) => {
              if(err) return res.json({ decoy: decoysJson });
              if (config) {
                const configJson = JSON.parse(config);
                return res.json({ decoy: decoysJson, config: configJson });
              }
              return res.json({ decoy: decoysJson })
            })
          }
        })
      });
    }
  });
});

app.get('/blacklist', (req, res) => {
  fs.access("/data/blacklist/blacklist.json", fs.constants.F_OK, err => {
    if (err) return res.json({})
    const blacklist = JSON.parse(fs.readFileSync("/data/blacklist/blacklist.json", 'utf8'))
    i = 0
    for (const elem of blacklist.list) {
      if (elem.duration == 'forever') continue
      const unbanDate = new Date(elem.timeDetected)
      switch (elem.duration[elem.duration.length-1]) {
        case 's':
          unbanDate.setSeconds(unbanDate.getSeconds() + parseInt(elem.duration.substring(0, elem.duration.length-1)))
          break;
        case 'm':
          unbanDate.setMinutes(unbanDate.getMinutes() + parseInt(elem.duration.substring(0, elem.duration.length-1)))
          break;
        case 'h':
          unbanDate.setHours(unbanDate.getHours() + parseInt(elem.duration.substring(0, elem.duration.length-1)))
          break;
      }
      if (new Date() >= unbanDate){
        blacklist.list.splice(i, 1)
        console.log(blacklist)
      }
      i++
    }
    fs.writeFileSync("/data/blacklist/blacklist.json", JSON.stringify(blacklist))
    return res.json(blacklist)
  })
})

app.post('/blacklist', (req, res) => {
  fs.access("/data/blacklist/blacklist.json", fs.constants.F_OK, err => {
    if (err) return res.send("Error accessing blacklist")
    const blacklistFile = JSON.parse(fs.readFileSync("/data/blacklist/blacklist.json", 'utf8'))
    blacklistFile.list.push(req.body)
    fs.writeFileSync("/data/blacklist/blacklist.json", JSON.stringify(blacklistFile))
    return res.send("Done")
  })
})

// Start the server
app.listen(3000, () => {
  if (!fs.existsSync("/data/blacklist/blacklist.json")) fs.writeFileSync("/data/blacklist/blacklist.json", `{"list":[]}`, 'utf8')
  console.log('Config manager started');
});
