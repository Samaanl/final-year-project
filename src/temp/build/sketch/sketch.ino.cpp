#include <Arduino.h>
#line 1 "C:\\Users\\samaa\\Desktop\\FINAL YEAR PROJ TEST\\backend test\\src\\temp\\sketch\\sketch.ino"
int led = 7;
#line 2 "C:\\Users\\samaa\\Desktop\\FINAL YEAR PROJ TEST\\backend test\\src\\temp\\sketch\\sketch.ino"
void setup();
#line 6 "C:\\Users\\samaa\\Desktop\\FINAL YEAR PROJ TEST\\backend test\\src\\temp\\sketch\\sketch.ino"
void loop();
#line 2 "C:\\Users\\samaa\\Desktop\\FINAL YEAR PROJ TEST\\backend test\\src\\temp\\sketch\\sketch.ino"
void setup() {
  pinMode(led, OUTPUT);
}

void loop() {
  digitalWrite(led, HIGH);  
  delay(1000);                      
  digitalWrite(led, LOW);   
  delay(1000);                      
}
  
