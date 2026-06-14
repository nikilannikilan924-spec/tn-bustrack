'use client';

import { useLanguage } from '@/lib/LanguageContext';

const steps = [
  { en: 'Open the app in Chrome on your phone', ta: 'உங்கள் போனில் Chrome பயன்பாட்டில் இணையதளத்தை திறக்கவும்' },
  { en: 'Tap "Add to Home Screen" to install as an app', ta: 'சிறந்த அனுபவத்திற்கு "முகப்புத் திரையில் சேர்" என்பதைத் தட்டவும்' },
  { en: 'Allow location access to find nearby buses', ta: 'அருகிலுள்ள பேருந்துகளைக் கண்டறிய இருப்பிட அணுகலை அனுமதிக்கவும்' },
  { en: 'Browse live buses on the map with GPS tracking', ta: 'GPS கண்காணிப்புடன் நேரலை பேருந்துகளை வரைபடத்தில் பார்க்கவும்' },
  { en: 'Tap a bus to see route, seats, ETA and stops', ta: 'வழி, இருக்கைகள், வருகை நேரம் மற்றும் நிறுத்தங்களைக் காண பேருந்தின் மீது தட்டவும்' },
  { en: 'Save your favorite routes for quick access', ta: 'விரைவான அணுகலுக்கு உங்கள் விருப்ப வழிகளைச் சேமிக்கவும்' },
  { en: 'Get alerts about delays and route changes', ta: 'தாமதங்கள் மற்றும் வழி மாற்றங்கள் பற்றிய எச்சரிக்கைகளைப் பெறவும்' }
];

const features = [
  { en: 'Live Bus Tracking', ta: 'நேரலை பேருந்து கண்காணிப்பு', descEn: 'Real-time GPS location of all buses', descTa: 'அனைத்து பேருந்துகளின் நேரலை GPS இருப்பிடம்' },
  { en: 'Passenger Count', ta: 'பயணிகள் எண்ணிக்கை', descEn: 'Know how crowded a bus is before it arrives', descTa: 'பேருந்து வரும் முன் நெரிசலைத் தெரிந்து கொள்ளுங்கள்' },
  { en: 'Route Maps', ta: 'வழி வரைபடங்கள்', descEn: 'View complete bus routes with all stops', descTa: 'அனைத்து நிறுத்தங்களுடன் முழுமையான பேருந்து வழிகளைக் காண்க' },
  { en: 'Alerts & Notifications', ta: 'எச்சரிக்கைகள் & அறிவிப்புகள்', descEn: 'Stay informed about delays and changes', descTa: 'தாமதங்கள் மற்றும் மாற்றங்கள் பற்றி அறிந்திருங்கள்' },
  { en: 'Nearby Stops', ta: 'அருகிலுள்ள நிறுத்தங்கள்', descEn: 'Find bus stops near your location', descTa: 'உங்கள் இருப்பிடத்திற்கு அருகில் உள்ள பேருந்து நிறுத்தங்களைக் கண்டறியவும்' },
  { en: 'Tamil / English', ta: 'தமிழ் / ஆங்கிலம்', descEn: 'Switch between languages anytime', descTa: 'எந்த நேரத்திலும் மொழிகளுக்கு இடையில் மாறவும்' }
];

export default function HowPage() {
  const { t, lang } = useLanguage();

  return (
    <div className="space-y-6 pt-4">
      <section className="relative overflow-hidden rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur-xl sm:p-10">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-4xl">
          {lang === 'ta' ? 'எப்படி பயன்படுத்துவது' : 'How to Use TN BusTrack'}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {lang === 'ta'
            ? 'உங்கள் பயணத்தை எளிதாக்க TN BusTrack ஐப் பயன்படுத்துவதற்கான படிப்படியான வழிகாட்டி'
            : 'Step-by-step guide to using TN BusTrack for your daily commute'}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {steps.map((step, i) => (
          <div key={i} className="glass rounded-3xl p-5 shadow-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0EA5E9]/10 text-lg font-bold text-[#0EA5E9]">
              {i + 1}
            </div>
            <p className="mt-4 text-sm font-medium text-[var(--text-primary)]">
              {lang === 'ta' ? step.ta : step.en}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur-xl sm:p-10">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          {lang === 'ta' ? 'அம்சங்கள்' : 'Features'}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <h3 className="font-semibold text-[var(--text-primary)]">
                {lang === 'ta' ? f.ta : f.en}
              </h3>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {lang === 'ta' ? f.descTa : f.descEn}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-[#0EA5E9]/5 to-[#00BCD4]/5 p-6 shadow-lg sm:p-10">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          {lang === 'ta' ? 'தயாரா?' : 'Ready to get started?'}
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/map"
            className="rounded-xl bg-[#0EA5E9] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0284C7]"
          >
            {t('home.liveMap')}
          </a>
          <a
            href="/dashboard"
            className="rounded-xl border border-[#0EA5E9] px-6 py-3 text-sm font-semibold text-[#0EA5E9] transition hover:bg-[#0EA5E9]/5"
          >
            {t('home.openBuses')}
          </a>
          <a
            href="/nearby"
            className="rounded-xl border border-[var(--border)] bg-white/50 px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white/80"
          >
            {lang === 'ta' ? 'அருகிலுள்ள நிறுத்தங்கள்' : 'Nearby Stops'}
          </a>
        </div>
      </section>
    </div>
  );
}
