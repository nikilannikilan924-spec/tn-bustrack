const router = require('express').Router();
const controller = require('../controllers/stopController');

router.get('/', controller.getAllStops);
router.get('/nearby', controller.getNearbyStops);
router.get('/:id', controller.getStopById);

module.exports = router;
