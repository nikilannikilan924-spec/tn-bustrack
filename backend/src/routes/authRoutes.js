const router = require('express').Router();
const controller = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/profile', auth, controller.profile);

module.exports = router;
