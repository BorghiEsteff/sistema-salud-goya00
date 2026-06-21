const fs = require('fs');
const files = fs.readdirSync('./frontend/public').filter(f => f.endsWith('.html'));
files.forEach(f => {
  let path = './frontend/public/' + f;
  let c = fs.readFileSync(path, 'utf8');
  c = c.replace('<meta name="viewport" content="width=device-width, initial-scale=1.0">', '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">');
  fs.writeFileSync(path, c);
});
