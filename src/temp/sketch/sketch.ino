void setup() {
  // Set all digital pins as OUTPUT
  for (int i = 2; i <= 13; i++) {
    pinMode(i, OUTPUT);
    digitalWrite(i, LOW); // Start with all pins LOW
  }
  
  // Immediately set pin 13 HIGH to test LED
  digitalWrite(13, HIGH);
}

void loop() {
  // Turn on all pins one by one
  for (int i = 2; i <= 13; i++) {
    digitalWrite(i, HIGH);
    delay(500);
  }
  
  // Turn off all pins one by one
  for (int i = 2; i <= 13; i++) {
    digitalWrite(i, LOW);
    delay(500);
  }
}
