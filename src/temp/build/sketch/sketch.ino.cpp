#include <Arduino.h>
#line 1 "C:\\Users\\DEXsh\\OneDrive\\Desktop\\working db proj\\final-year-project\\src\\temp\\sketch\\sketch.ino"
int led = 13;
#line 2 "C:\\Users\\DEXsh\\OneDrive\\Desktop\\working db proj\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void setup();
#line 6 "C:\\Users\\DEXsh\\OneDrive\\Desktop\\working db proj\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void loop();
#line 2 "C:\\Users\\DEXsh\\OneDrive\\Desktop\\working db proj\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void setup() {
  pinMode(led, OUTPUT);
}

void loop() {
  digitalWrite(led, HIGH);  
  delay(1000);                      
  digitalWrite(led, LOW);   
  delay(1000);                      
}
  
