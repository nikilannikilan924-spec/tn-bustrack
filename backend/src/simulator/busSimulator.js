require('dotenv').config();

const { tickBuses } = require('../services/simulationService');

async function main() {
  console.log('TN Bus Tracker simulator running...');
  setInterval(async () => {
    const buses = await tickBuses((event, payload) => {
      if (event === 'busLocationUpdate') {
        console.log(`[location] ${payload.busId} -> ${payload.lat}, ${payload.lng}`);
      }
    });
    console.log(`Updated ${buses.length} buses`);
  }, 5000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
