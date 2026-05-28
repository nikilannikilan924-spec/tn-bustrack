const router = require('express').Router();
const controller = require('../controllers/routeController');

router.get('/', controller.getAllRoutes);
router.get('/search', controller.searchRoutes);
router.get('/:id/stops', controller.getRouteStops);
router.get('/:id', controller.getRouteById);

module.exports = router;
