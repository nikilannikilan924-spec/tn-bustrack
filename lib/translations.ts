export type Lang = 'en' | 'ta';

export const translations: Record<string, { en: string; ta: string }> = {
  'app.name': { en: 'TN BusTrack', ta: 'டி.என் பஸ்ட்ராக்' },
  'app.tagline': { en: 'Smart bus control', ta: 'ஸ்மார்ட் பஸ் கட்டுப்பாடு' },
  'app.subtitle': { en: 'தமிழ்நாடு live bus tracking', ta: 'தமிழ்நாடு நேரலை பஸ் கண்காணிப்பு' },
  'app.description': { en: 'Tamil Nadu smart bus tracking with live GPS, routes, alerts, and saved trips.', ta: 'தமிழ்நாடு ஸ்மார்ட் பஸ் கண்காணிப்பு நேரலை GPS, வழித்தடங்கள், எச்சரிக்கைகள் மற்றும் சேமித்த பயணங்களுடன்.' },

  'nav.buses': { en: 'Buses', ta: 'பேருந்துகள்' },
  'nav.map': { en: 'Map', ta: 'வரைபடம்' },
  'nav.saved': { en: 'Saved', ta: 'சேமித்தவை' },
  'nav.alerts': { en: 'Alerts', ta: 'எச்சரிக்கைகள்' },
  'nav.settings': { en: 'Settings', ta: 'அமைப்புகள்' },
  'nav.stops': { en: 'Stops', ta: 'நிறுத்தங்கள்' },
  'nav.how': { en: 'How to Use', ta: 'எப்படி பயன்படுத்துவது' },

  'home.title': { en: 'Tamil Nadu smart bus tracking.', ta: 'தமிழ்நாடு ஸ்மார்ட் பஸ் கண்காணிப்பு.' },
  'home.subtitle': { en: 'Monitor live vehicles, routes, alerts, and saved trips from a single responsive dashboard.', ta: 'நேரலை வாகனங்கள், வழித்தடங்கள், எச்சரிக்கைகள் மற்றும் சேமித்த பயணங்களை ஒரே டாஷ்போர்டில் கண்காணிக்கவும்.' },
  'home.tamilSubtitle': { en: 'Live GPS dashboard for Tamil Nadu city buses', ta: 'தமிழ்நாடு நகர பேருந்துகளுக்கான நேரலை GPS டாஷ்போர்டு' },
  'home.openBuses': { en: 'Open Buses', ta: 'பேருந்துகளை திற' },
  'home.liveMap': { en: 'Live Map', ta: 'நேரலை வரைபடம்' },

  'card.realtime': { en: 'Real-time tracking', ta: 'நேருக்கு நேர கண்காணிப்பு' },
  'card.liveGps': { en: 'Live GPS', ta: 'நேரலை GPS' },
  'card.realtimeDesc': { en: 'Automatic updates from Socket.IO feed.', ta: 'Socket.IO மூலம் தானியக்க புதுப்பிப்புகள்.' },
  'card.favorites': { en: 'Favorites', ta: 'பிடித்தவை' },
  'card.savedRoutes': { en: 'Saved routes', ta: 'சேமித்த வழிகள்' },
  'card.favoritesDesc': { en: 'Save frequently monitored lines for quick access.', ta: 'அடிக்கடி கண்காணிக்கும் வழிகளை விரைவு அணுகலுக்காக சேமிக்கவும்.' },
  'card.systemStatus': { en: 'System status', ta: 'அமைப்பு நிலை' },
  'card.liveReady': { en: 'Live and ready', ta: 'நேரலையில் உள்ளது' },
  'card.systemStatusDesc': { en: 'Performance and service alerts are centralized here.', ta: 'செயல்திறன் மற்றும் சேவை எச்சரிக்கைகள் இங்கு மையப்படுத்தப்பட்டுள்ளன.' },
  'nav.nearby': { en: 'Nearby', ta: 'அருகில்' },

  'nearby.title': { en: 'Buses Near You', ta: 'உங்கள் அருகில் உள்ள பேருந்துகள்' },
  'nearby.subtitle': { en: 'Find buses approaching your location with live occupancy info.', ta: 'உங்கள் இருப்பிடத்தை நெருங்கும் பேருந்துகளை நேரலை நெரிசல் தகவலுடன் காண்க.' },
  'nearby.fetching': { en: 'Finding your location...', ta: 'உங்கள் இருப்பிடத்தை கண்டறிகிறது...' },
  'nearby.error': { en: 'Could not get your location.', ta: 'உங்கள் இருப்பிடத்தை பெற முடியவில்லை.' },
  'nearby.retry': { en: 'Try again', ta: 'மீண்டும் முயற்சிக்கவும்' },
  'nearby.yourLocation': { en: 'Your location', ta: 'உங்கள் இருப்பிடம்' },
  'nearby.radius': { en: 'Radius', ta: 'ஆரம்' },
  'nearby.refresh': { en: 'Refresh', ta: 'புதுப்பி' },
  'nearby.none': { en: 'No nearby stops found', ta: 'அருகில் நிறுத்தங்கள் எதுவும் இல்லை' },
  'nearby.noneDesc': { en: 'Try increasing the radius or moving to a different area.', ta: 'ஆரத்தை அதிகரிக்கவும் அல்லது வேறு பகுதிக்கு நகரவும்.' },
  'nearby.found': { en: 'Found', ta: 'கண்டுபிடிக்கப்பட்டது' },
  'nearby.stops': { en: 'Stops', ta: 'நிறுத்தங்கள்' },
  'nearby.liveUpdate': { en: 'Live via Socket.IO', ta: 'Socket.IO வழி நேரலை' },
  'nearby.away': { en: 'away', ta: 'தொலைவில்' },
  'nearby.buses': { en: 'buses', ta: 'பேருந்துகள்' },
  'nearby.noBuses': { en: 'No buses approaching this stop', ta: 'இந்த நிறுத்தத்தை நெருங்கும் பேருந்துகள் இல்லை' },
  'nearby.empty': { en: 'Empty', ta: 'காலி' },
  'nearby.moderate': { en: 'Moderate', ta: 'மிதமான' },
  'nearby.crowded': { en: 'Crowded', ta: 'நெரிசல்' },
  'nearby.full': { en: 'Full', ta: 'நிரம்பியது' },

  'card.quickActions': { en: 'Quick actions', ta: 'விரைவு செயல்கள்' },
  'card.quickActionsDesc': { en: 'Navigate the four tabs using the sidebar or mobile nav.', ta: 'சைடுபார் அல்லது மொபைல் நேவ் மூலம் நான்கு தாவல்களுக்கு செல்லவும்.' },

  'buses.title': { en: 'TN BusTrack fleet view', ta: 'டி.என் பஸ்ட்ராக் குழு காட்சி' },
  'buses.subtitle': { en: 'தமிழ்நாடு smart bus tracking with live GPS, seat counts, and route timelines.', ta: 'தமிழ்நாடு ஸ்மார்ட் பஸ் கண்காணிப்பு நேரலை GPS, இருக்கை எண்ணிக்கை மற்றும் வழி காலவரிசையுடன்.' },
  'buses.liveBuses': { en: 'Live Buses', ta: 'நேரலை பேருந்துகள்' },
  'buses.search': { en: 'Search by bus number or stop name', ta: 'பஸ் எண் அல்லது நிறுத்தத்தின் பெயரால் தேடவும்' },
  'buses.running': { en: 'Running', ta: 'இயக்கத்தில்' },
  'buses.seatsOpen': { en: 'Seats open', ta: 'காலி இருக்கைகள்' },
  'buses.saved': { en: 'Saved', ta: 'சேமித்தது' },
  'buses.routeCount': { en: 'Route count', ta: 'வழித்தட எண்ணிக்கை' },
  'buses.savedRoute': { en: 'Saved', ta: 'சேமித்தது' },
  'buses.saveRoute': { en: 'Save', ta: 'சேமி' },

  'bus.status.eta': { en: 'ETA', ta: 'வந்து சேரும் நேரம்' },
  'bus.status.seats': { en: 'Seats', ta: 'இருக்கைகள்' },
  'bus.status.type': { en: 'Type', ta: 'வகை' },
  'bus.save': { en: 'Save route', ta: 'வழியை சேமி' },
  'bus.saved': { en: 'Saved', ta: 'சேமிக்கப்பட்டது' },
  'bus.details': { en: 'Bus details', ta: 'பஸ் விவரங்கள்' },
  'bus.selectHint': { en: 'Select a bus card or map marker to inspect ETA, seats, and route timeline.', ta: 'ETA, இருக்கைகள் மற்றும் வழி காலவரிசையை பார்க்க பஸ் அட்டை அல்லது வரைபட குறிப்பியை தேர்ந்தெடுக்கவும்.' },
  'bus.routeTimeline': { en: 'Route timeline', ta: 'வழி காலவரிசை' },
  'bus.nextStop': { en: 'Next stop', ta: 'அடுத்த நிறுத்தம்' },
  'bus.currentStop': { en: 'Current stop', ta: 'தற்போதைய நிறுத்தம்' },

  'map.view': { en: 'Map View', ta: 'வரைபட காட்சி' },
  'map.title': { en: 'Google Maps live operations', ta: 'Google Maps நேரலை செயல்பாடுகள்' },
  'map.subtitle': { en: 'Animated bus markers move every few seconds across Chennai and long-distance routes.', ta: 'அசைவூட்ட பஸ் குறிப்பிகள் ஒவ்வொரு சில வினாடிகளிலும் சென்னை மற்றும் தொலைதூர வழித்தடங்களில் நகரும்.' },
  'map.vehicles': { en: 'Vehicles', ta: 'வாகனங்கள்' },
  'map.running': { en: 'Running', ta: 'இயக்கத்தில்' },
  'map.legend': { en: 'Legend', ta: 'குறியீடு' },
  'map.legend.running': { en: 'Green: running', ta: 'பச்சை: இயக்கத்தில்' },
  'map.legend.delayed': { en: 'Amber: delayed', ta: 'ஆம்பர்: தாமதம்' },
  'map.legend.stopped': { en: 'Grey: stopped', ta: 'சாம்பல்: நிறுத்தப்பட்டது' },
  'map.searchStop': { en: 'Search by stop name...', ta: 'நிறுத்தத்தின் பெயரால் தேடவும்...' },
  'map.noBuses': { en: 'No buses at this stop', ta: 'இந்த நிறுத்தத்தில் பேருந்துகள் இல்லை' },
  'map.full': { en: 'FULL', ta: 'நிரம்பியது' },
  'map.nextBus': { en: 'Next bus →', ta: 'அடுத்த பஸ் →' },
  'map.seatsLeft': { en: '{n} seats left', ta: '{n} இருக்கைகள் உள்ளன' },
  'map.allBuses': { en: 'Showing all buses', ta: 'அனைத்து பேருந்துகளையும் காட்டுகிறது' },
  'map.typeStop': { en: 'Type a stop to filter', ta: 'வடிகட்ட நிறுத்தத்தை தட்டச்சு செய்க' },

  'alerts.title': { en: 'Service Alerts', ta: 'சேவை எச்சரிக்கைகள்' },
  'alerts.heading': { en: 'Disruptions and live notices', ta: 'இடையூறுகள் மற்றும் நேரலை அறிவிப்புகள்' },
  'alerts.subtitle': { en: 'Service changes, congestion, and delay notices across Tamil Nadu routes.', ta: 'தமிழ்நாடு வழித்தடங்களில் சேவை மாற்றங்கள், நெரிசல் மற்றும் தாமத அறிவிப்புகள்.' },
  'alerts.empty': { en: 'No alerts currently active. Everything is running on schedule.', ta: 'தற்போது எந்த எச்சரிக்கையும் இல்லை. அனைத்தும் கால அட்டவணைப்படி இயங்குகின்றன.' },

  'favorites.title': { en: 'Saved Routes', ta: 'சேமித்த வழிகள்' },
  'favorites.heading': { en: 'Favorites tab', ta: 'பிடித்தவை தாவல்' },
  'favorites.subtitle': { en: 'Save your most monitored routes for one-tap access.', ta: 'உங்கள் அதிகம் கண்காணிக்கும் வழிகளை ஒரு தொடுதல் அணுகலுக்காக சேமிக்கவும்.' },
  'favorites.openBuses': { en: 'Open buses', ta: 'பேருந்துகளை திற' },
  'favorites.remove': { en: 'Remove', ta: 'அகற்று' },
  'favorites.liveBus': { en: 'Live bus', ta: 'நேரலை பஸ்' },
  'favorites.empty': { en: 'No saved routes', ta: 'சேமித்த வழிகள் இல்லை' },
  'favorites.emptyDesc': { en: 'Tap save on any bus card or route row to add it here.', ta: 'எந்த பஸ் அட்டையிலும் அல்லது வழி வரிசையிலும் சேமி என்பதை தொட்டு இங்கே சேர்க்கவும்.' },

  'settings.title': { en: 'Settings', ta: 'அமைப்புகள்' },
  'settings.subtitle': { en: 'Configure notification preferences and map behavior.', ta: 'அறிவிப்பு விருப்பங்கள் மற்றும் வரைபட நடத்தையை கட்டமைக்கவும்.' },
  'settings.notifications': { en: 'Notification preferences', ta: 'அறிவிப்பு விருப்பங்கள்' },
  'settings.notificationsDesc': { en: 'Alerts for delays, arrivals, and route changes.', ta: 'தாமதங்கள், வருகைகள் மற்றும் வழி மாற்றங்களுக்கான எச்சரிக்கைகள்.' },
  'settings.mapView': { en: 'Map view', ta: 'வரைபட காட்சி' },
  'settings.mapViewDesc': { en: 'Toggle live bus overlays and route lines.', ta: 'நேரலை பஸ் மேலடுக்குகள் மற்றும் வழி கோடுகளை மாற்றவும்.' },
  'settings.email': { en: 'Email address', ta: 'மின்னஞ்சல் முகவரி' },
  'settings.emergencyContact': { en: 'Emergency contact', ta: 'அவசர தொடர்பு' },
  'settings.saveSettings': { en: 'Save settings', ta: 'அமைப்புகளை சேமி' },
  'settings.mapPrefs': { en: 'Map preferences', ta: 'வரைபட விருப்பங்கள்' },
  'settings.heatmap': { en: 'Show route heatmap', ta: 'வழி வெப்ப வரைபடத்தை காட்டு' },
  'settings.etaReminders': { en: 'Enable ETA reminders', ta: 'ETA நினைவூட்டல்களை இயக்கு' },
  'settings.language': { en: 'Language', ta: 'மொழி' },
  'settings.languageDesc': { en: 'Choose your preferred language.', ta: 'உங்கள் விருப்பமான மொழியை தேர்ந்தெடுக்கவும்.' },
  'settings.english': { en: 'English', ta: 'ஆங்கிலம்' },
  'settings.tamil': { en: 'Tamil', ta: 'தமிழ்' },

  'pwa.install': { en: 'Install TN BusTrack', ta: 'டி.என் பஸ்ட்ராக்கை நிறுவவும்' },
  'pwa.installDesc': { en: 'Add to home screen for quick access', ta: 'விரைவு அணுகலுக்கு முகப்புத் திரையில் சேர்க்கவும்' },
  'pwa.installBtn': { en: 'Install', ta: 'நிறுவு' },

  'admin.title': { en: 'Admin panel', ta: 'நிர்வாக கட்டுப்பாட்டு பலகை' },
  'admin.subtitle': { en: 'Issue alerts, review service status, and manage operational updates.', ta: 'எச்சரிக்கைகளை வெளியிடவும், சேவை நிலையை மதிப்பாய்வு செய்யவும், செயல்பாட்டு புதுப்பிப்புகளை நிர்வகிக்கவும்.' },
  'admin.publishAlert': { en: 'Publish a service alert', ta: 'சேவை எச்சரிக்கையை வெளியிடு' },
  'admin.titleLabel': { en: 'Title', ta: 'தலைப்பு' },
  'admin.messageLabel': { en: 'Message', ta: 'செய்தி' },
  'admin.publishBtn': { en: 'Publish alert', ta: 'எச்சரிக்கையை வெளியிடு' },
  'admin.recentAlerts': { en: 'Recent alerts', ta: 'சமீபத்திய எச்சரிக்கைகள்' },

  'bus.eta': { en: 'ETA', ta: 'வந்து சேரும் நேரம்' },
  'bus.seats': { en: 'Seats', ta: 'இருக்கைகள்' },
  'bus.type': { en: 'Bus type', ta: 'பஸ் வகை' },
  'bus.seatCount': { en: '{available}/{capacity}', ta: '{available}/{capacity}' },

  'stops.title': { en: 'Stop Timetable', ta: 'நிறுத்த கால அட்டவணை' },
  'stops.subtitle': { en: 'Search any stop to see all buses arriving and their ETAs.', ta: 'எந்த நிறுத்தத்தையும் தேடி, வரும் பேருந்துகள் மற்றும் அவற்றின் வருகை நேரத்தைப் பார்க்கவும்.' },
  'stops.search': { en: 'Search by stop name...', ta: 'நிறுத்தத்தின் பெயரால் தேடவும்...' },
  'stops.sortedByArrival': { en: 'sorted by arrival', ta: 'வருகை நேர வரிசைப்படி' },
  'stops.hint': { en: 'Type a stop name above to see bus arrival times.', ta: 'பேருந்து வருகை நேரங்களைக் காண மேலே நிறுத்தத்தின் பெயரைத் தட்டச்சு செய்க.' },
  'stops.passed': { en: 'Passed', ta: 'கடந்துவிட்டது' },
  'stops.atStop': { en: 'At stop', ta: 'நிறுத்தத்தில்' },

  'route.number': { en: 'Route {number}', ta: 'வழி எண் {number}' },
  'route.originDest': { en: '{origin} → {destination}', ta: '{origin} → {destination}' },

  'passenger.title': { en: 'Passengers', ta: 'பயணிகள்' },
  'passenger.inside': { en: 'Inside', ta: 'உள்ளே' },
  'passenger.total': { en: 'Onboard', ta: 'உள்ள பயணிகள்' },

  'bus.speed': { en: 'Speed', ta: 'வேகம்' },
  'bus.speedValue': { en: '{speed} km/h', ta: '{speed} km/h' },

  'bus.distance': { en: 'Distance', ta: 'தூரம்' },
  'bus.distanceToNext': { en: '{km} to next stop', ta: 'அடுத்த நிறுத்தத்திற்கு {km}' },
  'bus.distanceValue': { en: '{km}', ta: '{km}' },
};

export function t(lang: Lang, key: string, vars?: Record<string, string>): string {
  const entry = translations[key];
  if (!entry) return key;
  let text = entry[lang];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
