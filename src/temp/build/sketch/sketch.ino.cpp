#include <Arduino.h>
<<<<<<< HEAD
#line 1 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
// Arduino code to blink two LEDs alternately
// Connect one LED to pin 12 and another to pin 13

int led1 = 12;  // First LED connected to digital pin 12
int led2 = 13;  // Second LED connected to digital pin 13
int delayTime = 50;  // Delay in milliseconds

#line 8 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void setup();
#line 14 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
void loop();
#line 8 "E:\\Ty_Project\\project\\integrated_backend\\final-year-project\\src\\temp\\sketch\\sketch.ino"
=======
#line 1 "C:\\Users\\rudre\\OneDrive\\Desktop\\baam\\added-deleted\\src\\temp\\sketch\\sketch.ino"
#line 1 "C:\\Users\\rudre\\OneDrive\\Desktop\\baam\\added-deleted\\src\\temp\\sketch\\sketch.ino"
void setup();
#line 5 "C:\\Users\\rudre\\OneDrive\\Desktop\\baam\\added-deleted\\src\\temp\\sketch\\sketch.ino"
void loop();
#line 1 "C:\\Users\\rudre\\OneDrive\\Desktop\\baam\\added-deleted\\src\\temp\\sketch\\sketch.ino"
>>>>>>> main
void setup() {
  // Initialize both digital pins as outputs
  pinMode(led1, OUTPUT);
  pinMode(led2, OUTPUT);
}

void loop() {
  // Turn on first LED, turn off second LED
  digitalWrite(led1, HIGH);
  digitalWrite(led2, LOW);
  delay(delayTime);
  
  // Turn off first LED, turn on second LED
  digitalWrite(led1, LOW);
  digitalWrite(led2, HIGH);
  delay(delayTime);
}

