#define TRIG_A 12
#define ECHO_A 14
#define TRIG_B 27
#define ECHO_B 15
#define THRESHOLD 30

long readDistance(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000);
  if (duration == 0) return 999;
  long d = (duration * 0.034) / 2;
  return d > 500 ? 999 : d;
}

int passengers = 0;
int state = 0;
// 0=idle  1=A-first  2=B-first  3=cooldown(wait for both to clear)

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_A, OUTPUT);
  pinMode(ECHO_A, INPUT);
  pinMode(TRIG_B, OUTPUT);
  pinMode(ECHO_B, INPUT);
  Serial.println("Passenger Counter Ready");
}

void loop() {
  long dA = readDistance(TRIG_A, ECHO_A);
  long dB = readDistance(TRIG_B, ECHO_B);
  bool a = dA < THRESHOLD;
  bool b = dB < THRESHOLD;

  if (state == 3) {
    if (!a && !b) state = 0;
    delay(100);
    return;
  }

  if (!a && !b) {
    state = 0;
  } else if (state == 0) {
    if (a && !b) state = 1;
    else if (b && !a) state = 2;
  } else if (a && b) {
    if (state == 1) {
      passengers++;
      state = 3;
      Serial.print("ENTER ");
      Serial.println(passengers);
    } else if (state == 2) {
      passengers--;
      state = 3;
      Serial.print("EXIT  ");
      Serial.println(passengers);
    }
  }

  delay(100);
}
