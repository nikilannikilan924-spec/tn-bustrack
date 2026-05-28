const store = require('../services/store');

async function createAlert(req, res, next) {
  try {
    const payload = {
      userId: req.user?.sub || req.body.userId,
      stopId: req.body.stopId,
      notifyMinutesBefore: req.body.notifyMinutesBefore || 10,
      isActive: true
    };
    const alert = await store.createAlert(payload);
    res.status(201).json(alert);
  } catch (error) {
    next(error);
  }
}

async function getAlerts(_req, res, next) {
  try {
    res.json(await store.listAlerts());
  } catch (error) {
    next(error);
  }
}

async function deleteAlert(req, res, next) {
  try {
    const deleted = await store.removeAlert(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Alert not found' });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { createAlert, getAlerts, deleteAlert };
