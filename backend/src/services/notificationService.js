function createAlertPayload(bus, etaMinutes) {
  return {
    busId: bus.id,
    routeId: bus.routeId,
    message: `${bus.busNumber} is about ${etaMinutes} mins away`,
    eta: etaMinutes
  };
}

function shouldNotify(etaMinutes, notifyMinutesBefore = 10) {
  return etaMinutes <= notifyMinutesBefore;
}

module.exports = { createAlertPayload, shouldNotify };
