const https = require('https');
const fs = require('fs');

https.get('https://agricheckb.onrender.com/weather-forecast?lat=5.6037&lon=-0.1870&asl=0', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    try {
      let j = JSON.parse(data);
      fs.writeFileSync('C:\\Users\\LOH\\Documents\\GitHub\\Agricheck-n\\backend-output.json', JSON.stringify(j.weather_forecast.daily[0], null, 2));
      console.log('SUCCESS');
    } catch(e) {
      fs.writeFileSync('C:\\Users\\LOH\\Documents\\GitHub\\Agricheck-n\\backend-output.json', 'Parse Error: ' + e.message + '\nData: ' + data.substring(0, 500));
    }
  });
}).on("error", (err) => {
  fs.writeFileSync('C:\\Users\\LOH\\Documents\\GitHub\\Agricheck-n\\backend-output.json', 'Net Error: ' + err.message);
});
