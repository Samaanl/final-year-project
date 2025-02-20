#include <Arduino.h>
#line 1 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
#line 1 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void setup();
#line 5 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void loop();
#line 1 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);  
  delay(1000);                      
  digitalWrite(13, LOW);   
  delay(1000);                      
}
  
