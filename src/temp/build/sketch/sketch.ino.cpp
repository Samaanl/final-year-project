#include <Arduino.h>
#line 1 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
#line 1 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void setup();
#line 6 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void loop();
#line 1 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void setup() {
  pinMode(13, OUTPUT);
  pinMode(12,OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  digitalWrite(12,LOW);  
  delay(1000);                      
  digitalWrite(13, LOW); 
  digitalWrite(12,HIGH);  
  delay(1000);                      
}
  
