const router = require('express').Router();
const controller = require('../controllers/busController');

router.get('/', controller.getAllBuses);
router.get('/live', controller.getLiveBuses);
router.get('/:id/seats', controller.getBusSeats);
router.get('/:id', controller.getBusById);
router.put('/:id/location', controller.updateBusLocation);
router.put('/:id/seats', controller.updateBusSeats);

module.exports = router;
