#include <Arduino.h>
#line 1 "E:\\Ty_Project\\final_project\\final-year-project\\src\\temp\\sketch\\sketch.ino"
// Arduino code to blink two LEDs alternately
// Connect one LED to pin 12 and another to pin 13

int led1 = 12;  // First LED connected to digital pin 12
int led2 = 13;  // Second LED connected to digital pin 13
int led3 = 11; 
int delayTime = 50;  // Delay in milliseconds

#line 9 "E:\\Ty_Project\\final_project\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void setup();
#line 16 "E:\\Ty_Project\\final_project\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void loop();
#line 9 "E:\\Ty_Project\\final_project\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void setup() {
  // Initialize both digital pins as outputs
  pinMode(led1, OUTPUT);
  pinMode(led2, OUTPUT);
  pinMode(led3, OUTPUT);
}

void loop() {
  // Turn on first LED, turn off second LED
  digitalWrite(led1, HIGH);
  digitalWrite(led2, LOW);
  digitalWrite(led3, LOW);
  delay(delayTime);
  
  // Turn off first LED, turn on second LED
  digitalWrite(led1, LOW);
  digitalWrite(led2, HIGH);
  digitalWrite(led3, LOW);
  delay(delayTime);

  digitalWrite(led2, LOW);
  digitalWrite(led3, HIGH);
  digitalWrite(led1, LOW);
  delay(delayTime);
}
  
