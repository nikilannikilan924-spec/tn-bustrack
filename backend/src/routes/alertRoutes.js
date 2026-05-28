const router = require('express').Router();
const controller = require('../controllers/alertController');
const { auth } = require('../middleware/auth');

router.get('/', auth, controller.getAlerts);
router.post('/', auth, controller.createAlert);
router.delete('/:id', auth, controller.deleteAlert);

module.exports = router;
